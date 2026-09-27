/* =========================================================
   quiz.js — take-quiz flow: rendering, timer, navigation,
   submission and scoring.
   ========================================================= */

let quizState = null; // { quiz, questions, currentIndex, answers, startedAt, timerInterval, remainingSeconds }

function initTakeQuiz() {
  const user = requireAuth("student");
  if (!user) return;

  const quizId = new URLSearchParams(location.search).get("quizId");
  const quiz = getQuizById(quizId);

  if (!quiz || quiz.status !== "published") {
    document.body.innerHTML = `<div class="container py-5">${emptyState("bi-exclamation-circle", "Quiz not available", "This quiz doesn't exist or hasn't been published.", `<a href="student-dashboard.html" class="btn btn-accent btn-sm">Back to dashboard</a>`)}</div>`;
    return;
  }

  const cls = getClassById(quiz.classId);
  if (!cls || !cls.studentIds.includes(user.id)) {
    document.body.innerHTML = `<div class="container py-5">${emptyState("bi-lock-fill", "Not enrolled", "You need to join this class before taking the quiz.", `<a href="student-dashboard.html" class="btn btn-accent btn-sm">Back to dashboard</a>`)}</div>`;
    return;
  }

  const priorAttempts = getSubmissionsByQuiz(quiz.id).filter(s => s.studentId === user.id).length;
  if (priorAttempts >= quiz.settings.maxAttempts) {
    document.body.innerHTML = `<div class="container py-5">${emptyState("bi-flag-fill", "No attempts left", "You've used all your attempts for this quiz.", `<a href="results.html" class="btn btn-accent btn-sm">View results</a>`)}</div>`;
    return;
  }

  let questions = getQuestionsByQuiz(quiz.id);
  if (quiz.settings.randomizeQuestions) {
    questions = [...questions].sort(() => Math.random() - 0.5);
  }

  quizState = {
    quiz, questions, cls, currentIndex: 0,
    answers: {}, // questionId -> array of selected ids / short answer text
    startedAt: Date.now(),
    remainingSeconds: quiz.settings.timeLimit * 60
  };

  document.getElementById("quizTitle").textContent = quiz.title;
  document.getElementById("quizClassName").textContent = cls.name;
  document.getElementById("quizTotalQuestions").textContent = questions.length;

  renderQuestion();
  startTimer();

  document.getElementById("prevBtn").addEventListener("click", () => navigate(-1));
  document.getElementById("nextBtn").addEventListener("click", () => navigate(1));
  document.getElementById("submitBtn").addEventListener("click", () => confirmSubmit());
}

function startTimer() {
  const pill = document.getElementById("timerPill");
  const tick = () => {
    quizState.remainingSeconds--;
    if (quizState.remainingSeconds <= 0) {
      clearInterval(quizState.timerInterval);
      showToast("Time's up — submitting your quiz.", "info");
      submitQuiz();
      return;
    }
    const m = Math.floor(quizState.remainingSeconds / 60);
    const s = quizState.remainingSeconds % 60;
    pill.textContent = `${m}:${String(s).padStart(2, "0")}`;
    pill.classList.toggle("low-time", quizState.remainingSeconds <= 60);
  };
  tick();
  quizState.timerInterval = setInterval(tick, 1000);
}

function renderQuestion() {
  const { questions, currentIndex, answers } = quizState;
  const q = questions[currentIndex];
  const container = document.getElementById("questionContainer");

  document.getElementById("questionNumber").textContent = `Question ${currentIndex + 1} of ${questions.length}`;
  document.getElementById("progressFill").style.width = `${((currentIndex) / questions.length) * 100}%`;
  document.getElementById("prevBtn").disabled = currentIndex === 0;
  document.getElementById("nextBtn").classList.toggle("d-none", currentIndex === questions.length - 1);
  document.getElementById("submitBtn").classList.toggle("d-none", currentIndex !== questions.length - 1);

  const current = answers[q.id] || [];
  let bodyHtml = `<div class="mb-2 text-muted-soft small">${questionTypeLabel(q.type)} · ${q.points} point${q.points === 1 ? "" : "s"}${q.required ? " · Required" : ""}</div>
    <h5 class="mb-4">${escapeHtml(q.questionText)}</h5>`;

  if (q.type === "multiple_choice" || q.type === "true_false") {
    bodyHtml += q.options.map(opt => `
      <div class="answer-option mb-2 ${current[0] === opt.id ? "selected" : ""}" data-option-id="${opt.id}">
        <i class="bi ${current[0] === opt.id ? "bi-record-circle-fill text-accent" : "bi-circle"}"></i>
        <span>${escapeHtml(opt.text)}</span>
      </div>`).join("");
  } else if (q.type === "multiple_select") {
    bodyHtml += q.options.map(opt => `
      <div class="answer-option mb-2 ${current.includes(opt.id) ? "selected" : ""}" data-option-id="${opt.id}">
        <i class="bi ${current.includes(opt.id) ? "bi-check-square-fill text-accent" : "bi-square"}"></i>
        <span>${escapeHtml(opt.text)}</span>
      </div>`).join("");
  } else if (q.type === "short_answer") {
    bodyHtml += `<input type="text" class="form-control form-control-lg" id="shortAnswerInput" placeholder="Type your answer" value="${escapeHtml(current[0] || "")}">`;
  }

  container.innerHTML = bodyHtml;
  container.classList.remove("animate-in");
  void container.offsetWidth;
  container.classList.add("animate-in");

  if (q.type === "short_answer") {
    document.getElementById("shortAnswerInput").addEventListener("input", (e) => {
      quizState.answers[q.id] = [e.target.value];
    });
  } else {
    container.querySelectorAll(".answer-option").forEach(el => {
      el.addEventListener("click", () => {
        const optId = el.dataset.optionId;
        if (q.type === "multiple_select") {
          const set = new Set(quizState.answers[q.id] || []);
          set.has(optId) ? set.delete(optId) : set.add(optId);
          quizState.answers[q.id] = [...set];
        } else {
          quizState.answers[q.id] = [optId];
        }
        renderQuestion();
      });
    });
  }
}

function navigate(dir) {
  const next = quizState.currentIndex + dir;
  if (next < 0 || next >= quizState.questions.length) return;
  quizState.currentIndex = next;
  renderQuestion();
}

function confirmSubmit() {
  const unanswered = quizState.questions.filter(q => !(quizState.answers[q.id] && quizState.answers[q.id].length > 0));
  const msg = unanswered.length > 0
    ? `You have ${unanswered.length} unanswered question${unanswered.length === 1 ? "" : "s"}. Submit anyway?`
    : "You won't be able to change your answers after submitting.";
  confirmAction(msg, () => submitQuiz(), { title: "Submit quiz?" });
}

function submitQuiz() {
  clearInterval(quizState.timerInterval);
  const user = getCurrentUser();
  const { quiz, questions, cls, answers, startedAt } = quizState;
  const scored = scoreSubmission(quiz, questions, answers);
  const timeSpent = Math.round((Date.now() - startedAt) / 1000);

  const submission = createSubmission({
    quizId: quiz.id, studentId: user.id, classId: cls.id,
    answers: scored.answers, totalPoints: scored.totalPoints, earnedPoints: scored.earnedPoints,
    percentage: scored.percentage, correctAnswers: scored.correctCount, incorrectAnswers: scored.incorrectCount,
    startedAt: new Date(startedAt).toISOString(), submittedAt: new Date().toISOString(), timeSpent, status: "submitted"
  });

  window.location.href = `results.html?submissionId=${submission.id}`;
}
