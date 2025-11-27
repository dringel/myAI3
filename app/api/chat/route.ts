
import { streamText, UIMessage, convertToModelMessages, stepCountIs, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { MODEL } from '@/config';
import { SYSTEM_PROMPT } from '@/prompts';
import { isContentFlagged } from '@/lib/moderation';
import { webSearch } from './tools/web-search';
import { vectorDatabaseSearch } from './tools/search-vector-database';

export const maxDuration = 30;
export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const latestUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop();

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

    const result = streamText({
        model: MODEL,
        system: SYSTEM_PROMPT,
        // tools: {
        // messages: convertToModelMessages(messages),
        //     webSearch,
        //     vectorDatabaseSearch,
        // },
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
