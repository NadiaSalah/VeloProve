import type { TestCaseResult, TestRunResult } from '../../shared/types/tests.js';
import type { QAForgeConfig } from '../../shared/types/config.js';
import { DynamicVariableStore } from './dynamic-variables.js';
import { AutoAuthManager } from './auto-auth.js';
import { AutoCleanupManager, type CleanupAction } from './auto-cleanup.js';

export interface ApiTestStep {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: Record<string, unknown>;
  expectedStatus: number;
  expectedJsonSchema?: Record<string, unknown>;
  expectedHeaders?: Record<string, string>;
  extractVariables?: Record<string, string>; // e.g. { "orderId": "$.id" }
  cleanup?: CleanupAction;
}

export class NativeApiRunner {
  private variableStore: DynamicVariableStore = new DynamicVariableStore();
  private cleanupManager: AutoCleanupManager = new AutoCleanupManager();

  public async runSuite(
    steps: ApiTestStep[],
    config: QAForgeConfig['api'] = {}
  ): Promise<TestRunResult> {
    const startTime = Date.now();
    const runId = `api-run-${Date.now()}`;
    const baseURL = config.baseURL || 'http://localhost:3000';

    // 1. Run Auto-Auth if configured
    await AutoAuthManager.authenticate(config, this.variableStore);

    const testResults: TestCaseResult[] = [];

    // 2. Execute Steps sequentially
    for (const step of steps) {
      const stepStart = Date.now();
      const rawUrl = `${baseURL}${step.path.startsWith('/') ? '' : '/'}${step.path}`;
      const url = this.variableStore.interpolate(rawUrl);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(step.headers || {})
      };

      const authToken = this.variableStore.get('AUTH_TOKEN');
      if (authToken && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      let reqBody: string | undefined;
      if (step.body) {
        const interpolatedBodyStr = this.variableStore.interpolate(JSON.stringify(step.body));
        reqBody = interpolatedBodyStr;
      }

      try {
        const response = await fetch(url, {
          method: step.method,
          headers,
          body: reqBody
        });

        const durationMs = Date.now() - stepStart;
        const contentType = response.headers.get('content-type') || '';
        let resJson: any = null;
        let resText = '';

        if (contentType.includes('application/json')) {
          resJson = await response.json();
          resText = JSON.stringify(resJson, null, 2);
        } else {
          resText = await response.text();
        }

        // Check assertions
        const isStatusMatch = response.status === step.expectedStatus;
        let isSuccess = isStatusMatch;
        let errorMessage: string | undefined;

        if (!isStatusMatch) {
          errorMessage = `Expected HTTP status ${step.expectedStatus}, but received ${response.status} (${response.statusText}). Body: ${resText.slice(0, 300)}`;
        }

        // Extract dynamic variables if response is JSON and step succeeded
        if (isSuccess && step.extractVariables && resJson) {
          this.variableStore.extractFromResponse(resJson, step.extractVariables);
        }

        // Register cleanup action if provided
        if (isSuccess && step.cleanup) {
          this.cleanupManager.registerCleanup(step.cleanup);
        }

        testResults.push({
          id: step.id,
          title: `${step.method} ${step.path} - ${step.name}`,
          filePath: 'api-suite',
          status: isSuccess ? 'passed' : 'failed',
          durationMs,
          error: errorMessage ? { message: errorMessage } : undefined
        });
      } catch (err: any) {
        testResults.push({
          id: step.id,
          title: `${step.method} ${step.path} - ${step.name}`,
          filePath: 'api-suite',
          status: 'failed',
          durationMs: Date.now() - stepStart,
          error: {
            message: `Network/Connection error calling ${url}: ${err.message}`
          }
        });
      }
    }

    // 3. Post-run Auto-Cleanup teardown
    if (config.autoCleanup !== false) {
      await this.cleanupManager.executeCleanup(this.variableStore);
    }

    const failures = testResults.filter(t => t.status === 'failed');
    const passed = testResults.filter(t => t.status === 'passed');

    return {
      runId,
      timestamp: new Date().toISOString(),
      scope: 'api',
      status: failures.length === 0 ? 'passed' : 'failed',
      summary: {
        total: testResults.length,
        passed: passed.length,
        failed: failures.length,
        skipped: 0,
        timedOut: 0
      },
      durationMs: Date.now() - startTime,
      testResults,
      failures,
      artifacts: []
    };
  }
}
