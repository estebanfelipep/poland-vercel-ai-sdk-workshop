import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { evalite } from 'evalite';
import { readFileSync } from 'fs';
import Papa from 'papaparse';
import path from 'path';
import aiCompareTitles from './comparison-evals.ts';

const csvFile = readFileSync(
  path.join(import.meta.dirname, '../../titles-dataset.csv'),
  'utf-8',
);

const data = Papa.parse<{ Input: string; Output: string }>(
  csvFile,
  {
    header: true,
    skipEmptyLines: true,
  },
);

const EVAL_DATA_SIZE = 5;

const dataForEvalite = data.data
  .slice(0, EVAL_DATA_SIZE)
  .map((row) => ({
    input: row.Input,
    expected: row.Output,
  }));

evalite('Chat Title Generation', {
  data: () => dataForEvalite,
  task: async (input) => {
    const result = await generateText({
      model: google('gemini-2.5-flash-lite'),
      system: `You are an expert assistant, specialized in generating descriptive titles for chat conversations.`,
      prompt: `
        <rules>
          - You can only generate one title
          - You must return the title, ONLY
          - Find the most concise title that captures the essence of the conversation.
          - Titles should be between 20 and 40 characters. Ideally around 30 characters.
          - Use no punctuation or emojis.
        </rules>

        This is the message, based on which you have to create the title:
        ${input}
      `,
    });

    return result.text;
  },
  columns: async ({ output, input, expected }) => {
    return [
      {
        label: 'Input',
        value: input,
      },
      {
        label: 'Output',
        value: output,
      },
      {
        label: 'Expected',
        value: expected,
      },
      {
        label: 'Output length',
        value: output.length,
      },
    ];
  },
  scorers: [
    {
      name: 'Output length score',
      scorer: async ({ output }) => {
        const idealLength = 30;

        const lengthDifference = Math.abs(
          output.length - idealLength,
        );

        const maxDifference = 10;
        const lowerBound = idealLength - maxDifference;
        const upperBound = idealLength + maxDifference;

        if (
          output.length < lowerBound ||
          output.length > upperBound
        ) {
          return 0;
        }

        const score = 1 - lengthDifference / maxDifference;

        return score;
      },
    },
    {
      name: 'Comparison score',
      scorer: async ({ input, output, expected = '' }) => {
        const similarity = await aiCompareTitles({
          input,
          output,
          expected,
        });
        return similarity;
      },
    },
  ],
});
