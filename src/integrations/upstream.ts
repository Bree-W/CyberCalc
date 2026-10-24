import fs from 'node:fs/promises';
import path from 'node:path';
import { APERISOLVE_ORIGIN, MAX_CONTENT_LENGTH, UPSTREAM_TIMEOUT_MS } from './constants.ts';
import { detectAllowedImage, filenameForImage } from './magic-bytes.ts';
import { redactSecret } from './redact.ts';
import { sanitizeResults } from './results.ts';
import { isSubmissionHash, pollExpired, rememberSubmission, submissionStartedAt } from './submissions.ts';

const SAMPLE_NAMES = new Set(['example1.png', 'example2.jpg', 'example3.png']);

const DOWN_TODO = 'Start it with scripts/aperisolve-up.sh. The adapter does not run analyzers on the host.';

export interface UploadOutcome {
  ok: boolean;
  status: number;
  submissionHash?: string;
  error?: string;
  todo?: string;
}

export function resolveSamplePath(name: string): string | null {
  if (!SAMPLE_NAMES.has(name)) return null;
  const root = path.resolve(process.cwd(), 'Combined_Repos/AperiSolve/examples');
  const file = path.resolve(root, name);
  if (file !== path.join(root, name)) return null;
  return file;
}

export async function forwardUpload(
  bytes: Uint8Array,
  filename: string,
  options?: { password?: string; deep?: boolean },
): Promise<UploadOutcome> {
  const password = options?.password || undefined;
  if (bytes.byteLength > MAX_CONTENT_LENGTH) {
    return { ok: false, status: 413, error: 'Upload exceeds 3145728 bytes' };
  }
  const kind = detectAllowedImage(bytes);
  if (!kind) {
    return { ok: false, status: 415, error: 'File type is not in the image allowlist' };
  }

  const form = new FormData();
  form.append('image', new Blob([Buffer.from(bytes)]), filenameForImage(filename, kind));
  if (password) form.append('password', password);
  if (options?.deep) form.append('deep', 'true');

  let response: Response;
  try {
    response = await fetch(`${APERISOLVE_ORIGIN}/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'TimeoutError' || name === 'AbortError') {
      return { ok: false, status: 504, error: 'Upstream timed out' };
    }
    return { ok: false, status: 503, error: "Aperi'Solve is not running", todo: DOWN_TODO };
  }

  const raw = await response.text();
  let parsed: { error?: unknown; submission_hash?: unknown } = {};
  try {
    parsed = JSON.parse(raw) as { error?: unknown; submission_hash?: unknown };
  } catch {
    return { ok: false, status: 502, error: "Aperi'Solve returned an unexpected response" };
  }

  if (response.ok && typeof parsed.submission_hash === 'string' && isSubmissionHash(parsed.submission_hash)) {
    rememberSubmission(parsed.submission_hash);
    return { ok: true, status: 200, submissionHash: parsed.submission_hash };
  }

  const message = typeof parsed.error === 'string'
    ? redactSecret(parsed.error, password)
    : "Aperi'Solve rejected the upload";
  return { ok: false, status: response.status || 502, error: message };
}

export async function readSample(name: string): Promise<{ bytes: Uint8Array } | { error: string; status: number; todo?: string }> {
  const file = resolveSamplePath(name);
  if (!file) return { error: 'Unknown sample', status: 400 };
  try {
    const stat = await fs.stat(file);
    if (stat.size > MAX_CONTENT_LENGTH) return { error: 'Upload exceeds 3145728 bytes', status: 413 };
    const bytes = new Uint8Array(await fs.readFile(file));
    return { bytes };
  } catch {
    return {
      error: 'Example image is not in the local checkout',
      status: 503,
      todo: 'Run scripts/bootstrap-tools.sh, then scripts/aperisolve-up.sh.',
    };
  }
}

export async function fetchUpstreamStatus(hash: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const gate = gateHash(hash);
  if (gate) return gate;
  try {
    const response = await fetch(`${APERISOLVE_ORIGIN}/status/${hash}`, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) {
      return { status: 502, body: { error: 'Status unavailable', submissionHash: hash } };
    }
    const data = (await response.json()) as { status?: unknown };
    return {
      status: 200,
      body: {
        status: typeof data.status === 'string' ? data.status : 'unknown',
        submissionHash: hash,
      },
    };
  } catch {
    return { status: 504, body: { error: 'Upstream timed out', submissionHash: hash } };
  }
}

export async function fetchUpstreamResult(hash: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const gate = gateHash(hash);
  if (gate) return gate;
  try {
    const response = await fetch(`${APERISOLVE_ORIGIN}/result/${hash}`, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (response.status === 425) {
      return { status: 425, body: { error: 'Results not ready yet', submissionHash: hash } };
    }
    if (!response.ok) {
      return { status: 502, body: { error: 'Results unavailable', submissionHash: hash } };
    }
    const data = (await response.json()) as { results?: unknown };
    return { status: 200, body: { results: sanitizeResults(data.results), submissionHash: hash } };
  } catch {
    return { status: 504, body: { error: 'Upstream timed out', submissionHash: hash } };
  }
}

function gateHash(hash: string): { status: number; body: Record<string, unknown> } | null {
  if (!isSubmissionHash(hash)) {
    return { status: 400, body: { error: 'Invalid submission hash' } };
  }
  const startedAt = submissionStartedAt(hash);
  if (startedAt === undefined) {
    return { status: 404, body: { error: 'Unknown submission' } };
  }
  if (pollExpired(startedAt)) {
    return { status: 408, body: { status: 'timeout', submissionHash: hash } };
  }
  return null;
}
