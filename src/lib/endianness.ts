export interface EndianInterpretation {
  byteLength: 2 | 4 | 8;
  typeLabel: string;
  bigEndianHex: string;
  littleEndianHex: string;
  bigEndianUnsigned: string;
  littleEndianUnsigned: string;
  bigEndianSigned: string;
  littleEndianSigned: string;
  floatBigEndian?: number | string;
  floatLittleEndian?: number | string;
  explanation: string;
}

export interface EndianAnalysisResult {
  inputHex: string;
  rawBytes: Uint8Array;
  interpretations: EndianInterpretation[];
  memoryLayout: Array<{
    offset: number;
    byteHex: string;
    byteDec: number;
    char: string;
    bigEndianSignificance: string;
    littleEndianSignificance: string;
  }>;
}

export function analyzeEndianness(bytes: Uint8Array): EndianAnalysisResult {
  const inputHex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
  const memoryLayout = Array.from(bytes).map((b, idx) => ({
    offset: idx,
    byteHex: b.toString(16).padStart(2, '0').toUpperCase(),
    byteDec: b,
    char: b >= 32 && b <= 126 ? String.fromCharCode(b) : '.',
    bigEndianSignificance: idx === 0 ? 'MSB (Most Significant Byte)' : idx === bytes.length - 1 ? 'LSB (Least Significant Byte)' : `Byte ${idx}`,
    littleEndianSignificance: idx === 0 ? 'LSB (Least Significant Byte)' : idx === bytes.length - 1 ? 'MSB (Most Significant Byte)' : `Byte ${idx}`,
  }));

  const interpretations: EndianInterpretation[] = [];

  // 16-bit (2 bytes)
  if (bytes.length >= 2) {
    const b0 = bytes[0];
    const b1 = bytes[1];

    const beHex = `${toHex2(b0)} ${toHex2(b1)}`;
    const leHex = `${toHex2(b1)} ${toHex2(b0)}`;

    const beUint = (b0 << 8) | b1;
    const leUint = (b1 << 8) | b0;

    const beInt = beUint > 32767 ? beUint - 65536 : beUint;
    const leInt = leUint > 32767 ? leUint - 65536 : leUint;

    interpretations.push({
      byteLength: 2,
      typeLabel: '16-bit Short / Word (uint16 / int16)',
      bigEndianHex: beHex,
      littleEndianHex: leHex,
      bigEndianUnsigned: beUint.toLocaleString(),
      littleEndianUnsigned: leUint.toLocaleString(),
      bigEndianSigned: beInt.toLocaleString(),
      littleEndianSigned: leInt.toLocaleString(),
      explanation: 'Big-Endian places high byte first (0x' + toHex2(b0) + ' << 8). Little-Endian places low byte first (x86/ARM standard).',
    });
  }

  // 32-bit (4 bytes)
  if (bytes.length >= 4) {
    const b0 = bytes[0], b1 = bytes[1], b2 = bytes[2], b3 = bytes[3];

    const beHex = `${toHex2(b0)} ${toHex2(b1)} ${toHex2(b2)} ${toHex2(b3)}`;
    const leHex = `${toHex2(b3)} ${toHex2(b2)} ${toHex2(b1)} ${toHex2(b0)}`;

    const beUint = ((b0 << 24) >>> 0) + ((b1 << 16) | (b2 << 8) | b3);
    const leUint = ((b3 << 24) >>> 0) + ((b2 << 16) | (b1 << 8) | b0);

    const beInt = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
    const leInt = (b3 << 24) | (b2 << 16) | (b1 << 8) | b0;

    // IEEE 754 Float32
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    bytes.slice(0, 4).forEach((v, i) => view.setUint8(i, v));

    const floatBE = view.getFloat32(0, false);
    const floatLE = view.getFloat32(0, true);

    interpretations.push({
      byteLength: 4,
      typeLabel: '32-bit Integer / DWord / Float (uint32 / int32 / float32)',
      bigEndianHex: beHex,
      littleEndianHex: leHex,
      bigEndianUnsigned: beUint.toLocaleString(),
      littleEndianUnsigned: leUint.toLocaleString(),
      bigEndianSigned: beInt.toLocaleString(),
      littleEndianSigned: leInt.toLocaleString(),
      floatBigEndian: formatFloat(floatBE),
      floatLittleEndian: formatFloat(floatLE),
      explanation:
        'Standard 32-bit integer. Big-Endian is standard network byte order (RFC 791). Little-Endian is standard x86/x64 instruction pointer & register architecture.',
    });
  }

  // 64-bit (8 bytes)
  if (bytes.length >= 8) {
    let beVal = 0n;
    let leVal = 0n;
    for (let i = 0; i < 8; i++) {
      beVal = (beVal << 8n) | BigInt(bytes[i]);
      leVal = (leVal << 8n) | BigInt(bytes[7 - i]);
    }

    const beSigned = beVal > 0x7FFFFFFFFFFFFFFFn ? beVal - 0x10000000000000000n : beVal;
    const leSigned = leVal > 0x7FFFFFFFFFFFFFFFn ? leVal - 0x10000000000000000n : leVal;

    // IEEE 754 Float64
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    bytes.slice(0, 8).forEach((v, i) => view.setUint8(i, v));

    const doubleBE = view.getFloat64(0, false);
    const doubleLE = view.getFloat64(0, true);

    interpretations.push({
      byteLength: 8,
      typeLabel: '64-bit Integer / QWord / Double (uint64 / int64 / float64)',
      bigEndianHex: Array.from(bytes.slice(0, 8)).map(toHex2).join(' '),
      littleEndianHex: Array.from(bytes.slice(0, 8)).reverse().map(toHex2).join(' '),
      bigEndianUnsigned: beVal.toString(),
      littleEndianUnsigned: leVal.toString(),
      bigEndianSigned: beSigned.toString(),
      littleEndianSigned: leSigned.toString(),
      floatBigEndian: formatFloat(doubleBE),
      floatLittleEndian: formatFloat(doubleLE),
      explanation: '64-bit quadword values. Essential for 64-bit memory addresses and file pointers in modern operating systems.',
    });
  }

  return {
    inputHex,
    rawBytes: bytes,
    interpretations,
    memoryLayout,
  };
}

