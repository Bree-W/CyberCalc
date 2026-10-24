/**
 * Zero-dependency PCAP / PCAPNG packet dissector & student CTF sample generator.
 * Supports Classic PCAP (microsecond & nanosecond, LE & BE) and PCAPNG (SHB, IDB, EPB, SPB),
 * dissecting Ethernet II, ARP, IPv4, IPv6, TCP, UDP, ICMP, HTTP, and DNS.
 */

export interface DissectedLayer {
  name: string;
  summary: string;
  fields: { label: string; value: string }[];
}

export interface ParsedPacket {
  index: number;
  timestampSec: number;
  relativeTimeSec: number;
  capturedLength: number;
  originalLength: number;
  source: string;
  destination: string;
  srcPort?: number;
  dstPort?: number;
  protocol: 'TCP' | 'UDP' | 'HTTP' | 'DNS' | 'ICMP' | 'ARP' | 'IPv4' | 'IPv6' | 'ETH' | 'RAW';
  info: string;
  layers: DissectedLayer[];
  raw: Uint8Array;
  payload: Uint8Array;
  payloadAscii: string;
  streamId?: string;
  ctfAlert?: string;
}

export interface PcapAnalysisResult {
  format: 'PCAP' | 'PCAPNG' | 'Unknown';
  linkType: number;
  linkTypeName: string;
  packets: ParsedPacket[];
  streams: Record<string, { id: string; protocol: 'TCP' | 'UDP'; endpoints: [string, string]; segments: { packetIndex: number; from: string; ascii: string; bytes: Uint8Array }[] }>;
  ctfFindings: { packetIndex: number; protocol: string; summary: string; extracted: string }[];
  error?: string;
}

function readU16BE(b: Uint8Array, o: number): number {
  return (b[o] << 8) | b[o + 1];
}

function readU16LE(b: Uint8Array, o: number): number {
  return b[o] | (b[o + 1] << 8);
}

function readU32BE(b: Uint8Array, o: number): number {
  return (((b[o] << 24) >>> 0) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

function readU32LE(b: Uint8Array, o: number): number {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | ((b[o + 3] << 24) >>> 0)) >>> 0;
}

function formatMac(b: Uint8Array, o: number): string {
  const parts: string[] = [];
  for (let i = 0; i < 6; i++) {
    parts.push(b[o + i].toString(16).padStart(2, '0'));
  }
  return parts.join(':');
}

function formatIpv4(b: Uint8Array, o: number): string {
  return `${b[o]}.${b[o + 1]}.${b[o + 2]}.${b[o + 3]}`;
}

function formatIpv6(b: Uint8Array, o: number): string {
  const groups: string[] = [];
  for (let i = 0; i < 16; i += 2) {
    groups.push(readU16BE(b, o + i).toString(16));
  }
  return groups.join(':');
}

function toPrintableAscii(b: Uint8Array): string {
  let out = '';
  for (let i = 0; i < b.length; i++) {
    const c = b[i];
    if ((c >= 0x20 && c <= 0x7e) || c === 0x0a || c === 0x0d || c === 0x09) {
      out += String.fromCharCode(c);
    } else {
      out += '.';
    }
  }
  return out;
}

function decodeDnsName(msg: Uint8Array, startOffset: number): { name: string; nextOffset: number } {
  const labels: string[] = [];
  let offset = startOffset;
  let jumped = false;
  let nextOffset = startOffset;
  let hops = 0;

  while (offset < msg.length && hops < 32) {
    hops++;
    const len = msg[offset];
    if (len === 0) {
      if (!jumped) nextOffset = offset + 1;
      break;
    }
    if ((len & 0xc0) === 0xc0) {
      if (offset + 1 >= msg.length) break;
      const ptr = ((len & 0x3f) << 8) | msg[offset + 1];
      if (!jumped) nextOffset = offset + 2;
      offset = ptr;
      jumped = true;
      continue;
    }
    const end = offset + 1 + len;
    if (end > msg.length) break;
    labels.push(new TextDecoder('latin1').decode(msg.subarray(offset + 1, end)));
    offset = end;
    if (!jumped) nextOffset = offset;
  }

  return { name: labels.join('.') || '<root>', nextOffset };
}

const DNS_QTYPES: Record<number, string> = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  12: 'PTR',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA',
};

