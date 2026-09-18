import type { ReleaseConfidenceReport, ReleaseVerdict } from '../shared/types/release.js';
import type { DiscoveredRequirement } from '../shared/types/requirements.js';
import type { TestRunResult } from '../shared/types/tests.js';
import type { DiagnosticResult } from '../shared/types/diagnostics.js';
import type { FlakyTestReport } from '../shared/types/release.js';

export interface ReleaseCheckInputs {
  requirements: DiscoveredRequirement[];
  latestRun: TestRunResult | null;
  diagnoses: DiagnosticResult[];
  flakyTests: FlakyTestReport[];
}

export class ReleaseCheckService {
  public static evaluate(inputs: ReleaseCheckInputs): ReleaseConfidenceReport {
    const { requirements, latestRun, diagnoses, flakyTests } = inputs;

    const totalReqs = requirements.length;
    const coveredReqs = requirements.filter(r => r.testCoverageStatus === 'covered').length;
    const uncoveredReqs = totalReqs - coveredReqs;

    const totalTests = latestRun?.summary.total || 0;
    const passedTests = latestRun?.summary.passed || 0;
    const failedTests = latestRun?.summary.failed || 0;

    const criticalFailures = diagnoses.filter(d => d.classification === 'APPLICATION_BUG').length;
    const unresolvedDiags = diagnoses.length;

    // Calculate score
    let score = 100;

    if (totalTests === 0) {
      score = 0;
    } else {
      const passRate = totalTests > 0 ? passedTests / totalTests : 0;
      score *= passRate;

      if (uncoveredReqs > 0) {
        score -= (uncoveredReqs / Math.max(1, totalReqs)) * 25;
      }

      if (criticalFailures > 0) {
        score -= criticalFailures * 30;
      }

      if (flakyTests.length > 0) {
        score -= flakyTests.length * 5;
      }
    }

    const confidenceScore = Math.max(0, Math.min(100, Math.round(score)));

    const reasons: string[] = [];
    const blockers: string[] = [];
    const recommendations: string[] = [];

    if (failedTests > 0) {
      blockers.push(`${failedTests} test(s) failed in the latest test run.`);
    }

    if (criticalFailures > 0) {
      blockers.push(`${criticalFailures} verified application bug(s) detected.`);
    }

    if (uncoveredReqs > 0) {
      reasons.push(`${uncoveredReqs} requirement(s) lack automated test coverage.`);
      recommendations.push('Run `veloprove plan` and `veloprove generate` to add missing tests.');
    }

    if (flakyTests.length > 0) {
      reasons.push(`${flakyTests.length} flaky test(s) detected in execution history.`);
    }

    let verdict: ReleaseVerdict = 'READY';
    if (blockers.length > 0 || confidenceScore < 60) {
      verdict = 'NOT_READY';
    } else if (reasons.length > 0 || confidenceScore < 85) {
      verdict = 'READY_WITH_WARNINGS';
    }

    return {
      verdict,
      confidenceScore,
      timestamp: new Date().toISOString(),
      summary: {
        totalRequirements: totalReqs,
        coveredRequirements: coveredReqs,
        uncoveredRequirements: uncoveredReqs,
        testsTotal: totalTests,
        testsPassed: passedTests,
        testsFailed: failedTests,
        flakyTestsDetected: flakyTests.length,
        criticalFailures,
        unresolvedDiagnoses: unresolvedDiags,
        codeRiskScore: 100 - confidenceScore
      },
      reasons,
      blockers,
      recommendations
    };
  }
}
