import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { detectAllowedImage, type AllowedImage } from './magic-bytes.ts';

export interface AperiToolResult {
  status: 'ok' | 'empty' | 'error';
  output?: string | string[] | Record<string, string>;
  note?: string;
  error?: string;
  repairedPngBase64?: string;
}

export interface AperiAnalysisBundle {
  submissionHash: string;
  filename: string;
  kind: AllowedImage;
  size: number;
  width?: number;
  height?: number;
  repairedHeight?: number;
  repairedPngDataUrl?: string;
  md5: string;
  sha256: string;
  results: Record<string, AperiToolResult>;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function readU32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) >>> 0) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) >>> 0;
}

function writeU32BE(target: Uint8Array, offset: number, value: number): void {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function readU16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB (${bytes} bytes)`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB (${bytes} bytes)`;
}

interface PngInspection {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  colorTypeName: string;
  interlace: number;
  chunks: { type: string; length: number; crcStored: number; crcActual: number; offset: number; data: Uint8Array }[];
  trailingBytes: number;
  repairedHeight?: number;
  repairedBytes?: Uint8Array;
  textChunks: Record<string, string>;
}

const PNG_COLOR_TYPES: Record<number, string> = {
  0: 'Grayscale',
  2: 'RGB (Truecolor)',
  3: 'Indexed-color (Palette)',
  4: 'Grayscale + Alpha',
  6: 'RGBA (Truecolor + Alpha)',
};

function inspectPng(bytes: Uint8Array): PngInspection | null {
  if (bytes.length < 33 || detectAllowedImage(bytes) !== 'png') return null;
  const width = readU32BE(bytes, 16);
  const height = readU32BE(bytes, 20);
  const bitDepth = bytes[24];
  const colorType = bytes[25];
  const interlace = bytes[28];

  const chunks: PngInspection['chunks'] = [];
  const textChunks: Record<string, string> = {};
  let offset = 8;
  let trailingBytes = 0;

  while (offset + 8 <= bytes.length) {
    const length = readU32BE(bytes, offset);
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) break;
    const data = bytes.subarray(dataStart, dataEnd);
    const crcStored = readU32BE(bytes, dataEnd);
    const crcActual = crc32(bytes.subarray(offset + 4, dataEnd));
    chunks.push({ type, length, crcStored, crcActual, offset, data });

    if (type === 'tEXt' || type === 'iTXt') {
      const zeroIdx = data.indexOf(0);
      if (zeroIdx > 0) {
        const key = new TextDecoder('latin1').decode(data.subarray(0, zeroIdx));
        const val = new TextDecoder('utf-8', { fatal: false })
          .decode(data.subarray(zeroIdx + 1))
          .replace(/\0+/g, ' ')
          .trim();
        if (key && val) textChunks[key] = val;
      }
    } else if (type === 'zTXt') {
      const zeroIdx = data.indexOf(0);
      if (zeroIdx > 0 && zeroIdx + 2 < data.length) {
        const key = new TextDecoder('latin1').decode(data.subarray(0, zeroIdx));
        try {
          const inflated = zlib.inflateSync(data.subarray(zeroIdx + 2));
          textChunks[key] = new TextDecoder('utf-8', { fatal: false }).decode(inflated).trim();
        } catch {
          // ignore malformed zTXt
        }
      }
    }

    offset = dataEnd + 4;
    if (type === 'IEND') {
      if (offset < bytes.length) {
        trailingBytes = bytes.length - offset;
      }
      break;
    }
  }

  let repairedHeight: number | undefined;
  let repairedBytes: Uint8Array | undefined;
  const ihdr = chunks.find(c => c.type === 'IHDR');
  if (ihdr && ihdr.crcStored !== ihdr.crcActual && ihdr.length === 13) {
    const probe = new Uint8Array(17);
    probe.set(bytes.subarray(12, 29));
    for (let candH = 1; candH <= 4096; candH++) {
      writeU32BE(probe, 8, candH);
      if (crc32(probe) === ihdr.crcStored) {
        repairedHeight = candH;
        repairedBytes = new Uint8Array(bytes);
        writeU32BE(repairedBytes, 20, candH);
        break;
      }
    }
  }

  return {
    width,
    height,
    bitDepth,
    colorType,
    colorTypeName: PNG_COLOR_TYPES[colorType] ?? `Type ${colorType}`,
    interlace,
    chunks,
    trailingBytes,
    repairedHeight,
    repairedBytes,
    textChunks,
  };
}

