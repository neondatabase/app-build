import { AppBuilder } from './builder.js';
import path from 'path';
import fs from 'fs/promises';

export async function prompt(appPrompt: string) {
  const builder = new AppBuilder(process.env.ANTHROPIC_API_KEY!);

  // Read the boilerplate content
  const boilerplateContent = await fs.readFile(
    path.join(process.cwd(), 'next-boilerplate.txt'),
    'utf-8'
  );

  const prompt = appPrompt;
  const outputDir = path.join(process.cwd(), 'output', 'todo-app');

  try {
    const results = await builder.build(prompt, outputDir, boilerplateContent);
    console.log('App built successfully!');
    console.log('Generated files:');
    for (const result of results) {
      console.log(`\nTask: ${result.taskId}`);
      for (const file of result.files) {
        console.log(`- ${file.path}`);
      }
    }

    console.log('\nTo run the app:');
    console.log('1. cd output/todo-app');
    console.log('2. npm install');
    console.log('3. npm run dev');
  } catch (error) {
    console.error('Error building app:', error);
  }
}
