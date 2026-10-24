import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeUrl, encodeUrl } from './url.ts';

test('url: empty input', () => {
  assert.equal(encodeUrl(''), '');
  const decoded = decodeUrl('');
  assert.equal(decoded.ok, true);
  if (decoded.ok) assert.equal(decoded.value, '');
});

test('url: invalid percent-encoding', () => {
  assert.equal(decodeUrl('%').ok, false);
  assert.equal(decodeUrl('%2').ok, false);
  assert.equal(decodeUrl('%ZZ').ok, false);
  assert.equal(decodeUrl('%2G').ok, false);
});

test('url: round trip, plus-as-space, and a long string', () => {
  assert.equal(encodeUrl('a b'), 'a%20b');
  const space = decodeUrl('a+b');
  assert.equal(space.ok, true);
  if (space.ok) assert.equal(space.value, 'a b');

  const long = 'café '.repeat(2000);
  const decoded = decodeUrl(encodeUrl(long));
  assert.equal(decoded.ok, true);
  if (decoded.ok) assert.equal(decoded.value, long);
});
