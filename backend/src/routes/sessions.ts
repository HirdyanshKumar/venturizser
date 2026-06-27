import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { validateQuestionAnswer } from '../utils/validation';
import { scoreLead } from '../utils/scoring';
import { getWeakestCategory, analyzeLeadWithAI } from '../utils/ai';
import { sendBucketEmail, sendDiscordHotAlert } from '../utils/notifications';

const router = Router();

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Shape we return for every question object */
interface QuestionDTO {
  id: string;
  key: string;
  category: string;
  text: string;
  helper_text: string | null;
  input_type: string;
  options: unknown;
  validation: unknown;
  order_index: number;
  total_questions: number;
}

/** Fetch a single question row by order_index + flow_type */
async function getQuestion(
  flowType: string,
  orderIndex: number,
  totalQuestions: number
): Promise<QuestionDTO | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, key, category, text, helper_text, input_type, options, validation, order_index
     FROM questions
     WHERE flow_type = $1 AND order_index = $2`,
    [flowType, orderIndex]
  );
  if (rows.length === 0) return null;
  return { ...rows[0], total_questions: totalQuestions };
}

/** Count all questions for a flow */
async function getTotalQuestions(flowType: string): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM questions WHERE flow_type = $1`,
    [flowType]
  );
  return rows[0].count;
}

/** Get the highest order_index among answered questions for a lead */
async function getLastAnsweredIndex(leadId: string): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT COALESCE(MAX(q.order_index), 0) AS last_idx
     FROM responses r
     JOIN questions q ON q.id = r.question_id
     WHERE r.lead_id = $1`,
    [leadId]
  );
  return rows[0].last_idx;
}

/** Fetch a lead row, return null if not found */
async function getLead(leadId: string) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, flow_type, name, email, status FROM leads WHERE id = $1`,
    [leadId]
  );
  return rows[0] ?? null;
}

// ── POST /sessions ─────────────────────────────────────────────────────────────
// Creates a new lead row, returns session_id + first question.
// Body: { flow_type: 'founder' | 'investor' }
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { flow_type } = req.body as { flow_type?: string };

  if (!flow_type || !['founder', 'investor'].includes(flow_type)) {
    res.status(400).json({ error: 'flow_type must be "founder" or "investor"' });
    return;
  }

  const pool = getPool();

  // Create lead — name/email come from question answers later
  const { rows } = await pool.query(
    `INSERT INTO leads (flow_type, status) VALUES ($1, 'new') RETURNING id`,
    [flow_type]
  );
  const leadId: string = rows[0].id;
  const total = await getTotalQuestions(flow_type);
  const firstQuestion = await getQuestion(flow_type, 1, total);

  res.status(201).json({
    session_id: leadId,
    flow_type,
    question: firstQuestion,
  });
});

// ── GET /sessions/:id/next ─────────────────────────────────────────────────────
// Returns next unanswered question. Returns { complete: true } if all done.
router.get('/:id/next', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const lead = await getLead(id);
  if (!lead) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const total = await getTotalQuestions(lead.flow_type);
  const lastIdx = await getLastAnsweredIndex(id);
  const nextIdx = lastIdx + 1;

  if (nextIdx > total) {
    res.json({ complete: true, session_id: id, total_answered: total });
    return;
  }

  const question = await getQuestion(lead.flow_type, nextIdx, total);
  res.json({ complete: false, session_id: id, question });
});

// ── POST /sessions/:id/answer ──────────────────────────────────────────────────
// Persists one answer. No validation yet (Phase 4).
// Body: { question_id: uuid, answer: any }
router.post('/:id/answer', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { question_id, answer } = req.body as { question_id?: string; answer?: unknown };

  if (!question_id || answer === undefined) {
    res.status(400).json({ error: 'question_id and answer are required' });
    return;
  }

  const pool = getPool();

  // Verify session exists
  const lead = await getLead(id);
  if (!lead) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  // Verify question belongs to this session's flow
  const { rows: qRows } = await pool.query(
    `SELECT id, key, flow_type, order_index, input_type, validation, options FROM questions WHERE id = $1`,
    [question_id]
  );
  if (qRows.length === 0 || qRows[0].flow_type !== lead.flow_type) {
    res.status(400).json({ error: 'Question not found or does not belong to this flow' });
    return;
  }

  const q = qRows[0];

  // Validate answer against database configurations
  const validationResult = validateQuestionAnswer(q.input_type, q.validation, q.options, answer);
  if (!validationResult.success) {
    res.status(422).json({
      error: 'Validation failed',
      field: q.key,
      message: validationResult.error,
    });
    return;
  }

  const validatedAnswer = validationResult.data;

  // Upsert response
  await pool.query(
    `INSERT INTO responses (lead_id, question_id, question_key, answer)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (lead_id, question_id) DO UPDATE SET answer = EXCLUDED.answer`,
    [id, question_id, q.key, JSON.stringify(validatedAnswer)]
  );

  // Denormalise name + email onto the lead row for fast dashboard queries
  if (q.key === 'founder_name' || q.key === 'investor_name') {
    await pool.query(`UPDATE leads SET name = $1 WHERE id = $2`, [String(validatedAnswer), id]);
  }
  if (q.key === 'founder_email' || q.key === 'investor_email') {
    await pool.query(`UPDATE leads SET email = $1 WHERE id = $2`, [String(validatedAnswer), id]);
  }

  // Return next question
  const total = await getTotalQuestions(lead.flow_type);
  const nextIdx = q.order_index + 1;

  if (nextIdx > total) {
    res.json({ ok: true, complete: true, session_id: id });
    return;
  }

  const nextQuestion = await getQuestion(lead.flow_type, nextIdx, total);
  res.json({ ok: true, complete: false, session_id: id, next_question: nextQuestion });
});

