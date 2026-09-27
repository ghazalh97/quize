/* =========================================================
   storage.js — data layer (LocalStorage-backed)
   All CRUD + demo data lives here. UI code never touches
   localStorage directly — it calls these functions.
   ========================================================= */

const APP_KEY = "classroomAppData";
const SESSION_KEY = "currentUser";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function emptyAppData() {
  return {
    users: [],
    classes: [],
    lessons: [],
    quizzes: [],
    questions: [],
    submissions: [],
    announcements: []
  };
}

function getAppData() {
  const raw = localStorage.getItem(APP_KEY);
  if (!raw) {
    const seeded = buildDemoData();
    saveAppData(seeded);
    return seeded;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Corrupt app data, resetting.", e);
    const seeded = buildDemoData();
    saveAppData(seeded);
    return seeded;
  }
}

function saveAppData(data) {
  localStorage.setItem(APP_KEY, JSON.stringify(data));
}

/* ---------- Getters ---------- */
function getUsers() { return getAppData().users; }
function getClasses() { return getAppData().classes; }
function getLessons() { return getAppData().lessons; }
function getQuizzes() { return getAppData().quizzes; }
function getQuestions() { return getAppData().questions; }
function getSubmissions() { return getAppData().submissions; }
function getAnnouncements() { return getAppData().announcements; }

function getUserById(id) { return getUsers().find(u => u.id === id) || null; }
function getUserByEmail(email) {
  return getUsers().find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
}
function getClassById(id) { return getClasses().find(c => c.id === id) || null; }
function getClassByCode(code) {
  return getClasses().find(c => c.classCode.toLowerCase() === String(code).toLowerCase()) || null;
}
function getLessonById(id) { return getLessons().find(l => l.id === id) || null; }
function getQuizById(id) { return getQuizzes().find(q => q.id === id) || null; }
function getQuestionById(id) { return getQuestions().find(q => q.id === id) || null; }
function getSubmissionById(id) { return getSubmissions().find(s => s.id === id) || null; }

function getLessonsByClass(classId) { return getLessons().filter(l => l.classId === classId).sort((a,b)=>a.order-b.order); }
function getQuizzesByClass(classId) { return getQuizzes().filter(q => q.classId === classId); }
function getQuestionsByQuiz(quizId) { return getQuestions().filter(q => q.quizId === quizId).sort((a,b)=>a.order-b.order); }
function getSubmissionsByQuiz(quizId) { return getSubmissions().filter(s => s.quizId === quizId); }
function getSubmissionsByStudent(studentId) { return getSubmissions().filter(s => s.studentId === studentId); }
function getAnnouncementsByClass(classId) { return getAnnouncements().filter(a => a.classId === classId).sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)); }
function getClassesByTeacher(teacherId) { return getClasses().filter(c => c.teacherId === teacherId); }
function getClassesForStudent(studentId) { return getClasses().filter(c => c.studentIds.includes(studentId)); }

/* ---------- Create ---------- */
function createUser(user) {
  const data = getAppData();
  const record = { id: generateId("user"), createdAt: new Date().toISOString(), profileImage: "", ...user };
  data.users.push(record);
  saveAppData(data);
  return record;
}

function createClass(classData) {
  const data = getAppData();
  const record = {
    id: generateId("class"),
    createdAt: new Date().toISOString(),
    studentIds: [],
    lessonIds: [],
    quizIds: [],
    ...classData
  };
  data.classes.push(record);
  saveAppData(data);
  return record;
}

function createLesson(lesson) {
  const data = getAppData();
  const record = { id: generateId("lesson"), createdAt: new Date().toISOString(), ...lesson };
  data.lessons.push(record);
  const cls = data.classes.find(c => c.id === lesson.classId);
  if (cls) cls.lessonIds.push(record.id);
  saveAppData(data);
  return record;
}

