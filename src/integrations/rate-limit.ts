import { RATE_WINDOW_MS, UPLOADS_PER_MINUTE } from './constants.ts';

const hits = new Map<string, number[]>();

export function clientKey(forwardedFor: string | null): string {
  const first = forwardedFor?.split(',')[0]?.trim() ?? '';
  if (!first || first.length > 80) return 'local';
  return first;
}

/** Returns true when the caller is still inside the 10-per-minute window. */
export function allowUpload(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter(stamp => now - stamp < RATE_WINDOW_MS);
  if (recent.length >= UPLOADS_PER_MINUTE) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function resetUploadLimits(): void {
  hits.clear();
}
