/* =========================================================
   quiz-builder.js — Google-Forms-style dynamic quiz builder
   ========================================================= */

let builderState = null; // { quiz, questions: [...] } — questions held in-memory, saved on demand

function initQuizBuilder() {
  const user = requireAuth("teacher");
  if (!user) return;

  const quizId = new URLSearchParams(location.search).get("quizId");
  const quiz = getQuizById(quizId);
  if (!quiz || quiz.teacherId !== user.id) {
    document.body.innerHTML = `<div class="container py-5">${emptyState("bi-exclamation-circle", "Quiz not found", "This quiz doesn't exist or you don't have access to it.", `<a href="teacher-classes.html" class="btn btn-accent btn-sm">Back to classes</a>`)}</div>`;
    return;
  }

  builderState = { quiz, questions: getQuestionsByQuiz(quiz.id) };
  const cls = getClassById(quiz.classId);

  document.getElementById("quizTitleInput").value = quiz.title;
  document.getElementById("quizDescInput").value = quiz.description || "";
  document.getElementById("builderClassName").textContent = cls ? cls.name : "";
  document.getElementById("statusBadgeWrap").innerHTML = quizStatusBadge(quiz.status);

  // Settings panel
  const s = quiz.settings;
  document.getElementById("settingTimeLimit").value = s.timeLimit;
  document.getElementById("settingMaxAttempts").value = s.maxAttempts;
  document.getElementById("settingStartDate").value = quiz.startDate ? quiz.startDate.slice(0,16) : "";
  document.getElementById("settingDeadline").value = quiz.deadline ? quiz.deadline.slice(0,16) : "";
  document.getElementById("settingPassingScore").value = s.passingScore;
  document.getElementById("settingRandomize").checked = s.randomizeQuestions;
  document.getElementById("settingShowCorrect").checked = s.showCorrectAnswers;
  document.getElementById("settingShowScore").checked = s.showScoreImmediately;
  document.getElementById("settingRequireLogin").checked = s.requireLogin;

  renderQuestions();

  document.getElementById("saveBtn").addEventListener("click", saveQuiz);
  document.getElementById("publishBtn").addEventListener("click", publishQuiz);
  document.getElementById("previewBtn").addEventListener("click", openPreview);
  document.getElementById("saveSettingsBtn").addEventListener("click", () => { saveQuiz(); showToast("Settings saved.", "success"); });
}

