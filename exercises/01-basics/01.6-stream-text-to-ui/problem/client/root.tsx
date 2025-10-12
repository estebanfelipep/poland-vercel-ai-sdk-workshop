import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatInput, Message, Wrapper } from './components.tsx';
import { useChat } from '@ai-sdk/react';
import './tailwind.css';
import { DefaultChatTransport } from 'ai';

const App = () => {
  // TODO: use the useChat hook to get the messages and sendMessage function
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      body: {
        love: 123,
      },
    }),
  });

  console.log('ep: parts', messages[1]?.parts[1]);

  const [input, setInput] = useState(
    `What's the capital of France?`,
  );

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
          // TODO: send the message
          sendMessage({ text: input });

          setInput('');
        }}
      />
    </Wrapper>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
