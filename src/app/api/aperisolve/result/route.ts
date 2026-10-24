import { NextRequest, NextResponse } from 'next/server';
import { fetchUpstreamResult } from '@/integrations/upstream.ts';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const hash = (request.nextUrl.searchParams.get('hash') ?? '').toLowerCase();
  const result = await fetchUpstreamResult(hash);
  return NextResponse.json(result.body, { status: result.status });
}
