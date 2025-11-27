// app/api/chat/route.ts
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";

import { MODEL } from "@/config";
import { SYSTEM_PROMPT } from "@/prompts";
import { isContentFlagged } from "@/lib/moderation";
import { webSearch } from "./tools/web-search";
import { vectorDatabaseSearch } from "./tools/search-vector-database";
import { createClient } from "@supabase/supabase-js";
import { getVendorDetails } from "@/lib/db/getVendorDetails";

/**
 * Runtime-safe supabase getter.
 * Do NOT create client at module init to avoid Vercel build-time errors.
 */
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    null;

  if (!url || !key) return null;
  return createClient(url, key);
}

/* ---------- small utilities ---------- */

function getLatestUserText(messages: UIMessage[]): string | null {
  try {
    const latest = messages?.filter((m) => m.role === "user").pop();
    if (!latest) return null;
    const text = (latest.parts || [])
      .filter((p: any) => p.type === "text")
      .map((p: any) => ("text" in p ? p.text : ""))
      .join("");
    return text || null;
  } catch {
    return null;
  }
}

function isVendorQuery(text: string | null) {
  if (!text) return false;
  const t = text.toLowerCase();
  const vendorKeywords = [
    "vendor",
    "vendors",
    "caterer",
    "caterers",
    "venue",
    "venues",
    "wedding",
    "photographer",
    "photographers",
    "makeup",
    "decorator",
    "decor",
    "dj",
    "banquet",
    "vendors in",
    "vendors near",
    "best caterers",
    "top caterers",
    "guide",
  ];
  const cityKeywords = ["mumbai", "bombay"];
  return vendorKeywords.some((k) => t.includes(k)) || cityKeywords.some((c) => t.includes(c));
}

function parseBudget(text: string | null) {
  try {
    if (!text) return null;
    const m = text.match(/(\d[\d,.]*)\s*(lakh|lakhs|lacs|l|₹|rs|rupees|rupee|inr)?/i);
    if (!m) return null;
    let nRaw = (m[1] || "").replace(/,/g, "");
    let n = Number(nRaw);
    if (isNaN(n)) return null;
    const unit = (m[2] || "").toLowerCase();
    if (unit.includes("lakh") || unit === "l" || unit.includes("lacs")) return Math.round(n * 100000);
    return n;
  } catch {
    return null;
  }
}

function parseCategory(text: string | null) {
  if (!text) return null;
  const cats = ["caterer", "caterers", "decorator", "decorators", "venue", "venues", "photographer", "photographers", "dj", "makeup"];
  for (const c of cats) if (text.toLowerCase().includes(c)) return c.replace(/s$/, "");
  return null;
}

function isMoreDetailsQuery(text: string | null) {
  if (!text) return false;
  return /\bmore details on\b|\bdetails on\b|\btell me more about\b/i.test(text);
}
function extractVendorNameFromMoreDetails(text: string | null) {
  if (!text) return null;
  const m = text.match(/\b(?:more details on|details on|tell me more about)\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}

function isReviewsQuery(text: string | null) {
  if (!text) return false;
  return /\breviews\b|\bratings\b|\bfeedback\b/i.test(text);
}
function extractVendorNameFromReviews(text: string | null) {
  if (!text) return null;
  const m = text.match(/\b(?:reviews of|reviews for|reviews on)\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}

function isGuideQuery(text: string | null) {
  if (!text) return false;
  const t = text.toLowerCase();
  return /\b(guide|best|top|recommend|who should i|find me|best caterers|top caterers|guide to)\b/.test(t)
    && /\bcaterer|caterers|vendors|venues\b/.test(t);
}

async function normalizeVectorResults(result: any): Promise<any[]> {
  try {
    if (!result) return [];
    if (Array.isArray(result)) return result as any[];
    if (Array.isArray(result.matches)) {
      return result.matches.map((m: any) => ({ ...(m.metadata ?? {}), _score: m.score ?? m.similarity, _id: m.id }));
    }
    if (Array.isArray(result.hits)) {
      return result.hits.map((h: any) => ({ ...(h.document ?? h.payload ?? h.metadata ?? h), _score: h.score ?? h._score, _id: h.id }));
    }
    if (Array.isArray(result.data?.matches)) return result.data.matches;
    if (Array.isArray(result.results)) return result.results;
    return [];
  } catch {
    return [];
  }
}

/* ---------- small OpenAI helper (safe) ---------- */
async function callOpenAIChat(prompt: string, opts: { model?: string; max_tokens?: number } = {}) {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const model = opts.model || "gpt-4o-mini";
    const body = {
      model,
      messages: [
        { role: "system", content: "You are a strict editor. Do not hallucinate. Use only provided facts." },
        { role: "user", content: prompt },
      ],
      max_tokens: opts.max_tokens ?? 800,
      temperature: 0.0,
    };
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.warn("[openai] non-ok response", res.status, t);
      return null;
    }
    const j = await res.json();
    return j?.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    console.warn("[openai] call failed", e);
    return null;
  }
}

