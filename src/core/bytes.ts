import type { ConvertResult } from './result.ts';
import { err, ok } from './result.ts';

export type ByteStandard = 'decimal' | 'binary';

type ByteUnit = { symbol: string; factor: bigint };

const DECIMAL_UNITS: readonly ByteUnit[] = [
  { symbol: 'B', factor: 1n },
  { symbol: 'KB', factor: 1_000n },
  { symbol: 'MB', factor: 1_000_000n },
  { symbol: 'GB', factor: 1_000_000_000n },
];

const BINARY_UNITS: readonly ByteUnit[] = [
  { symbol: 'B', factor: 1n },
  { symbol: 'KiB', factor: 1024n },
  { symbol: 'MiB', factor: 1024n ** 2n },
  { symbol: 'GiB', factor: 1024n ** 3n },
];

export function listByteUnits(standard: ByteStandard): readonly string[] {
  const units = standard === 'decimal' ? DECIMAL_UNITS : BINARY_UNITS;
  return units.map(unit => unit.symbol);
}

function findUnit(symbol: string, standard: ByteStandard): ByteUnit | undefined {
  const units = standard === 'decimal' ? DECIMAL_UNITS : BINARY_UNITS;
  const key = symbol.trim().toLowerCase();
  return units.find(unit => unit.symbol.toLowerCase() === key);
}

function formatRational(numerator: bigint, denominator: bigint): string {
  const whole = numerator / denominator;
  let remainder = numerator % denominator;
  if (remainder === 0n) return whole.toString();
  let fraction = '';
  for (let place = 0; place < 12 && remainder !== 0n; place++) {
    remainder *= 10n;
    fraction += (remainder / denominator).toString();
    remainder %= denominator;
  }
  return `${whole}.${fraction.replace(/0+$/, '')}`;
}

/**
 * Convert an amount between byte units.
 * `standard` selects the 1000-based names (KB, MB, GB) or the 1024-based names (KiB, MiB, GiB).
 */
export function convertByteUnit(
  amount: string,
  fromUnit: string,
  toUnit: string,
  standard: ByteStandard,
): ConvertResult<string> {
  const trimmed = amount.trim();
  if (trimmed === '') return err('empty input');
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return err('invalid byte amount');

  const from = findUnit(fromUnit, standard);
  const to = findUnit(toUnit, standard);
  if (!from) return err(`unknown unit ${fromUnit} for ${standard}`);
  if (!to) return err(`unknown unit ${toUnit} for ${standard}`);

  const [whole, fraction = ''] = trimmed.split('.');
  const scale = 10n ** BigInt(fraction.length);
  const scaled = BigInt(whole + fraction);
  return ok(formatRational(scaled * from.factor, scale * to.factor));
}
