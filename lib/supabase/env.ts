const DEFAULT_SUPABASE_URL = "https://kygptxzyiyucpigzasat.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_AJtA5_tmfYZabR_NI9uUVA_Bhrm_TWX";

function isValidUrl(url?: unknown): url is string {
  return typeof url === "string" && url.trim().startsWith("http");
}

function isValidKey(key?: unknown): key is string {
  return (
    typeof key === "string" &&
    key.trim().length > 0 &&
    key !== "[SENSITIVE]"
  );
}

export function getSupabaseUrl(): string {
  try {
    if (typeof process !== "undefined" && isValidUrl(process.env?.NEXT_PUBLIC_SUPABASE_URL)) {
      return process.env.NEXT_PUBLIC_SUPABASE_URL;
    }
  } catch {}

  const g = globalThis as Record<string, unknown>;
  const env = (g?.env || (typeof window !== "undefined" && (window as unknown as { __ENV?: Record<string, string> }).__ENV)) as Record<string, string> | undefined;
  if (isValidUrl(env?.NEXT_PUBLIC_SUPABASE_URL)) {
    return env.NEXT_PUBLIC_SUPABASE_URL;
  }

  return DEFAULT_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
  try {
    if (typeof process !== "undefined") {
      const key =
        process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (isValidKey(key)) return key;
    }
  } catch {}

  const g = globalThis as Record<string, unknown>;
  const env = (g?.env || (typeof window !== "undefined" && (window as unknown as { __ENV?: Record<string, string> }).__ENV)) as Record<string, string> | undefined;
  const key =
    env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (isValidKey(key)) return key;

  return DEFAULT_SUPABASE_ANON_KEY;
}
