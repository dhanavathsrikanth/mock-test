import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  // The standalone practice calculator does not require an account.
  if (request.nextUrl.pathname === "/calculator") return NextResponse.next();
  // These handlers authenticate using signed links, provider signatures, or the
  // cron bearer secret. They must work without a student's browser session.
  if (["/unsubscribe", "/api/engagement/unsubscribe", "/api/engagement/email-webhook", "/api/cron/streak-campaigns"].includes(request.nextUrl.pathname)) return NextResponse.next();
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
