import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatDecimalBytes,
  formatDecimalInteger,
  parseDecimalBytes,
  parseDecimalInteger,
} from './decimal.ts';

test('decimal: empty input', () => {
  assert.equal(parseDecimalInteger('').ok, false);
  assert.equal(parseDecimalInteger('   ').ok, false);
  const bytes = parseDecimalBytes('');
  assert.equal(bytes.ok, true);
  if (bytes.ok) assert.equal(bytes.value.length, 0);
});

test('decimal: invalid characters and out of range bytes', () => {
  assert.equal(parseDecimalInteger('12a').ok, false);
  assert.equal(parseDecimalInteger('+').ok, false);
  assert.equal(parseDecimalBytes('1, 256').ok, false);
  assert.equal(parseDecimalBytes('99999999999999999999').ok, false);
  assert.equal(parseDecimalBytes('-1').ok, false);
});

test('decimal: values past Number.MAX_SAFE_INTEGER stay exact', () => {
  const raw = '9'.repeat(80);
  const parsed = parseDecimalInteger(raw);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(formatDecimalInteger(parsed.value), raw);
  assert.equal(parsed.value > BigInt(Number.MAX_SAFE_INTEGER), true);

  const bytes = parseDecimalBytes('65 66 67');
  assert.equal(bytes.ok, true);
  if (bytes.ok) assert.equal(formatDecimalBytes(bytes.value), '65 66 67');
});
