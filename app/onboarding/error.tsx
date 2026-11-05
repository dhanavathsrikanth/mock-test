"use client";

import { Button } from "@/components/ui/button";

export default function OnboardingError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-lg space-y-4 px-4 py-12">
    <h1 className="text-2xl font-bold">We couldn&apos;t load the exam catalogue</h1>
    <p className="text-muted-foreground">Please try again. Your saved exam selection has not been changed.</p>
    <Button onClick={reset}>Try again</Button>
  </main>;
}
