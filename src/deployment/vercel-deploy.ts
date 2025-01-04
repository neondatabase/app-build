'use server';

import { Vercel } from '@vercel/sdk';
import { sync as globSync } from 'glob';
import ignore from 'ignore';
import { readFileSync, existsSync } from 'fs-extra';
import { join } from 'path';
import {
  type InlinedFile,
  Encoding,
} from '@vercel/sdk/models/createdeploymentop.js';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const vercel = new Vercel({
  bearerToken: VERCEL_TOKEN,
});

function getFilesToUpload(directory: string): Array<InlinedFile> {
  // Read .gitignore if it exists
  const ig = ignore();
  const gitignorePath = join(directory, '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignoreContent = readFileSync(gitignorePath, 'utf8');
    ig.add(gitignoreContent);
  }

  // Get all files in directory
  const files = globSync('**/*', {
    cwd: directory,
    dot: true,
    nodir: true,
  });

  // Filter files based on .gitignore rules
  const filteredFiles = files.filter((file) => !ig.ignores(file));

  // Convert files to InlinedFile format
  return filteredFiles.map((file) => {
    const fullPath = join(directory, file);
    const content = readFileSync(fullPath);

    return {
      file: file, // Relative path from the directory
      data: content.toString('base64'),
      encoding: Encoding.Base64,
    };
  });
}

export async function createAndCheckDeployment() {
  try {
    // Create a new deployment
    const deployment = await vercel.deployments.createDeployment({
      requestBody: {
        name: 'my-project', //The project name used in the deployment URL
        target: 'production',
        files: getFilesToUpload(
          '/Users/pedrofigueiredo/Desktop/GIT/ai-generated/coffee-shop-management1'
        ),
        projectSettings: {
          buildCommand: 'npm run build',
          framework: 'vite',
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

export async function createAndCheckDeploymentMock() {
  try {
    const deployment = {
      id: '123',
      url: 'https://my-project-m7607pbyy-pffigueiredos-projects.vercel.app',
      status: 'READY',
    };

    return new Promise<typeof deployment>((resolve) => {
      setTimeout(() => {
        resolve(deployment);
      }, 1000);
    });
  } catch (error) {
    console.error(
      error instanceof Error ? `Error: ${error.message}` : String(error)
    );
  }
}
