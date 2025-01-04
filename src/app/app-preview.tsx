'use client';

interface AppPreviewProps {
  url?: string;
}

export function AppPreview({ url }: AppPreviewProps) {
  return (
    <div className="relative w-full aspect-[4/3] bg-[#FAFAFA] dark:bg-[#0F0F0F] rounded-lg overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-6 bg-[#F5F5F5] dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#333333] flex items-center px-3 space-x-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]"></div>
      </div>
      <iframe src={url} className="w-full h-full pt-6" title="App Preview" />
    </div>
  );
}
