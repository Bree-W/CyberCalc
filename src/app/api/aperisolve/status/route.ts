import { NextRequest, NextResponse } from 'next/server';
import { fetchUpstreamStatus } from '@/integrations/upstream.ts';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const hash = (request.nextUrl.searchParams.get('hash') ?? '').toLowerCase();
  const result = await fetchUpstreamStatus(hash);
  return NextResponse.json(result.body, { status: result.status });
}
