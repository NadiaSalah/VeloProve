export type ReleaseVerdict = 'READY' | 'READY_WITH_WARNINGS' | 'NOT_READY';

export interface ReleaseConfidenceReport {
  verdict: ReleaseVerdict;
  confidenceScore: number; // 0 - 100
  timestamp: string;
  summary: {
    totalRequirements: number;
    coveredRequirements: number;
    uncoveredRequirements: number;
    testsTotal: number;
    testsPassed: number;
    testsFailed: number;
    flakyTestsDetected: number;
    criticalFailures: number;
    unresolvedDiagnoses: number;
    codeRiskScore: number;
  };
  reasons: string[];
  blockers: string[];
  recommendations: string[];
}

export interface FlakyTestReport {
  testFile: string;
  testTitle: string;
  status: 'stable' | 'suspected-flaky' | 'confirmed-flaky';
  runsCount: number;
  passRate: number; // 0.00 - 1.00
  averageDurationMs: number;
  durationVarianceMs: number;
  failureSignatures: string[];
  lastObservedAt: string;
}

export interface CoverageReport {
  lineCoveragePct: number;
  branchCoveragePct: number;
  functionCoveragePct: number;
  statementCoveragePct: number;
  requirementCoveragePct: number;
  uncoveredRequirements: Array<{
    id: string;
    title: string;
    priority: string;
  }>;
}
