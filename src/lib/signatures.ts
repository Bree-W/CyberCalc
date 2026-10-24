import type { SignatureMatch } from '../types/analysis';

export interface SignatureDefinition {
  name: string;
  extension: string;
  mime: string;
  magic: number[];
  offset?: number; // expected start offset, default 0
  /** Extra bytes that must match, counted from the start of `magic`. */
  companion?: { offset: number; bytes: number[] };
  /** Search past offset 0. Short magics leave this off so "BM" does not match inside unrelated data. */
  allowEmbedded?: boolean;
  minBytesForPartial?: number;
  description: string;
}

export const SIGNATURE_DATABASE: SignatureDefinition[] = [
  {
    name: 'DOS MZ / PE Executable',
    extension: '.exe / .dll / .sys',
    mime: 'application/x-msdownload',
    magic: [0x4d, 0x5a],
    allowEmbedded: false,
    minBytesForPartial: 2,
    description: 'DOS MZ executable header used by MS-DOS, Windows Portable Executable (PE), and OS/2 binaries.',
  },
  {
    name: 'ELF (Executable and Linkable Format)',
    extension: '.elf / .so / .bin',
    mime: 'application/x-executable',
    magic: [0x7f, 0x45, 0x4c, 0x46],
    minBytesForPartial: 2,
    description: 'Standard binary format for executables, object code, shared libraries on Linux and Unix systems.',
  },
  {
    name: 'Mach-O 64-bit Binary (Native)',
    extension: '.dylib / Mach-O',
    mime: 'application/x-mach-binary',
    magic: [0xcf, 0xfa, 0xed, 0xfe],
    minBytesForPartial: 3,
    description: 'Apple macOS/iOS 64-bit Mach-O binary executable or dynamic library.',
  },
  {
    name: 'Mach-O 64-bit Binary (Reverse)',
    extension: '.dylib / Mach-O',
    mime: 'application/x-mach-binary',
    magic: [0xfe, 0xed, 0xfa, 0xcf],
    minBytesForPartial: 3,
    description: 'Apple macOS/iOS 64-bit Mach-O binary (big-endian/reverse byte order).',
  },
  {
    name: 'Java Class / Mach-O Fat Binary',
    extension: '.class',
    mime: 'application/java-vm',
    magic: [0xca, 0xfe, 0xba, 0xbe],
    minBytesForPartial: 3,
    description: 'Java bytecode compiled class file, or Apple Mach-O Universal/Fat binary container.',
  },
  {
    name: 'PNG (Portable Network Graphics)',
    extension: '.png',
    mime: 'image/png',
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    minBytesForPartial: 4,
    description: 'Lossless raster image format header featuring 8-byte magic sequence with high-bit and CRLF integrity checks.',
  },
  {
    name: 'JPEG / JFIF Image',
    extension: '.jpg / .jpeg',
    mime: 'image/jpeg',
    magic: [0xff, 0xd8, 0xff],
    minBytesForPartial: 2,
    description: 'JPEG Start of Image (SOI) marker followed by application marker segment.',
  },
  {
    name: 'GIF89a Image',
    extension: '.gif',
    mime: 'image/gif',
    magic: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    minBytesForPartial: 4,
    description: 'Graphics Interchange Format 89a specification header supporting transparency and animation.',
  },
  {
    name: 'GIF87a Image',
    extension: '.gif',
    mime: 'image/gif',
    magic: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    minBytesForPartial: 4,
    description: 'Graphics Interchange Format 87a specification header (original version).',
  },
  {
    name: 'PDF Document',
    extension: '.pdf',
    mime: 'application/pdf',
    magic: [0x25, 0x50, 0x44, 0x46], // %PDF
    minBytesForPartial: 3,
    description: 'Adobe Portable Document Format header. Usually followed by version digits such as -1.4 or -1.7.',
  },
  {
    name: 'ZIP Archive / Office OpenXML / APK / JAR',
    extension: '.zip / .docx / .xlsx / .apk / .jar',
    mime: 'application/zip',
    magic: [0x50, 0x4b, 0x03, 0x04],
    minBytesForPartial: 3,
    description: 'Standard PKZip local file header signature ("PK\\x03\\x04"). Also used by DOCX, XLSX, APK, JAR, and EPUB.',
  },
  {
    name: 'GZIP Compressed Archive',
    extension: '.gz / .tar.gz',
    mime: 'application/gzip',
    magic: [0x1f, 0x8b],
    allowEmbedded: false,
    minBytesForPartial: 2,
    description: 'GNU Zip compressed file container using DEFLATE compression algorithm.',
  },
  {
    name: '7-Zip Archive',
    extension: '.7z',
    mime: 'application/x-7z-compressed',
    magic: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c],
    minBytesForPartial: 4,
    description: '7-Zip compressed archive container format.',
  },
  {
    name: 'RAR Archive (v5.0+)',
    extension: '.rar',
    mime: 'application/x-rar-compressed',
    magic: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00],
    minBytesForPartial: 4,
    description: 'WinRAR archive version 5.0+ signature ("Rar!\\x1A\\x07\\x01\\x00").',
  },
  {
    name: 'RAR Archive (v4.x legacy)',
    extension: '.rar',
    mime: 'application/x-rar-compressed',
    magic: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00],
    minBytesForPartial: 4,
    description: 'Legacy WinRAR archive version 4.x and earlier ("Rar!\\x1A\\x07\\x00").',
  },
  {
    name: 'WebP Image (RIFF/WEBP)',
    extension: '.webp',
    mime: 'image/webp',
    magic: [0x52, 0x49, 0x46, 0x46],
    companion: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
    minBytesForPartial: 12,
    description: 'RIFF container whose form type at offset 8 is "WEBP". WAV and AVI share the RIFF prefix and are matched separately.',
  },
  {
    name: 'WAV Audio (RIFF/WAVE)',
    extension: '.wav',
    mime: 'audio/wav',
    magic: [0x52, 0x49, 0x46, 0x46],
    companion: { offset: 8, bytes: [0x57, 0x41, 0x56, 0x45] },
    minBytesForPartial: 12,
    description: 'RIFF container whose form type at offset 8 is "WAVE".',
  },
  {
    name: 'AVI Video (RIFF/AVI)',
    extension: '.avi',
    mime: 'video/avi',
    magic: [0x52, 0x49, 0x46, 0x46],
    companion: { offset: 8, bytes: [0x41, 0x56, 0x49, 0x20] },
    minBytesForPartial: 12,
    description: 'RIFF container whose form type at offset 8 is "AVI ".',
  },
  {
    name: 'WebM / Matroska Video',
    extension: '.mkv / .webm',
    mime: 'video/webm',
    magic: [0x1a, 0x45, 0xdf, 0xa3],
    minBytesForPartial: 3,
    description: 'Extensible Binary Meta Language (EBML) header for Matroska and WebM multimedia containers.',
  },
  {
    name: 'SQLite 3 Database',
    extension: '.sqlite / .db',
    mime: 'application/vnd.sqlite3',
    magic: [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00],
    minBytesForPartial: 6,
    description: 'SQLite version 3 database file format magic string header ("SQLite format 3\\0").',
  },
  {
    name: 'WebAssembly Binary (WASM)',
    extension: '.wasm',
    mime: 'application/wasm',
    magic: [0x00, 0x61, 0x73, 0x6d],
    minBytesForPartial: 4,
    description: 'WebAssembly binary format module magic header ("\\0asm").',
  },
  {
    name: 'PCAP Packet Capture (Microsecond)',
    extension: '.pcap',
    mime: 'application/vnd.tcpdump.pcap',
    magic: [0xd4, 0xc3, 0xb2, 0xa1],
    minBytesForPartial: 3,
    description: 'Libpcap network packet capture format (microsecond resolution, little-endian).',
  },
  {
    name: 'PCAP Packet Capture (Nanosecond)',
    extension: '.pcap',
    mime: 'application/vnd.tcpdump.pcap',
    magic: [0x4d, 0x3c, 0xb2, 0xa1],
    minBytesForPartial: 3,
    description: 'Libpcap network packet capture format (nanosecond resolution, little-endian).',
  },
  {
    name: 'PCAPNG Packet Capture Next Gen',
    extension: '.pcapng',
    mime: 'application/x-pcapng',
    magic: [0x0a, 0x0d, 0x0d, 0x0a],
    minBytesForPartial: 4,
    description: 'PCAP Next Generation Section Header Block magic number.',
  },
  {
    name: 'Windows Bitmap (BMP)',
    extension: '.bmp',
    mime: 'image/bmp',
    magic: [0x42, 0x4d],
    allowEmbedded: false,
    minBytesForPartial: 2,
    description: 'Device Independent Bitmap (DIB / BMP) magic signature ("BM"). Matched only at the start of the buffer.',
  },
  {
    name: 'TIFF Image (Little Endian)',
    extension: '.tiff / .tif',
    mime: 'image/tiff',
    magic: [0x49, 0x49, 0x2a, 0x00],
    minBytesForPartial: 3,
    description: 'Tagged Image File Format header using Intel little-endian ("II*\\0") byte ordering.',
  },
  {
    name: 'Windows Minidump Crash File',
    extension: '.dmp / .mdmp',
    mime: 'application/x-dmp',
    magic: [0x4d, 0x44, 0x4d, 0x50],
    minBytesForPartial: 4,
    description: 'Microsoft Windows minidump crash report signature ("MDMP").',
  },
  {
    name: 'x86 Shellcode NOP Sled',
    extension: 'shellcode',
    mime: 'application/octet-stream',
    magic: [0x90, 0x90, 0x90, 0x90, 0x90, 0x90, 0x90, 0x90],
    minBytesForPartial: 8,
    description: 'Eight consecutive x86 NOP (0x90) instructions. Shorter runs are left to the repeated-byte heuristic so ordinary padding is not called shellcode.',
  },
  {
    name: 'XML Document',
    extension: '.xml',
    mime: 'application/xml',
    magic: [0x3c, 0x3f, 0x78, 0x6d, 0x6c],
    minBytesForPartial: 4,
    description: 'Extensible Markup Language declaration prefix ("<?xml").',
  },
  {
    name: 'Rich Text Format (RTF)',
    extension: '.rtf',
    mime: 'application/rtf',
    magic: [0x7b, 0x5c, 0x72, 0x74, 0x66],
    minBytesForPartial: 4,
    description: 'Microsoft Rich Text Format document header ("{\\rtf").',
  },
];