function inspectJpeg(bytes: Uint8Array): { width?: number; height?: number; metadata: Record<string, string> } {
  const metadata: Record<string, string> = {};
  let width: number | undefined;
  let height: number | undefined;

  let offset = 2;
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break; // SOS or EOI
    const segLen = readU16BE(bytes, offset + 2);
    if (segLen < 2 || offset + 2 + segLen > bytes.length) break;
    const seg = bytes.subarray(offset + 4, offset + 2 + segLen);

    // SOF0 / SOF1 / SOF2
    if ((marker >= 0xc0 && marker <= 0xc3) && seg.length >= 5) {
      height = readU16BE(seg, 1);
      width = readU16BE(seg, 3);
      metadata['Frame Precision'] = `${seg[0]}-bit`;
      metadata['Frame Dimensions'] = `${width} x ${height}`;
    }

    // APP0 JFIF
    if (marker === 0xe0 && seg.length >= 14 && seg[0] === 0x4a && seg[1] === 0x46) {
      metadata['JFIF Version'] = `${seg[5]}.${String(seg[6]).padStart(2, '0')}`;
    }

    // APP1 Exif or XMP
    if (marker === 0xe1) {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(seg);
      if (text.includes('http://ns.adobe.com/xap/1.0/') || text.includes('<x:xmpmeta')) {
        const tagMatches = text.matchAll(/<([a-zA-Z0-9]+:[a-zA-Z0-9_-]+)>([^<]{1,240})<\/\1>/g);
        for (const match of tagMatches) {
          metadata[`XMP ${match[1]}`] = match[2].trim();
        }
        const xmptk = text.match(/x:xmptk=['"]([^'"]+)['"]/);
        if (xmptk) metadata['XMP Toolkit'] = xmptk[1];
      } else if (text.startsWith('Exif\0\0')) {
        const asciiHits = text.slice(6).match(/[\x20-\x7e]{4,}/g) ?? [];
        if (asciiHits.length > 0) {
          metadata['EXIF Strings'] = asciiHits.slice(0, 8).join(' | ');
        }
      }
    }

    // COM (JPEG comment)
    if (marker === 0xfe && seg.length > 0) {
      metadata['Comment'] = new TextDecoder('utf-8', { fatal: false }).decode(seg).trim();
    }

    offset += 2 + segLen;
  }

  return { width, height, metadata };
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function extractZstegPng(png: PngInspection): string[] {
  const source = png.repairedBytes ? inspectPng(png.repairedBytes) ?? png : png;
  if (source.bitDepth !== 8 || (source.colorType !== 2 && source.colorType !== 6)) {
    return [];
  }
  const bpp = source.colorType === 6 ? 4 : 3;
  const idatTotal = source.chunks.filter(c => c.type === 'IDAT').reduce((acc, c) => acc + c.data.length, 0);
  if (idatTotal === 0) return [];
  const idatConcat = new Uint8Array(idatTotal);
  let pos = 0;
  for (const chunk of source.chunks) {
    if (chunk.type === 'IDAT') {
      idatConcat.set(chunk.data, pos);
      pos += chunk.data.length;
    }
  }

  let raw: Uint8Array;
  try {
    raw = new Uint8Array(zlib.inflateSync(idatConcat));
  } catch {
    return [];
  }

  const stride = source.width * bpp;
  const expectedRow = stride + 1;
  const rows = Math.min(source.height, Math.floor(raw.length / expectedRow));
  if (rows <= 0) return [];

  const pixels = new Uint8Array(rows * stride);
  for (let y = 0; y < rows; y++) {
    const filter = raw[y * expectedRow];
    const rowIn = y * expectedRow + 1;
    const rowOut = y * stride;
    const prevOut = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const val = raw[rowIn + x];
      const a = x >= bpp ? pixels[rowOut + x - bpp] : 0;
      const b = y > 0 ? pixels[prevOut + x] : 0;
      const c = (y > 0 && x >= bpp) ? pixels[prevOut + x - bpp] : 0;
      let recon = val;
      if (filter === 1) recon = (val + a) & 0xff;
      else if (filter === 2) recon = (val + b) & 0xff;
      else if (filter === 3) recon = (val + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) recon = (val + paethPredictor(a, b, c)) & 0xff;
      pixels[rowOut + x] = recon;
    }
  }

  const findings: string[] = [];
  const maxPixels = Math.min(rows * source.width, 120_000);

  const probes: { label: string; channels: number[]; bit: number }[] = [
    { label: 'b1,r,lsb,xy', channels: [0], bit: 0 },
    { label: 'b1,g,lsb,xy', channels: [1], bit: 0 },
    { label: 'b1,b,lsb,xy', channels: [2], bit: 0 },
    { label: 'b1,rgb,lsb,xy', channels: [0, 1, 2], bit: 0 },
    { label: 'b1,rgba,lsb,xy', channels: bpp === 4 ? [0, 1, 2, 3] : [0, 1, 2], bit: 0 },
  ];

  for (const probe of probes) {
    const totalBits = maxPixels * probe.channels.length;
    const packed = new Uint8Array(Math.floor(totalBits / 8));
    let bitIdx = 0;
    for (let p = 0; p < maxPixels; p++) {
      const base = p * bpp;
      for (const ch of probe.channels) {
        const bit = (pixels[base + ch] >> probe.bit) & 1;
        const bytePos = bitIdx >> 3;
        if (bytePos >= packed.length) break;
        packed[bytePos] = (packed[bytePos] << 1) | bit;
        bitIdx++;
      }
    }

    // Look for clean ASCII runs at the start of the plane or anywhere in the first 8 KB
    const window = packed.subarray(0, Math.min(packed.length, 8192));
    const text = new TextDecoder('latin1').decode(window);
    const matches = text.match(/[\x20-\x7e]{8,}/g) ?? [];
    for (const candidate of matches) {
      // Filter out high-symbol random gibberish by requiring letters + spaces or CTF flag shapes
      const letters = (candidate.match(/[a-zA-Z0-9 ,.!?'":;-]/g) ?? []).length;
      if (letters / candidate.length >= 0.82 && /[a-zA-Z]{3,}/.test(candidate)) {
        findings.push(`${probe.label.padEnd(16, ' ')} .. text: ${JSON.stringify(candidate.slice(0, 160))}`);
        break;
      }
    }
  }

  return findings;
}

function scanBinwalkSignatures(bytes: Uint8Array): string[] {
  const sigs: { magic: number[]; label: string }[] = [
    { magic: [0x50, 0x4b, 0x03, 0x04], label: 'Zip archive data, at least v2.0 to extract' },
    { magic: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07], label: 'RAR archive data' },
    { magic: [0x1f, 0x8b, 0x08], label: 'gzip compressed data' },
    { magic: [0x25, 0x50, 0x44, 0x46, 0x2d], label: 'PDF document' },
    { magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], label: 'PNG image data' },
    { magic: [0xff, 0xd8, 0xff, 0xe0], label: 'JPEG image data, JFIF standard' },
    { magic: [0x7f, 0x45, 0x4c, 0x46], label: 'ELFexecutable binary' },
  ];

  const rows: string[] = [
    'DECIMAL       HEXADECIMAL     DESCRIPTION',
    '--------------------------------------------------------------------------------',
  ];

  for (let i = 0; i < bytes.length - 8; i++) {
    for (const sig of sigs) {
      let match = true;
      for (let k = 0; k < sig.magic.length; k++) {
        if (bytes[i + k] !== sig.magic[k]) {
          match = false;
          break;
        }
      }
      if (match) {
        const dec = String(i).padEnd(14, ' ');
        const hex = `0x${i.toString(16).toUpperCase()}`.padEnd(16, ' ');
        rows.push(`${dec}${hex}${sig.label}`);
      }
    }
  }
  return rows;
}

