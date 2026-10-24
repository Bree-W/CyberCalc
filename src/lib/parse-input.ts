import { InputFormat } from '../types/analysis';

export interface ParseResult {
  bytes: Uint8Array;
  formatDetected: InputFormat;
  warning?: string;
  error?: string;
}

export function parseRawInput(
  rawInput: string,
  explicitFormat: InputFormat = 'auto'
): ParseResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      bytes: new Uint8Array(0),
      formatDetected: explicitFormat === 'auto' ? 'hex' : explicitFormat,
    };
  }

  if (explicitFormat === 'text') {
    const encoder = new TextEncoder();
    return {
      bytes: encoder.encode(rawInput),
      formatDetected: 'text',
    };
  }

  if (explicitFormat === 'hex') {
    return parseHex(trimmed);
  }

  if (explicitFormat === 'binary') {
    return parseBinary(trimmed);
  }

  if (explicitFormat === 'decimal') {
    return parseDecimal(trimmed);
  }

  if (explicitFormat === 'base64') {
    return parseBase64(trimmed);
  }

  // AUTO-DETECT
  return autoDetectAndParse(rawInput, trimmed);
}

function parseHex(input: string): ParseResult {
  // Strip 0x, \\x, commas, semicolons, brackets, spaces
  let cleaned = input
    .replace(/0x/gi, '')
    .replace(/\\x/gi, '')
    .replace(/[,;:{}[\]]/g, ' ')
    .replace(/\s+/g, '');

  if (cleaned.length === 0) {
    return { bytes: new Uint8Array(0), formatDetected: 'hex' };
  }

  // If odd length, warn and pad leading 0 or tailing 0
  let warning: string | undefined;
  if (cleaned.length % 2 !== 0) {
    warning = 'Odd number of hex characters detected. An initial 0 was prepended for alignment.';
    cleaned = '0' + cleaned;
  }

  if (!/^[0-9a-fA-F]+$/.test(cleaned)) {
    return {
      bytes: new Uint8Array(0),
      formatDetected: 'hex',
      error: 'Invalid hexadecimal characters found. Only [0-9, a-f, A-F] are permitted in Hex mode.',
    };
  }

  const byteArray = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    byteArray[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
  }

  return {
    bytes: byteArray,
    formatDetected: 'hex',
    warning,
  };
}

function parseBinary(input: string): ParseResult {
  // Strip spaces, dashes, commas, brackets, 0b prefixes
  const cleaned = input
    .replace(/0b/gi, '')
    .replace(/[,;:\s\-_[\]]/g, '');

  if (cleaned.length === 0) {
    return { bytes: new Uint8Array(0), formatDetected: 'binary' };
  }

  if (!/^[01]+$/.test(cleaned)) {
    return {
      bytes: new Uint8Array(0),
      formatDetected: 'binary',
      error: 'Invalid binary sequence. Binary mode only allows 0s and 1s.',
    };
  }

  let warning: string | undefined;
  let padded = cleaned;
  if (cleaned.length % 8 !== 0) {
    const padLen = 8 - (cleaned.length % 8);
    padded = '0'.repeat(padLen) + cleaned;
    warning = `Binary length (${cleaned.length} bits) is not a multiple of 8. Padded ${padLen} leading zero(s).`;
  }

  const byteCount = padded.length / 8;
  const byteArray = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) {
    byteArray[i] = parseInt(padded.slice(i * 8, i * 8 + 8), 2);
  }

  return {
    bytes: byteArray,
    formatDetected: 'binary',
    warning,
  };
}

function parseDecimal(input: string): ParseResult {
  // Expect space-delimited or comma-delimited numbers 0-255
  const tokens = input.split(/[\s,;]+/).filter(Boolean);
  if (tokens.length === 0) {
    return { bytes: new Uint8Array(0), formatDetected: 'decimal' };
  }

  const bytes: number[] = [];
  for (const t of tokens) {
    const val = Number(t);
    if (isNaN(val) || !Number.isInteger(val) || val < 0 || val > 255) {
      return {
        bytes: new Uint8Array(0),
        formatDetected: 'decimal',
        error: `Invalid decimal byte value "${t}". Expected integer between 0 and 255.`,
      };
    }
    bytes.push(val);
  }

  return {
    bytes: new Uint8Array(bytes),
    formatDetected: 'decimal',
  };
}

function parseBase64(input: string): ParseResult {
  const cleaned = input.replace(/\s+/g, '');
  try {
    const binaryStr = atob(cleaned);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return {
      bytes,
      formatDetected: 'base64',
    };
  } catch {
    return {
      bytes: new Uint8Array(0),
      formatDetected: 'base64',
      error: 'Invalid Base64 string. Please verify characters and padding.',
    };
  }
}

function autoDetectAndParse(raw: string, trimmed: string): ParseResult {
  // 1. Binary check: only 0, 1 and whitespace, at least 4 bits
  const strippedOfSpace = trimmed.replace(/[\s\-_]/g, '');
  if (/^[01]{4,}$/.test(strippedOfSpace) && !/[2-9a-zA-Z]/.test(trimmed)) {
    // Check if it looks explicitly like binary bits
    const res = parseBinary(trimmed);
    if (!res.error) {
      let warning = res.warning;
      if (strippedOfSpace.length <= 8) {
        warning = `${warning ? warning + ' ' : ''}Note: Ambiguous input "${trimmed}" auto-detected as binary. If you meant decimal or hex, switch format explicitly.`;
      }
      return { ...res, warning };
    }
  }

  // 2. Decimal byte list check: spaced numbers all between 0 and 255
  const decTokens = trimmed.split(/[\s,;]+/).filter(Boolean);
  if (decTokens.length > 1 && decTokens.every(t => /^\d{1,3}$/.test(t) && Number(t) >= 0 && Number(t) <= 255)) {
    const res = parseDecimal(trimmed);
    if (!res.error) {
      return {
        ...res,
        warning: 'Interpreted as decimal byte sequence. If you intended Hex or Text, select format explicitly.',
      };
    }
  }

  // 3. Explicit hex markers: 0x or \x
  if (/(0x|\\x)/i.test(trimmed)) {
    return parseHex(trimmed);
  }

  // 4. Hex pairs / continuous hex: only 0-9, a-f, A-F and spaces/colons
  const hexStripped = trimmed.replace(/[:\s,]/g, '');
  if (/^[0-9a-fA-F]{2,}$/.test(hexStripped)) {
    // If it contains characters like 'a-f' or is spaced pairs
    const hasHexLetters = /[a-fA-F]/.test(hexStripped);
    const hasPairs = /\b[0-9a-fA-F]{2}\b/.test(trimmed);
    if (hasHexLetters || hasPairs || hexStripped.length >= 8) {
      const res = parseHex(trimmed);
      if (!res.error) {
        return {
          ...res,
          warning: !hasHexLetters && hexStripped.length < 8
            ? `Interpreted as Hexadecimal. If you intended plain text "${trimmed}", switch to Text format.`
            : res.warning,
        };
      }
    }
  }

  // 5. Default to Text (UTF-8)
  const encoder = new TextEncoder();
  return {
    bytes: encoder.encode(raw),
    formatDetected: 'text',
  };
}
