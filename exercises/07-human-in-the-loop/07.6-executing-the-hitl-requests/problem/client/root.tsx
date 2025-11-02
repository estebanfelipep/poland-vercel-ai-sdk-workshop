import { useChat } from '@ai-sdk/react';
import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatInput, Message, Wrapper } from './components.tsx';
import './tailwind.css';
import type { Action, MyMessage } from '../api/chat.ts';

const App = () => {
  const { messages, sendMessage } = useChat<MyMessage>({});
  console.log('ep: Messages', messages);

  const [input, setInput] = useState(
    `Send an email to team@aihero.dev saying what a fantastic AI workshop I'm currently attending. Thank them for the workshop.`,
  );

  const actionIdsWithDecisionsMade = useMemo(() => {
    const allMessageParts = messages.flatMap(
      (message) => message.parts,
    );

    const decisionsByActionId = new Set(
      allMessageParts
        .filter((part) => part.type === 'data-action-decision')
        .map((part) => part.data.actionId),
    );

    return decisionsByActionId;
  }, [messages]);

  const [actionGivingFeedbackOn, setActionGivingFeedbackOn] =
    useState<Action | null>(null);

  return (
    <Wrapper>
      {messages.map((message) => (
        <Message
          key={message.id}
          role={message.role}
          parts={message.parts}
          actionIdsWithDecisionsMade={actionIdsWithDecisionsMade}
          onActionRequest={(action, decision) => {
            if (decision === 'approve') {
              sendMessage({
                parts: [
                  {
                    type: 'data-action-decision',
                    data: {
                      actionId: action.id,
                      decision: {
                        type: 'approve',
                      },
                    },
                  },
                ],
              });
            } else {
              setInput('');
              setActionGivingFeedbackOn(action);
            }
          }}
        />
      ))}
      <ChatInput
        isGivingFeedback={!!actionGivingFeedbackOn}
        input={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={(e) => {
          e.preventDefault();
          if (actionGivingFeedbackOn) {
            sendMessage({
              parts: [
                {
                  type: 'data-action-decision',
                  data: {
                    actionId: actionGivingFeedbackOn.id,
                    decision: {
                      type: 'reject',
                      reason: input,
                    },
                  },
                },
              ],
            });

            setActionGivingFeedbackOn(null);
            setInput('');
            return;
          }
          sendMessage({
            text: input,
          });
          setInput('');
        }}
      />
    </Wrapper>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
