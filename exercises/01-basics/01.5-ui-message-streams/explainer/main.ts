import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

const model = google('gemini-2.0-flash');

const stream = streamText({
  model,
  prompt: 'Give me a sonnet about a cat called Steven.',
});

for await (const chunk of stream.toUIMessageStream()) {
  // And object will be logged to the console for each chunk
  console.log(1, chunk);
}

for await (const chunk of stream.textStream) {
  // Just the text will be logged to the console for each chunk
  console.log(2, chunk);
}
