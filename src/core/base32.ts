import type { ConvertResult } from './result.ts';
import { err, ok } from './result.ts';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const REVERSE = new Map<string, number>([...ALPHABET].map((char, index) => [char, index]));

/** RFC 4648 base32. */
export function encodeBase32(bytes: Uint8Array): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(buffer >> bits) & 31];
    }
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31];
  while (out.length % 8 !== 0) out += '=';
  return out;
}

export function decodeBase32(input: string): ConvertResult<Uint8Array> {
  const cleaned = input.replace(/\s/g, '').toUpperCase();
  if (cleaned === '') return ok(new Uint8Array());
  if (!/^[A-Z2-7]+=*$/.test(cleaned)) return err('invalid base32 characters');
  if (cleaned.length % 8 !== 0) return err('invalid base32 length');

  const padStart = cleaned.indexOf('=');
  if (padStart !== -1 && !/^=+$/.test(cleaned.slice(padStart))) {
    return err('invalid base32 padding');
  }

  const body = padStart === -1 ? cleaned : cleaned.slice(0, padStart);
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of body) {
    const value = REVERSE.get(char);
    if (value === undefined) return err('invalid base32 characters');
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 255);
    }
  }
  return ok(Uint8Array.from(out));
}
