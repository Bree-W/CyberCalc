import type { ConvertResult } from './result.ts';
import { err, ok } from './result.ts';

/** Parse a signed decimal integer. Uses BigInt so values past 2^53 stay exact. */
export function parseDecimalInteger(input: string): ConvertResult<bigint> {
  const trimmed = input.trim();
  if (trimmed === '') return err('empty input');
  if (!/^[+-]?\d+$/.test(trimmed)) return err('invalid decimal integer');
  return ok(BigInt(trimmed));
}

export function formatDecimalInteger(value: bigint): string {
  return value.toString(10);
}

/** Parse space- or comma-separated byte values in the range 0..255. */
export function parseDecimalBytes(input: string): ConvertResult<Uint8Array> {
  const trimmed = input.trim();
  if (trimmed === '') return ok(new Uint8Array());
  const parts = trimmed.split(/[\s,]+/).filter(part => part.length > 0);
  const bytes = new Uint8Array(parts.length);
  for (let i = 0; i < parts.length; i++) {
    if (!/^\d+$/.test(parts[i])) return err('invalid decimal byte');
    const value = BigInt(parts[i]);
    if (value > 255n) return err('decimal byte out of range');
    bytes[i] = Number(value);
  }
  return ok(bytes);
}

export function formatDecimalBytes(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(10)).join(' ');
}
