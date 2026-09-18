import { describe, it, expect } from 'vitest';
import { FixSafetyPolicy } from '../../src/application/fix-safety-policy.js';

describe('FixSafetyPolicy', () => {
  it('allows heals on test paths', () => {
    const d = FixSafetyPolicy.classifyFileEdit('tests/unit/login.test.ts', 'test-heal');
    expect(d.classification).toBe('SAFE');
    expect(d.mayAutoApply).toBe(true);
  });

  it('requires review for application auth code', () => {
    const d = FixSafetyPolicy.classifyFileEdit('src/auth/login.ts', 'app-fix');
    expect(d.classification).toBe('REVIEW_REQUIRED');
    expect(d.mayAutoApply).toBe(false);
  });

  it('prohibits secret-like paths', () => {
    const d = FixSafetyPolicy.classifyFileEdit('.env.local', 'app-fix');
    expect(d.classification).toBe('PROHIBITED_AUTOMATIC');
    expect(d.mayAutoApply).toBe(false);
  });
});
