import assert from 'node:assert/strict';
import test from 'node:test';
import { formatBinary, parseBinary } from './binary.ts';

test('binary: empty input', () => {
  const parsed = parseBinary('');
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.value.length, 0);
  assert.equal(formatBinary(new Uint8Array()), '');
});

test('binary: invalid characters and truncated bytes', () => {
  assert.equal(parseBinary('01000002').ok, false);
  assert.equal(parseBinary('0100000').ok, false);
});

test('binary: round trip and a large buffer', () => {
  const parsed = parseBinary('01000001');
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value[0], 0x41);

  const big = new Uint8Array(4096);
  for (let i = 0; i < big.length; i++) big[i] = i & 255;
  const again = parseBinary(formatBinary(big));
  assert.equal(again.ok, true);
  if (again.ok) assert.deepEqual(again.value, big);
});
