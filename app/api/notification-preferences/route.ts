import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { preferenceUpdates } from '@/lib/engagement/preferences';
import { CONSENT_VERSION } from '@/lib/engagement/rules';

export async function GET() {
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if (!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const first=await db.from('notification_preferences').select('*').eq('user_id',user.id).maybeSingle();
  if (first.error) return NextResponse.json({error:'Unable to load notification settings'},{status:503});
  if (first.data) return NextResponse.json(first.data,{headers:{'Cache-Control':'no-store'}});
  const created=await db.from('notification_preferences').upsert({user_id:user.id},{onConflict:'user_id',ignoreDuplicates:true});
  if (created.error) return NextResponse.json({error:'Unable to initialize notification settings'},{status:503});
  const fresh=await db.from('notification_preferences').select('*').eq('user_id',user.id).single();
  return fresh.error ? NextResponse.json({error:'Unable to load notification settings'},{status:503}) : NextResponse.json(fresh.data,{headers:{'Cache-Control':'no-store'}});
}
export async function PUT(request: Request) {
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if (!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  let updates;
  try { updates=preferenceUpdates(await request.json()); }
  catch { return NextResponse.json({error:'Invalid notification settings'},{status:400}); }
  const consent: Record<string,string|null>={};
  if ('milestone_enabled' in updates) {
    consent.milestone_consent_at=updates.milestone_enabled ? new Date().toISOString() : null;
    consent.milestone_consent_version=CONSENT_VERSION;
  }
  const result=await db.from('notification_preferences').upsert({...updates,...consent,user_id:user.id,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  if (result.error) return NextResponse.json({error:'Unable to save settings. Check that the campaign migration is installed.'},{status:503});
  return NextResponse.json({success:true});
}
