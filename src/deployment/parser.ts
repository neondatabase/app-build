type TagMeta  = {
  [key: string]: string;
}

export type ParsedTag = {
  tag: string;
  meta?: TagMeta;
  content: string;
}

export function parseXMLLikeTags(input: string): ParsedTag[] {
  const results: ParsedTag[] = [];
  let currentIndex = 0;

  while (currentIndex < input.length) {
    // Find next opening tag
    const openTagStart = input.indexOf('<', currentIndex);
    if (openTagStart === -1) break;

    // Find end of opening tag
    const openTagEnd = input.indexOf('>', openTagStart);
    if (openTagEnd === -1) {
      throw new Error('Invalid XML: unclosed tag');
    }

    // Parse opening tag and metadata
    const openTagContent = input.slice(openTagStart + 1, openTagEnd);
    const [tagName, ...metaParts] = openTagContent.trim().split(' ');

    // Parse metadata
    const meta: TagMeta = {};
    if (metaParts.length > 0) {
      metaParts.forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
          meta[key] = value.replace(/"/g, '');
        }
      });
    }

    // Find closing tag
    const closingTag = `</${tagName}>`;
    const closingTagIndex = input.indexOf(closingTag, openTagEnd);
    if (closingTagIndex === -1) {
      throw new Error('Invalid XML: missing closing tag');
    }

    // Extract content
    const content = input.slice(openTagEnd + 1, closingTagIndex);
    
    // Trim content while preserving newlines in multiline content
    const trimmedContent = content.replace(/^\s*\n\s*|\s*\n\s*$/g, '');

    // Create parsed tag object
    const parsedTag: ParsedTag = {
      tag: tagName,
      content: trimmedContent
    };

    if (Object.keys(meta).length > 0) {
      parsedTag.meta = meta;
    }

    results.push(parsedTag);

    // Move index past closing tag
    currentIndex = closingTagIndex + closingTag.length;
  }

  return results;
}
