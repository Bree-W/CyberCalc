export interface SubnetResult {
  ipAddress: string;
  cidrPrefix: number;
  ipInteger: number;
  ipHex: string;
  ipBinary: string;
  subnetMask: string;
  subnetMaskHex: string;
  subnetMaskBinary: string;
  wildcardMask: string;
  networkAddress: string;
  networkHex: string;
  broadcastAddress: string;
  broadcastHex: string;
  firstUsableHost: string;
  lastUsableHost: string;
  totalAddresses: number;
  usableHosts: number;
  ipClass: 'A' | 'B' | 'C' | 'D' | 'E';
  scope: string;
  isPrivate: boolean;
  bitVisualizer: Array<{
    bitIndex: number;
    octet: number;
    val: string;
    isNetworkBit: boolean;
  }>;
}

export interface TcpFlagsDecoded {
  rawByte: number;
  rawHex: string;
  rawBinary: string;
  flags: Array<{
    name: string;
    bitIndex: number;
    mask: number;
    set: boolean;
    description: string;
  }>;
  interpretation: string;
  ctfNote: string;
}

export function parseIpv4ToNumber(ipStr: string): number | null {
  const parts = ipStr.trim().split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (let i = 0; i < 4; i++) {
    const octet = Number(parts[i]);
    if (isNaN(octet) || octet < 0 || octet > 255 || !Number.isInteger(octet)) {
      return null;
    }
    num = (num << 8) | octet;
  }
  return num >>> 0;
}

export function numberToIpv4(num: number): string {
  const n = num >>> 0;
  return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
}

