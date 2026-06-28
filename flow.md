# Application Flow
## Venturizer — Lead Qualification Chatbot + ERP Dashboard

This document covers: the end-to-end user journey, the founder and investor question flows, the backend/automation pipeline, and the admin dashboard flow. Diagrams are written in Mermaid (renders natively on GitHub).

---

## 1. High-Level User Journey

```mermaid
flowchart TD
    A[User lands on Venturizer website] --> B[Chatbot opens]
    B --> C{Founder or Investor?}
    C -->|Founder| D[Founder question flow - 16-20 Qs]
    C -->|Investor| E[Investor question flow - 16-20 Qs]
    D --> F[Final submission]
    E --> F
    F --> G[Server-side validation]
    G --> H[Persist responses to PostgreSQL]
    H --> I[Scoring engine computes 0-100 score]
    I --> J[AI: generate summary + tags + flags]
    J --> K{Bucket?}
    K -->|Hot 80-100| L[Auto email: booking link + program info]
    K -->|Good 60-79| M[Auto email: standard follow-up]
    K -->|Maybe 40-59| N[Auto email: clarification request]
    K -->|Low 0-39| O[Auto email: polite decline]
    L --> P[Slack alert to team - Hot lead]
    M --> Q[Lead appears in dashboard]
    N --> Q
    O --> Q
    P --> Q
    F --> R[User sees generic thank-you screen]
```

## 2. Founder Flow (question sequence, by category)

Ordered easy → hard to build momentum early and reduce drop-off on the harder reflective questions later.

```mermaid
flowchart LR
    A[1. Personal information] --> B[2. Contact information]
    B --> C[3. Background]
    C --> D[4. Problem statement]
    D --> E[5. MVP status]
    E --> F[6. Traction]
    F --> G[7. Team]
    G --> H[8. Funding ask]
    H --> I[9. Validation evidence]
    I --> J[Submit]
```

Notes on UX per step:
- Steps 1–2 (personal/contact info): quick text inputs, autofocus, minimal friction — builds early momentum.
- Steps 3–5 (background, problem, MVP status): mix of quick-select chips (e.g. MVP status: Idea / Prototype / Live) and short free text.
- Step 6 (traction): structured fields (users, revenue, growth rate) where applicable, free text fallback for pre-traction founders.
- Step 7 (team): repeatable sub-block per team member (name, role, background) — capped at a sensible max (e.g. 5) to avoid runaway length.
- Step 8 (funding ask): slider input bounded to a realistic range, not a blank number field.
- Step 9 (validation evidence): open free text — this is the most effortful question, placed last so the user is already invested in finishing.

## 3. Investor Flow (question sequence, by category)

```mermaid
flowchart LR
    A[1. Investment thesis] --> B[2. Stage focus]
    B --> C[3. Cheque size]
    C --> D[4. Current portfolio]
    D --> E[5. Support model]
    E --> F[6. Deployment timeline]
    F --> G[Submit]
```

Notes on UX per step:
- Step 2 (stage focus): quick-select chips (Pre-seed / Seed / Series A / etc.), multi-select allowed.
- Step 3 (cheque size): slider with a realistic min/max range.
- Step 4 (portfolio): short free text or a repeatable "company name" list.
- Step 5 (support model): quick-select chips (Capital only / Capital + mentorship / Capital + operational support / etc.).
- Step 6 (deployment timeline): quick-select (Immediate / 1–3 months / 3–6 months / Opportunistic).

## 4. Backend Processing Sequence (single submission)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant FE as React Frontend
    participant API as Backend API
    participant DB as PostgreSQL
    participant LLM as Groq (LLM)
    participant MAIL as Resend
    participant SLACK as Slack Webhook

    U->>FE: Answers question
    FE->>FE: Client-side validation
    FE->>API: POST /sessions/:id/answer
    API->>API: Server-side validation
    API->>DB: Store answer
    API-->>FE: 200 OK / next question
    Note over U,FE: ...repeats for all 16-20 questions...
    FE->>API: POST /sessions/:id/complete
    API->>DB: Load all responses
    API->>API: Run scoring engine (weighted rubric)
    API->>LLM: Generate summary + tags + flags
    LLM-->>API: Summary, tags, flags
    API->>DB: Store score, bucket, summary, tags
    API->>MAIL: Send bucket-specific email
    alt Bucket is Hot
        API->>SLACK: Post alert with AI summary
    end
    API-->>FE: Generic completion message
```

## 5. Admin Dashboard Flow

```mermaid
flowchart TD
    A[Team member logs in] --> B[Lead list view]
    B --> C[Filter by type / bucket / status / date]
    B --> D[Search by keyword]
    C --> E[Select a lead]
    D --> E
    E --> F[Lead detail view]
    F --> G[AI summary + tags]
    F --> H[Score breakdown chart by category]
    F --> I[Full raw Q&A]
    F --> J[Status history]
    F --> K[Update status: New to Contacted to In Review to Closed]
    K --> B
```

## 6. Data Flow (what gets stored, when)

```mermaid
flowchart LR
    subgraph Capture
        A[questions config] --> B[chatbot renders question]
        B --> C[user answers]
        C --> D[responses table]
    end
    subgraph Processing
        D --> E[scoring engine]
        E --> F[leads.score / leads.bucket]
        D --> G[Groq LLM call]
        G --> H[leads.summary / leads.tags / leads.flags]
    end
    subgraph Action
        F --> I[automation router]
        H --> I
        I --> J[Resend email]
        I --> K[Slack webhook]
    end
    subgraph Review
        F --> L[admin dashboard]
        H --> L
        D --> L
    end
```

---

## Summary

The flow is intentionally linear and config-driven at the data-capture layer (questions are data, not hardcoded UI), branches once at the very start (founder vs investor), and fans out into automation immediately after scoring — so the team's dashboard never shows a "raw," unprocessed lead. Every lead that reaches a human has already been summarized, tagged, scored, and (for Hot/Good/Maybe/Low) had its first-touch communication handled automatically.
