/* =========================================================
   student.js — page logic for all student-facing pages
   ========================================================= */

function initStudentDashboard() {
  const user = renderAppShell({ role: "student", activeKey: "dashboard", pageTitle: "Dashboard" });
  if (!user) return;

  const stats = getStudentOverallStats(user.id);
  const classes = getClassesForStudent(user.id);
  const subs = getSubmissionsByStudent(user.id).sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  document.getElementById("welcomeName").textContent = user.fullName.split(" ")[0];
  document.getElementById("statClasses").textContent = stats.totalClasses;
  document.getElementById("statPending").textContent = stats.pendingQuizzes;
  document.getElementById("statCompleted").textContent = stats.completedQuizzes;
  document.getElementById("statAverage").textContent = stats.averageScore + "%";

  // Upcoming quizzes (published, attempts remaining)
  const upcoming = [];
  classes.forEach(cls => {
    getQuizzesByClass(cls.id).filter(q => q.status === "published").forEach(qz => {
      const attempts = subs.filter(s => s.quizId === qz.id).length;
      if (attempts < qz.settings.maxAttempts) upcoming.push({ quiz: qz, cls });
    });
  });
  upcoming.sort((a,b) => new Date(a.quiz.deadline) - new Date(b.quiz.deadline));

  const upcomingEl = document.getElementById("upcomingQuizzes");
  if (upcoming.length === 0) {
    upcomingEl.innerHTML = emptyState("bi-check2-circle", "You're all caught up", "No pending quizzes right now.");
  } else {
    upcomingEl.innerHTML = upcoming.slice(0, 4).map(({quiz, cls}) => `
      <div class="d-flex align-items-center justify-content-between py-3 border-bottom">
        <div>
          <div class="fw-semibold">${escapeHtml(quiz.title)}</div>
          <div class="text-muted-soft small">${escapeHtml(cls.name)} · Due ${formatDate(quiz.deadline)}</div>
        </div>
        <a href="take-quiz.html?quizId=${quiz.id}" class="btn btn-accent btn-sm">Start</a>
      </div>`).join("");
  }

  // Recent activity (submissions)
  const activityEl = document.getElementById("recentActivity");
  if (subs.length === 0) {
    activityEl.innerHTML = emptyState("bi-clock-history", "No activity yet", "Your quiz attempts will show up here.");
  } else {
    activityEl.innerHTML = subs.slice(0, 5).map(s => {
      const qz = getQuizById(s.quizId);
      return `
      <div class="d-flex align-items-center justify-content-between py-3 border-bottom">
        <div>
          <div class="fw-semibold">${escapeHtml(qz ? qz.title : "Deleted quiz")}</div>
          <div class="text-muted-soft small">Submitted ${formatDate(s.submittedAt)}</div>
        </div>
        <span class="badge-soft ${s.percentage >= 60 ? "badge-teal" : "badge-danger"}">${s.percentage}%</span>
      </div>`;
    }).join("");
  }

  // My classes
  const classesEl = document.getElementById("myClassesMini");
  if (classes.length === 0) {
    classesEl.innerHTML = emptyState("bi-collection", "No classes yet", "Join a class with a code from your teacher.",
      `<button class="btn btn-accent btn-sm" data-bs-toggle="modal" data-bs-target="#joinClassModal">Join a class</button>`);
  } else {
    classesEl.innerHTML = classes.map(cls => {
      const progress = getStudentProgressForClass(user.id, cls.id);
      return `
      <a href="class.html?classId=${cls.id}" class="card-panel hover-lift class-card d-block text-decoration-none mb-3">
        <div class="class-cover"></div>
        <div class="class-body">
          <div class="fw-semibold text-dark">${escapeHtml(cls.name)}</div>
          <div class="text-muted-soft small mb-2">${escapeHtml(cls.subject)}</div>
          <div class="progress-thin"><div style="width:${progress.progressPercentage}%"></div></div>
        </div>
      </a>`;
    }).join("");
  }

  wireJoinClassModal(user);
}

