import { parseRawInput } from './parse-input';

export type BitwiseOp = 'XOR' | 'AND' | 'OR' | 'NOT' | 'SHL' | 'SHR' | 'ROL' | 'ROR';

export interface BitwiseOperationResult {
  op: BitwiseOp;
  operandA: bigint;
  operandB?: bigint;
  result: bigint;
  width: number;
  binA: string;
  binB?: string;
  binResult: string;
  hexResult: string;
  decResult: string;
  explanation: string;
}

export function computeBitwiseOperation(
  valA: bigint,
  op: BitwiseOp,
  valB: bigint = 0n,
  width: 8 | 16 | 32 | 64 = 8
): BitwiseOperationResult {
  const mask = (1n << BigInt(width)) - 1n;
  const a = valA & mask;
  const b = valB & mask;
  let res = 0n;
  let explanation = '';

  switch (op) {
    case 'XOR':
      res = (a ^ b) & mask;
      explanation = 'Bitwise Exclusive OR: Result bit is 1 when exactly one operand bit is 1. (A ^ B)';
      break;
    case 'AND':
      res = (a & b) & mask;
      explanation = 'Bitwise AND: Result bit is 1 only when both operand bits are 1. Useful for masking bit fields.';
      break;
    case 'OR':
      res = (a | b) & mask;
      explanation = 'Bitwise OR: Result bit is 1 when at least one operand bit is 1. Useful for setting flag bits.';
      break;
    case 'NOT':
      res = (~a) & mask;
      explanation = 'Bitwise Inversion / One\'s Complement: Inverts every bit (0 -> 1, 1 -> 0).';
      break;
    case 'SHL': {
      const shift = Number(b % BigInt(width));
      res = (a << BigInt(shift)) & mask;
      explanation = `Logical Left Shift (<< ${shift}): Shifts bits left by ${shift} positions, filling lower bits with 0. Equivalent to multiplying by 2^${shift}.`;
      break;
    }
    case 'SHR': {
      const shift = Number(b % BigInt(width));
      res = (a >> BigInt(shift)) & mask;
      explanation = `Logical Right Shift (>> ${shift}): Shifts bits right by ${shift} positions, filling upper bits with 0. Equivalent to dividing by 2^${shift}.`;
      break;
    }
    case 'ROL': {
      const shift = Number(b % BigInt(width));
      res = ((a << BigInt(shift)) | (a >> BigInt(width - shift))) & mask;
      explanation = `Rotate Left (ROL ${shift}): Circularly rotates bits to the left, wrapping overflowed high bits into the lowest bits.`;
      break;
    }
    case 'ROR': {
      const shift = Number(b % BigInt(width));
      res = ((a >> BigInt(shift)) | (a << BigInt(width - shift))) & mask;
      explanation = `Rotate Right (ROR ${shift}): Circularly rotates bits to the right, wrapping lowest bits into the highest bit positions.`;
      break;
    }
  }

  const binA = a.toString(2).padStart(width, '0');
  const binB = op !== 'NOT' ? b.toString(2).padStart(width, '0') : undefined;
  const binResult = res.toString(2).padStart(width, '0');
  const hexResult = res.toString(16).padStart(width / 4, '0').toUpperCase();

  return {
    op,
    operandA: a,
    operandB: op !== 'NOT' ? b : undefined,
    result: res,
    width,
    binA,
    binB,
    binResult,
    hexResult,
    decResult: res.toString(10),
    explanation,
  };
}

export interface RepeatingXorResult {
  inputBytes: Uint8Array;
  keyBytes: Uint8Array;
  outputBytes: Uint8Array;
  inputHex: string;
  keyHex: string;
  outputHex: string;
  outputText: string;
  byteComparisons: Array<{
    offset: number;
    inByte: number;
    keyByte: number;
    outByte: number;
    inHex: string;
    keyHex: string;
    outHex: string;
    inAscii: string;
    outAscii: string;
    explanation: string;
  }>;
  educationalNote: string;
}

