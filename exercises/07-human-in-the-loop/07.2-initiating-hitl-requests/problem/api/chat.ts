import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  hasToolCall,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai';
import z from 'zod';
import { sendEmail } from './email-service.ts';

const sendEmailSchema = z.object({
  to: z.string(),
  subject: z.string(),
  content: z.string(),
});

type sendEmailSchemaType = z.infer<typeof sendEmailSchema> & {
  id: string;
};

export type MyMessage = UIMessage<
  unknown,
  {
    // TODO: declare an action-start part that
    // contains the action that will be performed.
    'action-start': { action: sendEmailSchemaType };
  }
>;

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      const streamTextResponse = streamText({
        model: google('gemini-2.0-flash-001'),
        system: `
          You are a helpful assistant that can send emails.
          You will be given a diary of the conversation so far.
          The user's name is "John Doe".
        `,
        messages: convertToModelMessages(messages),
        tools: {
          sendEmail: {
            description: 'Send an email',
            inputSchema: sendEmailSchema,
            execute: async ({ to, subject, content }) => {
              // TODO: change this so that it sends a part
              // of data-action-start to the writer instead of
              // sending the email.

              writer.write({
                type: 'data-action-start',
                data: {
                  action: {
                    to,
                    subject,
                    content,
                    id: crypto.randomUUID(),
                  },
                },
              });

              console.log('ep:', 1);
              await sendEmail({ to, subject, content });
              console.log('ep:', 2);

              return 'Email sent';
            },
          },
        },
        // TODO: we now want a second stop condition - we
        // want to stop EITHER when the step count is 10,
        // OR when the agent has sent the sendEmail tool call.
        stopWhen: [stepCountIs(10), hasToolCall('sendEmail')],
      });

      writer.merge(streamTextResponse.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