function wireJoinClassModal(user) {
  const btns = document.querySelectorAll("[data-bs-target='#joinClassModal']");
  const form = document.getElementById("joinClassForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = document.getElementById("classCodeInput").value;
    const result = joinClassByCode(user.id, code);
    if (!result.ok) { showToast(result.message, "error"); return; }
    showToast(`Joined ${result.class.name}!`, "success");
    bootstrap.Modal.getInstance(document.getElementById("joinClassModal")).hide();
    setTimeout(() => window.location.reload(), 500);
  });
}

function initStudentClasses() {
  const user = renderAppShell({ role: "student", activeKey: "classes", pageTitle: "My Classes" });
  if (!user) return;

  const classes = getClassesForStudent(user.id);
  const grid = document.getElementById("classesGrid");

  if (classes.length === 0) {
    grid.innerHTML = emptyState("bi-collection", "No classes yet", "Enter a class code from your teacher to get started.",
      `<button class="btn btn-accent btn-sm" data-bs-toggle="modal" data-bs-target="#joinClassModal">Join a class</button>`);
  } else {
    grid.innerHTML = classes.map(cls => {
      const teacher = getUserById(cls.teacherId);
      const progress = getStudentProgressForClass(user.id, cls.id);
      const lessons = getLessonsByClass(cls.id);
      const quizzes = getQuizzesByClass(cls.id).filter(q => q.status === "published");
      return `
      <div class="col-md-6 col-lg-4">
        <div class="card-panel hover-lift class-card h-100">
          <div class="class-cover"></div>
          <div class="class-body d-flex flex-column">
            <div class="fw-semibold text-dark mb-1">${escapeHtml(cls.name)}</div>
            <div class="text-muted-soft small mb-2">Taught by ${escapeHtml(teacher ? teacher.fullName : "—")}</div>
            <p class="small text-muted-soft mb-3">${escapeHtml(cls.description)}</p>
            <div class="d-flex gap-3 small text-muted-soft mb-3">
              <span><i class="bi bi-journal-text"></i> ${lessons.length} lessons</span>
              <span><i class="bi bi-patch-question"></i> ${quizzes.length} quizzes</span>
            </div>
            <div class="progress-thin mb-1"><div style="width:${progress.progressPercentage}%"></div></div>
            <div class="text-muted-soft small mb-3">${progress.progressPercentage}% complete</div>
            <a href="class.html?classId=${cls.id}" class="btn btn-outline-soft mt-auto">Open class</a>
          </div>
        </div>
      </div>`;
    }).join("");
  }
  wireJoinClassModal(user);
}

