import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  generateObject,
  streamText,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import {
  loadMemories,
  saveMemories,
  type DB,
} from './memory-persistence.ts';

export type MyMessage = UIMessage<unknown, {}>;

const formatMessageHistory = (messages: UIMessage[]) => {
  return messages
    .map((message) => {
      return `${message.role}: ${partsToText(message.parts)}`;
    })
    .join('\n');
};

const partsToText = (parts: UIMessage['parts']) => {
  return parts
    .map((part) => {
      if (part.type === 'text') {
        return part.text;
      }

      return '';
    })
    .join('');
};

const formatMemory = (memory: DB.MemoryItem) => {
  return [
    `Memory: ${memory.memory}`,
    `Created At: ${memory.createdAt}`,
  ].join('\n');
};

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  // TODO: Use the loadMemories function to load the memories from the database
  const memories = loadMemories();
  console.log('ep:memories before llm', memories);

  // TODO: Format the memories to display in the UI using the formatMemory function
  const memoriesText = memories.map(formatMemory).join('\n\n');
  console.log('ep:memoriesText before llm', memoriesText);

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      const result = streamText({
        model: google('gemini-2.0-flash-lite'),
        system: `You are a helpful assistant that can answer questions and help with tasks.

        The date is ${new Date().toISOString().split('T')[0]}.

        You have access to the following memories:

        <memories>
        ${memoriesText}
        </memories>
        `,
        messages: convertToModelMessages(messages),
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async (response) => {
      const allMessages = [...messages, ...response.messages];

      // TODO: Generate the memories using the generateObject function
      // Pass it the entire message history and the existing memories
      // Write a system prompt that tells the LLM to only focus on permanent memories
      // and not temporary or situational information
      const memoriesResult = await generateObject({
        model: google('gemini-2.0-flash-lite'),
        schema: z.object({
          memories: z.array(z.string()),
        }),
        system: `You are a memory extraction agent. Your task is to analyze the conversation history and extract permanent memories about the user.
    
            PERMANENT MEMORIES are facts about the user that:
            - Are unlikely to change over time (preferences, traits, characteristics)
            - Will remain relevant for weeks, months, or years
            - Include personal details, preferences, habits, or important information shared
            - Are NOT temporary or situational information
    
            EXAMPLES OF PERMANENT MEMORIES:
            - "User prefers dark mode interfaces"
            - "User works as a software engineer"
            - "User has a dog named Max"
            - "User is learning TypeScript"
            - "User prefers concise explanations"
            - "User lives in San Francisco"
    
            EXAMPLES OF WHAT NOT TO MEMORIZE:
            - "User asked about weather today" (temporary)
            - "User is currently debugging code" (situational)
            - "User said hello" (trivial interaction)
    
            Extract any new permanent memories from this conversation. Return an array of memory strings that should be added to the user's permanent memory. Each memory should be a concise, factual statement about the user.
    
            If no new permanent memories are found, return an empty array.`,
        prompt: `
            CONVERSATION HISTORY:
            ${formatMessageHistory(allMessages)}
    
            EXISTING MEMORIES:
            ${memoriesText}
            `,
      });
      const newMemories = memoriesResult.object.memories;
      console.log('ep:newMemories before save', newMemories);

      // TODO: Save the new memories to the database using the saveMemories function
      saveMemories(
        newMemories.map((memory) => ({
          id: generateId(),
          memory,
          createdAt: new Date().toISOString(),
        })),
      );
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
