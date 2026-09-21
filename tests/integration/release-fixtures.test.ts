/**
 * Release gate fixtures: clean / warning / blocked synthetic evaluations.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ReleaseCheckService } from '../../src/application/release-check.js';
import type { DiscoveredRequirement } from '../../src/shared/types/requirements.js';
import type { TestRunResult } from '../../src/shared/types/tests.js';
import type { DiagnosticResult } from '../../src/shared/types/diagnostics.js';
import { createDisposableGitRepo } from './helpers/create-disposable-git.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../../fixtures');

function req(id: string, covered: DiscoveredRequirement['testCoverageStatus']): DiscoveredRequirement {
  return {
    id,
    title: id,
    description: id,
    source: 'prd',
    sourceLocation: { file: 'PRD.md' },
    priority: 'high',
    confidence: 0.9,
    category: 'functional',
    relatedModules: [],
    relatedRoutes: [],
    relatedEndpoints: [],
    acceptanceCriteria: [],
    testCoverageStatus: covered
  };
}

function passedRun(): TestRunResult {
  return {
    runId: 'r-pass',
    timestamp: new Date().toISOString(),
    scope: 'all',
    status: 'passed',
    durationMs: 10,
    summary: { total: 2, passed: 2, failed: 0, skipped: 0, timedOut: 0 },
    testResults: [],
    failures: [],
    artifacts: []
  };
}

function failedRun(): TestRunResult {
  const fail = {
    id: 'crit',
    title: 'critical',
    filePath: 'tests/crit.test.js',
    status: 'failed' as const,
    durationMs: 5,
    error: { message: 'Expected 5 but received -1' }
  };
  return {
    runId: 'r-fail',
    timestamp: new Date().toISOString(),
    scope: 'all',
    status: 'failed',
    durationMs: 5,
    summary: { total: 1, passed: 0, failed: 1, skipped: 0, timedOut: 0 },
    testResults: [fail],
    failures: [fail],
    artifacts: []
  };
}

describe('Release + git-disposable fixtures', () => {
  it('fixture packages exist', () => {
    for (const name of [
      'release-clean',
      'release-warning',
      'release-blocked',
      'security-local',
      'api-local',
      'a11y-local',
      'golden-project'
    ]) {
      expect(fs.existsSync(path.join(FIXTURES, name, 'package.json'))).toBe(true);
    }
  });

  it('release-clean → READY', () => {
    const report = ReleaseCheckService.evaluate({
      requirements: [req('REQ-1', 'covered')],
      latestRun: passedRun(),
      diagnoses: [],
      flakyTests: []
    });
    expect(report.verdict).toBe('READY');
    expect(fs.existsSync(path.join(FIXTURES, 'release-clean', 'package.json'))).toBe(true);
  });

  it('release-warning → READY_WITH_WARNINGS (uncovered reqs)', () => {
    const report = ReleaseCheckService.evaluate({
      requirements: [req('REQ-1', 'covered'), req('REQ-2', 'uncovered')],
      latestRun: passedRun(),
      diagnoses: [],
      flakyTests: []
    });
    expect(report.verdict).toBe('READY_WITH_WARNINGS');
  });

  it('release-blocked → NOT_READY (failures + APPLICATION_BUG)', () => {
    const diagnoses: DiagnosticResult[] = [
      {
        diagnosisId: 'd1',
        testId: 'crit',
        classification: 'APPLICATION_BUG',
        confidence: 0.9,
        rootCause: 'logic invert',
        evidence: {
          testId: 'crit',
          testName: 'critical',
          testFile: 'tests/crit.test.js',
          errorMessage: 'Expected 5 but received -1'
        },
        evidenceSignals: [],
        speculationNotes: [],
        affectedFiles: ['src/math.js'],
        suggestedActions: [],
        canAutoHealTest: false
      }
    ];
    const report = ReleaseCheckService.evaluate({
      requirements: [req('REQ-1', 'covered')],
      latestRun: failedRun(),
      diagnoses,
      flakyTests: []
    });
    expect(report.verdict).toBe('NOT_READY');
    expect(report.blockers.length).toBeGreaterThan(0);
  });

  it('git-disposable helper creates two commits', () => {
    const repo = createDisposableGitRepo();
    try {
      expect(repo.commitA).toMatch(/^[0-9a-f]{7,40}$/i);
      expect(repo.commitB).toMatch(/^[0-9a-f]{7,40}$/i);
      expect(repo.commitA).not.toBe(repo.commitB);
      expect(fs.existsSync(path.join(repo.dir, 'products.json'))).toBe(true);
    } finally {
      repo.cleanup();
    }
  });
});
