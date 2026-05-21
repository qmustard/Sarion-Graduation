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
  
  // Safely add available_items column if it doesn't exist
  try {
    await pool.query(`ALTER TABLE event_config ADD COLUMN available_items TEXT DEFAULT '[]';`);
  } catch (e) {
    // Column already exists, ignore
  }
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ config: null });
  }

  try {
    await ensureTable();
    const result = await pool.query('SELECT event_time, location_address, available_items FROM event_config ORDER BY id ASC LIMIT 1');
    const row = result.rows[0];
    if (row) {
      try {
        row.available_items = JSON.parse(row.available_items || '[]');
      } catch (e) {
        row.available_items = [];
      }
    }
    return NextResponse.json({ config: row || null });
  } catch (error) {
    console.error('Failed to fetch config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { event_time, location_address, available_items } = await req.json();

    if (process.env.DATABASE_URL) {
      await ensureTable();
      
      const itemsString = JSON.stringify(available_items || []);

      // Upsert logic for config (always id=1 for single config)
      const existing = await pool.query('SELECT id FROM event_config ORDER BY id ASC LIMIT 1');
      
      if (existing.rowCount && existing.rowCount > 0) {
        await pool.query(
          'UPDATE event_config SET event_time = $1, location_address = $2, available_items = $3 WHERE id = $4',
          [event_time, location_address, itemsString, existing.rows[0].id]
        );
      } else {
        await pool.query(
          'INSERT INTO event_config (event_time, location_address, available_items) VALUES ($1, $2, $3)',
          [event_time, location_address, itemsString]
        );
      }
    }
    
    return NextResponse.json({ success: true, event_time, location_address, available_items });
  } catch (err: unknown) {
    console.error("Failed to update config:", err);
    return NextResponse.json({ error: 'Failed to update config.' }, { status: 500 });
  }
}
