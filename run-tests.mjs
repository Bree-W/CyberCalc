import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExpression } from './src/lib/calculator.ts';
import { computeRepeatingKeyXor } from './src/lib/xor.ts';
import { analyzeEndianness } from './src/lib/endianness.ts';
import { calculateSubnet, analyzeIpv6 } from './src/lib/networking.ts';
import { convertFromValue } from './src/lib/conversions.ts';
import { parseRawInput } from './src/lib/parse-input.ts';
import { detectHashType } from './src/lib/hash-detective.ts';
import { detectSignatures } from './src/lib/signatures.ts';
import { analyzeByteSequence } from './src/lib/byte-analysis.ts';
import { parseAnalystResponse, sanitizeAnalystSummary } from './src/lib/analyst.ts';

test('Standard Calculator evaluates the real expression parser', () => {
  assert.equal(evaluateExpression('2 + 3 * 4').result, 14);
  assert.equal(evaluateExpression('(10 - 2) / 2').result, 4);
  assert.equal(evaluateExpression('42 / 0').isDivisionByZero, true);
  assert.equal(evaluateExpression('100 / (5 - 5)').isDivisionByZero, true);
});

test('Repeating-key XOR uses the real XOR lab', () => {
  const result = computeRepeatingKeyXor('41 42 43 44', '20', 'hex', 'hex');
  assert.equal(result.outputHex, '61 62 63 64');
  assert.equal(result.outputText, 'abcd');
});

test('Endianness inspector uses the real byte-order function', () => {
  const bytes = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
  const view = analyzeEndianness(bytes).interpretations.find(item => item.byteLength === 4);
  assert.ok(view);
  assert.equal(view.bigEndianUnsigned.replace(/,/g, ''), '16909060');
  assert.equal(view.littleEndianUnsigned.replace(/,/g, ''), '67305985');
});

test('CIDR subnet calculator uses the real networking function', () => {
  const result = calculateSubnet('192.168.1.100', 24);
  assert.ok(!('error' in result));
  if ('error' in result) return;
  assert.equal(result.networkAddress, '192.168.1.0');
  assert.equal(result.broadcastAddress, '192.168.1.255');
  assert.equal(result.firstUsableHost, '192.168.1.1');
  assert.equal(result.lastUsableHost, '192.168.1.254');
  assert.equal(result.usableHosts, 254);
});

test('Conversion lab two\'s complement comes from convertFromValue', () => {
  assert.equal(convertFromValue('255', 'dec', 8).decimalSigned, '-1');
  assert.equal(convertFromValue('127', 'dec', 8).decimalSigned, '127');
  assert.equal(convertFromValue('128', 'dec', 8).decimalSigned, '-128');
  assert.equal(convertFromValue('65535', 'dec', 16).decimalSigned, '-1');
  assert.equal(convertFromValue('4294967295', 'dec', 32).decimalSigned, '-1');
});

test('Odd-length hex pads the tail instead of shifting every byte', () => {
  const parsed = parseRawInput('4D5A9', 'hex');
  assert.deepEqual(Array.from(parsed.bytes), [0x4d, 0x5a, 0x90]);
  assert.match(parsed.warning || '', /trailing 0/i);
});

test('IPv6 compression follows RFC 5952 and fe80::/10 includes fe81', () => {
  const expanded = analyzeIpv6('2001:0db8:0000:0000:0000:0000:0000:0001');
  assert.equal(expanded.compressed, '2001:db8::1');
  assert.equal(expanded.expanded, '2001:0db8:0000:0000:0000:0000:0000:0001');

  const tie = analyzeIpv6('2001:0000:0000:0001:0000:0000:0001:0001');
  assert.equal(tie.compressed, '2001::1:0:0:1:1');

  const linkLocal = analyzeIpv6('fe81::1');
  assert.match(linkLocal.scope || '', /Link-Local/);

  const mapped = analyzeIpv6('::ffff:192.0.2.1');
  assert.equal(mapped.isValid, true);
  assert.equal(mapped.compressed, '::ffff:c000:201');
});

