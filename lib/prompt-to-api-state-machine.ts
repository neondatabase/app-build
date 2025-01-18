import { assign, fromCallback, fromPromise, setup, log } from 'xstate';
import { createAgent, fromText } from '@statelyai/agent';
import { z } from 'zod';
import { neon } from '@neondatabase/serverless';
import { anthropic } from '@ai-sdk/anthropic';
import {
  FETCH_GENERATOR_PROMPT,
  HONO_GENERATOR_PROMPT,
  SCHEMA_ANALYSIS_PROMPT,
} from './prompt-api-prompts';
import fs from 'fs';

function getRandomAnalysisPhrase() {
  const phrases = [
    'Analyzing database schema...',
    'Mapping relationships...',
    'Discovering table structures...',
    'Examining constraints...',
    'Documenting database architecture...',
  ];
  return phrases[Math.floor(Math.random() * phrases.length)]!;
}

function getRandomHonoGenerationPhrase() {
  const phrases = [
    'Generating Hono code...',
    'Crafting API endpoints...',
    'Building database interfaces...',
    'Constructing REST routes...',
    'Preparing Hono code...',
  ];
  return phrases[Math.floor(Math.random() * phrases.length)]!;
}

function getRandomFetchGenerationPhrase() {
  const phrases = [
    'Generating fetch implementations...',
    'Crafting fetch implementations...',
    'Building fetch implementations...',
    'Constructing fetch implementations...',
    'Preparing fetch implementations...',
  ];
  return phrases[Math.floor(Math.random() * phrases.length)]!;
}

// Loading animation in terminal
const loader = fromCallback(({ input }: { input: string }) => {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const timer = setInterval(() => {
    process.stdout.write(`\r${frames[i]} ${input}`);
    i = (i + 1) % frames.length;
  }, 100);

  return () => {
    clearInterval(timer);
    process.stdout.write('\n');
  };
});

const summarizedSchemaSchema = z
  .object({
    tables: z.array(
      z.object({
        name: z.string(),
        columns: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
            constraints: z.array(z.string()),
            isNullable: z.boolean(),
          })
        ),
        relationships: z.array(
          z.object({
            table: z.string(),
            type: z.string(),
            columns: z.array(z.string()),
          })
        ),
      })
    ),
  })
  .describe('The analyzed schema details');

const workerCodeSchema = z.object({
  code: z.string().describe('The Hono worker code'),
});

const fetchImplementationsSchema = z.record(
  z.string().describe('The fetch implementation route ID.'),
  z.object({
    fetchImplementationFunction: z
      .string()
      .describe('The fetch implementation function'),
    fetchImplementationUsage: z
      .string()
      .describe('The fetch implementation usage example'),
  })
).describe(`
  The fetch implementations.

      Return this in the format:
      {
        "GET /api/users": {
          "fetchImplementationFunction": "...",
          "fetchImplementationUsage": "..."
        }
        "POST /api/users": {
          "fetchImplementationFunction": "...",
          "fetchImplementationUsage": "..."
        }
        "PUT /api/users/:id": {
          "fetchImplementationFunction": "...",
          "fetchImplementationUsage": "..."
        }
        "DELETE /api/users/:id": {
          "fetchImplementationFunction": "...",
          "fetchImplementationUsage": "..."
        }
      }
`);

const agent = createAgent({
  id: 'apiToPromptAgent',
  model: anthropic('claude-3-5-sonnet-20241022'),
  temperature: 0,
  maxTokens: 8192,
  events: {
    start: z.object({}).describe('Start the analysis process'),
  },
  context: {
    rawSchema: z.string().nullable().describe('The input database schema'),
    summarizedSchema: summarizedSchemaSchema.nullable(),
    workerCode: workerCodeSchema.nullable(),
    fetchImplementations: fetchImplementationsSchema.nullable(),
    error: z.string().nullable().describe('Error message if any'),
    connectionString: z.string().describe('The database connection string'),
    prompt: z.string().describe('The prompt for code generation'),
  },
});

