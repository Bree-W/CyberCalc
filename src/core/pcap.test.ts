import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSamplePcap, buildSplitHttpObjectPcap, parsePcapBuffer } from '../lib/pcap-analyzer.ts';
import { createHash } from 'node:crypto';

test('pcap analyzer dissects HTTP credential leak and reconstructs TCP stream', () => {
  const bytes = buildSamplePcap('http-credential-leak.pcap');
  const res = parsePcapBuffer(bytes);
  assert.equal(res.format, 'PCAP');
  assert.equal(res.packets.length, 6);
  const httpPackets = res.packets.filter(p => p.protocol === 'HTTP');
  assert.equal(httpPackets.length, 2);
  assert.ok(res.ctfFindings.some(f => f.summary.includes('flag{wireshark_http_stream_mastery}')));
  assert.ok(res.ctfFindings.some(f => f.summary.includes('HTTP Basic Auth')));
  const streamKeys = Object.keys(res.streams);
  assert.equal(streamKeys.length, 1);
  assert.equal(res.streams[streamKeys[0]].segments.length, 2);
});

test('pcap analyzer dissects DNS hex exfiltration and TXT answers', () => {
  const bytes = buildSamplePcap('dns-exfiltration.pcap');
  const res = parsePcapBuffer(bytes);
  assert.equal(res.packets.length, 4);
  assert.ok(res.packets.every(p => p.protocol === 'DNS'));
  assert.ok(res.ctfFindings.some(f => f.summary.includes('flag{dns_subdomain_exfil}') || f.summary.includes('Hex-encoded DNS subdomain')));
});

test('pcap analyzer dissects ICMP covert ping tunnel payloads', () => {
  const bytes = buildSamplePcap('icmp-covert-tunnel.pcap');
  const res = parsePcapBuffer(bytes);
  assert.equal(res.packets.length, 4);
  assert.ok(res.packets.every(p => p.protocol === 'ICMP'));
  assert.ok(res.ctfFindings.some(f => f.summary.includes('flag{icmp_covert_ping_tunnel}')));
});

test('pcap analyzer rejects short or non-pcap buffers gracefully', () => {
  const bad = parsePcapBuffer(new Uint8Array([1, 2, 3, 4]));
  assert.equal(bad.format, 'Unknown');
  assert.ok(bad.error);
  assert.deepEqual(bad.httpObjects, []);
});

test('pcap analyzer exports HTTP request and response bodies', () => {
  const res = parsePcapBuffer(buildSamplePcap('http-credential-leak.pcap'));
  const names = res.httpObjects.map(object => object.filename);
  assert.ok(names.includes('login'));
  const json = res.httpObjects.find(object => object.mime === 'application/json');
  assert.ok(json);
  assert.match(new TextDecoder().decode(json.bytes), /flag\{wireshark_http_stream_mastery\}/);
  assert.equal(json.md5, createHash('md5').update(json.bytes).digest('hex'));
  assert.equal(json.sha256, createHash('sha256').update(json.bytes).digest('hex'));
});

test('pcap analyzer reassembles a split HTTP PNG object', () => {
  const res = parsePcapBuffer(buildSplitHttpObjectPcap());
  const png = res.httpObjects.find(object => object.filename === 'logo.png');
  assert.ok(png);
  assert.equal(png.mime, 'image/png');
  assert.deepEqual([...png.bytes.slice(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(png.size, 33);
});
