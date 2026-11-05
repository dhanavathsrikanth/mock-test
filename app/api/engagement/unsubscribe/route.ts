import { createCronClient } from '@/lib/supabase/cron';
import { verifyUnsubscribe } from '@/lib/engagement/security';

export async function POST(request: Request) {
  const secret=process.env.CAMPAIGN_UNSUBSCRIBE_SECRET ?? '';
  const userId=verifyUnsubscribe(new URL(request.url).searchParams.get('token') ?? '',secret);
  if (!userId) return new Response('Invalid unsubscribe link',{status:400});
  try {
    const db=createCronClient();
    const {error}=await db.from('notification_preferences').update({milestone_enabled:false,milestone_consent_at:null,updated_at:new Date().toISOString()}).eq('user_id',userId);
    if (error) throw error;
    return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title><body style="font-family:system-ui;padding:32px"><h1>You’re unsubscribed</h1><p>Streak milestone messages are now off. Your other notification settings are unchanged.</p><a href="/profile">Notification settings</a></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  } catch { return new Response('Unable to unsubscribe right now. Please retry.',{status:503}); }
}
