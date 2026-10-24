import { NextResponse } from 'next/server';
import { APERISOLVE_ORIGIN, CYBERCHEF_ORIGIN } from '@/integrations/constants.ts';

export const runtime = 'nodejs';

async function reachable(url: string, marker: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000), cache: 'no-store' });
    if (!response.ok) return false;
    const text = (await response.text()).slice(0, 20_000);
    return text.toLowerCase().includes(marker.toLowerCase());
  } catch {
    return false;
  }
}

export async function GET() {
  const [cyberchef, aperisolve] = await Promise.all([
    reachable(`${CYBERCHEF_ORIGIN}/`, 'CyberChef'),
    reachable(`${APERISOLVE_ORIGIN}/`, 'Aperi'),
  ]);
  return NextResponse.json({ cyberchef, aperisolve });
}
