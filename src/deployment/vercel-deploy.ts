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
import { parseXMLLikeTags, ParsedTag } from '@/deployment/parser';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const vercel = new Vercel({
  bearerToken: VERCEL_TOKEN,
});

const FULL_PROJECT = `<file name="src/app/page.tsx">
"use client";

import { useState, useEffect } from "react";
import TodoForm from "@/components/TodoForm";
import TodoList from "@/components/TodoList";
import { Todo } from "@/types/todo";

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const savedTodos = localStorage.getItem("todos");
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  const addTodo = (text: string) => {
    const newTodo: Todo = {
      id: Date.now(),
      text,
      completed: false,
    };
    setTodos([...todos, newTodo]);
  };

  const toggleTodo = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Todo List
        </h1>
        <TodoForm onSubmit={addTodo} />
        <TodoList
          todos={todos}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
        />
      </div>
    </div>
  );
}
</file>

<file name="src/components/TodoForm.tsx">
"use client";

import { useState, FormEvent } from "react";

interface TodoFormProps {
  onSubmit: (text: string) => void;
}

export default function TodoForm({ onSubmit }: TodoFormProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a new todo..."
          className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Add
        </button>
      </div>
    </form>
  );
}
</file>

<file name="src/components/TodoList.tsx">
import { Todo } from "@/types/todo";
import TodoItem from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function TodoList({ todos, onToggle, onDelete }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <p className="text-center text-gray-500">No todos yet. Add some above!</p>
    );
  }

  return (
    <ul className="space-y-2">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
</file>

<file name="src/components/TodoItem.tsx">
import { Todo } from "@/types/todo";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <li className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <span
          className={\`\${
            todo.completed ? "line-through text-gray-400" : "text-gray-800"
          }\`}
        >
          {todo.text}
        </span>
      </div>
      <button
        onClick={() => onDelete(todo.id)}
        className="text-red-500 hover:text-red-700 focus:outline-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </li>
  );
}
</file>

<file name="src/types/todo.ts">
export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}
</file>

<file name="src/app/globals.css">
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

body {
  color: rgb(var(--foreground-rgb));
}
</file>

<file name="src/app/layout.tsx">
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Todo List App",
  description: "A simple todo list application built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
</file>

<file name="tailwind.config.ts">
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
</file>

<file name="package.json">
{
  "name": "todo-list-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next": "14.0.4"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "tailwindcss": "^3.3.0",
    "eslint": "^8",
    "eslint-config-next": "14.0.4"
  }
}
</file>

<file name="tsconfig.json">
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
</file>

<file name=".gitignore">
# dependencies
/node_modules
/.pnp
.pnp.js
.yarn/install-state.gz

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
</file>`;

function parseXMLFileString(input: string): Array<InlinedFile> {
  const parsedFiles = parseXMLLikeTags(input);
  
  return parsedFiles.map(((file: ParsedTag) => {
    const fileName = file.meta?.name;
    const content = file.content;
    
    if (!fileName) {
      throw new Error('File name is missing in the XML-like input.');
    }

    return {
      file: fileName, // Relative path from the directory
      data: content,
    };
  }));
}

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

export async function createAndCheckDeployment({ input }: { input: string }) {
  try {
    // Create a new deployment
    const deployment = await vercel.deployments.createDeployment({
      requestBody: {
        name: 'nextjs-boilerplate', //The project name used in the deployment URL
        target: 'production',
        // files: getFilesToUpload(
          // '/Users/david/src/nextjs-boilerplate'
        // ),
        files: parseXMLFileString(input),
        projectSettings: {
          outputDirectory: '.next',
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

createAndCheckDeployment({ input: FULL_PROJECT });