function addQuestion(type = "multiple_choice") {
  const order = builderState.questions.length + 1;
  const base = { id: `tmp_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, quizId: builderState.quiz.id, type, questionText: "", points: 1, required: true, order };
  if (type === "true_false") {
    base.options = [{ id: "true", text: "True" }, { id: "false", text: "False" }];
    base.correctAnswers = ["true"];
  } else if (type === "short_answer") {
    base.options = [];
    base.correctAnswers = [""];
  } else {
    base.options = [{ id: `opt_${Date.now()}_a`, text: "" }, { id: `opt_${Date.now()}_b`, text: "" }];
    base.correctAnswers = [];
  }
  builderState.questions.push(base);
  renderQuestions();
}

function renderQuestions() {
  const wrap = document.getElementById("questionsWrap");
  const empty = document.getElementById("noQuestionsEmpty");

  if (builderState.questions.length === 0) {
    wrap.innerHTML = "";
    empty.innerHTML = emptyState("bi-ui-checks-grid", "No questions yet", "Add your first question using the button below.");
    empty.classList.remove("d-none");
    return;
  }
  empty.classList.add("d-none");

  wrap.innerHTML = builderState.questions.map((q, idx) => renderQuestionCard(q, idx)).join("");
  wireQuestionCardEvents();
  wireDragReorder();
}

function renderQuestionCard(q, idx) {
  let bodyHtml = "";
  if (q.type === "multiple_choice" || q.type === "multiple_select") {
    bodyHtml = `
      <div class="options-wrap" data-qid="${q.id}">
        ${q.options.map(opt => `
          <div class="option-row" data-oid="${opt.id}">
            <input type="${q.type === "multiple_choice" ? "radio" : "checkbox"}" name="correct_${q.id}" ${q.correctAnswers.includes(opt.id) ? "checked" : ""} class="option-correct-input" style="width:18px;height:18px;">
            <input type="text" class="form-control form-control-sm option-text-input" placeholder="Option text" value="${escapeHtml(opt.text)}">
            <button type="button" class="btn btn-ghost btn-sm px-2 remove-option-btn"><i class="bi bi-x-lg"></i></button>
          </div>`).join("")}
      </div>
      <button type="button" class="btn btn-ghost btn-sm add-option-btn mt-1"><i class="bi bi-plus-lg"></i> Add option</button>`;
  } else if (q.type === "true_false") {
    bodyHtml = `
      <div class="option-row"><input type="radio" name="correct_${q.id}" value="true" ${q.correctAnswers[0] === "true" ? "checked" : ""} class="tf-correct-input" style="width:18px;height:18px;"> <span>True</span></div>
      <div class="option-row"><input type="radio" name="correct_${q.id}" value="false" ${q.correctAnswers[0] === "false" ? "checked" : ""} class="tf-correct-input" style="width:18px;height:18px;"> <span>False</span></div>`;
  } else if (q.type === "short_answer") {
    bodyHtml = `
      <label class="form-label small">Accepted answer(s) — comma separated, case-insensitive</label>
      <input type="text" class="form-control form-control-sm short-answer-input" placeholder="e.g. paris, city of light" value="${escapeHtml(q.correctAnswers.join(", "))}">`;
  }

  return `
  <div class="question-card animate-in" data-qid="${q.id}" draggable="true">
    <div class="qc-header">
      <i class="bi bi-grip-vertical qc-handle"></i>
      <input type="text" class="form-control question-text-input flex-fill border-0 fw-semibold px-2" placeholder="Question ${idx + 1}" value="${escapeHtml(q.questionText)}" style="background:transparent;box-shadow:none;">
      <select class="form-select form-select-sm question-type-select" style="width:170px;">
        <option value="multiple_choice" ${q.type === "multiple_choice" ? "selected" : ""}>Multiple choice</option>
        <option value="multiple_select" ${q.type === "multiple_select" ? "selected" : ""}>Multiple select</option>
        <option value="true_false" ${q.type === "true_false" ? "selected" : ""}>True / False</option>
        <option value="short_answer" ${q.type === "short_answer" ? "selected" : ""}>Short answer</option>
      </select>
    </div>
    <div class="qc-body">
      ${bodyHtml}
      <div class="d-flex align-items-center justify-content-between mt-3 pt-3 border-top">
        <div class="d-flex align-items-center gap-3">
          <div class="form-check form-switch mb-0">
            <input class="form-check-input required-toggle" type="checkbox" ${q.required ? "checked" : ""}>
            <label class="form-check-label small text-muted-soft">Required</label>
          </div>
          <div class="d-flex align-items-center gap-2">
            <label class="small text-muted-soft mb-0">Points</label>
            <input type="number" min="0" class="form-control form-control-sm points-input" style="width:70px;" value="${q.points}">
          </div>
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-ghost btn-sm duplicate-btn" title="Duplicate"><i class="bi bi-files"></i></button>
          <button type="button" class="btn btn-ghost btn-sm delete-btn" title="Delete"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>
  </div>`;
}

function getQuestion(qid) { return builderState.questions.find(q => q.id === qid); }

function wireQuestionCardEvents() {
  document.querySelectorAll(".question-card").forEach(card => {
    const qid = card.dataset.qid;
    const q = getQuestion(qid);

    card.querySelector(".question-text-input").addEventListener("input", (e) => { q.questionText = e.target.value; });
    card.querySelector(".points-input").addEventListener("input", (e) => { q.points = Number(e.target.value) || 0; });
    card.querySelector(".required-toggle").addEventListener("change", (e) => { q.required = e.target.checked; });

    card.querySelector(".question-type-select").addEventListener("change", (e) => {
      const newType = e.target.value;
      q.type = newType;
      if (newType === "true_false") { q.options = [{ id: "true", text: "True" }, { id: "false", text: "False" }]; q.correctAnswers = ["true"]; }
      else if (newType === "short_answer") { q.options = []; q.correctAnswers = [""]; }
      else { q.options = q.options && q.options.length && q.options[0].id !== "true" ? q.options : [{ id: `opt_${Date.now()}_a`, text: "" }, { id: `opt_${Date.now()}_b`, text: "" }]; q.correctAnswers = []; }
      renderQuestions();
    });

    card.querySelector(".duplicate-btn").addEventListener("click", () => {
      const copy = JSON.parse(JSON.stringify(q));
      copy.id = `tmp_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
      const idx = builderState.questions.findIndex(x => x.id === qid);
      builderState.questions.splice(idx + 1, 0, copy);
      renderQuestions();
    });

    card.querySelector(".delete-btn").addEventListener("click", () => {
      confirmAction("This question will be removed from the quiz.", () => {
        builderState.questions = builderState.questions.filter(x => x.id !== qid);
        renderQuestions();
      }, { title: "Delete question?" });
    });

    if (q.type === "multiple_choice" || q.type === "multiple_select") {
      const optionsWrap = card.querySelector(".options-wrap");
      optionsWrap.querySelectorAll(".option-row").forEach(row => {
        const oid = row.dataset.oid;
        row.querySelector(".option-text-input").addEventListener("input", (e) => {
          const opt = q.options.find(o => o.id === oid);
          if (opt) opt.text = e.target.value;
        });
        row.querySelector(".option-correct-input").addEventListener("change", (e) => {
          if (q.type === "multiple_choice") { q.correctAnswers = e.target.checked ? [oid] : []; renderQuestions(); }
          else {
            const set = new Set(q.correctAnswers);
            e.target.checked ? set.add(oid) : set.delete(oid);
            q.correctAnswers = [...set];
          }
        });
        row.querySelector(".remove-option-btn").addEventListener("click", () => {
          q.options = q.options.filter(o => o.id !== oid);
          q.correctAnswers = q.correctAnswers.filter(id => id !== oid);
          renderQuestions();
        });
      });
      card.querySelector(".add-option-btn").addEventListener("click", () => {
        q.options.push({ id: `opt_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, text: "" });
        renderQuestions();
      });
    } else if (q.type === "true_false") {
      card.querySelectorAll(".tf-correct-input").forEach(input => {
        input.addEventListener("change", (e) => { q.correctAnswers = [e.target.value]; });
      });
    } else if (q.type === "short_answer") {
      card.querySelector(".short-answer-input").addEventListener("input", (e) => {
        q.correctAnswers = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
      });
    }
  });
}

function wireDragReorder() {
  const wrap = document.getElementById("questionsWrap");
  let dragEl = null;
  wrap.querySelectorAll(".question-card").forEach(card => {
    card.addEventListener("dragstart", () => { dragEl = card; card.classList.add("dragging"); });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      const newOrder = [...wrap.querySelectorAll(".question-card")].map(c => c.dataset.qid);
      builderState.questions.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
      builderState.questions.forEach((q, i) => q.order = i + 1);
    });
    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (!dragEl || dragEl === card) return;
      const rect = card.getBoundingClientRect();
      const after = (e.clientY - rect.top) > rect.height / 2;
      wrap.insertBefore(dragEl, after ? card.nextSibling : card);
    });
  });
}

function collectSettingsFromForm() {
  return {
    timeLimit: Number(document.getElementById("settingTimeLimit").value) || 10,
    maxAttempts: Number(document.getElementById("settingMaxAttempts").value) || 1,
    randomizeQuestions: document.getElementById("settingRandomize").checked,
    showCorrectAnswers: document.getElementById("settingShowCorrect").checked,
    showScoreImmediately: document.getElementById("settingShowScore").checked,
    requireLogin: document.getElementById("settingRequireLogin").checked,
    passingScore: Number(document.getElementById("settingPassingScore").value) || 60
  };
}

function persistQuestions() {
  // Remove questions deleted from this quiz, then upsert current ones.
  const existingIds = getQuestionsByQuiz(builderState.quiz.id).map(q => q.id);
  const keptIds = builderState.questions.filter(q => !q.id.startsWith("tmp_")).map(q => q.id);
  existingIds.filter(id => !keptIds.includes(id)).forEach(id => deleteQuestion(id));

  builderState.questions.forEach((q, idx) => {
    q.order = idx + 1;
    if (q.id.startsWith("tmp_")) {
      const { id, ...rest } = q;
      const created = createQuestion(rest);
      q.id = created.id; // sync in-memory id
    } else {
      updateQuestion(q.id, { questionText: q.questionText, type: q.type, options: q.options, correctAnswers: q.correctAnswers, points: q.points, required: q.required, order: q.order });
    }
  });
}

function saveQuiz() {
  const title = document.getElementById("quizTitleInput").value.trim() || "Untitled Quiz";
  const description = document.getElementById("quizDescInput").value.trim();
  const startDateRaw = document.getElementById("settingStartDate").value;
  const deadlineRaw = document.getElementById("settingDeadline").value;

  updateQuiz(builderState.quiz.id, {
    title, description,
    settings: collectSettingsFromForm(),
    startDate: startDateRaw ? new Date(startDateRaw).toISOString() : builderState.quiz.startDate,
    deadline: deadlineRaw ? new Date(deadlineRaw).toISOString() : builderState.quiz.deadline
  });
  persistQuestions();
  builderState.quiz = getQuizById(builderState.quiz.id);
  showToast("Quiz saved.", "success");
}

function publishQuiz() {
  if (builderState.questions.length === 0) {
    showToast("Add at least one question before publishing.", "error");
    return;
  }
  const incomplete = builderState.questions.find(q => !q.questionText.trim() || (q.type !== "short_answer" && q.correctAnswers.length === 0));
  if (incomplete) {
    showToast("Every question needs text and a marked correct answer.", "error");
    return;
  }
  saveQuiz();
  updateQuiz(builderState.quiz.id, { status: "published" });
  builderState.quiz = getQuizById(builderState.quiz.id);
  document.getElementById("statusBadgeWrap").innerHTML = quizStatusBadge("published");
  showToast("Quiz published — students can now take it.", "success");
}

function openPreview() {
  saveQuiz();
  const modalEl = document.getElementById("previewModal");
  const body = document.getElementById("previewBody");
  const quiz = builderState.quiz;
  const questions = builderState.questions;

  body.innerHTML = `
    <div class="mb-4">
      <h5>${escapeHtml(quiz.title)}</h5>
      <p class="text-muted-soft small">${escapeHtml(quiz.description || "")}</p>
      <div class="text-muted-soft small">${questions.length} questions · ${quiz.settings.timeLimit} min</div>
    </div>
    ${questions.map((q, i) => `
      <div class="card-panel p-3 mb-3">
        <div class="text-muted-soft small mb-1">Question ${i+1} · ${questionTypeLabel(q.type)}</div>
        <div class="fw-semibold mb-2">${escapeHtml(q.questionText || "(No question text)")}</div>
        ${(q.type === "multiple_choice" || q.type === "true_false") ? q.options.map(o => `<div class="answer-option mb-2">${escapeHtml(o.text)}</div>`).join("") : ""}
        ${q.type === "multiple_select" ? q.options.map(o => `<div class="answer-option mb-2"><i class="bi bi-square"></i> ${escapeHtml(o.text)}</div>`).join("") : ""}
        ${q.type === "short_answer" ? `<input class="form-control" disabled placeholder="Student types their answer here">` : ""}
      </div>`).join("")}`;

  new bootstrap.Modal(modalEl).show();
}
