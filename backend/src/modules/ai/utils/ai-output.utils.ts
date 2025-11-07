type ParsedArray = string[] | null;

const stripMarkdownCodeFence = (payload: string): string =>
  payload.replace(/```json/gi, '').replace(/```/g, '').trim();

const normalizeFromObject = (obj: Record<string, unknown>): string => {
  const subject =
    typeof obj.subject === 'string' ? obj.subject.trim() : undefined;

  const bodyLike =
    (typeof obj.body === 'string' && obj.body.trim()) ||
    (typeof obj.text === 'string' && obj.text.trim()) ||
    (typeof obj.reply === 'string' && obj.reply.trim()) ||
    (typeof obj.message === 'string' && obj.message.trim()) ||
    (typeof obj.content === 'string' && obj.content.trim()) ||
    undefined;

  const extra = Object.entries(obj)
    .filter(
      ([key, value]) =>
        typeof value === 'string' &&
        !['subject', 'body', 'text', 'reply', 'message', 'content'].includes(
          key,
        ),
    )
    .map(([, value]) => (value as string).trim())
    .filter(Boolean);

  const pieces = [subject, bodyLike, ...extra].filter(Boolean) as string[];

  return pieces.join('\n\n').trim();
};

const tryParseInlineObjectString = (
  value: string,
): Record<string, unknown> | null => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('```json') && trimmed.endsWith('```'))
  ) {
    try {
      const jsonString = trimmed
        .replace(/^```json/i, '')
        .replace(/```$/i, '')
        .trim();
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
};

const normalizeEntry = (entry: unknown): string => {
  if (typeof entry === 'string') {
    const obj = tryParseInlineObjectString(entry);
    if (obj) {
      return normalizeFromObject(obj);
    }
    const trimmed = entry.trim().replace(/^"+|"+$/g, '');
    const subjectMatch = trimmed.match(/"?(subject)"?\s*:\s*"([^"]+)/i);
    const bodyMatch = trimmed.match(/"?(body|text|message|reply|content)"?\s*:\s*"([^"]+)/i);
    if (subjectMatch || bodyMatch) {
      return [subjectMatch?.[2], bodyMatch?.[2]].filter(Boolean).join('\n\n').trim();
    }
    return trimmed;
  }

  if (entry && typeof entry === 'object') {
    return normalizeFromObject(entry as Record<string, unknown>);
  }

  return '';
};

const tryParseArray = (value: string, key: string): ParsedArray => {
  try {
    const parsed = JSON.parse(value);
    const array = parsed?.[key];
    if (!Array.isArray(array)) {
      return null;
    }
    return array.map(normalizeEntry).filter(Boolean);
  } catch {
    return null;
  }
};

const sliceBalancedSection = (
  payload: string,
  startIndex: number,
  openChar: '{' | '[',
  closeChar: '}' | ']',
): string | null => {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIndex; i < payload.length; i += 1) {
    const char = payload[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return payload.slice(startIndex, i + 1);
      }
    }
  }

  return null;
};

const findJsonSegments = (payload: string): string[] => {
  const segments: string[] = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let start = -1;

  for (let i = 0; i < payload.length; i += 1) {
    const char = payload[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{' || char === '[') {
      if (depth === 0) {
        start = i;
      }
      depth += 1;
    } else if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        segments.push(payload.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return segments;
};

const findArrayLiteralForKey = (payload: string, key: string): string | null => {
  const pattern = new RegExp(`["']?${key}["']?\\s*:`, 'gi');
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(payload))) {
    let index = match.index + match[0].length;
    while (index < payload.length && /\s/.test(payload[index])) {
      index += 1;
    }

    if (payload[index] === '[') {
      const literal = sliceBalancedSection(payload, index, '[', ']');
      if (literal) {
        return literal;
      }
    }

    if (payload[index] === '{') {
      const literal = sliceBalancedSection(payload, index, '{', '}');
      if (literal) {
        return `[${literal}]`;
      }
    }
  }

  return null;
};

export const parseArrayFromAiPayload = (payload: string, key: string): string[] => {
  const stripped = stripMarkdownCodeFence(payload);

  const direct = tryParseArray(stripped, key);
  if (direct && direct.length) {
    return direct;
  }

  const segments = findJsonSegments(stripped);
  for (const segment of segments) {
    const fromSegment = tryParseArray(segment, key);
    if (fromSegment && fromSegment.length) {
      return fromSegment;
    }
  }

  const literal = findArrayLiteralForKey(stripped, key);
  if (literal) {
    const asArray = tryParseArray(`{"${key}": ${literal}}`, key);
    if (asArray && asArray.length) {
      return asArray;
    }
  }

  return [];
};

export const aiOutputUtils = {
  stripMarkdownCodeFence,
  parseArrayFromAiPayload,
};

export default aiOutputUtils;
