import { 
    streamText, 
    UIMessage, 
    convertToModelMessages, 
    stepCountIs, 
    createUIMessageStream, 
    createUIMessageStreamResponse,
    type Tool 
} from 'ai';

import { MODEL } from '@/config';
// 🔑 FIX: Import only the essential, known prompt parts (or assume they exist)
import { 
    IDENTITY_PROMPT, 
    TONE_STYLE_PROMPT,
    CITATIONS_PROMPT,
    TOOL_CALLING_PROMPT, // We will ensure this is defined in prompts.ts
    GUARDRAILS_PROMPT // We will ensure this is defined in prompts.ts
} from '@/prompts'; 

import { isContentFlagged } from '@/lib/moderation';
import { getCurrentRatesTool } from "./tools/get-current-rates"; // Your new Exa tool import
import { vectorDatabaseSearch } from './tools/search-vector-database'; // Keep RAG tool import

export const maxDuration = 30; 

// 🔑 FIX: Assemble the full system prompt string here from the component parts
const FULL_SYSTEM_PROMPT = `
${IDENTITY_PROMPT}
${TONE_STYLE_PROMPT}
${GUARDRAILS_PROMPT}
${CITATIONS_PROMPT}
${TOOL_CALLING_PROMPT}
`;

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const latestUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop();

    // --- Content Moderation Check (Keep Existing Logic) ---
    if (latestUserMessage) {
        const textParts = latestUserMessage.parts
            .filter(part => part.type === 'text')
            .map(part => 'text' in part ? part.text : '')
            .join('');

        if (textParts) {
            const moderationResult = await isContentFlagged(textParts);

            if (moderationResult.flagged) {
                const stream = createUIMessageStream({
                    execute({ writer }) {
                        const textId = 'moderation-denial-text';

                        writer.write({
                            type: 'start',
                        });

                        writer.write({
                            type: 'text-start',
                            id: textId,
                        });

                        writer.write({
                            type: 'text-delta',
                            id: textId,
                            delta: moderationResult.denialMessage || "Your message violates our guidelines. I can't answer that.",
                        });

                        writer.write({
                            type: 'text-end',
                            id: textId,
                        });

                        writer.write({
                            type: 'finish',
                        });
                    },
                });

                return createUIMessageStreamResponse({ stream });
            }
        }
    }

    // --- AI Response Generation with Tool Calling ---
    
    // Define the available tools (replacing the generic webSearch with your specific Exa tool)
    const availableTools: Record<string, Tool> = {
        getCurrentRatesTool, // Your new specialized Exa tool
        vectorDatabaseSearch, // Keep the RAG tool
    };

    const result = streamText({
        model: MODEL,
        system: FULL_SYSTEM_PROMPT, // 🔑 Use the assembled prompt here
        messages: convertToModelMessages(messages),
        tools: availableTools, 
        stopWhen: stepCountIs(10),
        providerOptions: {
            openai: {
                reasoningSummary: 'auto',
                reasoningEffort: 'low',
                parallelToolCalls: false,
            }
        }
    });

    return result.toUIMessageStreamResponse({
        sendReasoning: true,
    });
}