function initClassDetail() {
  const user = requireAuth(null);
  if (!user) return;
  const classId = new URLSearchParams(location.search).get("classId");
  const cls = getClassById(classId);

  renderAppShell({ role: user.role, activeKey: user.role === "teacher" ? "classes" : "classes", pageTitle: cls ? cls.name : "Class" });

  if (!cls) {
    document.getElementById("pageContent").innerHTML = emptyState("bi-exclamation-circle", "Class not found", "This class may have been removed.");
    return;
  }

  const isTeacherView = user.role === "teacher";
  const teacher = getUserById(cls.teacherId);
  document.getElementById("className").textContent = cls.name;
  document.getElementById("classMeta").textContent = `${cls.subject} · ${cls.level} · Taught by ${teacher ? teacher.fullName : "—"}`;
  document.getElementById("classDescription").textContent = cls.description;
  document.getElementById("classCodeBadge").textContent = cls.classCode;
  if (!isTeacherView) document.getElementById("teacherOnlyCode").classList.add("d-none");

  // Overview tab
  const lessons = getLessonsByClass(cls.id);
  const quizzes = getQuizzesByClass(cls.id).filter(q => isTeacherView || q.status === "published");
  document.getElementById("overviewLessonCount").textContent = lessons.length;
  document.getElementById("overviewQuizCount").textContent = quizzes.length;
  document.getElementById("overviewStudentCount").textContent = cls.studentIds.length;

  if (!isTeacherView) {
    const progress = getStudentProgressForClass(user.id, cls.id);
    document.getElementById("overviewProgress").textContent = progress.progressPercentage + "%";
  } else {
    document.getElementById("overviewProgressWrap").classList.add("d-none");
  }

  // Lessons tab
  const lessonsEl = document.getElementById("lessonsList");
  lessonsEl.innerHTML = lessons.length === 0
    ? emptyState("bi-journal-text", "No lessons yet", isTeacherView ? "Add your first lesson to get started." : "Your teacher hasn't posted lessons yet.")
    : lessons.map(l => `
      <div class="card-panel p-3 mb-2">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${escapeHtml(l.title)}</div>
            <div class="text-muted-soft small mb-2">${escapeHtml(l.description)}</div>
            <p class="small mb-0">${escapeHtml(l.content)}</p>
          </div>
          ${isTeacherView ? `<button class="btn btn-ghost btn-sm" onclick="deleteLessonPrompt('${l.id}')"><i class="bi bi-trash"></i></button>` : ""}
        </div>
      </div>`).join("");

  // Materials tab (derived from lessons — kept simple, no separate model needed)
  document.getElementById("materialsList").innerHTML = lessons.length === 0
    ? emptyState("bi-paperclip", "No materials yet", "Materials shared in lessons will appear here.")
    : lessons.map(l => `
      <div class="d-flex align-items-center gap-3 card-panel p-3 mb-2">
        <div class="feature-icon mb-0" style="background:#e7edfd;color:#3462e8;"><i class="bi bi-file-earmark-text-fill"></i></div>
        <div><div class="fw-semibold small">${escapeHtml(l.title)} — notes</div><div class="text-muted-soft small">Referenced in this lesson</div></div>
      </div>`).join("");

  // Quizzes tab
  const quizzesEl = document.getElementById("classQuizzesList");
  quizzesEl.innerHTML = quizzes.length === 0
    ? emptyState("bi-patch-question", "No quizzes yet", isTeacherView ? "Build your first quiz for this class." : "Quizzes will show up here once published.")
    : quizzes.map(qz => {
        const qCount = getQuestionsByQuiz(qz.id).length;
        const action = isTeacherView
          ? `<a href="quiz-builder.html?quizId=${qz.id}" class="btn btn-outline-soft btn-sm">Edit</a>`
          : `<a href="take-quiz.html?quizId=${qz.id}" class="btn btn-accent btn-sm">Start</a>`;
        return `
        <div class="d-flex align-items-center justify-content-between card-panel p-3 mb-2">
          <div>
            <div class="fw-semibold">${escapeHtml(qz.title)} ${isTeacherView ? quizStatusBadge(qz.status) : ""}</div>
            <div class="text-muted-soft small">${qCount} questions · ${qz.settings.timeLimit} min · Due ${formatDate(qz.deadline)}</div>
          </div>
          ${action}
        </div>`;
      }).join("");

  // Announcements tab
  const anns = getAnnouncementsByClass(cls.id);
  const annEl = document.getElementById("announcementsList");
  const renderAnns = () => {
    const list = getAnnouncementsByClass(cls.id);
    annEl.innerHTML = list.length === 0
      ? emptyState("bi-megaphone", "No announcements yet", "Updates from your teacher will appear here.")
      : list.map(a => `
        <div class="card-panel p-3 mb-2">
          <div class="d-flex justify-content-between">
            <div class="fw-semibold">${escapeHtml(a.title)}</div>
            <div class="text-muted-soft small">${formatDate(a.createdAt)}</div>
          </div>
          <p class="small mb-0 mt-1">${escapeHtml(a.message)}</p>
        </div>`).join("");
  };
  renderAnns();

  if (isTeacherView) {
    document.getElementById("newAnnouncementForm").classList.remove("d-none");
    document.getElementById("newAnnouncementForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = document.getElementById("annTitle").value.trim();
      const message = document.getElementById("annMessage").value.trim();
      if (!title || !message) return;
      createAnnouncement({ classId: cls.id, teacherId: user.id, title, message });
      document.getElementById("newAnnouncementForm").reset();
      renderAnns();
      showToast("Announcement posted.", "success");
    });

    document.getElementById("teacherAddLesson").classList.remove("d-none");
    document.getElementById("addLessonForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = document.getElementById("lessonTitle").value.trim();
      const description = document.getElementById("lessonDescription").value.trim();
      const content = document.getElementById("lessonContent").value.trim();
      if (!title) return;
      createLesson({ classId: cls.id, title, description, content, order: getLessonsByClass(cls.id).length + 1 });
      bootstrap.Modal.getInstance(document.getElementById("addLessonModal")).hide();
      showToast("Lesson added.", "success");
      setTimeout(() => location.reload(), 400);
    });

    document.getElementById("createQuizBtn").classList.remove("d-none");
    document.getElementById("createQuizBtn").addEventListener("click", () => {
      const quiz = createQuiz({ classId: cls.id, teacherId: user.id, title: "Untitled Quiz", description: "" });
      window.location.href = `quiz-builder.html?quizId=${quiz.id}`;
    });
  }
}

