// lib/llm/callOpenAI.ts
export async function callOpenAI(prompt: string, {
  model = "gpt-4o-mini",
  max_tokens = 1500
} = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        max_tokens,
        temperature: 0.1,
        messages: [
          { role: "system", content: "You are a strict, factual editor. No hallucination. Use ONLY provided facts." },
          { role: "user", content: prompt }
        ]
      })
    });

    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? null;

  } catch (e) {
    console.warn("[openai] call failed", e);
    return null;
  }
}