const SIGNATURE_DISCLAIMER =
  'IMPORTANT FORENSIC NOTE: A file signature (magic byte) match identifies a known header sequence at this offset, but does NOT verify that the remainder of the data is uncorrupted, complete, or benign. Malware commonly spoofs headers or embeds polyglot payloads.';

function regionMatches(bytes: Uint8Array, offset: number, magic: number[]): boolean {
  if (offset < 0 || offset + magic.length > bytes.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (bytes[offset + i] !== magic[i]) return false;
  }
  return true;
}

function companionMatches(bytes: Uint8Array, base: number, sig: SignatureDefinition): boolean {
  if (!sig.companion) return true;
  return regionMatches(bytes, base + sig.companion.offset, sig.companion.bytes);
}

function matchedHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

export function detectSignatures(bytes: Uint8Array): SignatureMatch[] {
  if (bytes.length === 0) return [];

  const matches: SignatureMatch[] = [];

  for (const sig of SIGNATURE_DATABASE) {
    const expectedOffset = sig.offset ?? 0;
    const fullLength = sig.companion
      ? Math.max(sig.magic.length, sig.companion.offset + sig.companion.bytes.length)
      : sig.magic.length;
    const allowEmbedded = sig.allowEmbedded ?? sig.magic.length >= 4;

    if (regionMatches(bytes, expectedOffset, sig.magic) && companionMatches(bytes, expectedOffset, sig)) {
      const shown = sig.companion ? [...sig.magic, ...sig.companion.bytes] : sig.magic;
      matches.push({
        name: sig.name,
        extension: sig.extension,
        mime: sig.mime,
        offset: expectedOffset,
        confidence: 'exact',
        matchedHex: matchedHex(shown),
        description: sig.description,
        disclaimer: SIGNATURE_DISCLAIMER,
      });
      continue;
    }

    // Partial only when the buffer is shorter than the signature and has no companion
    // that still needs later bytes (RIFF alone is not a WebP).
    const minBytes = sig.minBytesForPartial ?? sig.magic.length;
    const endOfKnown = expectedOffset + fullLength;
    if (!sig.companion && bytes.length >= expectedOffset + minBytes && bytes.length < endOfKnown) {
      const available = bytes.length - expectedOffset;
      let isPartial = true;
      for (let i = 0; i < available && i < sig.magic.length; i++) {
        if (bytes[expectedOffset + i] !== sig.magic[i]) {
          isPartial = false;
          break;
        }
      }
      if (isPartial) {
        matches.push({
          name: `${sig.name} (Partial Match)`,
          extension: sig.extension,
          mime: sig.mime,
          offset: expectedOffset,
          confidence: 'partial',
          matchedHex: matchedHex(Array.from(bytes.slice(expectedOffset, expectedOffset + available))),
          description: `${sig.description} Note: Only ${available} of ${sig.magic.length} signature bytes are present in input.`,
          disclaimer: SIGNATURE_DISCLAIMER,
        });
        continue;
      }
    }

    if (!allowEmbedded || expectedOffset !== 0 || bytes.length > 4096) continue;

    const scanEnd = Math.min(bytes.length - fullLength, 256);
    for (let searchOffset = 1; searchOffset <= scanEnd; searchOffset++) {
      if (!regionMatches(bytes, searchOffset, sig.magic)) continue;
      if (!companionMatches(bytes, searchOffset, sig)) continue;
      matches.push({
        name: `${sig.name} (Embedded at offset 0x${searchOffset.toString(16).toUpperCase()})`,
        extension: sig.extension,
        mime: sig.mime,
        offset: searchOffset,
        confidence: 'partial',
        matchedHex: matchedHex(sig.magic),
        description: `${sig.description} [Discovered embedded inside the stream at offset +${searchOffset} bytes]`,
        disclaimer: SIGNATURE_DISCLAIMER,
      });
      break;
    }
  }

  return matches;
}
