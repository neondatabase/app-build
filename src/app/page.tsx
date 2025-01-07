'use client';

import { parseAgentConfig } from '../agent/xml-parser';
import { AppPreview } from '@/app/app-preview';
import {
  createAndCheckDeployment,
  getDeployment,
} from '@/deployment/vercel-deploy';
import { useState, useEffect } from 'react';

const RECOMMENDED_PROMPTS = [
  {
    label: '✨ Todo App',
    prompt:
      'Build a todo list app with add/edit/delete, completion status, filters, and data persistence.',
    featured: true,
  },
  {
    label: '📝 Note Taking',
    prompt:
      'Create a simple note-taking app with markdown support and local storage.',
  },
  {
    label: '🎮 Quiz Game',
    prompt: 'Build a multiple choice quiz game with score tracking and timer.',
  },
  {
    label: '📊 Dashboard',
    prompt: 'Create a simple analytics dashboard with charts and mock data.',
  },
];

const LOADING_MESSAGES = [
  '🤔 The AI is analyzing your prompt...',
  '🔨 Designing the application architecture...',
  '📝 Writing the code and components...',
  '🎨 Adding styles and layout...',
  '🚀 Preparing for deployment...',
];

export default function Home() {
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);

  const isInputValid = promptInput.trim().length >= 10;

  useEffect(() => {
    if (!isLoading) {
      setLoadingMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingMessageIndex((current) =>
        current === LOADING_MESSAGES.length - 1 ? current : current + 1
      );
    }, 8_000);

    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (!deploymentId) return;

    const pollDeployment = async () => {
      try {
        const deployment = await getDeployment(deploymentId);

        if (deployment.readyState === 'READY') {
          // make sure the deployment is ready
          setTimeout(() => {
            setDeploymentUrl(`https://${deployment.alias?.[0]}`);
            console.log('Deployment ready:', deployment);
            setDeploymentId(null); // Clear ID once ready
            setIsLoading(false);
          }, 2_000);
        } else if (deployment.readyState === 'ERROR') {
          alert(deployment.errorMessage);
          console.error('Deployment failed:', deployment.errorMessage);
          setDeploymentId(null);
          setIsLoading(false);
        } else {
          // Continue polling if not ready
          setTimeout(pollDeployment, 5_000);
        }
      } catch (error) {
        console.error('Failed to check deployment status:', error);
        setDeploymentId(null);
        setIsLoading(false);
      }
    };

    pollDeployment();

    // Cleanup
    return () => {
      setDeploymentId(null);
    };
  }, [deploymentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isInputValid || isLoading) return;

    setIsLoading(true);
    setDeploymentUrl(null); // Clear previous URL

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt: promptInput }),
      });
      const data = await response.json();
      const responseSections = parseAgentConfig(data.result);
      console.log(responseSections);

      const deployment = await createAndCheckDeployment({
        input: responseSections.project_files,
      });

      if (deployment?.id) {
        setDeploymentId(deployment.id);
      } else {
        throw new Error('No deployment ID received');
      }
    } catch (error) {
      console.error('Failed to generate app:', error);
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setPromptInput(prompt);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0F0F0F] text-[#1A1A1A] dark:text-[#FAFAFA]">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-medium tracking-tight mb-3">
            App Builder
          </h1>
          <p className="text-[#666666] dark:text-[#888888]">
            Create and preview your application in real-time
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-4 border border-blue-500/20 bg-blue-500/5 rounded-lg">
              <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                🚀 Featured Template
              </h3>
              <p className="text-sm mb-3">
                Try our most popular prompt: A fully functional Todo App with
                all the essential features!
              </p>
              <button
                onClick={() => handlePromptClick(RECOMMENDED_PROMPTS[0].prompt)}
                disabled={isLoading}
                className="text-sm px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Use Todo App Template
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="prompt"
                  className="block text-sm font-medium mb-2 text-[#666666] dark:text-[#888888]"
                >
                  Application Prompt
                </label>
                <textarea
                  id="prompt"
                  name="prompt"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Describe your application... (minimum 10 characters)"
                  disabled={isLoading}
                  className="w-full h-32 px-4 py-3 rounded-lg border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {promptInput.length > 0 && !isInputValid && (
                  <p className="mt-2 text-xs text-red-500">
                    Please enter at least 10 characters
                  </p>
                )}
              </div>
              <div className="flex items-center  space-y-2 gap-4">
                <button
                  type="submit"
                  disabled={!isInputValid || isLoading}
                  className="inline-flex items-center justify-center h-10 px-6 font-medium text-white bg-[#2E2E2E] dark:bg-[#FAFAFA] dark:text-[#1A1A1A] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed relative min-w-[200px]"
                >
                  {isLoading ? (
                    <>
                      <span className="opacity-0">Generate App</span>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="w-5 h-5 border-[3px] border-white/25 dark:border-black/25 border-t-white dark:border-t-black rounded-full animate-spin"
                          style={{
                            animationDuration: '0.6s',
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    'Generate App'
                  )}
                </button>

                {isLoading && (
                  <div className="flex justify-center">
                    <span
                      className="text-sm text-center text-[#666666] dark:text-[#888888]"
                      style={{
                        animation: 'fade-in 0.3s ease-out forwards',
                        opacity: 0,
                        transform: 'translateY(4px)',
                      }}
                    >
                      {LOADING_MESSAGES[loadingMessageIndex]}
                    </span>
                  </div>
                )}
              </div>
            </form>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#666666] dark:text-[#888888]">
                Try these prompts
              </h3>
              <div className="flex flex-wrap gap-2">
                {RECOMMENDED_PROMPTS.slice(1).map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptClick(item.prompt)}
                    disabled={isLoading}
                    className="text-sm px-3 py-1.5 rounded-full bg-[#E5E5E5] dark:bg-[#333333] text-[#666666] dark:text-[#888888] hover:bg-[#D5D5D5] dark:hover:bg-[#404040] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1A1A1A] rounded-xl border border-[#E5E5E5] dark:border-[#333333] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium">Preview</h2>
              {deploymentUrl && (
                <span className="text-xs px-2 py-1 rounded-full bg-[#E5E5E5] dark:bg-[#333333] text-[#666666] dark:text-[#888888]">
                  Live
                </span>
              )}
            </div>
            {deploymentUrl ? (
              <AppPreview url={deploymentUrl} />
            ) : (
              <div className="flex items-center justify-center h-64 text-[#666666] dark:text-[#888888] text-sm">
                {isLoading
                  ? 'Deploying your application...'
                  : 'Your app preview will appear here'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
