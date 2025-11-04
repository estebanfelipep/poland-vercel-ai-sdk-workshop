import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import z from 'zod';

const aiCompareTitles = async ({
  input,
  output,
  expected,
}: {
  input: string;
  output: string;
  expected: string;
}) => {
  const result = await generateObject({
    model: google('gemini-2.5-flash-lite'),
    schema: z.object({
      score: z
        .enum(['A', 'B', 'C', 'D'])
        .describe('Attribution score'),
      feedback: z
        .string()
        .max(500)
        .describe(
          'Short and concise explanation of the score given',
        ),
    }),
    system: `
    You are an expert evaluator, specialized in comparing generated titles for chat conversations.

    Reply with a score of A, B, C or D.

    A: The output title is significantly better than the expected title in expressing the essence of the conversation.
    B: The output title is slightly better than the expected title in expressing the essence of the conversation.
    C: The expected title is better than the output title in expressing the essence of the conversation.
    D: There is no relationship between the output title and the essence of the conversation.
    `,
    prompt: `
    You are evaluating the following titles for a chat conversation:
    Input message:
    ${input}

    Output title:
    ${output}

    Expected title:
    ${expected}
    `,
  });

  const scoreMap = {
    A: 1,
    B: 0.8,
    C: 0.6,
    D: 0,
  };

  return {
    score: scoreMap[result.object.score],
    metadata: result.object.feedback,
  };
};

export default aiCompareTitles;
