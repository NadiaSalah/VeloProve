import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { TestRunResult, TestCaseResult } from '../shared/types/tests.js';

type AllureStatus = 'passed' | 'failed' | 'broken' | 'skipped' | 'unknown';

function toAllureStatus(status: string | undefined): AllureStatus {
  switch ((status || '').toLowerCase()) {
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'skipped':
      return 'skipped';
    case 'timedout':
    case 'timed_out':
      return 'broken';
    default:
      return 'unknown';
  }
}

function suiteNameFromFile(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/\.(test|spec)\.[^.]+$/i, '').replace(/\//g, '.');
}

export interface AllureBuiltFile {
  name: string;
  content: string;
}

/**
 * Export Allure 2 lifecycle result files (`*-result.json`) from a stored test run.
 * Compatible with `allure generate` / Allure Report consumers.
 */
export class AllureExporter {
  public static buildFiles(
    run: TestRunResult
  ): { files: AllureBuiltFile[]; tests: number; failures: number } {
    let cases: TestCaseResult[] = [...(run.testResults || [])];
    if (cases.length === 0 && (run.failures || []).length > 0) {
      cases = [...run.failures];
    }

    const startBase = Date.parse(run.timestamp) || Date.now();
    let failures = 0;
    const files: AllureBuiltFile[] = [];

    if (cases.length === 0) {
      const uuid = randomUUID();
      const status = toAllureStatus(run.status);
      const stop = startBase + (run.durationMs || 0);
      const result = {
        uuid,
        historyId: 'veloprove-summary',
        name: 'VeloProve test run',
        fullName: `veloprove.${run.runId}`,
        status,
        statusDetails:
          status === 'failed' || status === 'broken'
            ? { message: `Run ${run.runId} finished with status ${run.status}` }
            : undefined,
        stage: 'finished',
        start: startBase,
        stop,
        labels: [
          { name: 'framework', value: 'veloprove' },
          { name: 'suite', value: 'veloprove' },
          { name: 'package', value: 'veloprove' }
        ]
      };
      files.push({ name: `${uuid}-result.json`, content: JSON.stringify(result, null, 2) });
      failures = run.summary.failed || 0;
    } else {
      let cursor = startBase;
      for (const c of cases) {
        const uuid = randomUUID();
        const status = toAllureStatus(c.status);
        if (status === 'failed' || status === 'broken') failures += 1;
        const duration = c.durationMs || 0;
        const start = cursor;
        const stop = start + duration;
        cursor = stop;
        const suite = suiteNameFromFile(c.filePath || 'unknown');
        const name = c.title || c.id || 'unnamed';
        const result = {
          uuid,
          historyId: `${suite}.${name}`,
          testCaseId: c.id || undefined,
          name,
          fullName: `${suite}.${name}`,
          status,
          statusDetails:
            status === 'failed' || status === 'broken'
              ? {
                  message: c.error?.message || 'Test failed',
                  trace: c.error?.stack || c.error?.message || undefined
                }
              : undefined,
          stage: 'finished',
          start,
          stop,
          labels: [
            { name: 'framework', value: 'veloprove' },
            { name: 'suite', value: suite },
            { name: 'package', value: suite },
            { name: 'testClass', value: suite },
            { name: 'testMethod', value: name }
          ]
        };
        files.push({ name: `${uuid}-result.json`, content: JSON.stringify(result, null, 2) });
      }
    }

    files.push({
      name: 'executor.json',
      content: JSON.stringify(
        {
          name: 'VeloProve',
          type: 'veloprove',
          buildName: run.runId,
          reportName: 'VeloProve Allure Results'
        },
        null,
        2
      )
    });

    return {
      files,
      tests: cases.length || run.summary.total || files.filter((f) => f.name.endsWith('-result.json')).length,
      failures
    };
  }

  public static fromTestRun(
    guard: WorkspaceGuard,
    run: TestRunResult,
    outputDir = 'allure-results'
  ): { dirPath: string; resultFiles: number; tests: number; failures: number } {
    const resolvedDir = guard.resolveSafePath(outputDir);
    fs.mkdirSync(resolvedDir, { recursive: true });

    // Clear prior result stubs in this folder (keep attachments if any)
    for (const name of fs.readdirSync(resolvedDir)) {
      if (name.endsWith('-result.json')) {
        fs.unlinkSync(path.join(resolvedDir, name));
      }
    }

    const built = AllureExporter.buildFiles(run);
    for (const file of built.files) {
      fs.writeFileSync(path.join(resolvedDir, file.name), file.content, 'utf8');
    }

    return {
      dirPath: resolvedDir,
      resultFiles: built.files.filter((f) => f.name.endsWith('-result.json')).length,
      tests: built.tests,
      failures: built.failures
    };
  }
}
