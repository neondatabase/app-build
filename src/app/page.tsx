'use client';

import { AppPreview } from '@/app/app-preview';
import { createAndCheckDeploymentMock } from '@/deployment/vercel-deploy';
import { useState } from 'react';

export default function Home() {
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);

  const onSubmit = async (formData: FormData) => {
    const deployment = await createAndCheckDeploymentMock();
    setDeploymentUrl(deployment?.url || null);
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
            <form action={onSubmit} className="space-y-4">
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
                  placeholder="Describe your application..."
                  className="w-full h-32 px-4 py-3 rounded-lg border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center h-10 px-6 font-medium text-white bg-[#2E2E2E] dark:bg-[#FAFAFA] dark:text-[#1A1A1A] rounded-lg hover:opacity-90 transition-opacity"
              >
                Generate App
              </button>
            </form>
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
                Your app preview will appear here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
