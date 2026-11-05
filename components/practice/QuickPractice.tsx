import Link from 'next/link';
import { getSprintCatalog } from '@/lib/sprint-catalog';
import { SprintLauncher } from './SprintLauncher';

export async function QuickPractice() {
  try { return <SprintLauncher compact catalog={await getSprintCatalog()} />; }
  catch { return <section className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">Quick practice</h2><p className="text-sm text-muted-foreground">Unable to load sprint options right now.</p><Link href="/practice" className="inline-flex min-h-11 items-center text-sm underline">Open quick practice to retry</Link></section>; }
}
