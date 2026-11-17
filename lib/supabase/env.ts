export function getSupabaseUrl(): string {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL;
  }
  const g = globalThis as Record<string, unknown>;
  const env = g?.env as Record<string, string> | undefined;
  if (env?.NEXT_PUBLIC_SUPABASE_URL) {
    return env.NEXT_PUBLIC_SUPABASE_URL;
  }
  return "";
}

export function getSupabaseAnonKey(): string {
  if (typeof process !== "undefined") {
    const key = process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (key) return key;
  }
  const g = globalThis as Record<string, unknown>;
  const env = g?.env as Record<string, string> | undefined;
  if (env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
  return "";
}
