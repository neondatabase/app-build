import { ChatAnthropic } from '@langchain/anthropic';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '../../../../agent';

export async function POST(request: NextRequest) {
  try {
    const agentModel = new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 8192,
    });

    // Create a basic agent without additional tools
    const agent = createReactAgent({
      llm: agentModel,
      tools: [], // No tools needed for simple Q&A
    });

    const { prompt } = await request.json();

    console.log({ prompt });

    const agentResponse = await agent.invoke(
      {
        messages: [new SystemMessage(SYSTEM_PROMPT), new HumanMessage(prompt)],
      },
      { configurable: { thread_id: 'api-' + Date.now() } }
    );

    const result =
      agentResponse.messages[agentResponse.messages.length - 1].content;

    return NextResponse.json({ result });
  } catch (error: Error | unknown) {
    return NextResponse.json({ error: (error as Error).message });
  }
}
