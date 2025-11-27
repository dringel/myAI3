// app/api/session/test-route/route.ts
import { createSession, getSession } from "../../../../lib/session";

/**
 * Test endpoint to create and read sessions.
 * POST -> create a session (body: { sessionKey?: string, state?: any })
 * GET  -> read a session  (query param: ?sessionKey=...)
 *
 * Note: path is /api/session/test-route
 */

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionKey = typeof body.sessionKey === "string" ? body.sessionKey : `test-${Date.now()}`;
    const initialState = body.state ?? { stage: "ask_category", slots: {} };

    const created = await createSession(sessionKey, initialState);

    return new Response(JSON.stringify({ created }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const sessionKey = url.searchParams.get("sessionKey") ?? "";
    if (!sessionKey) {
      return new Response(JSON.stringify({ error: "sessionKey query param required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const session = await getSession(sessionKey);

    return new Response(JSON.stringify({ session }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
