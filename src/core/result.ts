export type ConvertResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function ok<T>(value: T): ConvertResult<T> {
  return { ok: true, value };
}

export function err<T>(error: string): ConvertResult<T> {
  return { ok: false, error };
}
