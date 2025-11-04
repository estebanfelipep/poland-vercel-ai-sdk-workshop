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

const getDiary = (messages: MyMessage[]): string => {
  return messages
    .map((message): string => {
      return [
        message.role === 'user'
          ? '## User Message'
          : '## Assistant Message',
        message.parts
          .map((part): string => {
            if (part.type === 'text') {
              return part.text;
            }

            if (part.type === 'data-action-start') {
              if (part.data.action.type === 'send-email') {
                return [
                  'The assistant requested to send an email:',
                  `To: ${part.data.action.to}`,
                  `Subject: ${part.data.action.subject}`,
                  `Content: ${part.data.action.content}`,
                ].join('\n');
              }

              return '';
            }

            if (part.type === 'data-action-decision') {
              if (part.data.decision.type === 'approve') {
                return 'The user approved the action.';
              }

              return `The user rejected the action: ${part.data.decision.reason}`;
            }

            return '';
          })
          .join('\n\n'),
      ].join('\n\n');
    })
    .join('\n\n');
};

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  // console.dir(messages[messages.length - 1], { depth: null });

  const diaryMessages = getDiary(messages);
  console.log('ep: diaryMessages', diaryMessages);

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      const streamTextResponse = streamText({
        model: google('gemini-2.0-flash-001'),
        system: `
          You are a helpful assistant that can send emails.
          You will be given a diary of the conversation so far.
          The user's name is "John Doe".
        `,
        // TODO: change this to use the getDiary function
        // above. You'll need to use the 'prompt' property
        // instead of the 'messages' property.
        prompt: diaryMessages,
        tools: {
          sendEmail: {
            description: 'Send an email',
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

              return 'Email sent';
            },
          },
        },
        stopWhen: [stepCountIs(10), hasToolCall('sendEmail')],
      });

      writer.merge(streamTextResponse.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
