import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to share a challenge.' }, { status: 401 });
  try {
    const { sessionId } = await request.json();
    if (typeof sessionId !== 'string' || !/^[a-f0-9-]{36}$/i.test(sessionId)) return NextResponse.json({ error: 'Invalid sprint.' }, { status: 400 });
    const { data, error } = await db.rpc('challenge_create', { p_session: sessionId });
    if (error) return NextResponse.json({ error: error.code === 'P0001' ? error.message : 'Unable to create a challenge. Check that challenges are enabled and retry.' }, { status: 400 });
    return NextResponse.json({ id: data, path: `/c/${data}` });
  } catch { return NextResponse.json({ error: 'Unable to create this challenge. Please retry.' }, { status: 400 }); }
}
