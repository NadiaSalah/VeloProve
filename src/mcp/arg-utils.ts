/**
 * MCP CallTool argument helpers.
 *
 * Agents sometimes send flags as JSON booleans, strings ("true"), or 0/1.
 * These helpers coerce safely so verify/heal/security options are not silently dropped.
 */

export function asRecord(args: unknown): Record<string, unknown> {
  if (args && typeof args === 'object' && !Array.isArray(args)) {
    return args as Record<string, unknown>;
  }
  return {};
}

/** Coerce common truthy wire formats to boolean (JSON true, "true", "1", 1). */
export function coerceBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
    if (s === 'false' || s === '0' || s === 'no' || s === 'off' || s === '') return false;
  }
  return undefined;
}

/** True only when the flag is explicitly set truthy (missing → false). */
export function boolFlag(args: unknown, key: string): boolean {
  return coerceBool(asRecord(args)[key]) === true;
}

export function boolOpt(args: unknown, key: string): boolean | undefined {
  return coerceBool(asRecord(args)[key]);
}

export function strOpt(args: unknown, key: string): string | undefined {
  const v = asRecord(args)[key];
  return typeof v === 'string' ? v : undefined;
}

export function numOpt(args: unknown, key: string): number | undefined {
  const v = asRecord(args)[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export function strArrayOpt(args: unknown, key: string): string[] | undefined {
  const v = asRecord(args)[key];
  if (!Array.isArray(v)) return undefined;
  return v.filter((x): x is string => typeof x === 'string');
}

export function objOpt(args: unknown, key: string): Record<string, unknown> | undefined {
  const v = asRecord(args)[key];
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return undefined;
}

export function unknownOpt(args: unknown, key: string): unknown {
  return asRecord(args)[key];
}
