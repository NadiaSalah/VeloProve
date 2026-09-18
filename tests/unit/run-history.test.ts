import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { LocalStorage } from '../../src/storage/local-store.js';
import { RunHistoryService } from '../../src/application/run-history.js';
import type { TestRunResult } from '../../src/shared/types/tests.js';

function makeRun(id: string, passed: number, failed: number, durationMs: number): TestRunResult {
  return {
    runId: id,
    timestamp: new Date().toISOString(),
    scope: 'all',
    status: failed ? 'failed' : 'passed',
    durationMs,
    summary: { total: passed + failed, passed, failed, skipped: 0, timedOut: 0 },
    testResults: [],
    failures: [],
    artifacts: []
  };
}

describe('RunHistoryService', () => {
  let tmp: string;
  let guard: WorkspaceGuard;
  let storage: LocalStorage;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-hist-'));
    guard = new WorkspaceGuard(tmp);
    storage = new LocalStorage(guard);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('persists history.json with charts and aggregates', () => {
    storage.saveTestRun(makeRun('run_a', 8, 2, 1000));
    storage.saveTestRun(makeRun('run_b', 10, 0, 800));
    const snap = RunHistoryService.rebuild(guard, storage);

    expect(snap.schemaVersion).toBe('1');
    expect(snap.points.length).toBe(2);
    expect(snap.charts.passRate.length).toBe(2);
    expect(snap.aggregates.avgPassRate).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(tmp, '.veloprove', 'state', 'history.json'))).toBe(true);

    const recorded = RunHistoryService.recordRun(guard, storage, makeRun('run_c', 5, 5, 1200));
    expect(recorded.points[0].runId).toBe('run_c');
    expect(recorded.points.length).toBe(3);
  });
});
