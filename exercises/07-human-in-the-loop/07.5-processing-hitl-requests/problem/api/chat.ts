import { google } from '@ai-sdk/google';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  hasToolCall,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai';
import z from 'zod';
import { sendEmail } from './email-service.ts';
import { findDecisionsToProcess } from './hitl-processor.ts';

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
    // TODO: declare an action-end part that contains
    // the output of the action. This should contain
    // the id and output of the action.
    'action-end': {
      actionId: string;
      output: {
        message: string;
      };
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

            // TODO: if the part is a data-action-end,
            // return a string that describes the output of
            // the action.
            if (part.type === 'data-action-end') {
              return `The action was performed: ${part.data.output.message}`;
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

  const mostRecentUserMessage = messages[messages.length - 1];

  // TODO: return a Response of status 400 if there
  // is no most recent user message.
  if (!mostRecentUserMessage) {
    return new Response('Messages array cannot be empty', {
      status: 400,
    });
  }

  if (mostRecentUserMessage.role !== 'user') {
    return new Response('Last message must be a user message', {
      status: 400,
    });
  }

  // NOTE: assistant messages are allowed to be undefined,
  // since at the very start of the conversation we'll only
  // have a user message.
  const mostRecentAssistantMessage = messages.findLast(
    (message) => message.role === 'assistant',
  );

  const hitlResult = findDecisionsToProcess({
    mostRecentUserMessage,
    mostRecentAssistantMessage,
  });

  // NOTE: if hitlResult returns a HITLError,
  // we should return a Response with the error message
  if ('status' in hitlResult) {
    return new Response(hitlResult.message, {
      status: hitlResult.status,
    });
  }

  console.dir(hitlResult, { depth: null });

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      const streamTextResponse = streamText({
        model: google('gemini-2.0-flash-001'),
        system: `
          You are a helpful assistant that can send emails.
          You will be given a diary of the conversation so far.
          The user's name is "John Doe".
        `,
        prompt: getDiary(messages),
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
