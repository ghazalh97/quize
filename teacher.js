/* =========================================================
   teacher.js — page logic for all teacher-facing pages
   ========================================================= */

function initTeacherDashboard() {
  const user = renderAppShell({ role: "teacher", activeKey: "dashboard", pageTitle: "Dashboard" });
  if (!user) return;

  const stats = getTeacherOverallStats(user.id);
  document.getElementById("statStudents").textContent = stats.totalStudents;
  document.getElementById("statClasses").textContent = stats.totalClasses;
  document.getElementById("statQuizzes").textContent = stats.totalQuizzes;
  document.getElementById("statAverage").textContent = stats.averageScore + "%";

  const classes = getClassesByTeacher(user.id);
  const quizIds = classes.flatMap(c => c.quizIds);
  const allSubs = getSubmissions().filter(s => quizIds.includes(s.quizId)).sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  const recentEl = document.getElementById("recentSubmissions");
  recentEl.innerHTML = allSubs.length === 0
    ? emptyState("bi-inbox", "No submissions yet", "Once students take a quiz, results will appear here.")
    : allSubs.slice(0, 5).map(s => {
        const student = getUserById(s.studentId);
        const quiz = getQuizById(s.quizId);
        return `
        <div class="d-flex align-items-center justify-content-between py-3 border-bottom">
          <div class="d-flex align-items-center gap-3">
            <div class="avatar-circle">${initials(student ? student.fullName : "?")}</div>
            <div>
              <div class="fw-semibold small">${escapeHtml(student ? student.fullName : "Unknown")}</div>
              <div class="text-muted-soft small">${escapeHtml(quiz ? quiz.title : "—")}</div>
            </div>
          </div>
          <span class="badge-soft ${s.percentage >= 60 ? "badge-teal" : "badge-danger"}">${s.percentage}%</span>
        </div>`;
      }).join("");

  const upcoming = [];
  classes.forEach(cls => getQuizzesByClass(cls.id).filter(q => q.status === "published").forEach(qz => upcoming.push({ qz, cls })));
  upcoming.sort((a,b) => new Date(a.qz.deadline) - new Date(b.qz.deadline));
  document.getElementById("upcomingQuizzes").innerHTML = upcoming.length === 0
    ? emptyState("bi-calendar-check", "No upcoming quizzes", "Published quizzes with a deadline will show here.")
    : upcoming.slice(0, 4).map(({qz, cls}) => `
      <div class="d-flex align-items-center justify-content-between py-3 border-bottom">
        <div>
          <div class="fw-semibold small">${escapeHtml(qz.title)}</div>
          <div class="text-muted-soft small">${escapeHtml(cls.name)} · Due ${formatDate(qz.deadline)}</div>
        </div>
        <a href="quiz-builder.html?quizId=${qz.id}" class="btn btn-ghost btn-sm">Edit</a>
      </div>`).join("");

  document.getElementById("myClassesMini").innerHTML = classes.length === 0
    ? emptyState("bi-collection", "No classes yet", "Create your first class to get started.",
        `<button class="btn btn-accent btn-sm" data-bs-toggle="modal" data-bs-target="#createClassModal">Create class</button>`)
    : classes.map(cls => `
      <a href="class.html?classId=${cls.id}" class="card-panel hover-lift class-card d-block text-decoration-none mb-3">
        <div class="class-cover"></div>
        <div class="class-body">
          <div class="fw-semibold text-dark">${escapeHtml(cls.name)}</div>
          <div class="text-muted-soft small">${cls.studentIds.length} students · ${cls.quizIds.length} quizzes</div>
        </div>
      </a>`).join("");

  wireCreateClassModal(user);
}

function wireCreateClassModal(user) {
  const form = document.getElementById("createClassForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("newClassName").value.trim();
    const description = document.getElementById("newClassDescription").value.trim();
    const subject = document.getElementById("newClassSubject").value.trim();
    const level = document.getElementById("newClassLevel").value;
    if (!name) { showToast("Class name is required.", "error"); return; }
    const cls = createClass({ name, description, subject, level, teacherId: user.id, classCode: generateClassCode() });
    showToast(`Class "${cls.name}" created — code ${cls.classCode}`, "success");
    bootstrap.Modal.getInstance(document.getElementById("createClassModal")).hide();
    setTimeout(() => { window.location.href = `class.html?classId=${cls.id}`; }, 500);
  });
}

