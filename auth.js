/* =========================================================
   auth.js — registration, login, session, route guards
   ========================================================= */

function getCurrentUser() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function setCurrentUser(user) {
  const safe = { id: user.id, fullName: user.fullName, email: user.email, role: user.role, profileImage: user.profileImage || "" };
  localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "login.html";
}

function registerUser({ fullName, email, password, confirmPassword, role }) {
  fullName = (fullName || "").trim();
  email = (email || "").trim();

  if (!fullName || !email || !password || !confirmPassword) {
    return { ok: false, message: "Please fill in every field." };
  }
  if (!isValidEmail(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (password.length < 6) {
    return { ok: false, message: "Password must be at least 6 characters." };
  }
  if (password !== confirmPassword) {
    return { ok: false, message: "Passwords don't match." };
  }
  if (getUserByEmail(email)) {
    return { ok: false, message: "An account with this email already exists." };
  }
  if (!["student", "teacher"].includes(role)) {
    return { ok: false, message: "Choose an account type." };
  }

  const user = createUser({ fullName, email, password, role });
  setCurrentUser(user);
  return { ok: true, user };
}

function loginUser({ email, password }) {
  email = (email || "").trim();
  const user = getUserByEmail(email);
  if (!user || user.password !== password) {
    return { ok: false, message: "Email or password is incorrect." };
  }
  setCurrentUser(user);
  return { ok: true, user };
}

/**
 * Call at the top of any protected page.
 * requiredRole: "student" | "teacher" | null (any logged-in user)
 */
function requireAuth(requiredRole) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  if (requiredRole && user.role !== requiredRole) {
    window.location.href = user.role === "teacher" ? "teacher-dashboard.html" : "student-dashboard.html";
    return null;
  }
  return user;
}

/** Call on public auth pages so logged-in users skip straight to their dashboard. */
function redirectIfLoggedIn() {
  const user = getCurrentUser();
  if (user) {
    window.location.href = user.role === "teacher" ? "teacher-dashboard.html" : "student-dashboard.html";
  }
}

function initials(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
}
