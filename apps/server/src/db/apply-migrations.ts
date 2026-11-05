import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Connected to Neon DB. Applying verification_reports table migration...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
        pr_eligible TEXT DEFAULT 'false',
        human_approval_required TEXT DEFAULT 'true',
        repair_attempts INTEGER DEFAULT 0,
        stages TEXT NOT NULL,
        toolchain TEXT,
        security TEXT,
        regression_test TEXT,
        summary TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('verification_reports table created successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