function initTeacherClasses() {
  const user = renderAppShell({ role: "teacher", activeKey: "classes", pageTitle: "My Classes" });
  if (!user) return;

  const renderGrid = () => {
    const classes = getClassesByTeacher(user.id);
    const grid = document.getElementById("classesGrid");
    grid.innerHTML = classes.length === 0
      ? emptyState("bi-collection", "No classes yet", "Create a class and share the code with your students.",
          `<button class="btn btn-accent btn-sm" data-bs-toggle="modal" data-bs-target="#createClassModal">Create class</button>`)
      : classes.map(cls => `
        <div class="col-md-6 col-lg-4">
          <div class="card-panel hover-lift class-card h-100">
            <div class="class-cover"></div>
            <div class="class-body d-flex flex-column">
              <div class="d-flex justify-content-between align-items-start">
                <div class="fw-semibold text-dark mb-1">${escapeHtml(cls.name)}</div>
                <div class="dropdown">
                  <button class="btn btn-ghost btn-sm px-2" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button>
                  <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="class.html?classId=${cls.id}"><i class="bi bi-eye me-2"></i>View</a></li>
                    <li><a class="dropdown-item" href="#" onclick="editClassPrompt('${cls.id}');return false;"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="deleteClassPrompt('${cls.id}');return false;"><i class="bi bi-trash me-2"></i>Delete</a></li>
                  </ul>
                </div>
              </div>
              <p class="small text-muted-soft mb-2">${escapeHtml(cls.description)}</p>
              <div class="d-flex justify-content-between align-items-center small text-muted-soft mb-3">
                <span><i class="bi bi-people"></i> ${cls.studentIds.length} students</span>
                <span class="badge-soft badge-blue">${escapeHtml(cls.classCode)}</span>
              </div>
              <a href="class.html?classId=${cls.id}" class="btn btn-outline-soft mt-auto">Open class</a>
            </div>
          </div>
        </div>`).join("");
  };

  renderGrid();
  wireCreateClassModal(user);
  window.refreshTeacherClasses = renderGrid;
}

function editClassPrompt(classId) {
  const cls = getClassById(classId);
  if (!cls) return;
  document.getElementById("editClassId").value = cls.id;
  document.getElementById("editClassName").value = cls.name;
  document.getElementById("editClassDescription").value = cls.description;
  document.getElementById("editClassSubject").value = cls.subject;
  document.getElementById("editClassLevel").value = cls.level;
  new bootstrap.Modal(document.getElementById("editClassModal")).show();
}

function wireEditClassModal() {
  const form = document.getElementById("editClassForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("editClassId").value;
    updateClass(id, {
      name: document.getElementById("editClassName").value.trim(),
      description: document.getElementById("editClassDescription").value.trim(),
      subject: document.getElementById("editClassSubject").value.trim(),
      level: document.getElementById("editClassLevel").value
    });
    bootstrap.Modal.getInstance(document.getElementById("editClassModal")).hide();
    showToast("Class updated.", "success");
    if (window.refreshTeacherClasses) window.refreshTeacherClasses();
  });
}

function deleteClassPrompt(classId) {
  const cls = getClassById(classId);
  confirmAction(`"${cls.name}" and all its lessons, quizzes and results will be deleted permanently.`, () => {
    deleteClass(classId);
    showToast("Class deleted.", "success");
    if (window.refreshTeacherClasses) window.refreshTeacherClasses();
  }, { title: "Delete class?" });
}

