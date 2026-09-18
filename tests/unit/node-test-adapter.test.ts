import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { NodeTestAdapter, parseTapResults } from '../../src/adapters/node-test/node-test-adapter.js';
import { VeloProveEngine } from '../../src/application/engine.js';
import { StackDetector } from '../../src/intelligence/project-scanner/stack-detector.js';

describe('NodeTestAdapter (node --test)', () => {
  const broken = path.resolve(__dirname, '../../fixtures/broken-app');
  const smoke = path.resolve(__dirname, '../../fixtures/real-app-smoke');

  it('parseTapResults extracts ok / not ok lines', () => {
    const tap = `
TAP version 13
# Subtest: math
    # Subtest: adds two numbers
    not ok 1 - adds two numbers
  1..1
not ok 1 - math
1..1
`;
    const rows = parseTapResults(tap, 'tests/math.test.js');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.status === 'failed')).toBe(true);
  });

  it('detects node:test on broken-app and smoke fixtures', async () => {
    const brokenStack = StackDetector.detect(broken);
    expect(brokenStack.testFrameworks).toContain('node:test');

    const smokeStack = StackDetector.detect(smoke);
    expect(smokeStack.testFrameworks).toContain('node:test');

    const adapter = new NodeTestAdapter();
    expect(await adapter.detect({ projectRoot: broken })).toBe(true);
    expect(await adapter.detect({ projectRoot: smoke })).toBe(true);
  });

  it('runs failing broken-app suite via engine.run', async () => {
    const engine = new VeloProveEngine(broken);
    const { profile } = await engine.inspect();
    expect(profile.testFrameworks).toContain('node:test');

    const result = await engine.run({ scope: 'all' });
    expect(result.summary.total).toBeGreaterThan(0);
    expect(result.status).toBe('failed');
    expect(result.summary.failed).toBeGreaterThan(0);
  }, 30000);

  it('runs passing real-app-smoke suite via engine.run', async () => {
    const engine = new VeloProveEngine(smoke);
    const result = await engine.run({ scope: 'all' });
    expect(result.summary.total).toBeGreaterThan(0);
    expect(result.status).toBe('passed');
    expect(result.summary.failed).toBe(0);
  }, 30000);
});
