// lib/session.ts
// @ts-nocheck

/**
 * Server-side session helper for convo_sessions table.
 * Uses runtime-safe getSupabaseAdmin().
 */

import { getSupabaseAdmin } from "./supabase";

/**
 * Internal helper to obtain Supabase admin client at runtime.
 * Throws a clear error if env vars are missing.
 */
function getClient() {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error(
      "Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel."
    );
  }
  return client;
}

export async function getSession(sessionKey: string) {
  if (!sessionKey) return null;

  const supabase = getClient();

  try {
    const { data, error } = await supabase
      .from("convo_sessions")
      .select("*")
      .eq("session_key", sessionKey)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[session] getSession warning:", error.message ?? error);
      return null;
    }

    return data ?? null;
  } catch (err) {
    console.error("[session] getSession throw:", err);
    return null;
  }
}

export async function createSession(sessionKey: string, initialState: any = {}) {
  if (!sessionKey) throw new Error("createSession requires sessionKey");

  const supabase = getClient();

  try {
    const payload = {
      session_key: sessionKey,
      state: initialState,
    };

    const { data, error } = await supabase
      .from("convo_sessions")
      .insert([payload])
      .select()
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[session] createSession error:", error.message ?? error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("[session] createSession throw:", err);
    throw err;
  }
}

export async function updateSession(sessionKey: string, newState: any) {
  if (!sessionKey) throw new Error("updateSession requires sessionKey");

  const supabase = getClient();

  try {
    const { data, error } = await supabase
      .from("convo_sessions")
      .update({
        state: newState,
        last_updated: new Date().toISOString(),
      })
      .eq("session_key", sessionKey)
      .select()
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[session] updateSession error:", error.message ?? error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("[session] updateSession throw:", err);
    throw err;
  }
}
