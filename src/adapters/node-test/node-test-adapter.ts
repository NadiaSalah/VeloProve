import fs from 'node:fs';
import path from 'node:path';
import type { TestAdapter, AdapterContext, TestDiscoveryResult } from '../base.js';
import type { TestRunRequest, TestRunResult, TestCaseResult } from '../../shared/types/tests.js';
import { SafeProcessRunner } from '../../execution/process-runner.js';
import { WorkspaceGuard } from '../../execution/workspace-guard.js';
import { DEFAULT_EXECUTION_POLICY } from '../../shared/execution-policy.js';

/**
 * Adapter for Node.js built-in test runner (`node --test` / `node:test`).
 * Prefer when package.json scripts.test uses `node --test` and no Vitest/Jest dep.
 */
export class NodeTestAdapter implements TestAdapter {
  public readonly runner = 'node:test';

  public async detect(context: AdapterContext): Promise<boolean> {
    const pkgPath = path.join(context.projectRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    try {
      const raw = fs.readFileSync(pkgPath, 'utf8').replace(/^\uFEFF/, '');
      const pkg = JSON.parse(raw);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.vitest || deps.jest || deps['@playwright/test']) return false;
      const testScript = String(pkg.scripts?.test || '');
      if (/\bnode\b.*--test\b/.test(testScript) || /\bnode:test\b/.test(testScript)) return true;
      return this.hasNodeTestImport(context.projectRoot);
    } catch {
      return this.hasNodeTestImport(context.projectRoot);
    }
  }

  private hasNodeTestImport(root: string): boolean {
    const testsDir = path.join(root, 'tests');
    if (!fs.existsSync(testsDir)) return false;
    const stack = [testsDir];
    while (stack.length) {
      const dir = stack.pop()!;
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const st = fs.statSync(full);
        if (st.isDirectory()) {
          if (!['node_modules', 'dist', '.git'].includes(name)) stack.push(full);
          continue;
        }
        if (!/\.(test|spec)\.(js|mjs|cjs|ts)$/.test(name)) continue;
        try {
          const src = fs.readFileSync(full, 'utf8').slice(0, 2000);
          if (/from\s+['"]node:test['"]|require\(['"]node:test['"]\)/.test(src)) return true;
        } catch {
          /* skip */
        }
      }
    }
    return false;
  }

  public async discover(context: AdapterContext): Promise<TestDiscoveryResult> {
    const testFiles: string[] = [];
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', '.git', '.veloprove'].includes(entry.name)) walk(full);
        } else if (/\.(test|spec)\.(ts|js|mjs|cjs|tsx|jsx)$/.test(entry.name)) {
          testFiles.push(path.relative(context.projectRoot, full).replace(/\\/g, '/'));
        }
      }
    };
    walk(path.join(context.projectRoot, 'tests'));
    walk(path.join(context.projectRoot, 'test'));
    if (testFiles.length === 0) walk(context.projectRoot);
    return { runner: 'node:test', testFiles };
  }

  public async run(request: TestRunRequest, context: AdapterContext): Promise<TestRunResult> {
    const guard = new WorkspaceGuard(context.projectRoot);
    const runner = new SafeProcessRunner(guard);

    const discovery = await this.discover(context);
    const paths =
      request.paths && request.paths.length > 0
        ? request.paths
        : discovery.testFiles.length > 0
          ? discovery.testFiles
          : ['tests'];

    const args = ['--test', '--test-reporter=tap', ...paths];
    const res = await runner.run(process.execPath, args, {
      cwd: context.projectRoot,
      timeoutMs: request.timeoutMs || DEFAULT_EXECUTION_POLICY.timeouts.processMs
    });

    const combined = `${res.stdout || ''}\n${res.stderr || ''}`;
    const testResults = parseTapResults(combined, paths[0] || 'tests');

    if (testResults.length === 0) {
      const isPass = res.exitCode === 0;
      testResults.push({
        id: 'node-test-suite',
        title: 'node --test',
        filePath: paths[0] || 'tests',
        status: isPass ? 'passed' : 'failed',
        durationMs: res.durationMs,
        error: isPass ? undefined : { message: (res.stderr || res.stdout || 'node --test failed').slice(0, 2000) }
      });
    }

    const failures = testResults.filter((t) => t.status === 'failed');
    const passed = testResults.filter((t) => t.status === 'passed');
    const skipped = testResults.filter((t) => t.status === 'skipped');
    const timedOut = testResults.filter((t) => t.status === 'timedOut');

    return {
      runId: `run-${Date.now()}`,
      timestamp: new Date().toISOString(),
      scope: request.scope || 'all',
      status: failures.length === 0 && res.exitCode === 0 ? 'passed' : 'failed',
      summary: {
        total: testResults.length,
        passed: passed.length,
        failed: failures.length,
        skipped: skipped.length,
        timedOut: timedOut.length
      },
      durationMs: res.durationMs,
      testResults,
      failures,
      artifacts: []
    };
  }
}

/** Minimal TAP parser for `node --test --test-reporter=tap` output. */
export function parseTapResults(tap: string, fallbackFile: string): TestCaseResult[] {
  const results: TestCaseResult[] = [];
  const lines = String(tap || '').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^(not )?ok\s+\d+\s+-\s+(.+)$/);
    if (!m) continue;
    const failed = !!m[1];
    const title = m[2].trim();
    results.push({
      id: `${fallbackFile}#${title}`,
      title,
      filePath: fallbackFile,
      status: failed ? 'failed' : 'passed',
      durationMs: 0,
      error: failed ? { message: `Assertion failed: ${title}` } : undefined
    });
  }
  return results;
}
