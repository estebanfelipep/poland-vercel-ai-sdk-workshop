import { google } from '@ai-sdk/google';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  streamText,
  type StreamTextResult,
  type ToolSet,
  type UIMessage,
  type UIMessageStreamWriter,
} from 'ai';

type MyDataParts = {
  'slack-message': string;
  'slack-message-feedback': string;
};

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

  Rules
  - Give specific feedback
  - Reply with the feedback only
  - Do not give any suggestions
`;
const WRITE_SLACK_MESSAGE_FINAL_SYSTEM = `You are writing a Slack message based on the conversation history, a first draft, and some feedback given about that draft.

  Return only the final Slack message, no other text.
`;

const STEP_LIMIT = 2;

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

    await new Promise((resolve) => setTimeout(resolve, 1000));

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
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;
  console.log('ep:', { messages });

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      let step = 0; // TODO: keep track of the step we're on
      let mostRecentDraft = ''; // TODO: keep track of the most recent draft
      let mostRecentFeedback = ''; // TODO: keep track of the most recent feedback

      console.log('ep:', 1);
      // TODO: create a loop which:
      // 1. Writes a Slack message
      // 2. Evaluates the Slack message
      // 3. Saves the feedback in the variables above
      // 4. Increments the step variable
      while (step < STEP_LIMIT) {
        const loopMessageResult = streamText({
          model: google('gemini-2.0-flash'),
          system: WRITE_SLACK_MESSAGE_FINAL_SYSTEM,
          prompt: `
            This is the conversation history: ${formatMessageHistory(messages)}

            This is the draft message (if any): ${mostRecentDraft}

            And this is the feedback (if any): ${mostRecentFeedback}
          `,
        });

        writer.write({
          type: 'data-slack-message',
          data: `Draft number ${step + 1} created.`,
          id: crypto.randomUUID(),
        });

        const { finalContent: slackMessage } =
          await streamCustomDataPart({
            writer,
            dataPartType: 'slack-message',
            streamResult: loopMessageResult,
          });

        mostRecentDraft = slackMessage;

        const evaluateMessageResult = streamText({
          model: google('gemini-2.0-flash-lite'),
          system: EVALUATE_SLACK_MESSAGE_SYSTEM,
          prompt: `
            This is the conversation history: ${formatMessageHistory(messages)}

            And this is the first draft message: ${mostRecentDraft}
          `,
        });

        writer.write({
          type: 'data-slack-message-feedback',
          data: `Feedback number ${step + 1} created.`,
          id: crypto.randomUUID(),
        });

        const { finalContent: feedbackMessage } =
          await streamCustomDataPart({
            writer,
            dataPartType: 'slack-message-feedback',
            streamResult: evaluateMessageResult,
          });

        mostRecentFeedback = feedbackMessage;

        step++;
      }
      console.log('ep:', 3);

      const finalMessageResult = streamText({
        model: google('gemini-2.0-flash'),
        system: WRITE_SLACK_MESSAGE_FINAL_SYSTEM,
        prompt: `
            This is the conversation history: ${formatMessageHistory(messages)}

            This is the draft message (if any): ${mostRecentDraft}

            And this is the feedback (if any): ${mostRecentFeedback}
          `,
      });

      const textPartId = crypto.randomUUID();
      writer.write({
        type: 'text-start',
        id: textPartId,
      });

      for await (const part of finalMessageResult.textStream) {
        await new Promise((resolve) =>
          setTimeout(resolve, 2000),
        );

        writer.write({
          type: 'text-delta',
          delta: part,
          id: textPartId,
        });
      }

      writer.write({
        type: 'text-end',
        id: textPartId,
      });
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
