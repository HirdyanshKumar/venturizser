# Product Requirement Document
## Venturizer — Lead Qualification Chatbot + ERP Dashboard

**Track:** Tech Intern Assignment, Full-Stack Development
**Duration:** 7 days
**Doc version:** v1.0

---

## 1. Overview

Venturizer receives 500+ organic inbound enquiries per month from founders and investors through its website. These are currently reviewed manually, one by one, which doesn't scale and delays response time to genuinely promising leads.

This project replaces manual triage with a conversational chatbot that asks founders/investors a structured set of questions, validates answers as they're given, scores the lead's fit with Venturizer (0–100), and surfaces everything in an internal dashboard — with automation handling the repetitive parts of the workflow (summarizing, tagging, routing, and first-touch communication) so the team only spends time on judgment calls, not data entry.

## 2. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Eliminate manual first-pass review | % of leads requiring zero manual reading before triage decision |
| Faster response to high-fit leads | Time from submission → first outreach for "Hot" leads |
| Consistent, bias-free scoring | Every lead scored against the same rubric, no manual judgment calls at intake |
| Reduce team workload | Number of leads the team has to personally read end-to-end (target: only Hot + edge cases) |
| Low drop-off during the chatbot flow | % of users who start vs. complete the question flow |

## 3. User Personas

**Founder** — Visits the site to pitch their startup. Wants the process to feel quick and low-friction; will abandon a clunky form. Needs to convey: who they are, what they're building, why it matters, and what they need.

**Investor** — Visits the site to explore a potential relationship with Venturizer. Wants to communicate their thesis and check fit without filling out a generic "contact us" form.

**Venturizer Team (internal/admin user)** — Reviews incoming leads. Doesn't want to read 18 raw answers per lead; wants a fast, scannable, filterable view that tells them who's worth their time and why.

## 4. Scope

### In scope (MVP — must ship in 7 days)
- Branching chatbot flow (founder vs investor), 16–20 questions per flow
- Real-time client- and server-side validation
- PostgreSQL persistence of all responses
- Weighted scoring engine (0–100) mapped to 4 buckets
- AI-generated lead summary + auto-tagging (sector, stage, flags)
- Automated bucket-based email response (Hot / Good / Maybe / Low)
- Slack/webhook alert on Hot leads
- Admin dashboard: lead list with filters/search, lead detail view with AI summary + score breakdown, status workflow
- Tests, README, flow diagram, DB schema, API docs

### Stretch (only if time remains)
- Natural-language filter search on dashboard ("fintech founders asking under $50K")
- Kanban-style pipeline view
- One-click actions (send follow-up / reject) directly from a lead card
- Weekly digest email to the team
- Duplicate-lead detection
- Voice input on long-form answers
- Save & resume via magic link

### Out of scope (v1)
- Outbound lead sourcing / scraping
- CRM integrations (Salesforce, HubSpot, etc.)
- Multi-language support
- Mobile native app (web is mobile-responsive only)
- Payment/billing of any kind

## 5. Functional Requirements

### 5.1 Conversational Chatbot
- FR1: User selects "Founder" or "Investor" as the first interaction; this determines the question set.
- FR2: Chatbot presents one question at a time, in a chat-style UI (not a long scrollable form).
- FR3: Closed-ended questions use tappable quick-reply chips or sliders; open-ended questions use free text.
- FR4: A visible progress indicator shows position in the flow (e.g. "Question 7 of 18").
- FR5: User can go back and edit a previous answer before final submission.
- FR6: On completion, user sees a generic confirmation message — the computed score/bucket is never shown to the user.

### 5.2 Real-Time Validation
- FR7: Each answer is validated client-side immediately (format, required, length, numeric range) with inline, friendly feedback — not a blocking red error wall.
- FR8: The same validation rules are re-enforced server-side before persistence; client-side validation is never trusted alone.
- FR9: Invalid submissions return a specific, actionable error tied to the offending field.

### 5.3 Data Capture

**Founder flow** captures: personal information, contact information, background, problem statement, MVP status, traction, team composition, funding ask, validation evidence.