function createQuiz(quiz) {
  const data = getAppData();
  const record = {
    id: generateId("quiz"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "draft",
    questionIds: [],
    settings: {
      timeLimit: 20,
      maxAttempts: 1,
      randomizeQuestions: false,
      showCorrectAnswers: true,
      showScoreImmediately: true,
      requireLogin: true,
      passingScore: 60
    },
    ...quiz
  };
  data.quizzes.push(record);
  const cls = data.classes.find(c => c.id === quiz.classId);
  if (cls && !cls.quizIds.includes(record.id)) cls.quizIds.push(record.id);
  saveAppData(data);
  return record;
}

function createQuestion(question) {
  const data = getAppData();
  const record = { id: generateId("question"), ...question };
  data.questions.push(record);
  const quiz = data.quizzes.find(q => q.id === question.quizId);
  if (quiz && !quiz.questionIds.includes(record.id)) quiz.questionIds.push(record.id);
  saveAppData(data);
  return record;
}

function createSubmission(submission) {
  const data = getAppData();
  const record = { id: generateId("submission"), startedAt: new Date().toISOString(), status: "submitted", ...submission };
  data.submissions.push(record);
  saveAppData(data);
  return record;
}

function createAnnouncement(announcement) {
  const data = getAppData();
  const record = { id: generateId("announcement"), createdAt: new Date().toISOString(), ...announcement };
  data.announcements.push(record);
  saveAppData(data);
  return record;
}

/* ---------- Update ---------- */
function updateUser(id, updates) {
  const data = getAppData();
  const rec = data.users.find(u => u.id === id);
  if (!rec) return null;
  Object.assign(rec, updates);
  saveAppData(data);
  return rec;
}

function updateClass(id, updates) {
  const data = getAppData();
  const rec = data.classes.find(c => c.id === id);
  if (!rec) return null;
  Object.assign(rec, updates);
  saveAppData(data);
  return rec;
}

function updateLesson(id, updates) {
  const data = getAppData();
  const rec = data.lessons.find(l => l.id === id);
  if (!rec) return null;
  Object.assign(rec, updates);
  saveAppData(data);
  return rec;
}

function updateQuiz(id, updates) {
  const data = getAppData();
  const rec = data.quizzes.find(q => q.id === id);
  if (!rec) return null;
  Object.assign(rec, updates, { updatedAt: new Date().toISOString() });
  saveAppData(data);
  return rec;
}

function updateQuestion(id, updates) {
  const data = getAppData();
  const rec = data.questions.find(q => q.id === id);
  if (!rec) return null;
  Object.assign(rec, updates);
  saveAppData(data);
  return rec;
}

/* ---------- Delete ---------- */
function deleteClass(id) {
  const data = getAppData();
  const quizIds = data.quizzes.filter(q => q.classId === id).map(q => q.id);
  data.questions = data.questions.filter(q => !quizIds.includes(q.quizId));
  data.quizzes = data.quizzes.filter(q => q.classId !== id);
  data.lessons = data.lessons.filter(l => l.classId !== id);
  data.announcements = data.announcements.filter(a => a.classId !== id);
  data.submissions = data.submissions.filter(s => s.classId !== id);
  data.classes = data.classes.filter(c => c.id !== id);
  saveAppData(data);
}

function deleteQuiz(id) {
  const data = getAppData();
  data.questions = data.questions.filter(q => q.quizId !== id);
  data.submissions = data.submissions.filter(s => s.quizId !== id);
  data.quizzes = data.quizzes.filter(q => q.id !== id);
  data.classes.forEach(c => { c.quizIds = c.quizIds.filter(qid => qid !== id); });
  saveAppData(data);
}

function deleteQuestion(id) {
  const data = getAppData();
  data.questions = data.questions.filter(q => q.id !== id);
  data.quizzes.forEach(qz => { qz.questionIds = qz.questionIds.filter(qid => qid !== id); });
  saveAppData(data);
}

function deleteLesson(id) {
  const data = getAppData();
  data.lessons = data.lessons.filter(l => l.id !== id);
  data.classes.forEach(c => { c.lessonIds = c.lessonIds.filter(lid => lid !== id); });
  saveAppData(data);
}

/* ---------- Relationship actions ---------- */
function joinClassByCode(studentId, code) {
  const cls = getClassByCode(code.trim());
  if (!cls) return { ok: false, message: "No class matches that code. Check it and try again." };
  if (cls.studentIds.includes(studentId)) return { ok: false, message: "You're already enrolled in this class." };
  const data = getAppData();
  const dataCls = data.classes.find(c => c.id === cls.id);
  dataCls.studentIds.push(studentId);
  saveAppData(data);
  return { ok: true, class: dataCls };
}

function generateClassCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const rand = (n, pool) => Array.from({length:n}, () => pool[Math.floor(Math.random()*pool.length)]).join("");
  return `${rand(3, letters)}-${rand(3, "0123456789")}`;
}

