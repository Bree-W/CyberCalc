import { ByteAnalysisResult, ByteInfo, DetectedPattern, InputFormat } from '../types/analysis';
import { parseRawInput } from './parse-input';
import { detectSignatures } from './signatures';

export function calculateEntropy(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  const frequencies = new Map<number, number>();
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    frequencies.set(b, (frequencies.get(b) || 0) + 1);
  }

  let entropy = 0;
  const len = bytes.length;
  for (const count of frequencies.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(3));
}

export function analyzeByteSequence(
  input: string | Uint8Array,
  explicitFormat: InputFormat = 'auto'
): ByteAnalysisResult {
  let bytes: Uint8Array;
  let detectedFormat: InputFormat = explicitFormat;
  let parseWarning: string | undefined;

  if (typeof input === 'string') {
    const parseRes = parseRawInput(input, explicitFormat);
    bytes = parseRes.bytes;
    detectedFormat = parseRes.formatDetected;
    parseWarning = parseRes.warning || parseRes.error;
  } else {
    bytes = input;
  }

  const totalBytes = bytes.length;
  const decimalList = Array.from(bytes);
  const hexParts: string[] = [];
  const binParts: string[] = [];
  const asciiChars: string[] = [];
  const byteDetails: ByteInfo[] = [];

  for (let i = 0; i < totalBytes; i++) {
    const b = bytes[i];
    const hex = b.toString(16).padStart(2, '0').toUpperCase();
    const bin = b.toString(2).padStart(8, '0');
    const signedDec = b > 127 ? b - 256 : b;
    const isPrintable = b >= 32 && b <= 126;
    const ascii = isPrintable ? String.fromCharCode(b) : '.';

    hexParts.push(hex);
    binParts.push(bin);
    asciiChars.push(ascii);

    byteDetails.push({
      offset: i,
      hex,
      bin,
      dec: b,
      signedDec,
      ascii: isPrintable ? String.fromCharCode(b) : (b === 0 ? '\\0' : b === 10 ? '\\n' : b === 13 ? '\\r' : b === 9 ? '\\t' : `0x${hex}`),
      isPrintable,
      highNibble: hex[0],
      lowNibble: hex[1],
    });
  }

  // UTF-8 Validation & Decoding
  let utf8String = '';
  let isValidUtf8 = true;
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    utf8String = decoder.decode(bytes);
  } catch {
    isValidUtf8 = false;
    // Fallback to lossy decoding with replacement characters
    const lossyDecoder = new TextDecoder('utf-8', { fatal: false });
    utf8String = lossyDecoder.decode(bytes);
  }

  const entropy = calculateEntropy(bytes);
  const signatures = detectSignatures(bytes);
  const patterns = detectPatterns(bytes, entropy);

  return {
    bytes,
    totalBytes,
    hexString: hexParts.join(' '),
    binaryString: binParts.join(' '),
    decimalList,
    asciiString: asciiChars.join(''),
    utf8String,
    isValidUtf8,
    entropy,
    signatures,
    patterns,
    byteDetails,
    detectedFormat,
    parseWarning,
  };
}

function detectPatterns(bytes: Uint8Array, entropy: number): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  if (bytes.length === 0) return patterns;

  // 1. Entropy analysis
  if (bytes.length >= 16) {
    if (entropy > 7.3) {
      patterns.push({
        type: 'high_entropy',
        title: 'High Entropy Detected (~' + entropy + ' bits/byte)',
        description: 'Data exhibits high information density characteristic of encrypted payloads, cryptographic keys, compressed archives (e.g. zlib/gzip), or random byte streams.',
      });
    } else if (entropy < 2.5 && bytes.length >= 8) {
      patterns.push({
        type: 'low_entropy',
        title: 'Low Entropy Detected (~' + entropy + ' bits/byte)',
        description: 'Data has low variability and high predictability, characteristic of sparse tables, null padding, repeated machine instructions (NOPs), or simple uncompressed data.',
      });
    }
  }

  // 2. Null byte runs
  let nullRun = 0;
  let maxNullRun = 0;
  let nullStart = -1;
  let longestNullStart = -1;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x00) {
      if (nullRun === 0) nullStart = i;
      nullRun++;
      if (nullRun > maxNullRun) {
        maxNullRun = nullRun;
        longestNullStart = nullStart;
      }
    } else {
      nullRun = 0;
    }
  }

  if (maxNullRun >= 4) {
    patterns.push({
      type: 'null_padding',
      title: `Null Byte Padding (${maxNullRun} consecutive zeros)`,
      description: `Run of ${maxNullRun} null bytes (0x00) starting at offset 0x${longestNullStart.toString(16).toUpperCase()} (+${longestNullStart}). Common in aligned binary structures, uninitialized memory buffers, or fixed-length record padding.`,
      offsetRange: [longestNullStart, longestNullStart + maxNullRun - 1],
    });
  }

  // 3. Repeated sequences (e.g., repeated single bytes or DWORD patterns)
  let repeatRun = 1;
  let maxRepeatRun = 1;
  let repeatByte = 0;
  let repeatStart = -1;
  for (let i = 1; i < bytes.length; i++) {
    if (bytes[i] === bytes[i - 1] && bytes[i] !== 0x00) {
      repeatRun++;
      if (repeatRun > maxRepeatRun) {
        maxRepeatRun = repeatRun;
        repeatByte = bytes[i];
        repeatStart = i - repeatRun + 1;
      }
    } else {
      repeatRun = 1;
    }
  }

  if (maxRepeatRun >= 4) {
    const hexVal = repeatByte.toString(16).padStart(2, '0').toUpperCase();
    patterns.push({
      type: 'repeated_bytes',
      title: `Repeated Byte Sequence (0x${hexVal} × ${maxRepeatRun})`,
      description: `Identical byte 0x${hexVal} repeated ${maxRepeatRun} times starting at offset 0x${repeatStart.toString(16).toUpperCase()}. Could represent memory fill, NOP sled (0x90), INT3 debug breakpoints (0xCC), or fill patterns.`,
      offsetRange: [repeatStart, repeatStart + maxRepeatRun - 1],
    });
  }

  // 4. Extract contiguous ASCII strings (length >= 4)
  const stringsFound: { str: string; offset: number }[] = [];
  let currentAscii = '';
  let strStart = -1;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b >= 32 && b <= 126) {
      if (currentAscii.length === 0) strStart = i;
      currentAscii += String.fromCharCode(b);
    } else {
      if (currentAscii.length >= 4) {
        stringsFound.push({ str: currentAscii, offset: strStart });
      }
      currentAscii = '';
    }
  }
  if (currentAscii.length >= 4) {
    stringsFound.push({ str: currentAscii, offset: strStart });
  }

  if (stringsFound.length > 0) {
    const preview = stringsFound.slice(0, 3).map(s => `"${s.str}" (+0x${s.offset.toString(16).toUpperCase()})`).join(', ');
    patterns.push({
      type: 'ascii_strings',
      title: `Embedded ASCII Strings (${stringsFound.length} extracted)`,
      description: `Discovered readable strings: ${preview}${stringsFound.length > 3 ? `, +${stringsFound.length - 3} more` : ''}.`,
      details: stringsFound.map(s => `[0x${s.offset.toString(16).padStart(4, '0')}] ${s.str}`).join('\n'),
    });
  }

  return patterns;
}
