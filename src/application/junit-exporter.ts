import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { TestRunResult, TestCaseResult } from '../shared/types/tests.js';

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function suiteNameFromFile(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/\.(test|spec)\.[^.]+$/i, '').replace(/\//g, '.');
}

/**
 * Export a JUnit XML report compatible with GitHub Actions / Jenkins / Azure DevOps.
 */
export class JUnitExporter {
  public static buildXml(
    run: TestRunResult
  ): { xml: string; tests: number; failures: number } {
    const byFile = new Map<string, TestCaseResult[]>();

    for (const t of run.testResults || []) {
      const key = t.filePath || 'unknown';
      if (!byFile.has(key)) byFile.set(key, []);
      byFile.get(key)!.push(t);
    }

    // Fallback when adapters only populate failures[]
    if (byFile.size === 0 && (run.failures || []).length > 0) {
      for (const t of run.failures) {
        const key = t.filePath || 'unknown';
        if (!byFile.has(key)) byFile.set(key, []);
        byFile.get(key)!.push(t);
      }
    }

    const suites: string[] = [];
    let totalTests = 0;
    let totalFailures = 0;
    let totalSkipped = 0;
    let totalTime = (run.durationMs || 0) / 1000;

    for (const [file, cases] of byFile) {
      const failures = cases.filter((c) => c.status === 'failed').length;
      const skipped = cases.filter((c) => c.status === 'skipped').length;
      const timeSec =
        cases.reduce((s, c) => s + (c.durationMs || 0), 0) / 1000 || totalTime / Math.max(1, byFile.size);

      totalTests += cases.length;
      totalFailures += failures;
      totalSkipped += skipped;

      const casesXml = cases
        .map((c) => {
          const name = xmlEscape(c.title || c.id || 'unnamed');
          const classname = xmlEscape(suiteNameFromFile(file));
          const duration = ((c.durationMs || 0) / 1000).toFixed(3);
          if (c.status === 'failed') {
            const msg = xmlEscape(c.error?.message || 'Test failed');
            const detail = xmlEscape(c.error?.stack || c.error?.message || '');
            return `    <testcase name="${name}" classname="${classname}" time="${duration}">\n      <failure message="${msg}">${detail}</failure>\n    </testcase>`;
          }
          if (c.status === 'skipped') {
            return `    <testcase name="${name}" classname="${classname}" time="${duration}">\n      <skipped/>\n    </testcase>`;
          }
          return `    <testcase name="${name}" classname="${classname}" time="${duration}"/>`;
        })
        .join('\n');

      suites.push(
        `  <testsuite name="${xmlEscape(suiteNameFromFile(file))}" tests="${cases.length}" failures="${failures}" skipped="${skipped}" time="${timeSec.toFixed(3)}" timestamp="${xmlEscape(run.timestamp)}">\n${casesXml}\n  </testsuite>`
      );
    }

    // Empty run still emits a valid suite for CI parsers
    if (suites.length === 0) {
      totalTests = run.summary.total || 0;
      totalFailures = run.summary.failed || 0;
      suites.push(
        `  <testsuite name="veloprove" tests="${totalTests}" failures="${totalFailures}" skipped="${run.summary.skipped || 0}" time="${totalTime.toFixed(3)}" timestamp="${xmlEscape(run.timestamp)}"/>`
      );
    }

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<testsuites name="VeloProve" tests="${totalTests}" failures="${totalFailures}" skipped="${totalSkipped}" time="${totalTime.toFixed(3)}">\n` +
      suites.join('\n') +
      `\n</testsuites>\n`;

    return { xml, tests: totalTests, failures: totalFailures };
  }

  public static fromTestRun(
    guard: WorkspaceGuard,
    run: TestRunResult,
    outputPath = 'veloprove-junit.xml'
  ): { filePath: string; sizeBytes: number; tests: number; failures: number } {
    const resolved = guard.resolveSafePath(outputPath);
    const { xml, tests, failures } = JUnitExporter.buildXml(run);

    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, xml, 'utf8');

    return {
      filePath: resolved,
      sizeBytes: Buffer.byteLength(xml, 'utf8'),
      tests,
      failures
    };
  }
}
