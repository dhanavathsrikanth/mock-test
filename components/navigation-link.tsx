"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";

function NavigationFeedback({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span className="contents" aria-busy={pending}>
      {children}
      {pending && <>
        <span aria-hidden="true" className="absolute inset-0 rounded-[inherit] bg-current/10" />
        <Loader2 aria-hidden="true" className="absolute right-1 top-1 h-3 w-3 animate-spin" />
        <span role="status" className="sr-only">Opening page…</span>
      </>}
    </span>
  );
}

export function NavigationLink({ children, className = "", ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props} className={`relative ${className}`}>
      <NavigationFeedback>{children}</NavigationFeedback>
    </Link>
  );
}
