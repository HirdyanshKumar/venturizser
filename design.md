# Design System
## Venturizer — Lead Qualification Chatbot + ERP Dashboard

This document defines the visual and interaction language for the chatbot website and admin dashboard. Every choice below is made for *this* product — a conversational intake tool that has to feel like a relaxed conversation with a smart person, not a form — and is justified, not decorative.

---

## 1. Design Philosophy

The page has one job: get a founder or investor talking, comfortably, in under a few minutes. Two psychological tensions sit underneath every decision here:

1. **Trust vs. warmth.** A VC-adjacent product needs to look credible (founders/investors are evaluating *you* the moment they land here) but a credibility-only aesthetic (navy suits, dense paragraphs, stiff forms) raises the perceived effort of answering and increases drop-off. The system leans on the brand's existing blue for institutional trust, but deliberately softens backgrounds, corners, and copy tone so it reads as a conversation, not paperwork.
2. **Momentum vs. judgment.** Founders are pitching; the act of answering is emotionally loaded. Nothing in the interface should feel like a test being graded in real time. Validation feedback is calm and corrective, never alarming. Rejection (the "Low" bucket) is handled with a dignified, neutral visual language internally — never a screaming red "REJECTED" tag — because the team should be evaluating fit, not being nudged toward harshness by the UI itself.

---

## 2. Brand Foundation

Venturizer's existing wordmark already carries a clear point of view: a confident blue, blocky/geometric letterforms, and a red-coral accent forming an upward arrow inside the "V" — growth and forward motion, made literal. This system builds on that rather than introducing a new identity.

*(Colors below were sampled directly from the provided logo file. If Venturizer has an official brand guideline with exact specified hex values, defer to that — these are close-sampled approximations.)*

---

## 3. Color System

| Name | Hex | Role | Why this color |
|---|---|---|---|
| **Venturizer Blue** | `#1F4294` | Primary — headers, primary buttons, bot's own chat bubbles, links | Blue is the most consistently trusted color in financial/institutional psychology research — it reads as stable and credible without needing to say so. It's also already *their* color; reusing it (rather than introducing a generic "AI product blue") keeps the chatbot feeling like Venturizer, not a third-party widget bolted onto their site. |
| **Momentum Coral** | `#F2403D` | Accent — primary CTA ("Start," "Send"), Hot-lead tag, the one spot of real energy | Pulled straight from the logo's arrow. Used sparingly and only where action or urgency is genuinely warranted — never as a background flood — so it keeps its power as a signal instead of becoming wallpaper. |
| **Deep Ink** | `#16213A` | Body text, headings | A near-black with a blue undertone instead of pure `#000`. Pure black on a warm background reads harshly clinical; a blue-leaning ink ties text back into the brand and is measurably gentler on the eyes over a multi-question flow. |
| **Warm Paper** | `#FAF8F4` | Page background | A faint warm off-white, not stark white. Stark-white backgrounds are what make a page *feel* like a form to fill out. A slightly warm near-white reads as a considered, human space — the same psychological cue used in print materials people associate with care rather than bureaucracy. |
| **Sage Confirm** | `#3F8F6F` | Valid-answer micro-feedback, "Good" bucket tag | A muted, calm green rather than a saturated emerald — confirms correctness without the slightly gamified, juvenile feeling a bright "success green" can carry in a professional context. |
| **Soft Amber** | `#D98E3F` | Gentle inline guidance, "Maybe" bucket tag | Warm and attention-getting without being alarming — appropriate for "needs a bit more information," which is a neutral, low-stakes state, not an error. |

**Neutral utility scale** (not part of the core brand palette, used for structure): `#FFFFFF`, `#EDEAE3`, `#C9C4B8` (hairline borders/dividers on Warm Paper), `#8B93A6` (muted slate — used for the "Low" bucket tag and disabled states, deliberately *not* red, so a decline never reads as punitive), `#594F45` (secondary/caption text).

### Scoring bucket → color mapping

| Bucket | Color | Reasoning |
|---|---|---|
| 🔥 Hot (80–100) | Momentum Coral | Reuses the brand's energy color — "hot" and "urgent action" are the same psychological register |
| ✅ Good (60–79) | Sage Confirm | Calm affirmation, not celebratory — it's a solid lead, not a fireworks moment |
| 🟡 Maybe (40–59) | Soft Amber | Genuinely neutral "needs more info," not a warning |
| ⚪ Low (0–39) | Muted Slate `#8B93A6` | Deliberately unalarming — keeps internal triage objective and keeps any external decline message dignified |

---

## 4. Typography

| Role | Typeface | Why |
|---|---|---|
| **Display** (hero headline, chatbot question titles, section headers) | **Space Grotesk** | A geometric sans with real personality — its squared, slightly technical letterforms echo the blocky construction of the Venturizer wordmark itself, so headlines feel like they belong to the same family as the logo rather than a generic display face dropped on top of it. Used with restraint: headlines and question titles only, never body paragraphs. |
| **Body** (chat bubbles, paragraphs, dashboard tables) | **IBM Plex Sans** | Humanist and highly legible at small sizes, with a quiet, precise character that reads as competent rather than playful or sterile — the workhorse text needs to disappear into the reading experience, not announce itself. |
| **Utility/mono** (scores, timestamps, lead IDs, dashboard data) | **IBM Plex Mono** | Pairs naturally with Plex Sans (same family, designed to sit together) and gives data points — `87`, `#LD-2291`, `2026-06-27 14:02` — the slightly technical, tabular feel that signals "this is a precise number," distinguishing data from prose at a glance without extra labeling. |

