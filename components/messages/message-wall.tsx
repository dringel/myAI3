import { UIMessage } from "ai";
import { useEffect, useRef } from "react";
// Keep your original imports, but we will guard against them being undefined at runtime.
import { UserMessage } from "./user-message";
import { AssistantMessage } from "./assistant-message";
// Use plain img to avoid next/image domain config issues
// import Image from "next/image";

type Props = {
  messages: UIMessage[];
  status?: string;
  durations?: Record<string, number>;
  onDurationChange?: (key: string, duration: number) => void;
};

type VendorHit = {
  id: string | null;
  name: string | null;
  category?: string | null;
  city?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  is_veg?: boolean | null;
  rating?: number | null;
  contact?: string | null;
  images?: string[] | null;
  short_description?: string | null;
  raw?: any;
};

export function MessageWall({ messages, status, durations, onDurationChange }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- Guard component references so invalid imports don't crash the whole app ----
  const SafeUserMessage: any =
    typeof UserMessage === "function"
      ? UserMessage
      : // fallback simple renderer
        ({ message }: { message: UIMessage }) => {
          const text = (message.parts || []).map((p: any) => (p?.type === "text" ? p.text || "" : "")).join("");
          return <div className="inline-block bg-white p-3 rounded shadow text-sm">{text}</div>;
        };

  const SafeAssistantMessage: any =
    typeof AssistantMessage === "function"
      ? AssistantMessage
      : // fallback simple renderer for assistant content
        ({ message }: { message: UIMessage }) => {
          const text = (message.parts || []).map((p: any) => (p?.type === "text" ? p.text || "" : "")).join("");
          return <div className="inline-block bg-white p-3 rounded shadow text-sm">{text}</div>;
        };

  // If either import was undefined, log which one so we can fix import paths.
  if (typeof UserMessage !== "function") {
    // eslint-disable-next-line no-console
    console.warn("MessageWall: UserMessage import is not a function. Falling back to SafeUserMessage. Check ./user-message export (named vs default).", UserMessage);
  }
  if (typeof AssistantMessage !== "function") {
    // eslint-disable-next-line no-console
    console.warn("MessageWall: AssistantMessage import is not a function. Falling back to SafeAssistantMessage. Check ./assistant-message export (named vs default).", AssistantMessage);
  }

  // Helper: join UIMessage parts into plain text
  function messageToText(m: UIMessage): string {
    try {
      if (m.parts && Array.isArray(m.parts)) {
        return m.parts.map((p: any) => (p?.type === "text" ? (p.text ?? "") : "")).join("");
      }
      // fallback to `content` if present
      // @ts-ignore
      if (m.content && typeof m.content === "string") return m.content;
      return "";
    } catch (e) {
      return "";
    }
  }

  // Helper: extract JSON sentinel from assistant text
  function extractVendorHitsFromText(text: string): VendorHit[] | null {
    const startToken = "__VENDOR_HITS_JSON__";
    const endToken = "__END_VENDOR_HITS_JSON__";
    const s = text.indexOf(startToken);
    const e = text.indexOf(endToken);
    if (s === -1 || e === -1 || e <= s) return null;
    const jsonStr = text.slice(s + startToken.length, e);
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : null;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("MessageWall: failed to parse vendor JSON sentinel", err);
      return null;
    }
  }

  // Helper: remove sentinel block from text, return trimmed human text
  function stripSentinelFromText(text: string): string {
    const startToken = "__VENDOR_HITS_JSON__";
    const idx = text.indexOf(startToken);
    if (idx === -1) return text;
    return text.slice(0, idx).trim();
  }

  // Emit window events so outer client can handle follow-ups without changing props
  function emitMoreDetails(vendorName: string | null) {
    try {
      const ev = new CustomEvent("chat_action_more_details", { detail: { vendorName } });
      window.dispatchEvent(ev);
    } catch (e) {
      // ignore where CustomEvent is restricted
    }
  }
  function emitReviews(vendorName: string | null) {
    try {
      const ev = new CustomEvent("chat_action_reviews", { detail: { vendorName } });
      window.dispatchEvent(ev);
    } catch (e) {}
  }

  function VendorCard({ v }: { v: VendorHit }) {
    return (
      <div className="vendor-card-premium w-full flex gap-4">
        <div className="vendor-image-premium w-24 h-24 flex-shrink-0 bg-gradient-to-br from-[var(--soft-blush)] to-[var(--pearl-white)]">
          {v.images && v.images.length ? (
            <img
              src={v.images[0]}
              alt={v.name || "Vendor"}
              style={{ width: 96, height: 96, objectFit: "cover" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-[var(--rich-burgundy)] opacity-60">No image</div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-[var(--deep-plum)]">{v.name}</div>
              <div className="text-xs text-[var(--rich-burgundy)] opacity-70 mt-0.5">{v.category ?? ""} • {v.city ?? ""}</div>
            </div>
            <div className="text-right">
              {v.rating ? (
                <div className="rating-premium">
                  <span>★</span> {v.rating}/5
                </div>
              ) : null}
              <div className="text-xs text-[var(--rich-burgundy)] opacity-60 mt-1">
                {v.is_veg === true ? "Veg-only" : v.is_veg === false ? "Veg & Non-veg" : ""}
              </div>
            </div>
          </div>

          {v.short_description ? (
            <div className="mt-2 text-sm text-[var(--deep-plum)] opacity-80">{v.short_description}</div>
          ) : null}

          <div className="mt-4 flex gap-2 flex-wrap">
            <button
              className="px-4 py-2 rounded-full bg-gradient-to-r from-[var(--champagne-gold)] to-[var(--bright-gold)] text-white text-sm font-medium shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
              onClick={() => emitMoreDetails(v.name)}
            >
              More details
            </button>

            <button
              className="px-4 py-2 rounded-full border-2 border-[var(--champagne-gold)] text-[var(--deep-plum)] text-sm font-medium hover:bg-[var(--champagne-gold)] hover:text-white transition-all"
              onClick={() => emitReviews(v.name)}
            >
              Reviews
            </button>

            {v.contact && (
              <a 
                className="ml-auto px-4 py-2 rounded-full bg-[var(--accent-teal)] text-white text-sm font-medium hover:opacity-90 transition-opacity" 
                href={`tel:${v.contact}`}
              >
                Call Now
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-w-3xl w-full">
      <div className="relative flex flex-col gap-4">
        {messages.map((message, messageIndex) => {
          const isLastMessage = messageIndex === messages.length - 1;
          const text = messageToText(message);
          const hits = message.role === "assistant" ? extractVendorHitsFromText(text) : null;
          const humanText = message.role === "assistant" ? stripSentinelFromText(text) : text;

          // Build a shallow clone that sanitizes text parts (removes vendor sentinel) while preserving other part types
          const safeMessageForAssistant: UIMessage = (() => {
            if (message.role !== "assistant") return message;
            const clone: any = { ...message };
            // Preserve all non-text parts (reasoning, tool calls, etc.) and only sanitize text parts
            clone.parts = (message.parts || []).map((part: any) => {
              if (part.type === "text") {
                return { ...part, text: stripSentinelFromText(part.text || "") };
              }
              return part;
            });
            if (clone.content) clone.content = humanText;
            return clone;
          })();

          return (
            <div key={message.id} className="w-full">
              {message.role === "user" ? (
                <SafeUserMessage message={message} />
              ) : (
                <>
                  <SafeAssistantMessage
                    message={safeMessageForAssistant}
                    status={status}
                    isLastMessage={isLastMessage}
                    durations={durations}
                    onDurationChange={onDurationChange}
                  />

                  {/* if there are vendor hits, render cards */}
                  {hits && hits.length ? (
                    <div className="mt-3 grid gap-3">
                      {hits.map((h) => (
                        <VendorCard key={h.id ?? h.name ?? Math.random()} v={h as VendorHit} />
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