function detectCtfSecret(ascii: string, dnsName?: string): string | undefined {
  const flagMatch = ascii.match(/(?:flag|ctf|cybercalc)\{[^}\r\n]{3,120}\}/i);
  if (flagMatch) return `Flag detected: ${flagMatch[0]}`;

  const basicMatch = ascii.match(/Authorization:\s*Basic\s+([A-Za-z0-9+/=]+)/i);
  if (basicMatch) {
    try {
      const decoded = Buffer.from(basicMatch[1], 'base64').toString('utf8');
      return `HTTP Basic Auth: ${basicMatch[1]} -> "${decoded}"`;
    } catch {
      return `HTTP Basic Auth: ${basicMatch[1]}`;
    }
  }

  const credMatch = ascii.match(/(?:username|user|login|pass|password)=([^&\s\r\n]+)/i);
  if (credMatch) return `Cleartext parameter: ${credMatch[0].slice(0, 80)}`;

  if (dnsName && /^[0-9a-fA-F]{10,}\./.test(dnsName)) {
    const hexLabel = dnsName.split('.')[0];
    if (hexLabel.length % 2 === 0) {
      try {
        const decoded = Buffer.from(hexLabel, 'hex').toString('utf8');
        if (/[\x20-\x7e]{4,}/.test(decoded)) {
          return `Hex-encoded DNS subdomain "${hexLabel}" -> "${decoded}"`;
        }
      } catch {
        // ignore
      }
    }
  }

  return undefined;
}

function dissectPacketBytes(
  raw: Uint8Array,
  index: number,
  timestampSec: number,
  firstTimestampSec: number,
  originalLength: number,
  linkType: number,
): ParsedPacket {
  const layers: DissectedLayer[] = [
    {
      name: `Frame ${index}`,
      summary: `${raw.length} bytes captured (${originalLength} bytes on wire)`,
      fields: [
        { label: 'Arrival Time', value: `${timestampSec.toFixed(6)} s` },
        { label: 'Frame Length', value: `${originalLength} bytes` },
        { label: 'Capture Length', value: `${raw.length} bytes` },
      ],
    },
  ];

  let source = 'Unknown';
  let destination = 'Unknown';
  let protocol: ParsedPacket['protocol'] = 'RAW';
  let info = `${raw.length} bytes`;
  let payload: Uint8Array = new Uint8Array(0);
  let srcPort: number | undefined;
  let dstPort: number | undefined;
  let streamId: string | undefined;
  let dnsNameForAlert: string | undefined;

  let l3Offset = 0;
  let etherType = 0x0800;

  if (linkType === 1 && raw.length >= 14) {
    // Ethernet II
    const dstMac = formatMac(raw, 0);
    const srcMac = formatMac(raw, 6);
    etherType = readU16BE(raw, 12);
    source = srcMac;
    destination = dstMac;
    protocol = 'ETH';
    l3Offset = 14;
    layers.push({
      name: 'Ethernet II',
      summary: `Src: ${srcMac}, Dst: ${dstMac}, Type: 0x${etherType.toString(16).padStart(4, '0')}`,
      fields: [
        { label: 'Destination MAC', value: dstMac },
        { label: 'Source MAC', value: srcMac },
        { label: 'EtherType', value: `0x${etherType.toString(16).padStart(4, '0')}` },
      ],
    });
  } else if (linkType === 101 && raw.length >= 1) {
    // Raw IP
    const ver = raw[0] >> 4;
    etherType = ver === 6 ? 0x86dd : 0x0800;
    l3Offset = 0;
  }

  // ARP (0x0806)
  if (etherType === 0x0806 && raw.length >= l3Offset + 28) {
    const oper = readU16BE(raw, l3Offset + 6);
    const senderMac = formatMac(raw, l3Offset + 8);
    const senderIp = formatIpv4(raw, l3Offset + 14);
    const targetMac = formatMac(raw, l3Offset + 18);
    const targetIp = formatIpv4(raw, l3Offset + 24);
    protocol = 'ARP';
    source = senderIp;
    destination = targetIp;
    info = oper === 1
      ? `Who has ${targetIp}? Tell ${senderIp}`
      : `${senderIp} is at ${senderMac}`;
    layers.push({
      name: 'Address Resolution Protocol (ARP)',
      summary: oper === 1 ? 'Request' : 'Reply',
      fields: [
        { label: 'Opcode', value: oper === 1 ? 'Request (1)' : `Reply (${oper})` },
        { label: 'Sender MAC', value: senderMac },
        { label: 'Sender IP', value: senderIp },
        { label: 'Target MAC', value: targetMac },
        { label: 'Target IP', value: targetIp },
      ],
    });
  } else if (etherType === 0x0800 && raw.length >= l3Offset + 20) {
    // IPv4
    const ihl = (raw[l3Offset] & 0x0f) * 4;
    const totalLength = readU16BE(raw, l3Offset + 2);
    const ttl = raw[l3Offset + 8];
    const ipProto = raw[l3Offset + 9];
    const srcIp = formatIpv4(raw, l3Offset + 12);
    const dstIp = formatIpv4(raw, l3Offset + 16);
    source = srcIp;
    destination = dstIp;
    protocol = 'IPv4';

    layers.push({
      name: 'Internet Protocol Version 4 (IPv4)',
      summary: `Src: ${srcIp}, Dst: ${dstIp}, Proto: ${ipProto}, TTL: ${ttl}`,
      fields: [
        { label: 'Source Address', value: srcIp },
        { label: 'Destination Address', value: dstIp },
        { label: 'Header Length', value: `${ihl} bytes` },
        { label: 'Total Length', value: `${totalLength} bytes` },
        { label: 'TTL', value: String(ttl) },
        { label: 'Protocol', value: `${ipProto} (${ipProto === 6 ? 'TCP' : ipProto === 17 ? 'UDP' : ipProto === 1 ? 'ICMP' : 'Other'})` },
      ],
    });

    const l4Offset = l3Offset + ihl;
    const ipEnd = Math.min(raw.length, l3Offset + (totalLength || raw.length - l3Offset));
    if (l4Offset <= ipEnd) {
      const l4 = dissectL4(raw.subarray(l4Offset, ipEnd), ipProto, srcIp, dstIp, layers);
      protocol = l4.protocol;
      info = l4.info;
      payload = l4.payload;
      srcPort = l4.srcPort;
      dstPort = l4.dstPort;
      streamId = l4.streamId;
      dnsNameForAlert = l4.dnsName;
    }
  } else if (etherType === 0x86dd && raw.length >= l3Offset + 40) {
    // IPv6
    const payloadLen = readU16BE(raw, l3Offset + 4);
    const nextHeader = raw[l3Offset + 6];
    const hopLimit = raw[l3Offset + 7];
    const srcIp = formatIpv6(raw, l3Offset + 8);
    const dstIp = formatIpv6(raw, l3Offset + 24);
    source = srcIp;
    destination = dstIp;
    protocol = 'IPv6';

    layers.push({
      name: 'Internet Protocol Version 6 (IPv6)',
      summary: `Src: ${srcIp}, Dst: ${dstIp}`,
      fields: [
        { label: 'Source Address', value: srcIp },
        { label: 'Destination Address', value: dstIp },
        { label: 'Payload Length', value: `${payloadLen} bytes` },
        { label: 'Next Header', value: String(nextHeader) },
        { label: 'Hop Limit', value: String(hopLimit) },
      ],
    });

    const l4Offset = l3Offset + 40;
    if (l4Offset <= raw.length) {
      const l4 = dissectL4(raw.subarray(l4Offset), nextHeader, srcIp, dstIp, layers);
      protocol = l4.protocol;
      info = l4.info;
      payload = l4.payload;
      srcPort = l4.srcPort;
      dstPort = l4.dstPort;
      streamId = l4.streamId;
      dnsNameForAlert = l4.dnsName;
    }
  }

  const payloadAscii = toPrintableAscii(payload);
  const ctfAlert = detectCtfSecret(payloadAscii, dnsNameForAlert);

  return {
    index,
    timestampSec,
    relativeTimeSec: Math.max(0, timestampSec - firstTimestampSec),
    capturedLength: raw.length,
    originalLength,
    source,
    destination,
    srcPort,
    dstPort,
    protocol,
    info,
    layers,
    raw,
    payload,
    payloadAscii,
    streamId,
    ctfAlert,
  };
}