// ── POST /sessions/:id/complete ───────────────────────────────────────────────
// STUB — verifies session exists + all required Qs answered.
// Phase 5 will trigger scoring engine here.
// Phase 6 will trigger AI summary here.
// Phase 7 will trigger email + Discord here.
router.post('/:id/complete', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const pool = getPool();

  const lead = await getLead(id);
  if (!lead) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const total = await getTotalQuestions(lead.flow_type);
  const lastIdx = await getLastAnsweredIndex(id);

  // Count how many required questions are still unanswered
  const { rows: unanswered } = await pool.query(
    `SELECT q.key FROM questions q
     WHERE q.flow_type = $1
       AND (q.validation->>'required')::boolean = true
       AND q.id NOT IN (
         SELECT question_id FROM responses WHERE lead_id = $2
       )
     ORDER BY q.order_index`,
    [lead.flow_type, id]
  );

  if (unanswered.length > 0) {
    res.status(422).json({
      error: 'Incomplete session — required questions unanswered',
      missing: unanswered.map((r: { key: string }) => r.key),
    });
    return;
  }

  // ── Calculate Score & Bucket (Phase 5) ──
  const { rows: respRows } = await pool.query(
    `SELECT r.question_key, r.answer, q.text AS question_text
     FROM responses r
     JOIN questions q ON q.id = r.question_id
     WHERE r.lead_id = $1
     ORDER BY q.order_index`,
    [id]
  );
  
  const answers: Record<string, any> = {};
  const qaList: { question: string; answer: any }[] = [];
  for (const row of respRows) {
    answers[row.question_key] = row.answer;
    qaList.push({ question: row.question_text, answer: row.answer });
  }

  const scoringResult = scoreLead(lead.flow_type as 'founder' | 'investor', answers);

  // ── AI Analysis (Phase 6) ──
  let aiSummary = '';
  let aiTags: string[] = [];
  let aiFlags: string[] = [];
  let clarificationQuestion = '';

  try {
    if (req.headers['x-break-groq']) {
      throw new Error('Simulated Groq API failure via header.');
    }
    const weakestCategory = getWeakestCategory(scoringResult.breakdown);
    const aiAnalysis = await analyzeLeadWithAI(
      lead.flow_type as 'founder' | 'investor',
      qaList,
      weakestCategory
    );
    
    aiSummary = aiAnalysis.summary;
    aiTags = aiAnalysis.tags;
    aiFlags = aiAnalysis.flags;
    clarificationQuestion = aiAnalysis.clarification_question || '';
  } catch (err: any) {
    console.error('⚠️ AI analysis failed or timed out, falling back to empty fields:', err.stack || err);
  }

  const updatedBreakdown = {
    ...scoringResult.breakdown,
    clarification_question: clarificationQuestion || undefined
  };

  // Persist score, bucket, breakdown, and AI fields to leads
  await pool.query(
    `UPDATE leads
     SET score = $1, bucket = $2, score_breakdown = $3::jsonb,
         ai_summary = $4, ai_tags = $5, ai_flags = $6
     WHERE id = $7`,
    [
      scoringResult.score,
      scoringResult.bucket,
      JSON.stringify(updatedBreakdown),
      aiSummary || null,
      aiTags.length > 0 ? aiTags : null,
      aiFlags.length > 0 ? aiFlags : null,
      id
    ]
  );

  // ── Trigger Automations (Phase 7) ──
  let emailSent = false;
  let alertSent = false;

  try {
    const emailToUse = answers['founder_email'] || answers['investor_email'] || lead.email;
    const nameToUse = answers['founder_name'] || answers['investor_name'] || lead.name || 'Applicant';

    if (emailToUse) {
      emailSent = await sendBucketEmail({
        to: emailToUse,
        name: nameToUse,
        score: scoringResult.score,
        bucket: scoringResult.bucket,
        clarificationQuestion,
      });
    }

    if (scoringResult.bucket === 'hot') {
      alertSent = await sendDiscordHotAlert(
        nameToUse,
        lead.flow_type,
        scoringResult.score,
        aiSummary
      );
    }

    // Update sent status in database
    await pool.query(
      `UPDATE leads SET email_sent = $1, alert_sent = $2 WHERE id = $3`,
      [emailSent, alertSent, id]
    );

  } catch (err: any) {
    console.error('❌ Failed to run communication automations with exception:', err.stack || err);
  }

  res.json({
    ok: true,
    session_id: id,
    flow_type: lead.flow_type,
    total_answered: lastIdx,
    total_questions: total,
    score: scoringResult.score,
    bucket: scoringResult.bucket,
    breakdown: updatedBreakdown,
    ai: {
      summary: aiSummary || null,
      tags: aiTags,
      flags: aiFlags
    },
    automations: {
      email_sent: emailSent,
      discord_alert_sent: alertSent
    },
    message: 'Session completed. Score, AI analysis, and automations executed successfully.',
  });
});

export default router;