### Type scale (base 16px, ~1.25 ratio)

| Token | Size | Weight | Used for |
|---|---|---|---|
| `display-xl` | 56px | 700 | Landing hero headline |
| `display-l` | 36px | 700 | Section headers, dashboard page titles |
| `display-m` | 24px | 600 | Chatbot question title |
| `body-l` | 18px | 400 | Chat bubble text |
| `body-m` | 16px | 400 | Default paragraph, dashboard table body |
| `body-s` | 14px | 400 | Captions, helper text, inline validation messages |
| `mono-data` | 14px | 500 | Scores, IDs, timestamps |

---

## 5. Layout & Spacing

- **Grid base:** 8px. All padding/margin/gap values are multiples of 8 (8, 16, 24, 32, 48, 64).
- **Corner radius:** 14px on cards and chat bubbles, 10px on buttons/inputs, 6px on small tags/chips. Rounded enough to feel approachable, not so rounded it tips into a cartoonish/consumer-app register — this is still a tool professionals use to evaluate real money decisions.
- **Shadow:** one soft, low-opacity elevation shadow (`0 4px 16px rgba(22,33,58,0.08)`) used on the chat card and dashboard lead cards to lift them gently off the Warm Paper background. No heavy drop shadows, no glow effects.
- **Max content width:** chatbot card caps at 640px and stays centered — a wide, edge-to-edge chat interface feels institutional; a contained card feels like a conversation between two people.

---

## 6. Chatbot Interface

- **One question per screen**, presented as a chat bubble in Venturizer Blue with `display-m` for the question itself and `body-l` for any helper text — never a long scrollable form.
- **Input types matched to the question:** quick-reply chips for closed-ended questions, a labeled slider for ranges (funding ask, cheque size), free text only where genuinely needed.
- **Inline validation** uses Sage Confirm for a quiet checkmark on a valid answer and a warm, specific message (not a red error block) when something needs fixing — e.g. "That email's missing an `@`" in Deep Ink on a pale amber background, never harsh red.
- **Signature element — the progress trajectory:** instead of a generic percentage bar, progress is shown as a small ascending line that climbs toward an arrow as questions are completed — a direct, literal callback to the arrow inside the logo's "V." It reframes "filling out 18 questions" as "your profile taking shape," which speaks to a founder's own instinct toward visible momentum rather than bureaucratic completion.
- **Completion state:** a single understated animation (the trajectory line reaching the arrowhead) — celebratory but brief, never confetti-on-every-question.

---

## 7. Landing / Hero Concept

The chat *is* the hero — there is no marketing hero image followed by a separate "Get Started" button to click through. The page's single job is to get someone talking, so the conversation starts the moment the page loads:

```
┌─────────────────────────────────────────┐
│   Venturizer wordmark, small, top-left   │
│                                           │
│     "Tell us what you're building."      │  <- display-xl, Deep Ink
│   One line of supporting context only    │  <- body-m, muted
│                                           │
│   ┌───────────────────────────────────┐  │
│   │  Chat card starts immediately:    │  │
│   │  "Are you a founder or investor?" │  │
│   │     [Founder]      [Investor]     │  │
│   └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

No stock photography, no gradient blobs, no "trusted by" logo strip — the brief doesn't call for a marketing site, it calls for an intake tool, and the design should not pretend otherwise.

---

## 8. Admin Dashboard

- **Card-based lead list**, not a dense spreadsheet — each lead is a card carrying the AI-generated summary, bucket tag (colored per Section 3), and score, so the team scans meaning, not raw fields.
- **Score breakdown** on the lead detail view uses a radar or bar chart (Recharts) colored with the same bucket palette, so visual language stays consistent between the list and the detail view.
- Same corner-radius and shadow tokens as the chatbot card — the dashboard should feel like the back office of the same product, not a bolted-on separate tool.

---

## 9. Motion Principles

- Page load: chat card fades and lifts slightly into place once — a single orchestrated entrance, not scattered effects on every element.
- Question-to-question: a quick horizontal slide + fade, just enough to signal "next."
- All motion respects `prefers-reduced-motion`: transitions collapse to instant state changes for users who've requested it.

---

## 10. Accessibility & Quality Floor

- All text/background pairs meet WCAG AA contrast at minimum (Deep Ink on Warm Paper and white-on-Venturizer-Blue both comfortably exceed AA).
- Visible keyboard focus ring on every interactive element (2px Momentum Coral outline).
- Fully responsive down to mobile — most founders will open this from a phone after seeing a link, not a desktop.
- Color is never the only signal: bucket tags carry a label and icon alongside their color, not color alone, for colorblind users.

---

## Summary

Nothing here is decorative. The blue is theirs already; the coral comes from their own arrow; the warm-not-white background and unalarming rejection color both exist to lower the emotional cost of answering and being evaluated. The one genuinely distinctive touch — the arrow-trajectory progress indicator — is the single place this system spends its creative budget, and everything else stays quiet around it.
