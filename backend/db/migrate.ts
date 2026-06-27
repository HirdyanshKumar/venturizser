/**
 * db/migrate.ts
 * Applies schema.sql then seed.sql to the Neon database.
 * Uses the standard `pg` Client (supports multi-statement and raw queries cleanly).
 *
 * Usage:
 *   npm run db:migrate
 *   npm run db:schema-only
 *   npm run db:seed-only
 */
import 'dotenv/config';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
const schemaOnly = args.includes('--schema-only');
const seedOnly   = args.includes('--seed-only');

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set — check your .env');

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    const dbDir = path.join(__dirname);

    if (!seedOnly) {
      console.log('📐 Applying schema.sql...');
      const schema = fs.readFileSync(path.join(dbDir, 'schema.sql'), 'utf8');
      await client.query(schema);
      console.log('   ✅ schema applied');
    }

    if (!schemaOnly) {
      console.log('🌱 Applying seed.sql...');
      const seed = fs.readFileSync(path.join(dbDir, 'seed.sql'), 'utf8');
      await client.query(seed);
      console.log('   ✅ seed applied');
    }

    // ── Verification ────────────────────────────────────────────
    console.log('\n🔍 Verifying...');

    const tablesRes = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' ORDER BY tablename
    `);
    console.log('   Tables:', tablesRes.rows.map(r => r.tablename).join(', '));

    const qRes = await client.query(`
      SELECT flow_type, COUNT(*)::int AS count
      FROM questions GROUP BY flow_type ORDER BY flow_type
    `);
    for (const row of qRes.rows) {
      console.log(`   Questions (${row.flow_type}): ${row.count}`);
    }

    const rubricRes = await client.query(`
      SELECT flow_type, COUNT(*)::int AS count, SUM(weight)::int AS total_weight
      FROM scoring_rubric GROUP BY flow_type ORDER BY flow_type
    `);
    for (const row of rubricRes.rows) {
      const ok = Number(row.total_weight) === 100 ? '✅' : '❌';
      console.log(`   Rubric rows (${row.flow_type}): ${row.count}  ${ok} weight sum = ${row.total_weight}`);
    }

    console.log('\n✅ Migration complete.\n');

  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
