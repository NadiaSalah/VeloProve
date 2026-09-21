import { describe, it, expect, vi } from 'vitest';
import { VerifyOrchestrator } from '../../src/application/verify-orchestrator.js';
import type { VeloProveEngine } from '../../src/application/engine.js';
import type { ProjectProfile } from '../../src/shared/types/project.js';
import type { ImpactAnalysisResult } from '../../src/intelligence/change-impact/dependency-graph.js';
import type { TestRunResult } from '../../src/shared/types/tests.js';
import type { ReleaseConfidenceReport } from '../../src/shared/types/release.js';
import type { DoctorReport } from '../../src/application/doctor-service.js';

function stubProfile(): ProjectProfile {
  return {
    root: '/tmp/fixture',
    projectName: 'verify-fixture',
    packageManager: 'npm',
    workspaceType: 'single',
    languages: ['typescript'],
    frameworks: ['react'],
    buildTools: ['vite'],
    testFrameworks: ['vitest'],
    apps: [],
    routes: [],
    apiEndpoints: [],
    sourceFiles: [],
    testFiles: [
      {
        path: '/tmp/fixture/tests/unit/a.test.ts',
        relativePath: 'tests/unit/a.test.ts',
        runner: 'vitest',
        level: 'unit',
        targetedFiles: ['src/a.ts']
      }
    ],
    capabilities: [],
    warnings: [],
    scanTimestamp: new Date().toISOString()
  };
}

function stubRun(failed = 0): TestRunResult {
  return {
    runId: 'run_stub',
    timestamp: new Date().toISOString(),
    scope: 'all',
    status: failed > 0 ? 'failed' : 'passed',
    durationMs: 10,
    summary: {
      total: 2,
      passed: 2 - failed,
      failed,
      skipped: 0,
      timedOut: 0
    },
    testResults: [],
    failures: [],
    artifacts: []
  };
}

describe('VerifyOrchestrator integration (stub engine)', () => {
  it('runs change-aware pipeline and returns PASS OperationResult', async () => {
    const impact: ImpactAnalysisResult = {
      changedFiles: ['src/a.ts'],
      impactedTestFiles: ['tests/unit/a.test.ts'],
      impactedRoutes: [],
      impactedEndpoints: [],
      affectedModules: ['src'],
      riskScore: 20,
      riskAreas: ['general'],
      recommendedCapabilities: ['doctor', 'inspect', 'changed', 'run', 'diagnose', 'heal', 'release'],
      reasoningEvidence: [
        { testFile: 'tests/unit/a.test.ts', reason: 'targeted', confidence: 0.9 }
      ],
      selectionNotes: []
    };

    const doctor: DoctorReport = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      projectRoot: '/tmp/fixture',
      packageManager: 'npm',
      totalChecks: 1,
      passedCount: 1,
      warningCount: 0,
      failedCount: 0,
      verdict: 'HEALTHY',
      checks: []
    };

    const release: ReleaseConfidenceReport = {
      verdict: 'READY',
      confidenceScore: 92,
      timestamp: new Date().toISOString(),
      summary: {
        totalRequirements: 1,
        coveredRequirements: 1,
        uncoveredRequirements: 0,
        testsTotal: 2,
        testsPassed: 2,
        testsFailed: 0,
        flakyTestsDetected: 0,
        criticalFailures: 0,
        unresolvedDiagnoses: 0,
        codeRiskScore: 10
      },
      reasons: [],
      blockers: [],
      recommendations: []
    };

    const engine = {
      guard: { getRoot: () => '/tmp/fixture' },
      doctor: vi.fn(() => doctor),
      inspect: vi.fn(async () => ({
        profile: stubProfile(),
        requirements: [],
        featureMap: { features: [], unmappedRequirements: [], generatedAt: new Date().toISOString() }
      })),
      changed: vi.fn(async () => impact),
      run: vi.fn(async () => stubRun(0)),
      diagnose: vi.fn(async () => []),
      heal: vi.fn(async () => []),
      releaseCheck: vi.fn(async () => release),
      runSecurityTests: vi.fn(),
      auditA11y: vi.fn()
    } as unknown as VeloProveEngine;

    const result = await VerifyOrchestrator.execute(engine, { noHeal: true });

    expect(result.operation).toBe('verify');
    expect(result.success).toBe(true);
    expect(result.data?.verdict).toBe('PASS');
    expect(result.data?.selection.mode).toBe('changed');
    expect(result.data?.selection.selectedTests).toContain('tests/unit/a.test.ts');
    expect(engine.run).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'paths',
        paths: ['tests/unit/a.test.ts']
      })
    );
    expect(result.data?.exitCode).toBe(0);
  });

  it('returns QUALITY_BLOCKED when release is NOT_READY', async () => {
    const engine = {
      guard: { getRoot: () => '/tmp/fixture' },
      doctor: vi.fn(() => ({
        verdict: 'HEALTHY',
        failedCount: 0,
        warningCount: 0,
        checks: [],
        timestamp: '',
        nodeVersion: '',
        platform: '',
        projectRoot: '',
        packageManager: 'npm',
        totalChecks: 0,
        passedCount: 0
      })),
      inspect: vi.fn(async () => ({
        profile: stubProfile(),
        requirements: [],
        featureMap: { features: [], unmappedRequirements: [], generatedAt: new Date().toISOString() }
      })),
      changed: vi.fn(async () => ({
        changedFiles: [],
        impactedTestFiles: [],
        impactedRoutes: [],
        impactedEndpoints: [],
        affectedModules: [],
        riskScore: 0,
        riskAreas: [],
        recommendedCapabilities: ['run', 'release'],
        reasoningEvidence: [],
        selectionNotes: []
      })),
      run: vi.fn(async () => stubRun(1)),
      diagnose: vi.fn(async () => [
        {
          diagnosisId: 'd1',
          testId: 't1',
          classification: 'APPLICATION_BUG',
          confidence: 0.9,
          rootCause: 'bug',
          evidence: {
            testId: 't1',
            testName: 't',
            testFile: 'a.test.ts',
            errorMessage: 'fail'
          },
          affectedFiles: [],
          suggestedActions: [],
          canAutoHealTest: false,
          evidenceSignals: ['errorMessage: fail'],
          speculationNotes: []
        }
      ]),
      heal: vi.fn(async () => []),
      releaseCheck: vi.fn(async () => ({
        verdict: 'NOT_READY',
        confidenceScore: 20,
        timestamp: new Date().toISOString(),
        summary: {
          totalRequirements: 0,
          coveredRequirements: 0,
          uncoveredRequirements: 0,
          testsTotal: 2,
          testsPassed: 1,
          testsFailed: 1,
          flakyTestsDetected: 0,
          criticalFailures: 1,
          unresolvedDiagnoses: 1,
          codeRiskScore: 80
        },
        reasons: [],
        blockers: ['1 test(s) failed'],
        recommendations: []
      })),
      runSecurityTests: vi.fn(),
      auditA11y: vi.fn()
    } as unknown as VeloProveEngine;

    const result = await VerifyOrchestrator.execute(engine, {
      intent: 'Find what broke after my last changes',
      noHeal: true
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('QUALITY_BLOCKED');
    expect(result.data?.verdict).toBe('BLOCKED');
    expect(result.data?.intent?.interpretedAs).toMatch(/regression|Change/i);
    expect(result.data?.exitCode).toBe(1);
  });
});
