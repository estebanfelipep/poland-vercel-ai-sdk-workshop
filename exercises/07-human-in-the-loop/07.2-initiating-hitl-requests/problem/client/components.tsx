import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { MyMessage } from '../api/chat.ts';

export const Wrapper = (props: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {props.children}
    </div>
  );
};

export const Message = ({
  role,
  parts,
}: {
  role: string;
  parts: MyMessage['parts'];
}) => (
  <div className="my-4">
    {parts.map((part) => {
      if (part.type === 'text') {
        return <ReactMarkdown>{part.text}</ReactMarkdown>;
      }

      // TODO: if the part is a data-action-start,
      // render a preview of the email that will be sent
      if (part.type === 'data-action-start') {
        return (
          <div key={part.id} className="mb-4">
            <h2 className="text-gray-300 text-sm mb-1">
              I'm requesting to send an email:
            </h2>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-3">
              <div className="mb-2">
                <span className="text-gray-400 text-xs">
                  To:
                </span>
                <span className="text-white text-sm ml-2">
                  {part.data.action.to}
                </span>
              </div>
              <div className="mb-2">
                <span className="text-gray-400 text-xs">
                  Subject:
                </span>
                <span className="text-white text-sm ml-2">
                  {part.data.action.subject}
                </span>
              </div>
              <div className="mb-2">
                <span className="text-gray-400 text-xs">
                  Content:
                </span>
                <div className="text-white text-sm mt-1 p-2 bg-gray-800 border-l-2 border-blue-500">
                  {part.data.action.content}
                </div>
              </div>
            </div>
          </div>
        );
      }

      return null;
    })}
  </div>
);

export const ChatInput = ({
  input,
  onChange,
  onSubmit,
  disabled,
}: {
  input: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
}) => (
  <form onSubmit={onSubmit}>
    <input
      className={`fixed bottom-0 w-full max-w-md p-2 mb-8 border-2 border-zinc-700 rounded shadow-xl bg-gray-800 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      value={input}
      autoComplete="off"
      placeholder="Say something..."
      onChange={onChange}
      disabled={disabled}
      autoFocus
    />
  </form>
);
