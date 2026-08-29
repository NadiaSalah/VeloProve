import fs from 'node:fs';
import path from 'node:path';
import type { TestAdapter, AdapterContext, TestDiscoveryResult } from '../base.js';
import type { TestRunRequest, TestRunResult, TestCaseResult } from '../../shared/types/tests.js';
import { SafeProcessRunner } from '../../execution/process-runner.js';
import { WorkspaceGuard } from '../../execution/workspace-guard.js';
import { DevServerManager } from '../../execution/server-manager.js';
import { ConfigLoader } from '../../shared/config-loader.js';

export class PlaywrightAdapter implements TestAdapter {
  public readonly runner = 'playwright';

  public async detect(context: AdapterContext): Promise<boolean> {
    const pkgPath = path.join(context.projectRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      return (
        !!deps['@playwright/test'] ||
        !!deps['playwright'] ||
        fs.existsSync(path.join(context.projectRoot, 'playwright.config.ts')) ||
        fs.existsSync(path.join(context.projectRoot, 'playwright.config.js'))
      );
    } catch {
      return false;
    }
  }

  public async discover(context: AdapterContext): Promise<TestDiscoveryResult> {
    const testFiles: string[] = [];
    const searchDirs = ['e2e', 'tests/e2e', 'tests'];

    for (const dirName of searchDirs) {
      const fullDir = path.join(context.projectRoot, dirName);
      if (fs.existsSync(fullDir)) {
        this.walkDirectory(fullDir, context.projectRoot, testFiles);
      }
    }

    return { runner: 'playwright', testFiles };
  }

  private walkDirectory(dir: string, root: string, testFiles: string[]): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', '.git', '.qaforge'].includes(entry.name)) {
          this.walkDirectory(full, root, testFiles);
        }
      } else if (/\.(spec|test)\.(ts|js)$/.test(entry.name)) {
        testFiles.push(path.relative(root, full).replace(/\\/g, '/'));
      }
    }
  }

  public async run(request: TestRunRequest, context: AdapterContext): Promise<TestRunResult> {
    const guard = new WorkspaceGuard(context.projectRoot);
    const configLoader = new ConfigLoader(guard);
    const config = await configLoader.loadConfig();

    const devServerManager = new DevServerManager(guard);
    const serverManagerStarted = false;

    // 1. Ensure Dev Server if configured
    try {
      if (config.devServer?.command) {
        await devServerManager.ensureServer(config.devServer);
      }
    } catch (err) {
      console.warn('[QAForge] Warning: Dev server startup failed:', err);
    }

    const runner = new SafeProcessRunner(guard);
    const args = ['playwright', 'test', '--reporter=json'];

    if (request.browser) {
      args.push(`--project=${request.browser}`);
    }

    if (request.headless !== false) {
      // default headless
    }

    if (request.paths && request.paths.length > 0) {
      args.push(...request.paths);
    }

    const outputFile = path.join(guard.getQAForgeDirectory(), 'cache', 'playwright-output.json');
    args.push(`--output=${path.join(guard.getQAForgeDirectory(), 'artifacts')}`);

    const res = await runner.run('npx', args, {
      cwd: context.projectRoot,
      timeoutMs: request.timeoutMs || 120000,
      env: {
        PLAYWRIGHT_JSON_OUTPUT_NAME: outputFile
      }
    });

    // Cleanup dev server if QAForge started it
    if (serverManagerStarted) {
      await devServerManager.stopServer();
    }

    const runId = `run-playwright-${Date.now()}`;
    const testResults: TestCaseResult[] = [];
    const artifacts: TestRunResult['artifacts'] = [];

    if (fs.existsSync(outputFile)) {
      try {
        const rawJson = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        if (rawJson.suites) {
          this.parsePlaywrightSuites(rawJson.suites, context.projectRoot, testResults, artifacts);
        }
      } catch {
        // ignore parse error
      }
    }

    if (testResults.length === 0) {
      const isPass = res.exitCode === 0;
      testResults.push({
        id: `playwright-suite`,
        title: 'Playwright Browser Suite',
        filePath: request.paths?.[0] || 'e2e/',
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
      artifacts
    };
  }

  private parsePlaywrightSuites(
    suites: any[],
    root: string,
    testResults: TestCaseResult[],
    artifacts: TestRunResult['artifacts']
  ): void {
    for (const suite of suites) {
      const relFile = suite.file ? path.relative(root, suite.file).replace(/\\/g, '/') : suite.title;

      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          for (const result of test.results || []) {
            const status = result.status === 'passed' ? 'passed' : result.status === 'timedOut' ? 'timedOut' : 'failed';
            let error: TestCaseResult['error'];

            if (result.error) {
              error = {
                message: result.error.message || 'Playwright test failed',
                stack: result.error.stack,
                location: result.error.location
                  ? {
                      file: result.error.location.file,
                      line: result.error.location.line,
                      column: result.error.location.column
                    }
                  : undefined
              };
            }

            const testArtifacts: TestCaseResult['artifacts'] = [];
            for (const att of result.attachments || []) {
              if (att.path) {
                const artType = att.name.includes('screenshot')
                  ? 'screenshot'
                  : att.name.includes('trace')
                  ? 'trace'
                  : att.name.includes('video')
                  ? 'video'
                  : 'dom_snapshot';
                testArtifacts.push({
                  type: artType,
                  path: att.path,
                  description: att.name
                });
                artifacts.push({
                  type: artType,
                  path: att.path,
                  testId: `${relFile}#${spec.title}`
                });
              }
            }

            testResults.push({
              id: `${relFile}#${spec.title}`,
              title: spec.title,
              filePath: relFile,
              status,
              durationMs: result.duration || 0,
              error,
              retryCount: result.retry || 0,
              artifacts: testArtifacts
            });
          }
        }
      }

      if (suite.suites) {
        this.parsePlaywrightSuites(suite.suites, root, testResults, artifacts);
      }
    }
  }
}
