import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validChallengeId, validTurn } from '@/lib/challenges';

export async function POST(request: Request, { params }: { params: Promise<{ challengeId: string }> }) {
  const { challengeId } = await params;
  const respond = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.headers.get('origin') !== new URL(request.url).origin) return respond({ error: 'Invalid request origin' }, 403);
  if (!validChallengeId(challengeId) || Number(request.headers.get('content-length') ?? 0) > 8192) return respond({ error: 'Invalid challenge request' }, 400);
  try {
    const raw = await request.text();
    if (raw.length > 8192) return respond({ error: 'Answers are too large' }, 400);
    const body = JSON.parse(raw);
    const db = await createClient();
    let result;
    if (body.action === 'start') result = await db.rpc('challenge_start', { p_id: challengeId });
    else {
      if (typeof body.token !== 'string' || !validTurn(body.token)) return respond({ error: 'Saved turn not found' }, 400);
      if (body.action === 'save') result = await db.rpc('challenge_save', { p_id: challengeId, p_token: body.token, p_answers: body.answers, p_seconds: body.seconds });
      else if (body.action === 'submit') {
        const { data: { user } } = await db.auth.getUser();
        if (!user) return respond({ error: 'Sign in to see your comparison.' }, 401);
        result = await db.rpc('challenge_submit', { p_id: challengeId, p_token: body.token });
      } else return respond({ error: 'Unknown challenge action' }, 400);
    }
    if (result.error) return respond({ error: result.error.code === 'P0001' ? result.error.message : 'Unable to save your challenge. Your device copy is kept; please retry.' }, 400);
    return respond({ data: result.data });
  } catch { return respond({ error: 'Unable to process your challenge. Please retry.' }, 400); }
}
