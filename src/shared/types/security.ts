export type SecurityCategory =
  | 'authentication'
  | 'authorization'
  | 'forms_inputs'
  | 'injection'
  | 'api_security'
  | 'sessions_tokens'
  | 'file_uploads';

export type SecuritySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type SecurityConfidence = 'CONFIRMED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'POTENTIAL';

export type SecurityTestStatus =
  | 'PASS'
  | 'FAIL'
  | 'WARN'
  | 'SKIPPED'
  | 'NOT_APPLICABLE'
  | 'INCONCLUSIVE';

export interface SecurityAttackSurface {
  authEndpoints: Array<{
    path: string;
    method: string;
    type: 'login' | 'register' | 'logout' | 'password_reset' | 'oauth' | 'token_refresh' | 'user_profile';
    sourceFile?: string;
  }>;
  protectedRoutes: Array<{
    path: string;
    method: string;
    requiredRole?: string;
    middlewareOrGuard?: string;
    sourceFile?: string;
  }>;
  formsAndInputs: Array<{
    formId?: string;
    action?: string;
    method?: string;
    inputs: Array<{
      name: string;
      type: string;
      required?: boolean;
      isHidden?: boolean;
      isDisabled?: boolean;
    }>;
    sourceFile?: string;
  }>;
  fileUploadEndpoints: Array<{
    path: string;
    method: string;
    fieldName: string;
    maxSizeMb?: number;
    allowedMimes?: string[];
    sourceFile?: string;
  }>;
  sessionAndTokenMechanisms: {
    jwtDetected: boolean;
    cookiesDetected: boolean;
    cookieFlags?: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: string;
    };
    detectedLibraries: string[];
  };
  databaseTechnologies: {
    sqlDetected: boolean;
    noSqlDetected: boolean;
    ormOrLibraries: string[];
  };
  detectedFramework: string;
  summary: {
    totalAuthEndpoints: number;
    totalProtectedRoutes: number;
    totalFormInputs: number;
    totalUploadEndpoints: number;
  };
}

export interface SecurityTestCase {
  id: string;
  title: string;
  category: SecurityCategory;
  subcategory: string;
  targetEndpoint?: string;
  targetMethod?: string;
  targetParameter?: string;
  risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  safeModeCompatible: boolean;
  requiresAuthentication: boolean;
  requiresRole?: string;
  requiresBrowser: boolean;
  requiresApi: boolean;
  requiresFixtureData: boolean;
  destructive: false;
  description: string;
}

export interface SecurityTestPlan {
  planId: string;
  timestamp: string;
  surface: SecurityAttackSurface;
  testCases: SecurityTestCase[];
  summary: {
    totalTests: number;
    byCategory: Record<SecurityCategory, number>;
    byRisk: Record<string, number>;
    estimatedDurationSec: number;
  };
}

export interface SecurityFinding {
  id: string;
  title: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  confidence: SecurityConfidence;
  status: SecurityTestStatus;
  endpoint?: string;
  method?: string;
  parameter?: string;
  sourceLocation?: {
    file: string;
    line?: number;
    column?: number;
  };
  evidence: string;
  expectedBehavior: string;
  actualBehavior: string;
  impact: string;
  remediation: string;
  reproductionSteps?: string[];
  testId: string;
  timestamp: string;
}

export interface SecurityTestExecutionResult {
  testId: string;
  title: string;
  category: SecurityCategory;
  status: SecurityTestStatus;
  severity?: SecuritySeverity;
  durationMs: number;
  finding?: SecurityFinding;
  error?: string;
}

export interface SecurityReport {
  reportId: string;
  timestamp: string;
  target: string;
  environment: 'test' | 'staging' | 'production' | 'local';
  safeMode: boolean;
  deepMode: boolean;
  securityScore: number; // 0 - 100
  verdict: 'SECURE' | 'NEEDS_ATTENTION' | 'CRITICAL_VULNERABILITIES';
  categoryScores: Record<SecurityCategory, number>;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
    severityCounts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
    };
  };
  findings: SecurityFinding[];
  remediationRoadmap: Array<{
    priority: number;
    findingId: string;
    action: string;
    frameworkSpecificAdvice?: string;
  }>;
}

export interface SecurityTestingOptions {
  baseURL?: string;
  categories?: SecurityCategory[];
  safeMode?: boolean;
  deepMode?: boolean;
  environment?: 'test' | 'staging' | 'production' | 'local';
  allowProduction?: boolean;
  maxSafeAttempts?: number;
  format?: 'console' | 'json' | 'markdown' | 'html';
  outputFile?: string;
}
