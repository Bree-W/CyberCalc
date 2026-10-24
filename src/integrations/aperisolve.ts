import { APERISOLVE_SHA } from './constants.ts';
import type { ProxyIntegration, SubmitOptions, SubmitResult } from './types.ts';

export const APERISOLVE_VERSION = `3.7.12 (${APERISOLVE_SHA})`;

const STUB_TODO = 'Start it with scripts/aperisolve-up.sh. The adapter does not run analyzers on the host.';

async function readBody(response: Response): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await response.json();
    if (data && typeof data === 'object') return data as Record<string, unknown>;
  } catch {
    return {};
  }
  return {};
}

function asResult(data: Record<string, unknown>, ok: boolean): SubmitResult {
  if (ok && typeof data.submissionHash === 'string') {
    return { ok: true, submissionHash: data.submissionHash };
  }
  return {
    ok: false,
    error: typeof data.error === 'string' ? data.error : 'Upload failed',
    todo: typeof data.todo === 'string' ? data.todo : undefined,
  };
}

export const aperiSolve: ProxyIntegration = {
  id: 'aperisolve',
  name: "Aperi'Solve",
  license: 'MIT',
  version: APERISOLVE_VERSION,
  kind: 'proxy',
  async submit(file: File, options?: SubmitOptions): Promise<SubmitResult> {
    const body = new FormData();
    body.append('image', file, file.name || 'upload.bin');
    if (options?.password) body.append('password', options.password);
    if (options?.deep) body.append('deep', 'true');
    try {
      const response = await fetch('/api/aperisolve', { method: 'POST', body });
      return asResult(await readBody(response), response.ok);
    } catch {
      return { ok: false, error: "Aperi'Solve is not running", todo: STUB_TODO };
    }
  },
};

export async function submitAperiSample(sample: string, options?: SubmitOptions): Promise<SubmitResult> {
  const payload: { sample: string; deep?: boolean; password?: string } = { sample };
  if (options?.deep) payload.deep = true;
  if (options?.password) payload.password = options.password;
  try {
    const response = await fetch('/api/aperisolve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return asResult(await readBody(response), response.ok);
  } catch {
    return { ok: false, error: "Aperi'Solve is not running", todo: STUB_TODO };
  }
}

export async function fetchAperiStatus(hash: string): Promise<{ status?: string; error?: string }> {
  const response = await fetch(`/api/aperisolve/status?hash=${encodeURIComponent(hash)}`, { cache: 'no-store' });
  const data = await readBody(response);
  return {
    status: typeof data.status === 'string' ? data.status : undefined,
    error: typeof data.error === 'string' ? data.error : undefined,
  };
}

export async function fetchAperiResult(hash: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(`/api/aperisolve/result?hash=${encodeURIComponent(hash)}`, { cache: 'no-store' });
  if (response.status === 425) return null;
  const data = await readBody(response);
  const results = data.results;
  if (results && typeof results === 'object') return results as Record<string, unknown>;
  return null;
}
