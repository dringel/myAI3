// lib/format/editorial.ts

export function buildEditorialPrompt(vendor: any, reviews: any[]) {
  return `
Create a structured editorial summary based ONLY on the facts provided.

### JSON DATA
Vendor:
${JSON.stringify(vendor, null, 2)}

Reviews:
${JSON.stringify(reviews.slice(0, 50), null, 2)}

### STRICT RULES
- DO NOT hallucinate ANY facts.
- Use only content from "vendor" and "reviews".
- If data missing, say “not provided”.
- Tone: objective, premium editorial.

### OUTPUT FORMAT (STRICT)

### **${vendor.name || "Vendor"}**
${vendor.short_description || vendor.long_description || "Description not provided."}

---

### **1. Strengths (Hits)**
(List 3–6 points based ONLY on positive reviews + vendor fields.)

### **2. Weaknesses (Misses)**
(List 2–4 recurring complaints ONLY if present in reviews.)

### **3. Signature Highlights**
- For caterers: dishes
- For venues: ambience, facilities
- For decorators: styles, USPs

### **4. Pricing Summary**
- Min–max price from DB
- If reviews mention price/value, summarise

### **5. Best For**
- Type of events this vendor fits (based on reviews + category)

### **6. Review Sentiment Snapshot**
Summarize true recurring themes: food, service, reliability, ambience, etc.

### **7. Reviewer Quotes**
3 short quotes (direct extracts from reviews ONLY)

---
Return ONLY the formatted editorial.`;
}
