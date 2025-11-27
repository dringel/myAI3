// lib/openai.ts
import OpenAI from "openai";

const OPENAI_KEY = process.env.OPENAI_API_KEY!;
if (!OPENAI_KEY) throw new Error("Missing OPENAI_API_KEY env var");

export const openai = new OpenAI({ apiKey: OPENAI_KEY });
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
