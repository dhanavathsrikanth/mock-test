import { Resend } from 'resend';
import { createCronClient } from '@/lib/supabase/cron';

export async function POST(request: Request) {
  const secret=process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !process.env.RESEND_API_KEY) return new Response('Webhook not configured',{status:503});
  const payload=await request.text();
  if (payload.length>262144) return new Response('Payload too large',{status:413});
  let event;
  try {
    event=new Resend(process.env.RESEND_API_KEY).webhooks.verify({payload,webhookSecret:secret,headers:{
      id:request.headers.get('svix-id') ?? '',timestamp:request.headers.get('svix-timestamp') ?? '',signature:request.headers.get('svix-signature') ?? '',
    }});
  } catch { return new Response('Invalid signature',{status:400}); }
  if (event.type!=='email.bounced' && event.type!=='email.complained') return Response.json({received:true});
  try {
    const {error}=await createCronClient().rpc('record_streak_email_event',{p_event_id:request.headers.get('svix-id'),p_emails:event.data.to,p_reason:event.type});
    if (error) throw error;
    return Response.json({received:true});
  } catch { return new Response('Unable to record delivery event',{status:503}); }
}