function canonicalStreamKey(proto: 'TCP' | 'UDP', ipA: string, portA: number, ipB: string, portB: number): string {
  const left = `${ipA}:${portA}`;
  const right = `${ipB}:${portB}`;
  return left < right ? `${proto} ${left} <-> ${right}` : `${proto} ${right} <-> ${left}`;
}

function dissectL4(
  segment: Uint8Array,
  ipProto: number,
  srcIp: string,
  dstIp: string,
  layers: DissectedLayer[],
): {
  protocol: ParsedPacket['protocol'];
  info: string;
  payload: Uint8Array;
  srcPort?: number;
  dstPort?: number;
  streamId?: string;
  dnsName?: string;
} {
  // ICMP (1)
  if (ipProto === 1 && segment.length >= 8) {
    const type = segment[0];
    const code = segment[1];
    const id = readU16BE(segment, 4);
    const seq = readU16BE(segment, 6);
    const payload = segment.subarray(8);
    const typeLabel =
      type === 8 ? 'Echo (ping) request' : type === 0 ? 'Echo (ping) reply' : `Type ${type}, Code ${code}`;
    const asciiPreview = toPrintableAscii(payload).trim();
    layers.push({
      name: 'Internet Control Message Protocol (ICMP)',
      summary: `${typeLabel}, id=0x${id.toString(16)}, seq=${seq}`,
      fields: [
        { label: 'Type', value: `${type} (${typeLabel})` },
        { label: 'Code', value: String(code) },
        { label: 'Identifier', value: `0x${id.toString(16).padStart(4, '0')}` },
        { label: 'Sequence Number', value: String(seq) },
        ...(asciiPreview ? [{ label: 'Data (ASCII)', value: asciiPreview.slice(0, 120) }] : []),
      ],
    });
    return {
      protocol: 'ICMP',
      info: `${typeLabel} id=0x${id.toString(16)}, seq=${seq}${asciiPreview ? ` data="${asciiPreview.slice(0, 48)}"` : ''}`,
      payload,
    };
  }

  // TCP (6)
  if (ipProto === 6 && segment.length >= 20) {
    const srcPort = readU16BE(segment, 0);
    const dstPort = readU16BE(segment, 2);
    const seq = readU32BE(segment, 4);
    const ack = readU32BE(segment, 8);
    const dataOffset = (segment[12] >> 4) * 4;
    const flagsByte = segment[13];
    const windowSize = readU16BE(segment, 14);
    const flagNames: string[] = [];
    if (flagsByte & 0x02) flagNames.push('SYN');
    if (flagsByte & 0x10) flagNames.push('ACK');
    if (flagsByte & 0x08) flagNames.push('PSH');
    if (flagsByte & 0x01) flagNames.push('FIN');
    if (flagsByte & 0x04) flagNames.push('RST');
    if (flagsByte & 0x20) flagNames.push('URG');

    const payload = dataOffset <= segment.length ? segment.subarray(dataOffset) : new Uint8Array(0);
    const streamId = canonicalStreamKey('TCP', srcIp, srcPort, dstIp, dstPort);

    layers.push({
      name: 'Transmission Control Protocol (TCP)',
      summary: `${srcPort} → ${dstPort} [${flagNames.join(', ') || 'NONE'}] Seq=${seq} Ack=${ack} Len=${payload.length}`,
      fields: [
        { label: 'Source Port', value: String(srcPort) },
        { label: 'Destination Port', value: String(dstPort) },
        { label: 'Sequence Number', value: String(seq) },
        { label: 'Acknowledgment Number', value: String(ack) },
        { label: 'Header Length', value: `${dataOffset} bytes` },
        { label: 'Flags', value: `0x${flagsByte.toString(16).padStart(2, '0')} (${flagNames.join(', ') || 'None'})` },
        { label: 'Window Size', value: String(windowSize) },
        { label: 'TCP Payload', value: `${payload.length} bytes` },
      ],
    });

    // Check for HTTP inside TCP payload
    if (payload.length > 4) {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(payload);
      if (/^(GET|POST|PUT|DELETE|HEAD|OPTIONS|HTTP\/1\.[01])\s/.test(text)) {
        const lines = text.split(/\r?\n/);
        const firstLine = lines[0] ?? 'HTTP';
        const headerFields = lines
          .slice(1, 15)
          .filter(l => l.includes(':'))
          .map(l => {
            const idx = l.indexOf(':');
            return { label: l.slice(0, idx).trim(), value: l.slice(idx + 1).trim() };
          });
        const bodyIdx = text.indexOf('\r\n\r\n');
        const bodyPreview = bodyIdx !== -1 ? text.slice(bodyIdx + 4, bodyIdx + 240).trim() : '';
        if (bodyPreview) {
          headerFields.push({ label: 'Body', value: bodyPreview });
        }
        layers.push({
          name: 'Hypertext Transfer Protocol (HTTP)',
          summary: firstLine,
          fields: [{ label: 'Request / Status Line', value: firstLine }, ...headerFields],
        });
        return {
          protocol: 'HTTP',
          info: firstLine,
          payload,
          srcPort,
          dstPort,
          streamId,
        };
      }
    }

    return {
      protocol: 'TCP',
      info: `${srcPort} → ${dstPort} [${flagNames.join(', ')}] Seq=${seq} Win=${windowSize} Len=${payload.length}`,
      payload,
      srcPort,
      dstPort,
      streamId,
    };
  }

  // UDP (17)
  if (ipProto === 17 && segment.length >= 8) {
    const srcPort = readU16BE(segment, 0);
    const dstPort = readU16BE(segment, 2);
    const udpLen = readU16BE(segment, 4);
    const payload = segment.subarray(8);
    const streamId = canonicalStreamKey('UDP', srcIp, srcPort, dstIp, dstPort);

    layers.push({
      name: 'User Datagram Protocol (UDP)',
      summary: `${srcPort} → ${dstPort} Len=${payload.length}`,
      fields: [
        { label: 'Source Port', value: String(srcPort) },
        { label: 'Destination Port', value: String(dstPort) },
        { label: 'Length', value: `${udpLen} bytes` },
      ],
    });

    // DNS (port 53 or 5353)
    if ((srcPort === 53 || dstPort === 53 || srcPort === 5353 || dstPort === 5353) && payload.length >= 12) {
      const txId = readU16BE(payload, 0);
      const flags = readU16BE(payload, 2);
      const isResponse = (flags & 0x8000) !== 0;
      const qdCount = readU16BE(payload, 4);
      const anCount = readU16BE(payload, 6);
      const decodedQ = qdCount > 0 ? decodeDnsName(payload, 12) : { name: '', nextOffset: 12 };
      const qType =
        decodedQ.nextOffset + 2 <= payload.length ? readU16BE(payload, decodedQ.nextOffset) : 1;
      const qTypeName = DNS_QTYPES[qType] ?? `TYPE${qType}`;

      const dnsFields: { label: string; value: string }[] = [
        { label: 'Transaction ID', value: `0x${txId.toString(16).padStart(4, '0')}` },
        { label: 'Flags', value: isResponse ? 'Standard query response' : 'Standard query' },
        { label: 'Questions', value: String(qdCount) },
        { label: 'Answer RRs', value: String(anCount) },
      ];
      if (decodedQ.name) {
        dnsFields.push({ label: 'Query Name', value: decodedQ.name });
        dnsFields.push({ label: 'Query Type', value: qTypeName });
      }

      // Extract TXT or A answer preview if present
      let ansPreview = '';
      let ansOffset = decodedQ.nextOffset + 4;
      if (isResponse && anCount > 0 && ansOffset + 12 <= payload.length) {
        const ansName = decodeDnsName(payload, ansOffset);
        ansOffset = ansName.nextOffset;
        if (ansOffset + 10 <= payload.length) {
          const aType = readU16BE(payload, ansOffset);
          const rdLen = readU16BE(payload, ansOffset + 8);
          const rdataStart = ansOffset + 10;
          if (rdataStart + rdLen <= payload.length) {
            if (aType === 16 && rdLen >= 1) {
              // TXT record (first byte is length)
              const txtLen = payload[rdataStart];
              ansPreview = new TextDecoder('utf-8', { fatal: false }).decode(
                payload.subarray(rdataStart + 1, Math.min(rdataStart + 1 + txtLen, rdataStart + rdLen)),
              );
              dnsFields.push({ label: 'TXT Data', value: ansPreview });
            } else if (aType === 1 && rdLen === 4) {
              ansPreview = formatIpv4(payload, rdataStart);
              dnsFields.push({ label: 'Address', value: ansPreview });
            }
          }
        }
      }

      layers.push({
        name: 'Domain Name System (DNS)',
        summary: `${isResponse ? 'Response' : 'Query'} 0x${txId.toString(16)} ${qTypeName} ${decodedQ.name} ${ansPreview}`,
        fields: dnsFields,
      });

      return {
        protocol: 'DNS',
        info: `Standard query ${isResponse ? 'response ' : ''}0x${txId.toString(16)} ${qTypeName} ${decodedQ.name}${ansPreview ? ` -> "${ansPreview}"` : ''}`,
        payload,
        srcPort,
        dstPort,
        streamId,
        dnsName: decodedQ.name,
      };
    }

    return {
      protocol: 'UDP',
      info: `${srcPort} → ${dstPort} Len=${payload.length}`,
      payload,
      srcPort,
      dstPort,
      streamId,
    };
  }

  return {
    protocol: 'IPv4',
    info: `IPv4 Protocol ${ipProto} (${segment.length} bytes)`,
    payload: segment,
  };
}

