import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function PATCH(req: Request) {
  try {
    const { guest_name, is_coming } = await req.json();

    if (!guest_name || typeof is_coming !== 'boolean') {
      return NextResponse.json({ error: "guest_name and is_coming are required" }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      await pool.query(
        'UPDATE graduation_rsvp SET is_coming = $1 WHERE guest_name = $2',
        [is_coming, guest_name]
      );
    } else {
      console.warn("DATABASE_URL is not set. Skipping DB update for testing.");
    }
    
    return NextResponse.json({ success: true, guest_name, is_coming });
  } catch (err: unknown) {
    console.error("Failed to update rsvp status:", err);
    return NextResponse.json({ error: 'Failed to update request.' }, { status: 500 });
  }
}
