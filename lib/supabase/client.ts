import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseUrl, getSupabaseAnonKey } from "./env";

// Ensure __name is available globally for any bundler transforms
if (typeof globalThis !== "undefined" && !(globalThis as unknown as { __name?: unknown }).__name) {
  try {
    const fn = (target: unknown, value: string) =>
      Object.defineProperty(target, "name", { value, configurable: true });
    (globalThis as unknown as { __name: unknown }).__name = fn;
    if (typeof window !== "undefined") {
      (window as unknown as { __name: unknown }).__name = fn;
    }
  } catch {}
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || getSupabaseUrl();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    getSupabaseAnonKey();

  return createBrowserClient(url, key);
}
