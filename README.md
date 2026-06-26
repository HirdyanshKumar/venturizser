# Venturizer

Lead Qualification Chatbot + Admin Dashboard — built for Venturizer's intern assignment.

## Structure

```
venturizser/
├── frontend/   # React + TypeScript + Tailwind (Vite) → deploys to Vercel
└── backend/    # Node.js + Express + TypeScript       → deploys to Railway
```

## Quick Start

### Prerequisites
- Node.js 18+
- A [Neon](https://neon.tech) Postgres project (free tier)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL and other secrets in .env
npm install
npm run dev
# → http://localhost:3001
# → GET /health confirms DB connection
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## Environment Variables

See `backend/.env.example` — all secrets live in the backend only.

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | [Neon Console](https://console.neon.tech) → Connection string |
| `GROQ_API_KEY` | [Groq Console](https://console.groq.com/keys) |
| `RESEND_API_KEY` | [Resend](https://resend.com/api-keys) |
| `DISCORD_WEBHOOK_URL` | Discord → Server Settings → Integrations → Webhooks |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |

## Verify the Stack

```bash
# Backend health check (DB connection included)
curl http://localhost:3001/health
# Expected: { "status": "ok", "db": { "status": "connected", "latencyMs": <n> } }
```

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS v4, Vite |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL on Neon (serverless driver) |
| AI | Groq API (Llama 3.3 70B) — Phase 6 |
| Email | Resend — Phase 7 |
| Alerts | Discord Webhook — Phase 7 |
| Auth | JWT — Phase 10 |

## Deployment

- **Frontend** → Vercel (deferred to Day 2 evening)
- **Backend** → Railway (deferred to Day 2 evening)
