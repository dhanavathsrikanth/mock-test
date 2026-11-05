import { verifyUnsubscribe } from '@/lib/engagement/security';

export default async function UnsubscribePage({searchParams}:{searchParams:Promise<{token?:string}>}) {
  const {token}=await searchParams;
  if (!token || !verifyUnsubscribe(token,process.env.CAMPAIGN_UNSUBSCRIBE_SECRET ?? '')) return <main className="mx-auto max-w-md p-8"><h1 className="text-xl font-semibold">Invalid unsubscribe link</h1><p className="mt-3">You can turn milestone messages off in your profile settings.</p></main>;
  return <main className="mx-auto max-w-md space-y-5 p-8"><h1 className="text-2xl font-semibold">Turn off milestone messages?</h1><p>You’ll stop receiving streak milestone messages. Your study streak and other notification settings stay as they are.</p><form method="post" action={`/api/engagement/unsubscribe?token=${encodeURIComponent(token)}`}><button className="min-h-12 rounded-lg bg-primary px-5 text-primary-foreground">Unsubscribe</button></form></main>;
}
