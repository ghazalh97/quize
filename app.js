/* =========================================================
   app.js — shared UI: toasts, sidebar, topbar user info,
   confirm modal, small formatting helpers.
   ========================================================= */

/* ---------- Toasts ---------- */
function ensureToastStack() {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  return stack;
}

function showToast(message, type = "success") {
  const icons = { success: "bi-check-circle-fill", error: "bi-x-circle-fill", info: "bi-info-circle-fill" };
  const colors = { success: "#17b8ac", error: "#d9483a", info: "#3462e8" };
  const stack = ensureToastStack();
  const el = document.createElement("div");
  el.className = "card-panel animate-in";
  el.style.cssText = `min-width:260px;max-width:340px;padding:14px 16px;display:flex;align-items:flex-start;gap:10px;border-left:4px solid ${colors[type]};`;
  el.innerHTML = `<i class="bi ${icons[type]}" style="color:${colors[type]};font-size:1.1rem;margin-top:1px;"></i><div style="font-size:0.92rem;color:#16233b;">${message}</div>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity 220ms, transform 220ms";
    el.style.opacity = "0";
    el.style.transform = "translateX(12px)";
    setTimeout(() => el.remove(), 240);
  }, 3400);
}

/* ---------- Confirm modal (replaces window.confirm) ---------- */
function confirmAction(message, onConfirm, opts = {}) {
  let modalEl = document.getElementById("globalConfirmModal");
  if (!modalEl) {
    modalEl = document.createElement("div");
    modalEl.id = "globalConfirmModal";
    modalEl.className = "modal fade";
    modalEl.tabIndex = -1;
    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="border-radius:16px;border:none;">
          <div class="modal-body p-4">
            <div class="d-flex align-items-start gap-3">
              <div class="feature-icon" style="background:#fdeceb;color:#d9483a;"><i class="bi bi-exclamation-triangle-fill"></i></div>
              <div>
                <h5 class="mb-1" id="globalConfirmTitle">Are you sure?</h5>
                <p class="text-muted-soft mb-0" id="globalConfirmMessage"></p>
              </div>
            </div>
          </div>
          <div class="modal-footer border-0 pt-0 px-4 pb-4">
            <button type="button" class="btn btn-ghost" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger-soft" id="globalConfirmBtn">Confirm</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modalEl);
  }
  modalEl.querySelector("#globalConfirmTitle").textContent = opts.title || "Are you sure?";
  modalEl.querySelector("#globalConfirmMessage").textContent = message;
  const btn = modalEl.querySelector("#globalConfirmBtn");
  const modal = new bootstrap.Modal(modalEl);
  const freshBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(freshBtn, btn);
  freshBtn.addEventListener("click", () => {
    modal.hide();
    onConfirm();
  });
  modal.show();
}

/* ---------- Sidebar / topbar shell ---------- */
function buildSidebar(role, activeKey) {
  const items = role === "teacher" ? [
    { key: "dashboard", href: "teacher-dashboard.html", icon: "bi-grid-1x2-fill", label: "Dashboard" },
    { key: "classes", href: "teacher-classes.html", icon: "bi-collection-fill", label: "My Classes" },
    { key: "students", href: "students.html", icon: "bi-people-fill", label: "Students" },
    { key: "results", href: "teacher-results.html", icon: "bi-bar-chart-fill", label: "Results" },
    { key: "profile", href: "profile.html", icon: "bi-person-circle", label: "Profile" }
  ] : [
    { key: "dashboard", href: "student-dashboard.html", icon: "bi-grid-1x2-fill", label: "Dashboard" },
    { key: "classes", href: "student-classes.html", icon: "bi-collection-fill", label: "My Classes" },
    { key: "quizzes", href: "quiz-list.html", icon: "bi-patch-question-fill", label: "Quizzes" },
    { key: "results", href: "results.html", icon: "bi-bar-chart-fill", label: "Results" },
    { key: "profile", href: "profile.html", icon: "bi-person-circle", label: "Profile" }
  ];

  const nav = items.map(it => `
    <a href="${it.href}" class="nav-link ${activeKey === it.key ? "active" : ""}">
      <i class="bi ${it.icon}"></i><span>${it.label}</span>
    </a>`).join("");

  return `
    <aside class="app-sidebar" id="appSidebar">
      <div class="brand">
        <div class="brand-mark">R</div>
        <div class="brand-name">Ravel</div>
      </div>
      <nav>${nav}</nav>
      <div class="sidebar-footer">
        <a href="#" class="nav-link" id="logoutLink"><i class="bi bi-box-arrow-right"></i><span>Logout</span></a>
      </div>
    </aside>
    <div class="sidebar-backdrop" id="sidebarBackdrop"></div>`;
}

function buildTopbar(user, pageTitle) {
  return `
    <header class="app-topbar">
      <div class="d-flex align-items-center gap-3">
        <button class="btn btn-ghost d-lg-none px-2" id="sidebarToggle"><i class="bi bi-list fs-4"></i></button>
        <h1 class="h5 mb-0 display-font">${pageTitle}</h1>
      </div>
      <div class="d-flex align-items-center gap-3">
        <a href="profile.html" class="d-flex align-items-center gap-2 text-decoration-none">
          <div class="avatar-circle">${initials(user.fullName)}</div>
          <div class="d-none d-sm-block">
            <div class="fw-semibold small text-dark">${user.fullName}</div>
            <div class="text-muted-soft" style="font-size:0.76rem;text-transform:capitalize;">${user.role}</div>
          </div>
        </a>
      </div>
    </header>`;
}

/**
 * Renders the sidebar + topbar shell into #appShellRoot and moves
 * any existing #pageContent into the main content area.
 */
function renderAppShell({ role, activeKey, pageTitle }) {
  const user = requireAuth(role);
  if (!user) return null;

  const root = document.getElementById("appShellRoot");
  const contentSource = document.getElementById("pageContent");
  const innerHTML = contentSource ? contentSource.innerHTML : "";
  if (contentSource) contentSource.remove();

  root.innerHTML = `
    <div class="app-shell">
      ${buildSidebar(role, activeKey)}
      <div class="app-main">
        ${buildTopbar(user, pageTitle)}
        <div class="app-content animate-in" id="pageContent">${innerHTML}</div>
      </div>
    </div>`;

  document.getElementById("logoutLink").addEventListener("click", (e) => { e.preventDefault(); logout(); });

  const toggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("appSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  if (toggle) {
    toggle.addEventListener("click", () => { sidebar.classList.add("open"); backdrop.classList.add("show"); });
    backdrop.addEventListener("click", () => { sidebar.classList.remove("open"); backdrop.classList.remove("show"); });
  }

  return user;
}

/* ---------- Formatting helpers ---------- */
function formatDate(iso, opts = {}) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", ...opts });
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "—";
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return `${m}m ${s}s`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function emptyState(icon, title, subtitle, ctaHtml = "") {
  return `
    <div class="empty-state">
      <div class="empty-icon"><i class="bi ${icon}"></i></div>
      <h6 class="mb-1">${title}</h6>
      <p class="mb-3">${subtitle}</p>
      ${ctaHtml}
    </div>`;
}

function questionTypeLabel(type) {
  return { multiple_choice: "Multiple choice", multiple_select: "Multiple select", true_false: "True / False", short_answer: "Short answer" }[type] || type;
}

function quizStatusBadge(status) {
  const map = { draft: "badge-muted", published: "badge-teal", closed: "badge-danger" };
  return `<span class="badge-soft ${map[status] || "badge-muted"}">${status}</span>`;
}

/* ---------- Profile page (shared by student + teacher) ---------- */
function initProfilePage() {
  const session = requireAuth(null);
  if (!session) return;
  const user = getUserById(session.id) || session;

  renderAppShell({ role: user.role, activeKey: "profile", pageTitle: "Profile" });

  document.getElementById("profileAvatar").textContent = initials(user.fullName);
  document.getElementById("profileName").textContent = user.fullName;
  document.getElementById("profileRoleBadge").textContent = user.role;
  document.getElementById("profileJoined").textContent = `Joined ${formatDate(user.createdAt)}`;

  document.getElementById("editFullName").value = user.fullName;
  document.getElementById("editEmail").value = user.email;

  if (user.role === "student") {
    const stats = getStudentOverallStats(user.id);
    document.getElementById("profileStats").innerHTML = `
      <div class="col-4 text-center"><div class="fw-semibold">${stats.totalClasses}</div><div class="text-muted-soft small">Classes</div></div>
      <div class="col-4 text-center"><div class="fw-semibold">${stats.completedQuizzes}</div><div class="text-muted-soft small">Quizzes taken</div></div>
      <div class="col-4 text-center"><div class="fw-semibold">${stats.averageScore}%</div><div class="text-muted-soft small">Average score</div></div>`;
  } else {
    const stats = getTeacherOverallStats(user.id);
    document.getElementById("profileStats").innerHTML = `
      <div class="col-4 text-center"><div class="fw-semibold">${stats.totalClasses}</div><div class="text-muted-soft small">Classes</div></div>
      <div class="col-4 text-center"><div class="fw-semibold">${stats.totalStudents}</div><div class="text-muted-soft small">Students</div></div>
      <div class="col-4 text-center"><div class="fw-semibold">${stats.totalQuizzes}</div><div class="text-muted-soft small">Quizzes</div></div>`;
  }

  document.getElementById("editProfileForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fullName = document.getElementById("editFullName").value.trim();
    const email = document.getElementById("editEmail").value.trim();
    if (!fullName || !isValidEmail(email)) { showToast("Enter a valid name and email.", "error"); return; }
    const existing = getUserByEmail(email);
    if (existing && existing.id !== user.id) { showToast("That email is already in use.", "error"); return; }
    updateUser(user.id, { fullName, email });
    setCurrentUser({ ...user, fullName, email });
    showToast("Profile updated.", "success");
    setTimeout(() => location.reload(), 500);
  });
}
