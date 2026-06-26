import { neon } from '@neondatabase/serverless';

/**
 * Returns a Neon SQL query function bound to DATABASE_URL.
 * Throws clearly if the env var is missing.
 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Check your .env file.');
  }
  return neon(url);
}

/**
 * Runs a trivial query to confirm the Neon connection works.
 * Called by GET /health.
 */
export async function testDbConnection(): Promise<void> {
  const sql = getDb();
  // SELECT 1 — cheapest possible round-trip
  await sql`SELECT 1`;
}
