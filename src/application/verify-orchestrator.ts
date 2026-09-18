/**
 * VerifyOrchestrator — change-aware autonomous QA pipeline.
 *
 * Flow: inspect → (optional doctor) → change impact → select tests → run →
 * diagnose → conservative heal for TEST_BUG → optional security/a11y → release.
 * Returns a versioned OperationResult with evidence, warnings, and CI exit codes.
 *
 * Intent strings are planned deterministically (no LLM). Only security and
 * accessibility from the intent plan are auto-included today; other planned
 * capabilities are recorded as evidence for agents to follow up.
 */
import type { VeloProveEngine } from './engine.js';
import { CapabilityRegistry, type CapabilityId } from './capability-registry.js';
import { IntentPlanner } from './intent-planner.js';
import {
  createRunId,
  exitCodeForStatus,
  failResult,
  okResult,
  type EvidenceItem,
  type OperationResult,
  type OperationStatus,
  type OperationWarning,
  type StructuredError
} from '../shared/types/operation.js';
import type { ImpactAnalysisResult } from '../intelligence/change-impact/dependency-graph.js';
import type { DiagnosticResult } from '../shared/types/diagnostics.js';
import type { HealResult } from '../shared/types/diagnostics.js';
import type { TestRunResult } from '../shared/types/tests.js';
import type { ReleaseConfidenceReport } from '../shared/types/release.js';
import type { DoctorReport } from './doctor-service.js';
import type { ProjectProfile } from '../shared/types/project.js';
import type { SecurityReport } from '../shared/types/security.js';
import type { A11yAuditResult } from './a11y-auditor.js';
import { FailureEvidencePackService } from './failure-evidence-pack.js';

export interface VerifyOptions {
  /** Force full suite instead of impacted paths */
  fullSuite?: boolean;
  /** Include security suite when relevant or forced */
  includeSecurity?: boolean;
  /** Include accessibility when UI changed or forced */
  includeA11y?: boolean;
  /** Auto-heal TEST_BUG diagnoses (default true) */
  autoHeal?: boolean;
  /** Skip heal + retest loop */
  noHeal?: boolean;
  /** Natural-language intent (deterministic planner; no LLM execution) */
  intent?: string;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Start mock sandbox and point API_BASE_URL for this verify run */
  sandbox?: boolean;
  /** Generate docker-compose test env files before verify (does not auto docker up) */
  dockerEnv?: boolean;
}

export interface VerifyPhaseResult {
  capability: CapabilityId;
  status: 'ran' | 'skipped' | 'failed';
  reason: string;
  durationMs: number;
  summary?: string;
}

export interface VerifyReport {
  schemaVersion: '1';
  project: {
    root: string;
    frameworks: string[];
    testFrameworks: string[];
  };
  plan: CapabilityId[];
  phases: VerifyPhaseResult[];
  changes: ImpactAnalysisResult | null;
  selection: {
    mode: 'changed' | 'all';
    selectedTests: string[];
    reason: string;
  };
  testRun: TestRunResult | null;
  retestRun: TestRunResult | null;
  diagnoses: DiagnosticResult[];
  heals: HealResult[];
  security: SecurityReport | null;
  accessibility: A11yAuditResult | null;
  release: ReleaseConfidenceReport | null;
  doctor: DoctorReport | null;
  intent?: { raw: string; interpretedAs: string; notes: string[] };
  evidencePack?: {
    packDir: string;
    indexPath: string;
    failureCount: number;
    packIndexPath?: string;
    zipPath?: string;
  };
  verdict: 'PASS' | 'PASS_WITH_WARNINGS' | 'BLOCKED' | 'INCONCLUSIVE';
  reasons: string[];
  exitCode: number;
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw Object.assign(new Error('Verify cancelled'), { code: 'VP_CANCELLED' });
  }
}

function detectSignals(impact: ImpactAnalysisResult | null, profile: ProjectProfile) {
  const files = impact?.changedFiles || [];
  const joined = files.join(' ').toLowerCase();
  const uiChanged =
    (impact?.impactedRoutes.length || 0) > 0 ||
    /\.(tsx|jsx|vue|svelte|css|scss)$/.test(joined) ||
    /components?\//.test(joined);
  const apiChanged =
    (impact?.impactedEndpoints.length || 0) > 0 ||
    /\/(api|routes|controllers?)\//.test(joined) ||
    profile.apiEndpoints.some((ep) => !!ep.sourceFile && files.includes(ep.sourceFile));
  const authChanged =
    /auth|login|session|oauth|jwt|password|signup|signin/.test(joined);

  return {
    hasChanges: files.length > 0,
    uiChanged,
    apiChanged,
    authChanged
  };
}

