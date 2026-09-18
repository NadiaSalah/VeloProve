import { describe, it, expect } from 'vitest';
import {
  createRunId,
  exitCodeForStatus,
  failResult,
  okResult,
  VeloProveError
} from '../../src/shared/types/operation.js';
import { CapabilityRegistry } from '../../src/application/capability-registry.js';
import { IntentPlanner } from '../../src/application/intent-planner.js';

describe('OperationResult model', () => {
  it('creates success and warning statuses', () => {
    const ok = okResult('inspect', { ok: true }, { durationMs: 12 });
    expect(ok.success).toBe(true);
    expect(ok.status).toBe('SUCCESS');
    expect(ok.operation).toBe('inspect');
    expect(ok.runId).toMatch(/^inspect_/);

    const warn = okResult('inspect', { ok: true }, {
      warnings: [{ code: 'W', message: 'soft' }]
    });
    expect(warn.status).toBe('SUCCESS_WITH_WARNINGS');
  });

  it('maps statuses to CI exit codes', () => {
    expect(exitCodeForStatus('SUCCESS')).toBe(0);
    expect(exitCodeForStatus('SUCCESS_WITH_WARNINGS')).toBe(0);
    expect(exitCodeForStatus('QUALITY_BLOCKED')).toBe(1);
    expect(exitCodeForStatus('CONFIGURATION_ERROR')).toBe(2);
    expect(exitCodeForStatus('INFRASTRUCTURE_ERROR')).toBe(3);
    expect(exitCodeForStatus('CANCELLED')).toBe(130);
  });

  it('builds structured failures and VeloProveError', () => {
    const failed = failResult('verify', 'QUALITY_BLOCKED', {
      code: 'VP_BLOCK',
      message: 'blocked',
      category: 'test_failure',
      severity: 'HIGH',
      recoverable: true
    });
    expect(failed.success).toBe(false);
    expect(failed.errors[0].code).toBe('VP_BLOCK');

    const err = VeloProveError.configuration('bad config', 'Fix veloprove.config.json');
    expect(err.structured.category).toBe('configuration');
    expect(err.structured.remediation).toContain('veloprove.config');
  });

  it('createRunId is unique-ish', () => {
    expect(createRunId('a')).not.toBe(createRunId('a'));
  });
});

describe('CapabilityRegistry', () => {
  it('lists core capabilities including verify', () => {
    const ids = CapabilityRegistry.list().map((c) => c.id);
    expect(ids).toContain('inspect');
    expect(ids).toContain('verify');
    expect(ids).toContain('heal');
    expect(CapabilityRegistry.get('verify')?.mcpTool).toBe('vp.verify');
  });

  it('plans change-aware capabilities deterministically', () => {
    const uiPlan = CapabilityRegistry.planForChanges({
      hasChanges: true,
      uiChanged: true,
      apiChanged: false,
      authChanged: false
    });
    expect(uiPlan).toContain('run');
    expect(uiPlan).toContain('accessibility');
    expect(uiPlan).not.toContain('security');

    const authPlan = CapabilityRegistry.planForChanges({
      hasChanges: true,
      uiChanged: false,
      apiChanged: true,
      authChanged: true
    });
    expect(authPlan).toContain('security');
    expect(authPlan).toContain('diagnose');
    expect(authPlan).toContain('release');
  });
});

describe('IntentPlanner', () => {
  it('maps release readiness phrases', () => {
    const plan = IntentPlanner.plan('Is this project ready for release?');
    expect(plan.capabilities).toContain('release');
    expect(plan.capabilities).toContain('run');
    expect(plan.dangerous).toBe(false);
  });

  it('maps auth phrases to security without auto-fix', () => {
    const plan = IntentPlanner.plan('Test login and signup thoroughly');
    expect(plan.capabilities).toContain('security');
    expect(plan.capabilities).not.toContain('auto-fix');
  });

  it('defaults unmatched phrases to verify', () => {
    const plan = IntentPlanner.plan('do something vaguely related to quality');
    expect(plan.capabilities).toContain('verify');
  });
});
