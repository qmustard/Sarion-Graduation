import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ items: [] });
  }

  try {
    // Ensure table exists on first run
    await pool.query(`
      CREATE TABLE IF NOT EXISTS graduation_rsvp (
        id SERIAL PRIMARY KEY,
        guest_name VARCHAR(255) NOT NULL,
        item VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_coming BOOLEAN DEFAULT true
      );
      
      -- Ensure column exists for existing tables
      ALTER TABLE graduation_rsvp ADD COLUMN IF NOT EXISTS is_coming BOOLEAN DEFAULT true;
    `);

    const result = await pool.query('SELECT guest_name, item, created_at, is_coming FROM graduation_rsvp ORDER BY created_at DESC');
    return NextResponse.json({ items: result.rows });
  } catch (error) {
    console.error('Failed to fetch items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}
