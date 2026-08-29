import type { TestRunResult } from '../../shared/types/tests.js';
import type { FlakyTestReport } from '../../shared/types/release.js';

export class FlakyDetector {
  public static analyzeHistory(runs: TestRunResult[]): FlakyTestReport[] {
    if (runs.length === 0) return [];

    const testStats: Map<string, {
      testFile: string;
      testTitle: string;
      totalRuns: number;
      passedRuns: number;
      durations: number[];
      failureSignatures: Set<string>;
      lastObservedAt: string;
    }> = new Map();

    for (const run of runs) {
      for (const res of run.testResults) {
        const key = `${res.filePath}#${res.title}`;
        let stat = testStats.get(key);

        if (!stat) {
          stat = {
            testFile: res.filePath,
            testTitle: res.title,
            totalRuns: 0,
            passedRuns: 0,
            durations: [],
            failureSignatures: new Set(),
            lastObservedAt: run.timestamp
          };
          testStats.set(key, stat);
        }

        stat.totalRuns++;
        if (res.status === 'passed') {
          stat.passedRuns++;
        } else if (res.error?.message) {
          stat.failureSignatures.add(res.error.message.slice(0, 100));
        }
        stat.durations.push(res.durationMs);
      }
    }

    const reports: FlakyTestReport[] = [];

    for (const stat of testStats.values()) {
      const passRate = stat.totalRuns > 0 ? stat.passedRuns / stat.totalRuns : 1.0;
      const avgDuration = stat.durations.reduce((a, b) => a + b, 0) / stat.durations.length;
      
      const variance = stat.durations.reduce((acc, d) => acc + Math.pow(d - avgDuration, 2), 0) / stat.durations.length;
      const stdDev = Math.sqrt(variance);

      let status: FlakyTestReport['status'] = 'stable';
      if (stat.totalRuns >= 2 && passRate > 0 && passRate < 0.9) {
        status = 'confirmed-flaky';
      } else if (stat.totalRuns >= 2 && stdDev > 3000) {
        status = 'suspected-flaky';
      }

      if (status !== 'stable') {
        reports.push({
          testFile: stat.testFile,
          testTitle: stat.testTitle,
          status,
          runsCount: stat.totalRuns,
          passRate: Math.round(passRate * 100) / 100,
          averageDurationMs: Math.round(avgDuration),
          durationVarianceMs: Math.round(variance),
          failureSignatures: Array.from(stat.failureSignatures),
          lastObservedAt: stat.lastObservedAt
        });
      }
    }

    return reports;
  }
}
