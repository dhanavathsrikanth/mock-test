import { NextResponse } from 'next/server';

// Disable purchases even when payment credentials remain configured.
export async function POST() {
  return NextResponse.json({ error: 'Challenge solutions are free. No payment is required.' }, { status: 410 });
}