function extractReadableStrings(bytes: Uint8Array, limit = 80): string[] {
  const out: string[] = [];
  let start = -1;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    const printable = (b >= 0x20 && b <= 0x7e) || b === 0x09;
    if (printable) {
      if (start === -1) start = i;
    } else {
      if (start !== -1 && i - start >= 6) {
        out.push(new TextDecoder('latin1').decode(bytes.subarray(start, i)));
      }
      start = -1;
    }
  }
  if (start !== -1 && bytes.length - start >= 6) {
    out.push(new TextDecoder('latin1').decode(bytes.subarray(start)));
  }

  // Prioritize high-signal strings (XML/XMP tags, comments, URLs, words) before raw compressed noise
  const notable = out.filter(s => /[a-zA-Z]{4,}|http|xmlns|Author|flag|ctf|IHDR|IDAT|IEND/i.test(s));
  const combined = [...notable, ...out.filter(s => !notable.includes(s))];
  return combined.slice(0, limit);
}

export function analyzeImageLocally(
  bytes: Uint8Array,
  filename: string,
  options?: { password?: string; deep?: boolean },
): AperiAnalysisBundle {
  const kind = detectAllowedImage(bytes) ?? 'png';
  const md5 = crypto.createHash('md5').update(bytes).digest('hex');
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const png = kind === 'png' ? inspectPng(bytes) : null;
  const jpeg = kind === 'jpeg' ? inspectJpeg(bytes) : null;

  const width = png?.width ?? jpeg?.width;
  const height = png?.height ?? jpeg?.height;

  const results: Record<string, AperiToolResult> = {};

  // 1. zsteg (put high-signal stego findings first so firstExtractedText grabs the hidden payload)
  if (png) {
    const zstegHits = extractZstegPng(png);
    results.zsteg = zstegHits.length > 0
      ? { status: 'ok', output: zstegHits }
      : { status: 'empty', output: ['No LSB ASCII payload detected in standard RGB/RGBA bit planes.'] };
  }

  // 2. pcrt / pngcheck (IHDR CRC & chunk verification)
  if (png) {
    const chunkLines = png.chunks.map(c => {
      const ok = c.crcStored === c.crcActual;
      const crcHex = `0x${c.crcStored.toString(16).padStart(8, '0')}`;
      return ok
        ? `chunk ${c.type} at offset 0x${c.offset.toString(16).padStart(5, '0')}, length ${c.length} (CRC ${crcHex} OK)`
        : `CRC ERROR in chunk ${c.type} (computed 0x${c.crcActual.toString(16).padStart(8, '0')}, expected ${crcHex})`;
    });
    if (png.trailingBytes > 0) {
      chunkLines.push(`WARNING: ${png.trailingBytes} trailing byte(s) found after IEND chunk.`);
    }
    const hasBadCrc = png.chunks.some(c => c.crcStored !== c.crcActual);
    results.pngcheck = {
      status: 'ok',
      output: [
        `${filename}: ${png.width}x${png.height} (${png.bitDepth}-bit ${png.colorTypeName}, ${png.interlace ? 'interlaced' : 'non-interlaced'})`,
        ...chunkLines,
      ],
      ...(hasBadCrc
        ? {
            note: png.repairedHeight
              ? `IHDR CRC mismatch! Stored CRC matches height = ${png.repairedHeight}px (spoofed height was ${png.height}px). Auto-repaired below.`
              : 'Chunk CRC mismatch detected.',
          }
        : {}),
    };

    if (png.repairedHeight && png.repairedBytes) {
      const b64 = Buffer.from(png.repairedBytes).toString('base64');
      results.pcrt = {
        status: 'ok',
        output: [
          `[PCRT] PNG Check & Repair Tool`,
          `Spoofed IHDR dimensions : ${png.width} x ${png.height}`,
          `Stored IHDR CRC-32      : 0x${png.chunks[0].crcStored.toString(16).padStart(8, '0')}`,
          `Computed IHDR CRC-32    : 0x${png.chunks[0].crcActual.toString(16).padStart(8, '0')}`,
          `Recovered real height   : ${png.width} x ${png.repairedHeight} (CRC verified)`,
        ],
        repairedPngBase64: b64,
      };
    }
  }

  // 3. exiftool (XMP / EXIF / PNG text chunks + container metadata)
  const exifTable: Record<string, string> = {
    'File Name': filename,
    'File Size': formatSize(bytes.byteLength),
    'File Type': kind.toUpperCase(),
    'MIME Type': `image/${kind === 'jpeg' ? 'jpeg' : kind}`,
  };
  if (width && height) {
    exifTable['Image Size'] = `${width}x${height}`;
    exifTable['Megapixels'] = ((width * height) / 1_000_000).toFixed(3);
  }
  if (png) {
    exifTable['Bit Depth'] = String(png.bitDepth);
    exifTable['Color Type'] = png.colorTypeName;
    exifTable['Interlace'] = png.interlace ? 'Adam7 Interlace' : 'Noninterlaced';
    for (const [k, v] of Object.entries(png.textChunks)) {
      exifTable[`PNG ${k}`] = v;
    }
  }
  if (jpeg) {
    for (const [k, v] of Object.entries(jpeg.metadata)) {
      exifTable[k] = v;
    }
  }
  results.exiftool = { status: 'ok', output: exifTable };

  // 4. file & identify
  const fileDesc = png
    ? `${filename}: PNG image data, ${png.width} x ${png.height}, ${png.bitDepth}-bit/color ${png.colorTypeName}, non-interlaced`
    : jpeg && width && height
      ? `${filename}: JPEG image data, JFIF standard, ${width}x${height}`
      : `${filename}: ${kind.toUpperCase()} image data (${bytes.byteLength} bytes)`;
  results.file = { status: 'ok', output: fileDesc };

  results.identify = {
    status: 'ok',
    output: [
      `Image: ${filename}`,
      `Format: ${kind.toUpperCase()}`,
      ...(width && height ? [`Geometry: ${width}x${height}+0+0`] : []),
      `Filesize: ${formatSize(bytes.byteLength)}`,
      `MD5: ${md5}`,
      `SHA-256: ${sha256}`,
      ...(options?.deep ? ['Mode: Deep analysis enabled'] : []),
    ],
  };

  // 5. binwalk signature scan
  results.binwalk = {
    status: 'ok',
    output: scanBinwalkSignatures(bytes),
  };

  // 6. strings
  results.strings = {
    status: 'ok',
    output: extractReadableStrings(bytes, options?.deep ? 160 : 80),
  };

  return {
    submissionHash: md5,
    filename,
    kind,
    size: bytes.byteLength,
    width,
    height,
    repairedHeight: png?.repairedHeight,
    repairedPngDataUrl: png?.repairedBytes
      ? `data:image/png;base64,${Buffer.from(png.repairedBytes).toString('base64')}`
      : undefined,
    md5,
    sha256,
    results,
  };
}
