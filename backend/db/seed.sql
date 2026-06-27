-- Venturizer Seed Data
-- Questions ordered easy → hard per flow.md
-- Run after schema.sql

-- ═══════════════════════════════════════════════════════════════
-- SCORING RUBRIC — FOUNDER FLOW (weights sum to 100)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO scoring_rubric (flow_type, category, weight, scoring_logic) VALUES
('founder', 'founder_background', 10, '{
  "years_experience": {"0":0, "1-2":3, "3-5":7, "5+":10},
  "role": {"Technical":10, "Business":8, "Design":7, "Other":5}
}'),
('founder', 'market_fit', 10, '{
  "notes": "Scored by LLM on problem clarity + target customer specificity. Max 10pts."
}'),
('founder', 'mvp_traction', 25, '{
  "mvp_status": {"Idea":0, "Prototype":8, "Beta":16, "Live":25},
  "revenue": {"Pre-revenue":0, "$1-$10K":5, "$10K-$100K":10, "$100K+":15},
  "users": {"0":0, "1-10":2, "10-100":5, "100-1000":8, "1000+":10}
}'),
('founder', 'team', 20, '{
  "team_size": {"Just me":5, "2":10, "3-4":15, "5+":20},
  "team_background": {"Technical":20, "Mixed":18, "Business":14, "Domain expert":12}
}'),
('founder', 'funding_clarity', 15, '{
  "notes": "Scored by LLM on specificity of use-of-funds answer. Funding ask range also factors in: <$50K or >$2M penalised. Max 15pts."
}'),
('founder', 'problem_validation', 20, '{
  "notes": "Scored by LLM on validation evidence quality (user interviews, LOIs, revenue). Max 20pts."
}')
ON CONFLICT (flow_type, category) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- SCORING RUBRIC — INVESTOR FLOW (weights sum to 100)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO scoring_rubric (flow_type, category, weight, scoring_logic) VALUES
('investor', 'thesis_alignment',    30, '{"notes": "LLM scores thesis specificity and sector focus clarity. Max 30pts."}'),
('investor', 'stage_fit',           20, '{"stage_count": {"1":20, "2":16, "3":12, "4+":8}, "notes": "Focused stage range scores higher."}'),
('investor', 'check_size',          15, '{"notes": "Check size within $50K-$2M range scores full 15. Outside range is prorated."}'),
('investor', 'engagement_model',    20, '{"support": {"Capital only":8, "Mentorship":14, "Operational support":18, "Network":16, "All of the above":20}}'),
('investor', 'deployment_readiness',15, '{"timeline": {"Immediately":15, "1-3 months":12, "3-6 months":8, "Opportunistic":5}}')
ON CONFLICT (flow_type, category) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- FOUNDER QUESTIONS  (18 questions, order 1–18)
-- Categories: personal_info → contact_info → background →
--             problem_statement → mvp_status → traction →
--             team → funding_ask → validation_evidence
-- ═══════════════════════════════════════════════════════════════
INSERT INTO questions (flow_type, category, order_index, key, text, helper_text, input_type, options, validation, scoring_category) VALUES

-- ── Category 1: personal_info ──────────────────────────────────
('founder','personal_info', 1,
 'founder_name',
 'What''s your name?',
 NULL,
 'text',
 NULL,
 '{"required": true, "minLength": 2, "maxLength": 80}',
 NULL),

('founder','personal_info', 2,
 'founder_linkedin',
 'LinkedIn or Twitter/X handle (optional)',
 'Helps us look you up quickly — skip if you''d rather not.',
 'text',
 NULL,
 '{"required": false, "maxLength": 200}',
 NULL),

-- ── Category 2: contact_info ───────────────────────────────────
('founder','contact_info', 3,
 'founder_email',
 'What''s your email address?',
 'We''ll use this for follow-up. No spam.',
 'text',
 NULL,
 '{"required": true, "pattern": "email", "maxLength": 200}',
 NULL),

