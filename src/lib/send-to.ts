import { buildCyberChefUrl, chefWindowPath } from '../integrations/cyberchef.ts';
import { detectAllowedImage } from '../integrations/magic-bytes.ts';
import type { WorkbenchTab } from '../types/analysis.ts';

export const SEND_TARGETS = [
  { id: 'byte-detective', label: 'Bytes' },
  { id: 'hash-detective', label: 'Hash' },
  { id: 'conversion-lab', label: 'Convert' },
  { id: 'bitwise-lab', label: 'XOR' },
  { id: 'reverse-eng', label: 'Endian' },
  { id: 'networking', label: 'Network' },
  { id: 'calculator', label: 'Calc' },
  { id: 'integrations', label: 'Tools' },
  { id: 'chef', label: 'Chef' },
  { id: 'aperi', label: 'Aperi' },
] as const;

export type SendTarget = (typeof SEND_TARGETS)[number]['id'];

export interface ToolParcel {
  hex: string;
  text: string;
}

export type SendRoute =
  | { kind: 'load'; tab: WorkbenchTab; payload: Record<string, string>; toast: string }
  | { kind: 'chef'; href: string; toast: string }
  | { kind: 'aperi'; toast: string }
  | { kind: 'reject'; toast: string };

const PENDING_KEY = 'cybercalc.pending';
const PARCEL_KEY = 'cybercalc.parcel';
const APERI_KEY = 'cybercalc.aperi';

export function parcelBytes(parcel: ToolParcel): Uint8Array {
  const compact = parcel.hex.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '');
  if (compact.length >= 2) {
    const even = compact.slice(0, compact.length - (compact.length % 2));
    const out = new Uint8Array(even.length / 2);
    for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(even.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  return new TextEncoder().encode(parcel.text);
}

export function spacedHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(' ');
}

export function routeParcel(target: SendTarget, parcel: ToolParcel): SendRoute {
  const bytes = parcelBytes(parcel);
  const text = parcel.text.trim();
  const hex = spacedHex(bytes);

  if (target === 'byte-detective') {
    if (bytes.length > 0) {
      return { kind: 'load', tab: target, payload: { input: hex, format: 'hex' }, toast: 'Sent to Byte Detective' };
    }
    return { kind: 'load', tab: target, payload: { input: text, format: 'text' }, toast: 'Sent to Byte Detective' };
  }

  if (target === 'hash-detective') {
    return {
      kind: 'load',
      tab: target,
      payload: { input: text || hex.replace(/\s+/g, '') },
      toast: 'Sent to Hash Detective',
    };
  }

  if (target === 'conversion-lab') {
    if (bytes.length === 0 && /^\d+$/.test(text)) {
      return { kind: 'load', tab: target, payload: { input: text, base: 'dec' }, toast: 'Sent to Conversion Lab' };
    }
    return {
      kind: 'load',
      tab: target,
      payload: { input: hex.replace(/\s+/g, ''), base: 'hex' },
      toast: 'Sent to Conversion Lab',
    };
  }

  if (target === 'bitwise-lab') {
    return {
      kind: 'load',
      tab: target,
      payload: { subtab: 'repeating-xor', data: hex || text },
      toast: 'Sent to repeating-key XOR',
    };
  }

  if (target === 'reverse-eng') {
    return {
      kind: 'load',
      tab: target,
      payload: { subtab: 'endianness', input: hex.split(' ').slice(0, 16).join(' ') },
      toast: 'Sent to endianness',
    };
  }

  if (target === 'networking') {
    if (text.includes(':') && /^[0-9a-f:]+$/i.test(text)) {
      return { kind: 'load', tab: target, payload: { subtab: 'ipv6', input: text }, toast: 'Sent to IPv6' };
    }
    const ipv4 = text.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?$/);
    if (ipv4) {
      return {
        kind: 'load',
        tab: target,
        payload: { subtab: 'ipv4-cidr', input: ipv4[1], ...(ipv4[2] ? { prefix: ipv4[2] } : {}) },
        toast: 'Sent to IPv4',
      };
    }
    if (bytes.length > 0) {
      return { kind: 'load', tab: target, payload: { subtab: 'tcp-flags', flag: String(bytes[0]) }, toast: 'Sent the first byte to TCP flags' };
    }
    return { kind: 'reject', toast: 'Network needs an IP address or at least one byte' };
  }

  if (target === 'calculator') {
    if (text && /^[\d+\-*/%().\s]+$/.test(text)) {
      return { kind: 'load', tab: target, payload: { expression: text }, toast: 'Sent to the calculator' };
    }
    return { kind: 'reject', toast: 'Calculator needs a number or an arithmetic expression' };
  }

  if (target === 'integrations') {
    return {
      kind: 'load',
      tab: target,
      payload: { hex: hex.slice(0, 2048), text: text.slice(0, 500) },
      toast: 'Sent to Integrations',
    };
  }

  if (target === 'chef') {
    if (bytes.length === 0) return { kind: 'reject', toast: 'Chef needs bytes or text' };
    const built = buildCyberChefUrl('magic', bytes);
    if (!built.url) return { kind: 'reject', toast: built.reason ?? 'That input is too long for Chef' };
    return { kind: 'chef', href: chefWindowPath(built.url), toast: 'Opened in Chef' };
  }

  if (!detectAllowedImage(bytes)) {
    return { kind: 'reject', toast: 'Aperi takes a PNG, JPEG, GIF, WebP, BMP, or TIFF' };
  }
  return { kind: 'aperi', toast: "Opened in Aperi'Solve" };
}

export function stagePending(route: Extract<SendRoute, { kind: 'load' }>) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ tab: route.tab, payload: route.payload, toast: route.toast }));
}

export function takePending(): Extract<SendRoute, { kind: 'load' }> | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { tab?: WorkbenchTab; payload?: Record<string, string>; toast?: string };
    if (!parsed.tab || !parsed.payload) return null;
    return { kind: 'load', tab: parsed.tab, payload: parsed.payload, toast: parsed.toast || 'Loaded' };
  } catch {
    return null;
  }
}

export function saveParcel(parcel: ToolParcel) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PARCEL_KEY, JSON.stringify({ hex: parcel.hex.slice(0, 8000), text: parcel.text.slice(0, 2000) }));
}

export function readParcel(): ToolParcel | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PARCEL_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { hex?: unknown; text?: unknown };
    return {
      hex: typeof parsed.hex === 'string' ? parsed.hex : '',
      text: typeof parsed.text === 'string' ? parsed.text : '',
    };
  } catch {
    return null;
  }
}

export function stageAperi(parcel: ToolParcel) {
  if (typeof window === 'undefined') return;
  const bytes = parcelBytes(parcel);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  const encoded = btoa(binary);
  if (encoded.length > 2_500_000) return false;
  sessionStorage.setItem(APERI_KEY, encoded);
  return true;
}

export function takeAperiBytes(): Uint8Array | null {
  if (typeof window === 'undefined') return null;
  const encoded = sessionStorage.getItem(APERI_KEY);
  sessionStorage.removeItem(APERI_KEY);
  if (!encoded) return null;
  try {
    const binary = atob(encoded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}
