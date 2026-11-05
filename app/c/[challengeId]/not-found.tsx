import Link from 'next/link';
export default function ChallengeNotFound() {
  return <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground"><div className="max-w-md space-y-4"><h1 className="text-2xl font-bold">This challenge is unavailable.</h1><p className="text-sm text-muted-foreground">Check the link with your classmate, or start a sprint and set a score of your own.</p><Link className="inline-block rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground" href="/practice">Practice a sprint</Link></div></main>;
}