export function calculateSubnet(ipInput: string, prefixInput: number | string = 24): SubnetResult | { error: string } {
  let ipStr = ipInput.trim();
  let prefix = typeof prefixInput === 'number' ? prefixInput : parseInt(prefixInput.toString(), 10);

  // Check if input contains CIDR slash e.g. "192.168.1.50/24"
  if (ipStr.includes('/')) {
    const [addr, pfx] = ipStr.split('/');
    ipStr = addr.trim();
    prefix = parseInt(pfx.trim(), 10);
  }

  const ipNum = parseIpv4ToNumber(ipStr);
  if (ipNum === null) {
    return { error: `Invalid IPv4 address format "${ipInput}". Expected dotted quad like 192.168.1.1` };
  }

  if (isNaN(prefix) || prefix < 0 || prefix > 32) {
    return { error: `Invalid CIDR prefix /${prefix}. Expected an integer between 0 and 32.` };
  }

  // Calculate subnet mask
  const maskNum = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const wildcardNum = (~maskNum) >>> 0;

  const networkNum = (ipNum & maskNum) >>> 0;
  const broadcastNum = (networkNum | wildcardNum) >>> 0;

  const totalAddresses = Math.pow(2, 32 - prefix);
  let usableHosts = 0;
  let firstUsableHost = 'N/A';
  let lastUsableHost = 'N/A';

  if (prefix === 31) {
    // RFC 3021 Point-to-Point links
    usableHosts = 2;
    firstUsableHost = numberToIpv4(networkNum);
    lastUsableHost = numberToIpv4(broadcastNum);
  } else if (prefix === 32) {
    // Single host loopback / route
    usableHosts = 1;
    firstUsableHost = numberToIpv4(networkNum);
    lastUsableHost = numberToIpv4(networkNum);
  } else if (prefix < 31) {
    usableHosts = totalAddresses - 2;
    firstUsableHost = numberToIpv4(networkNum + 1);
    lastUsableHost = numberToIpv4(broadcastNum - 1);
  }

  // Determine Class
  const firstOctet = (ipNum >>> 24) & 255;
  let ipClass: SubnetResult['ipClass'] = 'C';
  if (firstOctet <= 127) ipClass = 'A';
  else if (firstOctet <= 191) ipClass = 'B';
  else if (firstOctet <= 223) ipClass = 'C';
  else if (firstOctet <= 239) ipClass = 'D'; // Multicast
  else ipClass = 'E'; // Experimental

  // Determine Scope
  let scope = 'Public Internet';
  let isPrivate = false;

  if (firstOctet === 10) {
    scope = 'Private (RFC 1918 Class A: 10.0.0.0/8)';
    isPrivate = true;
  } else if (firstOctet === 172 && ((ipNum >>> 16) & 255) >= 16 && ((ipNum >>> 16) & 255) <= 31) {
    scope = 'Private (RFC 1918 Class B: 172.16.0.0/12)';
    isPrivate = true;
  } else if (firstOctet === 192 && ((ipNum >>> 16) & 255) === 168) {
    scope = 'Private (RFC 1918 Class C: 192.168.0.0/16)';
    isPrivate = true;
  } else if (firstOctet === 127) {
    scope = 'Loopback Host (127.0.0.0/8)';
    isPrivate = true;
  } else if (firstOctet === 169 && ((ipNum >>> 16) & 255) === 254) {
    scope = 'Link-Local / APIPA (169.254.0.0/16)';
    isPrivate = true;
  } else if (firstOctet === 100 && ((ipNum >>> 16) & 255) >= 64 && ((ipNum >>> 16) & 255) <= 127) {
    scope = 'Shared Carrier-Grade NAT (RFC 6598: 100.64.0.0/10)';
  } else if (ipClass === 'D') {
    scope = 'Multicast (224.0.0.0/4)';
  } else if (ipClass === 'E') {
    scope = 'Reserved / Experimental (240.0.0.0/4)';
  }

  // Format representations
  const ipBinaryStr = ipNum.toString(2).padStart(32, '0');
  const maskBinaryStr = maskNum.toString(2).padStart(32, '0');

  const bitVisualizer = [];
  for (let i = 0; i < 32; i++) {
    bitVisualizer.push({
      bitIndex: i,
      octet: Math.floor(i / 8) + 1,
      val: ipBinaryStr[i],
      isNetworkBit: i < prefix,
    });
  }

  return {
    ipAddress: numberToIpv4(ipNum),
    cidrPrefix: prefix,
    ipInteger: ipNum,
    ipHex: '0x' + ipNum.toString(16).padStart(8, '0').toUpperCase(),
    ipBinary: ipBinaryStr.match(/.{1,8}/g)?.join(' ') || ipBinaryStr,
    subnetMask: numberToIpv4(maskNum),
    subnetMaskHex: '0x' + maskNum.toString(16).padStart(8, '0').toUpperCase(),
    subnetMaskBinary: maskBinaryStr.match(/.{1,8}/g)?.join(' ') || maskBinaryStr,
    wildcardMask: numberToIpv4(wildcardNum),
    networkAddress: numberToIpv4(networkNum),
    networkHex: '0x' + networkNum.toString(16).padStart(8, '0').toUpperCase(),
    broadcastAddress: numberToIpv4(broadcastNum),
    broadcastHex: '0x' + broadcastNum.toString(16).padStart(8, '0').toUpperCase(),
    firstUsableHost,
    lastUsableHost,
    totalAddresses,
    usableHosts,
    ipClass,
    scope,
    isPrivate,
    bitVisualizer,
  };
}

