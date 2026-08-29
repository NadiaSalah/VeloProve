import fs from 'node:fs';
import path from 'node:path';
import type { TestAdapter, AdapterContext, TestDiscoveryResult } from '../base.js';
import type { TestRunRequest, TestRunResult, TestCaseResult } from '../../shared/types/tests.js';
import { SafeProcessRunner } from '../../execution/process-runner.js';
import { WorkspaceGuard } from '../../execution/workspace-guard.js';

export class JestAdapter implements TestAdapter {
  public readonly runner = 'jest';

  public async detect(context: AdapterContext): Promise<boolean> {
    const pkgPath = path.join(context.projectRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      return !!deps.jest || fs.existsSync(path.join(context.projectRoot, 'jest.config.js'));
    } catch {
      return false;
    }
  }

  public async discover(context: AdapterContext): Promise<TestDiscoveryResult> {
    const testFiles: string[] = [];
    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', '.git', '.qaforge'].includes(entry.name)) {
            walk(full);
          }
        } else if (/\.(test|spec)\.(ts|js|jsx|tsx)$/.test(entry.name)) {
          testFiles.push(path.relative(context.projectRoot, full).replace(/\\/g, '/'));
        }
      }
    };

    walk(context.projectRoot);
    return { runner: 'jest', testFiles };
  }

  public async run(request: TestRunRequest, context: AdapterContext): Promise<TestRunResult> {
    const guard = new WorkspaceGuard(context.projectRoot);
    const runner = new SafeProcessRunner(guard);

    const args = ['jest', '--json'];
    if (request.paths && request.paths.length > 0) {
      args.push(...request.paths);
    }

    const outputFile = path.join(guard.getQAForgeDirectory(), 'cache', 'jest-output.json');
    args.push(`--outputFile=${outputFile}`);

    const res = await runner.run('npx', args, {
      cwd: context.projectRoot,
      timeoutMs: request.timeoutMs || 60000
    });

    const runId = `run-${Date.now()}`;
    const testResults: TestCaseResult[] = [];

    if (fs.existsSync(outputFile)) {
      try {
        const rawJson = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        if (rawJson.testResults) {
          for (const suite of rawJson.testResults) {
            const relFile = path.relative(context.projectRoot, suite.name).replace(/\\/g, '/');
            for (const assertion of suite.assertionResults || []) {
              const status = assertion.status === 'passed' ? 'passed' : 'failed';
              const durationMs = assertion.duration || 0;
              let error: TestCaseResult['error'];

              if (status === 'failed' && assertion.failureMessages?.length > 0) {
                const msg = assertion.failureMessages.join('\n');
                error = {
                  message: msg.split('\n')[0] || 'Jest assertion failed',
                  stack: msg
                };
              }

              testResults.push({
                id: `${relFile}#${assertion.title}`,
                title: assertion.title,
                filePath: relFile,
                status,
                durationMs,
                error
              });
            }
          }
        }
      } catch {
        // ignore parse error
      }
    }

    if (testResults.length === 0) {
      const isPass = res.exitCode === 0;
      testResults.push({
        id: `jest-suite`,
        title: 'Jest Execution',
        filePath: request.paths?.[0] || 'src/',
        status: isPass ? 'passed' : 'failed',
        durationMs: res.durationMs,
        error: isPass ? undefined : { message: res.stderr || res.stdout }
      });
    }

    const failures = testResults.filter(t => t.status === 'failed');
    const passed = testResults.filter(t => t.status === 'passed');
    const skipped = testResults.filter(t => t.status === 'skipped');
    const timedOut = testResults.filter(t => t.status === 'timedOut');

    return {
      runId,
      timestamp: new Date().toISOString(),
      scope: request.scope || 'all',
      status: failures.length === 0 ? 'passed' : 'failed',
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
