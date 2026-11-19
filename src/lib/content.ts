// Copied from seoulmate/lib/chat/content.ts.

export type ContentKind = "NARRATION" | "DIALOGUE";
export type ContentPart = { kind: ContentKind; text: string };

const NARRATION_LINE = /^\*([^*]+)\*$/;

export function parseMessageContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let current: ContentPart | null = null;

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      current = null;
      continue;
    }
    const narration = NARRATION_LINE.exec(line);
    const kind: ContentKind = narration ? "NARRATION" : "DIALOGUE";
    const text = narration ? narration[1].trim() : line;

    if (current && current.kind === kind) {
      current.text += kind === "NARRATION" ? ` ${text}` : `\n${text}`;
    } else {
      current = { kind, text };
      parts.push(current);
    }
  }
  return parts;
}

export function splitInlineEmphasis(text: string): { text: string; emphasis: boolean }[] {
  return text
    .split(/(\*[^*\n]+\*)/)
    .filter(Boolean)
    .map((part) =>
      /^\*[^*\n]+\*$/.test(part)
        ? { text: part.slice(1, -1), emphasis: true }
        : { text: part, emphasis: false },
    );
}
