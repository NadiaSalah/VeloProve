import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../../execution/workspace-guard.js';

export interface DeduplicationItem {
  testTitle: string;
  firstOccurrence: {
    file: string;
    line: number;
  };
  duplicates: Array<{
    file: string;
    line: number;
  }>;
  similarityScore: number;
}

export interface TestDeduplicationReport {
  totalTestsScanned: number;
  uniqueTestTitles: number;
  redundantCount: number;
  redundancyPercentage: number;
  duplicates: DeduplicationItem[];
  recommendations: string[];
  timestamp: string;
}

export class TestDeduplicatorService {
  public static analyze(guard: WorkspaceGuard, testFiles?: string[]): TestDeduplicationReport {
    const root = guard.getRoot();
    const filesToScan = testFiles || this.gatherTestFiles(root);

    const testMap = new Map<string, Array<{ file: string; line: number; rawTitle: string }>>();
    let totalTestsScanned = 0;

    for (const relFile of filesToScan) {
      const fullPath = path.isAbsolute(relFile) ? relFile : path.join(root, relFile);
      if (!fs.existsSync(fullPath)) continue;

      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf8');
      } catch {
        continue;
      }

      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match it('title', ...), test('title', ...), it.skip, test.only
        const testMatch = line.match(/(?:it|test)(?:\.(?:only|skip|concurrent|todo))?\(\s*['"`]([^'"`]+)['"`]/i);
        if (testMatch) {
          totalTestsScanned++;
          const rawTitle = testMatch[1];
          const normalizedTitle = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

          if (!testMap.has(normalizedTitle)) {
            testMap.set(normalizedTitle, []);
          }
          testMap.get(normalizedTitle)!.push({
            file: relFile,
            line: i + 1,
            rawTitle
          });
        }
      }
    }

    const duplicates: DeduplicationItem[] = [];
    let redundantCount = 0;

    for (const [, occurrences] of testMap.entries()) {
      if (occurrences.length > 1) {
        redundantCount += occurrences.length - 1;
        const [first, ...rest] = occurrences;
        duplicates.push({
          testTitle: first.rawTitle,
          firstOccurrence: { file: first.file, line: first.line },
          duplicates: rest.map(r => ({ file: r.file, line: r.line })),
          similarityScore: 1.0
        });
      }
    }

    const uniqueCount = testMap.size;
    const redundancyPercentage = totalTestsScanned > 0 ? Number(((redundantCount / totalTestsScanned) * 100).toFixed(1)) : 0;

    const recommendations: string[] = [];
    if (duplicates.length > 0) {
      recommendations.push(`Identified ${redundantCount} redundant test assertions across ${duplicates.length} duplicate test cases.`);
      recommendations.push('Consolidate duplicate test suites into parameterized test tables (`test.each`) to accelerate test execution.');
    } else {
      recommendations.push('Zero redundant test duplicates found. Test suite has optimal test case density.');
    }

    return {
      totalTestsScanned,
      uniqueTestTitles: uniqueCount,
      redundantCount,
      redundancyPercentage,
      duplicates,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }

  private static gatherTestFiles(dir: string, baseDir = dir): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.veloprove']);
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!ignoreDirs.has(entry.name)) {
            results.push(...this.gatherTestFiles(path.join(dir, entry.name), baseDir));
          }
        } else if (/\.(test|spec)\.(ts|tsx|js|jsx|py|go|java)$/.test(entry.name)) {
          results.push(path.relative(baseDir, path.join(dir, entry.name)).replace(/\\/g, '/'));
        }
      }
    } catch {}

    return results;
  }
}
