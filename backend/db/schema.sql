-- DealFlow AI Schema
-- Apply with: ts-node db/migrate.ts

-- ── Extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── questions ─────────────────────────────────────────────────
-- Config-driven: question set lives here, not hardcoded in frontend.
-- Editing a question = UPDATE this table, no redeploy needed.
CREATE TABLE IF NOT EXISTS questions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_type       TEXT          NOT NULL CHECK (flow_type IN ('founder', 'investor')),
  category        TEXT          NOT NULL,          -- e.g. 'personal_info', 'traction'
  order_index     INTEGER       NOT NULL,          -- 1-based, unique per flow
  key             TEXT          NOT NULL UNIQUE,   -- machine key, used in scoring
  text            TEXT          NOT NULL,          -- question shown to user
  helper_text     TEXT,                            -- optional sub-copy under question
  input_type      TEXT          NOT NULL           -- text | textarea | chips | slider | repeatable
                  CHECK (input_type IN ('text','textarea','chips','slider','repeatable')),
  options         JSONB,                           -- for chips: [{label, value}]; for slider: {min,max,step,unit}
  validation      JSONB         NOT NULL DEFAULT '{}', -- {required, minLength, maxLength, pattern, ...}
  scoring_category TEXT,                           -- maps to a row in scoring_rubric
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── scoring_rubric ────────────────────────────────────────────
-- One row per (flow_type, category). Weights sum to 100 per flow.
CREATE TABLE IF NOT EXISTS scoring_rubric (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_type       TEXT          NOT NULL CHECK (flow_type IN ('founder', 'investor')),
  category        TEXT          NOT NULL,
  weight          INTEGER       NOT NULL CHECK (weight > 0 AND weight <= 100),
  -- scoring_logic: maps answer keys/values → point contribution
  -- e.g. {"mvp_status": {"idea":0,"prototype":15,"beta":25,"live":40}}
  scoring_logic   JSONB         NOT NULL DEFAULT '{}',
  UNIQUE (flow_type, category)
);

-- ── leads ─────────────────────────────────────────────────────
-- One row per completed chatbot session. Score/bucket written after scoring engine runs.
CREATE TABLE IF NOT EXISTS leads (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_type       TEXT          NOT NULL CHECK (flow_type IN ('founder', 'investor')),
  -- Denormalised from responses for fast dashboard queries
  name            TEXT,
  email           TEXT,
  score           INTEGER       CHECK (score >= 0 AND score <= 100),
  bucket          TEXT          CHECK (bucket IN ('hot','good','maybe','low')),
  score_breakdown JSONB,        -- {category: points, ...}
  ai_summary      TEXT,
  ai_tags         TEXT[],
  ai_flags        TEXT[],
  status          TEXT          NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','contacted','in_review','closed')),
  status_history  JSONB         NOT NULL DEFAULT '[]',  -- [{status, changed_at, changed_by}]
  email_sent      BOOLEAN       NOT NULL DEFAULT FALSE,
  alert_sent      BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── responses ─────────────────────────────────────────────────
-- One row per (lead, question) answer. answer is JSONB to handle all input types.
CREATE TABLE IF NOT EXISTS responses (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID          NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  question_id     UUID          NOT NULL REFERENCES questions(id),
  question_key    TEXT          NOT NULL,   -- denorm for query convenience
  answer          JSONB         NOT NULL,   -- string | number | string[] | {members:[...]}
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (lead_id, question_id)
);

-- ── admin_users ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT          NOT NULL UNIQUE,
  password_hash   TEXT          NOT NULL,
  name            TEXT          NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  last_login_at   TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_bucket      ON leads(bucket);
CREATE INDEX IF NOT EXISTS idx_leads_flow_type   ON leads(flow_type);
CREATE INDEX IF NOT EXISTS idx_leads_status      ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at  ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_lead_id ON responses(lead_id);
CREATE INDEX IF NOT EXISTS idx_questions_flow    ON questions(flow_type, order_index);

-- ── updated_at trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
