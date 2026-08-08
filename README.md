<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite 7" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 3" />
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white" alt="MongoDB / Mongoose" />
  <img src="https://img.shields.io/badge/Auth-JWT%20%2B%20bcrypt-orange" alt="JWT + bcrypt" />
</p>

<h1 align="center">📚 Student Notes</h1>

<p align="center">
  <strong>A full-stack study platform where students create, share, and discover notes,
  practice quizzes, and solve each other's doubts.</strong>
</p>

<p align="center">
  Upload a PDF or paste your notes · open a community quiz · ask a doubt and get it answered — all in one place.
</p>

---

## ✨ Features

### 📝 Notes
- Create notes as **plain text**, **PDF uploads** (text is auto-extracted for searchability), or **external links** (e.g. Google Drive).
- **Public / private** visibility per note — toggle anytime, share with the community only when you're ready.
- Dedicated **community feed** (`/public-notes`) showing notes shared by other students.
- Rich **note detail** view with an inline PDF viewer (pagination included), text rendering, and link handling.
- **Like, bookmark, and comment** on notes (with denormalized counters for fast list rendering).

### 🧠 Quizzes
- Build quizzes with **multiple questions**, **dynamic options**, exactly one correct answer, optional explanations, and per-question points.
- Filter by **category and difficulty**; browse the community's **public quizzes** or your own.
- Take quizzes with a **countdown timer** (auto-submits on timeout) and instant **score, percentage, and time-taken** results.
- Review every question after submission — your answer, the correct answer, and the explanation.
- **Analytics dashboard**: attempts, average score, total points, quizzes created, and category-wise performance.

### 💬 Doubt Solving
- Post doubts with **categories and tags**, then search/filter/sort the community feed (recent · popular · unanswered).
- Vote on doubts and answers; post answers, and let the author **accept the best answer** to resolve the doubt.
- Status lifecycle: `open → answered → resolved`.
- Per-user stats: questions asked, resolved, answers given, and **helpful rate**.

### 📄 PYQs (Previous Year Questions)
- Backend models and routes ready for **previous year question papers** — subject, year, exam type, and PDF storage.
- Frontend page ships as a polished *coming soon* section.

### 🔐 Auth & Security
- Registration with **strong-password policy** (min 8 chars, upper/lowercase, number, symbol), email validation, and duplicate-email protection.
- **JWT authentication** (Bearer tokens) with bcrypt password hashing.
- Forgot / reset password flow and secure change-password endpoint.
- **Rate limiting** on auth and general API endpoints.
- Ownership checks on every protected resource, safe user-field population (passwords/hashes/tokens never leave the server), and **access enforcement at the query level** — a private note owned by someone else is never even fetched.

---

## 🧰 Tech Stack

| Layer | Technologies |
| ----- | ------------ |
| **Frontend** | React 19, Vite 7, Tailwind CSS 3, React Router 7, react-pdf |
| **Backend** | Node.js, Express 5, Mongoose 8, JWT, bcrypt, multer, pdf-parse |
| **Database** | MongoDB (local or Atlas) |

---

## 📁 Project Structure

```
student-notes/
├── backend/                  # Express REST API
│   ├── config/               # DB connection
│   ├── controllers/          # Route handlers (auth, notes, quizzes, doubts, PYQs)
│   ├── middleware/           # Auth, error handler, upload (multer)
│   ├── models/               # Mongoose schemas (User, Note, Quiz, Doubt, PYQ, …)
│   ├── routes/               # API route definitions
│   ├── utilits/              # Helpers (PDF extraction, validators, async handler)
│   ├── server.js             # Server entry point
│   └── .env                  # Environment configuration
├── frontend/                 # React SPA
│   └── src/
│       ├── components/       # Navbar, Chatbot
│       ├── context/          # AuthContext (global auth state)
│       ├── services/         # API client + page components
│       └── App.jsx           # Routes
└── uploads/                  # Uploaded PDF files (served statically)
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- **MongoDB** — either a local instance or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster

### 1. Clone & install

```bash
git clone https://github.com/<your-username>/student-notes.git
cd student-notes
```

### 2. Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/notesdb   # or your Atlas connection string
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
```

Start the API server:

```bash
npm start        # runs nodemon on http://localhost:3000
```

### 3. Frontend

```bash
cd ../frontend
npm install
npm run dev      # Vite dev server on http://localhost:5173
```

Open **http://localhost:5173**, register an account, and start sharing notes, building quizzes, and asking doubts.

---

## 🔌 API Overview

| Method | Endpoint                | Description                        |
| ------ | ----------------------- | ---------------------------------- |
| POST   | `/api/register`         | Register a new user                |
| POST   | `/api/login`            | Login, returns a JWT               |
| PUT    | `/api/change-password`  | Change password (authenticated)    |
| POST   | `/api/notes`            | Create a note (text / PDF / link)  |
| GET    | `/api/notes`            | List your notes                    |
| GET    | `/api/notes/public`     | Community feed of public notes     |
| GET    | `/api/notes/:id`        | Get a note (owner or public only)  |
| PUT    | `/api/notes/:id`        | Edit your note                     |
| PATCH  | `/api/notes/:id/visibility` | Toggle public/private           |
| DELETE | `/api/notes/:id`        | Delete your note                   |
| GET    | `/api/quizzes`          | List quizzes (filter + pagination) |
| POST   | `/api/quizzes`          | Create a quiz                      |
| POST   | `/api/quizzes/:id/attempts/start` | Start a quiz attempt      |
| POST   | `/api/quizzes/:id/attempts/submit` | Submit & score an attempt |
| GET    | `/api/doubts`           | Doubt feed (search/filter/sort)    |
| POST   | `/api/doubts`           | Ask a doubt                        |
| POST   | `/api/doubts/:id/answers` | Answer a doubt                   |
| PATCH  | `/api/doubts/:id/accept/:answerId` | Accept an answer          |
| POST   | `/api/pyqs`             | Upload a previous year paper       |

> Most endpoints require `Authorization: Bearer <token>`.

---

## 🛡️ Security Notes

- Passwords are hashed with **bcrypt** before storage.
- JWT secrets and DB credentials live only in the backend `.env`.
- Route handlers rate-limit brute-force attempts on login/register.
- Resource queries are scoped by ownership **at the database level** — private content of other users is never transmitted.

---

## 🗺️ Roadmap

- [x] Notes with PDF / text / link attachments
- [x] Public community notes feed
- [ ] Likes, bookmarks & comments UI polish
- [x] Quiz builder + attempt engine + analytics
- [ ] PYQs upload & browse UI
- [ ] AI-powered doubt assistant (Chatbot component scaffolded)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). © 2026 Tejesh C.

---

<p align="center">
  Made with ❤️ for students, by students.
</p>
