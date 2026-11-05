import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCronClient } from '@/lib/supabase/cron';
import { deliveryReady } from '@/lib/engagement/security';

async function administrator() {
  const db=await createClient(); const {data:{user}}=await db.auth.getUser();
  if (!user) return false;
  const {data}=await db.from('profiles').select('role').eq('id',user.id).single();
  return data?.role==='admin';
}
const uuid=(value:unknown):value is string=>typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export async function GET() {
  if (!await administrator()) return NextResponse.json({error:'Forbidden'},{status:403});
  try {
    const db=createCronClient();
    const [campaigns,exams,streams,jobs]=await Promise.all([
      db.from('streak_campaigns').select('*').order('created_at',{ascending:false}),
      db.from('exams').select('id,name').eq('is_active',true).order('name'),
      db.from('exam_streams').select('id,exam_id,name').eq('is_active',true).order('name'),
      db.from('streak_campaign_jobs').select('id,campaign_id,milestone,channel,status,attempts,last_error,created_at,delivered_at').order('created_at',{ascending:false}).limit(20),
    ]);
    if ([campaigns,exams,streams,jobs].some(r=>r.error)) throw new Error('Migration or query error');
    return NextResponse.json({campaigns:campaigns.data,exams:exams.data,streams:streams.data,jobs:jobs.data,
      workerEnabled:process.env.STREAK_CAMPAIGNS_ENABLED==='true',
      emailReady:deliveryReady('email'),
      pushReady:deliveryReady('push'),
      promotionsEnabled:false},{headers:{'Cache-Control':'no-store'}});
  } catch { return NextResponse.json({error:'Campaign setup is unavailable. Apply the streak campaign migration and configure the service credential.'},{status:503}); }
}
export async function POST(request: Request) {
  if (!await administrator()) return NextResponse.json({error:'Forbidden'},{status:403});
  let body;
  try { body=await request.json(); } catch { return NextResponse.json({error:'Invalid JSON'},{status:400}); }
  if (!body || typeof body!=='object' || Array.isArray(body)) return NextResponse.json({error:'Invalid request'},{status:400});
  try {
    const db=createCronClient();
    if (body.action==='toggle') {
      if (!uuid(body.id) || typeof body.enabled!=='boolean') return NextResponse.json({error:'Invalid campaign'},{status:400});
      if (body.enabled && (process.env.STREAK_CAMPAIGNS_ENABLED!=='true' || (process.env.CRON_SECRET?.length ?? 0)<16)) return NextResponse.json({error:'Configure and enable the protected campaign worker before enabling campaigns.'},{status:409});
      const result=await db.from('streak_campaigns').update({enabled:body.enabled}).eq('id',body.id).select('id').single();
      if (result.error) return NextResponse.json({error:'Unable to update campaign. Check for another enabled campaign covering this exam or stream.'},{status:409});
    } else if (body.action==='create') {
      if (!uuid(body.examId) || (body.streamId!==null && !uuid(body.streamId)) || typeof body.name!=='string' || body.name.trim().length<1 || body.name.trim().length>120) return NextResponse.json({error:'Choose a name, exam, and optional stream'},{status:400});
      const result=await db.from('streak_campaigns').insert({name:body.name.trim(),exam_id:body.examId,stream_id:body.streamId,enabled:false});
      if (result.error) return NextResponse.json({error:'Unable to create campaign. Check the selected exam and stream.'},{status:400});
    } else return NextResponse.json({error:'Invalid action'},{status:400});
    return NextResponse.json({success:true});
  } catch { return NextResponse.json({error:'Unable to save campaign settings'},{status:503}); }
}