function mapReleaseToVerdict(release: ReleaseConfidenceReport | null, hadFailures: boolean): VerifyReport['verdict'] {
  if (!release) {
    return hadFailures ? 'BLOCKED' : 'INCONCLUSIVE';
  }
  if (release.verdict === 'NOT_READY') return 'BLOCKED';
  if (release.verdict === 'READY_WITH_WARNINGS') return 'PASS_WITH_WARNINGS';
  return 'PASS';
}

function statusFromVerdict(verdict: VerifyReport['verdict']): OperationStatus {
  switch (verdict) {
    case 'PASS':
      return 'SUCCESS';
    case 'PASS_WITH_WARNINGS':
      return 'SUCCESS_WITH_WARNINGS';
    case 'BLOCKED':
      return 'QUALITY_BLOCKED';
    default:
      return 'INCONCLUSIVE';
  }
}

export class VerifyOrchestrator {
  public static async execute(
    engine: VeloProveEngine,
    options: VerifyOptions = {}
  ): Promise<OperationResult<VerifyReport>> {
    const started = Date.now();
    const runId = createRunId('verify');
    const phases: VerifyPhaseResult[] = [];
    const warnings: OperationWarning[] = [];
    const errors: StructuredError[] = [];
    const evidence: EvidenceItem[] = [];
    const reasons: string[] = [];

    const autoHeal = options.noHeal === true ? false : options.autoHeal !== false;
    const intentPlan = options.intent ? IntentPlanner.plan(options.intent) : null;
    if (intentPlan) {
      if (intentPlan.capabilities.includes('security')) {
        options = { ...options, includeSecurity: true };
      }
      if (intentPlan.capabilities.includes('accessibility')) {
        options = { ...options, includeA11y: true };
      }
      evidence.push({
        id: 'intent-plan',
        kind: 'intent',
        summary: intentPlan.interpretedAs,
        data: intentPlan
      });
    }

    let doctor: DoctorReport | null = null;
    let profile: ProjectProfile | null = null;
    let impact: ImpactAnalysisResult | null = null;
    let testRun: TestRunResult | null = null;
    let retestRun: TestRunResult | null = null;
    let diagnoses: DiagnosticResult[] = [];
    let heals: HealResult[] = [];
    let security: SecurityReport | null = null;
    let accessibility: A11yAuditResult | null = null;
    let release: ReleaseConfidenceReport | null = null;
    let plan: CapabilityId[] = [];

    try {
      assertNotAborted(options.signal);

      if (options.dockerEnv) {
        const t0 = Date.now();
        const docker = engine.generateDockerEnv({ services: ['postgres', 'redis'] });
        phases.push({
          capability: 'inspect',
          status: 'ran',
          reason: 'Generated ephemeral docker-compose test env files (local; not cloud)',
          durationMs: Date.now() - t0,
          summary: docker.servicesIncluded?.join(', ') || 'docker-env written'
        });
        evidence.push({
          id: 'docker-env',
          kind: 'artifact',
          summary: 'Local docker-compose test environment files generated',
          data: docker
        });
      }

      if (options.sandbox) {
        const t0 = Date.now();
        const sandbox = await engine.startSandbox(18089);
        process.env.API_BASE_URL = sandbox.baseURL;
        phases.push({
          capability: 'inspect',
          status: 'ran',
          reason: 'Started local mock sandbox for API_BASE_URL',
          durationMs: Date.now() - t0,
          summary: sandbox.baseURL
        });
        evidence.push({
          id: 'sandbox',
          kind: 'artifact',
          summary: `Mock sandbox at ${sandbox.baseURL}`,
          data: { baseURL: sandbox.baseURL }
        });
      }

      // Doctor
      {
        const t0 = Date.now();
        doctor = engine.doctor();
        phases.push({
          capability: 'doctor',
          status: 'ran',
          reason: 'Environment readiness check',
          durationMs: Date.now() - t0,
          summary: `${doctor.verdict} (${doctor.failedCount} fail / ${doctor.warningCount} warn)`
        });
        if (doctor.verdict !== 'HEALTHY') {
          warnings.push({
            code: 'VP_DOCTOR_ISSUES',
            message: `Doctor verdict: ${doctor.verdict} (${doctor.failedCount} failed checks)`,
            remediation: 'Run `veloprove doctor` and resolve environment gaps.'
          });
        }
      }

      assertNotAborted(options.signal);

      // Inspect
      {
        const t0 = Date.now();
        const inspected = await engine.inspect();
        profile = inspected.profile;
        phases.push({
          capability: 'inspect',
          status: 'ran',
          reason: 'Project profile and stack detection',
          durationMs: Date.now() - t0,
          summary: `${profile.frameworks.join(', ') || 'unknown'} / tests: ${profile.testFrameworks.join(', ') || 'none'}`
        });
        evidence.push({
          id: 'inspect-profile',
          kind: 'project-profile',
          summary: `Detected frameworks: ${profile.frameworks.join(', ') || 'none'}`
        });

        if ((profile.testFiles?.length || 0) === 0) {
          warnings.push({
            code: 'VP_EMPTY_SUITE',
            message: 'No test files discovered yet — verify will have little to run.',
            remediation:
              'First-verify path: `veloprove doctor` → `veloprove teach-ai` → `veloprove plan` → `veloprove generate` → `veloprove verify --ci` (or ask your AI: "test this project with VeloProve").'
          });
        }
        if ((profile.testFrameworks?.length || 0) === 0) {
          warnings.push({
            code: 'VP_NO_TEST_RUNNER',
            message: 'No test runner detected (vitest/jest/playwright/node:test).',
            remediation: 'Install a runner (e.g. vitest) or use `node --test` in package.json scripts.test, then re-run doctor / verify.'
          });
        }
      }

      assertNotAborted(options.signal);

      // Changed / impact
      {
        const t0 = Date.now();
        impact = await engine.changed();
        phases.push({
          capability: 'changed',
          status: 'ran',
          reason: 'Git diff + impact heuristics',
          durationMs: Date.now() - t0,
          summary: `${impact.changedFiles.length} changed, ${impact.impactedTestFiles.length} impacted tests, risk ${impact.riskScore}`
        });
        evidence.push({
          id: 'change-impact',
          kind: 'impact',
          summary: `${impact.changedFiles.length} files changed`,
          data: {
            changedFiles: impact.changedFiles,
            impactedTestFiles: impact.impactedTestFiles,
            riskScore: impact.riskScore
          }
        });
      }

      const signals = detectSignals(impact, profile!);
      plan =
        impact.recommendedCapabilities?.length > 0
          ? [...new Set([...impact.recommendedCapabilities.filter((id) => id !== 'verify'), 'diagnose', 'heal', 'release'] as typeof impact.recommendedCapabilities)]
          : CapabilityRegistry.planForChanges({
              ...signals,
              includeSecurity: options.includeSecurity === true,
              includeA11y: options.includeA11y === true
            });

      if (options.includeSecurity && !plan.includes('security')) plan.push('security');
      if (options.includeA11y && !plan.includes('accessibility')) plan.push('accessibility');

      // Test selection
      const useChanged =
        !options.fullSuite &&
        impact !== null &&
        impact.impactedTestFiles.length > 0;

      // Mode is always 'changed' (impacted paths) or 'all' (full suite fallback).
      // There is no 'none' path: an empty impact map still runs the full suite for safety.
      const selection = {
        mode: (useChanged ? 'changed' : 'all') as 'changed' | 'all',
        selectedTests: useChanged ? impact!.impactedTestFiles : [],
        reason: useChanged
          ? `Selected ${impact!.impactedTestFiles.length} impacted test file(s) from change analysis`
          : options.fullSuite
            ? 'Full suite requested via --full'
            : impact?.changedFiles.length
              ? 'Changes detected but no mapped tests — running full suite for safety'
              : 'Clean working tree — running full suite as baseline verification'
      };

      if (!useChanged && (impact?.changedFiles.length || 0) > 0 && impact!.impactedTestFiles.length === 0) {
        warnings.push({
          code: 'VP_NO_IMPACT_MAP',
          message: 'Changed files did not map to known tests; falling back to full suite.',
          remediation: 'Improve test targeting metadata or run with explicit paths.'
        });
        reasons.push(selection.reason);
      }

      assertNotAborted(options.signal);

      // Run tests
      {
        const t0 = Date.now();
        testRun = await engine.run(
          useChanged
            ? { scope: 'paths', paths: impact!.impactedTestFiles }
            : { scope: 'all' }
        );
        phases.push({
          capability: 'run',
          status: 'ran',
          reason: selection.reason,
          durationMs: Date.now() - t0,
          summary: `${testRun.summary.passed}/${testRun.summary.total} passed, ${testRun.summary.failed} failed`
        });
        evidence.push({
          id: 'test-run',
          kind: 'test-run',
          summary: `Run ${testRun.runId}: ${testRun.summary.passed} passed / ${testRun.summary.failed} failed`,
          data: testRun.summary
        });
      }

      // Diagnose + optional heal loop
      if (testRun && testRun.summary.failed > 0) {
        assertNotAborted(options.signal);
        const tDiag = Date.now();
        diagnoses = await engine.diagnose(testRun.runId);
        phases.push({
          capability: 'diagnose',
          status: 'ran',
          reason: 'Failures detected in primary run',
          durationMs: Date.now() - tDiag,
          summary: diagnoses.map((d) => d.classification).join(', ') || 'no diagnoses'
        });

        const healable = diagnoses.filter((d) => d.canAutoHealTest && d.classification === 'TEST_BUG');
        if (autoHeal && healable.length > 0 && plan.includes('heal')) {
          assertNotAborted(options.signal);
          const tHeal = Date.now();
          heals = await engine.heal(testRun.runId);
          const applied = heals.filter((h) => h.success);
          phases.push({
            capability: 'heal',
            status: applied.length > 0 ? 'ran' : 'failed',
            reason: `Conservative heal for ${healable.length} TEST_BUG diagnosis(es)`,
            durationMs: Date.now() - tHeal,
            summary: `${applied.length}/${heals.length} heal(s) applied`
          });

          if (applied.length > 0) {
            assertNotAborted(options.signal);
            const tRetest = Date.now();
            retestRun = await engine.run(
              useChanged
                ? { scope: 'paths', paths: impact!.impactedTestFiles }
                : { scope: 'all' }
            );
            phases.push({
              capability: 'run',
              status: 'ran',
              reason: 'Retest after successful heal',
              durationMs: Date.now() - tRetest,
              summary: `${retestRun.summary.passed}/${retestRun.summary.total} passed`
            });
          }
        } else {
          phases.push({
            capability: 'heal',
            status: 'skipped',
            reason: autoHeal
              ? 'No safe TEST_BUG heal candidates'
              : 'Healing disabled (--no-heal)',
            durationMs: 0
          });
        }
      } else {
        phases.push({
          capability: 'diagnose',
          status: 'skipped',
          reason: 'No failing tests',
          durationMs: 0
        });
        phases.push({
          capability: 'heal',
          status: 'skipped',
          reason: 'No failing tests',
          durationMs: 0
        });
      }

      // Optional security
      if (plan.includes('security')) {
        assertNotAborted(options.signal);
        const t0 = Date.now();
        try {
          security = await engine.runSecurityTests({ safeMode: true });
          phases.push({
            capability: 'security',
            status: 'ran',
            reason: signals.authChanged || signals.apiChanged || options.includeSecurity
              ? 'Auth/API change or --security requested'
              : 'Security included by plan',
            durationMs: Date.now() - t0,
            summary: `score ${security.securityScore}, findings ${security.findings.length}`
          });
        } catch (err) {
          phases.push({
            capability: 'security',
            status: 'failed',
            reason: err instanceof Error ? err.message : String(err),
            durationMs: Date.now() - t0
          });
          warnings.push({
            code: 'VP_SECURITY_SKIP',
            message: 'Security suite failed to complete; continuing verify.',
            remediation: 'Run `veloprove security --safe` manually.'
          });
        }
      } else {
        phases.push({
          capability: 'security',
          status: 'skipped',
          reason: 'No auth/API change signals and --security not set',
          durationMs: 0
        });
      }

      // Optional a11y
      if (plan.includes('accessibility')) {
        assertNotAborted(options.signal);
        const t0 = Date.now();
        try {
          accessibility = await engine.auditA11y();
          phases.push({
            capability: 'accessibility',
            status: 'ran',
            reason: signals.uiChanged || options.includeA11y ? 'UI change or --a11y' : 'A11y included by plan',
            durationMs: Date.now() - t0,
            summary: `${accessibility.violations?.length ?? 0} violation(s)`
          });
        } catch (err) {
          phases.push({
            capability: 'accessibility',
            status: 'failed',
            reason: err instanceof Error ? err.message : String(err),
            durationMs: Date.now() - t0
          });
          warnings.push({
            code: 'VP_A11Y_SKIP',
            message: 'Accessibility audit failed to complete; continuing verify.',
            remediation: 'Run `veloprove a11y` manually.'
          });
        }
      } else {
        phases.push({
          capability: 'accessibility',
          status: 'skipped',
          reason: 'No UI change signals and --a11y not set',
          durationMs: 0
        });
      }

      assertNotAborted(options.signal);

      // Release assessment
      {
        const t0 = Date.now();
        release = await engine.releaseCheck();
        phases.push({
          capability: 'release',
          status: 'ran',
          reason: 'Evidence-backed release gate',
          durationMs: Date.now() - t0,
          summary: `${release.verdict} (${release.confidenceScore}/100)`
        });
        if (release.blockers.length) {
          reasons.push(...release.blockers);
        }
        if (release.reasons.length) {
          reasons.push(...release.reasons);
        }
      }

      const finalRun = retestRun || testRun;
      const hadFailures = (finalRun?.summary.failed || 0) > 0;
      const verdict = mapReleaseToVerdict(release, hadFailures);
      if (hadFailures && !reasons.some((r) => /fail/i.test(r))) {
        reasons.push(`${finalRun!.summary.failed} test(s) still failing after verify pipeline.`);
      }

      let evidencePack: VerifyReport['evidencePack'];
      if (hadFailures && finalRun) {
        try {
          const pack = FailureEvidencePackService.pack({
            guard: engine.guard,
            run: finalRun,
            diagnoses,
            runId
          });
          evidencePack = {
            packDir: pack.packDir,
            indexPath: pack.indexPath,
            failureCount: pack.failureCount,
            packIndexPath: pack.packIndexPath,
            zipPath: pack.zipPath
          };
          evidence.push({
            id: 'evidence-pack',
            kind: 'artifact',
            summary: `Failure evidence pack (${pack.failureCount} failures)`,
            data: evidencePack
          });
        } catch {
          warnings.push({
            code: 'VP_EVIDENCE_PACK_SKIPPED',
            message: 'Could not write failure evidence pack'
          });
        }
      }

      const report: VerifyReport = {
        schemaVersion: '1',
        project: {
          root: engine.guard.getRoot(),
          frameworks: profile?.frameworks || [],
          testFrameworks: profile?.testFrameworks || []
        },
        plan,
        phases,
        changes: impact,
        selection,
        testRun,
        retestRun,
        diagnoses,
        heals,
        security,
        accessibility,
        release,
        doctor,
        intent: intentPlan
          ? { raw: intentPlan.raw, interpretedAs: intentPlan.interpretedAs, notes: intentPlan.notes }
          : undefined,
        evidencePack,
        verdict,
        reasons: [...new Set(reasons)],
        exitCode: exitCodeForStatus(statusFromVerdict(verdict))
      };

      const status = statusFromVerdict(verdict);
      const result =
        verdict === 'BLOCKED'
          ? failResult<VerifyReport>('verify', status, {
              code: 'VP_VERIFY_BLOCKED',
              message: reasons[0] || 'Verify blocked by quality gates',
              category: 'test_failure',
              severity: 'HIGH',
              recoverable: true,
              remediation: 'Inspect failing tests and release blockers, then re-run `veloprove verify`.'
            }, {
              data: report,
              warnings,
              evidence,
              durationMs: Date.now() - started,
              runId,
              metadata: { plan, verdict }
            })
          : okResult('verify', report, {
              warnings,
              evidence,
              durationMs: Date.now() - started,
              runId,
              metadata: { plan, verdict }
            });

      // okResult always sets SUCCESS — override status for PASS_WITH_WARNINGS / INCONCLUSIVE
      result.status = status;
      result.success = verdict === 'PASS' || verdict === 'PASS_WITH_WARNINGS';
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const cancelled = (err as { code?: string })?.code === 'VP_CANCELLED' || options.signal?.aborted;
      const status: OperationStatus = cancelled ? 'CANCELLED' : 'INFRASTRUCTURE_ERROR';
      return failResult<VerifyReport>(
        'verify',
        status,
        {
          code: cancelled ? 'VP_CANCELLED' : 'VP_VERIFY_FAILED',
          message,
          category: cancelled ? 'execution' : 'infrastructure',
          severity: 'HIGH',
          recoverable: true,
          remediation: cancelled ? 'Re-run verify when ready.' : 'Check doctor output and dependencies.',
          cause: message
        },
        {
          warnings,
          errors,
          evidence,
          durationMs: Date.now() - started,
          runId,
          metadata: { phases, plan }
        }
      );
    }
  }
}
