"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
// Adjust this import if your project uses a different package name for the chat hook.
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Plus, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader, ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config";
import Image from "next/image";
import Link from "next/link";

import { getOrCreateSessionKey } from "@/lib/session-client";

const formSchema = z.object({
  message: z.string().min(1).max(2000),
});

const STORAGE_KEY = "chat-messages";

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});

  // Defensive localStorage read
  const safeReadStored = (): { messages: UIMessage[]; durations: Record<string, number> } => {
    try {
      if (typeof window === "undefined") return { messages: [], durations: {} };
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { messages: [], durations: {} };
      const parsed = JSON.parse(raw);
      return {
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        durations: parsed.durations || {},
      };
    } catch (err) {
      try {
        if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
      } catch {}
      return { messages: [], durations: {} };
    }
  };

  const stored = safeReadStored();
  const [initialMessages] = useState<UIMessage[]>(stored.messages || []);

  // Relaxed typing for useChat to avoid mismatches across SDK versions.
  const chatHook = useChat({
    messages: initialMessages,
  }) as {
    messages: UIMessage[];
    sendMessage: (...args: any[]) => Promise<any>;
    status: "ready" | "streaming" | "submitted" | "error";
    stop: () => void;
    setMessages: (m: UIMessage[]) => void;
  };

  const { messages, sendMessage, status, stop, setMessages } = chatHook;

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations || {});
    try {
      setMessages(stored.messages || []);
    } catch {
      // ignore if setMessages signature is stricter in this SDK version
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen to vendor card actions emitted from MessageWall and forward to sendMessage
  useEffect(() => {
    function handleMoreDetails(e: any) {
      const vendorName = e?.detail?.vendorName;
      if (!vendorName) return;
      try {
        sendMessage({
          text: `More details on ${vendorName}`,
          metadata: { sessionKey: getOrCreateSessionKey() },
        });
      } catch (err) {
        // best-effort; ignore errors here
      }
    }

    function handleReviews(e: any) {
      const vendorName = e?.detail?.vendorName;
      if (!vendorName) return;
      try {
        sendMessage({
          text: `Reviews for ${vendorName}`,
          metadata: { sessionKey: getOrCreateSessionKey() },
        });
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener("chat_action_more_details", handleMoreDetails);
    window.addEventListener("chat_action_reviews", handleReviews);

    return () => {
      window.removeEventListener("chat_action_more_details", handleMoreDetails);
      window.removeEventListener("chat_action_reviews", handleReviews);
    };
  }, [sendMessage]);

  // persist messages & durations defensively
  useEffect(() => {
    if (!isClient) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, durations }));
    } catch {
      // ignore write errors (private mode, quota)
    }
  }, [messages, durations, isClient]);

  // Show welcome message whenever the active message list is empty
  // (this makes the welcome show every time a NEW chat is created / cleared)
  useEffect(() => {
    if (!isClient) return;

    if (Array.isArray(messages) && messages.length === 0) {
      const welcomeMsg: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        parts: [{ type: "text", text: WELCOME_MESSAGE }],
      };
      try {
        setMessages([welcomeMsg]);
      } catch {
        // some SDK versions restrict setMessages shape — best-effort
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: [welcomeMsg], durations: {} }));
      } catch {}
    }
    // Only react to the live messages list and client-state
  }, [isClient, messages.length, setMessages]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  const clearChat = () => {
    try {
      setMessages([]);
    } catch {}
    setDurations({});
    try {
      if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    } catch {}
    toast.success("Chat cleared");
  };

  function onSubmit(data: z.infer<typeof formSchema>) {
    // Pass sessionKey inside metadata to align with sendMessage types
    // sendMessage typing is permissive above so this call should compile across SDK versions
    sendMessage({
      text: data.message,
      metadata: { sessionKey: getOrCreateSessionKey() },
    });
    form.reset();
  }

  return (
    <div className="flex h-screen justify-center items-center">
      <main className="w-full h-screen relative">
        {/* ===== Header (opaque by default) ===== */}
        <div className="fixed top-0 left-0 right-0 z-50 chat-header">
          <ChatHeader>
            <ChatHeaderBlock />
            <ChatHeaderBlock className="justify-center items-center gap-3">
              <div className="avatar-premium">
                <Avatar className="size-10">
                  <AvatarImage src="/logo.png" />
                  <AvatarFallback className="bg-gradient-to-br from-[var(--champagne-gold)] to-[var(--bright-gold)] text-white font-semibold">
                    V
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-col">
                <p className="tracking-tight font-semibold text-[var(--deep-plum)] text-base">
                  Chat with {AI_NAME}
                </p>
                <p className="text-xs text-[var(--rich-burgundy)] opacity-75">
                  Your Wedding Planning Assistant
                </p>
              </div>
            </ChatHeaderBlock>

            <ChatHeaderBlock className="justify-end">
              <button
                className="btn-outline-premium"
                onClick={clearChat}
                aria-label="New chat"
                title="Start new chat"
                type="button"
              >
                <Plus className="size-4" />
                {CLEAR_CHAT_TEXT}
              </button>
            </ChatHeaderBlock>
          </ChatHeader>
        </div>

        {/* ===== Messages Area (centered column) ===== */}
        <div
          className="h-screen overflow-y-auto px-4 sm:px-6 py-4"
          style={{
            paddingTop: "calc(var(--header-height) + 12px)",
            paddingBottom: "140px",
          }}
        >
          <div className="flex flex-col items-center">
            {/* Constrain chat column so messages sit centered on large screens */}
            <div className="w-full max-w-3xl mx-auto">
              <div className="chat-card">
                {isClient ? (
                  <>
                    <MessageWall
                      messages={messages}
                      status={status}
                      durations={durations}
                      onDurationChange={(key: string, duration: number) => {
                        setDurations((prev) => {
                          const updated = { ...prev, [key]: duration };
                          try {
                            if (typeof window !== "undefined") {
                              localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, durations: updated }));
                            }
                          } catch {}
                          return updated;
                        });
                      }}
                    />
                    {status === "submitted" && (
                      <div className="flex items-center gap-2 mt-4">
                        <Loader2 className="size-5 animate-spin text-[var(--champagne-gold)]" />
                        <span className="text-sm text-[var(--rich-burgundy)]">Thinking...</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-5 animate-spin text-[var(--champagne-gold)]" />
                    <span className="text-sm text-[var(--rich-burgundy)]">Loading...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== Premium Input Bar (fixed bottom) ===== */}
        <div className="fixed bottom-0 left-0 right-0 z-50 glass-footer pb-4 pt-4">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <Controller
                  name="message"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="sr-only">Message</FieldLabel>

                      {/* ---------------------------
                          INPUT ROW: button INSIDE pill
                          --------------------------- */}
                      <div className="relative flex items-center">
                        {/* The pill is the positioned container so the button is anchored inside it */}
                        <div className="input-premium w-full relative">
                          <Input
                            {...field}
                            placeholder="Ask about venues, vendors, or budget planning..."
                            className="h-14 pl-4 pr-6 w-full bg-transparent"
                            disabled={status === "streaming"}
                            aria-label="Message"
                          />

                          {(status === "ready" || status === "error") && (
                            <button
                              type="submit"
                              disabled={!field.value?.trim()}
                              className="btn-premium absolute"
                              style={{ right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 10 }}
                              aria-label="Send message"
                            >
                              <ArrowUp className="size-5" />
                            </button>
                          )}

                          {(status === "streaming" || status === "submitted") && (
                            <button
                              type="button"
                              className="btn-premium absolute"
                              style={{
                                right: 12,
                                top: "50%",
                                transform: "translateY(-50%)",
                                zIndex: 10,
                                background: "linear-gradient(135deg, #4B1633, #6B2D4A)",
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                stop();
                              }}
                              aria-label="Stop generation"
                            >
                              <Square className="size-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </Field>
                  )}
                />
              </FieldGroup>
            </form>
          </div>

          <div className="footer-premium mt-3">
            © {new Date().getFullYear()} {OWNER_NAME} •{" "}
            <Link href="/terms">Terms</Link>
            {" "}• Powered by Vivaah AI
          </div>
        </div>
      </main>
    </div>
  );
}
