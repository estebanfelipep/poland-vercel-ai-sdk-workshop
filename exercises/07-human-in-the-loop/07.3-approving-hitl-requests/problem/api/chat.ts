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

export type Action = {
  id: string;
  type: 'send-email';
  content: string;
  to: string;
  subject: string;
};

export type ActionDecision =
  | {
      type: 'approve';
    }
  | {
      type: 'reject';
      reason: string;
    };

export type MyMessage = UIMessage<
  unknown,
  {
    'action-start': {
      action: Action;
    };
    'action-decision': {
      // The original action ID that this decision is for.
      actionId: string;
      decision: ActionDecision;
    };
  }
>;

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  // console.dir(messages[messages.length - 1], { depth: null });

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      const streamTextResponse = streamText({
        model: google('gemini-2.0-flash-001'),
        system: `
          You are a helpful assistant that can send emails.
          You will be given a diary of the conversation so far.
          The user's name is "John Doe".

           YOU MUST ALWAYS WAIT FOR THE USER TO APPROVE BEFORE SENDING AN EMAIL.
        `,
        messages: convertToModelMessages(messages),
        tools: {
          sendEmail: {
            description: 'Send an email',
            inputSchema: z.object({
              to: z.string(),
              subject: z.string(),
              content: z.string(),
            }),
            execute: ({ to, subject, content }) => {
              console.log('ep:', 'called sendEmail');

              return 'Email sent';
            },
          },
          askToSendEmail: {
            description: 'Asks if an email should be sent',
            inputSchema: z.object({
              to: z.string(),
              subject: z.string(),
              content: z.string(),
            }),
            execute: ({ to, subject, content }) => {
              writer.write({
                type: 'data-action-start',
                data: {
                  action: {
                    id: crypto.randomUUID(),
                    type: 'send-email',
                    to,
                    subject,
                    content,
                  },
                },
              });
              console.log('ep:', 'ASK EMAIL REQUEST');

              return 'Email sent';
            },
          },
        },
        stopWhen: [
          stepCountIs(10),
          hasToolCall('askToSendEmail'),
        ],
        onFinish: ({ response }) => {
          console.log(
            'ep: responseMessages',
            response.messages.length,
          );
          // console.dir(response.messages, { depth: null });
        },
      });

      writer.merge(streamTextResponse.toUIMessageStream());
    },
    originalMessages: messages,
    onFinish: ({ messages, responseMessage }) => {
      console.log('ep: responseMessage - final');
      // console.dir(responseMessage, { depth: null });

      console.log('ep: messages - final', messages.length);
      // console.dir(messages, { depth: null });
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
