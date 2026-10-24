import type { ConvertResult } from './result.ts';
import { err, ok } from './result.ts';

/** Parse a bit string into bytes. Length must be a multiple of 8. */
export function parseBinary(input: string): ConvertResult<Uint8Array> {
  const bits = input.trim().replace(/[\s_]/g, '');
  if (bits === '') return ok(new Uint8Array());
  if (!/^[01]+$/.test(bits)) return err('invalid binary characters');
  if (bits.length % 8 !== 0) return err('binary length must be a multiple of 8');
  const bytes = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return ok(bytes);
}

export function formatBinary(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(2).padStart(8, '0')).join(' ');
}
