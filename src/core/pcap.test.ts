import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSamplePcap, parsePcapBuffer } from '../lib/pcap-analyzer.ts';

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
});
