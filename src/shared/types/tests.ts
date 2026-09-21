import type { TestFrameworkType } from './project.js';

export type TestLevel = 'unit' | 'component' | 'integration' | 'api' | 'e2e' | 'static';

export type TestCasePriority = 'critical' | 'high' | 'medium' | 'low';

export type OverwritePolicy = 'never' | 'generated-only' | 'explicit';

export interface PlannedTestCase {
  id: string;
  title: string;
  description: string;
  type: TestLevel;
  priority: TestCasePriority;
  requirementIds: string[];
  targetFiles: string[];
  runner: TestFrameworkType;
  reason: string;
  expectedBehavior: string;
  category: 'functional' | 'security' | 'auth' | 'error_handling' | 'validation' | 'edge_case' | 'boundary';
  steps?: string[];
  riskScore: number; // 0 - 100
  generatedFilePath?: string;
  isExisting?: boolean;
  /** Live-observed HTTP status (GET grounding); omit when offline */
  observedStatus?: number;
  observedPath?: string;
  observedUrl?: string;
  observedContentType?: string;
  /** Top-level JSON keys from live body preview */
  observedJsonKeys?: string[];
  /** Route path from site exploration for E2E generation */
  exploreRoute?: string;
  /** Relative fixture file used by generated test */
  fixturePath?: string;
}

export interface TestPlan {
  planId: string;
  summary: {
    totalTests: number;
    byLevel: Record<TestLevel, number>;
    byPriority: Record<TestCasePriority, number>;
    criticalCount: number;
    estimatedExecutionTimeSec: number;
  };
  detectedFeatures: string[];
  risks: Array<{
    area: string;
    score: number;
    reasons: string[];
  }>;
  testCases: PlannedTestCase[];
  coverageGaps: string[];
  createdAt: string;
}

export interface GeneratedTestFile {
  filePath: string;
  relativePath: string;
  framework: TestFrameworkType;
  testLevel: TestLevel;
  content: string;
  testCaseIds: string[];
  isNewFile: boolean;
  isHealed?: boolean;
}

export interface TestRunRequest {
  scope?: 'all' | 'changed' | 'affected' | 'paths' | 'plan' | 'testIds' | 'critical';
  testIds?: string[];
  paths?: string[];
  planId?: string;
  workspace?: string;
  browser?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  timeoutMs?: number;
  retries?: number;
  /** Twin-aware selection notes (populated by engine for OperationResult/evidence). */
  selectionRationale?: string[];
}

export interface TestCaseResult {
  id: string;
  title: string;
  filePath: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  durationMs: number;
  error?: {
    message: string;
    stack?: string;
    expected?: unknown;
    actual?: unknown;
    diff?: string;
    location?: {
      file: string;
      line: number;
      column: number;
    };
  };
  retryCount?: number;
  artifacts?: Array<{
    type: 'screenshot' | 'trace' | 'video' | 'dom_snapshot' | 'console_log' | 'network_log';
    path: string;
    description?: string;
  }>;
}

export interface TestRunResult {
  runId: string;
  timestamp: string;
  scope: string;
  status: 'passed' | 'failed' | 'partial';
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    timedOut: number;
  };
  durationMs: number;
  testResults: TestCaseResult[];
  failures: TestCaseResult[];
  artifacts: Array<{
    type: string;
    path: string;
    testId?: string;
  }>;
  /** Twin/changed selection notes when scope was resolved by the engine. */
  selectionRationale?: string[];
}
