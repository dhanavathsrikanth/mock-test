import type { SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { eligibility, milestoneCopy, quietUntil, retryAt, type CampaignJob, type MilestonePreferences } from './rules';
import { campaignOrigin, deliveryReady, unsubscribeToken } from './security';
import { milestoneEmail } from './email';

class DeliveryError extends Error {
  constructor(message: string, readonly retryable = true) { super(message); }
}
async function deadline<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try { return await Promise.race([promise,new Promise<T>((_,reject)=>{timer=setTimeout(()=>reject(new DeliveryError('Provider response timed out')),ms);})]); }
  finally { clearTimeout(timer!); }
}
export async function processCampaignJob(db: SupabaseClient, job: CampaignJob, now = new Date()) {
  async function finish(status: string, error?: string, retry?: Date, providerId?: string) {
    const result=await db.rpc('finish_streak_campaign_job',{p_id:job.id,p_lease:job.lease_token,p_status:status,
      p_error:error ?? null,p_retry_at:retry?.toISOString() ?? null,p_provider_id:providerId ?? null});
    if (result.error || !result.data) throw new Error('Could not acknowledge campaign job');
    return status;
  }
  try {
    const [profileResult,prefResult,campaignResult,streakResult]=await Promise.all([
      db.from('profiles').select('target_exam_id,target_stream_id,banned').eq('id',job.user_id).maybeSingle(),
      db.from('notification_preferences').select('milestone_enabled,milestone_channel,milestone_consent_at,milestone_consent_version,streak,push_enabled,email_enabled,quiet_hours_start,quiet_hours_end').eq('user_id',job.user_id).maybeSingle(),
      db.from('streak_campaigns').select('enabled,exam_id,stream_id').eq('id',job.campaign_id).maybeSingle(),
      db.from('streaks').select('current_streak,last_activity_date').eq('user_id',job.user_id).maybeSingle(),
    ]);
    if ([profileResult,prefResult,campaignResult,streakResult].some(r=>r.error)) throw new DeliveryError('Eligibility lookup failed');
    if (!profileResult.data) return finish('skipped','Student unavailable');
    const prefs=prefResult.data as MilestonePreferences | null;
    const reason=eligibility(job,profileResult.data,prefs,campaignResult.data,streakResult.data,now);
    if (reason) return finish('skipped',reason);
    const quiet=quietUntil(now,prefs?.quiet_hours_start ?? '21:00',prefs?.quiet_hours_end ?? '08:00');
    if (quiet) return finish('deferred','Quiet hours',quiet);
    if (job.channel==='email' && job.send_started_at && now.getTime()-new Date(job.send_started_at).getTime()>=23*3600000)
      return finish('dead','Uncertain delivery exceeded the provider idempotency window; manual review required');

    const copy=milestoneCopy(job.milestone);
    let email: string | undefined;
    let subscription: { endpoint: string; keys: { p256dh: string; auth: string } } | undefined;
    if (job.channel==='email') {
      if (!deliveryReady('email'))
        return finish('deferred','Email delivery is not configured',new Date(now.getTime()+3600000));
      const {data,error}=await db.auth.admin.getUserById(job.user_id);
      if (error) throw new DeliveryError('Verified email lookup failed');
      if (!data.user?.email || !data.user.email_confirmed_at) return finish('skipped','No verified email');
      email=data.user.email.toLowerCase();
      const suppression=await db.from('streak_email_suppressions').select('email').eq('email',email).maybeSingle();
      if (suppression.error) throw new DeliveryError('Suppression lookup failed');
      if (suppression.data) return finish('skipped','Email address is suppressed');
    }
    if (job.channel==='push') {
      if (!deliveryReady('push'))
        return finish('deferred','Push delivery is not configured',new Date(now.getTime()+3600000));
      const result=await db.from('push_subscriptions').select('endpoint,p256dh,auth,subscription').eq('user_id',job.user_id).maybeSingle();
      if (result.error) throw new DeliveryError('Push subscription lookup failed');
      const row=result.data;
      subscription=row?.endpoint && row.p256dh && row.auth ? {endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}} : row?.subscription;
      if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) return finish('skipped','No push subscription');
    }
    const reserved=await db.rpc('reserve_streak_campaign_contact',{p_id:job.id,p_lease:job.lease_token});
    if (reserved.error) throw new DeliveryError('Contact reservation failed');
    if (reserved.data) return finish('deferred','Daily contact limit',new Date(reserved.data));
    const marked=await db.rpc('mark_streak_campaign_send',{p_id:job.id,p_lease:job.lease_token});
    if (marked.error || !marked.data) throw new DeliveryError('Job lease lost');

    let providerId: string | undefined;
    if (job.channel==='in_app') {
      const result=await db.from('notifications').upsert({id:job.id,user_id:job.user_id,type:'streak',title:copy.title,message:copy.message,
        link:copy.path,status:'delivered',priority:'normal',channel:'in_app',group_key:`streak-campaign:${job.id}`,
        metadata:{campaign_id:job.campaign_id,milestone:job.milestone},expires_at:job.expires_at}, {onConflict:'id',ignoreDuplicates:true});
      if (result.error) throw new DeliveryError('Inbox delivery failed');
      providerId=job.id;
    } else if (job.channel==='email') {
      const origin=campaignOrigin();
      const token=unsubscribeToken(job.user_id,process.env.CAMPAIGN_UNSUBSCRIBE_SECRET!);
      const unsubscribe=`${origin}/unsubscribe?token=${encodeURIComponent(token)}`;
      const oneClick=`${origin}/api/engagement/unsubscribe?token=${encodeURIComponent(token)}`;
      const message=milestoneEmail(copy.title,copy.message,`${origin}${copy.path}`,unsubscribe,
        process.env.CAMPAIGN_SENDER_NAME ?? 'Exam Prep',process.env.CAMPAIGN_POSTAL_ADDRESS!);
      const resend=new Resend(process.env.RESEND_API_KEY);
      const result=await deadline(resend.emails.send({from:process.env.CAMPAIGN_FROM_EMAIL!,to:email!,...message,
        headers:{'List-Unsubscribe':`<${oneClick}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'},
        tags:[{name:'streak_job',value:job.id}]},{idempotencyKey:`streak-milestone/${job.id}`}));
      if (result.error) {
        const status=result.error.statusCode ?? 500;
        throw new DeliveryError(`Email provider rejected request (${status})`,status===429 || status>=500);
      }
      providerId=result.data?.id;
    } else {
      const webpush=(await import('web-push')).default;
      webpush.setVapidDetails(process.env.VAPID_SUBJECT!,process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,process.env.VAPID_PRIVATE_KEY!);
      try {
        await webpush.sendNotification(subscription!,JSON.stringify({title:copy.title,body:copy.message,url:`${campaignOrigin()}${copy.path}`,tag:`streak-campaign:${job.id}`,renotify:false}),{timeout:8000,TTL:3600});
      } catch (error) {
        const status=(error as {statusCode?: number}).statusCode;
        if (status===404 || status===410) {
          // Match the endpoint too, so a new subscription is never deleted by an old job.
          await db.from('push_subscriptions').delete().eq('user_id',job.user_id).eq('endpoint',subscription!.endpoint);
          return finish('skipped','Expired push subscription');
        }
        throw new DeliveryError(`Push provider rejected request (${status ?? 'network'})`,status==null || status===429 || status>=500);
      }
    }
    return finish('delivered',undefined,undefined,providerId);
  } catch (error) {
    const retryable=!(error instanceof DeliveryError) || error.retryable;
    return finish(retryable && job.attempts<5 ? 'pending' : 'dead',error instanceof Error ? error.message : 'Delivery failed',retryAt(job.attempts,now));
  }
}
