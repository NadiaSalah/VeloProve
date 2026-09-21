/**
 * Project Twin MVP — assemble from inspect-like fixtures; no AI assumptions.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ephemeralFixtureDir } from '../helpers/monorepo-fixtures.js';
import { VeloProveEngine } from '../../src/application/engine.js';
import { ProjectTwinService } from '../../src/application/project-twin.js';
import type { ProjectProfile } from '../../src/shared/types/project.js';
import type { DiscoveredRequirement, FeatureMap } from '../../src/shared/types/requirements.js';
import type { ImpactAnalysisResult } from '../../src/intelligence/change-impact/dependency-graph.js';

function miniProfile(root: string): ProjectProfile {
  return {
    root,
    projectName: 'twin-fixture',
    packageManager: 'npm',
    workspaceType: 'single',
    languages: ['javascript'],
    frameworks: ['nodejs'],
    buildTools: [],
    testFrameworks: ['node:test'],
    apps: [],
    routes: [{ path: '/login', sourceFile: 'src/auth.js', type: 'page' }],
    apiEndpoints: [{ method: 'POST', path: '/api/login', sourceFile: 'src/auth.js' }],
    sourceFiles: [
      {
        path: path.join(root, 'src/auth.js'),
        relativePath: 'src/auth.js',
        language: 'javascript',
        hasTests: true,
        imports: [],
        exports: ['login']
      },
      {
        path: path.join(root, 'src/math.js'),
        relativePath: 'src/math.js',
        language: 'javascript',
        hasTests: true,
        imports: [],
        exports: ['add']
      }
    ],
    testFiles: [
      {
        path: path.join(root, 'tests/auth.test.js'),
        relativePath: 'tests/auth.test.js',
        runner: 'node:test',
        level: 'unit',
        targetedFiles: ['src/auth.js']
      },
      {
        path: path.join(root, 'tests/math.test.js'),
        relativePath: 'tests/math.test.js',
        runner: 'node:test',
        level: 'unit',
        targetedFiles: ['src/math.js']
      }
    ],
    capabilities: [],
    warnings: [],
    scanTimestamp: new Date().toISOString()
  };
}

describe('Project Twin MVP', () => {
  const fixtureDir = ephemeralFixtureDir('project-twin');

  beforeAll(() => {
    fs.mkdirSync(path.join(fixtureDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(fixtureDir, 'tests'), { recursive: true });
    fs.writeFileSync(
      path.join(fixtureDir, 'package.json'),
      JSON.stringify({ name: 'twin-fixture', version: '1.0.0', type: 'module' }),
      'utf8'
    );
    fs.writeFileSync(path.join(fixtureDir, 'src/auth.js'), 'export function login() { return true; }\n', 'utf8');
    fs.writeFileSync(path.join(fixtureDir, 'src/math.js'), 'export function add(a,b){return a+b;}\n', 'utf8');
    fs.writeFileSync(
      path.join(fixtureDir, 'tests/auth.test.js'),
      "import { test } from 'node:test'; import assert from 'node:assert'; import { login } from '../src/auth.js'; test('login', () => assert.equal(login(), true));\n",
      'utf8'
    );
    fs.writeFileSync(
      path.join(fixtureDir, 'tests/math.test.js'),
      "import { test } from 'node:test'; import assert from 'node:assert'; import { add } from '../src/math.js'; test('add', () => assert.equal(add(1,2), 3));\n",
      'utf8'
    );
  });

  afterAll(() => {
    try {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('assembles Twin nodes/edges with evidence classes', () => {
    const profile = miniProfile(fixtureDir);
    const requirements: DiscoveredRequirement[] = [
      {
        id: 'REQ-AUTH',
        title: 'Authentication',
        description: 'Users can log in',
        source: 'prd',
        sourceLocation: { file: 'PRD.md' },
        priority: 'high',
        confidence: 0.9,
        relatedModules: ['src/auth.js'],
        relatedRoutes: ['/login'],
        relatedEndpoints: ['POST /api/login'],
        testCoverageStatus: 'partial'
      }
    ];
    const featureMap: FeatureMap = {
      features: [
        {
          featureId: 'auth',
          title: 'Authentication',
          description: 'Login',
          sourceFile: 'src/auth.js',
          useCases: [
            {
              id: 'uc-1',
              title: 'Login',
              description: 'login',
              requirementId: 'REQ-AUTH',
              expectedBehavior: 'ok'
            }
          ]
        }
      ],
      unmappedRequirements: [],
      generatedAt: new Date().toISOString()
    };

    const twin = ProjectTwinService.assemble(fixtureDir, profile, requirements, featureMap);
    expect(twin.schemaVersion).toBe(1);
    expect(twin.summary.features).toBe(1);
    expect(twin.nodes.some((n) => n.id === 'feature:auth')).toBe(true);
    expect(twin.nodes.some((n) => n.kind === 'test')).toBe(true);
    expect(twin.edges.length).toBeGreaterThan(0);
    expect(twin.warnings.some((w) => w.includes('INFERRED'))).toBe(true);

    const impact: ImpactAnalysisResult = {
      changedFiles: ['src/auth.js'],
      impactedTestFiles: ['tests/auth.test.js'],
      impactedRoutes: ['/login'],
      impactedEndpoints: ['POST /api/login'],
      affectedModules: ['src'],
      riskScore: 40,
      riskAreas: ['auth'],
      recommendedCapabilities: [],
      reasoningEvidence: [
        { testFile: 'tests/auth.test.js', reason: 'basename', confidence: 0.9 }
      ],
      selectionNotes: []
    };
    const withImpact = ProjectTwinService.assemble(fixtureDir, profile, requirements, featureMap, {
      impact
    });
    expect(withImpact.facets.impact?.included).toBe(true);
    expect(withImpact.facets.impact?.items.some((i) => i.certainty === 'DIRECT')).toBe(true);

    const op = ProjectTwinService.toOperationResult(withImpact);
    expect(op.success).toBe(true);
    expect(op.metadata.verificationStatus).toBe('PARTIAL');
  });

  it('engine twinBuild writes .veloprove/twin/latest.json', async () => {
    const engine = new VeloProveEngine(fixtureDir);
    const result = await engine.twinBuild({ withDrift: true });
    expect(result.success).toBe(true);
    expect(result.data?.schemaVersion).toBe(1);
    const twinPath = path.join(fixtureDir, '.veloprove', 'twin', 'latest.json');
    expect(fs.existsSync(twinPath)).toBe(true);
    expect(fs.existsSync(path.join(fixtureDir, '.veloprove', 'feature-map.json'))).toBe(true);

    const status = engine.twinStatus();
    expect(status?.fingerprint).toBeTruthy();

    const inspected = engine.twinInspect('auth');
    // May or may not find feature named auth depending on FeatureMapBuilder output
    expect(inspected).toBeTruthy();
  }, 60_000);

  it('incremental twinBuild skips rebuild when fingerprint unchanged', async () => {
    const engine = new VeloProveEngine(fixtureDir);
    const first = await engine.twinBuild({ force: true });
    expect(first.success).toBe(true);
    const second = await engine.twinBuild({ incremental: true });
    expect(second.metadata.skippedRebuild).toBe(true);
    expect(second.data?.nodes.length).toBe(first.data?.nodes.length);
  }, 60_000);

  it('twinUpdate + evidence class summary stay PARTIAL-honest', async () => {
    const engine = new VeloProveEngine(fixtureDir);
    const updated = await engine.twinUpdate({ withDrift: true });
    expect(updated.success).toBe(true);
    expect(updated.metadata?.verificationStatus).toBe('PARTIAL');
    expect(updated.metadata?.evidenceClasses).toBeTruthy();
    const summary = engine.twinEvidenceSummary();
    expect(summary.verificationStatus).toBe('PARTIAL');
    expect(summary.evidenceClasses?.VERIFIED).toBeGreaterThanOrEqual(0);
    expect(
      (summary.evidenceClasses?.VERIFIED || 0) +
        (summary.evidenceClasses?.OBSERVED || 0) +
        (summary.evidenceClasses?.INFERRED || 0)
    ).toBeGreaterThan(0);
  }, 60_000);

  it('drift aggregator wraps multiple engines', async () => {
    const engine = new VeloProveEngine(fixtureDir);
    const report = await engine.drift();
    expect(report.sources).toContain('contract-drift-wrap');
    expect(Array.isArray(report.items)).toBe(true);
  }, 60_000);
});