/* ---------- Scoring ---------- */
function normalizeText(s) { return String(s || "").trim().toLowerCase().replace(/\s+/g, " "); }

function scoreSubmission(quiz, questions, answersMap) {
  // answersMap: { [questionId]: string[] }  (selected option ids, or raw text for short_answer)
  let totalPoints = 0, earnedPoints = 0, correctCount = 0, incorrectCount = 0;
  const answers = questions.map(q => {
    const given = answersMap[q.id] || [];
    totalPoints += q.points;
    let isCorrect = false;

    if (q.type === "short_answer") {
      const acceptable = (q.correctAnswers || []).map(normalizeText);
      const givenText = normalizeText(given[0] || "");
      isCorrect = givenText.length > 0 && acceptable.includes(givenText);
    } else {
      const correct = [...(q.correctAnswers || [])].sort();
      const chosen = [...given].sort();
      isCorrect = correct.length === chosen.length && correct.every((v, i) => v === chosen[i]);
    }

    const earned = isCorrect ? q.points : 0;
    earnedPoints += earned;
    if (isCorrect) correctCount++; else incorrectCount++;

    return { questionId: q.id, selectedAnswers: given, isCorrect, earnedPoints: earned };
  });

  const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  return { answers, totalPoints, earnedPoints, percentage, correctCount, incorrectCount };
}

/* ---------- Progress ---------- */
function getStudentProgressForClass(studentId, classId) {
  const cls = getClassById(classId);
  if (!cls) return { progressPercentage: 0, averageScore: 0, completedQuizzes: [], completedLessons: [] };
  const quizzes = getQuizzesByClass(classId).filter(q => q.status === "published");
  const studentSubs = getSubmissions().filter(s => s.studentId === studentId && s.classId === classId);
  const completedQuizIds = [...new Set(studentSubs.map(s => s.quizId))];
  const progressPercentage = quizzes.length > 0 ? Math.round((completedQuizIds.length / quizzes.length) * 100) : 0;
  const avg = studentSubs.length > 0
    ? Math.round(studentSubs.reduce((sum, s) => sum + s.percentage, 0) / studentSubs.length)
    : 0;
  return {
    progressPercentage,
    averageScore: avg,
    completedQuizzes: completedQuizIds,
    completedLessons: [],
    totalQuizzes: quizzes.length
  };
}

function getStudentOverallStats(studentId) {
  const subs = getSubmissionsByStudent(studentId);
  const classes = getClassesForStudent(studentId);
  const avg = subs.length > 0 ? Math.round(subs.reduce((s, x) => s + x.percentage, 0) / subs.length) : 0;
  let pending = 0;
  classes.forEach(cls => {
    const quizzes = getQuizzesByClass(cls.id).filter(q => q.status === "published");
    quizzes.forEach(qz => {
      const attempts = subs.filter(s => s.quizId === qz.id).length;
      if (attempts < qz.settings.maxAttempts) pending++;
    });
  });
  return { totalClasses: classes.length, pendingQuizzes: pending, completedQuizzes: subs.length, averageScore: avg };
}

function getTeacherOverallStats(teacherId) {
  const classes = getClassesByTeacher(teacherId);
  const studentIds = new Set();
  classes.forEach(c => c.studentIds.forEach(id => studentIds.add(id)));
  const quizIds = classes.flatMap(c => c.quizIds);
  const subs = getSubmissions().filter(s => quizIds.includes(s.quizId));
  const avg = subs.length > 0 ? Math.round(subs.reduce((s, x) => s + x.percentage, 0) / subs.length) : 0;
  return { totalStudents: studentIds.size, totalClasses: classes.length, totalQuizzes: quizIds.length, averageScore: avg };
}

/* ---------- Validation helpers ---------- */
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

