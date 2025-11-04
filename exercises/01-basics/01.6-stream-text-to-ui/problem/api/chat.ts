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
  console.log('ep:', 'body');
  console.dir(body, { depth: null });

  // TODO: get the UIMessage[] from the body
  const messages: UIMessage[] = body.messages;
  console.log('ep:', 'messages');
  console.dir(messages, { depth: null });

  // TODO: convert the UIMessage[] to ModelMessage[]
  const modelMessages: ModelMessage[] =
    convertToModelMessages(messages);
  console.log('ep:', 'modelMessages');
  console.dir(modelMessages, { depth: null });

  // TODO: pass the modelMessages to streamText
  const streamTextResult = streamText({
    model: google('gemini-2.0-flash'),
    messages: modelMessages,
  });

  // TODO: create a UIMessageStream from the streamTextResult
  const stream = streamTextResult.toUIMessageStream();

  return createUIMessageStreamResponse({
    stream,
  });
};
