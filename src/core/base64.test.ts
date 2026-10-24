import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeBase64, encodeBase64 } from './base64.ts';

test('base64: empty input', () => {
  assert.equal(encodeBase64(new Uint8Array()), '');
  const decoded = decodeBase64('');
  assert.equal(decoded.ok, true);
  if (decoded.ok) assert.equal(decoded.value.length, 0);
  assert.equal(decodeBase64('   ').ok, true);
});

test('base64: invalid characters and padding', () => {
  assert.equal(decodeBase64('!!!!').ok, false);
  assert.equal(decodeBase64('a===').ok, false);
  assert.equal(decodeBase64('abcde').ok, false);
});

test('base64: known vectors and a large buffer', () => {
  const hello = new TextEncoder().encode('hello');
  assert.equal(encodeBase64(hello), 'aGVsbG8=');
  const decoded = decodeBase64('aGVsbG8=');
  assert.equal(decoded.ok, true);
  if (decoded.ok) assert.equal(new TextDecoder().decode(decoded.value), 'hello');

  const big = new Uint8Array(8192);
  for (let i = 0; i < big.length; i++) big[i] = i & 255;
  const again = decodeBase64(encodeBase64(big));
  assert.equal(again.ok, true);
  if (again.ok) assert.deepEqual(again.value, big);
});
