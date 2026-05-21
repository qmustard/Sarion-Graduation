import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_config (
      id SERIAL PRIMARY KEY,
      event_time VARCHAR(255) DEFAULT '',
      location_address VARCHAR(500) DEFAULT ''
    );
  `);
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ config: null });
  }

  try {
    await ensureTable();
    const result = await pool.query('SELECT event_time, location_address FROM event_config ORDER BY id ASC LIMIT 1');
    return NextResponse.json({ config: result.rows[0] || null });
  } catch (error) {
    console.error('Failed to fetch config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { event_time, location_address } = await req.json();

    if (process.env.DATABASE_URL) {
      await ensureTable();
      
      // Upsert logic for config (always id=1 for single config)
      const existing = await pool.query('SELECT id FROM event_config ORDER BY id ASC LIMIT 1');
      
      if (existing.rowCount && existing.rowCount > 0) {
        await pool.query(
          'UPDATE event_config SET event_time = $1, location_address = $2 WHERE id = $3',
          [event_time, location_address, existing.rows[0].id]
        );
      } else {
        await pool.query(
          'INSERT INTO event_config (event_time, location_address) VALUES ($1, $2)',
          [event_time, location_address]
        );
      }
    }
    
    return NextResponse.json({ success: true, event_time, location_address });
  } catch (err: unknown) {
    console.error("Failed to update config:", err);
    return NextResponse.json({ error: 'Failed to update config.' }, { status: 500 });
  }
}
