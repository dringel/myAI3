// lib/formatVendorLLM.ts
import { openai } from "./openai";

export async function formatVendorDetailsLLM(data: any) {
  const { vendor, images, offers, top_reviews, stats } = data;

  const prompt = `
You are an expert wedding consultant. Write a concise, polished summary of a wedding vendor using ONLY the data provided below.
Tone: premium, elegant, yet simple. No exaggeration. No fake claims.

VENDOR DATA (JSON):
${JSON.stringify(data, null, 2)}

OUTPUT REQUIREMENTS:
1. Start with a strong 1–2 sentence intro describing who the vendor is and what they specialize in.
2. Add a short section “Why clients choose them” – 2 to 3 bullet points.
3. Add a short section “What to keep in mind” – 1 to 2 bullets if applicable.
4. Add a compact “Pricing Snapshot” based strictly on min_price / max_price.
5. End with: “Best suited for:” and give 2–3 relevant event types based on their cuisine/style.
6. Do NOT invent details that aren't present.
7. Keep total length under 160 words.
8. No tables. No emojis.

Return ONLY the formatted text. Do not repeat the JSON.
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return res.choices[0].message.content;
}

export async function formatVendorReviewsLLM(data: any) {
  const { vendor, reviews, stats } = data;

  const prompt = `
You are a senior wedding-food critic. Write a deep, narrative-style review analysis like high-end magazines.
Use ONLY review data provided.

DATA:
${JSON.stringify(data, null, 2)}

OUTPUT MUST FOLLOW EXACT STRUCTURE:

### ${vendor.name} — Review Breakdown

1. Food Quality — Strengths
- Bullet points based on patterns in review data

2. Food Quality — Weaknesses
- Bullet points based on negative review patterns

3. Service & Professionalism
- Mention punctuality, delivery, coordination, based strictly on DB text

4. What Guests Consistently Mention
- Extract recurring themes

5. Best Suited For
- 3 specific scenarios based on cuisine + review sentiment

6. Not Suited For
- 2 scenarios based on weaknesses

7. Summary Line (1 sentence)
- Crisp concluding judgment, no exaggerations.

RULES:
- No hallucinations.
- Only use what is present.
- If data is limited, write a shorter section.
- Tone: refined, magazine-style, factual.
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return res.choices[0].message.content;
}
