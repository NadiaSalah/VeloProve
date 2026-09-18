export type FailureClassification =
  | 'APPLICATION_BUG'
  | 'TEST_BUG'
  | 'FLAKY_TEST'
  | 'ENVIRONMENT_FAILURE'
  | 'CONFIGURATION_FAILURE'
  | 'DEPENDENCY_FAILURE'
  | 'NETWORK_FAILURE'
  | 'TIMEOUT'
  | 'DATA_FAILURE'
  | 'UNKNOWN';

export interface FailureEvidence {
  testId: string;
  testName: string;
  testFile: string;
  sourceLocation?: {
    file: string;
    line?: number;
    column?: number;
  };
  errorMessage: string;
  stackTrace?: string;
  assertionDiff?: {
    expected: string;
    actual: string;
  };
  stdout?: string;
  stderr?: string;
  recentGitChanges?: Array<{
    file: string;
    status: 'modified' | 'added' | 'deleted';
  }>;
  browserEvidence?: {
    failedUrl?: string;
    failedSelector?: string;
    domSnapshotPath?: string;
    screenshotPath?: string;
    consoleErrors?: string[];
    failedRequests?: Array<{
      url: string;
      method: string;
      status: number;
    }>;
  };
  timingMs?: number;
  retryAttempts?: number;
}

export interface DiagnosticResult {
  diagnosisId: string;
  testId: string;
  classification: FailureClassification;
  /** Model confidence in the classification — not evidence strength. */
  confidence: number; // 0.00 - 1.00
  rootCause: string;
  evidence: FailureEvidence;
  /** Concrete signals drawn from evidence (facts), separate from speculation. */
  evidenceSignals: string[];
  /** Hypotheses that are not directly proven by evidence. */
  speculationNotes: string[];
  affectedFiles: string[];
  suggestedActions: string[];
  canAutoHealTest: boolean;
}

export interface HealResult {
  testFile: string;
  testId: string;
  success: boolean;
  beforeSnippet: string;
  afterSnippet: string;
  reason: string;
  confidence: number;
  evidenceUsed: string[];
  verificationRunStatus?: 'passed' | 'failed';
}

export interface SourceFixSuggestion {
  problem: string;
  probableRootCause: string;
  affectedFiles: string[];
  suggestedChange: {
    file: string;
    description: string;
    diffOrPatch?: string;
  };
  confidence: number;
  evidence: string[];
  recommendedValidation: string;
}
