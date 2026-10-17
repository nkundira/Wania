# Hospitality Academy

A full-stack hospitality e-learning platform with a public course catalog, video/text
lessons and quizzes, user accounts, an Instagram-style community feed, real-time chat,
and audio/video calls over WebRTC.

Built as a self-contained project: React + Vite + Tailwind CSS frontend, Node/Express +
MariaDB backend, Socket.IO for real-time features.

---

## Features

- **Course catalog** — 6 categories (Barista & Coffee, Hotel Management, F&B Service,
  Bartending & Mocktails, Housekeeping, Event Planning), modules, lessons and progress.
- **Lessons** — markdown-based written lessons, optional video, downloadable resources,
  per-course progress tracking and next/previous navigation.
- **Quizzes** — per-module multiple-choice quizzes with scoring, pass marks, per-question
  explanations and attempt history.
- **Accounts** — register/login with bcrypt-hashed passwords and JWT delivered in an
  HTTP-only cookie. Profile, bio, interests, avatar and password management.
- **Community** — create/like/comment on posts, follow users, user search, suggested
  users, community updates strip, notifications.
- **Real-time chat** — direct 1:1 conversations, live message delivery, typing indicators
  and online presence.
- **Audio/video calls** — WebRTC peer-to-peer calls with Socket.IO signaling, in-call
  mute/camera toggles, call history and missed-call records.
- **Security** — Helmet, CORS with credentials, rate limiting, input validation,
  parameterized SQL queries.

---

## Tech Stack

| Layer      | Technology                                                            |
| ---------- | --------------------------------------------------------------------- |
| Frontend   | React 19, Vite 8, Tailwind CSS 4, React Router 7, Axios, lucide-react |
| Backend    | Node.js, Express 4, Socket.IO 4, `mariadb` driver                     |
| Database   | MariaDB / MySQL (24 tables)                                           |
| Auth       | JWT in HTTP-only cookie (Bearer fallback for tooling)                 |
| Realtime   | Socket.IO (chat, presence, WebRTC signaling)                          |
| WebRTC     | Google STUN by default; optional TURN via env                         |

---

## Project Structure

```
hospitality-academy/
├── backend/
│   ├── schema.sql                 # Full database schema (24 tables)
│   ├── .env.example               # Backend environment template
│   └── src/
│       ├── server.js              # HTTP + Socket.IO entry point
│       ├── app.js                 # Express app, middleware, routes
│       ├── config/                # DB pool, init-db, seed data
│       ├── controllers/           # auth, course, community, message logic
│       ├── middleware/            # auth (JWT), validation, error handling
│       ├── routes/                # REST route definitions
│       └── sockets/               # Socket.IO auth, chat, WebRTC signaling
└── frontend/
    ├── .env.example               # Frontend (Vite) environment template
    ├── vite.config.js             # Dev proxy for /api and /socket.io
    └── src/
        ├── components/            # Navbar, Footer, MobileNav, CourseCard
        ├── context/               # AuthContext, SocketContext
        ├── services/api.js        # Axios instance (credentials included)
        ├── pages/
        │   ├── public/            # Home, CourseCatalog, CourseDetail, About, Contact
        │   ├── auth/              # Login, Register
        │   ├── learning/          # LessonPlayer (markdown + quiz), MyLearning
        │   ├── community/         # Community feed, Notifications
        │   ├── messages/          # Chat + WebRTC CallOverlay
        │   ├── profile/           # Profile, EditProfile, Settings
        │   └── calls/             # CallHistory
        └── App.jsx                # Route table
```

---

## Prerequisites

- Node.js 20+
- A running MariaDB or MySQL server

---

## Getting Started

### 1. Backend

```bash
cd backend
cp .env.example .env      # then edit DB credentials
npm install
npm run init-db           # creates the database and all tables
npm run seed              # loads demo courses, lessons, quizzes and users
npm start                 # or: npm run dev  (watch mode)
```

The API listens on `http://localhost:5000`. Health check: `GET /api/health`.

