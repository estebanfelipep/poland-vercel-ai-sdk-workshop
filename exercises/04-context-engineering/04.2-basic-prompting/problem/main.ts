import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

const INPUT = `Do some research on induction hobs and how I can replace a 100cm wide AGA cooker with an induction range cooker. Which is the cheapest, which is the best?`;

// NOTE: A good output would be: "Induction hobs vs AGA cookers"

const result = await streamText({
  model: google('gemini-2.0-flash-lite'),
  // TODO: Rewrite this prompt using the Anthropic template from
  // the previous exercise.
  // You will NOT need all of the sections from the template.
  prompt: `
    You are a world class detective and copywriter, your task is to listen to conversations and post a conversation description on Twitter.
    You cannot reveal your identity as detective, you must act as a normal human being.

    <the-ask>
      Here is the last conversation you heard, generate a title
      ${INPUT}
    </the-ask>

    <output-format>
      Return only the title.
    </output-format>
  `,
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
