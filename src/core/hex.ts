import type { ConvertResult } from './result.ts';
import { err, ok } from './result.ts';

/** Parse hex text into bytes. Whitespace, separators, and 0x prefixes are allowed. */
export function parseHex(input: string): ConvertResult<Uint8Array> {
  const stripped = input.trim().replace(/[\s,_:;]/g, '').replace(/0x/gi, '');
  if (stripped === '') return ok(new Uint8Array());
  if (!/^[0-9a-fA-F]+$/.test(stripped)) {
    return err('invalid hexadecimal characters');
  }
  if (stripped.length % 2 !== 0) {
    return err('hex length must be even');
  }
  const bytes = new Uint8Array(stripped.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(stripped.slice(i * 2, i * 2 + 2), 16);
  }
  return ok(bytes);
}

export function formatHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}
