import { createHmac, timingSafeEqual } from 'node:crypto';

export function unsubscribeToken(userId: string, secret: string) {
  if (secret.length<32) throw new Error('Unsubscribe signing secret must contain at least 32 characters');
  const payload=Buffer.from(JSON.stringify({userId,purpose:'streak-milestones-v1'})).toString('base64url');
  return `${payload}.${createHmac('sha256',secret).update(payload).digest('base64url')}`;
}
export function verifyUnsubscribe(token: string, secret: string): string | null {
  try {
    if (secret.length<32 || token.length>1000) return null;
    const [payload,signature,extra]=token.split('.');
    if (!payload || !signature || extra) return null;
    const expected=createHmac('sha256',secret).update(payload).digest();
    const received=Buffer.from(signature,'base64url');
    if (received.length!==expected.length || !timingSafeEqual(received,expected)) return null;
    const parsed=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    return parsed.purpose==='streak-milestones-v1' && typeof parsed.userId==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.userId) ? parsed.userId : null;
  } catch { return null; }
}
export function campaignOrigin() {
  const url=new URL(process.env.APP_URL ?? '');
  if (url.protocol!=='https:' || url.username || url.password || url.pathname!=='/' || url.search || url.hash) throw new Error('APP_URL must be the canonical HTTPS origin');
  return url.origin;
}
export function authorizedCron(request: Request) {
  const secret=process.env.CRON_SECRET;
  if (!secret || secret.length<16) return false;
  const received=Buffer.from(request.headers.get('authorization') ?? '');
  const expected=Buffer.from(`Bearer ${secret}`);
  return received.length===expected.length && timingSafeEqual(received,expected);
}
export function deliveryReady(channel: 'email' | 'push') {
  try { campaignOrigin(); } catch { return false; }
  return channel==='email'
    ? !!(process.env.RESEND_API_KEY && process.env.RESEND_WEBHOOK_SECRET && process.env.CAMPAIGN_FROM_EMAIL && process.env.CAMPAIGN_POSTAL_ADDRESS && (process.env.CAMPAIGN_UNSUBSCRIBE_SECRET?.length ?? 0)>=32)
    : !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}
