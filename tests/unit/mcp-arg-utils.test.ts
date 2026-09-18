import { describe, it, expect } from 'vitest';
import { asRecord, boolFlag, boolOpt, coerceBool, numOpt, strOpt } from '../../src/mcp/arg-utils.js';

describe('mcp arg-utils', () => {
  it('asRecord ignores non-objects', () => {
    expect(asRecord(null)).toEqual({});
    expect(asRecord([])).toEqual({});
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
  });

  it('coerceBool accepts JSON, strings, and numbers', () => {
    expect(coerceBool(true)).toBe(true);
    expect(coerceBool(false)).toBe(false);
    expect(coerceBool('true')).toBe(true);
    expect(coerceBool('TRUE')).toBe(true);
    expect(coerceBool('1')).toBe(true);
    expect(coerceBool('yes')).toBe(true);
    expect(coerceBool('false')).toBe(false);
    expect(coerceBool('0')).toBe(false);
    expect(coerceBool(1)).toBe(true);
    expect(coerceBool(0)).toBe(false);
    expect(coerceBool('maybe')).toBeUndefined();
    expect(coerceBool(undefined)).toBeUndefined();
  });

  it('boolFlag is true only for explicit truthy values', () => {
    expect(boolFlag({ full: true }, 'full')).toBe(true);
    expect(boolFlag({ full: 'true' }, 'full')).toBe(true);
    expect(boolFlag({ full: '1' }, 'full')).toBe(true);
    expect(boolFlag({ full: false }, 'full')).toBe(false);
    expect(boolFlag({ full: 'false' }, 'full')).toBe(false);
    expect(boolFlag({}, 'full')).toBe(false);
  });

  it('boolOpt preserves undefined when missing', () => {
    expect(boolOpt({}, 'autoHeal')).toBeUndefined();
    expect(boolOpt({ autoHeal: 'yes' }, 'autoHeal')).toBe(true);
  });

  it('strOpt and numOpt narrow types', () => {
    expect(strOpt({ intent: 'secure auth' }, 'intent')).toBe('secure auth');
    expect(strOpt({ intent: 1 }, 'intent')).toBeUndefined();
    expect(numOpt({ limit: 20 }, 'limit')).toBe(20);
    expect(numOpt({ limit: '20' }, 'limit')).toBeUndefined();
  });
});
