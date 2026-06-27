import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getPool } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-venturizer';

// Extends Express request interface to hold authenticated user
export interface AuthenticatedRequest extends Request {
  adminUser?: {
    id: string;
    email: string;
    name: string;
  };
}

// ── JWT Verification Middleware ───────────────────────────────────────────────
export function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access denied. Authorization token missing.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string };
    req.adminUser = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Access denied. Invalid or expired token.' });
  }
}

// ── POST /admin/login ─────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const pool = getPool();
  try {
    const { rows } = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email]);
    if (rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Update last login timestamp
    await pool.query('UPDATE admin_users SET last_login_at = now() WHERE id = $1', [admin.id]);

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /admin/leads ──────────────────────────────────────────────────────────
// List leads with status, bucket, type filtering + search keywords
router.get('/leads', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { flow_type, bucket, status, search } = req.query as {
    flow_type?: string;
    bucket?: string;
    status?: string;
    search?: string;
  };

  const pool = getPool();
  const conditions: string[] = [];
  const params: any[] = [];

  if (flow_type && ['founder', 'investor'].includes(flow_type)) {
    params.push(flow_type);
    conditions.push(`flow_type = $${params.length}`);
  }

  if (bucket && ['hot', 'good', 'maybe', 'low'].includes(bucket)) {
    params.push(bucket);
    conditions.push(`bucket = $${params.length}`);
  }

  if (status && ['new', 'contacted', 'review', 'closed'].includes(status)) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (search && search.trim() !== '') {
    params.push(`%${search.trim()}%`);
    conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR ai_summary ILIKE $${params.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const query = `
      SELECT id, flow_type, name, email, score, bucket, status, ai_summary, ai_tags, email_sent, alert_sent, created_at
      FROM leads
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /admin/leads/:id ──────────────────────────────────────────────────────
// Returns full details + raw Q&As + score breakdown
router.get('/leads/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const pool = getPool();

  try {
    const { rows: leadRows } = await pool.query(
      `SELECT id, flow_type, name, email, score, bucket, status, score_breakdown, ai_summary, ai_tags, ai_flags, email_sent, alert_sent, created_at
       FROM leads WHERE id = $1`,
      [id]
    );

    if (leadRows.length === 0) {
      res.status(404).json({ error: 'Lead not found.' });
      return;
    }

    // Get full Q&A responses list
    const { rows: qaRows } = await pool.query(
      `SELECT q.text AS question, r.answer, q.category, q.order_index
       FROM responses r
       JOIN questions q ON q.id = r.question_id
       WHERE r.lead_id = $1
       ORDER BY q.order_index`,
      [id]
    );

    res.json({
      lead: leadRows[0],
      responses: qaRows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /admin/leads/:id/status ─────────────────────────────────────────────
// Updates pipeline workflow status
router.patch('/leads/:id/status', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { status } = req.body as { status?: string };

  if (!status || !['new', 'contacted', 'review', 'closed'].includes(status)) {
    res.status(400).json({ error: 'Invalid status. Choose "new", "contacted", "review", or "closed".' });
    return;
  }

  const pool = getPool();

  try {
    const { rowCount } = await pool.query(
      `UPDATE leads SET status = $1, updated_at = now() WHERE id = $2`,
      [status, id]
    );

    if (rowCount === 0) {
      res.status(404).json({ error: 'Lead not found.' });
      return;
    }

    res.json({ ok: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