/* ---------- Demo data ---------- */
function buildDemoData() {
  const data = emptyAppData();
  const now = new Date().toISOString();

  const teacher = { id: "user_teacher_1", fullName: "Amina Rahimi", email: "teacher@example.com", password: "123456", role: "teacher", profileImage: "", createdAt: now };
  const student1 = { id: "user_student_1", fullName: "Yusuf Karimi", email: "student@example.com", password: "123456", role: "student", profileImage: "", createdAt: now };
  const student2 = { id: "user_student_2", fullName: "Layla Ahmadi", email: "layla@example.com", password: "123456", role: "student", profileImage: "", createdAt: now };
  const student3 = { id: "user_student_3", fullName: "Omar Sadiqi", email: "omar@example.com", password: "123456", role: "student", profileImage: "", createdAt: now };
  data.users.push(teacher, student1, student2, student3);

  const class1 = {
    id: "class_web101", name: "Web Development Foundations", description: "HTML, CSS and the fundamentals of building for the web.",
    subject: "Computer Science", level: "Beginner", teacherId: teacher.id, classCode: "WEB-101", createdAt: now,
    studentIds: [student1.id, student2.id], lessonIds: [], quizIds: []
  };
  const class2 = {
    id: "class_biz201", name: "Intro to Digital Business", description: "Foundations of running a small business online.",
    subject: "Business", level: "Intermediate", teacherId: teacher.id, classCode: "BIZ-201", createdAt: now,
    studentIds: [student1.id, student3.id], lessonIds: [], quizIds: []
  };
  data.classes.push(class1, class2);

  const lessons = [
    { id: "lesson_1", classId: class1.id, title: "What is HTML?", description: "Structure and semantics.", content: "HTML gives your page structure and meaning.", order: 1, createdAt: now },
    { id: "lesson_2", classId: class1.id, title: "Styling with CSS", description: "Selectors, box model, layout.", content: "CSS controls how your HTML looks.", order: 2, createdAt: now },
    { id: "lesson_3", classId: class2.id, title: "Finding Your Market", description: "Who you're building for.", content: "Every business starts with a clear audience.", order: 1, createdAt: now }
  ];
  data.lessons.push(...lessons);
  class1.lessonIds = ["lesson_1", "lesson_2"];
  class2.lessonIds = ["lesson_3"];

  const quiz1 = {
    id: "quiz_html_basics", classId: class1.id, title: "HTML Basics Quiz", description: "Check your understanding of core HTML concepts.",
    teacherId: teacher.id, status: "published",
    settings: { timeLimit: 10, maxAttempts: 2, randomizeQuestions: false, showCorrectAnswers: true, showScoreImmediately: true, requireLogin: true, passingScore: 60 },
    startDate: now, deadline: new Date(Date.now() + 30*86400000).toISOString(),
    questionIds: [], createdAt: now, updatedAt: now
  };
  const quiz2 = {
    id: "quiz_css_layout", classId: class1.id, title: "CSS Layout Check", description: "Boxes, flex and a few gotchas.",
    teacherId: teacher.id, status: "published",
    settings: { timeLimit: 15, maxAttempts: 1, randomizeQuestions: false, showCorrectAnswers: true, showScoreImmediately: true, requireLogin: true, passingScore: 60 },
    startDate: now, deadline: new Date(Date.now() + 20*86400000).toISOString(),
    questionIds: [], createdAt: now, updatedAt: now
  };
  const quiz3 = {
    id: "quiz_biz_intro", classId: class2.id, title: "Market Basics Quiz", description: "Draft quiz — still being built.",
    teacherId: teacher.id, status: "draft",
    settings: { timeLimit: 10, maxAttempts: 1, randomizeQuestions: false, showCorrectAnswers: true, showScoreImmediately: true, requireLogin: true, passingScore: 60 },
    startDate: now, deadline: new Date(Date.now() + 25*86400000).toISOString(),
    questionIds: [], createdAt: now, updatedAt: now
  };
  data.quizzes.push(quiz1, quiz2, quiz3);
  class1.quizIds = [quiz1.id, quiz2.id];
  class2.quizIds = [quiz3.id];

  const q1 = {
    id: "q_h1", quizId: quiz1.id, type: "multiple_choice", questionText: "What does HTML stand for?",
    options: [
      { id: "o1", text: "Hyper Text Markup Language" },
      { id: "o2", text: "High Text Machine Language" },
      { id: "o3", text: "Hyperlink Text Markup Language" },
      { id: "o4", text: "Home Tool Markup Language" }
    ],
    correctAnswers: ["o1"], points: 2, required: true, order: 1
  };
  const q2 = {
    id: "q_h2", quizId: quiz1.id, type: "true_false", questionText: "The <img> tag requires a closing tag in HTML5.",
    options: [{ id: "true", text: "True" }, { id: "false", text: "False" }],
    correctAnswers: ["false"], points: 1, required: true, order: 2
  };
  const q3 = {
    id: "q_h3", quizId: quiz1.id, type: "multiple_select", questionText: "Which of these are valid HTML heading tags?",
    options: [
      { id: "o1", text: "<h1>" }, { id: "o2", text: "<h7>" }, { id: "o3", text: "<h3>" }, { id: "o4", text: "<head1>" }
    ],
    correctAnswers: ["o1", "o3"], points: 2, required: true, order: 3
  };
  const q4 = {
    id: "q_h4", quizId: quiz1.id, type: "short_answer", questionText: "What tag is used to create a hyperlink?",
    options: [], correctAnswers: ["a", "<a>"], points: 1, required: true, order: 4
  };
  data.questions.push(q1, q2, q3, q4);
  quiz1.questionIds = [q1.id, q2.id, q3.id, q4.id];

  const q5 = {
    id: "q_c1", quizId: quiz2.id, type: "multiple_choice", questionText: "Which CSS property controls spacing outside an element's border?",
    options: [{ id: "o1", text: "padding" }, { id: "o2", text: "margin" }, { id: "o3", text: "gap" }, { id: "o4", text: "outline" }],
    correctAnswers: ["o2"], points: 2, required: true, order: 1
  };
  const q6 = {
    id: "q_c2", quizId: quiz2.id, type: "true_false", questionText: "Flexbox items default to column direction.",
    options: [{ id: "true", text: "True" }, { id: "false", text: "False" }],
    correctAnswers: ["false"], points: 1, required: true, order: 2
  };
  data.questions.push(q5, q6);
  quiz2.questionIds = [q5.id, q6.id];

  data.announcements.push(
    { id: "ann_1", classId: class1.id, teacherId: teacher.id, title: "Welcome to the class", message: "Glad to have you here — our first lesson is up now.", createdAt: now },
    { id: "ann_2", classId: class1.id, teacherId: teacher.id, title: "Quiz reminder", message: "The HTML Basics Quiz closes at the end of the month.", createdAt: now }
  );

  const sub1Score = scoreSubmission(quiz1, [q1,q2,q3,q4], { [q1.id]: ["o1"], [q2.id]: ["false"], [q3.id]: ["o1"], [q4.id]: ["link"] });
  data.submissions.push({
    id: "sub_1", quizId: quiz1.id, studentId: student1.id, classId: class1.id,
    answers: sub1Score.answers, totalPoints: sub1Score.totalPoints, earnedPoints: sub1Score.earnedPoints,
    percentage: sub1Score.percentage, correctAnswers: sub1Score.correctCount, incorrectAnswers: sub1Score.incorrectCount,
    startedAt: now, submittedAt: now, timeSpent: 420, status: "submitted"
  });

  const sub2Score = scoreSubmission(quiz1, [q1,q2,q3,q4], { [q1.id]: ["o1"], [q2.id]: ["true"], [q3.id]: ["o1","o3"], [q4.id]: ["a"] });
  data.submissions.push({
    id: "sub_2", quizId: quiz1.id, studentId: student2.id, classId: class1.id,
    answers: sub2Score.answers, totalPoints: sub2Score.totalPoints, earnedPoints: sub2Score.earnedPoints,
    percentage: sub2Score.percentage, correctAnswers: sub2Score.correctCount, incorrectAnswers: sub2Score.incorrectCount,
    startedAt: now, submittedAt: now, timeSpent: 380, status: "submitted"
  });

  return data;
}

function resetDemoData() {
  localStorage.removeItem(APP_KEY);
  localStorage.removeItem(SESSION_KEY);
  getAppData();
}
