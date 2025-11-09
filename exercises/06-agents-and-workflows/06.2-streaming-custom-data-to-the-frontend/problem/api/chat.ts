import { google } from '@ai-sdk/google';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type StreamTextResult,
  type ToolSet,
  type UIMessage,
  type UIMessageStreamWriter,
} from 'ai';

type MyDataParts = {
  'slack-message': string;
  'slack-message-feedback': string;
  love: string;
};

// TODO: replace all instances of UIMessage with MyMessage
export type MyMessage = UIMessage<unknown, MyDataParts>;

const formatMessageHistory = (messages: UIMessage[]) => {
  return messages
    .map((message) => {
      return `${message.role}: ${message.parts
        .map((part) => {
          if (part.type === 'text') {
            return part.text;
          }

          return '';
        })
        .join('')}`;
    })
    .join('\n');
};

const WRITE_SLACK_MESSAGE_FIRST_DRAFT_SYSTEM = `You are writing a Slack message for a user based on the conversation history. Only return the Slack message, no other text.`;
const EVALUATE_SLACK_MESSAGE_SYSTEM = `You are evaluating the Slack message produced by the user.

  Evaluation criteria:
  - The Slack message should be written in a way that is easy to understand.
  - It should be appropriate for a professional Slack conversation.
  - Do not give any suggestions.
`;
const WRITE_SLACK_MESSAGE_FINAL_SYSTEM = `You are writing a Slack message based on the conversation history, a first draft, and some feedback given about that draft.

  Return only the final Slack message, no other text. In gangster style. Be short.
`;

const streamCustomDataPart = async ({
  writer,
  streamResult,
  dataPartType,
}: {
  writer: UIMessageStreamWriter<MyMessage>;
  streamResult: StreamTextResult<ToolSet, never>;
  dataPartType: keyof MyDataParts;
}) => {
  const partId = crypto.randomUUID();

  let content = '';

  for await (const part of streamResult.textStream) {
    content += part;

    writer.write({
      type: `data-${dataPartType}`,
      data: content,
      id: partId,
    });
  }

  const finalContent = content;

  return { finalContent };
};

export const POST = async (req: Request): Promise<Response> => {
  // TODO: change to MyMessage[]
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  // TODO - change to streamText and write to the stream as custom data parts
  const writeSlackResult = await streamText({
    model: google('gemini-2.0-flash-001'),
    system: WRITE_SLACK_MESSAGE_FIRST_DRAFT_SYSTEM,
    prompt: `
      Conversation history:
      ${formatMessageHistory(messages)}
    `,
  });

  // // TODO: - change to streamText and write to the stream as custom data parts
  const evaluateSlackResult = await streamText({
    model: google('gemini-2.0-flash-001'),
    system: EVALUATE_SLACK_MESSAGE_SYSTEM,
    prompt: `
      Conversation history:
      ${formatMessageHistory(messages)}

      Slack message:
      ${await writeSlackResult.text}
    `,
  });

  const stream = createUIMessageStream({
    generateId: () => 'love',
    execute: async ({ writer }) => {
      // Because we are merging other streams, we need to send the start event first.
      writer.write({
        type: 'start',
      });

      writer.write({
        type: 'data-slack-message',
        data: 'Starting Slack message generation...',
        id: crypto.randomUUID(),
      });

      const streamWriteSlack = await streamCustomDataPart({
        writer,
        streamResult: writeSlackResult,
        dataPartType: 'slack-message',
      });

      const streamEvaluateSlack = await streamCustomDataPart({
        writer,
        streamResult: evaluateSlackResult,
        dataPartType: 'slack-message-feedback',
      });

      const finalSlackAttempt = streamText({
        model: google('gemini-2.0-flash-lite'),
        system: WRITE_SLACK_MESSAGE_FINAL_SYSTEM,
        prompt: `
            say hello

            Conversation history:
            ${formatMessageHistory(messages)}

            First draft:
            ${streamWriteSlack.finalContent}

            Previous feedback:
            ${streamEvaluateSlack.finalContent}
            `,
      });

      // Manually sending text parts was the initial
      // workaround I tried when the merge was not working.

      // const textPartId = crypto.randomUUID();

      // writer.write({
      //   type: 'text-start',
      //   id: textPartId,
      // });

      // for await (const part of finalSlackAttempt.textStream) {
      //   writer.write({
      //     type: 'text-delta',
      //     delta: part,
      //     id: textPartId,
      //   });
      // }

      // writer.write({
      //   type: 'text-end',
      //   id: textPartId,
      // });

      // THIS DIDN'T AT THE BEGINNING
      // I was missing sending the start event at the beginning of the execute function
      // and also setting sendStart: false here (because we already sent it).
      writer.merge(
        finalSlackAttempt.toUIMessageStream({
          sendStart: false,
        }),
      );

      return;
    },
  });

  return createUIMessageStreamResponse({ stream });
};