export function parsePcapBuffer(bytes: Uint8Array): PcapAnalysisResult {
  if (bytes.length < 24) {
    return {
      format: 'Unknown',
      linkType: 1,
      linkTypeName: 'Unknown',
      packets: [],
      streams: {},
      ctfFindings: [],
      error: 'Capture buffer is smaller than a 24-byte PCAP header.',
    };
  }

  const magicBE = readU32BE(bytes, 0);
  if (magicBE === 0x0a0d0d0a) {
    return parsePcapNg(bytes);
  }

  let littleEndian = true;
  let nanoPrecision = false;
  if (magicBE === 0xa1b2c3d4) {
    littleEndian = false;
  } else if (magicBE === 0xd4c3b2a1) {
    littleEndian = true;
  } else if (magicBE === 0xa1b23c4d) {
    littleEndian = false;
    nanoPrecision = true;
  } else if (magicBE === 0x4d3cb2a1) {
    littleEndian = true;
    nanoPrecision = true;
  } else {
    return {
      format: 'Unknown',
      linkType: 1,
      linkTypeName: 'Unknown',
      packets: [],
      streams: {},
      ctfFindings: [],
      error: `Unrecognized PCAP/PCAPNG magic header (0x${magicBE.toString(16).padStart(8, '0')}).`,
    };
  }

  const u32 = littleEndian ? readU32LE : readU32BE;
  const linkType = u32(bytes, 20);
  const linkTypeName = linkType === 1 ? 'Ethernet (DLT_EN10MB)' : linkType === 101 ? 'Raw IP (DLT_RAW)' : `LinkType ${linkType}`;

  const packets: ParsedPacket[] = [];
  let offset = 24;
  let firstTs = 0;

  while (offset + 16 <= bytes.length && packets.length < 5000) {
    const tsSec = u32(bytes, offset);
    const tsSub = u32(bytes, offset + 4);
    const inclLen = u32(bytes, offset + 8);
    const origLen = u32(bytes, offset + 12);
    const dataStart = offset + 16;
    const dataEnd = dataStart + inclLen;
    if (inclLen > 262144 || dataEnd > bytes.length) break;

    const timestampSec = tsSec + (nanoPrecision ? tsSub / 1e9 : tsSub / 1e6);
    if (packets.length === 0) firstTs = timestampSec;

    const raw = bytes.subarray(dataStart, dataEnd);
    packets.push(
      dissectPacketBytes(raw, packets.length + 1, timestampSec, firstTs, origLen, linkType),
    );
    offset = dataEnd;
  }

  return finalizeAnalysis('PCAP', linkType, linkTypeName, packets);
}

