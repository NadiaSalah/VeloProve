import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { LocalStorage } from '../../src/storage/local-store.js';
import { JUnitExporter } from '../../src/application/junit-exporter.js';
import { AllureExporter } from '../../src/application/allure-exporter.js';
import { StandaloneReportExporter } from '../../src/application/report-exporter.js';
import type { TestRunResult } from '../../src/shared/types/tests.js';

describe('CI report exporters', () => {
  let tmp: string;
  let guard: WorkspaceGuard;
  let storage: LocalStorage;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-ci-'));
    guard = new WorkspaceGuard(tmp);
    storage = new LocalStorage(guard);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('exports JUnit XML with failures', () => {
    const run: TestRunResult = {
      runId: 'run_junit',
      timestamp: new Date().toISOString(),
      scope: 'all',
      status: 'failed',
      durationMs: 1200,
      summary: { total: 2, passed: 1, failed: 1, skipped: 0, timedOut: 0 },
      testResults: [
        {
          id: 'a',
          title: 'passes',
          filePath: 'tests/unit/a.test.ts',
          status: 'passed',
          durationMs: 40
        },
        {
          id: 'b',
          title: 'fails',
          filePath: 'tests/unit/a.test.ts',
          status: 'failed',
          durationMs: 80,
          error: { message: 'Expected 1 to equal 2', stack: 'Error: Expected 1 to equal 2' }
        }
      ],
      failures: [],
      artifacts: []
    };

    const out = JUnitExporter.fromTestRun(guard, run, 'reports/junit.xml');
    const xml = fs.readFileSync(out.filePath, 'utf8');
    expect(xml).toContain('<testsuites');
    expect(xml).toContain('<failure');
    expect(xml).toContain('Expected 1 to equal 2');
    expect(out.failures).toBe(1);
  });

  it('exports Allure 2 result JSON files', () => {
    const run: TestRunResult = {
      runId: 'run_allure',
      timestamp: new Date().toISOString(),
      scope: 'all',
      status: 'failed',
      durationMs: 500,
      summary: { total: 2, passed: 1, failed: 1, skipped: 0, timedOut: 0 },
      testResults: [
        {
          id: 'a',
          title: 'passes',
          filePath: 'tests/unit/a.test.ts',
          status: 'passed',
          durationMs: 40
        },
        {
          id: 'b',
          title: 'fails',
          filePath: 'tests/unit/a.test.ts',
          status: 'failed',
          durationMs: 80,
          error: { message: 'boom', stack: 'Error: boom' }
        }
      ],
      failures: [],
      artifacts: []
    };

    const out = AllureExporter.fromTestRun(guard, run, 'allure-results');
    expect(out.resultFiles).toBe(2);
    expect(out.failures).toBe(1);
    const files = fs.readdirSync(out.dirPath).filter((f) => f.endsWith('-result.json'));
    expect(files.length).toBe(2);
    const failed = files
      .map((f) => JSON.parse(fs.readFileSync(path.join(out.dirPath, f), 'utf8')))
      .find((r) => r.status === 'failed');
    expect(failed?.statusDetails?.message).toContain('boom');
    expect(fs.existsSync(path.join(out.dirPath, 'executor.json'))).toBe(true);

    storage.saveTestRun(run);
    const viaExporter = StandaloneReportExporter.export(guard, storage, {
      format: 'allure',
      outputPath: 'out/allure'
    });
    expect(viaExporter.format).toBe('allure');
    expect(fs.existsSync(viaExporter.filePath)).toBe(true);
  });

  it('exports PDF executive summary via StandaloneReportExporter', () => {
    storage.saveTestRun({
      runId: 'run_pdf',
      timestamp: new Date().toISOString(),
      scope: 'all',
      status: 'passed',
      durationMs: 100,
      summary: { total: 1, passed: 1, failed: 0, skipped: 0, timedOut: 0 },
      testResults: [],
      failures: [],
      artifacts: []
    });

    const res = StandaloneReportExporter.export(guard, storage, {
      format: 'pdf',
      outputPath: 'out/exec.pdf'
    });
    const bytes = fs.readFileSync(res.filePath);
    expect(bytes.slice(0, 4).toString()).toBe('%PDF');
    expect(res.format).toBe('pdf');
  });
});
