// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Runtime-safe getters for Supabase clients.
 * Do NOT create clients at module load time to avoid build-time errors on Vercel.
 *
 * - getSupabaseAdmin(): returns an admin (service role) client if env vars exist, otherwise null.
 * - getSupabaseAnon(): returns an anon client if env vars exist, otherwise null.
 */

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    null;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export function getSupabaseAnon() {
  const url = process.env.SUPABASE_URL;
  const anon =
    process.env.SUPABASE_ANON_KEY ??
    null;

  if (!url || !anon) return null;

  return createClient(url, anon, {
    auth: { persistSession: false },
  });
}
