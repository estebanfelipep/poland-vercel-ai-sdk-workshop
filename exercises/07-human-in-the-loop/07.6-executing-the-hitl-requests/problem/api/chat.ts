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

export type ActionOutput = {
  type: 'send-email';
  message: string;
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
    'action-end': {
      output: ActionOutput;
      // The original action ID that this output is for.
      actionId: string;
    };
  }
>;

type MyMessagePart = MyMessage['parts'][number];

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

            if (part.type === 'data-action-end') {
              if (part.data.output.type === 'send-email') {
                return `The action was performed: ${part.data.output.message}`;
              }

              return '';
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

  console.log('ep:', 'initial messages', messages.length);

  // console.dir(messages, { depth: null });

  const mostRecentUserMessage = messages[messages.length - 1];

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

  const mostRecentAssistantMessage = messages.findLast(
    (message) => message.role === 'assistant',
  );

  const hitlResult = findDecisionsToProcess({
    mostRecentUserMessage,
    mostRecentAssistantMessage,
  });

  if ('status' in hitlResult) {
    return new Response(hitlResult.message, {
      status: hitlResult.status,
    });
  }

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      // TODO: when we process the decisions, we'll
      // be modifying the messages to include the
      // data-action-end parts.
      // This means that we'll need to make a copy of
      // the messages array, and update it.
      const messagesAfterHitl: MyMessage[] = messages;

      for (const { action, decision } of hitlResult) {
        if (decision.type === 'approve') {
          // TODO: the user has approved the action, so
          // we should send the email!
          sendEmail({
            to: action.to,
            subject: action.subject,
            content: action.content,
          });

          console.log('ep:', 'Actual email sent');

          // TODO: we should also add a data-action-end
          // part to the messages array, and write it to
          // the frontend.
          //
          // NOTE: I've provided you with a MyMessagePart
          // above, which should prove useful.
          const messagePart: MyMessage['parts'][number] = {
            type: 'data-action-end',
            data: {
              actionId: action.id,
              output: {
                type: action.type,
                message: 'Email sent',
              },
            },
          };

          // Write the result of the action to the stream
          writer.write(messagePart);

          // Add the message part to the messages array
          messagesAfterHitl[
            messagesAfterHitl.length - 1
          ]!.parts.push(messagePart);
        } else {
          // TODO: the user has rejected the action, so
          // we should write a data-action-end part to
          // the messages array, and write it to the
          // frontend.
          const messagePart: MyMessagePart = {
            type: 'data-action-end',
            data: {
              actionId: action.id,
              output: {
                type: action.type,
                message: 'Email not sent: ' + decision.reason,
              },
            },
          };

          // Write the result of the action to the stream
          writer.write(messagePart);

          // Add the message part to the messages array
          messagesAfterHitl[
            messagesAfterHitl.length - 1
          ]!.parts.push(messagePart);
        }
      }

      const msgsDiary = getDiary(messagesAfterHitl);
      console.log('ep: getDiary', 'msgsDiary');

      const streamTextResponse = streamText({
        model: google('gemini-2.0-flash-001'),
        system: `
          You are a helpful assistant that can send emails.
          You will be given a diary of the conversation so far.
          The user's name is "John Doe".
        `,
        // TODO: instead of referring to the 'messages' (the ones
        // we got from the frontend), we'll need to reference
        // the 'messagesAfterHitl' array.
        // If we don't do this, our LLM won't see the outputs
        // of the actions that we've performed.
        prompt: msgsDiary,
        tools: {
          // This tool doesn't send an email directly.
          // Instead, it requests approval from the user
          // by sending a data-action-start part to the
          // frontend. Sending the email is handled by the
          // for loop above after we get the user's decision.
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

              console.log('ep:', 'Email approval request sent');

              return 'Email sent';
            },
          },
        },
        stopWhen: [stepCountIs(10), hasToolCall('sendEmail')],
      });

      writer.merge(streamTextResponse.toUIMessageStream());
    },
    // Setting this prop, makes the "messages" variable
    // in the onFinish callback include all the messages,
    // including the ones that were added during the stream.
    originalMessages: messages,
    onFinish: ({ messages, responseMessage }) => {
      // console.log('ep: responseMessage');
      // console.dir(responseMessage, { depth: null });

      console.log('ep: messages', messages.length);
      console.dir(messages, { depth: null });
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
