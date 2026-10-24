import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeBase32, encodeBase32 } from './base32.ts';

test('base32: empty input', () => {
  assert.equal(encodeBase32(new Uint8Array()), '');
  const decoded = decodeBase32('');
  assert.equal(decoded.ok, true);
  if (decoded.ok) assert.equal(decoded.value.length, 0);
});

test('base32: invalid characters and length', () => {
  assert.equal(decodeBase32('11111111').ok, false);
  assert.equal(decodeBase32('MZXW6YQ').ok, false);
  assert.equal(decodeBase32('MY====A=').ok, false);
});

test('base32: RFC 4648 vectors and a large buffer', () => {
  const cases: Array<[string, string]> = [
    ['f', 'MY======'],
    ['fo', 'MZXQ===='],
    ['foo', 'MZXW6==='],
    ['foob', 'MZXW6YQ='],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI======'],
  ];
  for (const [text, encoded] of cases) {
    const bytes = new TextEncoder().encode(text);
    assert.equal(encodeBase32(bytes), encoded);
    const decoded = decodeBase32(encoded);
    assert.equal(decoded.ok, true);
    if (decoded.ok) assert.equal(new TextDecoder().decode(decoded.value), text);
  }

  const big = new Uint8Array(4096);
  for (let i = 0; i < big.length; i++) big[i] = i & 255;
  const again = decodeBase32(encodeBase32(big));
  assert.equal(again.ok, true);
  if (again.ok) assert.deepEqual(again.value, big);
});
