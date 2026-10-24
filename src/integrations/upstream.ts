import fs from 'node:fs/promises';
import path from 'node:path';
import { analyzeImageLocally, type AperiAnalysisBundle } from './aperi-local.ts';
import { APERISOLVE_ORIGIN, MAX_CONTENT_LENGTH, UPSTREAM_TIMEOUT_MS } from './constants.ts';
import { detectAllowedImage, filenameForImage } from './magic-bytes.ts';
import { redactSecret } from './redact.ts';
import { sanitizeResults } from './results.ts';
import { isSubmissionHash, pollExpired, rememberSubmission, submissionStartedAt } from './submissions.ts';

const SAMPLE_NAMES = new Set(['example1.png', 'example2.jpg', 'example3.png']);
const localBundles = new Map<string, AperiAnalysisBundle>();

export interface UploadOutcome {
  ok: boolean;
  status: number;
  submissionHash?: string;
  bundle?: AperiAnalysisBundle;
  error?: string;
  todo?: string;
}

export function resolveSamplePath(name: string): string | null {
  if (!SAMPLE_NAMES.has(name)) return null;
  const bundledRoot = path.resolve(process.cwd(), 'public/samples/aperisolve');
  const bundledFile = path.resolve(bundledRoot, name);
  if (bundledFile === path.join(bundledRoot, name)) return bundledFile;
  return null;
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

  const safeName = filenameForImage(filename, kind);

  // Run the built-in zero-Docker TypeScript Aperi'Solve engine immediately so it works out of the box.
  try {
    const bundle = analyzeImageLocally(bytes, safeName, {
      password: password ? '[redacted]' : undefined,
      deep: options?.deep,
    });
    rememberSubmission(bundle.submissionHash);
    localBundles.set(bundle.submissionHash, bundle);
    return {
      ok: true,
      status: 200,
      submissionHash: bundle.submissionHash,
      bundle,
    };
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : 'Analysis failed';
    return { ok: false, status: 500, error: redactSecret(rawMsg, password) };
  }
}

export async function readSample(name: string): Promise<{ bytes: Uint8Array } | { error: string; status: number; todo?: string }> {
  const file = resolveSamplePath(name);
  if (!file) return { error: 'Unknown sample', status: 400 };
  const fallbacks = [
    file,
    path.resolve(process.cwd(), 'Combined_Repos/AperiSolve/examples', name),
  ];
  for (const candidate of fallbacks) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.size > MAX_CONTENT_LENGTH) return { error: 'Upload exceeds 3145728 bytes', status: 413 };
      const bytes = new Uint8Array(await fs.readFile(candidate));
      return { bytes };
    } catch {
      // try next path
    }
  }
  return {
    error: 'Sample image could not be found in public/samples/aperisolve/',
    status: 503,
  };
}

export async function fetchUpstreamStatus(hash: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const gate = gateHash(hash);
  if (gate) return gate;

  if (localBundles.has(hash)) {
    return {
      status: 200,
      body: {
        status: 'completed',
        submissionHash: hash,
      },
    };
  }

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

  const local = localBundles.get(hash);
  if (local) {
    return {
      status: 200,
      body: {
        results: sanitizeResults(local.results),
        meta: {
          filename: local.filename,
          kind: local.kind,
          size: local.size,
          width: local.width,
          height: local.height,
          repairedHeight: local.repairedHeight,
          repairedPngDataUrl: local.repairedPngDataUrl,
          md5: local.md5,
          sha256: local.sha256,
        },
        submissionHash: hash,
      },
    };
  }

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
