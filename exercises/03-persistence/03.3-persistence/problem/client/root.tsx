import { useChat } from '@ai-sdk/react';
import {
  QueryClient,
  QueryClientProvider,
  useSuspenseQuery,
} from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useSearchParams } from 'react-router';
import type { DB } from '../api/persistence-layer.ts';
import { ChatInput, Message, Wrapper } from './components.tsx';
import './tailwind.css';

const App = () => {
  // const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const chatIdFromSearchParams = searchParams.get('chatId');
  console.log('ep:', { chatIdFromSearchParams });
  const { data } = useSuspenseQuery({
    queryKey: ['chat', chatIdFromSearchParams],
    queryFn: () => {
      console.log('ep:2', { chatIdFromSearchParams });
      if (!chatIdFromSearchParams) {
        return null;
      }

      return fetch(
        `/api/chat?chatId=${chatIdFromSearchParams}`,
      ).then((res): Promise<DB.Chat> => res.json());
    },
  });

  // TODO: pass the chatId to the useChat hook,
  // as well as any existing messages from the backend
  const { messages, sendMessage } = useChat({
    id: chatIdFromSearchParams || '',
    messages: data?.messages || [],
  });

  useEffect(() => {
    if (!chatIdFromSearchParams) {
      const newChatId = crypto.randomUUID();
      setSearchParams({ chatId: newChatId }, { replace: true });
    }
  }, [chatIdFromSearchParams, setSearchParams]);

  const [input, setInput] = useState(
    `Who's the best football player in the world? be short.`,
  );

  if (!chatIdFromSearchParams) return null;

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
      />
    </Wrapper>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <QueryClientProvider client={new QueryClient()}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>,
);
