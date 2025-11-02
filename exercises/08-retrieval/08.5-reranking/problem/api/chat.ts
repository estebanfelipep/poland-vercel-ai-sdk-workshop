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

const RERANKER_SYSTEM_PROMPT = `You are a search result reranker. Your job is to analyze a list of documentation pages and return only the IDs of the most relevant pages for answering the user's question.

Given a list of documentation pages with their IDs, filenames, and content, you should:
1. Evaluate how relevant each page is to the user's question
2. Return only the IDs of the most relevant pages

You should be selective and only include pages that are genuinely helpful for answering the question. If a page is only tangentially related or not relevant, exclude its ID.

Return the IDs as a simple array of numbers.`;

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

      const searchResults = await searchTypeScriptDocs({
        keywordsForBM25: keywords.object.keywords,
        embeddingsQuery: keywords.object.searchQuery,
      });

      // TODO: Slice the search results to the top 30
      // TODO: Add an ID to each result (just a number: use the index of the array)
      const topSearchResultsWithId = searchResults
        .slice(0, 30)
        .map((result, index) => ({
          ...result,
          id: index,
        }));

      console.log(
        'ep: Before LLM - topSearchResults filename',
        topSearchResultsWithId.map((result) => result.filename),
      );

      const topSearchResultsAsText = topSearchResultsWithId
        .map((result) =>
          [
            `## ID: ${result.id}`,
            `### Title: ${result.filename}`,
            `<content>`,
            result.content,
            `</content>`,
          ].join('\n\n'),
        )
        .join('\n\n');

      // TODO: Filter down to only the most relevant search results
      // via a generateObject call
      // Use the RERANKER_SYSTEM_PROMPT to rerank the search results
      // Pass it the search results as text and the user's question
      // Return the IDs of the most relevant search results - NOT
      // all the content. No need to waste tokens returning all
      // the content too.
      const rerankedSearchResults = await generateObject({
        model: google('gemini-2.0-flash-001'),
        system: RERANKER_SYSTEM_PROMPT,
        schema: z.object({
          resultIds: z
            .array(z.number())
            .describe(
              'Array of IDs for the most relevant documentation pages',
            ),
        }),
        prompt: `
          Search query:
          ${keywords.object.searchQuery}
          
          Available documentation pages:
          ${topSearchResultsAsText}
          
          Return only the IDs of the most relevant pages for answering the user's question.
        `,
      });

      const topSearchResultsAsMap = new Map(
        topSearchResultsWithId.map((result) => [
          result.id,
          result,
        ]),
      );

      const topSearchResults =
        rerankedSearchResults.object.resultIds
          .map((id) => topSearchResultsAsMap.get(id))
          .filter((result) => result !== undefined);

      console.log(
        'ep: llm - topSearchResults | length',
        rerankedSearchResults.object.resultIds.length,
        topSearchResults.length,
      );

      console.log(
        'ep: final topSearchResults',
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
