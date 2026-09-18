import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  observeLiveApi,
  observeLiveApiBatch,
  pathHintForTestCase,
  extractJsonKeys
} from '../../src/application/api-live-grounding.js';
import { FailureEvidencePackService } from '../../src/application/failure-evidence-pack.js';
import { LocalFixturesPackService } from '../../src/application/local-fixtures-pack.js';
import { TestCodeGenerator } from '../../src/domain/tests/test-generator.js';
import { PlanTestsService } from '../../src/application/plan-tests.js';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { AgentAdaptationService } from '../../src/application/agent-handshake.js';
import type { PlannedTestCase } from '../../src/shared/types/tests.js';
import type { TestRunResult } from '../../src/shared/types/tests.js';
import type { DiagnosticResult } from '../../src/shared/types/diagnostics.js';
import type { ProjectProfile } from '../../src/shared/types/project.js';

describe('Competitive gaps + v1 improvements', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pathHintForTestCase extracts API path from description', () => {
    expect(
      pathHintForTestCase({
        description: 'GET /api/users should list users',
        expectedBehavior: '200 JSON',
        targetFiles: []
      })
    ).toBe('/api/users');
  });

  it('extractJsonKeys reads object and array-of-object previews', () => {
    expect(extractJsonKeys('{"id":1,"name":"a"}')).toEqual(['id', 'name']);
    expect(extractJsonKeys('[{"id":1,"email":"x"}]')).toEqual(['id', 'email']);
    expect(extractJsonKeys('not-json')).toBeUndefined();
  });

  it('observeLiveApi grounds when fetch returns status + shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        status: 200,
        headers: { get: () => 'application/json' },
        text: async () => '{"ok":true,"items":[]}'
      }))
    );
    const obs = await observeLiveApi({ baseURL: 'http://localhost:3999', pathHint: '/api/health' });
    expect(obs.grounded).toBe(true);
    expect(obs.status).toBe(200);
    expect(obs.jsonKeys).toEqual(['ok', 'items']);
    expect(obs.contentType).toMatch(/json/);
  });

  it('observeLiveApiBatch probes multiple paths', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        status: String(url).includes('missing') ? 404 : 200,
        headers: { get: () => 'application/json' },
        text: async () => '{"id":1}'
      }))
    );
    const map = await observeLiveApiBatch({
      baseURL: 'http://localhost:3999',
      paths: ['/a', '/missing', '/a']
    });
    expect(map.size).toBe(2);
    expect(map.get('/a')?.status).toBe(200);
    expect(map.get('/missing')?.status).toBe(404);
  });

  it('observeLiveApi returns offline when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    }));
    const obs = await observeLiveApi({ baseURL: 'http://127.0.0.1:1', pathHint: '/' });
    expect(obs.grounded).toBe(false);
    expect(obs.status).toBe(0);
  });

  it('API generator uses live-grounded status, content-type, and shape asserts', () => {
    const tc: PlannedTestCase = {
      id: 'api-live-1',
      title: 'Users API',
      description: 'GET /api/users',
      type: 'api',
      priority: 'high',
      requirementIds: [],
      targetFiles: [],
      runner: 'vitest',
      reason: 'contract',
      expectedBehavior: 'list users',
      category: 'functional',
      riskScore: 50,
      observedStatus: 200,
      observedPath: '/api/users',
      observedUrl: 'http://localhost:3000/api/users',
      observedContentType: 'application/json',
      observedJsonKeys: ['id', 'email'],
      fixturePath: 'tests/fixtures/veloprove/sample-user.json'
    };
    const file = TestCodeGenerator.generateTestFile(tc, process.cwd());
    expect(file.content).toContain('expect(response.status).toBe(200); // live-grounded');
    expect(file.content).toContain('live-grounded content-type');
    expect(file.content).toContain('live-grounded shape');
    expect(file.content).toContain('local fixtures pack');
  });

  it('E2E generator uses exploreRoute', () => {
    const tc: PlannedTestCase = {
      id: 'e2e-explore-1',
      title: 'Login flow',
      description: 'Click login',
      type: 'e2e',
      priority: 'high',
      requirementIds: [],
      targetFiles: [],
      runner: 'playwright',
      reason: 'explored',
      expectedBehavior: 'dashboard',
      category: 'functional',
      riskScore: 60,
      exploreRoute: '/login'
    };
    const file = TestCodeGenerator.generateTestFile(tc, process.cwd());
    expect(file.content).toContain("page.goto('/login')");
  });

  it('plan seeds cases from site-exploration cache', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-explore-plan-'));
    try {
      const cacheDir = path.join(tmp, '.veloprove', 'cache');
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(
        path.join(cacheDir, 'site-exploration.json'),
        JSON.stringify({
          screens: [
            {
              routePath: '/settings',
              sourceFile: 'src/pages/settings.tsx',
              inferredUseCases: ['Open settings and save profile']
            }
          ]
        }),
        'utf8'
      );
      const profile: ProjectProfile = {
        root: tmp,
        projectName: 'tmp',
        packageManager: 'npm',
        workspaceType: 'single',
        languages: ['typescript'],
        frameworks: ['react'],
        buildTools: [],
        testFrameworks: ['playwright'],
        apps: [],
        routes: [],
        apiEndpoints: [],
        sourceFiles: [],
        testFiles: [],
        capabilities: [],
        warnings: [],
        scanTimestamp: new Date().toISOString()
      };
      const plan = PlanTestsService.createPlan(profile, [], { projectRoot: tmp, fromExplore: true });
      expect(plan.testCases.some((t) => t.id.includes('TC-EXPLORE') && t.exploreRoute === '/settings')).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('LocalFixturesPackService writes sample fixtures', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-fix-'));
    try {
      const guard = new WorkspaceGuard(tmp);
      const pack = LocalFixturesPackService.ensurePack(guard, [{ name: 'grounded-api', json: { ok: true } }]);
      expect(fs.existsSync(path.join(pack.dir, 'sample-user.json'))).toBe(true);
      expect(fs.existsSync(path.join(pack.dir, 'grounded-api.json'))).toBe(true);
      expect(fs.existsSync(pack.manifestPath)).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('FailureEvidencePackService writes v2 summary + zip + pack-index', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-evidence-'));
    try {
      const guard = new WorkspaceGuard(tmp);
      const run: TestRunResult = {
        runId: 'run_gap',
        timestamp: new Date().toISOString(),
        scope: 'all',
        status: 'failed',
        durationMs: 5,
        summary: { total: 1, passed: 0, failed: 1, skipped: 0, timedOut: 0 },
        testResults: [
          {
            id: 't1',
            title: 'broken',
            filePath: 'tests/a.test.ts',
            status: 'failed',
            durationMs: 1,
            error: { message: 'expected 200' }
          }
        ],
        failures: [],
        artifacts: []
      };
      const diagnoses: DiagnosticResult[] = [
        {
          diagnosisId: 'd1',
          testId: 't1',
          classification: 'APPLICATION_BUG',
          confidence: 0.8,
          rootCause: 'status mismatch',
          evidence: {
            testId: 't1',
            testName: 'broken',
            testFile: 'tests/a.test.ts',
            errorMessage: 'expected 200'
          },
          evidenceSignals: ['status mismatch'],
          speculationNotes: [],
          affectedFiles: [],
          suggestedActions: ['fix handler'],
          canAutoHealTest: false
        }
      ];
      const pack = FailureEvidencePackService.pack({ guard, run, diagnoses, runId: 'run_gap' });
      expect(fs.existsSync(pack.indexPath)).toBe(true);
      expect(fs.existsSync(pack.packIndexPath)).toBe(true);
      const summary = JSON.parse(fs.readFileSync(path.join(pack.packDir, 'summary.json'), 'utf8'));
      expect(summary.schemaVersion).toBe('2');
      expect(pack.zipPath && fs.existsSync(pack.zipPath)).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('handshake AGENTS.md documents one-prompt verify loop', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-hs-'));
    try {
      const guard = new WorkspaceGuard(tmp);
      const res = AgentAdaptationService.handshake(guard, { agentName: 'TestAI', forceAgentsMd: true });
      const md = fs.readFileSync(res.agentsMdPath, 'utf8');
      expect(md).toMatch(/One-prompt loop/i);
      expect(md).toMatch(/teach-ai/);
      expect(res.pasteToAi).toMatch(/ONE-PROMPT LOOP/i);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('gold harness: grounded multi-route asserts stay deterministic', () => {
    const cases: PlannedTestCase[] = [
      {
        id: 'gold-a',
        title: 'A',
        description: 'GET /api/a',
        type: 'api',
        priority: 'high',
        requirementIds: [],
        targetFiles: [],
        runner: 'vitest',
        reason: 'gold',
        expectedBehavior: 'ok',
        category: 'functional',
        riskScore: 50,
        observedStatus: 200,
        observedPath: '/api/a',
        observedUrl: 'http://localhost/api/a',
        observedContentType: 'application/json; charset=utf-8',
        observedJsonKeys: ['id']
      },
      {
        id: 'gold-b',
        title: 'B',
        description: 'GET /api/b',
        type: 'api',
        priority: 'high',
        requirementIds: [],
        targetFiles: [],
        runner: 'vitest',
        reason: 'gold',
        expectedBehavior: 'ok',
        category: 'functional',
        riskScore: 50,
        observedStatus: 201,
        observedPath: '/api/b',
        observedUrl: 'http://localhost/api/b',
        observedJsonKeys: ['token']
      }
    ];
    for (const tc of cases) {
      const content = TestCodeGenerator.generateTestFile(tc, process.cwd()).content;
      expect(content).toContain(`toBe(${tc.observedStatus})`);
      expect(content).toContain('live-grounded shape');
    }
  });
});