function toHex2(n: number): string {
  return n.toString(16).padStart(2, '0').toUpperCase();
}

function formatFloat(f: number): string {
  if (isNaN(f)) return 'NaN';
  if (!isFinite(f)) return f > 0 ? '+Infinity' : '-Infinity';
  if (Math.abs(f) < 0.00001 || Math.abs(f) > 1000000) {
    return f.toExponential(6);
  }
  return f.toFixed(6);
}

// Byte Comparison (Binary Diff)
export interface ByteDiffEntry {
  offset: number;
  byteA?: number;
  byteB?: number;
  hexA: string;
  hexB: string;
  asciiA: string;
  asciiB: string;
  isMatch: boolean;
  status: 'match' | 'mismatch' | 'only_a' | 'only_b';
}

export interface BinaryDiffResult {
  totalA: number;
  totalB: number;
  matchingCount: number;
  mismatchCount: number;
  matchPercentage: number;
  entries: ByteDiffEntry[];
  entriesTruncated: boolean;
}

export function compareByteSequences(
  seqA: Uint8Array,
  seqB: Uint8Array,
  entryLimit = 4096,
): BinaryDiffResult {
  const maxLen = Math.max(seqA.length, seqB.length);
  const entries: ByteDiffEntry[] = [];
  let matchingCount = 0;
  let mismatchCount = 0;

  for (let i = 0; i < maxLen; i++) {
    const hasA = i < seqA.length;
    const hasB = i < seqB.length;
    const a = hasA ? seqA[i] : undefined;
    const b = hasB ? seqB[i] : undefined;

    let status: ByteDiffEntry['status'];
    let isMatch = false;

    if (hasA && hasB) {
      if (a === b) {
        status = 'match';
        isMatch = true;
        matchingCount++;
      } else {
        status = 'mismatch';
        mismatchCount++;
      }
    } else if (hasA) {
      status = 'only_a';
      mismatchCount++;
    } else {
      status = 'only_b';
      mismatchCount++;
    }

    if (i < entryLimit) {
      entries.push({
        offset: i,
        byteA: a,
        byteB: b,
        hexA: a !== undefined ? toHex2(a) : '--',
        hexB: b !== undefined ? toHex2(b) : '--',
        asciiA: a !== undefined && a >= 32 && a <= 126 ? String.fromCharCode(a) : '.',
        asciiB: b !== undefined && b >= 32 && b <= 126 ? String.fromCharCode(b) : '.',
        isMatch,
        status,
      });
    }
  }

  const matchPercentage = maxLen === 0 ? 100 : Number(((matchingCount / maxLen) * 100).toFixed(1));

  return {
    totalA: seqA.length,
    totalB: seqB.length,
    matchingCount,
    mismatchCount,
    matchPercentage,
    entries,
    entriesTruncated: maxLen > entries.length,
  };
}