function initTeacherResults() {
  const user = renderAppShell({ role: "teacher", activeKey: "results", pageTitle: "Results" });
  if (!user) return;

  const classes = getClassesByTeacher(user.id);
  const quizzes = classes.flatMap(c => getQuizzesByClass(c.id));

  const quizFilter = document.getElementById("filterQuiz");
  quizFilter.innerHTML = `<option value="">All quizzes</option>` + quizzes.map(q => `<option value="${q.id}">${escapeHtml(q.title)}</option>`).join("");

  const render = () => {
    const quizId = quizFilter.value;
    const search = document.getElementById("filterStudent").value.trim().toLowerCase();
    const sortBy = document.getElementById("sortResults").value;

    let subs = getSubmissions().filter(s => quizzes.some(q => q.id === s.quizId));
    if (quizId) subs = subs.filter(s => s.quizId === quizId);
    if (search) subs = subs.filter(s => {
      const student = getUserById(s.studentId);
      return student && student.fullName.toLowerCase().includes(search);
    });
    if (sortBy === "score_desc") subs.sort((a,b) => b.percentage - a.percentage);
    else if (sortBy === "score_asc") subs.sort((a,b) => a.percentage - b.percentage);
    else subs.sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    const body = document.getElementById("resultsTableBody");
    if (subs.length === 0) {
      body.innerHTML = `<tr><td colspan="7">${emptyState("bi-bar-chart", "No submissions found", "Try a different filter.")}</td></tr>`;
      return;
    }
    body.innerHTML = subs.map(s => {
      const student = getUserById(s.studentId);
      const quiz = getQuizById(s.quizId);
      return `
      <tr class="cursor-pointer" onclick="viewSubmissionDetail('${s.id}')">
        <td class="fw-semibold">${escapeHtml(student ? student.fullName : "Unknown")}</td>
        <td class="small text-muted-soft">${escapeHtml(quiz ? quiz.title : "—")}</td>
        <td>${s.earnedPoints}/${s.totalPoints}</td>
        <td><span class="badge-soft ${s.percentage >= 60 ? "badge-teal" : "badge-danger"}">${s.percentage}%</span></td>
        <td class="small text-muted-soft">${formatDate(s.submittedAt)}</td>
        <td class="small text-muted-soft">${formatDuration(s.timeSpent)}</td>
        <td><span class="badge-soft ${s.percentage >= (quiz ? quiz.settings.passingScore : 60) ? "badge-teal" : "badge-danger"}">${s.percentage >= (quiz ? quiz.settings.passingScore : 60) ? "Passed" : "Failed"}</span></td>
      </tr>`;
    }).join("");
  };

  [quizFilter, document.getElementById("sortResults")].forEach(el => el.addEventListener("change", render));
  document.getElementById("filterStudent").addEventListener("input", render);
  render();
}

function viewSubmissionDetail(submissionId) {
  const sub = getSubmissionById(submissionId);
  if (!sub) return;
  const student = getUserById(sub.studentId);
  const quiz = getQuizById(sub.quizId);
  const questions = getQuestionsByQuiz(sub.quizId);

  document.getElementById("submissionDetailTitle").textContent = `${student ? student.fullName : "Unknown"} — ${quiz ? quiz.title : ""}`;
  document.getElementById("submissionDetailBody").innerHTML = `
    <div class="d-flex gap-4 mb-4">
      <div><div class="fw-semibold">${sub.earnedPoints}/${sub.totalPoints}</div><div class="text-muted-soft small">Points</div></div>
      <div><div class="fw-semibold">${sub.percentage}%</div><div class="text-muted-soft small">Score</div></div>
      <div><div class="fw-semibold">${formatDuration(sub.timeSpent)}</div><div class="text-muted-soft small">Time spent</div></div>
    </div>
    ${renderAnswerReview(sub, questions)}`;
  new bootstrap.Modal(document.getElementById("submissionDetailModal")).show();
}

function initStudentsPage() {
  const user = renderAppShell({ role: "teacher", activeKey: "students", pageTitle: "Students" });
  if (!user) return;

  const classes = getClassesByTeacher(user.id);
  const studentIds = new Set();
  classes.forEach(c => c.studentIds.forEach(id => studentIds.add(id)));
  const students = [...studentIds].map(id => getUserById(id)).filter(Boolean);

  const body = document.getElementById("studentsTableBody");
  if (students.length === 0) {
    body.innerHTML = `<tr><td colspan="6">${emptyState("bi-people", "No students yet", "Students will appear here once they join one of your classes.")}</td></tr>`;
    return;
  }

  body.innerHTML = students.map(student => {
    const studentClasses = classes.filter(c => c.studentIds.includes(student.id));
    const subs = getSubmissions().filter(s => s.studentId === student.id && studentClasses.some(c => c.id === s.classId));
    const avg = subs.length > 0 ? Math.round(subs.reduce((a,s) => a + s.percentage, 0) / subs.length) : 0;
    const lastSub = subs.sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];
    return `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          <div class="avatar-circle">${initials(student.fullName)}</div>
          <div>
            <div class="fw-semibold small">${escapeHtml(student.fullName)}</div>
            <div class="text-muted-soft small">${escapeHtml(student.email)}</div>
          </div>
        </div>
      </td>
      <td class="small text-muted-soft">${studentClasses.map(c => escapeHtml(c.name)).join(", ")}</td>
      <td><span class="badge-soft ${avg >= 60 ? "badge-teal" : "badge-danger"}">${avg}%</span></td>
      <td class="small text-muted-soft">${subs.length}</td>
      <td class="small text-muted-soft">${lastSub ? formatDate(lastSub.submittedAt) : "No activity"}</td>
    </tr>`;
  }).join("");
}
