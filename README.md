# WANIA

**Your moments. Your people. Your world.**

WANIA is a full-stack social network built around a real feed, 24-hour stories, reels, direct and group messaging, audio/video calls, notifications, search, profiles, privacy controls, and an in-app AI guide.

## Stack

- **Client:** React 18, TypeScript, Vite, Tailwind CSS, React Router, Socket.IO client
- **API:** Express, TypeScript, PostgreSQL, Socket.IO, JWT access/refresh auth, Zod validation
- **Media:** local disk by default, or private Cloudinary assets
- **Calls:** WebRTC peer connections with Socket.IO signaling and ICE servers
- **AI:** OpenAI-compatible chat-completions API; clearly labelled offline guidance when no key is configured
- **Email:** optional Resend integration for verification and password reset

## Project layout

```text
client/                 React application
server/                 Express API, migrations, socket server, smoke tests
server/migrations/      PostgreSQL schema
server/scripts/         local database and smoke-test helpers
```

## Local development

Requirements: Node.js 20+, npm 10+.

```bash
npm run install:all
cp server/.env.example server/.env
# edit server/.env: set DATABASE_URL and generated secrets
```

Generate required secrets with:

```bash
openssl rand -hex 32
```

For a zero-setup local database, WANIA includes an embedded PostgreSQL helper:

```bash
npm run db:dev       # first terminal; starts PostgreSQL on port 5433
```

Set the matching URL in `server/.env`:

```env
DATABASE_URL=postgres://postgres:password@localhost:5433/wania
```

Then run migrations and start both apps:

```bash
npm run db:migrate
npm run dev          # API on :4000, client on :5173
```

Open http://localhost:5173.

### Useful commands

```bash
npm run build                # production build for API and client
npm run start                # start the compiled API
npm run smoke                # end-to-end API/socket smoke test
npm run typecheck --prefix client
npm run typecheck --prefix server
```

The Vite dev server proxies `/api` and `/socket.io` to port 4000. In development, leave `PUBLIC_API_URL` empty so media URLs remain relative.

## Configuration

All server settings live in `server/.env`; see `server/.env.example` for the complete list.

Important production values:

- `DATABASE_URL` — PostgreSQL connection string, with `sslmode=require` for managed providers
- `CLIENT_URL` — comma-separated allowed web origins
- `PUBLIC_APP_URL` — public web origin used in email links (falls back to the Render URL or first non-local `CLIENT_URL`)
- `PUBLIC_API_URL` — public API origin used in signed media URLs, e.g. `https://api.example.com`
- `JWT_ACCESS_SECRET`, `MEDIA_SIGNING_SECRET` — long random secrets
- `COOKIE_SECURE=true` — required behind HTTPS
- `MEDIA_PROVIDER=local|cloudinary` — persist `server/uploads` if using local storage
- `STUN_URLS`, `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL` — TURN is required for reliable calls behind strict NATs
- `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` — enable the real AI assistant
- `RESEND_API_KEY`, `EMAIL_FROM` — enable transactional email; `EMAIL_FROM` must use a domain verified in Resend

Leave optional credentials empty to run in explicit fallback modes: offline AI guidance, server-logged email links outside production, and local media.

### Password reset email

In development the reset link is logged to the server console and shown in the UI. In production, email requires:

1. A Resend account owned by the client.
2. The client's domain added and verified in Resend (DNS records).
3. `RESEND_API_KEY` and an `EMAIL_FROM` using that verified domain, e.g. `EMAIL_FROM=WANIA <no-reply@client-domain.com>`.
4. `PUBLIC_APP_URL` set to the deployed SPA origin, e.g. `https://wania-services.onrender.com`, so reset links open a working page.

For owner-only testing before domain verification, `EMAIL_FROM=WANIA <onboarding@resend.dev>` delivers only to the Resend account owner's email.

Check `GET /api/health` for `emailConfigured`. Test credentials directly with:

```bash
npm run email:test --prefix server -- you@example.com
```

If `emailConfigured` is false or the test fails, check the server logs for `[email]` errors.

## Production notes

1. Set `NODE_ENV=production`, use HTTPS, and set `COOKIE_SECURE=true`.
2. Run `npm run build`; serve `client/dist` from a static host or reverse proxy and proxy `/api` plus `/socket.io` to the API.
3. Set `CLIENT_URL` to the deployed web origin and `PUBLIC_API_URL` to the public API origin.
4. Run `npm run db:migrate` against the production database.
5. Persist the upload directory or configure Cloudinary before accepting media.
6. Configure TURN for reliable WebRTC calls and configure Resend for account emails.

If the client is hosted on a different origin, set these Vite build variables:

```env
VITE_API_URL=https://api.example.com/api
VITE_SOCKET_URL=https://api.example.com
```

## Verification

- `npm run typecheck --prefix client` and `npm run typecheck --prefix server`
- `npm run build`
- `npm run smoke` against a running API
- Browser smoke coverage for all routes, post upload/publishing, search, AI fallback, settings persistence, mobile layout, real-time direct messaging, and fake-media WebRTC audio/video calls

WebRTC was verified in Chromium with fake audio/video devices. Real camera/microphone behavior and TURN relay still require testing on deployed hardware for strict NAT environments.

## Deploy on Render

`render.yaml` defines a single Render web service plus PostgreSQL. The built React app is served directly by Express in production.

1. Push this repository to the `wania-app` branch.
2. In Render, choose **New → Blueprint** and connect the repository and `wania-app` branch.
3. Apply the blueprint. Render installs dependencies, builds the API and client, runs migrations, and starts the service.
4. Add optional credentials for `AI_API_KEY`, `RESEND_API_KEY`, Cloudinary, or TURN in the Render dashboard.
5. Open the generated `onrender.com` URL. CORS accepts Render’s `RENDER_EXTERNAL_URL` automatically.

Notes:

- On Render’s free plan, local uploads and the free PostgreSQL instance are not permanent production storage. Configure Cloudinary and a paid database for durable production use.
- Media URLs are same-origin when `PUBLIC_API_URL` is empty.
- The service health check is `/api/health`.
