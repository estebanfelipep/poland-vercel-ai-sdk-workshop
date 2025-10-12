import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  type ModelMessage,
  type UIMessage,
} from 'ai';

export const POST = async (req: Request): Promise<Response> => {
  const body = await req.json();

  // TODO: get the UIMessage[] from the body
  const messages: UIMessage[] = body.messages;
  console.log('ep:', 'messages');
  console.dir(messages, { depth: null });

  // TODO: convert the UIMessage[] to ModelMessage[]
  const modelMessages: ModelMessage[] =
    convertToModelMessages(messages);
  console.log('ep:', 'modelMessages');
  console.dir(modelMessages, { depth: null });

  const streamTextResult = streamText({
    model: google('gemini-2.0-flash'),
    messages: modelMessages,
    system:
      'You are a helpful assistant that accurately describes images using bullet points.',
  });

  const stream = streamTextResult.toUIMessageStream();

  return createUIMessageStreamResponse({
    stream,
  });
};
