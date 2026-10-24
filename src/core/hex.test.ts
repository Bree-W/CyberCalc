import assert from 'node:assert/strict';
import test from 'node:test';
import { formatHex, parseHex } from './hex.ts';

test('hex: empty input', () => {
  const parsed = parseHex('');
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.value.length, 0);
  assert.equal(parseHex('   ').ok, true);
  assert.equal(formatHex(new Uint8Array()), '');
});

test('hex: invalid characters and odd length', () => {
  assert.equal(parseHex('zz').ok, false);
  assert.equal(parseHex('4G').ok, false);
  assert.equal(parseHex('abc').ok, false);
});

test('hex: round trip and a large buffer', () => {
  const parsed = parseHex('4d 5a 0x90');
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(formatHex(parsed.value), '4D 5A 90');

  const big = new Uint8Array(8192);
  for (let i = 0; i < big.length; i++) big[i] = i & 255;
  const again = parseHex(formatHex(big));
  assert.equal(again.ok, true);
  if (again.ok) assert.deepEqual(again.value, big);
});