function parsePcapNg(bytes: Uint8Array): PcapAnalysisResult {
  let offset = 0;
  let littleEndian = true;
  let linkType = 1;
  const packets: ParsedPacket[] = [];
  let firstTs = 0;

  while (offset + 12 <= bytes.length && packets.length < 5000) {
    const blockType = littleEndian ? readU32LE(bytes, offset) : readU32BE(bytes, offset);
    if (blockType === 0x0a0d0d0a && offset + 12 <= bytes.length) {
      const bom = readU32BE(bytes, offset + 8);
      littleEndian = bom !== 0x1a2b3c4d;
    }
    const u32 = littleEndian ? readU32LE : readU32BE;
    const u16 = littleEndian ? readU16LE : readU16BE;
    const blockLen = u32(bytes, offset + 4);
    if (blockLen < 12 || offset + blockLen > bytes.length) break;

    if (blockType === 0x00000001 && blockLen >= 20) {
      // Interface Description Block
      linkType = u16(bytes, offset + 8);
    } else if (blockType === 0x00000006 && blockLen >= 32) {
      // Enhanced Packet Block
      const tsHigh = u32(bytes, offset + 12);
      const tsLow = u32(bytes, offset + 16);
      const capLen = u32(bytes, offset + 20);
      const origLen = u32(bytes, offset + 24);
      const dataStart = offset + 28;
      if (dataStart + capLen <= offset + blockLen) {
        const tsMicros = tsHigh * 4294967296 + tsLow;
        const tsSec = tsMicros / 1e6;
        if (packets.length === 0) firstTs = tsSec;
        const raw = bytes.subarray(dataStart, dataStart + capLen);
        packets.push(dissectPacketBytes(raw, packets.length + 1, tsSec, firstTs, origLen, linkType));
      }
    } else if (blockType === 0x00000003 && blockLen >= 16) {
      // Simple Packet Block
      const origLen = u32(bytes, offset + 8);
      const capLen = Math.min(origLen, blockLen - 16);
      const dataStart = offset + 12;
      if (dataStart + capLen <= offset + blockLen) {
        const raw = bytes.subarray(dataStart, dataStart + capLen);
        packets.push(dissectPacketBytes(raw, packets.length + 1, packets.length * 0.001, firstTs, origLen, linkType));
      }
    }

    offset += blockLen;
  }

  const linkTypeName = linkType === 1 ? 'Ethernet (PCAPNG)' : `LinkType ${linkType}`;
  return finalizeAnalysis('PCAPNG', linkType, linkTypeName, packets);
}

