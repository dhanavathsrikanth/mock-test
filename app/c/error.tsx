"use client";
import { Button } from '@/components/ui/button';
export default function ChallengeError({reset}:{reset:()=>void}) {
  return <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground"><div className="max-w-md space-y-4"><h1 className="text-2xl font-bold">Your challenge could not load.</h1><p className="text-sm text-muted-foreground">Your saved answers stay on this device. Check your connection and try again.</p><Button onClick={reset}>Try again</Button></div></main>;
}
