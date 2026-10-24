import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { CYBERCHEF_ORIGIN } from '@/integrations/constants.ts';

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

async function hasStaticCyberChefBundle(): Promise<boolean> {
  try {
    const indexHtml = path.resolve(process.cwd(), 'public/cyberchef/index.html');
    const text = await fs.readFile(indexHtml, 'utf8');
    // The real CyberChef bundle contains #recipe / #input panes or assets/main.js
    return text.includes('assets/main.js') || text.includes('Download CyberChef');
  } catch {
    return false;
  }
}

export async function GET() {
  const [staticChef, remoteChef] = await Promise.all([
    hasStaticCyberChefBundle(),
    CYBERCHEF_ORIGIN.startsWith('http') ? reachable(`${CYBERCHEF_ORIGIN}/`, 'CyberChef') : Promise.resolve(false),
  ]);
  return NextResponse.json({
    cyberchef: staticChef || remoteChef,
    aperisolve: true,
  });
}
