import { ChatAnthropic } from '@langchain/anthropic';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@neondatabase/api-client';
import {
  HONO_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
} from '../../../../lib/prompt-api-prompts';
import fs from 'fs';
import { execSync } from 'child_process';
import toml from '@iarna/toml';
import { neon } from '@neondatabase/serverless';

async function getDatabaseSchema(databaseConnectionString: string) {
  const sql = neon(databaseConnectionString);
  const result = await sql(`SELECT 
    t.table_schema,
    t.table_name,
    c.column_name,
    c.data_type,
    c.column_default,
    c.is_nullable,
    c.character_maximum_length,
    -- Primary Key information
    CASE 
        WHEN cons.constraint_type = 'PRIMARY KEY' THEN 'YES'
        ELSE 'NO'
    END as is_primary_key,
    -- Foreign Key information
    CASE 
        WHEN cons.constraint_type = 'FOREIGN KEY' THEN 
            'References ' || kcu2.table_name || '(' || kcu2.column_name || ')'
        ELSE NULL
    END as foreign_key_details
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
    ON t.table_schema = c.table_schema 
    AND t.table_name = c.table_name
LEFT JOIN information_schema.key_column_usage kcu 
    ON c.column_name = kcu.column_name 
    AND c.table_name = kcu.table_name 
    AND c.table_schema = kcu.table_schema
LEFT JOIN information_schema.table_constraints cons 
    ON kcu.constraint_name = cons.constraint_name 
    AND kcu.table_name = cons.table_name 
    AND kcu.table_schema = cons.table_schema
LEFT JOIN information_schema.referential_constraints rc 
    ON cons.constraint_name = rc.constraint_name
LEFT JOIN information_schema.key_column_usage kcu2 
    ON rc.unique_constraint_name = kcu2.constraint_name
WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY 
    t.table_schema,
    t.table_name,
    c.column_name;
`);

  return result;
}

// how to include files in the server bundle: https://github.com/vercel/next.js/discussions/70125

export async function POST(request: NextRequest) {
  try {
    const { prompt, connectionString } = await request.json();

    console.log(prompt, connectionString);

    if (!prompt || !connectionString) {
      return NextResponse.json(
        {
          error: 'Invalid request, required parameters missing',
        },
        { status: 400 }
      );
    }

    const dbSchema = await getDatabaseSchema(connectionString);

    const agentModel = new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 8192,
      temperature: 0,
    });

    // Create a basic agent without additional tools
    const agent = createReactAgent({
      llm: agentModel,
      tools: [], // No tools needed for simple Q&A
    });

    const agentResponse = await agent.invoke(
      {
        messages: [
          new SystemMessage(HONO_SYSTEM_PROMPT(dbSchema.toString())),
          new HumanMessage(prompt),
        ],
      },
      { configurable: { thread_id: 'api-' + Date.now() } }
    );

    const result =
      agentResponse.messages[agentResponse.messages.length - 1].content;

    //parse data inside <code> tags
    const code = result.match(/<code>(.*?)<\/code>/s)?.[1];
    // This will match each fetch implementation with its route attribute
    const fetchImplementationPattern =
      /<fetch_implementation route="([^"]+)">(.*?)<\/fetch_implementation>/gs;
    const fetchImplementations: { [route: string]: string } = {};
    const matches = [...result.matchAll(fetchImplementationPattern)];
    matches.forEach((match) => {
      const [, route, content] = match;
      fetchImplementations[route] = content.trim();
    });
    // parse data inside <rejection> tags
    const rejection = result.match(/<rejection>(.*?)<\/rejection>/s)?.[1];
    const chainOfThought = result.match(
      /<chain_of_thought>(.*?)<\/chain_of_thought>/s
    )?.[1];

    if (rejection) {
      return NextResponse.json({
        result: {
          rejection: rejection,
        },
      });
    }

    // replace the my-hono-app index.ts file with the code content
    fs.writeFileSync('my-hono-app/src/index.ts', code);

    // Read and parse the wrangler.toml file
    const wranglerContent = fs.readFileSync(
      'my-hono-app/wrangler.toml',
      'utf-8'
    );

    // Update the DATABASE_URL
    const wranglerConfig = toml.parse(wranglerContent);
    // @ts-expect-error wrangler.toml is not typed
    wranglerConfig.vars.DATABASE_URL = connectionString;

    // Write the updated config back to wrangler.toml
    fs.writeFileSync(
      'my-hono-app/wrangler.toml',
      toml.stringify(wranglerConfig)
    );

    // deploy to worker by executing bun deploy in the my-hono-app directory
    const output = execSync('cd my-hono-app && bun run deploy', {
      encoding: 'utf-8',
    });

    const urlRegex = /https:\/\/[^\s]+\.workers\.dev/;
    const workerUrl = output.match(urlRegex)?.[0];

    if (!workerUrl) {
      return NextResponse.json(
        {
          error: 'Failed to deploy to worker',
        },
        { status: 500 }
      );
    }

    // replace the workerUrl in the fetchImplementations
    const fetchImplementationWithWorkerUrl = Object.fromEntries(
      Object.entries(fetchImplementations).map(([route, content]) => [
        route,
        content.replace('PLACEHOLDER_WORKER_URL', workerUrl),
      ])
    );

    return NextResponse.json({
      result: {
        url: workerUrl,
        fetchImplementations: fetchImplementationWithWorkerUrl,
        workerCode: code,
        chainOfThought: chainOfThought,
      },
    });
  } catch (error: Error | unknown) {
    return NextResponse.json({ error: (error as Error).message });
  }
}
