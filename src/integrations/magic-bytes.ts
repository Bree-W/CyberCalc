export type AllowedImage = 'png' | 'jpeg' | 'gif' | 'webp' | 'bmp' | 'tiff';

const EXT: Record<AllowedImage, string> = {
  png: 'png',
  jpeg: 'jpg',
  gif: 'gif',
  webp: 'webp',
  bmp: 'bmp',
  tiff: 'tiff',
};

function has(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

/** Stricter than Aperi'Solve: only these image signatures may reach the worker. */
export function detectAllowedImage(bytes: Uint8Array): AllowedImage | null {
  if (has(bytes, [0x89, 0x50, 0x4e, 0x47])) return 'png';
  if (has(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (has(bytes, [0x47, 0x49, 0x46, 0x38])) return 'gif';
  if (has(bytes, [0x52, 0x49, 0x46, 0x46]) && has(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';
  if (has(bytes, [0x42, 0x4d])) return 'bmp';
  if (has(bytes, [0x49, 0x49, 0x2a, 0x00]) || has(bytes, [0x4d, 0x4d, 0x00, 0x2a])) return 'tiff';
  return null;
}

export function filenameForImage(name: string, kind: AllowedImage): string {
  const base = name.split(/[/\\]/).pop() ?? '';
  const ext = EXT[kind];
  const safe = /^[A-Za-z0-9._-]{1,80}$/.test(base);
  if (safe && kind === 'jpeg' && /\.jpe?g$/i.test(base)) return base;
  if (safe && base.toLowerCase().endsWith(`.${ext}`)) return base;
  return `upload.${ext}`;
}
