import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "/dashboard";
  const destination = new URL("/dashboard", origin);
  if (requestedNext.startsWith("/") && !requestedNext.startsWith("//")) {
    const candidate = new URL(requestedNext, origin);
    if (candidate.origin === origin && !candidate.pathname.startsWith("/auth")) {
      destination.pathname = candidate.pathname;
      destination.search = candidate.search;
    }
  }

  if (code) {
    const supabaseResponse = NextResponse.redirect(destination);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const login = new URL("/auth/login", origin);
      login.searchParams.set("error", "oauth_callback_failed");
      const failedResponse = NextResponse.redirect(login);
      for (const cookie of supabaseResponse.cookies.getAll()) {
        failedResponse.cookies.set(cookie);
      }
      return failedResponse;
    }
    return supabaseResponse;
  }

  return NextResponse.redirect(`${origin}/auth/login`);
}
