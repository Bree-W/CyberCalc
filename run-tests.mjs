import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const source = readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  module._compile(outputText, filename);
};

const { evaluateExpression } = require('./src/lib/calculator.ts');
const { analyzeIpv6, calculateSubnet } = require('./src/lib/networking.ts');
const { compareByteSequences } = require('./src/lib/endianness.ts');

test('Standard Calculator - Scientific evaluation and division-by-zero detection', () => {
  assert.equal(evaluateExpression('2 + 3 * 4').result, 14);
  assert.equal(evaluateExpression('(10 - 2) / 2').result, 4);
  assert.equal(evaluateExpression('2^3^2').result, 512);
  assert.equal(evaluateExpression('-2^2').result, -4);
  assert.equal(evaluateExpression('sqrt(81)').result, 9);
  assert.equal(evaluateExpression('sin(pi / 2)').result, 1);
  assert.equal(evaluateExpression('pi').result, Math.PI);
  assert.equal(evaluateExpression('e').result, Math.E);
  assert.equal(evaluateExpression('42 / 0').isDivisionByZero, true);
  assert.equal(evaluateExpression('100 / (5 - 5)').isDivisionByZero, true);
  assert.equal(evaluateExpression('constructor').success, false);
  assert.equal(evaluateExpression('toString(1)').success, false);
});

// Test 2: Repeating-Key XOR (Specification Example: 41424344 ^ 20 -> 61 62 63 64 / "abcd")
test('Bitwise Operations - Repeating-Key XOR Spec Example', () => {
  const data = [0x41, 0x42, 0x43, 0x44];
  const key = [0x20];
  const result = data.map((b, i) => b ^ key[i % key.length]);
  const resultHex = result.map(b => b.toString(16).padStart(2, '0')).join(' ');
  const resultText = String.fromCharCode(...result);

  assert.equal(resultHex, '61 62 63 64');
  assert.equal(resultText, 'abcd');
});

// Test 3: Endianness (Specification Example: 01 02 03 04 -> 16,909,060 vs 67,305,985)
test('Reverse Engineering - Endianness Spec Example', () => {
  const bytes = [0x01, 0x02, 0x03, 0x04];
  const beUint = ((bytes[0] << 24) >>> 0) + ((bytes[1] << 16) | (bytes[2] << 8) | bytes[3]);
  const leUint = ((bytes[3] << 24) >>> 0) + ((bytes[2] << 16) | (bytes[1] << 8) | bytes[0]);

  assert.equal(beUint, 16909060);
  assert.equal(leUint, 67305985);
});

test('Networking - IPv4 subnet calculations include subnet and usable-host counts', () => {
  const result = calculateSubnet('192.168.1.100', 24, 16);
  assert.equal('error' in result, false);
  if ('error' in result) return;

  assert.equal(result.networkAddress, '192.168.1.0');
  assert.equal(result.broadcastAddress, '192.168.1.255');
  assert.equal(result.firstUsableHost, '192.168.1.1');
  assert.equal(result.lastUsableHost, '192.168.1.254');
  assert.equal(result.usableHosts, 254);
  assert.equal(result.subnetCount, 256);

  assert.equal('error' in calculateSubnet('192.168.1.1', 24, 25), true);
});

test('Networking - IPv6 prefix range calculations', () => {
  const result = analyzeIpv6('2001:db8::1234', 64);
  assert.equal(result.isValid, true);
  assert.equal(result.compressed, '2001:db8::1234');
  assert.equal(result.networkAddress, '2001:db8::');
  assert.equal(result.firstAddress, '2001:db8::');
  assert.equal(result.lastAddress, '2001:db8::ffff:ffff:ffff:ffff');
  assert.equal(result.totalAddresses, 1n << 64n);
  assert.equal(analyzeIpv6('2001:db8::1', 129).isValid, false);
});

test('Reverse Engineering - Binary diff bounds displayed byte rows', () => {
  const result = compareByteSequences(new Uint8Array(5000), new Uint8Array(5000));
  assert.equal(result.matchingCount, 5000);
  assert.equal(result.entries.length, 4096);
  assert.equal(result.entriesTruncated, true);
});

// Test 5: Two's complement integer math and bit widths
test('Conversion Lab - Two\'s Complement Integers', () => {
  function getSigned(val, width) {
    const mask = (1n << BigInt(width)) - 1n;
    const bounded = val & mask;
    const signBit = 1n << BigInt(width - 1);
    return (bounded & signBit) !== 0n ? bounded - (1n << BigInt(width)) : bounded;
  }

  assert.equal(getSigned(255n, 8), -1n);
  assert.equal(getSigned(127n, 8), 127n);
  assert.equal(getSigned(128n, 8), -128n);
  assert.equal(getSigned(65535n, 16), -1n);
  assert.equal(getSigned(4294967295n, 32), -1n);
});
