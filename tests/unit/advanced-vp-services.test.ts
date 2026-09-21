import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { LocalStorage } from '../../src/storage/local-store.js';
import { SecurityAuditService } from '../../src/application/security-audit.js';
import { PerformanceProfilerService } from '../../src/application/perf-profiler.js';
import { MockNetworkGenerator } from '../../src/application/mock-network.js';
import { QuarantineService } from '../../src/application/quarantine-service.js';
import { CoverageHeatmapService } from '../../src/application/coverage-heatmap.js';
import { ephemeralFixtureDir } from '../helpers/monorepo-fixtures.js';

describe('Advanced VeloProve Services (Security Audit, Perf Profiler, MSW Mock Generator, Flaky Quarantine, Coverage Heatmap)', () => {
  const fixtureDir = ephemeralFixtureDir('advanced-vp-fixture');
  let guard: WorkspaceGuard;
  let storage: LocalStorage;

  beforeAll(() => {
    if (!fs.existsSync(fixtureDir)) {
      fs.mkdirSync(fixtureDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(fixtureDir, 'package.json'),
      JSON.stringify({
        name: 'test-app',
        version: '1.0.0',
        dependencies: {
          lodash: '4.17.15',
          express: '4.18.2'
        }
      })
    );
    guard = new WorkspaceGuard(fixtureDir);
    storage = new LocalStorage(guard);
  });

  afterAll(() => {
    try {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    } catch {}
  });

  it('SecurityAuditService scans dependencies for known CVEs', () => {
    const report = SecurityAuditService.audit(guard);
    expect(report.dependenciesScanned).toBeGreaterThan(0);
    expect(report.vulnerabilities.length).toBeGreaterThan(0);
    expect(report.vulnerabilities.some(v => v.packageName === 'lodash')).toBe(true);
  });

  it('PerformanceProfilerService computes Core Web Vitals and recommendations', () => {
    const mockProfile: any = {
      routes: [{ path: '/dashboard', componentPath: 'src/Dashboard.tsx', isDynamic: true }]
    };
    const report = PerformanceProfilerService.profile(mockProfile, guard);
    expect(report.totalRoutesProfiled).toBe(1);
    expect(report.metrics[0].estimatedLcpMs).toBeGreaterThan(0);
  });

  it('MockNetworkGenerator creates MSW mock handlers', () => {
    const mockProfile: any = {
      apiEndpoints: [{ method: 'GET', path: '/api/users', authRequired: false, sourceFile: 'users.ts' }]
    };
    const result = MockNetworkGenerator.generate(mockProfile, [], guard);
    expect(result.totalHandlers).toBe(1);
    expect(result.generatedFiles.length).toBe(2);
    expect(fs.existsSync(path.join(fixtureDir, 'src', 'mocks', 'handlers.ts'))).toBe(true);
  });

  it('QuarantineService quarantines flaky tests', () => {
    storage.saveFlakyHistory([
      {
        testFile: 'tests/checkout.test.ts',
        testTitle: 'TC-FLAKY-01',
        status: 'confirmed-flaky',
        runsCount: 10,
        passRate: 0.55,
        averageDurationMs: 120,
        durationVarianceMs: 40,
        failureSignatures: ['Timeout'],
        lastObservedAt: new Date().toISOString()
      }
    ]);
    const report = QuarantineService.quarantineFlakyTests(guard, storage, 0.25);
    expect(report.activeQuarantineCount).toBe(1);
    expect(report.quarantinedTests[0].testTitle).toBe('TC-FLAKY-01');
  });

  it('CoverageHeatmapService correlates PRD requirements with test results', () => {
    const mockReqs: any = [
      { id: 'REQ-AUTH-01', title: 'User Login with JWT', priority: 'critical', category: 'auth' },
      { id: 'REQ-CART-02', title: 'Add Item to Cart', priority: 'high', category: 'functional' }
    ];
    const mockRun: any = {
      testResults: [
        { id: 'TC-REQ-AUTH-01', title: 'User Login with JWT test', status: 'passed' }
      ]
    };
    const heatmap = CoverageHeatmapService.generateHeatmap(mockReqs, {} as any, mockRun);
    expect(heatmap.items.length).toBe(2);
    expect(heatmap.items[0].coverageLevel).toBe('PARTIAL');
    expect(heatmap.items[1].coverageLevel).toBe('UNCOVERED');
  });
});
