import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

interface Task {
  id: string;
  description: string;
  files: string[];
}

interface BuildResult {
  taskId: string;
  files: Array<{
    path: string;
    content: string;
  }>;
}

interface BoilerplateFile {
  path: string;
  content: string;
}

export class AppBuilder {
  private anthropic: Anthropic;
  private boilerplateFiles: BoilerplateFile[] = [];

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey,
    });
  }

  private async parseBoilerplate(boilerplateContent: string) {
    const files: BoilerplateFile[] = [];
    const fileRegex = /File: (.+?)\n={16,}\n([\s\S]+?)(?=\n={16,}|$)/g;

    let match;
    while ((match = fileRegex.exec(boilerplateContent)) !== null) {
      const [, filePath, content] = match;
      if (!filePath.startsWith('public/')) {
        // Skip binary files
        files.push({
          path: filePath,
          content: content.trim(),
        });
      }
    }

    this.boilerplateFiles = files;
  }

  async build(
    prompt: string,
    outputDir: string,
    boilerplateContent: string,
  ): Promise<BuildResult[]> {
    try {
      // 1. Parse boilerplate
      await this.parseBoilerplate(boilerplateContent);

      // 2. Create output directory and copy boilerplate
      await fs.mkdir(outputDir, { recursive: true });
      for (const file of this.boilerplateFiles) {
        const filePath = path.join(outputDir, file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
      }

      // 3. Generate tasks from prompt
      const tasks = await this.generateTasks(prompt);

      // 4. Execute tasks in parallel
      const results = await this.executeTasks(tasks);

      // 5. Write task files to disk
      await this.writeFiles(results, outputDir);

      return results;
    } catch (error) {
      console.error('Error building app:', error);
      throw error;
    }
  }

  private async generateTasks(prompt: string): Promise<Task[]> {
    const boilerplateStructure = this.boilerplateFiles
      .map(
        (f) =>
          `- ${f.path}${f.path.endsWith('.tsx') ? ' (React component)' : ''}`,
      )
      .join('\n');

    const packageJson = this.boilerplateFiles.find(
      (f) => f.path === 'package.json',
    );
    const dependencies = packageJson ? JSON.parse(packageJson.content) : {};

    const response = await this.anthropic.messages.create({
      messages: [
        {
          role: 'user',
          content: `Given this app requirement:
${prompt}

Using this existing Next.js boilerplate structure:
${boilerplateStructure}

With these dependencies:
${JSON.stringify(dependencies.dependencies || {}, null, 2)}

And dev dependencies:
${JSON.stringify(dependencies.devDependencies || {}, null, 2)}

Break this down into maximum 5 independent tasks. Focus on implementing the required features.
Each task should build upon the existing boilerplate without duplicating what's already there.

Format your response as JSON array like this:
[{
  "id": "task-1",
  "description": "task description",
  "files": ["src/path/to/file1.ts", "src/path/to/file2.ts"]
}]`,
        },
      ],
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  }

  private async executeTasks(tasks: Task[]): Promise<BuildResult[]> {
    const promises = tasks.map(async (task) => {
      // Get existing content for files that will be modified
      const existingFiles = new Map(
        this.boilerplateFiles
          .filter((f) => task.files.includes(f.path))
          .map((f) => [f.path, f.content]),
      );

      const response = await this.anthropic.messages.create({
        messages: [
          {
            role: 'user',
            content: `Implement this task: ${task.description}
Working with these files: ${task.files.join(', ')}

${task.files
  .map((file) => {
    const content = existingFiles.get(file);
    return content
      ? `Existing content of ${file}:\n\`\`\`\n${content}\n\`\`\``
      : `Create new file: ${file}`;
  })
  .join('\n\n')}

Context:
- This is a Next.js App Router application
- Using TypeScript and TailwindCSS
- Geist font is available via CSS variables: var(--font-geist-sans) and var(--font-geist-mono)

Provide the complete implementation code for each file in blocks like:
\`\`\`typescript:src/path/to/file.ts
// code here
\`\`\`

Write production-ready TypeScript code with proper types.
Use proper Next.js patterns (e.g. Server/Client Components, proper routing).
Follow React best practices and modern patterns.`,
          },
        ],
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8192,
      });

      const content = response.content[0].text;
      const files = this.parseCodeBlocks(content);

      return {
        taskId: task.id,
        files,
      };
    });

    return Promise.all(promises);
  }

  private parseCodeBlocks(
    content: string,
  ): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];
    const matches = content.matchAll(/```[\w-]+:(.+?)\n([\s\S]+?)```/g);

    for (const match of matches) {
      const [, path, code] = match;
      if (path && code) {
        files.push({
          path: path.trim(),
          content: code.trim(),
        });
      }
    }

    return files;
  }

  private async writeFiles(
    results: BuildResult[],
    outputDir: string,
  ): Promise<void> {
    for (const result of results) {
      for (const file of result.files) {
        const filePath = path.join(outputDir, file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
      }
    }
  }
}
