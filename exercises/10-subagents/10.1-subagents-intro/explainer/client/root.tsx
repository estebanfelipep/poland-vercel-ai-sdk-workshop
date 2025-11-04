import { useChat } from '@ai-sdk/react';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatInput, Message, Wrapper } from './components.tsx';
import './tailwind.css';
import type { MyMessage } from '../api/chat.ts';
import { DefaultChatTransport } from 'ai';

export type Subagent =
  | 'todos-agent'
  | 'student-notes-manager'
  | 'song-finder-agent'
  | 'scheduler-agent';

const App = () => {
  const [subagent, setSubagent] =
    useState<Subagent>('todos-agent');

  // This gross code is due to this issue:
  // https://github.com/vercel/ai/issues/7819
  //
  // Hopefully I can remove it once it's fixed
  const bodyRef = useRef<{ subagent: Subagent }>({
    subagent,
  });
  useEffect(() => {
    bodyRef.current.subagent = subagent;
  }, [subagent]);

  const { messages, sendMessage } = useChat<MyMessage>({
    transport: new DefaultChatTransport({
      body: () => ({
        // subagent: bodyRef.current.subagent,
        subagent,
      }),
    }),
  });
  console.log('ep:', { subagent });
  const [input, setInput] = useState(
    `Find all of my lessons for tomorrow and pull up all of their notes.`,
  );

  console.log(messages);

  return (
    <Wrapper>
      {messages.map((message) => (
        <Message
          key={message.id}
          role={message.role}
          parts={message.parts}
        />
      ))}
      <ChatInput
        input={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage({
            text: input,
          });
          setInput('');
        }}
        subagent={subagent}
        setSubagent={setSubagent}
      />
    </Wrapper>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