function deleteLessonPrompt(lessonId) {
  confirmAction("This lesson will be removed permanently.", () => {
    deleteLesson(lessonId);
    showToast("Lesson deleted.", "success");
    setTimeout(() => location.reload(), 400);
  }, { title: "Delete lesson?" });
}

function initQuizList() {
  const user = renderAppShell({ role: "student", activeKey: "quizzes", pageTitle: "Quizzes" });
  if (!user) return;

  const classes = getClassesForStudent(user.id);
  const subs = getSubmissionsByStudent(user.id);
  let allQuizzes = [];
  classes.forEach(cls => {
    getQuizzesByClass(cls.id).filter(q => q.status === "published").forEach(qz => {
      allQuizzes.push({ quiz: qz, cls, attempts: subs.filter(s => s.quizId === qz.id).length });
    });
  });

  const render = (filter) => {
    let list = allQuizzes;
    if (filter === "pending") list = list.filter(x => x.attempts < x.quiz.settings.maxAttempts);
    if (filter === "completed") list = list.filter(x => x.attempts > 0);

    const el = document.getElementById("quizListBody");
    if (list.length === 0) {
      el.innerHTML = emptyState("bi-patch-question", "No quizzes here", "Nothing to show for this filter yet.");
      return;
    }
    el.innerHTML = list.map(({quiz, cls, attempts}) => {
      const canTake = attempts < quiz.settings.maxAttempts;
      const status = attempts === 0 ? "Not started" : (canTake ? "Retake available" : "Completed");
      return `
      <div class="d-flex align-items-center justify-content-between card-panel p-3 mb-2">
        <div>
          <div class="fw-semibold">${escapeHtml(quiz.title)}</div>
          <div class="text-muted-soft small">${escapeHtml(cls.name)} · ${getQuestionsByQuiz(quiz.id).length} questions · ${quiz.settings.timeLimit} min · Due ${formatDate(quiz.deadline)}</div>
        </div>
        <div class="d-flex align-items-center gap-3">
          <span class="badge-soft ${attempts > 0 ? "badge-teal" : "badge-muted"}">${status}</span>
          ${canTake ? `<a href="take-quiz.html?quizId=${quiz.id}" class="btn btn-accent btn-sm">${attempts > 0 ? "Retake" : "Start"}</a>` : ""}
        </div>
      </div>`;
    }).join("");
  };

  render("all");
  document.querySelectorAll("[data-quiz-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-quiz-filter]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      render(btn.dataset.quizFilter);
    });
  });
}