/* ---------- request handler ---------- */

type IncomingBody = { messages?: UIMessage[]; [k: string]: any } | { message?: string; [k: string]: any };

export async function POST(req: Request) {
  console.log("[chat] request received");
  // parse body
  let body: IncomingBody;
  try {
    body = (await req.json()) as IncomingBody;
  } catch (err) {
    console.error("[chat] invalid JSON:", err);
    return new Response(JSON.stringify({ error: "invalid JSON body" }), { status: 400 });
  }

  // initialize supabase at runtime
  const supabase = getSupabase();

  // normalize messages
  let messages: UIMessage[] | undefined = undefined;
  if (Array.isArray((body as any).messages)) messages = (body as any).messages as UIMessage[];
  else if (typeof (body as any).message === "string") {
    messages = [
      { id: "m1", role: "user", parts: [{ type: "text", text: (body as any).message }] } as any,
    ];
  } else {
    console.error("[chat] no messages provided:", body);
    return new Response(JSON.stringify({ error: "no messages provided" }), { status: 400 });
  }

  const latestUserText = getLatestUserText(messages) ?? "";
  console.log("[chat] latestUserText:", (latestUserText || "").slice(0, 300));

  // moderation
  try {
    if (latestUserText) {
      const moderationResult = await isContentFlagged(latestUserText);
      if (moderationResult?.flagged) {
        const stream = createUIMessageStream({
          execute({ writer }) {
            const id = "moderation-deny";
            writer.write({ type: "start" });
            writer.write({ type: "text-start", id });
            writer.write({ type: "text-delta", id, delta: moderationResult.denialMessage || "Your message violates our guidelines." });
            writer.write({ type: "text-end", id });
            writer.write({ type: "finish" });
          },
        });
        return createUIMessageStreamResponse({ stream });
      }
    }
  } catch (e) {
    console.warn("[chat] moderation error, continuing", e);
  }

  // vendor mode check
  const vendorMode = isVendorQuery(latestUserText);
  if (vendorMode) {
    console.log("[chat] vendor mode ON");

    const stream = createUIMessageStream({
      async execute({ writer }) {
        const textId = "vendor-response";
        writer.write({ type: "start" });
        writer.write({ type: "text-start", id: textId });

        try {
          const composedQuery = (latestUserText || "").trim();
          console.log("[chat][vendor] query:", composedQuery);

          // ---------- GUIDE ----------
          if (isGuideQuery(composedQuery)) {
            try {
              const category = parseCategory(composedQuery) || "caterer";
              const cityMatch = composedQuery.match(/\b(mumbai|bombay)\b/i);
              const city = cityMatch ? cityMatch[1] : "Mumbai";

              // simple curated buckets (safe when supabase absent)
              const qBase = supabase
                ? supabase.from("vendors").select("id, name, short_description, min_price, max_price, currency, city, category, avg_rating, rating_count")
                : null;

              const luxuryQ = qBase ? qBase.eq("category", category).ilike("city", `%${city}%`).order("avg_rating", { ascending: false }).limit(6) : { data: [] };
              const vegQ = qBase ? qBase.eq("category", category).ilike("city", `%${city}%`).ilike("short_description", "%veg%").order("avg_rating", { ascending: false }).limit(6) : { data: [] };
              const regionalQ = qBase ? qBase.eq("category", category).ilike("city", `%${city}%`).order("rating_count", { ascending: false }).limit(8) : { data: [] };
              const budgetQ = qBase ? qBase.eq("category", category).ilike("city", `%${city}%`).order("min_price", { ascending: true }).limit(8) : { data: [] };

              const [luxRes, vegRes, regRes, budRes] = qBase ? await Promise.all([luxuryQ, vegQ, regionalQ, budgetQ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

              const luxury = (luxRes?.data || []).slice(0, 6);
              const veg = (vegRes?.data || []).slice(0, 6);
              const regional = (regRes?.data || []).slice(0, 6);
              const budget = (budRes?.data || []).slice(0, 6);

              const facts = {
                city,
                category,
                buckets: {
                  ultra_luxury: luxury,
                  pure_veg: veg,
                  regional: regional,
                  budget: budget,
                },
              };

              const prompt = `
You are an editor. Use ONLY the JSON facts below to create a concise, human-friendly guide titled "Top wedding ${category}s in ${city}".
- Sections: Ultra-Luxury Tier, Pure Vegetarian, Regional Specialties, Mid-range / Affordable.
- For each vendor include: Name (bold), 1-sentence descriptor (from short_description), and Estimated Price (min-max + currency). If missing, write "Price not provided".
- After sections, provide 3 brief insider tips.
- DO NOT invent facts.
Output two pieces concatenated, separated by the sentinel line: "___GUIDE_JSON___" then a JSON object; after that, the human-readable guide.
FACTS:
${JSON.stringify(facts)}
`;

              const llmResp = await callOpenAIChat(prompt, { model: "gpt-4o-mini", max_tokens: 900 });

              if (llmResp) {
                writer.write({ type: "text-delta", id: textId, delta: llmResp });
              } else {
                // fallback deterministic guide
                const fallback: string[] = [];
                fallback.push(`Top wedding ${category}s in ${city}\n`);
                fallback.push("Ultra-Luxury Tier:");
                luxury.forEach((v: any) => fallback.push(`- **${v.name}** — ${v.short_description ?? "Details not provided"}. Price: ${v.min_price ?? "Price not provided"} - ${v.max_price ?? ""} ${v.currency ?? ""}`));
                fallback.push("\nPure Vegetarian:");
                veg.forEach((v: any) => fallback.push(`- **${v.name}** — ${v.short_description ?? "Details not provided"}. Price: ${v.min_price ?? "Price not provided"} - ${v.max_price ?? ""} ${v.currency ?? ""}`));
                fallback.push("\nRegional Specialties:");
                regional.forEach((v: any) => fallback.push(`- **${v.name}** — ${v.short_description ?? "Details not provided"}. Price: ${v.min_price ?? "Price not provided"} - ${v.max_price ?? ""} ${v.currency ?? ""}`));
                fallback.push("\nMid-range / Affordable:");
                budget.forEach((v: any) => fallback.push(`- **${v.name}** — ${v.short_description ?? "Details not provided"}. Price: ${v.min_price ?? "Price not provided"} - ${v.max_price ?? ""} ${v.currency ?? ""}`));
                fallback.push("\nInsider tips:\n- Ask for floating crowd adjustments.\n- Use live stations to boost perceived quality.\n- Check venue tie-ups before confirming outside caterers.");
                const guideJson = {
                  title: `Top wedding ${category}s in ${city}`,
                  sections: [
                    { name: "Ultra-Luxury Tier", vendors: luxury.map((v: any) => ({ id: v.id, name: v.name, descriptor: v.short_description, price: v.min_price ? `${v.min_price} - ${v.max_price ?? ""} ${v.currency ?? ""}` : "Price not provided" })) },
                    { name: "Pure Vegetarian", vendors: veg.map((v: any) => ({ id: v.id, name: v.name, descriptor: v.short_description, price: v.min_price ? `${v.min_price} - ${v.max_price ?? ""} ${v.currency ?? ""}` : "Price not provided" })) },
                    { name: "Regional Specialties", vendors: regional.map((v: any) => ({ id: v.id, name: v.name, descriptor: v.short_description, price: v.min_price ? `${v.min_price} - ${v.max_price ?? ""} ${v.currency ?? ""}` : "Price not provided" })) },
                    { name: "Mid-range / Affordable", vendors: budget.map((v: any) => ({ id: v.id, name: v.name, descriptor: v.short_description, price: v.min_price ? `${v.min_price} - ${v.max_price ?? ""} ${v.currency ?? ""}` : "Price not provided" })) },
                  ],
                  insider_tips: ["Ask for floating crowd adjustments.", "Use live stations to boost perceived quality.", "Check venue tie-ups before confirming outside caterers."],
                };
                writer.write({ type: "text-delta", id: textId, delta: `___GUIDE_JSON___${JSON.stringify(guideJson)}___END_GUIDE_JSON___\n\n${fallback.join("\n\n")}` });
              }

              writer.write({ type: "text-end", id: textId });
              writer.write({ type: "finish" });
              return;
            } catch (e) {
              console.warn("[guide] error", e);
              writer.write({ type: "text-delta", id: textId, delta: "Couldn't assemble the guide right now." });
              writer.write({ type: "text-end", id: textId });
              writer.write({ type: "finish" });
              return;
            }
          }

          // ---------- MORE DETAILS ----------
          if (isMoreDetailsQuery(composedQuery)) {
            const vendorName = extractVendorNameFromMoreDetails(composedQuery);
            if (!vendorName) {
              writer.write({ type: "text-delta", id: textId, delta: "Which vendor? Say: More details on <vendor name>." });
              writer.write({ type: "text-end", id: textId });
              writer.write({ type: "finish" });
              return;
            }

            // try vector -> DB -> helper
            let searchRes = null;
            try {
              searchRes = await (vectorDatabaseSearch as any).execute?.({ query: vendorName, topK: 8 });
            } catch {
              searchRes = null;
            }
            const vectCandidates = await normalizeVectorResults(searchRes);
            const vectId = vectCandidates.map((v) => v.vendor_id || v._id || v.id).find(Boolean) || null;

            let details = null;
            try {
              if (vectId) details = await getVendorDetails(String(vectId));
              if (!details && supabase) {
                const { data: found } = await supabase.from("vendors").select("id, name").ilike("name", `%${vendorName}%`).limit(1).maybeSingle();
                if (found?.id) details = await getVendorDetails(found.id);
              }
            } catch (e) {
              console.warn("[more-details] lookup failed", e);
            }

            if (!details || !details.vendor) {
              // fallback to web search
              const webRes = await webSearch(vendorName, { limit: 3 }).catch(() => null);
              if (webRes && webRes.length) {
                const s = webRes.slice(0, 3).map((r: any, i: number) => `${i + 1}. ${r.title || r.name}\n${r.snippet || r.summary || ""}\n${r.url || ""}`).join("\n\n");
                writer.write({ type: "text-delta", id: textId, delta: `Couldn't find this vendor in the internal DB. Web summary:\n\n${s}` });
              } else {
                writer.write({ type: "text-delta", id: textId, delta: `I couldn't find details for "${vendorName}".` });
              }
              writer.write({ type: "text-end", id: textId });
              writer.write({ type: "finish" });
              return;
            }

            // Prepare fact block for GPT
            const factBlock = {
              vendor: details.vendor,
              images: details.images || [],
              offers: details.offers || [],
              reviews: details.top_reviews || [],
              stats: details.stats || {},
            };

            const prompt = `
You are an expert wedding consultant. Using ONLY the JSON facts below, produce a high-quality vendor deep-dive.
Rules:
- Do NOT hallucinate or add facts.
- If a field is missing, omit it.
- Provide sections: Short summary (2-3 sentences), What they're best known for (bullets), Food/Service/Logistics quality summary, Strengths (bullets), Limitations (bullets), Price & value analysis, Who this vendor is ideal for.
FACTS:
${JSON.stringify(factBlock)}
`;
            const llm = await callOpenAIChat(prompt, { model: "gpt-4o-mini", max_tokens: 900 });

            writer.write({ type: "text-delta", id: textId, delta: llm || "Could not generate vendor analysis." });

            // emit JSON sentinel for UI
            //try {
             // writer.write({
             //   type: "text-delta",
             //   id: textId,
            //    delta: `\n\n__VENDOR_DETAILS_JSON__${JSON.stringify(factBlock)}__END_VENDOR_DETAILS_JSON__`,
            //  });
           // } catch (e) {
             // console.warn("[more-details] failed to emit sentinel", e);
            //}

            writer.write({ type: "text-end", id: textId });
            writer.write({ type: "finish" });
            return;
          }

          // ---------- REVIEWS ----------
          if (isReviewsQuery(composedQuery)) {
            let vendorName = extractVendorNameFromReviews(composedQuery);
            if (!vendorName) {
              // try previous assistant list extraction
              const prev = messages?.slice().reverse().find((m) => m.role === "assistant");
              if (prev) {
                const t = (prev.parts || []).map((p: any) => p.text || "").join(" ");
                const m = t.match(/^\s*1\.\s*([^\n–-]+)/m);
                if (m && m[1]) vendorName = m[1].trim();
              }
            }
            if (!vendorName) {
              writer.write({ type: "text-delta", id: textId, delta: "Which vendor? Say: Reviews for <vendor name>." });
              writer.write({ type: "text-end", id: textId });
              writer.write({ type: "finish" });
              return;
            }

            // find vendor and reviews
            let vendor = null;
            try {
              if (supabase) {
                const { data: v } = await supabase.from("vendors").select("id, name").ilike("name", `%${vendorName}%`).limit(1).maybeSingle();
                vendor = v;
              }
            } catch (e) {
              console.warn("[reviews] vendor lookup failed", e);
            }

            if (!vendor) {
              writer.write({ type: "text-delta", id: textId, delta: `Could not find vendor matching "${vendorName}".` });
              writer.write({ type: "text-end", id: textId });
              writer.write({ type: "finish" });
              return;
            }

            let details = null;
            try {
              details = await getVendorDetails(String(vendor.id));
            } catch (e) {
              console.warn("[reviews] getVendorDetails failed", e);
            }

            const reviews = details?.top_reviews || [];
            if (!reviews.length) {
              writer.write({ type: "text-delta", id: textId, delta: `No reviews available for ${vendor.name}.` });
              writer.write({ type: "text-end", id: textId });
              writer.write({ type: "finish" });
              return;
            }

            const prompt = `
You are an expert reviewer. Using ONLY the reviews below, produce a concise "Hits vs Misses" expert summary.
Rules:
- Do NOT add new facts.
- Identify themes: Food Quality, Service, Punctuality, Portions, Problems/Red flags.
- Output: 1) Short overall sentiment (1-2 sentences). 2) The Superstars (hits) - bullet list. 3) The Weaknesses (misses) - bullet list. 4) Final recommendation ("Good for...").
REVIEWS:
${JSON.stringify(reviews)}
`;

            const llm = await callOpenAIChat(prompt, { model: "gpt-4o-mini", max_tokens: 700 });
            writer.write({ type: "text-delta", id: textId, delta: llm || "Could not summarise reviews." });
            writer.write({ type: "text-end", id: textId });
            writer.write({ type: "finish" });
            return;
          }

          // ---------- GENERIC SEMANTIC SEARCH ----------
          // detect budget/category/specificity
          const budgetVal = parseBudget(composedQuery);
          const categoryVal = parseCategory(composedQuery);
          const looksSpecific = Boolean(budgetVal || categoryVal || /\b(powai|bandra|andheri|khar|juhu|thane|navi mumbai|lower parel|colaba|churchgate)\b/i.test(composedQuery));
          if (!looksSpecific) {
            writer.write({ type: "text-delta", id: textId, delta: "Okay — any category, budget, neighbourhood, or style to narrow it down?" });
            writer.write({ type: "text-end", id: textId });
            writer.write({ type: "finish" });
            return;
          }

          const semanticParts = [composedQuery];
          if (categoryVal) semanticParts.push(categoryVal);
          if (budgetVal) semanticParts.push(`budget ${budgetVal}`);
          const semanticQuery = semanticParts.join(" ");

          let searchRes = null;
          try {
            searchRes = await (vectorDatabaseSearch as any).execute?.({ query: semanticQuery, topK: 20 });
          } catch {
            try {
              searchRes = await (vectorDatabaseSearch as any)(semanticQuery, 20);
            } catch (e) {
              console.warn("[chat] vector search failed", e);
            }
          }

          const vectResults = await normalizeVectorResults(searchRes);
          const vendorIds = (vectResults || []).map((v: any) => v.vendor_id || v._id || v.id || (v.metadata && (v.metadata.vendor_id || v.metadata.id))).filter(Boolean);

          let dbRows: any[] = [];
          if (supabase && vendorIds.length) {
            try {
              const { data } = await supabase.from("vendors").select("*").in("id", vendorIds);
              dbRows = data || [];
            } catch (e) {
              console.warn("[chat] supabase fetch failed", e);
            }
          }

          // name-based fallback if needed
          if (supabase && dbRows.length === 0 && vectResults.length) {
            const maybeNames = vectResults.slice(0, 6).map((v) => v.name || v.title || v.vendor_name).filter(Boolean);
            for (const nm of maybeNames) {
              try {
                const { data } = await supabase.from("vendors").select("*").ilike("name", `%${nm}%`).limit(3);
                if (data && data.length) dbRows.push(...data);
              } catch {
                // ignore
              }
            }
            // dedupe
            const seen = new Set();
            dbRows = dbRows.filter((r: any) => {
              if (seen.has(r.id)) return false;
              seen.add(r.id);
              return true;
            });
          }

          const idToRow: any = {};
          for (const r of dbRows) idToRow[r.id] = r;
          const merged = [];
          for (const v of vectResults) {
            const id = v.vendor_id || v._id || v.id || (v.metadata && (v.metadata.vendor_id || v.metadata.id));
            if (id && idToRow[id]) merged.push({ ...idToRow[id], _score: v._score ?? v.score ?? v.similarity });
            else merged.push({ ...(v.metadata ?? v), name: v.name ?? v.title ?? v.vendor_name ?? v.provider ?? v.text ?? "Vendor", _score: v._score ?? v.score });
          }
          if (merged.length === 0 && dbRows.length) merged.push(...dbRows);

          if (budgetVal) {
            // filter by price
            const filtered = merged.filter((v: any) => {
              const mn = Number(v.price_min ?? v.min_price ?? v.price_from ?? 0) || 0;
              const mx = Number(v.price_max ?? v.max_price ?? v.price_to ?? 0) || 0;
              if (!mn && !mx) return true;
              if (mn && mx) return budgetVal >= mn && budgetVal <= mx;
              if (mn && !mx) return budgetVal >= mn;
              if (!mn && mx) return budgetVal <= mx;
              return true;
            });
            // shortlist
            const top = (filtered.length ? filtered : merged).slice(0, 6);
            // conversational + sentinel
            const paragraphs = top.map((v: any, i: number) => {
              const name = v.name ?? `Vendor ${i + 1}`;
              const category = v.category ?? "vendor";
              const city = v.city ?? "Mumbai";
              const priceStr = (v.price_min || v.price_max) ? `Price: ${v.price_min ?? "NA"} - ${v.price_max ?? "NA"}` : v.price_range ? `Approx: ${v.price_range}` : "";
              const rating = v.rating ? `Rated ${v.rating}/5` : "";
              const shortDesc = v.short_description ?? v.description ?? "";
              const parts = [`**${i + 1}. ${name}** — ${category} in ${city}.`, shortDesc ? shortDesc : "", priceStr || rating ? `${[priceStr, rating].filter(Boolean).join(" • ")}` : ""].filter(Boolean);
              return parts.join("\n\n");
            });
            const conversational = [`I found these vendors matching "${composedQuery}":`, "", ...paragraphs, "", `Say "More details on <name>" or ask to see reviews.`].join("\n\n");
            writer.write({ type: "text-delta", id: textId, delta: conversational });

            const structured = top.map((v: any) => ({
              id: v.id ?? v.vendor_id ?? null,
              name: v.name ?? null,
              category: v.category ?? null,
              city: v.city ?? null,
              price_min: v.price_min ?? v.min_price ?? null,
              price_max: v.price_max ?? v.max_price ?? null,
              rating: v.rating ?? null,
              contact: v.contact ?? v.phone ?? null,
              images: Array.isArray(v.images) ? v.images : v.images ? [v.images] : null,
              short_description: v.short_description ?? v.description ?? null,
            }));

            writer.write({ type: "text-delta", id: textId, delta: `\n\n__VENDOR_HITS_JSON__${JSON.stringify(structured)}__END_VENDOR_HITS_JSON__` });
            writer.write({ type: "text-end", id: textId });
            writer.write({ type: "finish" });
            return;
          } else {
            // no budget filter path (similar, but without price filtering)
            const top = (merged.length ? merged : []).slice(0, 6);
            const paragraphs = top.map((v: any, i: number) => {
              const name = v.name ?? `Vendor ${i + 1}`;
              const category = v.category ?? "vendor";
              const city = v.city ?? "Mumbai";
              const priceStr = (v.price_min || v.price_max) ? `Price: ${v.price_min ?? "NA"} - ${v.price_max ?? "NA"}` : v.price_range ? `Approx: ${v.price_range}` : "";
              const rating = v.rating ? `Rated ${v.rating}/5` : "";
              const shortDesc = v.short_description ?? v.description ?? "";
              const parts = [`**${i + 1}. ${name}** — ${category} in ${city}.`, shortDesc ? shortDesc : "", priceStr || rating ? `${[priceStr, rating].filter(Boolean).join(" • ")}` : ""].filter(Boolean);
              return parts.join("\n\n");
            });
            const conversational = [`I found these vendors matching "${composedQuery}":`, "", ...paragraphs, "", `Say "More details on <name>" or ask to see reviews.`].join("\n\n");
            writer.write({ type: "text-delta", id: textId, delta: conversational });

            const structured = top.map((v: any) => ({
              id: v.id ?? v.vendor_id ?? null,
              name: v.name ?? null,
              category: v.category ?? null,
              city: v.city ?? null,
              price_min: v.price_min ?? v.min_price ?? null,
              price_max: v.price_max ?? v.max_price ?? null,
              rating: v.rating ?? null,
              contact: v.contact ?? v.phone ?? null,
              images: Array.isArray(v.images) ? v.images : v.images ? [v.images] : null,
              short_description: v.short_description ?? v.description ?? null,
            }));

            writer.write({ type: "text-delta", id: textId, delta: `\n\n__VENDOR_HITS_JSON__${JSON.stringify(structured)}__END_VENDOR_HITS_JSON__` });
            writer.write({ type: "text-end", id: textId });
            writer.write({ type: "finish" });
            return;
          }
        } catch (err) {
          console.error("[chat][vendor mode] error", err);
          try { writer.write({ type: "text-delta", id: "vendor-response", delta: "Something went wrong while fetching vendors." }); } catch {}
        } finally {
          try { writer.write({ type: "text-end", id: "vendor-response" }); } catch {}
          try { writer.write({ type: "finish" }); } catch {}
        }
      },
    });

    return createUIMessageStreamResponse({ stream });
  }

  // Normal LLM path (non-vendor)
  try {
    const result = streamText({
      model: MODEL,
      system: SYSTEM_PROMPT,
      messages: convertToModelMessages(messages),
      tools: { webSearch },
      stopWhen: stepCountIs(10),
      providerOptions: {
        openai: {
          reasoningSummary: "auto",
          reasoningEffort: "low",
          parallelToolCalls: false,
        },
      },
    });

    return result.toUIMessageStreamResponse({ sendReasoning: true });
  } catch (err) {
    console.error("[chat] normal-mode streaming error:", err);
    const stream = createUIMessageStream({
      execute({ writer }) {
        const id = "fallback";
        writer.write({ type: "start" });
        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: "Sorry — trouble generating a reply right now." });
        writer.write({ type: "text-end", id });
        writer.write({ type: "finish" });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }
}
