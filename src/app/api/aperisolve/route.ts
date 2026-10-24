import { NextRequest, NextResponse } from 'next/server';
import { MAX_CONTENT_LENGTH } from '@/integrations/constants.ts';
import { allowUpload, clientKey } from '@/integrations/rate-limit.ts';
import { forwardUpload, readSample } from '@/integrations/upstream.ts';

export const runtime = 'nodejs';

function tooLarge(request: NextRequest): boolean {
  const header = request.headers.get('content-length');
  if (!header) return false;
  const size = Number(header);
  return Number.isFinite(size) && size > MAX_CONTENT_LENGTH;
}

function limited(request: NextRequest): NextResponse | null {
  const key = clientKey(request.headers.get('x-forwarded-for'));
  if (allowUpload(key)) return null;
  return NextResponse.json({ error: 'Too many uploads. Limit is 10 per minute.' }, { status: 429 });
}

export async function POST(request: NextRequest) {
  const blocked = limited(request);
  if (blocked) return blocked;
  if (tooLarge(request)) {
    return NextResponse.json({ error: 'Upload exceeds 3145728 bytes' }, { status: 413 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return postSample(request);
  }
  return postFile(request);
}

async function postSample(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const record = body as { sample?: unknown; password?: unknown; deep?: unknown };
  if (typeof record.sample !== 'string') {
    return NextResponse.json({ error: 'Unknown sample' }, { status: 400 });
  }
  const password = typeof record.password === 'string' ? record.password : undefined;
  const loaded = await readSample(record.sample);
  if ('error' in loaded) {
    return NextResponse.json({ error: loaded.error, todo: loaded.todo }, { status: loaded.status });
  }
  const outcome = await forwardUpload(loaded.bytes, record.sample, {
    password,
    deep: record.deep === true,
  });
  return NextResponse.json(
    { submissionHash: outcome.submissionHash, error: outcome.error, todo: outcome.todo },
    { status: outcome.status },
  );
}

async function postFile(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected a file upload' }, { status: 400 });
  }
  const image = form.get('image');
  if (!(image instanceof File)) {
    return NextResponse.json({ error: 'Expected a file upload' }, { status: 400 });
  }
  const passwordField = form.get('password');
  const password = typeof passwordField === 'string' ? passwordField : undefined;
  const bytes = new Uint8Array(await image.arrayBuffer());
  const outcome = await forwardUpload(bytes, image.name, {
    password,
    deep: form.get('deep') === 'true',
  });
  return NextResponse.json(
    { submissionHash: outcome.submissionHash, error: outcome.error, todo: outcome.todo },
    { status: outcome.status },
  );
}
