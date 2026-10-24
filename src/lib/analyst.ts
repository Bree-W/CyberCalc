export const ANALYST_ACTIONS = [
  'none',
  'decode-base64',
  'single-byte-xor',
  'repeating-xor',
  'endianness',
  'identify-hash',
  'open-cyberchef',
  'inspect-image',
] as const;

export type AnalystAction = (typeof ANALYST_ACTIONS)[number];

export interface AnalystSummary {
  byteCount: number;
  entropy: number;
  detectedFormat: string;
  signatures: string[];
  patterns: string[];
  hexPreview: string;
  utf8Preview: string;
}

export interface AnalystPlan {
  explanation: string;
  action: AnalystAction;
}

const HEX_PREVIEW_BYTES = 128;
const TEXT_PREVIEW_CHARS = 180;

export function buildAnalystSummary(input: {
  totalBytes: number;
  entropy: number;
  detectedFormat: string;
  signatures: Array<{ name: string }>;
  patterns: Array<{ title: string }>;
  hexString: string;
  utf8String: string;
}): AnalystSummary {
  const hexTokens = input.hexString.split(/\s+/).filter(Boolean).slice(0, HEX_PREVIEW_BYTES);
  return {
    byteCount: input.totalBytes,
    entropy: input.entropy,
    detectedFormat: input.detectedFormat,
    signatures: input.signatures.slice(0, 4).map(item => item.name.slice(0, 80)),
    patterns: input.patterns.slice(0, 6).map(item => item.title.slice(0, 120)),
    hexPreview: hexTokens.join(' '),
    utf8Preview: input.utf8String.replace(/\u0000/g, '').slice(0, TEXT_PREVIEW_CHARS),
  };
}

export function sanitizeAnalystSummary(value: unknown): AnalystSummary | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const byteCount = Number(raw.byteCount);
  const entropy = Number(raw.entropy);
  if (!Number.isFinite(byteCount) || byteCount < 0 || byteCount > 1_000_000) return null;
  if (!Number.isFinite(entropy) || entropy < 0 || entropy > 8) return null;

  const asStrings = (field: unknown, limit: number, itemLength: number): string[] => {
    if (!Array.isArray(field)) return [];
    return field
      .filter((item): item is string => typeof item === 'string')
      .slice(0, limit)
      .map(item => item.slice(0, itemLength));
  };

  const hexPreview = typeof raw.hexPreview === 'string' ? raw.hexPreview.slice(0, 128 * 3) : '';
  if (hexPreview && !/^[0-9a-fA-F\s]+$/.test(hexPreview)) return null;

  return {
    byteCount,
    entropy,
    detectedFormat: typeof raw.detectedFormat === 'string' ? raw.detectedFormat.slice(0, 32) : 'unknown',
    signatures: asStrings(raw.signatures, 4, 80),
    patterns: asStrings(raw.patterns, 6, 120),
    hexPreview,
    utf8Preview: typeof raw.utf8Preview === 'string' ? raw.utf8Preview.slice(0, TEXT_PREVIEW_CHARS) : '',
  };
}

export function parseAnalystResponse(content: string): AnalystPlan {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('Model did not return JSON');
  }
  const parsed = JSON.parse(content.slice(start, end + 1)) as { explanation?: unknown; action?: unknown };
  const action = ANALYST_ACTIONS.includes(parsed.action as AnalystAction)
    ? (parsed.action as AnalystAction)
    : 'none';
  const explanation = typeof parsed.explanation === 'string' ? parsed.explanation.trim().slice(0, 600) : '';
  if (!explanation) {
    throw new Error('Model returned an empty explanation');
  }
  return { explanation, action };
}

export const ANALYST_SYSTEM_PROMPT = [
  'You triage bytes for CyberCalc, a student forensics workbench.',
  'Write the explanation only about cryptography: ciphers, encodings, hashes, and byte layout.',
  'Choose the next built-in lab. Do not invent keys, commands, shellcode, or plaintext.',
  'Reply with JSON only: {"explanation":"one or two sentences","action":"none|decode-base64|single-byte-xor|repeating-xor|endianness|identify-hash|open-cyberchef|inspect-image"}.',
  'decode-base64: the preview looks like Base64 text.',
  'single-byte-xor: a short buffer may be English hidden under one XOR byte.',
  'repeating-xor: a repeating XOR key is the likely next step.',
  'endianness: the bytes look like a multi-byte integer or header where byte order matters.',
  'identify-hash: the preview is a hex digest or a modular-crypt hash.',
  'open-cyberchef: CyberChef Magic is the right next bake for a cipher or encoding.',
  'inspect-image: the bytes are a PNG, JPEG, GIF, WebP, BMP, or TIFF.',
  'none: a file signature already explains the buffer, or there is not enough data.',
].join(' ');