('founder','contact_info', 4,
 'founder_phone',
 'Phone number (optional)',
 'Only for Hot leads — we won''t cold-call you.',
 'text',
 NULL,
 '{"required": false, "maxLength": 20}',
 NULL),

-- ── Category 3: background ─────────────────────────────────────
('founder','background', 5,
 'founder_role',
 'Which best describes your primary background?',
 NULL,
 'chips',
 '[{"label":"Technical (engineer/product)","value":"Technical"},{"label":"Business (sales/ops/finance)","value":"Business"},{"label":"Design (UX/brand)","value":"Design"},{"label":"Domain expert (industry)","value":"Domain expert"},{"label":"Other","value":"Other"}]',
 '{"required": true}',
 'founder_background'),

('founder','background', 6,
 'years_experience',
 'How many years of startup or entrepreneurial experience do you have?',
 'Counting side projects, prior companies, or time at early-stage startups.',
 'chips',
 '[{"label":"None — this is my first","value":"0"},{"label":"1–2 years","value":"1-2"},{"label":"3–5 years","value":"3-5"},{"label":"5+ years","value":"5+"}]',
 '{"required": true}',
 'founder_background'),

-- ── Category 4: problem_statement ─────────────────────────────
('founder','problem_statement', 7,
 'problem_description',
 'What problem are you solving, and why does it matter?',
 'Be specific — who feels this pain, how often, and what does it cost them today?',
 'textarea',
 NULL,
 '{"required": true, "minLength": 80, "maxLength": 1000}',
 'market_fit'),

('founder','problem_statement', 8,
 'target_customer',
 'Who is your target customer?',
 'Be as specific as you can — industry, company size, role, or demographic.',
 'textarea',
 NULL,
 '{"required": true, "minLength": 30, "maxLength": 400}',
 'market_fit'),

-- ── Category 5: mvp_status ────────────────────────────────────
('founder','mvp_status', 9,
 'mvp_status',
 'Where is your product right now?',
 NULL,
 'chips',
 '[{"label":"Idea — concept only, nothing built","value":"Idea"},{"label":"Prototype — early build, not user-tested","value":"Prototype"},{"label":"Beta — in users'' hands, iterating","value":"Beta"},{"label":"Live — shipped, charging or free","value":"Live"}]',
 '{"required": true}',
 'mvp_traction'),

('founder','mvp_status', 10,
 'sector',
 'What sector or industry is your startup in?',
 'e.g. Fintech, Healthtech, SaaS, Climate, Consumer, etc.',
 'text',
 NULL,
 '{"required": true, "minLength": 2, "maxLength": 80}',
 'market_fit'),

-- ── Category 6: traction ──────────────────────────────────────
('founder','traction', 11,
 'user_count',
 'How many active users or customers do you have today?',
 'Count paying customers, active free users, or pilots — whichever is most meaningful for your stage.',
 'chips',
 '[{"label":"None yet","value":"0"},{"label":"1–10","value":"1-10"},{"label":"10–100","value":"10-100"},{"label":"100–1,000","value":"100-1000"},{"label":"1,000+","value":"1000+"}]',
 '{"required": true}',
 'mvp_traction'),

('founder','traction', 12,
 'monthly_revenue',
 'What is your current monthly revenue?',
 NULL,
 'chips',
 '[{"label":"Pre-revenue","value":"Pre-revenue"},{"label":"$1 – $10K / month","value":"$1-$10K"},{"label":"$10K – $100K / month","value":"$10K-$100K"},{"label":"$100K+ / month","value":"$100K+"}]',
 '{"required": true}',
 'mvp_traction'),

-- ── Category 7: team ──────────────────────────────────────────
('founder','team', 13,
 'team_size',
 'How many people are on your core team (full-time or near full-time)?',
 NULL,
 'chips',
 '[{"label":"Just me","value":"Just me"},{"label":"2 people","value":"2"},{"label":"3–4 people","value":"3-4"},{"label":"5 or more","value":"5+"}]',
 '{"required": true}',
 'team'),

