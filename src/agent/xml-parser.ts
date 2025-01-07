import { parseXMLLikeTags, ParsedTag } from '@/deployment/parser';
import { InlinedFile } from '@vercel/sdk/models/createdeploymentop.js';

export function parseProjectFiles(xmlContent: string): string {
  // Regular expression to match content between <project_files> tags
  const projectFilesRegex = /<project_files>\s*([\s\S]*?)\s*<\/project_files>/;

  // Extract the content
  const match = xmlContent.match(projectFilesRegex);

  if (!match) {
    throw new Error('Could not find <project_files> tag in the XML content');
  }

  // Return the captured content (group 1)
  return match[1].trim();
}

// Optional: Parse all sections if needed
export function parseAgentConfig(xmlContent: string) {
  const sections = {
    tasks: /<tasks>\s*([\s\S]*?)\s*<\/tasks>/,
    project_files: /<project_files>\s*([\s\S]*?)\s*<\/project_files>/,
    summary: /<summary>\s*([\s\S]*?)\s*<\/summary>/,
  };

  const result: Record<string, string> = {};

  for (const [key, regex] of Object.entries(sections)) {
    const match = xmlContent.match(regex);
    result[key] = match ? match[1].trim() : '';
  }

  return result;
}

export function parseXMLFileString(input: string): Array<InlinedFile> {
  const parsedFiles = parseXMLLikeTags(input);

  return parsedFiles.map((file: ParsedTag) => {
    const fileName = file.meta?.name;
    const content = file.content;

    if (!fileName) {
      throw new Error('File name is missing in the XML-like input.');
    }

    return {
      file: fileName, // Relative path from the directory
      data: content,
    };
  });
}
