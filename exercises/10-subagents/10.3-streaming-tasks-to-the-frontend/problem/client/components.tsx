import React, { type ReactNode, useState } from 'react';
import type { MyMessage } from '../api/chat.ts';
import ReactMarkdown from 'react-markdown';

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
  <div className="my-4 space-y-2">
    <div className="text-sm text-gray-300">
      {role === 'user' ? 'User: ' : 'AI: '}
    </div>
    {parts.map((part) => {
      if (part.type === 'text') {
        return (
          <div className="text-gray-100 prose prose-invert">
            <ReactMarkdown>{part.text}</ReactMarkdown>
          </div>
        );
      }

      // TODO: Render the task item by using the TaskItem component
      // below. Feel free to adjust it to your visual style!
      if (part.type === 'data-task') {
        return <TaskItem key={part.id} task={part.data} />;
      }
    })}
  </div>
);

const TaskItem = ({
  task,
}: {
  task: {
    id: string;
    subagent: string;
    task: string;
    output: string;
  };
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCompleted = !!task.output;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-2">
      <div className="flex items-start space-x-2">
        <div className="flex-shrink-0 mt-0.5">
          {isCompleted ? (
            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <svg
                className="w-2.5 h-2.5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          ) : (
            <div className="w-4 h-4 border-2 border-gray-500 rounded-full"></div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3
                className={`text-xs font-medium ${isCompleted ? 'text-green-400' : 'text-gray-300'}`}
              >
                {task.subagent}
              </h3>
              <p
                className={`text-xs mt-0.5 ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-200'}`}
              >
                {task.task}
              </p>
            </div>

            {isCompleted && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="ml-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {isExpanded ? 'Hide details' : 'See details'}
              </button>
            )}
          </div>

          {isCompleted && isExpanded && (
            <div className="mt-2 p-2 bg-gray-700 rounded border-l-4 border-green-500">
              <h4 className="text-xs font-medium text-green-400 mb-1">
                Output:
              </h4>
              <div className="text-xs text-gray-300 prose prose-invert prose-xs max-w-none">
                <ReactMarkdown>{task.output}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
      placeholder={
        disabled
          ? 'Please handle tool calls first...'
          : 'Say something...'
      }
      onChange={onChange}
      disabled={disabled}
      autoFocus
    />
  </form>
);