('founder','team', 14,
 'team_background',
 'How would you describe your team''s combined background?',
 NULL,
 'chips',
 '[{"label":"Mostly technical","value":"Technical"},{"label":"Mostly business","value":"Business"},{"label":"Domain experts","value":"Domain expert"},{"label":"Balanced mix","value":"Mixed"}]',
 '{"required": true}',
 'team'),

-- ── Category 8: funding_ask ───────────────────────────────────
('founder','funding_ask', 15,
 'funding_ask_amount',
 'How much are you raising in this round?',
 'Drag to your target. Round figures are fine.',
 'slider',
 '{"min": 0, "max": 2000000, "step": 25000, "unit": "USD", "formatAs": "currency"}',
 '{"required": true}',
 'funding_clarity'),

('founder','funding_ask', 16,
 'funding_use',
 'What will you use the funding for?',
 'Brief breakdown is fine — e.g. "60% engineering, 30% sales, 10% ops".',
 'textarea',
 NULL,
 '{"required": true, "minLength": 40, "maxLength": 500}',
 'funding_clarity'),

-- ── Category 9: validation_evidence ──────────────────────────
('founder','validation_evidence', 17,
 'validation_evidence',
 'What''s your strongest evidence that people want this?',
 'Think: user interviews, waitlist signups, LOIs, pilot revenue, press coverage, inbound demand. Be specific.',
 'textarea',
 NULL,
 '{"required": true, "minLength": 80, "maxLength": 1200}',
 'problem_validation'),

('founder','validation_evidence', 18,
 'why_now',
 'Why is now the right time to build this? (optional)',
 'Regulatory shift, new technology, market inflection point — if there''s a tailwind, tell us.',
 'textarea',
 NULL,
 '{"required": false, "maxLength": 600}',
 'problem_validation')

ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- INVESTOR QUESTIONS  (16 questions, order 1–16)
-- Categories: personal_info → contact_info → investment_thesis →
--             stage_focus → check_size → portfolio →
--             support_model → deployment_timeline
-- ═══════════════════════════════════════════════════════════════
INSERT INTO questions (flow_type, category, order_index, key, text, helper_text, input_type, options, validation, scoring_category) VALUES

-- ── Category 1: personal_info ──────────────────────────────────
('investor','personal_info', 1,
 'investor_name',
 'What''s your name?',
 NULL,
 'text',
 NULL,
 '{"required": true, "minLength": 2, "maxLength": 80}',
 NULL),

('investor','contact_info', 2,
 'investor_email',
 'Email address?',
 NULL,
 'text',
 NULL,
 '{"required": true, "pattern": "email", "maxLength": 200}',
 NULL),

('investor','contact_info', 3,
 'investor_linkedin',
 'LinkedIn or firm website (optional)',
 NULL,
 'text',
 NULL,
 '{"required": false, "maxLength": 200}',
 NULL),

-- ── Category 2: investment_thesis ─────────────────────────────
('investor','investment_thesis', 4,
 'investment_thesis',
 'What''s your investment thesis in a few sentences?',
 'What do you believe that most other investors don''t?',
 'textarea',
 NULL,
 '{"required": true, "minLength": 60, "maxLength": 800}',
 'thesis_alignment'),

('investor','investment_thesis', 5,
 'investor_sectors',
 'Which sectors do you focus on?',
 'Select all that apply.',
 'chips',
 '[{"label":"Fintech","value":"Fintech"},{"label":"Healthtech","value":"Healthtech"},{"label":"Edtech","value":"Edtech"},{"label":"SaaS / B2B","value":"SaaS"},{"label":"Consumer","value":"Consumer"},{"label":"Climate / Sustainability","value":"Climate"},{"label":"Deep Tech","value":"Deep Tech"},{"label":"Generalist","value":"Generalist"},{"label":"Other","value":"Other"}]',
 '{"required": true, "multiSelect": true}',
 'thesis_alignment'),

-- ── Category 3: stage_focus ───────────────────────────────────
('investor','stage_focus', 6,
 'stage_focus',
 'Which funding stages do you invest in?',
 'Select all that apply.',
 'chips',
 '[{"label":"Pre-seed","value":"Pre-seed"},{"label":"Seed","value":"Seed"},{"label":"Series A","value":"Series A"},{"label":"Series B+","value":"Series B+"}]',
 '{"required": true, "multiSelect": true}',
 'stage_fit'),