function initStudentResults() {
  const user = renderAppShell({ role: "student", activeKey: "results", pageTitle: "Results" });
  if (!user) return;

  const highlightId = new URLSearchParams(location.search).get("submissionId");
  if (highlightId) renderSubmissionSpotlight(highlightId);

  const subs = getSubmissionsByStudent(user.id).sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const el = document.getElementById("resultsBody");

  if (subs.length === 0) {
    el.innerHTML = emptyState("bi-bar-chart", "No results yet", "Take a quiz to see your scores here.");
    return;
  }

  el.innerHTML = subs.map(s => {
    const quiz = getQuizById(s.quizId);
    const cls = getClassById(s.classId);
    return `
    <tr>
      <td class="fw-semibold">${escapeHtml(quiz ? quiz.title : "Deleted quiz")}</td>
      <td class="text-muted-soft small">${escapeHtml(cls ? cls.name : "—")}</td>
      <td class="text-muted-soft small">${formatDate(s.submittedAt)}</td>
      <td>${s.earnedPoints}/${s.totalPoints}</td>
      <td><span class="badge-soft ${s.percentage >= 60 ? "badge-teal" : "badge-danger"}">${s.percentage}%</span></td>
      <td>${s.correctAnswers} correct · ${s.incorrectAnswers} incorrect</td>
    </tr>`;
  }).join("");
}

function renderSubmissionSpotlight(submissionId) {
  const sub = getSubmissionById(submissionId);
  const spotlight = document.getElementById("resultSpotlight");
  if (!sub) { spotlight.classList.add("d-none"); return; }
  const quiz = getQuizById(sub.quizId);
  const questions = getQuestionsByQuiz(sub.quizId);
  const passed = sub.percentage >= (quiz ? quiz.settings.passingScore : 60);

  spotlight.classList.remove("d-none");
  spotlight.innerHTML = `
    <div class="card-panel p-4 mb-4 animate-in">
      <div class="row align-items-center g-4">
        <div class="col-md-3 text-center">
          <div class="score-ring mx-auto" style="--pct:${sub.percentage};">
            <div class="score-ring-inner"><div class="pct">${sub.percentage}%</div></div>
          </div>
        </div>
        <div class="col-md-9">
          <div class="d-flex align-items-center gap-2 mb-1">
            <h5 class="mb-0">${escapeHtml(quiz ? quiz.title : "Quiz")}</h5>
            <span class="badge-soft ${passed ? "badge-teal" : "badge-danger"}">${passed ? "Passed" : "Below passing score"}</span>
          </div>
          <p class="text-muted-soft small mb-3">Submitted ${formatDateTime(sub.submittedAt)} · Time spent ${formatDuration(sub.timeSpent)}</p>
          <div class="d-flex gap-4">
            <div><div class="fw-semibold">${sub.earnedPoints}/${sub.totalPoints}</div><div class="text-muted-soft small">Points</div></div>
            <div><div class="fw-semibold">${sub.correctAnswers}</div><div class="text-muted-soft small">Correct</div></div>
            <div><div class="fw-semibold">${sub.incorrectAnswers}</div><div class="text-muted-soft small">Incorrect</div></div>
          </div>
        </div>
      </div>
      ${quiz && quiz.settings.showCorrectAnswers ? renderAnswerReview(sub, questions) : ""}
    </div>`;
}

function renderAnswerReview(sub, questions) {
  const rows = sub.answers.map(a => {
    const q = questions.find(qq => qq.id === a.questionId);
    if (!q) return "";
    const given = (a.selectedAnswers || []).map(id => {
      if (q.type === "short_answer") return id;
      const opt = q.options.find(o => o.id === id);
      return opt ? opt.text : id;
    }).join(", ") || "No answer";
    const correct = q.type === "short_answer"
      ? q.correctAnswers.join(" / ")
      : q.correctAnswers.map(id => (q.options.find(o => o.id === id) || {}).text).join(", ");
    return `
      <div class="d-flex justify-content-between align-items-start py-3 border-bottom">
        <div class="pe-3">
          <div class="fw-semibold small">${escapeHtml(q.questionText)}</div>
          <div class="text-muted-soft small mt-1">Your answer: ${escapeHtml(given)}</div>
          ${!a.isCorrect ? `<div class="small mt-1" style="color:var(--success);">Correct answer: ${escapeHtml(correct)}</div>` : ""}
        </div>
        <i class="bi ${a.isCorrect ? "bi-check-circle-fill" : "bi-x-circle-fill"}" style="color:${a.isCorrect ? "var(--success)" : "var(--danger)"};font-size:1.1rem;"></i>
      </div>`;
  }).join("");
  return `<hr class="my-4"><h6 class="mb-2">Answer review</h6>${rows}`;
}
