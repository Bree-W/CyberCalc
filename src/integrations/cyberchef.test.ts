import assert from 'node:assert/strict';
import test from 'node:test';
import { CYBERCHEF_SANDBOX } from './constants.ts';
import { buildCyberChefUrl, chefWindowPath, cyberChef } from './cyberchef.ts';
import { dcode } from './dcode.ts';
import { aperiSolve } from './aperisolve.ts';

test('integration metadata stays on the shared fields', () => {
  assert.equal(cyberChef.kind, 'embed');
  assert.equal(cyberChef.license, 'Apache-2.0');
  assert.match(cyberChef.version, /11\.5\.0/);
  assert.match(cyberChef.version, /11b86fecdb5d8f6244cf931e1f87cec887ec1f1f/);

  assert.equal(aperiSolve.kind, 'proxy');
  assert.equal(aperiSolve.license, 'MIT');
  assert.match(aperiSolve.version, /3\.7\.12/);
  assert.match(aperiSolve.version, /9084bad5f73eecef6b8f7f1aacdfe7fab0935331/);

  assert.equal(dcode.kind, 'link');
  assert.equal(dcode.license, 'unverified');
  assert.equal(dcode.version, 'unpinned');
});

test('cyberchef sandbox includes the flags the app needs to run', () => {
  assert.equal(CYBERCHEF_SANDBOX, 'allow-scripts allow-same-origin allow-forms');
  assert.equal(cyberChef.launch('hi').sandbox, CYBERCHEF_SANDBOX);
});

test('cyberchef hash uses documented recipes and encodes plus signs', () => {
  const fromHex = buildCyberChefUrl('from-hex', new TextEncoder().encode('4D 5A'));
  assert.ok(fromHex.url);
  assert.match(fromHex.url ?? '', /recipe=From_Hex\('Space'\)/);

  const magic = buildCyberChefUrl('magic', new TextEncoder().encode('hi'));
  assert.match(magic.url ?? '', /recipe=Magic\(3,false,false\)/);

  const plus = buildCyberChefUrl('to-base64', Uint8Array.of(0xfb));
  assert.ok(plus.url);
  assert.match(plus.url ?? '', /recipe=To_Base64\('A-Za-z0-9%2B\/%3D'\)/);
  assert.match(plus.url ?? '', /input=%2Bw/);
  assert.match(plus.url ?? '', /theme=cybercalc/);
  assert.match(chefWindowPath(plus.url), /^\/chef#recipe=/);
  assert.match(chefWindowPath(plus.url), /theme=cybercalc/);
  assert.equal((plus.url ?? '').includes('+'), false);
});

test('cyberchef skips a hash when the url would be too long', () => {
  const built = buildCyberChefUrl('magic', new Uint8Array(10_000));
  assert.equal(built.url, null);
  assert.match(built.reason ?? '', /too long/);
});

test('dcode is link-out only and does not append the input', () => {
  const launch = dcode.launch('do-not-leak-this');
  assert.equal(launch.href, 'https://www.dcode.fr/');
  assert.equal(launch.href.includes('do-not-leak-this'), false);
  assert.match(launch.attribution, /links out only/);
});
