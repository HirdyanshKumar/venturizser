import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { testDbConnection, bootstrapAdminUser } from './db';
import sessionsRouter from './routes/sessions';
import adminRouter from './routes/admin';
import webhooksRouter from './routes/webhooks';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Configure JSON body parser with a custom verify function to store req.rawBody
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

// Rate limit: apply to all public chatbot routes
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,                  // 100 req / IP / window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again in a few minutes.' },
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  let dbStatus = 'unknown';
  let dbLatencyMs: number | null = null;

  try {
    const t0 = Date.now();
    await testDbConnection();
    dbLatencyMs = Date.now() - t0;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = err instanceof Error ? err.message : 'error';
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: { status: dbStatus, latencyMs: dbLatencyMs },
  });
});

// Public chatbot API — rate-limited
app.use('/sessions', publicLimiter, sessionsRouter);

// Admin dashboard API
app.use('/admin', adminRouter);

// Webhook endpoints (Cal.com, etc.)
app.use('/webhooks', webhooksRouter);

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`✅  DealFlow AI backend running on http://localhost:${PORT}`);
  console.log(`    GET  http://localhost:${PORT}/health`);
  console.log(`    POST http://localhost:${PORT}/sessions`);
  await bootstrapAdminUser();
});

export default app;
