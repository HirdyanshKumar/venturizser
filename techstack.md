# Tech Stack
## Venturizer — Lead Qualification Chatbot + ERP Dashboard

This stack is built entirely on free tiers. Where a free tier has real constraints worth knowing about before you rely on it, that's called out explicitly rather than glossed over.

---

## 1. Frontend

| Layer | Choice | Why |
|---|---|---|
| Framework | **React** | Specified in the assignment; component model fits a step-by-step chatbot well |
| Styling | **Tailwind CSS** | Specified in the assignment; fast to build a clean, consistent chat UI |
| Animation | **Framer Motion** (free, open-source) | Smooth question-to-question transitions — core to making the flow feel effortless rather than form-like |
| Charts | **Recharts** (free, open-source) | Score breakdown radar/bar charts, pipeline analytics on the dashboard |
| Voice input (stretch) | **Web Speech API** (browser-native) | Zero cost, no API key — optional spoken input for long free-text answers |
| Confetti/micro-feedback (optional) | **canvas-confetti** (free npm package) | Small completion-state polish |

## 2. Backend

**Decided: Node.js + Express + TypeScript**

The assignment allows either Node.js/Express or Python/FastAPI; this is now locked in as Node (confirmed by the Zod/express-rate-limit choices below) because:
- One language (TypeScript) across frontend and backend — fewer context switches in a 7-day solo build
- First-party SDKs for Groq and Resend are both clean in JS/TS
- Express's middleware model maps cleanly onto "validate → score → automate" as a request pipeline

| Concern | Tool |
|---|---|
| Data access | **node-postgres (`pg`)** or Neon's official **serverless driver** (`@neondatabase/serverless`) — direct SQL, no ORM layer |
| Validation | **Zod** — shared schema between client/server validation logic |
| Auth (admin dashboard) | **JWT-based session auth**, simple email+password for the small internal team — no need for a third-party auth provider at this scale |
| Rate limiting | **express-rate-limit** — free, protects the public chatbot endpoint from spam |

## 3. Database

**PostgreSQL, hosted on Neon** — Neon is a serverless Postgres provider with a genuine ongoing free tier (no 30-day trial cliff like Railway's), which is why it's used here instead of Railway's bundled Postgres. Railway is still used for the backend API itself (see Section 6).

For local/dev work: Neon supports instant database branching, so you can spin up a disposable branch per feature instead of running Postgres in Docker — though a local Docker Postgres container also works if you'd rather develop offline.

Core tables: `leads`, `responses`, `questions` (config-driven), `admin_users`. Full schema detail lives in the repo's `schema.sql`, not duplicated here.

## 4. AI / Automation Layer

| Need | Tool | Free-tier reality |
|---|---|---|
| Lead summary generation, sector/flag tagging, clarification-question drafting | **Groq API** (Llama 3.3 70B or similar) | No credit card required; free tier is rate-limited (roughly 30 requests/min, ~14.4K requests/day on most models per Groq's published limits) but comfortably covers a 7-day build and demo — this is not production-scale-500-leads-a-month traffic |
| Email automation (bucket-based auto-response) | **Resend** | Free tier: 3,000 emails/month, capped at 100/day, 1 verified domain. Fine for demo-scale sends; the 100/day cap is the number to keep in mind if you simulate high lead volume during testing |
| Real-time team alerts | **Discord Incoming Webhooks** | Free, no rate-limit concerns at this scale |

*Scheduled digest (Vercel Cron / GitHub Actions) is parked for now — not in current scope, can revisit later if time allows.*

## 5. Testing & Docs

| Need | Tool |
|---|---|
| Backend unit/integration tests | **Jest + Supertest** |
| API documentation | **`swagger-jsdoc`** (OpenAPI spec generated from Express routes) — alternative: a Postman collection exported to the repo |
| Flow/architecture diagrams | **Mermaid** inside markdown (renders natively on GitHub) — see `flow.md` |

## 6. Hosting & Deployment

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **Vercel** | Specified in the assignment; genuinely free "Hobby" tier is generous for a project this size |
| Backend | **Railway** | Specified in the assignment — **caveat:** Railway no longer offers an unlimited free tier. New accounts get a one-time $5 trial credit (30 days), after which the ongoing Free plan drops to ~$1/month in credits on very limited resources (1 vCPU, 0.5GB RAM). Running only the API here (the database now lives on Neon, not Railway) eases the squeeze somewhat, but it's still worth knowing this is time-boxed if the deployed instance needs to stay alive past the trial window. |
| Database | **Neon** | Genuine ongoing free tier for serverless Postgres — no 30-day cliff like Railway's bundled Postgres, which is why it's used here instead. |

## 7. Version Control

**GitHub** — free, required for the deliverable repo anyway.

---

## Summary: nothing here requires a paid plan to build and demo this project within the 7-day window. The database now sits on Neon's ongoing free tier, so the only remaining thing to watch is Railway's time-boxed trial credit on the backend API if it needs to stay live past the assignment deadline.