export function computeRepeatingKeyXor(
  dataInput: string,
  keyInput: string,
  keyType: 'hex' | 'text' | 'dec' = 'hex',
  dataType: 'hex' | 'text' | 'auto' = 'auto'
): RepeatingXorResult {
  const parsedData = parseRawInput(dataInput, dataType === 'auto' ? 'auto' : dataType);
  const dataBytes = parsedData.bytes;

  let keyBytes: Uint8Array;
  if (keyType === 'hex') {
    const parsedKey = parseRawInput(keyInput, 'hex');
    keyBytes = parsedKey.bytes.length > 0 ? parsedKey.bytes : new Uint8Array([0x20]);
  } else if (keyType === 'text') {
    keyBytes = new TextEncoder().encode(keyInput || ' ');
  } else {
    const num = parseInt(keyInput.trim(), 10);
    keyBytes = new Uint8Array([isNaN(num) ? 0x20 : num & 0xff]);
  }

  if (keyBytes.length === 0) {
    keyBytes = new Uint8Array([0x00]);
  }

  const outputBytes = new Uint8Array(dataBytes.length);
  const comparisons: RepeatingXorResult['byteComparisons'] = [];

  for (let i = 0; i < dataBytes.length; i++) {
    const inB = dataBytes[i];
    const keyB = keyBytes[i % keyBytes.length];
    const outB = inB ^ keyB;
    outputBytes[i] = outB;

    const inHex = inB.toString(16).padStart(2, '0').toUpperCase();
    const keyHex = keyB.toString(16).padStart(2, '0').toUpperCase();
    const outHex = outB.toString(16).padStart(2, '0').toUpperCase();

    const inAscii = inB >= 32 && inB <= 126 ? String.fromCharCode(inB) : '.';
    const outAscii = outB >= 32 && outB <= 126 ? String.fromCharCode(outB) : '.';

    let exp = `0x${inHex} (${inB}) ^ 0x${keyHex} (${keyB}) = 0x${outHex} (${outB})`;
    if (keyB === 0x20) {
      if (inB >= 0x41 && inB <= 0x5a) {
        exp += ` -> Toggled ASCII bit 5: Uppercase '${inAscii}' -> Lowercase '${outAscii}'`;
      } else if (inB >= 0x61 && inB <= 0x7a) {
        exp += ` -> Toggled ASCII bit 5: Lowercase '${inAscii}' -> Uppercase '${outAscii}'`;
      }
    }

    comparisons.push({
      offset: i,
      inByte: inB,
      keyByte: keyB,
      outByte: outB,
      inHex,
      keyHex,
      outHex,
      inAscii,
      outAscii,
      explanation: exp,
    });
  }

  const decoder = new TextDecoder('utf-8', { fatal: false });
  const outputText = decoder.decode(outputBytes);

  const educationalNote =
    'CRYPTOGRAPHY WARNING: XOR is a foundational symmetric mathematical operator (C = P ^ K, and P = C ^ K), but repeating-key XOR is NOT cryptographically secure. Because the key repeats cyclically, it is susceptible to Kasiski examination, Hamming-distance key-length recovery, and frequency analysis. XOR achieves perfect secrecy (Information-Theoretic Security) ONLY as a true One-Time Pad (OTP), where the key is truly random, never reused, and as long as the plaintext.';

  return {
    inputBytes: dataBytes,
    keyBytes,
    outputBytes,
    inputHex: Array.from(dataBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' '),
    keyHex: Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' '),
    outputHex: Array.from(outputBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' '),
    outputText,
    byteComparisons: comparisons,
    educationalNote,
  };
}

// Single-byte XOR brute force ranker (classic CTF utility)
export interface SingleByteXorCandidate {
  key: number;
  keyHex: string;
  keyChar: string;
  score: number;
  previewText: string;
}

export function rankSingleByteXorKeys(cipherBytes: Uint8Array): SingleByteXorCandidate[] {
  if (cipherBytes.length === 0) return [];
  const candidates: SingleByteXorCandidate[] = [];

  // English character frequency weights
  const freqMap: Record<string, number> = {
    'e': 12.7, 't': 9.1, 'a': 8.2, 'o': 7.5, 'i': 7.0, 'n': 6.7, 's': 6.3,
    'h': 6.1, 'r': 6.0, 'd': 4.3, 'l': 4.0, 'c': 2.8, 'u': 2.8, 'm': 2.4,
    'w': 2.4, 'f': 2.2, 'g': 2.0, 'y': 2.0, 'p': 1.9, 'b': 1.5, 'v': 1.0,
    'k': 0.8, 'j': 0.15, 'x': 0.15, 'q': 0.10, 'z': 0.07, ' ': 15.0,
  };

  for (let key = 0; key < 256; key++) {
    let score = 0;
    let chars: string[] = [];
    for (let i = 0; i < cipherBytes.length; i++) {
      const b = cipherBytes[i] ^ key;
      if (b >= 32 && b <= 126) {
        const char = String.fromCharCode(b).toLowerCase();
        score += freqMap[char] || 0.5;
        chars.push(String.fromCharCode(b));
      } else if (b === 10 || b === 13 || b === 9) {
        score += 1.0;
        chars.push(' ');
      } else {
        // Heavy penalty for non-printable characters
        score -= 20.0;
        chars.push('·');
      }
    }

    candidates.push({
      key,
      keyHex: key.toString(16).padStart(2, '0').toUpperCase(),
      keyChar: key >= 32 && key <= 126 ? String.fromCharCode(key) : `\\x${key.toString(16).padStart(2, '0')}`,
      score: Number(score.toFixed(1)),
      previewText: chars.join('').slice(0, 60),
    });
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 10);
}