Database connection is configured entirely through `backend/.env`
(`DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_USER` / `DATABASE_PASSWORD` /
`DATABASE_NAME`, or `DATABASE_SOCKET` to connect over a Unix socket).

### 2. Frontend

```bash
cd frontend
cp .env.example .env      # optional; only needed for a TURN server
npm install               # use --legacy-peer-deps if npm complains about peers
npm run dev               # http://localhost:5173
```

The Vite dev server proxies `/api` and `/socket.io` to `http://localhost:5000`,
so the browser talks to a single origin and the auth cookie is sent automatically.

---

## Demo Accounts

All seeded users share the password **`password123`**.

| Email                  | Username               | Role              |
| ---------------------- | ---------------------- | ----------------- |
| `sarah@example.com`    | `sarah_barista`        | Barista trainer   |
| `james@example.com`    | `james_hotel`          | Hotel operations  |
| `maria@example.com`    | `maria_fbe`            | F&B service       |
| `alex@example.com`     | `alex_bartender`       | Bartending        |
| `priya@example.com`    | `priya_housekeeping`   | Housekeeping      |
| `david@example.com`    | `david_events`         | Event planning    |

> Community posts created by the seed are marked as sample content for demonstration.

---

## API Overview

All REST routes are prefixed with `/api`.

| Area        | Endpoints (abbreviated)                                                                 |
| ----------- | --------------------------------------------------------------------------------------- |
| Auth        | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PUT /auth/profile`, `PUT /auth/change-password` |
| Courses     | `GET /courses`, `GET /courses/:slug`, `POST /courses/:id/enroll`, `GET /courses/:id/progress`, `GET /lessons/:id`, `POST /lessons/:id/complete` |
| Quizzes     | `GET /quizzes/module/:moduleId`, `GET /quizzes/:quizId`, `POST /quizzes/:quizId/submit` |
| Learning    | `GET /my-learning`, `GET /quiz-results`                                                 |
| Community   | `GET/POST /community/posts`, `POST /community/posts/:id/like`, `GET/POST /community/posts/:id/comments`, `POST /community/users/:id/follow`, `GET /community/users/:username/profile`, `GET /community/users/search`, `GET /community/users/suggested`, `GET /community/notifications` |
| Messages    | `GET/POST /messages/conversations`, `GET/POST /messages/conversations/:id/messages`, `GET /messages/calls/history` |
| Uploads     | `POST /uploads` (multipart `image`, auth required) → `{ url }`, served at `/api/uploads/<file>` |

### Socket.IO events

The socket authenticates from the `token` cookie (or `auth.token` in the handshake),
then auto-joins all of the connecting user's conversation rooms.

| Group     | Events                                                                                   |
| --------- | ---------------------------------------------------------------------------------------- |
| Presence  | `presence:update`, `presence:online`                                                     |
| Chat      | `chat:join`, `chat:leave`, `chat:message`, `chat:typing`, `chat:notify`                  |
| Call flow | `call:initiate/accept/reject/cancel/offer/answer/ice-candidate/end/missed/media-state`   |
| Call recv | `call:incoming/accepted/rejected/cancelled/ended/media-state`                            |

---

## WebRTC / Calls

Calls use peer-to-peer WebRTC with the Socket.IO server acting only as a signaling relay.
Google STUN servers are used by default, which works on most networks.

For users behind symmetric NATs or restrictive firewalls, supply a TURN server via
`frontend/.env`:

```
VITE_TURN_URL=turn:your.turn.server:3478
VITE_TURN_USER=username
VITE_TURN_PASS=password
```

Camera/microphone access requires a secure context — `localhost` works in development;
production must be served over HTTPS.

---

## Scripts

**Backend**

- `npm start` — run the API
- `npm run dev` — run with file watching
- `npm run init-db` — create database and tables
- `npm run seed` — seed demo data

**Frontend**

- `npm run dev` — Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build
- `npm run lint` — run `oxlint`

---

## Deployment

The app splits cleanly into a static frontend and a stateful backend.

> **Why not Vercel for the backend?** Vercel functions are stateless and short-lived:
> they cannot hold the long-lived WebSocket connections Socket.IO uses for chat and
> WebRTC signaling, do not keep a Node process running, and have an ephemeral
> read-only filesystem (disk uploads would vanish). So deploy the **frontend on
> Vercel** and the **backend on a persistent Node host**.

### 1. Frontend → Vercel

- `frontend/vercel.json` is already configured (Vite build, SPA rewrites, legacy peer deps).
- In Vercel, create a project with **Root Directory = `frontend`** (framework auto-detects Vite).
- Build command `npm run build`, output `dist`.
- Set environment variables (Vercel → Settings → Environment Variables):
  - `VITE_API_URL` = `https://<backend-host>/api`
  - `VITE_SOCKET_URL` = `https://<backend-host>` (same host, no `/api` path)
  - optional `VITE_TURN_URL` / `VITE_TURN_USER` / `VITE_TURN_PASS`
