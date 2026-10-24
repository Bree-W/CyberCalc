import { encodeBase64 } from '../core/base64.ts';
import { CYBERCHEF_ORIGIN, CYBERCHEF_SANDBOX, CYBERCHEF_SHA, MAX_CHEF_URL_LENGTH } from './constants.ts';
import type { EmbedIntegration } from './types.ts';

export const CYBERCHEF_VERSION = `11.5.0 (${CYBERCHEF_SHA})`;
const CYBERCHEF_THEME = 'cybercalc';

function cyberChefBase(): string {
  return CYBERCHEF_ORIGIN.endsWith('.html') ? CYBERCHEF_ORIGIN : `${CYBERCHEF_ORIGIN}/`;
}

export function cyberChefHomeUrl(): string {
  return `${cyberChefBase()}#theme=${CYBERCHEF_THEME}`;
}

/** Path for the full-window Chef page. Keeps the CyberChef hash, including the skin. */
export function chefWindowPath(url: string | null): string {
  if (!url) return '/chef';
  const hashAt = url.indexOf('#');
  return hashAt === -1 ? '/chef' : `/chef${url.slice(hashAt)}`;
}

export type ChefRecipeId = 'from-hex' | 'to-base64' | 'magic' | 'raw';
export const CHEF_HANDOFF_STORAGE_KEY = 'cybercalc-chef-handoff';

export interface ChefUrl {
  url: string | null;
  reason?: string;
}

function unpaddedBase64(bytes: Uint8Array): string {
  return encodeBase64(bytes).replace(/=+$/, '');
}

/** Recipe strings follow CyberChef's documented hash format. */
export function recipeFor(id: ChefRecipeId, bytes: Uint8Array): string {
  if (id === 'from-hex') {
    const text = new TextDecoder().decode(bytes);
    const delimiter = /\s/.test(text) ? 'Space' : 'None';
    return `From_Hex('${delimiter}')`;
  }
  if (id === 'to-base64') return "To_Base64('A-Za-z0-9%2B/%3D')";
  if (id === 'raw') return '';
  return 'Magic(3,false,false)';
}

export function storeChefHandoff(recipe: string, bytes: Uint8Array): void {
  sessionStorage.setItem(
    CHEF_HANDOFF_STORAGE_KEY,
    JSON.stringify({ recipe, input: unpaddedBase64(bytes) }),
  );
}

export function takeChefHandoff(): { recipe: string; input: string } | null {
  const raw = sessionStorage.getItem(CHEF_HANDOFF_STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(CHEF_HANDOFF_STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw) as { recipe?: unknown; input?: unknown };
    if (typeof parsed.recipe !== 'string' || typeof parsed.input !== 'string') return null;
    return { recipe: parsed.recipe, input: parsed.input };
  } catch {
    return null;
  }
}

export function chefPathForBytes(id: ChefRecipeId, bytes: Uint8Array): string {
  const built = buildCyberChefUrl(id, bytes);
  if (built.url) return chefWindowPath(built.url);
  storeChefHandoff(recipeFor(id, bytes), bytes);
  return '/chef';
}

export function buildCyberChefUrl(id: ChefRecipeId, bytes: Uint8Array): ChefUrl {
  const recipe = recipeFor(id, bytes);
  const input = encodeURIComponent(unpaddedBase64(bytes));
  const recipePart = recipe ? `recipe=${recipe}&` : '';
  const url = `${cyberChefBase()}#${recipePart}input=${input}&theme=${CYBERCHEF_THEME}`;
  if (url.length > MAX_CHEF_URL_LENGTH) {
    return {
      url: null,
      reason: 'Input is too long for a CyberChef URL. Drop the file in CyberChef.',
    };
  }
  return { url };
}

export const cyberChef: EmbedIntegration = {
  id: 'cyberchef',
  name: 'CyberChef',
  license: 'Apache-2.0',
  version: CYBERCHEF_VERSION,
  kind: 'embed',
  launch(input: string) {
    const built = buildCyberChefUrl('magic', new TextEncoder().encode(input));
    return {
      src: built.url ?? cyberChefHomeUrl(),
      sandbox: CYBERCHEF_SANDBOX,
    };
  },
};