**Investor flow** captures: investment thesis, stage focus, cheque size, current portfolio, support model, deployment timeline.

- FR10: Every question is config-driven (stored as data, not hardcoded in the frontend), so the question set can be edited without a redeploy.
- FR11: All responses are persisted to PostgreSQL, linked to a single lead record, with timestamps.

### 5.4 Scoring Engine
- FR12: On flow completion, the backend computes a weighted score (0–100) from the captured responses.
- FR13: Each scoring category and its weight is defined in a config (not hardcoded), so the rubric can be tuned without a code change.
- FR14: Score maps to exactly one of four buckets:

| Score | Bucket | Downstream action |
|---|---|---|
| 80–100 | Hot | Immediate outreach + program |
| 60–79 | Good | Standard follow-up |
| 40–59 | Maybe | Request clarification |
| 0–39 | Low | Polite rejection |

- FR15: The score breakdown (per-category contribution) is stored alongside the final score, so the dashboard can show *why* a lead scored the way it did.

### 5.5 Automations
- FR16: On scoring completion, an LLM call generates a 3–4 sentence plain-English summary of the lead ("Pre-seed fintech founder, working MVP, $50K ask, strong technical team, weak validation evidence").
- FR17: The same call extracts sector/industry tags and any "flags" (e.g. funding ask inconsistent with stated traction).
- FR18: A bucket-specific email is sent automatically: Hot → booking link + program info; Good → standard follow-up; Maybe → an auto-drafted clarification question targeting the weakest scoring category; Low → polite decline.
- FR19: A real-time alert (Slack/Discord webhook) fires for every Hot lead, including the AI summary inline.
- FR20: (Stretch) A scheduled digest summarizes daily/weekly pipeline volume and top leads to the team.

### 5.6 Admin Dashboard
- FR21: Authenticated team members can view a list of all leads, filterable by type (founder/investor), bucket, status, and date range, with text search.
- FR22: Each lead has a detail view showing: AI summary, score + per-category breakdown (chart), full raw Q&A, and status history.
- FR23: Team members can update a lead's status (New → Contacted → In Review → Closed).
- FR24: (Stretch) Dashboard supports natural-language filtering, a Kanban pipeline view, and one-click send/reject actions.

## 6. Non-Functional Requirements
- NFR1: All public-facing endpoints (chatbot submission) must be rate-limited to mitigate spam/bot abuse.
- NFR2: Admin routes require authentication; no lead data is publicly readable.
- NFR3: The system must run entirely on free-tier infrastructure for the duration of this assignment (see `techstack.md` for specifics and caveats).
- NFR4: The chatbot UI must be fully responsive (mobile + desktop).
- NFR5: Server-side validation is the source of truth; client-side validation exists only to improve UX.
- NFR6: Core flows (submission → scoring → storage) must have automated test coverage.

## 7. Deliverables
- [ ] GitHub repository — clean code, tests included
- [ ] `README.md` with setup instructions
- [ ] Conversation flow diagram (`flow.md`)
- [ ] Database schema / ERD
- [ ] API documentation (OpenAPI/Swagger or Postman collection)
- [ ] 15-minute demo presentation

## 8. Assumptions
- The company's existing manual triage criteria can be reasonably approximated by a weighted rubric defined for this project (to be refined with team input if time allows).
- Email/Slack automation only needs to function correctly for demo-scale volume within the 7-day build, not production-scale 500+/month traffic.
- "Free tools" means no paid subscription required to build and demo the project within the assignment window.

## 9. Risks
- 16–20 questions × validation × scoring × automations × dashboard × tests × docs is a lot of surface area for 7 days solo — the MVP/stretch split above exists specifically to protect the core deliverable if time runs short.
- Free-tier rate limits (LLM calls, email sends) are workable for a demo but would need re-evaluation before any real production rollout.

## 10. Future (v2, out of scope now)
- Tunable scoring weights via an admin UI (no code change needed)
- CRM/calendar integration for the "Hot" outreach step
- Duplicate/returning-lead detection and merge
- Analytics: conversion rate by bucket, sector trends over time