test('Hashcat modes match the current Hashcat table', () => {
  const argon = detectHashType('$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgqlfreSAHgQ');
  assert.equal(argon.primaryMatch?.hashcatMode, '-m 34000');

  const cisco = detectHashType('08021E1D5D4C5C4C5C');
  const ciscoHit = cisco.candidates.find(item => item.name.includes('Cisco Type 7'));
  assert.ok(ciscoHit);
  assert.equal(ciscoHit.hashcatMode, undefined);

  const sha = detectHashType('a'.repeat(64));
  const modes = new Map(sha.candidates.map(item => [item.name, item.hashcatMode]));
  assert.equal(modes.get('SHA3-256'), '-m 17400');
  assert.equal(modes.get('Keccak-256'), '-m 17800');
  assert.equal(modes.get('BLAKE2s-256'), '-m 31000');
  assert.equal(modes.get('BLAKE2b-256'), '-m 34800');
  assert.equal(modes.has('Keccak-256 / SHA3-256'), false);

  const ripemd128 = detectHashType('b'.repeat(32)).candidates.find(item => item.name === 'RIPEMD-128');
  assert.ok(ripemd128);
  assert.equal(ripemd128.hashcatMode, undefined);
});

test('Short magic bytes do not impersonate WebP, BMP, or a NOP sled', () => {
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]);
  assert.ok(detectSignatures(webp).some(sig => sig.name.includes('WebP')));
  assert.equal(detectSignatures(wav).some(sig => sig.name.includes('WebP')), false);
  assert.ok(detectSignatures(wav).some(sig => sig.name.includes('WAV')));

  const embeddedBm = new Uint8Array([0x00, 0x01, 0x42, 0x4d, 0x00]);
  assert.equal(detectSignatures(embeddedBm).some(sig => sig.name.includes('Bitmap')), false);
  const bmp = new Uint8Array([0x42, 0x4d, 0x00, 0x00]);
  assert.ok(detectSignatures(bmp).some(sig => sig.name.includes('Bitmap')));

  assert.equal(detectSignatures(new Uint8Array([0x90, 0x90, 0x90, 0x90])).some(sig => sig.name.includes('NOP')), false);
  assert.ok(detectSignatures(new Uint8Array(8).fill(0x90)).some(sig => sig.name.includes('NOP')));
});

test('Open-model replies are limited to a known lab choice', () => {
  const plan = parseAnalystResponse('Sure\n{"explanation":"Header is already MZ.","action":"none"}');
  assert.equal(plan.action, 'none');
  assert.match(plan.explanation, /MZ/);

  const unknown = parseAnalystResponse('{"explanation":"Try something else.","action":"crack-aes"}');
  assert.equal(unknown.action, 'none');

  const summary = sanitizeAnalystSummary({
    byteCount: 4,
    entropy: 2,
    detectedFormat: 'hex',
    signatures: ['DOS MZ'],
    patterns: [],
    hexPreview: '4D 5A 90 00',
    utf8Preview: 'MZ',
    ignore: 'drop me',
  });
  assert.equal(summary.hexPreview, '4D 5A 90 00');
  assert.equal(sanitizeAnalystSummary({ byteCount: 1, entropy: 9, hexPreview: 'zz' }), null);
});

test('Base64 text with padding is reported, plain hex is not', () => {
  const encoded = new TextEncoder().encode('SGVsbG8gV29ybGQhIQ==');
  assert.ok(analyzeByteSequence(encoded).patterns.some(pattern => pattern.type === 'base64_candidate'));
  const hex = new TextEncoder().encode('4D5A900003000000');
  assert.equal(analyzeByteSequence(hex).patterns.some(pattern => pattern.type === 'base64_candidate'), false);
});
