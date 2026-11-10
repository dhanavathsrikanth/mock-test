"use client";

import Link, { useLinkStatus } from "next/link";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

function NavigationFeedback({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span className="contents" aria-busy={pending}>
      {children}
      {pending && <>
        <span aria-hidden="true" className="fixed inset-x-0 top-0 z-[100] h-1 animate-pulse bg-primary motion-reduce:animate-none" />
        <span aria-hidden="true" className="absolute inset-0 rounded-[inherit] bg-current/10" />
        <Loader2 aria-hidden="true" className="absolute right-1 top-1 h-3 w-3 animate-spin" />
        <span role="status" className="sr-only">Opening page…</span>
      </>}
    </span>
  );
}

export function NavigationLink({ children, className = "", prefetch, onMouseEnter, onFocus, onTouchStart, ...props }: ComponentProps<typeof Link>) {
  // Fully warm only the destination the student is about to open. Prefetching
  // every sidebar item would make all analytics/catalogue queries compete.
  const [intent, setIntent] = useState(false);
  return (
    <Link {...props} prefetch={prefetch ?? (intent ? true : false)}
      onMouseEnter={event => { setIntent(true); onMouseEnter?.(event); }}
      onFocus={event => { setIntent(true); onFocus?.(event); }}
      onTouchStart={event => { setIntent(true); onTouchStart?.(event); }}
      className={`relative ${className}`}>
      <NavigationFeedback>{children}</NavigationFeedback>
    </Link>
  );
}
