# Ravel — Classroom & Quiz Platform

A front-end-only Classroom + Quiz Management platform built with **HTML5, CSS3, Bootstrap 5 and vanilla JavaScript**. No frameworks, no build step — open `index.html` and it works.

## Demo accounts

| Role    | Email                | Password |
|---------|-----------------------|----------|
| Teacher | teacher@example.com   | 123456   |
| Student | student@example.com   | 123456   |

Two more demo students exist (`layla@example.com`, `omar@example.com`, same password) if you want to see a class with several students.

## Running it

No server or build step is required — just open `index.html` in a browser. All data (users, classes, quizzes, questions, submissions) lives in `localStorage` under the key `classroomAppData`, seeded automatically on first load. The current session lives under `currentUser`.

To reset all demo data, open the browser console and run:

```js
resetDemoData();
```

## What's included

- **Public pages** — landing page, login, registration (student or teacher).
- **Student pages** — dashboard, my classes, class detail (lessons/materials/quizzes/announcements tabs), quiz list, quiz-taking flow with a timer and auto-scoring, results with per-question review, profile.
- **Teacher pages** — dashboard, class management (create/edit/delete, join codes), a Google-Forms-style quiz builder (multiple choice, multiple select, true/false, short answer; drag-to-reorder; duplicate/delete questions; live preview), results with search/filter/sort and a per-submission detail view, and a students roster.
- **Data layer** (`assets/js/storage.js`) — a single localStorage-backed store with CRUD helpers, ID generation, scoring logic, and demo-data seeding, so the UI never touches `localStorage` directly.

## Folder structure

```
/classroom-platform
├── index.html
├── login.html
├── register.html
├── student-dashboard.html
├── student-classes.html
├── class.html
├── quiz-list.html
├── take-quiz.html
├── results.html
├── profile.html
├── teacher-dashboard.html
├── teacher-classes.html
├── quiz-builder.html
├── teacher-results.html
├── students.html
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── storage.js      (data layer + demo data)
│       ├── auth.js         (register/login/session/guards)
│       ├── app.js          (shared shell, toasts, profile page)
│       ├── student.js      (student-facing pages)
│       ├── teacher.js      (teacher-facing pages)
│       ├── quiz-builder.js (quiz builder)
│       └── quiz.js         (quiz-taking + scoring)
└── README.md
```

## Notes on the data model

Records are plain objects with generated IDs (`user_...`, `class_...`, etc.) and relationships by ID reference (e.g. `Class.teacherId`, `Quiz.classId`, `Question.quizId`). The whole app state is one object under a single `localStorage` key, which keeps the data layer easy to swap for a real backend later — the UI only ever calls functions like `getClasses()` or `createQuiz()`, never `localStorage` directly.

## Known limitations (by design, for a front-end-only demo)

- Materials are shown per-lesson rather than as a separate uploadable file model.
- "Forgot password" shows an explanatory message rather than sending an email.
- Profile pictures are not uploadable; avatars are generated from initials.
