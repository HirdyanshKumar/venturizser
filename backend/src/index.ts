import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { testDbConnection } from './db';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Rate-limit public routes (will be applied per-router in Phase 3)
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// ── Routes ────────────────────────────────────────────────────
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
    db: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
  });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Venturizer backend running on http://localhost:${PORT}`);
  console.log(`    GET http://localhost:${PORT}/health`);
});

export default app;