function finalizeAnalysis(
  format: 'PCAP' | 'PCAPNG',
  linkType: number,
  linkTypeName: string,
  packets: ParsedPacket[],
): PcapAnalysisResult {
  const streams: PcapAnalysisResult['streams'] = {};
  const ctfFindings: PcapAnalysisResult['ctfFindings'] = [];

  for (const pkt of packets) {
    if (pkt.streamId && pkt.payload.length > 0 && (pkt.protocol === 'TCP' || pkt.protocol === 'HTTP' || pkt.protocol === 'UDP' || pkt.protocol === 'DNS')) {
      const proto = pkt.protocol === 'UDP' || pkt.protocol === 'DNS' ? 'UDP' : 'TCP';
      if (!streams[pkt.streamId]) {
        streams[pkt.streamId] = {
          id: pkt.streamId,
          protocol: proto,
          endpoints: [`${pkt.source}:${pkt.srcPort ?? 0}`, `${pkt.destination}:${pkt.dstPort ?? 0}`],
          segments: [],
        };
      }
      streams[pkt.streamId].segments.push({
        packetIndex: pkt.index,
        from: `${pkt.source}:${pkt.srcPort ?? 0}`,
        ascii: pkt.payloadAscii,
        bytes: pkt.payload,
      });
    }

    if (pkt.ctfAlert) {
      ctfFindings.push({
        packetIndex: pkt.index,
        protocol: pkt.protocol,
        summary: pkt.ctfAlert,
        extracted: pkt.payloadAscii.trim() || pkt.info,
      });
    }
  }

  return {
    format,
    linkType,
    linkTypeName,
    packets,
    streams,
    ctfFindings,
  };
}

// ============================================================================
// Deterministic Student CTF Sample PCAP Builders
// ============================================================================

function writeU16BEBuf(buf: number[], val: number): void {
  buf.push((val >> 8) & 0xff, val & 0xff);
}

function writeU32LEBuf(buf: number[], val: number): void {
  buf.push(val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff, (val >>> 24) & 0xff);
}

function writeU32BEBuf(buf: number[], val: number): void {
  buf.push((val >>> 24) & 0xff, (val >> 16) & 0xff, (val >> 8) & 0xff, val & 0xff);
}

