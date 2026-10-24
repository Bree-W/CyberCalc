import type { ConvertResult } from './result.ts';
import { err, ok } from './result.ts';

const UNRESERVED = /[A-Za-z0-9\-._~]/;

/** Percent-encode UTF-8 bytes. Unreserved characters are left as-is. */
export function encodeUrl(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let out = '';
  for (const byte of bytes) {
    const char = String.fromCharCode(byte);
    if (UNRESERVED.test(char)) out += char;
    else out += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  return out;
}

/** Decode percent-encoding. A literal + becomes a space. */
export function decodeUrl(input: string): ConvertResult<string> {
  if (input === '') return ok('');
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '+') {
      bytes.push(0x20);
      continue;
    }
    if (char === '%') {
      const hex = input.slice(i + 1, i + 3);
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) return err('invalid percent-encoding');
      bytes.push(Number.parseInt(hex, 16));
      i += 2;
      continue;
    }
    if (char.charCodeAt(0) > 127) return err('invalid url character');
    bytes.push(char.charCodeAt(0));
  }
  try {
    return ok(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes)));
  } catch {
    return err('invalid utf-8 in percent-encoding');
  }
}
