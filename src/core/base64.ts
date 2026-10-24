import type { ConvertResult } from './result.ts';
import { err, ok } from './result.ts';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const REVERSE = new Map<string, number>([...ALPHABET].map((char, index) => [char, index]));

export function encodeBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const chunk = (b0 << 16) | (b1 << 8) | b2;
    out += ALPHABET[(chunk >> 18) & 63];
    out += ALPHABET[(chunk >> 12) & 63];
    out += i + 1 < bytes.length ? ALPHABET[(chunk >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? ALPHABET[chunk & 63] : '=';
  }
  return out;
}

export function decodeBase64(input: string): ConvertResult<Uint8Array> {
  const cleaned = input.replace(/\s/g, '');
  if (cleaned === '') return ok(new Uint8Array());
  if (!/^[A-Za-z0-9+/]+=*$/.test(cleaned)) return err('invalid base64 characters');
  if (cleaned.length % 4 === 1) return err('invalid base64 length');

  const padStart = cleaned.indexOf('=');
  if (padStart !== -1) {
    if (cleaned.length % 4 !== 0 || !/^=+$/.test(cleaned.slice(padStart))) {
      return err('invalid base64 padding');
    }
    const padLen = cleaned.length - padStart;
    if (padLen > 2) return err('invalid base64 padding');
  }

  const body = padStart === -1 ? cleaned : cleaned.slice(0, padStart);
  const padded = body + '='.repeat((4 - (body.length % 4)) % 4);
  const out: number[] = [];
  for (let i = 0; i < padded.length; i += 4) {
    const c0 = REVERSE.get(padded[i]);
    const c1 = padded[i + 1] === '=' ? 0 : REVERSE.get(padded[i + 1]);
    const c2 = padded[i + 2] === '=' ? 0 : REVERSE.get(padded[i + 2]);
    const c3 = padded[i + 3] === '=' ? 0 : REVERSE.get(padded[i + 3]);
    if (c0 === undefined || c1 === undefined || c2 === undefined || c3 === undefined) {
      return err('invalid base64 characters');
    }
    out.push((c0 << 2) | (c1 >> 4));
    if (padded[i + 2] !== '=') out.push(((c1 & 15) << 4) | (c2 >> 2));
    if (padded[i + 3] !== '=') out.push(((c2 & 3) << 6) | c3);
  }
  return ok(Uint8Array.from(out));
}
