export type BitWidth = 8 | 16 | 32 | 64;

export interface ConversionState {
  binary: string;
  hex: string;
  octal: string;
  decimalUnsigned: string;
  decimalSigned: string;
  ascii: string;
  base64: string;
  bitWidth: BitWidth;
  steps: ConversionStep[];
  error?: string;
  isOverflow: boolean;
}

export interface ConversionStep {
  title: string;
  formula: string;
  explanation: string;
}

export function getBitWidthLimits(width: BitWidth) {
  const maxUnsigned = (1n << BigInt(width)) - 1n;
  const maxSigned = (1n << BigInt(width - 1)) - 1n;
  const minSigned = -(1n << BigInt(width - 1));
  return { maxUnsigned, maxSigned, minSigned };
}

export function convertFromValue(
  valueStr: string,
  fromBase: 'bin' | 'hex' | 'dec' | 'oct' | 'text',
  bitWidth: BitWidth = 32
): ConversionState {
  const trimmed = valueStr.trim();
  if (!trimmed) {
    return {
      binary: '0'.repeat(bitWidth),
      hex: '0'.repeat(bitWidth / 4),
      octal: '0',
      decimalUnsigned: '0',
      decimalSigned: '0',
      ascii: '',
      base64: '',
      bitWidth,
      steps: [],
      isOverflow: false,
    };
  }

  const { maxUnsigned, minSigned, maxSigned } = getBitWidthLimits(bitWidth);
  const mask = maxUnsigned;
  let rawBigInt = 0n;
  let isOverflow = false;
  const steps: ConversionStep[] = [];

  try {
    if (fromBase === 'bin') {
      const cleanBin = trimmed.replace(/[\s_]/g, '');
      if (!/^[01]+$/.test(cleanBin)) {
        return createErrorState('Invalid binary characters. Only 0 and 1 allowed.', bitWidth);
      }
      if (cleanBin.length > bitWidth) {
        isOverflow = true;
      }
      rawBigInt = BigInt('0b' + cleanBin);
      steps.push({
        title: 'Binary Positional Weights',
        formula: cleanBin.split('').reverse().map((b, i) => `${b} × 2^${i}`).filter((_, i) => cleanBin[cleanBin.length - 1 - i] === '1').join(' + ') || '0',
        explanation: `Each bit position corresponds to an increasing power of 2 from right (2^0) to left (2^${cleanBin.length - 1}).`,
      });
    } else if (fromBase === 'hex') {
      const cleanHex = trimmed.replace(/^0x/i, '').replace(/[\s_]/g, '');
      if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
        return createErrorState('Invalid hexadecimal characters. Permitted: [0-9, a-f, A-F].', bitWidth);
      }
      if (cleanHex.length * 4 > bitWidth) {
        isOverflow = true;
      }
      rawBigInt = BigInt('0x' + cleanHex);
      steps.push({
        title: 'Hexadecimal to Value',
        formula: cleanHex.split('').reverse().map((h, i) => `0x${h.toUpperCase()} × 16^${i}`).join(' + '),
        explanation: `Each hexadecimal digit represents a 4-bit nibble weighted by powers of 16.`,
      });
    } else if (fromBase === 'oct') {
      const cleanOct = trimmed.replace(/^0o/i, '').replace(/[\s_]/g, '');
      if (!/^[0-7]+$/.test(cleanOct)) {
        return createErrorState('Invalid octal characters. Permitted: [0-7].', bitWidth);
      }
      rawBigInt = BigInt('0o' + cleanOct);
      steps.push({
        title: 'Octal Positional Value',
        formula: cleanOct.split('').reverse().map((d, i) => `${d} × 8^${i}`).join(' + '),
        explanation: 'Each octal digit groups 3 bits together, weighted by powers of 8.',
      });
    } else if (fromBase === 'dec') {
      const cleanDec = trimmed.replace(/[\s_,]/g, '');
      if (!/^-?\d+$/.test(cleanDec)) {
        return createErrorState('Invalid decimal integer format.', bitWidth);
      }
      const parsed = BigInt(cleanDec);
      if (parsed < minSigned || parsed > maxUnsigned) {
        isOverflow = true;
      }
      // Handle negative decimal input via two's complement modulo 2^bitWidth
      if (parsed < 0n) {
        rawBigInt = ((parsed % (1n << BigInt(bitWidth))) + (1n << BigInt(bitWidth))) & mask;
        steps.push({
          title: "Two's Complement Encoding for Negative Value",
          formula: `${parsed} + 2^${bitWidth} = ${rawBigInt}`,
          explanation: `In ${bitWidth}-bit two's complement, negative numbers are represented by adding 2^${bitWidth} to map into unsigned integer space.`,
        });
      } else {
        rawBigInt = parsed & mask;
      }
    } else if (fromBase === 'text') {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(trimmed);
      let acc = 0n;
      for (const b of bytes) {
        acc = (acc << 8n) | BigInt(b);
      }
      rawBigInt = acc & mask;
      steps.push({
        title: 'UTF-8 Byte Encoding',
        formula: Array.from(bytes).map(b => `0x${b.toString(16).toUpperCase()}`).join(' '),
        explanation: `Converted text characters to standard UTF-8 byte stream. Total: ${bytes.length} bytes.`,
      });
    }
  } catch (err: any) {
    return createErrorState(`Conversion error: ${err.message}`, bitWidth);
  }

  // Bound within current bitWidth mask
  const boundedUnsigned = rawBigInt & mask;
  
  // Signed interpretation (check sign bit at position bitWidth - 1)
  const signBit = 1n << BigInt(bitWidth - 1);
  let decimalSigned: bigint;
  if ((boundedUnsigned & signBit) !== 0n) {
    // Negative number in two's complement
    decimalSigned = boundedUnsigned - (1n << BigInt(bitWidth));
  } else {
    decimalSigned = boundedUnsigned;
  }

  // Format outputs
  const binPad = boundedUnsigned.toString(2).padStart(bitWidth, '0');
  const hexPad = boundedUnsigned.toString(16).padStart(bitWidth / 4, '0').toUpperCase();
  const octVal = boundedUnsigned.toString(8);

  // Group binary string into 4-bit nibbles or 8-bit bytes
  const groupedBin = binPad.match(/.{1,4}/g)?.join(' ') || binPad;

  // Text / ASCII decode of bytes
  let asciiText = '';
  const byteCount = bitWidth / 8;
  const rawBytes: number[] = [];
  for (let i = byteCount - 1; i >= 0; i--) {
    const shift = BigInt(i * 8);
    const b = Number((boundedUnsigned >> shift) & 0xFFn);
    rawBytes.push(b);
    asciiText += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
  }

  let base64 = '';
  try {
    const binStr = rawBytes.map(b => String.fromCharCode(b)).join('');
    base64 = btoa(binStr);
  } catch {
    base64 = 'N/A';
  }

  if (steps.length === 0) {
    steps.push({
      title: 'Representation Breakdown',
      formula: `Unsigned: ${boundedUnsigned.toString(10)} | Signed: ${decimalSigned.toString(10)}`,
      explanation: `Sign bit: ${binPad[0]} (${binPad[0] === '1' ? 'Negative' : 'Positive'}). Bit length: ${bitWidth} bits.`,
    });
  }

  return {
    binary: groupedBin,
    hex: hexPad,
    octal: octVal,
    decimalUnsigned: boundedUnsigned.toString(10),
    decimalSigned: decimalSigned.toString(10),
    ascii: asciiText,
    base64,
    bitWidth,
    steps,
    isOverflow,
  };
}

function createErrorState(errorMsg: string, bitWidth: BitWidth): ConversionState {
  return {
    binary: '',
    hex: '',
    octal: '',
    decimalUnsigned: '',
    decimalSigned: '',
    ascii: '',
    base64: '',
    bitWidth,
    steps: [],
    error: errorMsg,
    isOverflow: false,
  };
}
