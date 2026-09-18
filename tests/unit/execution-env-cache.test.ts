import { describe, it, expect } from 'vitest';
import {
  mergeExecutionPolicy,
  withBoundedRetry,
  mapPool,
  isTransientError,
  DEFAULT_EXECUTION_POLICY
} from '../../src/shared/execution-policy.js';
import { EnvironmentGuard } from '../../src/shared/environment-guard.js';
import { InspectCache } from '../../src/application/inspect-cache.js';
import type { ProjectProfile } from '../../src/shared/types/project.js';

describe('execution policy', () => {
  it('merges partial timeout overrides', () => {
    const p = mergeExecutionPolicy({ timeouts: { processMs: 5000 }, concurrency: 8 });
    expect(p.timeouts.processMs).toBe(5000);
    expect(p.timeouts.browserMs).toBe(DEFAULT_EXECUTION_POLICY.timeouts.browserMs);
    expect(p.concurrency).toBe(8);
  });

  it('retries transient failures then succeeds', async () => {
    let n = 0;
    const value = await withBoundedRetry(
      async () => {
        n += 1;
        if (n < 2) throw new Error('ECONNRESET boom');
        return 'ok';
      },
      { maxAttempts: 3, baseDelayMs: 5, maxDelayMs: 20 }
    );
    expect(value).toBe('ok');
    expect(n).toBe(2);
  });

  it('does not retry deterministic failures', async () => {
    let n = 0;
    await expect(
      withBoundedRetry(
        async () => {
          n += 1;
          throw new Error('assertion failed');
        },
        { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 }
      )
    ).rejects.toThrow(/assertion failed/);
    expect(n).toBe(1);
  });

  it('mapPool respects concurrency and order', async () => {
    const active: number[] = [];
    let peak = 0;
    const out = await mapPool([1, 2, 3, 4, 5], 2, async (n) => {
      active.push(n);
      peak = Math.max(peak, active.length);
      await new Promise((r) => setTimeout(r, 20));
      active.splice(active.indexOf(n), 1);
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it('detects transient errors', () => {
    expect(isTransientError(new Error('429 rate limit'))).toBe(true);
    expect(isTransientError(new Error('syntax error'))).toBe(false);
  });
});

describe('EnvironmentGuard', () => {
  it('allows local development targets', () => {
    const a = EnvironmentGuard.assess({
      configured: 'test',
      baseURL: 'http://127.0.0.1:5173'
    });
    expect(a.allowIntrusiveProbes).toBe(true);
  });

  it('blocks production without allowProduction', () => {
    expect(() =>
      EnvironmentGuard.assertIntrusiveAllowed({
        configured: 'production',
        baseURL: 'https://app.example.com'
      })
    ).toThrow(/allowProduction is false/);
  });

  it('blocks unknown remotes by default', () => {
    const a = EnvironmentGuard.assess({
      baseURL: 'https://customer-app.example.net'
    });
    expect(a.environment).toBe('unknown');
    expect(a.allowIntrusiveProbes).toBe(false);
  });
});

describe('InspectCache', () => {
  it('stores and invalidates entries', () => {
    InspectCache.invalidate();
    const root = process.cwd();
    const profile = {
      root,
      projectName: 't',
      packageManager: 'npm',
      workspaceType: 'single',
      languages: ['typescript'],
      frameworks: [],
      buildTools: [],
      testFrameworks: ['vitest'],
      apps: [],
      routes: [],
      apiEndpoints: [],
      sourceFiles: [],
      testFiles: [],
      capabilities: [],
      warnings: [],
      scanTimestamp: new Date().toISOString()
    } as ProjectProfile;

    InspectCache.set(root, {
      profile,
      requirements: [],
      featureMap: { features: [], unmappedRequirements: [], generatedAt: new Date().toISOString() }
    });
    expect(InspectCache.get(root)?.profile.projectName).toBe('t');
    InspectCache.invalidate();
    expect(InspectCache.get(root)).toBeNull();
  });
});
