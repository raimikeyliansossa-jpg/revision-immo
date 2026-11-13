import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
    );
  }
  return client;
}

/** Transforme une erreur Supabase en message lisible. */
export function errMsg(e: unknown): string {
  if (!e) return "Erreur inconnue";
  if (typeof e === "string") return e;
  const m = (e as { message?: string }).message;
  return m || "Erreur inconnue";
}
