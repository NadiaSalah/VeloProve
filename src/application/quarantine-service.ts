import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { FlakyTestReport } from '../shared/types/release.js';
import type { LocalStorage } from '../storage/local-store.js';

export interface QuarantinedTestItem {
  testTitle: string;
  testFile: string;
  flakinessRate: number;
  reason: string;
  quarantinedAt: string;
}

export interface QuarantineReport {
  activeQuarantineCount: number;
  quarantinedTests: QuarantinedTestItem[];
  quarantineFilePath: string;
  actionTaken: 'updated' | 'no_flaky_tests';
}

export class QuarantineService {
  public static quarantineFlakyTests(
    guard: WorkspaceGuard,
    storage: LocalStorage,
    threshold = 0.25 // >= 25% failure variance is flaky
  ): QuarantineReport {
    const qaDir = guard.getQAForgeDirectory();
    const quarantineFilePath = path.join(qaDir, 'quarantine.json');

    const flakyReports: FlakyTestReport[] = storage.getFlakyHistory();
    const candidates = flakyReports.filter(f => (1 - f.passRate) >= threshold || f.status === 'confirmed-flaky');

    const quarantined: QuarantinedTestItem[] = candidates.map(f => {
      const flakinessRate = Math.round((1 - f.passRate) * 100) / 100;
      return {
        testTitle: f.testTitle,
        testFile: f.testFile,
        flakinessRate,
        reason: `High flakiness rate (${Math.round(flakinessRate * 100)}%) across historical runs`,
        quarantinedAt: new Date().toISOString()
      };
    });

    fs.writeFileSync(quarantineFilePath, JSON.stringify(quarantined, null, 2), 'utf8');

    return {
      activeQuarantineCount: quarantined.length,
      quarantinedTests: quarantined,
      quarantineFilePath: path.relative(guard.getRoot(), quarantineFilePath).replace(/\\/g, '/'),
      actionTaken: quarantined.length > 0 ? 'updated' : 'no_flaky_tests'
    };
  }

  public static getQuarantined(guard: WorkspaceGuard): QuarantinedTestItem[] {
    const quarantineFilePath = path.join(guard.getQAForgeDirectory(), 'quarantine.json');
    if (!fs.existsSync(quarantineFilePath)) return [];
    try {
      return JSON.parse(fs.readFileSync(quarantineFilePath, 'utf8'));
    } catch {
      return [];
    }
  }
}
