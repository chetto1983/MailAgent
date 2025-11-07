type ParsedArray = string[] | null;

const stripMarkdownCodeFence = (payload: string): string =>
  payload.replace(/```json/gi, '').replace(/```/g, '').trim();

const tryParseArray = (value: string, key: string): ParsedArray => {
  try {
    const parsed = JSON.parse(value);
    const array = parsed?.[key];
    if (!Array.isArray(array)) {
      return null;
    }
    return array
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  } catch {
    return null;
  }
};

const findFirstJsonBlock = (payload: string): string | null => {
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

    if (char === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        return payload.slice(start, i + 1);
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

  const block = findFirstJsonBlock(stripped);
  if (block) {
    const fromBlock = tryParseArray(block, key);
    if (fromBlock && fromBlock.length) {
      return fromBlock;
    }
  }

  return [];
};

export const aiOutputUtils = {
  stripMarkdownCodeFence,
  parseArrayFromAiPayload,
};

export default aiOutputUtils;
