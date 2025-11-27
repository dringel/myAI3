// lib/pinecone-vendors.ts
// Pinecone vector search client for VENDORS (semantic embeddings)

import { Pinecone } from "@pinecone-database/pinecone";

const apiKey = process.env.PINECONE_API_KEY!;
const env = process.env.PINECONE_ENV!;
const indexName = process.env.PINECONE_INDEX!;

if (!apiKey) throw new Error("Missing PINECONE_API_KEY");
if (!env) throw new Error("Missing PINECONE_ENV");
if (!indexName) throw new Error("Missing PINECONE_INDEX");

const pinecone = new Pinecone({ apiKey });

export const vendorIndex = pinecone.Index(indexName);

// Helper for vector search
export async function vectorSearch({
  vector,
  topK = 5,
  filter,
}: {
  vector: number[];
  topK?: number;
  filter?: any;
}) {
  return vendorIndex.query({
    vector,
    topK,
    includeMetadata: true,
    filter: filter || undefined,
  });
}
