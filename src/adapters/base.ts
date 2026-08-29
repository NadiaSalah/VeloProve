import type { TestFrameworkType } from '../shared/types/project.js';
import type { TestRunRequest, TestRunResult } from '../shared/types/tests.js';

export interface AdapterContext {
  projectRoot: string;
}

export interface TestDiscoveryResult {
  runner: TestFrameworkType;
  testFiles: string[];
}

export interface TestAdapter {
  readonly runner: TestFrameworkType;
  detect(context: AdapterContext): Promise<boolean>;
  discover(context: AdapterContext): Promise<TestDiscoveryResult>;
  run(request: TestRunRequest, context: AdapterContext): Promise<TestRunResult>;
}