function buildEthernetIpv4Frame(
  srcIp: [number, number, number, number],
  dstIp: [number, number, number, number],
  ipProto: number,
  l4Bytes: Uint8Array,
): Uint8Array {
  const frame: number[] = [
    // Dst MAC 00:16:3e:aa:bb:cc, Src MAC 00:16:3e:11:22:33, EtherType 0x0800
    0x00, 0x16, 0x3e, 0xaa, 0xbb, 0xcc,
    0x00, 0x16, 0x3e, 0x11, 0x22, 0x33,
    0x08, 0x00,
  ];
  const totalLen = 20 + l4Bytes.length;
  frame.push(
    0x45, 0x00,
    (totalLen >> 8) & 0xff, totalLen & 0xff,
    0x13, 0x37, 0x40, 0x00,
    64, ipProto,
    0x00, 0x00, // checksum placeholder
    ...srcIp,
    ...dstIp,
  );
  for (let i = 0; i < l4Bytes.length; i++) frame.push(l4Bytes[i]);
  return new Uint8Array(frame);
}

function buildTcpSegment(
  srcPort: number,
  dstPort: number,
  seq: number,
  ack: number,
  flags: number,
  payloadText = '',
): Uint8Array {
  const payload = new TextEncoder().encode(payloadText);
  const seg: number[] = [];
  writeU16BEBuf(seg, srcPort);
  writeU16BEBuf(seg, dstPort);
  writeU32BEBuf(seg, seq);
  writeU32BEBuf(seg, ack);
  seg.push(0x50, flags, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00);
  for (let i = 0; i < payload.length; i++) seg.push(payload[i]);
  return new Uint8Array(seg);
}

function buildUdpDnsPacket(
  srcPort: number,
  dstPort: number,
  txId: number,
  isResponse: boolean,
  qname: string,
  txtAnswer?: string,
): Uint8Array {
  const dns: number[] = [];
  writeU16BEBuf(dns, txId);
  writeU16BEBuf(dns, isResponse ? 0x8180 : 0x0100);
  writeU16BEBuf(dns, 1); // QDCOUNT
  writeU16BEBuf(dns, isResponse && txtAnswer ? 1 : 0); // ANCOUNT
  writeU16BEBuf(dns, 0);
  writeU16BEBuf(dns, 0);

  for (const label of qname.split('.')) {
    const b = new TextEncoder().encode(label);
    dns.push(b.length, ...Array.from(b));
  }
  dns.push(0);
  writeU16BEBuf(dns, 16); // TXT
  writeU16BEBuf(dns, 1);  // IN

  if (isResponse && txtAnswer) {
    dns.push(0xc0, 0x0c); // pointer to qname
    writeU16BEBuf(dns, 16); // TXT
    writeU16BEBuf(dns, 1);  // IN
    writeU32BEBuf(dns, 60); // TTL
    const txtBytes = new TextEncoder().encode(txtAnswer);
    writeU16BEBuf(dns, txtBytes.length + 1);
    dns.push(txtBytes.length, ...Array.from(txtBytes));
  }

  const udp: number[] = [];
  writeU16BEBuf(udp, srcPort);
  writeU16BEBuf(udp, dstPort);
  writeU16BEBuf(udp, 8 + dns.length);
  writeU16BEBuf(udp, 0);
  udp.push(...dns);
  return new Uint8Array(udp);
}

function buildIcmpEcho(type: number, seq: number, textPayload: string): Uint8Array {
  const payload = new TextEncoder().encode(textPayload);
  const icmp: number[] = [type, 0, 0, 0, 0x13, 0x37];
  writeU16BEBuf(icmp, seq);
  icmp.push(...Array.from(payload));
  return new Uint8Array(icmp);
}

function wrapFramesInPcap(frames: { tsOffsetMs: number; data: Uint8Array }[]): Uint8Array {
  const out: number[] = [];
  // Global header (24 bytes, little-endian microsecond PCAP, linkType = 1 Ethernet)
  writeU32LEBuf(out, 0xa1b2c3d4);
  out.push(2, 0, 4, 0);
  writeU32LEBuf(out, 0);
  writeU32LEBuf(out, 0);
  writeU32LEBuf(out, 65535);
  writeU32LEBuf(out, 1);

  const baseSec = 1729790000;
  for (const frame of frames) {
    const sec = baseSec + Math.floor(frame.tsOffsetMs / 1000);
    const usec = (frame.tsOffsetMs % 1000) * 1000;
    writeU32LEBuf(out, sec);
    writeU32LEBuf(out, usec);
    writeU32LEBuf(out, frame.data.length);
    writeU32LEBuf(out, frame.data.length);
    for (let i = 0; i < frame.data.length; i++) out.push(frame.data[i]);
  }
  return new Uint8Array(out);
}

export type PcapSampleId = 'http-credential-leak.pcap' | 'dns-exfiltration.pcap' | 'icmp-covert-tunnel.pcap';

