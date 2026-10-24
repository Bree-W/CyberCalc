import assert from 'node:assert/strict';
import test from 'node:test';
import { convertByteUnit, listByteUnits } from './bytes.ts';

test('bytes: empty input and invalid characters', () => {
  assert.equal(convertByteUnit('', 'B', 'KB', 'decimal').ok, false);
  assert.equal(convertByteUnit('   ', 'B', 'B', 'binary').ok, false);
  assert.equal(convertByteUnit('12a', 'B', 'KB', 'decimal').ok, false);
  assert.equal(convertByteUnit('-1', 'B', 'KB', 'decimal').ok, false);
  assert.equal(convertByteUnit('1', 'KiB', 'B', 'decimal').ok, false);
  assert.equal(convertByteUnit('1', 'KB', 'B', 'binary').ok, false);
});

test('bytes: decimal and binary standards use different factors', () => {
  assert.deepEqual(listByteUnits('decimal'), ['B', 'KB', 'MB', 'GB']);
  assert.deepEqual(listByteUnits('binary'), ['B', 'KiB', 'MiB', 'GiB']);

  const kb = convertByteUnit('1.5', 'KB', 'B', 'decimal');
  const kib = convertByteUnit('1.5', 'KiB', 'B', 'binary');
  assert.equal(kb.ok && kb.value, '1500');
  assert.equal(kib.ok && kib.value, '1536');

  const back = convertByteUnit('1536', 'B', 'KiB', 'binary');
  assert.equal(back.ok && back.value, '1.5');
});

test('bytes: very large values stay exact', () => {
  const amount = `1${'0'.repeat(24)}`;
  const converted = convertByteUnit(amount, 'GB', 'B', 'decimal');
  assert.equal(converted.ok, true);
  if (!converted.ok) return;
  assert.equal(converted.value, `1${'0'.repeat(33)}`);
  assert.equal(converted.value.includes('Infinity'), false);
  assert.equal(converted.value, (BigInt(amount) * 1_000_000_000n).toString());
});
