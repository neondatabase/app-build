'use server';

import { parseXMLFileString } from '../agent/xml-parser';
import { Vercel } from '@vercel/sdk';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const vercel = new Vercel({
  bearerToken: VERCEL_TOKEN,
});

export async function createAndCheckDeployment({ input }: { input: string }) {
  try {
    // Create a new deployment
    const deployment = await vercel.deployments.createDeployment({
      requestBody: {
        name: 'nextjs-boilerplate', //The project name used in the deployment URL
        target: 'production',
        files: parseXMLFileString(input),
        projectSettings: {
          outputDirectory: '.next',
          framework: 'nextjs',
          buildCommand: 'npm run build',
        },
      },
    });

    return deployment;
  } catch (error) {
    console.error(
      error instanceof Error ? `Error: ${error.message}` : String(error)
    );
  }
}

// createAndCheckDeployment({ input: FULL_PROJECT });
