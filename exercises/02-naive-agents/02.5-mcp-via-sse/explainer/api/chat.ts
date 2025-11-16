import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type ToolSet,
  type UIMessage,
} from 'ai';
// import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';
if (!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
  throw new Error('GITHUB_PERSONAL_ACCESS_TOKEN is not set');
}

// This exercise does not work.

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: UIMessage[] } = await req.json();
  const { messages } = body;

  // const mcpClient1 = await createMCPClient({
  //   transport: new StreamableHTTPClientTransport(
  //     new URL(
  //       'https://server.smithery.ai/@smithery-ai/github/mcp?api_key=1d8ab876-62c0-4ba2-acd9-738964a2715b&profile=grim-fowl-X9RCfL',
  //     ),
  //   ),
  // });

  const mcpClient = await createMCPClient({
    transport: {
      type: 'http',
      url: 'https://api.githubcopilot.com/mcp',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
      },
    },
  });
  const tools = await mcpClient.tools();

  const result = streamText({
    model: google('gemini-2.5-flash'),
    messages: convertToModelMessages(messages),
    system: `
      You are a helpful assistant that can use the GitHub API to interact with the user's GitHub account.
    `,

    // tools: (await mcpClient1.tools({
    //   schemas: 'automatic',
    // })) as any,

    tools: tools as ToolSet,
    stopWhen: [stepCountIs(10)],
  });

  return result.toUIMessageStreamResponse({
    onFinish: async () => {
      await mcpClient.close();
    },
  });
};