// TCP Flags Inspector
export function decodeTcpFlags(flagByte: number): TcpFlagsDecoded {
  const byte = flagByte & 0xff;
  const flagDefs = [
    { name: 'CWR', bitIndex: 7, mask: 0x80, description: 'Congestion Window Reduced (RFC 3168)' },
    { name: 'ECE', bitIndex: 6, mask: 0x40, description: 'ECN-Echo (Explicit Congestion Notification)' },
    { name: 'URG', bitIndex: 5, mask: 0x20, description: 'Urgent Pointer field significant' },
    { name: 'ACK', bitIndex: 4, mask: 0x10, description: 'Acknowledgment field significant' },
    { name: 'PSH', bitIndex: 3, mask: 0x08, description: 'Push function: request immediate app buffer delivery' },
    { name: 'RST', bitIndex: 2, mask: 0x04, description: 'Reset connection immediately' },
    { name: 'SYN', bitIndex: 1, mask: 0x02, description: 'Synchronize sequence numbers (initiate 3-way handshake)' },
    { name: 'FIN', bitIndex: 0, mask: 0x01, description: 'Finish: No more data from sender (graceful close)' },
  ];

  const decodedFlags = flagDefs.map(f => ({
    name: f.name,
    bitIndex: f.bitIndex,
    mask: f.mask,
    set: (byte & f.mask) !== 0,
    description: f.description,
  }));

  const activeNames = decodedFlags.filter(f => f.set).map(f => f.name);
  let interpretation = activeNames.length > 0 ? activeNames.join(' + ') : 'NULL (No flags set)';
  let ctfNote = '';

  if (byte === 0x00) {
    ctfNote = 'Nmap NULL Scan (-sN): All flags 0. Per RFC 793, closed ports reply with RST; open/filtered ports drop packet silently.';
  } else if (byte === 0x02) {
    ctfNote = 'Standard SYN packet (Step 1 of TCP 3-way handshake) or Nmap Stealth SYN scan (-sS).';
  } else if (byte === 0x12) {
    ctfNote = 'SYN-ACK packet: Server accepting connection (Step 2 of TCP 3-way handshake). Port is OPEN.';
  } else if (byte === 0x10) {
    ctfNote = 'Pure ACK packet: Step 3 of 3-way handshake or established data transfer.';
  } else if (byte === 0x18) {
    ctfNote = 'PSH-ACK: Common interactive data packet (e.g. SSH keystrokes, HTTP response stream).';
  } else if (byte === 0x04 || byte === 0x14) {
    ctfNote = 'RST or RST-ACK: Connection rejected or closed port response.';
  } else if (byte === 0x29) {
    ctfNote = 'Nmap Xmas Scan (-sX): FIN, PSH, and URG all set (lit up like a Christmas tree). Bypasses naive stateless firewalls.';
  } else if (byte === 0x01) {
    ctfNote = 'Nmap FIN Scan (-sF): Only FIN flag set. RFC 793 standard probe.';
  }

  return {
    rawByte: byte,
    rawHex: '0x' + byte.toString(16).padStart(2, '0').toUpperCase(),
    rawBinary: byte.toString(2).padStart(8, '0'),
    flags: decodedFlags,
    interpretation,
    ctfNote,
  };
}

// IPv6 Expansion and Analysis (Stretch Goal)
export function analyzeIpv6(ipv6Str: string): {
  isValid: boolean;
  expanded?: string;
  compressed?: string;
  scope?: string;
  error?: string;
} {
  const trimmed = ipv6Str.trim().toLowerCase();
  if (!trimmed) return { isValid: false, error: 'Empty IPv6 string.' };

  // Expand ::
  let parts: string[];
  if (trimmed.includes('::')) {
    const halves = trimmed.split('::');
    if (halves.length > 2) return { isValid: false, error: 'Invalid IPv6: multiple :: abbreviations.' };
    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves[1] ? halves[1].split(':') : [];
    const missing = 8 - (left.length + right.length);
    if (missing < 1) return { isValid: false, error: 'Invalid IPv6 group count.' };
    const zeros = new Array(missing).fill('0000');
    parts = [...left, ...zeros, ...right];
  } else {
    parts = trimmed.split(':');
  }

  if (parts.length !== 8) {
    return { isValid: false, error: `Invalid IPv6: expected 8 hextets, got ${parts.length}.` };
  }

  for (const p of parts) {
    if (!/^[0-9a-f]{1,4}$/i.test(p)) {
      return { isValid: false, error: `Invalid hextet "${p}".` };
    }
  }

  const expanded = parts.map(p => p.padStart(4, '0')).join(':');

  let scope = 'Global Unicast';
  if (expanded === '0000:0000:0000:0000:0000:0000:0000:0001') {
    scope = 'Loopback (::1/128)';
  } else if (expanded === '0000:0000:0000:0000:0000:0000:0000:0000') {
    scope = 'Unspecified (::/128)';
  } else if (expanded.startsWith('fe80:')) {
    scope = 'Link-Local Unicast (fe80::/10)';
  } else if (expanded.startsWith('fc') || expanded.startsWith('fd')) {
    scope = 'Unique Local Address (fc00::/7 - IPv6 Private)';
  } else if (expanded.startsWith('ff')) {
    scope = 'Multicast (ff00::/8)';
  }

  return {
    isValid: true,
    expanded,
    compressed: trimmed,
    scope,
  };
}
