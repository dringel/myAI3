// app/api/chat/tools/search-vector-database.ts
// @ts-nocheck
/**
 * Direct Pinecone index query (no SDK, no controller host).
 * - Safe on import (no throws)
 * - Uses OpenAI embeddings and direct index-host /query endpoint
 *
 * Required env:
 * - OPENAI_API_KEY
 * - PINECONE_API_KEY
 * - PINECONE_INDEX_HOST  (exact index host from Pinecone UI, include https://)
 * - EMBEDDING_MODEL (optional; default text-embedding-3-small)
 */

import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const PINECONE_API_KEY = process.env.PINECONE_API_KEY ?? "";
const PINECONE_INDEX_HOST = (process.env.PINECONE_INDEX_HOST || process.env.PINECONE_HOST || "").trim();
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

if (!OPENAI_API_KEY) console.warn("[search-tool] WARNING: OPENAI_API_KEY not set.");
if (!PINECONE_API_KEY) console.warn("[search-tool] WARNING: PINECONE_API_KEY not set.");
if (!PINECONE_INDEX_HOST) console.warn("[search-tool] WARNING: PINECONE_INDEX_HOST not set.");

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function embedText(text) {
  if (!text) return null;
  if (!OPENAI_API_KEY) {
    console.warn("[search-tool] embedText: OPENAI_API_KEY missing");
    return null;
  }
  try {
    const r = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: text });
    return r?.data?.[0]?.embedding ?? null;
  } catch (err) {
    console.error("[search-tool] embedding error:", err);
    throw err;
  }
}

function normalizeMatch(m) {
  const md = m.metadata ?? {};
  return {
    id: m.id ?? null,
    _score: m.score ?? m.similarity ?? null,
    name: md.name ?? md.title ?? "",
    location: md.location ?? md.city ?? "",
    category: md.category ?? md.sub_category ?? "",
    price_range: md.price_range ?? md.price ?? "",
    description: md.description ?? md.desc ?? "",
    raw: m,
  };
}

export const vectorDatabaseSearch = {
  async execute({ query, topK = 8 } = {}) {
    const q = String(query ?? "").trim();
    console.log("[search-tool] execute called. query:", q.slice(0, 300), "topK:", topK);
    if (!q) return { matches: [], vendors: [] };

    // 1) create embedding
    let vector;
    try {
      vector = await embedText(q);
    } catch (err) {
      console.error("[search-tool] embed error:", err);
      return { matches: [], vendors: [] };
    }
    if (!vector) {
      console.warn("[search-tool] embedding null");
      return { matches: [], vendors: [] };
    }

    // 2) call index host directly
    if (!PINECONE_INDEX_HOST || !PINECONE_API_KEY) {
      console.warn("[search-tool] Pinecone index host or API key missing; returning empty.");
      return { matches: [], vendors: [] };
    }

    try {
      const url = `${PINECONE_INDEX_HOST.replace(/\/$/, "")}/query`;
      const body = { vector, topK, includeMetadata: true, includeValues: false };
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": PINECONE_API_KEY,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error(`[search-tool] Pinecone query failed: ${res.status} ${res.statusText} - ${txt}`);
        return { matches: [], vendors: [] };
      }

      const json = await res.json();
      console.log("[search-tool] pinecone.raw:", JSON.stringify(json).slice(0, 10000));

      const matches = (json.matches ?? json.results ?? []).map((m) => ({
        id: m.id,
        score: m.score ?? m.similarity ?? null,
        metadata: m.metadata ?? {},
      }));

      const vendors = matches.map((m) => normalizeMatch({ id: m.id, metadata: m.metadata, score: m.score }));

      return { matches, vendors };
    } catch (err) {
      console.error("[search-tool] Pinecone HTTP error:", err);
      return { matches: [], vendors: [] };
    }
  },
};

export default async function vectorDatabaseSearchFn(query, topK = 8) {
  return vectorDatabaseSearch.execute({ query, topK });
}