async function getDatabaseSchema(databaseConnectionString: string) {
  const sql = neon(databaseConnectionString);
  const result = await sql(`
    SELECT 
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

export const apiToPromptMachine = setup({
  types: {
    ...agent.types,
    input: {} as {
      connectionString: string;
      prompt: string;
    },
  },
  actors: {
    agent: fromText(agent),
    loader,
    getRawSchema: fromPromise(
      ({ input }: { input: { connectionString: string } }) => {
        if (!input.connectionString) {
          throw new Error('Connection string is required');
        }

        return getDatabaseSchema(input.connectionString);
      }
    ),
  },
}).createMachine({
  id: 'schemaCode',
  context: ({ input }) => ({
    connectionString: input.connectionString,
    prompt: input.prompt,
    rawSchema: null,
    summarizedSchema: null,
    workerCode: null,
    fetchImplementations: null,
    error: null,
  }),
  initial: 'idle',
  states: {
    idle: {
      entry: log('Starting schema analysis and code generation...'),
      on: {
        start: { target: 'gettingSchema' },
      },
    },
    gettingSchema: {
      invoke: [
        {
          src: 'getRawSchema',
          input: ({ context }) => ({
            connectionString: context.connectionString,
          }),
          onDone: {
            target: 'analyzingSchema',
            actions: assign({
              rawSchema: ({ event }) => JSON.stringify(event.output),
            }),
          },
          onError: {
            target: 'error',
            actions: [
              assign({
                error: ({ event }) => event.error.message,
              }),
              log(
                ({ event }) => `Error getting schema: ${event.error.message}`
              ),
            ],
          },
        },
        {
          src: 'loader',
          input: 'Fetching database schema...',
        },
      ],
    },
    analyzingSchema: {
      invoke: [
        {
          src: 'agent',
          input: ({ context }) => ({
            tools: {
              analyzeSchema: {
                description: 'Analyze the database schema',
                parameters: summarizedSchemaSchema,
              },
            },
            prompt:
              'Analyze the database schema and provide a summarized LLM friendly version',
            system: SCHEMA_ANALYSIS_PROMPT(context.rawSchema!),
          }),
          onDone: {
            actions: [
              assign({
                summarizedSchema: ({ event }) => {
                  // Get the analyzeSchema tool call result
                  const analyzeSchemaToolCall =
                    event.output.steps?.[0]?.toolCalls?.find(
                      (call) => call.toolName === 'analyzeSchema'
                    );
                  return (
                    analyzeSchemaToolCall?.args?.tables || event.output.text
                  );
                },
              }),
              log(({ event }) => event.output.text),
              log('Schema analysis complete!'),
            ],
            target: 'generatingHono',
          },
        },
        {
          src: 'loader',
          input: getRandomAnalysisPhrase,
        },
      ],
    },
    generatingHono: {
      invoke: [
        {
          src: 'agent',
          input: ({ context }) => ({
            tools: {
              generateHono: {
                description: 'Generate the Hono worker code',
                parameters: workerCodeSchema,
              },
            },
            system: HONO_GENERATOR_PROMPT(
              JSON.stringify(context.summarizedSchema)
            ),
            prompt: `
              Generate the Hono worker code and fetch implementations according to this prompt: ${context.prompt}
                                Don't do more than what is asked in the prompt.
            `,
          }),
          onDone: {
            actions: [
              assign({
                workerCode: ({ event }) => {
                  // Get the generateHono tool call result
                  const honoToolCall = event.output.steps?.[0]?.toolCalls?.find(
                    (call) => call.toolName === 'generateHono'
                  );
                  const code = honoToolCall?.args?.code || event.output.text;
                  return { code };
                },
              }),
              log('Hono generation complete!'),
            ],
            target: 'generatingFetch',
          },
        },
        {
          src: 'loader',
          input: getRandomHonoGenerationPhrase,
        },
      ],
    },
    generatingFetch: {
      invoke: [
        {
          src: 'agent',
          input: ({ context }) => ({
            system: FETCH_GENERATOR_PROMPT(JSON.stringify(context.workerCode)),
            prompt: `
              Generate the fetch implementations according to this prompt: ${context.prompt}
                                Don't do more than what is asked in the prompt.
            `,
            tools: {
              generateFetch: {
                description: 'Generate the fetch implementations',
                parameters: fetchImplementationsSchema,
              },
            },
          }),
          onDone: {
            actions: [
              assign({
                fetchImplementations: ({ event }) => {
                  // Get the generateFetch tool call result
                  const generateFetchToolCall =
                    event.output.steps?.[0]?.toolCalls?.find(
                      (call) => call.toolName === 'generateFetch'
                    );
                  const fetchImplementations =
                    generateFetchToolCall?.args || event.output.text;
                  return fetchImplementations;
                },
              }),
              log('Fetch generation complete!'),
            ],
            target: 'complete',
          },
        },
        {
          src: 'loader',
          input: getRandomFetchGenerationPhrase,
        },
      ],
    },
    complete: {
      entry: [
        log(({ context }) => '\nSchema Analysis:'),
        log(({ context }) => JSON.stringify(context.summarizedSchema, null, 2)),
        log(({ context }) => '\nGenerated Hono Code:'),
        log(({ context }) => JSON.stringify(context.workerCode, null, 2)),
        log(({ context }) => '\nGenerated Fetch Implementations:'),
        log(({ context }) => context.fetchImplementations),
        ({ context, event }) => {
          fs.writeFileSync(
            './agent-messages.txt',
            JSON.stringify(agent.getMessages(), null, 2),
            { encoding: 'utf-8' }
          );
        },
      ],
      type: 'final',
    },
    error: {
      entry: log(({ context }) => `\nError: ${context.error}`),
      type: 'final',
    },
  },
  exit: () => {},
});
