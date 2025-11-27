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
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Eraser, Loader2, Plus, PlusIcon, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader } from "@/app/parts/chat-header";
import { ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config";
import Image from "next/image";
import Link from "next/link";

const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});

const STORAGE_KEY = 'chat-messages';

// Collection of Inspiring & Maharashtrian Trek Quotes
const TREK_QUOTES = [
  { text: "Sahyadri is not just a mountain range, it is a glorious history waiting to be explored.", author: "Sahyadri Spirit" },
  { text: "Jithe Shivrayanche pay lagle, ti mati amhala pavitra aahe.\n(Where Chhatrapati Shivaji Maharaj stepped, that soil is sacred.)", author: "Fort Lover" },
  { text: "Har Har Mahadev! The climb is tough, but the view from the top is worth it.", author: "Trek Mantra" },
  { text: "Garva ahe mala mi Marathi aslyacha.\n(Proud to be Maharashtrian, Proud to contain the Sahyadris.)", author: "Marathi Pride" },
  { text: "The forts of Maharashtra are not just stones; they are living stories of valor and sacrifice.", author: "History of Marathas" },
  { text: "Leave the road, take the trails to the Gad-Kille (Forts).", author: "Pythagoras (Adapted)" },
];

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

const loadMessagesFromStorage = (): { messages: UIMessage[]; durations: Record<string, number> } => {
  if (typeof window === 'undefined') return { messages: [], durations: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };

    const parsed = JSON.parse(stored);
    return {
      messages: parsed.messages || [],
      durations: parsed.durations || {},
    };
  } catch (error) {
    console.error('Failed to load messages from localStorage:', error);
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (messages: UIMessage[], durations: Record<string, number>) => {
  if (typeof window === 'undefined') return;
  try {
    const data: StorageData = { messages, durations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save messages to localStorage:', error);
  }
};

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeMessageShownRef = useRef<boolean>(false);

  const stored = typeof window !== 'undefined' ? loadMessagesFromStorage() : { messages: [], durations: {} };
  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    setMessages(stored.messages);
  }, []);

  useEffect(() => {
    if (isClient) {
      saveMessagesToStorage(messages, durations);
    }
  }, [durations, messages, isClient]);

  const handleDurationChange = (key: string, duration: number) => {
    setDurations((prevDurations) => {
      const newDurations = { ...prevDurations };
      newDurations[key] = duration;
      return newDurations;
    });
  };

  useEffect(() => {
    // Only show welcome message if chat is empty
    if (isClient && initialMessages.length === 0 && !welcomeMessageShownRef.current) {
      // Select a random quote
      const randomQuote = TREK_QUOTES[Math.floor(Math.random() * TREK_QUOTES.length)];
      
      const welcomeMessage: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            // Big Bold Header with Saffron Flag for Maharashtrian Feel
            // Added explicit styling marks for the renderer to pick up if customized, 
            // but standard markdown relies on # for size.
            // Using a blockquote > for the quote to make it distinct.
            text: `# Jay Shivray! 🚩\n\n> ### *"${randomQuote.text}"*\n> \n> — **${randomQuote.author}**\n\n---\n**${WELCOME_MESSAGE}**`,
          },
        ],
      };
      setMessages([welcomeMessage]);
      saveMessagesToStorage([welcomeMessage], {});
      welcomeMessageShownRef.current = true;
    }
  }, [isClient, initialMessages.length, setMessages]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    sendMessage({ text: data.message });
    form.reset();
  }

  function clearChat() {
    const newMessages: UIMessage[] = [];
    const newDurations = {};
    setMessages(newMessages);
    setDurations(newDurations);
    saveMessagesToStorage(newMessages, newDurations);
    
    // Reset ref so welcome message can show again on reload if desired, 
    // though typically clear chat leaves it empty until user types.
    // If you want the welcome message to reappear immediately after clear, uncomment below:
    // window.location.reload(); 
    
    toast.success("Chat cleared");
  }

  return (
    <div className="flex h-screen items-center justify-center font-sans text-stone-900 dark:text-stone-100">
      <main className="w-full h-screen relative">
        {/* Background Image Layer */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <img
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=3540&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Mountain Trek Background"
            // Increased opacity for visibility, adjusted for readability
            className="absolute inset-0 w-full h-full object-cover opacity-30 dark:opacity-20 grayscale-[10%]"
          />
          {/* Subtle overlay to ensure text remains readable over the mountains */}
          <div className="absolute inset-0 bg-stone-50/40 dark:bg-black/40 backdrop-blur-[1px]"></div>
        </div>

        {/* LEFT STATIC SIDE PANEL (Visible on large screens) */}
        <div className="fixed left-8 top-28 bottom-28 w-[300px] hidden xl:flex flex-col justify-between z-0 pointer-events-none select-none">
           {/* News / Updates Section */}
           <div className="space-y-4 p-6 bg-stone-100/30 dark:bg-black/30 backdrop-blur-sm rounded-2xl border border-stone-200/20 dark:border-stone-800/20">
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider border-b-2 border-emerald-600/50 pb-2 mb-3 flex items-center gap-2">
                <span className="text-2xl">📢</span> Trek News
              </h2>
              <div className="space-y-4">
                  <div className="bg-white/40 dark:bg-black/40 p-3 rounded-lg">
                    <h3 className="font-bold text-emerald-800 dark:text-emerald-400 text-sm">Fireflies Festival Soon!</h3>
                    <p className="text-xs text-stone-700 dark:text-stone-300 mt-1">
                      Pre-monsoon (May-June) is the best time to witness fireflies at Rajmachi, Bhandardara, and Prabalmachi.
                    </p>
                  </div>
                  <div className="bg-white/40 dark:bg-black/40 p-3 rounded-lg">
                    <h3 className="font-bold text-red-800 dark:text-red-400 text-sm">Monsoon Alert</h3>
                    <p className="text-xs text-stone-700 dark:text-stone-300 mt-1">
                      Heavy rains expected in Sahyadris. Avoid waterfall rappelling without expert guides.
                    </p>
                  </div>
                   <div className="bg-white/40 dark:bg-black/40 p-3 rounded-lg">
                    <h3 className="font-bold text-stone-800 dark:text-stone-200 text-sm">Harihar Fort</h3>
                    <p className="text-xs text-stone-700 dark:text-stone-300 mt-1">
                      Crowds are high on weekends. Plan a weekday trek for a safer climb on the steep steps.
                    </p>
                  </div>
              </div>
           </div>
        </div>

        {/* RIGHT STATIC SIDE PANEL (Visible on large screens) */}
        <div className="fixed right-8 top-28 bottom-28 w-[300px] hidden xl:flex flex-col justify-between z-0 pointer-events-none select-none text-right">
            {/* History / Info Section */}
            <div className="space-y-4 p-6 bg-stone-100/30 dark:bg-black/30 backdrop-blur-sm rounded-2xl border border-stone-200/20 dark:border-stone-800/20">
               <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider border-b-2 border-emerald-600/50 pb-2 mb-3 flex items-center justify-end gap-2">
                Did You Know? <span className="text-2xl">🛡️</span>
              </h2>
              <div className="space-y-4">
                  <div className="bg-white/40 dark:bg-black/40 p-3 rounded-lg text-right">
                    <h3 className="font-bold text-stone-800 dark:text-stone-200 text-sm">Capital of Swarajya</h3>
                    <p className="text-xs text-stone-700 dark:text-stone-300 mt-1">
                      Raigad Fort was chosen by Shivaji Maharaj as the capital of the Maratha Empire in 1674.
                    </p>
                  </div>
                  <div className="bg-white/40 dark:bg-black/40 p-3 rounded-lg text-right">
                    <h3 className="font-bold text-stone-800 dark:text-stone-200 text-sm">Highest Peak</h3>
                    <p className="text-xs text-stone-700 dark:text-stone-300 mt-1">
                      Kalsubai (1,646m) is the 'Everest of Maharashtra'. The view from the top is breathtaking!
                    </p>
                  </div>
                   <div className="bg-white/40 dark:bg-black/40 p-3 rounded-lg text-right">
                    <h3 className="font-bold text-stone-800 dark:text-stone-200 text-sm">Sea Forts</h3>
                    <p className="text-xs text-stone-700 dark:text-stone-300 mt-1">
                      Murud Janjira is one of the only invincible marine forts, never conquered by the British, Portuguese, or Siddis.
                    </p>
                  </div>
              </div>
           </div>
           
           <div className="mt-auto">
             <div className="text-stone-400 dark:text-stone-600 text-[10px] font-mono tracking-tighter opacity-50">
               COORD: 19.0760° N, 72.8777° E
             </div>
           </div>
        </div>

        <div className="fixed top-0 left-0 right-0 z-50 bg-linear-to-b from-background via-background/50 to-transparent overflow-visible pb-16">
          <div className="relative overflow-visible">
            <ChatHeader>
              <ChatHeaderBlock />
              <ChatHeaderBlock className="justify-center items-center">
                <Avatar
                  className="size-8 ring-1 ring-primary"
                >
                  <AvatarImage src="/logo.png" />
                  <AvatarFallback>
                    <Image src="/logo.png" alt="Logo" width={36} height={36} />
                  </AvatarFallback>
                </Avatar>
                <p className="tracking-tight font-semibold text-stone-800 dark:text-stone-100">
  Chat Seamlessly with <span className="opacity-80">{AI_NAME}</span>
</p>
                {/* <p className="tracking-tight font-semibold text-stone-800 dark:text-stone-100">Chat with {AI_NAME}</p> */}
              </ChatHeaderBlock>
              <ChatHeaderBlock className="justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer bg-white/50 backdrop-blur-md border-stone-200 dark:bg-black/50 dark:border-stone-800"
                  onClick={clearChat}
                >
                  <Plus className="size-4" />
                  {CLEAR_CHAT_TEXT}
                </Button>
              </ChatHeaderBlock>
            </ChatHeader>
          </div>
        </div>
        <div className="h-screen overflow-y-auto px-5 py-4 w-full pt-[88px] pb-[150px] relative z-10">
          <div className="flex flex-col items-center justify-end min-h-full">
            {isClient ? (
              <>
                <MessageWall messages={messages} status={status} durations={durations} onDurationChange={handleDurationChange} />
                {status === "submitted" && (
                  <div className="flex justify-start max-w-3xl w-full">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center max-w-2xl w-full">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-linear-to-t from-background via-background/50 to-transparent overflow-visible pt-13">
          <div className="w-full px-5 pt-5 pb-1 items-center flex justify-center relative overflow-visible">
            <div className="message-fade-overlay" />
            <div className="max-w-3xl w-full">
              <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="chat-form-message" className="sr-only">
                          Message
                        </FieldLabel>
                        <div className="relative h-13">
                          <Input
                            {...field}
                            id="chat-form-message"
                            className="h-15 pr-15 pl-5 bg-stone-100/90 dark:bg-stone-900/90 backdrop-blur-md rounded-[20px] border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-500 shadow-lg"
                            placeholder="Type your message here..."
                            disabled={status === "streaming"}
                            aria-invalid={fieldState.invalid}
                            autoComplete="off"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                form.handleSubmit(onSubmit)();
                              }
                            }}
                          />
                          {(status == "ready" || status == "error") && (
                            <Button
                              className="absolute right-3 top-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                              type="submit"
                              disabled={!field.value.trim()}
                              size="icon"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          )}
                          {(status == "streaming" || status == "submitted") && (
                            <Button
                              className="absolute right-2 top-2 rounded-full bg-stone-200 dark:bg-stone-800"
                              size="icon"
                              onClick={() => {
                                stop();
                              }}
                            >
                              <Square className="size-4" />
                            </Button>
                          )}
                        </div>
                      </Field>
                    )}
                  />
                </FieldGroup>
              </form>
            </div>
          </div>
          <div className="w-full px-5 py-3 items-center flex justify-center text-xs text-stone-600 dark:text-stone-400 font-medium">
            © {new Date().getFullYear()} {OWNER_NAME}&nbsp;<Link href="/terms" className="underline hover:text-emerald-600">Terms of Use</Link>&nbsp;Powered by&nbsp;<Link href="https://ringel.ai/" className="underline hover:text-emerald-600">Ringel.AI</Link>
          </div>
        </div>
      </main>
    </div >
  );
}
