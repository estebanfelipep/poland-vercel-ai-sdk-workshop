import type {
  Action,
  ActionDecision,
  MyMessage,
} from './chat.ts';

export type HITLError = {
  message: string;
  status: number;
};

export type HITLDecisionsToProcess = {
  action: Action;
  decision: ActionDecision;
};

export const findDecisionsToProcess = (opts: {
  mostRecentUserMessage: MyMessage;
  mostRecentAssistantMessage: MyMessage | undefined;
}): HITLError | HITLDecisionsToProcess[] => {
  const { mostRecentUserMessage, mostRecentAssistantMessage } =
    opts;

  // TODO: If there's no assistant message in the chat,
  // there's nothing to process and we can proceed with
  // the conversation.
  if (!mostRecentAssistantMessage) {
    return [];
  }

  // TODO: Get all the actions from the assistant message
  // and return them in an array.
  const actions = mostRecentAssistantMessage.parts
    .filter((part) => part.type === 'data-action-start')
    .map((part) => part.data.action);

  // TODO: Get all the decisions that the user has made
  // and return them in a map.
  const decisions = new Map(
    mostRecentUserMessage.parts
      .filter((part) => part.type === 'data-action-decision')
      .map((part) => [part.data.actionId, part.data.decision]),
  );

  const decisionsToProcess: HITLDecisionsToProcess[] = [];

  for (const action of actions) {
    const decision = decisions.get(action.id);

    if (!decision) {
      return {
        message: `No decision found for action ${action.id}`,
        status: 400,
      };
    }

    decisionsToProcess.push({
      action,
      decision,
    });
  }

  return decisionsToProcess;
};
