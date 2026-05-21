import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import * as nodemailer from 'nodemailer';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(req: Request) {
  try {
    const { guest_name, item } = await req.json();

    if (!guest_name || !item) {
      return NextResponse.json({ error: "guest_name and item are required" }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      await pool.query(
        'INSERT INTO graduation_rsvp (guest_name, item) VALUES ($1, $2)',
        [guest_name, item]
      );
    } else {
      console.warn("DATABASE_URL is not set. Skipping DB insertion for testing.");
    }
    
    // Attempt to send email notification
    if (process.env.SMTP_USER) {
      try {
        await transporter.sendMail({
          from: '"Sarion Graduation" <noreply@coreroom.com>',
          to: process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER,
          subject: `New RSVP: ${guest_name} is bringing ${item}`,
          text: `${guest_name} has claimed to bring: ${item} to the graduation party.`,
        });
      } catch (emailErr) {
        console.error("Failed to send email notification:", emailErr);
      }
    }

    return NextResponse.json({ success: true, guest_name, item });
  } catch (err: any) {
    console.error("Failed to process claim:", err);
    return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
  }
}