export const PCAP_SAMPLES: {
  id: PcapSampleId;
  label: string;
  badge: string;
  description: string;
}[] = [
  {
    id: 'http-credential-leak.pcap',
    label: 'http-credential-leak.pcap',
    badge: 'HTTP Basic Auth + Flag',
    description: 'TCP handshake followed by an unencrypted HTTP POST login and CTF flag response.',
  },
  {
    id: 'dns-exfiltration.pcap',
    label: 'dns-exfiltration.pcap',
    badge: 'DNS Hex Exfiltration',
    description: 'Covert DNS TXT queries exfiltrating a hex-encoded flag across subdomain labels.',
  },
  {
    id: 'icmp-covert-tunnel.pcap',
    label: 'icmp-covert-tunnel.pcap',
    badge: 'ICMP Ping Tunnel',
    description: 'ICMP Echo Requests carrying secret ASCII payload chunks inside ping packets.',
  },
];

export function buildSamplePcap(id: PcapSampleId): Uint8Array {
  const client: [number, number, number, number] = [10, 10, 14, 25];
  const server: [number, number, number, number] = [192, 168, 56, 80];

  if (id === 'http-credential-leak.pcap') {
    const req = [
      'POST /admin/login HTTP/1.1',
      'Host: portal.cybercalc.ctf',
      'User-Agent: Mozilla/5.0 (CTF-Student-Lab)',
      'Authorization: Basic YWRtaW46aHVudGVyMl9jdGZfa2V5',
      'Content-Type: application/x-www-form-urlencoded',
      'Content-Length: 29',
      '',
      'username=admin&otp=73319042',
    ].join('\r\n');

    const resp = [
      'HTTP/1.1 200 OK',
      'Server: nginx/1.24.0',
      'Content-Type: application/json',
      'X-CTF-Hint: Check Base64 Authorization header too',
      '',
      '{"authenticated":true,"flag":"flag{wireshark_http_stream_mastery}"}',
    ].join('\r\n');

    return wrapFramesInPcap([
      { tsOffsetMs: 0, data: buildEthernetIpv4Frame(client, server, 6, buildTcpSegment(51422, 80, 1000, 0, 0x02)) },
      { tsOffsetMs: 12, data: buildEthernetIpv4Frame(server, client, 6, buildTcpSegment(80, 51422, 5000, 1001, 0x12)) },
      { tsOffsetMs: 24, data: buildEthernetIpv4Frame(client, server, 6, buildTcpSegment(51422, 80, 1001, 5001, 0x10)) },
      { tsOffsetMs: 45, data: buildEthernetIpv4Frame(client, server, 6, buildTcpSegment(51422, 80, 1001, 5001, 0x18, req)) },
      { tsOffsetMs: 88, data: buildEthernetIpv4Frame(server, client, 6, buildTcpSegment(80, 51422, 5001, 1001 + req.length, 0x18, resp)) },
      { tsOffsetMs: 110, data: buildEthernetIpv4Frame(client, server, 6, buildTcpSegment(51422, 80, 1001 + req.length, 5001 + resp.length, 0x11)) },
    ]);
  }

  if (id === 'dns-exfiltration.pcap') {
    const dnsServer: [number, number, number, number] = [8, 8, 8, 8];
    const hexPart1 = Buffer.from('flag{dns_sub', 'utf8').toString('hex');
    const hexPart2 = Buffer.from('domain_exfil}', 'utf8').toString('hex');
    return wrapFramesInPcap([
      {
        tsOffsetMs: 0,
        data: buildEthernetIpv4Frame(client, dnsServer, 17, buildUdpDnsPacket(54321, 53, 0x4101, false, `${hexPart1}.exfil.cybercalc.ctf`)),
      },
      {
        tsOffsetMs: 18,
        data: buildEthernetIpv4Frame(dnsServer, client, 17, buildUdpDnsPacket(53, 54321, 0x4101, true, `${hexPart1}.exfil.cybercalc.ctf`, 'ACK-CHUNK-1')),
      },
      {
        tsOffsetMs: 42,
        data: buildEthernetIpv4Frame(client, dnsServer, 17, buildUdpDnsPacket(54322, 53, 0x4102, false, `${hexPart2}.exfil.cybercalc.ctf`)),
      },
      {
        tsOffsetMs: 65,
        data: buildEthernetIpv4Frame(dnsServer, client, 17, buildUdpDnsPacket(53, 54322, 0x4102, true, `${hexPart2}.exfil.cybercalc.ctf`, 'FULL:flag{dns_subdomain_exfil}')),
      },
    ]);
  }

  // icmp-covert-tunnel.pcap
  return wrapFramesInPcap([
    { tsOffsetMs: 0, data: buildEthernetIpv4Frame(client, server, 1, buildIcmpEcho(8, 1, 'PING-BEACON:Part1=flag{icmp_')) },
    { tsOffsetMs: 15, data: buildEthernetIpv4Frame(server, client, 1, buildIcmpEcho(0, 1, 'PONG-ACK-1')) },
    { tsOffsetMs: 100, data: buildEthernetIpv4Frame(client, server, 1, buildIcmpEcho(8, 2, 'PING-BEACON:Part2=covert_ping_tunnel}')) },
    { tsOffsetMs: 118, data: buildEthernetIpv4Frame(server, client, 1, buildIcmpEcho(0, 2, 'PONG-ACK-2:flag{icmp_covert_ping_tunnel}')) },
  ]);
}
