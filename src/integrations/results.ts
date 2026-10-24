const DROPPED_KEYS = new Set(['image', 'images', 'png_images', 'download']);

/** Drop upstream file URLs so the browser never receives them. */
export function sanitizeResults(results: unknown): Record<string, unknown> {
  if (!results || typeof results !== 'object' || Array.isArray(results)) return {};
  const clean: Record<string, unknown> = {};
  for (const [tool, value] of Object.entries(results)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const entry: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(value)) {
      if (!DROPPED_KEYS.has(key)) entry[key] = field;
    }
    clean[tool] = entry;
  }
  return clean;
}

export function firstExtractedText(results: unknown): string | null {
  const clean = sanitizeResults(results);
  for (const value of Object.values(clean)) {
    if (!value || typeof value !== 'object') continue;
    const output = (value as { output?: unknown }).output;
    if (typeof output === 'string' && output.trim()) return output.trim();
    if (Array.isArray(output)) {
      const text = output.filter((line): line is string => typeof line === 'string').join('\n').trim();
      if (text) return text;
    }
  }
  return null;
}