('investor','stage_focus', 7,
 'geographic_focus',
 'Geographic focus?',
 NULL,
 'chips',
 '[{"label":"India","value":"India"},{"label":"South-East Asia","value":"SEA"},{"label":"USA","value":"US"},{"label":"Europe","value":"Europe"},{"label":"Global","value":"Global"},{"label":"Other","value":"Other"}]',
 '{"required": true, "multiSelect": true}',
 'thesis_alignment'),

-- ── Category 4: check_size ────────────────────────────────────
('investor','check_size', 8,
 'check_size_min',
 'What''s your typical minimum cheque size?',
 NULL,
 'slider',
 '{"min": 10000, "max": 5000000, "step": 10000, "unit": "USD", "formatAs": "currency"}',
 '{"required": true}',
 'check_size'),

('investor','check_size', 9,
 'check_size_max',
 'And your maximum?',
 NULL,
 'slider',
 '{"min": 10000, "max": 10000000, "step": 10000, "unit": "USD", "formatAs": "currency"}',
 '{"required": true}',
 'check_size'),

-- ── Category 5: portfolio ─────────────────────────────────────
('investor','portfolio', 10,
 'portfolio_count',
 'How many investments have you made so far?',
 NULL,
 'chips',
 '[{"label":"None yet","value":"0"},{"label":"1–5","value":"1-5"},{"label":"5–10","value":"5-10"},{"label":"10–20","value":"10-20"},{"label":"20+","value":"20+"}]',
 '{"required": true}',
 'thesis_alignment'),

('investor','portfolio', 11,
 'notable_portfolio',
 'Any notable portfolio companies you''d like to mention? (optional)',
 'Just a few names is fine.',
 'text',
 NULL,
 '{"required": false, "maxLength": 400}',
 NULL),

-- ── Category 6: support_model ─────────────────────────────────
('investor','support_model', 12,
 'support_model',
 'What do you offer portfolio companies beyond capital?',
 NULL,
 'chips',
 '[{"label":"Capital only","value":"Capital only"},{"label":"Mentorship & advice","value":"Mentorship"},{"label":"Operational support","value":"Operational support"},{"label":"Network & intros","value":"Network"},{"label":"All of the above","value":"All of the above"}]',
 '{"required": true}',
 'engagement_model'),

('investor','support_model', 13,
 'involvement_level',
 'How involved do you typically like to be post-investment?',
 NULL,
 'chips',
 '[{"label":"Passive — updates are enough","value":"Passive"},{"label":"Board observer","value":"Board observer"},{"label":"Active advisor","value":"Active advisor"},{"label":"Hands-on operator","value":"Hands-on"}]',
 '{"required": true}',
 'engagement_model'),

-- ── Category 7: deployment_timeline ──────────────────────────
('investor','deployment_timeline', 14,
 'deployment_timeline',
 'When are you looking to make your next investment?',
 NULL,
 'chips',
 '[{"label":"Immediately — actively deploying","value":"Immediately"},{"label":"1–3 months","value":"1-3 months"},{"label":"3–6 months","value":"3-6 months"},{"label":"Opportunistic — no fixed timeline","value":"Opportunistic"}]',
 '{"required": true}',
 'deployment_readiness'),

('investor','deployment_timeline', 15,
 'ideal_company',
 'What does an ideal portfolio company look like to you?',
 'Stage, sector, founder profile, traction bar — whatever matters most.',
 'textarea',
 NULL,
 '{"required": true, "minLength": 40, "maxLength": 600}',
 'thesis_alignment'),

('investor','deployment_timeline', 16,
 'investor_anything_else',
 'Anything else you''d like us to know? (optional)',
 NULL,
 'textarea',
 NULL,
 '{"required": false, "maxLength": 600}',
 NULL)

ON CONFLICT (key) DO NOTHING;
