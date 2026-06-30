import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';

// ── Neon HTTP client (used by /health — stateless, no connection overhead) ──
export function getNeonSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Check your .env file.');
  return neon(url);
}

export async function testDbConnection(): Promise<void> {
  const sql = getNeonSql();
  await sql`SELECT 1`;
}

// ── pg Pool (used by API routes — persistent TCP connection, proper pooling) ─
let _pool: Pool | null = null;

import bcrypt from 'bcryptjs';

export function getPool(): Pool {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Check your .env file.');
  _pool = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: { rejectUnauthorized: false },
  });
  return _pool;
}

/**
 * Ensures at least one admin user exists in the database.
 */
export async function bootstrapAdminUser(): Promise<void> {
  const pool = getPool();
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM admin_users');
    if (rows[0].count === 0) {
      console.log('🌱 Seeding default administrator...');
      const email = 'admin@dealflow.ai';
      const name = 'Administrator';
      const password = 'Password123';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      await pool.query(
        'INSERT INTO admin_users (email, password_hash, name) VALUES ($1, $2, $3)',
        [email, hash, name]
      );
      console.log(`   ✅ Default admin created: ${email} / ${password}`);
    }
  } catch (err: any) {
    console.error('⚠️ Failed to bootstrap admin user:', err.message);
  }
}

