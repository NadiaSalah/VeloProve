/**
 * Canonical operation result model for VeloProve core capabilities.
 * CLI/MCP/Dashboard should render from this structure — not invent parallel shapes.
 */

export type OperationStatus =
  | 'SUCCESS'
  | 'SUCCESS_WITH_WARNINGS'
  | 'QUALITY_BLOCKED'
  | 'CONFIGURATION_ERROR'
  | 'INFRASTRUCTURE_ERROR'
  | 'CANCELLED'
  | 'INCONCLUSIVE'
  | 'FAILED';

export type ErrorCategory =
  | 'configuration'
  | 'detection'
  | 'dependency'
  | 'execution'
  | 'test_failure'
  | 'infrastructure'
  | 'timeout'
  | 'permission'
  | 'unsupported'
  | 'parser'
  | 'security'
  | 'agent'
  | 'internal';

export interface StructuredError {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  recoverable: boolean;
  remediation?: string;
  context?: Record<string, unknown>;
  cause?: string;
}

export interface OperationWarning {
  code: string;
  message: string;
  remediation?: string;
}

export interface EvidenceItem {
  id: string;
  kind: string;
  summary: string;
  path?: string;
  data?: unknown;
}

export interface DiagnosticNote {
  code: string;
  message: string;
  detail?: string;
}

export interface OperationResult<T = unknown> {
  success: boolean;
  status: OperationStatus;
  data?: T;
  warnings: OperationWarning[];
  errors: StructuredError[];
  evidence: EvidenceItem[];
  diagnostics: DiagnosticNote[];
  durationMs: number;
  runId: string;
  operation: string;
  metadata: Record<string, unknown>;
}

export function createRunId(prefix = 'run'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function okResult<T>(
  operation: string,
  data: T,
  extras: Partial<OperationResult<T>> = {}
): OperationResult<T> {
  const warnings = extras.warnings || [];
  return {
    success: true,
    status: warnings.length > 0 ? 'SUCCESS_WITH_WARNINGS' : 'SUCCESS',
    data,
    warnings,
    errors: extras.errors || [],
    evidence: extras.evidence || [],
    diagnostics: extras.diagnostics || [],
    durationMs: extras.durationMs || 0,
    runId: extras.runId || createRunId(operation),
    operation,
    metadata: extras.metadata || {}
  };
}

export function failResult<T = unknown>(
  operation: string,
  status: OperationStatus,
  error: StructuredError,
  extras: Partial<OperationResult<T>> = {}
): OperationResult<T> {
  return {
    success: false,
    status,
    data: extras.data,
    warnings: extras.warnings || [],
    errors: [error, ...(extras.errors || [])],
    evidence: extras.evidence || [],
    diagnostics: extras.diagnostics || [],
    durationMs: extras.durationMs || 0,
    runId: extras.runId || createRunId(operation),
    operation,
    metadata: extras.metadata || {}
  };
}

/** Map OperationStatus → process exit code for CI/agents. */
export function exitCodeForStatus(status: OperationStatus): number {
  switch (status) {
    case 'SUCCESS':
    case 'SUCCESS_WITH_WARNINGS':
      return 0;
    case 'QUALITY_BLOCKED':
      return 1;
    case 'CONFIGURATION_ERROR':
      return 2;
    case 'CANCELLED':
      return 130;
    case 'INFRASTRUCTURE_ERROR':
    case 'FAILED':
    case 'INCONCLUSIVE':
    default:
      return 3;
  }
}

export class VeloProveError extends Error {
  public readonly structured: StructuredError;

  constructor(structured: StructuredError) {
    super(structured.message);
    this.name = 'VeloProveError';
    this.structured = structured;
  }

  static configuration(message: string, remediation?: string, context?: Record<string, unknown>): VeloProveError {
    return new VeloProveError({
      code: 'VP_CONFIG',
      message,
      category: 'configuration',
      severity: 'HIGH',
      recoverable: true,
      remediation,
      context
    });
  }

  static execution(message: string, remediation?: string, context?: Record<string, unknown>): VeloProveError {
    return new VeloProveError({
      code: 'VP_EXEC',
      message,
      category: 'execution',
      severity: 'HIGH',
      recoverable: false,
      remediation,
      context
    });
  }

  static infrastructure(message: string, remediation?: string, context?: Record<string, unknown>): VeloProveError {
    return new VeloProveError({
      code: 'VP_INFRA',
      message,
      category: 'infrastructure',
      severity: 'HIGH',
      recoverable: true,
      remediation,
      context
    });
  }

  static timeout(message: string, context?: Record<string, unknown>): VeloProveError {
    return new VeloProveError({
      code: 'VP_TIMEOUT',
      message,
      category: 'timeout',
      severity: 'HIGH',
      recoverable: true,
      remediation: 'Increase timeout or reduce suite scope.',
      context
    });
  }
}
