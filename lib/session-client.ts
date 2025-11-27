// app/lib/session-client.ts
export function getOrCreateSessionKey(): string {
  if (typeof window === "undefined") return "server-session";
  let key = localStorage.getItem("vivaah_session_key");
  if (!key) {
    key = "sess-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    localStorage.setItem("vivaah_session_key", key);
  }
  return key;
}
