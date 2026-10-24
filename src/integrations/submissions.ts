import { POLL_DEADLINE_MS } from './constants.ts';

const started = new Map<string, number>();

export function isSubmissionHash(hash: string): boolean {
  return /^[a-f0-9]{32}$/.test(hash);
}

export function rememberSubmission(hash: string, now = Date.now()): void {
  started.set(hash, now);
}

export function submissionStartedAt(hash: string): number | undefined {
  return started.get(hash);
}

export function pollExpired(startedAt: number, now = Date.now()): boolean {
  return now - startedAt >= POLL_DEADLINE_MS;
}

export function resetSubmissions(): void {
  started.clear();
}
