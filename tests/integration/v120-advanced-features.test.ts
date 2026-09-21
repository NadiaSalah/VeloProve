import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { VeloProveEngine } from '../../src/application/engine.js';
import { TestRefineService } from '../../src/application/refine-test.js';
import { A11yAuditorService } from '../../src/application/a11y-auditor.js';
import { VisualDiffService } from '../../src/application/visual-diff.js';
import { ContractDriftService } from '../../src/application/contract-drift.js';
import { MockSandboxService } from '../../src/application/mock-sandbox.js';
import { ephemeralFixtureDir } from '../helpers/monorepo-fixtures.js';

describe('VeloProve Advanced Features (Refinement, A11y, Visual Diff, Contract Drift, Mock Sandbox)', () => {
  const fixtureDir = ephemeralFixtureDir('v120-project');
  let guard: WorkspaceGuard;

  beforeAll(() => {
    if (!fs.existsSync(fixtureDir)) {
      fs.mkdirSync(fixtureDir, { recursive: true });
    }
    fs.writeFileSync(path.join(fixtureDir, 'package.json'), JSON.stringify({ name: 'v120-app', version: '1.0.0' }));
    fs.writeFileSync(path.join(fixtureDir, 'Component.tsx'), `
      export function Header() {
        return (
          <div>
            <img src="/logo.png" />
            <button></button>
            <input type="text" />
          </div>
        );
      }
    `);
    fs.writeFileSync(path.join(fixtureDir, 'app.test.ts'), `
      import { test, expect } from 'vitest';
      test('sample test', () => {
        expect(1).toBe(1);
      });
    `);
    guard = new WorkspaceGuard(fixtureDir);
  });

  afterAll(() => {
    try {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    } catch {}
  });

  it('A11yAuditorService detects WCAG violations and generates score', () => {
    const mockProfile: any = {
      sourceFiles: [{ relativePath: 'Component.tsx', isComponent: true }]
    };
    const report = A11yAuditorService.audit(mockProfile, guard);
    expect(report.violations.length).toBeGreaterThanOrEqual(2);
    expect(report.violations.some(v => v.id === 'image-alt')).toBe(true);
    expect(report.violations.some(v => v.id === 'button-name')).toBe(true);
    expect(report.violations.some(v => v.id === 'input-label')).toBe(true);
  });

  it('TestRefineService refines test assertions with natural language', async () => {
    const res = await TestRefineService.refine(guard, {
      testFilePath: 'app.test.ts',
      instruction: 'add assertion for coupon code and validation'
    });
    expect(res.success).toBe(true);
    expect(res.appliedRefinements.length).toBeGreaterThan(0);
    const updated = fs.readFileSync(path.join(fixtureDir, 'app.test.ts'), 'utf8');
    expect(updated).toContain('Refinement:');
  });

  it('VisualDiffService generates baseline snapshots and diff comparison', () => {
    const artDir = path.join(fixtureDir, '.veloprove', 'artifacts', 'screenshots');
    fs.mkdirSync(artDir, { recursive: true });
    fs.writeFileSync(path.join(artDir, 'home.png'), Buffer.from('fake-image-bytes'));

    const report = VisualDiffService.compareSnapshots(guard);
    expect(report.totalSnapshots).toBe(1);
    expect(report.newSnapshots).toBe(1);
  });

  it('ContractDriftService compares OpenAPI endpoints with code routes', () => {
    const mockProfile: any = {
      apiEndpoints: [{ method: 'POST', path: '/api/v1/checkout' }]
    };
    const mockReqs: any = [
      {
        source: 'openapi',
        title: 'Legacy Endpoint',
        relatedEndpoints: ['GET /api/v1/legacy']
      }
    ];
    const report = ContractDriftService.detectDrift(mockProfile, mockReqs);
    expect(report.driftDetectedCount).toBeGreaterThan(0);
    expect(report.drifts.some(d => d.driftType === 'missing_in_spec')).toBe(true);
    expect(report.drifts.some(d => d.driftType === 'missing_in_code')).toBe(true);
  });

  it('MockSandboxService launches ephemeral HTTP server with mock tables', async () => {
    const sandbox = await MockSandboxService.createSandbox(8099);
    expect(sandbox.baseURL).toBe('http://localhost:8099');
    expect(sandbox.tables.users.length).toBe(2);
    sandbox.close();
  });
});