- In local dev leave both unset so the Vite proxy (`/api`, `/socket.io`) is used.

### 2. Backend → Render / Railway / Fly.io / Koyeb

- `render.yaml` at the repo root is a ready-to-use **Render Blueprint**
  (Dashboard → New → Blueprint → pick the repo). It uses the native Node runtime
  and health check `/api/health`.
- The blueprint's persistent disk (for `.../backend/src/uploads`) is commented out
  because Render requires a **paid instance** to attach a disk. On the free plan,
  uploaded images are ephemeral (lost on redeploy) and the service sleeps after
  inactivity — upgrade to Starter+ and uncomment `disk:` for durable uploads.
- Equivalent targets: Railway, Fly.io, Koyeb, or `backend/Dockerfile`
  (native Node, `npm ci --omit=dev`, runs `node src/server.js`, `PORT` from env).
- All of these support WebSockets, which Vercel does not.

### 3. Database → managed MySQL/MariaDB

- Not on Vercel. Use a hosted MySQL/MariaDB (Render, Railway, Aiven, PlanetScale, Clever Cloud, ...).
- Set `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`.
- Set `DATABASE_SSL=true` for providers that require TLS. If the provider hides the
  CA behind `rejectUnauthorized`, adjust `ssl` in `backend/src/config/db.js`.
- Initialize + seed once: `npm run init-db && npm run seed` (note `schema.sql`
  starts with `DROP DATABASE IF EXISTS`), or run it against a local copy and import.

### 4. Wire it together (backend env)

```
NODE_ENV=production
JWT_SECRET=<long random>
SESSION_SECRET=<long random>
FRONTEND_URL=https://<your-app>.vercel.app      # comma-separated list allowed; *.vercel.app auto-allowed
DATABASE_HOST=... DATABASE_PORT=3306 DATABASE_USER=... DATABASE_PASSWORD=... DATABASE_NAME=hospitality_academy
DATABASE_SSL=true                                # if required
```

- `NODE_ENV=production` makes the auth cookie `Secure` + `SameSite=None`, which is
  required for cross-site login between `*.vercel.app` and your backend host.
- CORS/Socket.IO already allow `*.vercel.app` and any origin in `FRONTEND_URL`
  (`backend/src/config/cors.js`).
- Uploaded images persist only if you mount a disk (Render `disk`) or switch the
  upload route to object storage (S3 / Vercel Blob) and point `image_url`/`profile_picture`
  at the stored URL.

## Production Notes

- Set `NODE_ENV=production` so the auth cookie is marked `Secure` and served over HTTPS.
- Replace `JWT_SECRET` and `SESSION_SECRET` in `backend/.env` with long random strings.
- Set `FRONTEND_URL` to the deployed frontend origin (used by CORS); multiple origins
  may be comma-separated, and `*.vercel.app` is allowed automatically.
- The frontend talks to the backend through `VITE_API_URL` + `VITE_SOCKET_URL`
  (leave unset in local dev to use the Vite proxy), so cookies and sockets keep working.
- Uploaded images are stored on disk in `backend/src/uploads` and served from
  `/api/uploads/<file>`. Point this at persistent storage/object storage in production
  and size-limit uploads with `MAX_UPLOAD_MB`.
