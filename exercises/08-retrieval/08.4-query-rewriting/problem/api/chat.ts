import { google } from '@ai-sdk/google';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  streamText,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import { searchTypeScriptDocs } from './search.ts';

export type MyMessage = UIMessage<unknown, {}>;

const formatMessageHistory = (messages: UIMessage[]) => {
  return messages
    .map((message) => {
      return `${message.role}: ${message.parts
        .map((part) => {
          if (part.type === 'text') {
            return part.text;
          }

          return '';
        })
        .join('')}`;
    })
    .join('\n');
};

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      const keywords = await generateObject({
        model: google('gemini-2.0-flash-001'),
        system: `You are a helpful TypeScript developer, able to search the TypeScript docs for information.
          Your job is to generate a list of keywords which will be used to search the TypeScript docs.
          You should also generate a search query which will be used to search the TypeScript docs. This will be used for semantic search, so can be more general.
        `,
        schema: z.object({
          keywords: z
            .array(z.string())
            .describe(
              'A list of keywords to search the TypeScript docs with. Use these for exact terminology.',
            ),
          searchQuery: z
            .string()
            .describe(
              'A search query which will be used to search the TypeScript docs. Use this for broader terms.',
            ),
        }),
        prompt: `
          Conversation history:
          ${formatMessageHistory(messages)}
        `,
      });

      console.dir(keywords.object, { depth: null });

      // TODO: Generate a search query based on the conversation history
      // This will be used for semantic search, which will be a big
      // improvement over passing the entire conversation history.
      const searchQuery = keywords.object.searchQuery;

      const searchResults = await searchTypeScriptDocs({
        keywordsForBM25: keywords.object.keywords,
        embeddingsQuery: searchQuery,
      });

      const topSearchResults = searchResults.slice(0, 5);

      console.log(
        'ep:',
        'final search ranking',
        topSearchResults.map((result) => result.filename),
      );

      const answer = streamText({
        model: google('gemini-2.0-flash-001'),
        system: `You are a helpful TypeScript documentation assistant that answers questions based on the TypeScript documentation.
          You should use the provided documentation snippets to answer questions accurately.
          ALWAYS cite sources using markdown formatting with the filename as the source.
          Be concise but thorough in your explanations.
        `,
        prompt: [
          '## Conversation History',
          formatMessageHistory(messages),
          '## TypeScript Documentation Snippets',
          ...topSearchResults.map((result, i) => {
            const filename =
              result.filename || `document-${i + 1}`;

            const content = result.content || '';

            return [
              `### 📄 Source ${i + 1}: [${filename}](#${filename.replace(/[^a-zA-Z0-9]/g, '-')})`,
              content,
              '---',
            ].join('\n\n');
          }),
          '## Instructions',
          "Based on the TypeScript documentation above, please answer the user's question. Always cite your sources using the filename in markdown format.",
        ].join('\n\n'),
      });

      writer.merge(answer.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
