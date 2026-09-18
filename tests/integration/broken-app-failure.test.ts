import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { VeloProveEngine } from '../../src/application/engine.js';
import { FailureEvidencePackService } from '../../src/application/failure-evidence-pack.js';
import type { TestRunResult } from '../../src/shared/types/tests.js';

/**
 * Realistic failure-path validation on fixtures/broken-app.
 * Uses node:test intentionally (application bug in add()).
 */
describe('Broken-app fixture (failure paths)', () => {
  const fixture = path.resolve(__dirname, '../../fixtures/broken-app');

  it('package test fails as designed (application bug)', () => {
    const res = spawnSync(process.execPath, ['--test', 'tests/math.test.js'], {
      cwd: fixture,
      encoding: 'utf8'
    });
    expect(res.status).not.toBe(0);
    expect(`${res.stdout}\n${res.stderr}`).toMatch(/not ok|AssertionError|fail/i);
  });

  it('inspect detects node:test and verify surfaces failing run', async () => {
    const engine = new VeloProveEngine(fixture);
    const { profile } = await engine.inspect();
    expect(profile.projectName).toBeTruthy();
    expect(profile.testFrameworks).toContain('node:test');

    const doctor = engine.doctor();
    expect(doctor.verdict).toBeTruthy();
    const runners = doctor.checks.find((c) => c.id === 'test-runners');
    expect(runners?.status).toBe('PASS');
    expect(runners?.message).toMatch(/node:test/i);

    const result = await engine.verify({ fullSuite: true, noHeal: true });
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('status');
    if (result.data) {
      expect(result.data.schemaVersion).toBe('1');
    }

    // Engine should execute the broken suite (not empty / no-runner path)
    const run = await engine.run({ scope: 'all' });
    expect(run.status).toBe('failed');
    expect(run.summary.failed).toBeGreaterThan(0);
  }, 90000);

  it('evidence pack v2 writes zip + pack-index for a synthetic failed run', () => {
    const engine = new VeloProveEngine(fixture);
    const run: TestRunResult = {
      runId: 'broken_pack',
      timestamp: new Date().toISOString(),
      scope: 'all',
      status: 'failed',
      durationMs: 12,
      summary: { total: 1, passed: 0, failed: 1, skipped: 0, timedOut: 0 },
      testResults: [
        {
          id: 'math-add',
          title: 'adds two numbers',
          filePath: 'tests/math.test.js',
          status: 'failed',
          durationMs: 5,
          error: { message: 'Expected 5 but got -1' }
        }
      ],
      failures: [],
      artifacts: []
    };
    run.failures = run.testResults.filter((t) => t.status === 'failed');

    const pack = FailureEvidencePackService.pack({
      guard: engine.guard,
      run,
      runId: run.runId,
      diagnoses: []
    });
    expect(fs.existsSync(pack.packDir)).toBe(true);
    expect(fs.existsSync(path.join(pack.packDir, 'pack-index.json'))).toBe(true);
    if (pack.zipPath) expect(fs.existsSync(pack.zipPath)).toBe(true);
  });
});
