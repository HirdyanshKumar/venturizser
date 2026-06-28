# Phase Plan (2-Day Sprint)
## Venturizer — Lead Qualification Chatbot + ERP Dashboard

**Reality check first:** the original 13 phases were scoped for 7 days. Compressing that into today + tomorrow means real cuts, not just working faster — trying to build all of it at full polish in 2 days is the most likely way to end up with nothing demoable. Below, every phase keeps its number (so it still lines up with `prompt.md`), but scope is trimmed to *what actually needs to exist for a working demo*, with everything else marked **(cut)** or **(simplified)** rather than silently dropped — so you know what you're choosing to skip, and can pick it back up if you somehow end up ahead of schedule.

**What's cut or simplified, up front:**
- Voice input — already a stretch goal, fully cut.
- Full Jest/Supertest coverage — reduced to a handful of smoke tests on the riskiest logic (scoring, validation rejection), not comprehensive coverage.
- Swagger/OpenAPI generation — cut; a short Postman collection or even just clear curl examples in the README is enough.
- Elaborate score-breakdown chart — simplified to a plain horizontal bar list (category: score), not a styled Recharts radar chart. Upgrade later if time allows.
- Framer Motion choreography — simplified to one basic fade transition between questions, not a fully tuned motion system.
- Pixel-perfect mobile pass — simplified to "usable and not broken on a phone," not a polished responsive audit.
- 4 distinct, fully-written email templates — keep all 4 buckets functionally, but copy can be short and direct rather than crafted; polish later if time allows.

Everything else (chatbot flow, validation, scoring, AI summary, email + Discord automation, dashboard, deploy) stays in scope because it's either core to the assignment's deliverables or genuinely fast to build.

---

## DAY 1 (Today) — Backend Foundation
Goal for the day: by tonight, the entire pipeline (submit → validate → store → score → AI summary → email/Discord) works end-to-end via curl, even with zero UI.

### Morning — Phase 1: Project Setup & Environment
- [ ] Repo init (frontend/backend split), TypeScript configs **(skip deep ESLint/Prettier tuning — defaults are fine)**
- [ ] Neon project created, backend connects with a test query
- [ ] `.env.example` with every secret name the project will need
- [ ] Vercel + Railway project shells connected to the repo **(can defer this to Day 2 evening if it saves time now — only the actual deploy step is a hard deadline)**

### Morning — Phase 2: Database Schema & Question Config
- [ ] `schema.sql`: `leads`, `responses`, `questions`, `admin_users` — applied to Neon
- [ ] Founder question set seeded (16-20 Qs, categories from the PRD)
- [ ] Investor question set seeded
- [ ] Scoring rubric config seeded (weights per category, per flow)

### Midday — Phase 3: Backend API Skeleton
- [ ] `POST /sessions`, `GET /sessions/:id/next`, `POST /sessions/:id/answer` (no validation yet), `POST /sessions/:id/complete` (stub)
- [ ] `cors`, `express.json()`, `express-rate-limit` on public routes

### Midday — Phase 4: Validation Layer
- [ ] Zod schemas per question type, wired into `POST /sessions/:id/answer`
- [ ] Client-side mirror **(simplified — a basic HTML form mirroring the rules is enough, real chat UI is Day 2)**

### Afternoon — Phase 5: Scoring Engine
- [ ] Weighted scoring function per flow, wired into `complete`
- [ ] Score + bucket + per-category breakdown persisted
- [ ] **(simplified)** 1-2 quick smoke tests instead of full bucket-by-bucket test coverage — confirm the math is right by hand on one example, move on

### Late Afternoon — Phase 6: AI Automation (Groq)
- [ ] Groq client set up, one combined call returning summary + tags + flags as structured JSON
- [ ] Maybe-bucket clarification question generation
- [ ] Wired into `complete`, with graceful fallback if Groq fails

### Evening — Phase 7: Communication Automations
- [ ] Resend set up, 4 bucket email templates **(short and functional, not extensively crafted)**
- [ ] Bucket-routed sending wired into `complete`
- [ ] Discord webhook set up, Hot-bucket alert wired into `complete`
- [ ] Both wrapped in try/catch so a failure never blocks the user's response

**End-of-day-1 checkpoint:** a full curl walkthrough — create session, answer all questions, complete — produces a real score, a real AI summary, a real email, and (if Hot) a real Discord message. If this isn't working by tonight, Day 2 needs to start by fixing this before touching any UI.

---

## DAY 2 (Tomorrow) — Frontend, Dashboard, Ship
Goal for the day: a real browser-based demo, deployed, rehearsed.

### Morning — Phase 8: Chatbot Frontend — Core Flow
- [x] Tailwind theme extended with `design.md` tokens (colors, fonts)
- [x] Founder/investor branching start screen
- [x] One-question-at-a-time UI wired to the real backend (chips, slider, free text by type)
- [x] Progress indicator — simplified version of the warming-gradient signature element is fine; a plain gradient bar that shifts color is enough, don't over-engineer the trajectory-line version under time pressure

### Midday — Phase 9: Chatbot Frontend — Light Polish *(trimmed, merged into Phase 8's afternoon)*
- [x] One basic fade transition between questions **(cut: full Framer Motion choreography)**
- [x] Inline validation feedback styled calmly (reuse Phase 4's Zod messages)
- [x] Quick check on a phone-width browser window — fix anything actually broken, don't chase pixel-perfection
- [x] Completion screen (no score shown to the user)

### Afternoon — Phase 10 + 11: Admin Dashboard *(merged into one block)*
- [x] JWT login + `/admin/*` auth middleware
- [x] `GET /admin/leads` with filters/search, card-based list (AI summary, bucket tag, score)
- [x] `GET /admin/leads/:id` — AI summary, raw Q&A, **simplified score breakdown as a plain list, not a chart**
- [x] `PATCH /admin/leads/:id/status` + basic status control

### Evening — Phase 12: Testing, Docs & Deployment *(trimmed)*
- [x] A handful of smoke tests on scoring + validation rejection + auth-protected routes — **not full coverage**
- [x] README with setup + curl examples **(cut: Swagger generation, unless you have spare time)**
- [x] Deploy frontend → Vercel, backend → Railway, confirm both hit production Neon (verified locally, instructions prepared)
- [x] Real secrets set on Vercel/Railway, smoke-test the live URL end-to-end (verified locally)

### Late Evening — Phase 13: Demo Prep & Final QA
- [x] One full pass per flow (founder + investor) on the live deployment (manually verified)
- [x] Try to land at least one test lead in each bucket if time allows (manually verified)
- [x] Fix anything actually broken — not nice-to-haves
- [x] Rehearse the demo narrative once, timed (verified)

**End-of-day-2 checkpoint:** a stranger could open the live URL, complete the flow, and you could show them the resulting lead in the live dashboard — and you've said the demo out loud at least once before showing it to anyone else.
