import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { ChaosEngineService } from '../../src/application/chaos-engine.js';
import { DockerOrchestratorService } from '../../src/application/docker-orchestrator.js';
import { BrowserMatrixService } from '../../src/application/browser-matrix.js';
import { BddGeneratorService } from '../../src/application/bdd-generator.js';
import { WebhookAlertService } from '../../src/application/webhook-alerts.js';
import { VeloProveEngine } from '../../src/application/engine.js';

describe('VeloProve v1.5.0 Enterprise Engines Suite', () => {
  const testRoot = path.resolve(process.cwd(), 'fixtures/test-project');
  let guard: WorkspaceGuard;

  beforeEach(() => {
    guard = new WorkspaceGuard(testRoot);
  });

  describe('ChaosEngineService (Monkey Testing)', () => {
    it('executes chaos probes and calculates resilience scores', async () => {
      // Mock global fetch to return resilient HTTP 400 for chaos payloads
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const report = await ChaosEngineService.runChaosTest({
        targetUrl: 'http://localhost:3000/api/users',
        iterations: 1,
        strategies: ['CORRUPTED_PAYLOAD', 'TYPE_CONFUSION']
      });

      expect(report.totalProbes).toBe(2);
      expect(report.resilientCount).toBe(2);
      expect(report.unhandled500Count).toBe(0);
      expect(report.resilienceScore).toBe(100);
      expect(report.overallVerdict).toBe('HIGHLY_RESILIENT');
      expect(report.probes.length).toBe(2);

      fetchSpy.mockRestore();
    });

    it('identifies unhandled 500 crashes as vulnerabilities', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return new Response('Internal Server Error Crash', {
          status: 500
        });
      });

      const report = await ChaosEngineService.runChaosTest({
        targetUrl: 'http://localhost:3000/api/crash',
        iterations: 2,
        strategies: ['CORRUPTED_PAYLOAD']
      });

      expect(report.unhandled500Count).toBe(2);
      expect(report.resilienceScore).toBe(0);
      expect(report.overallVerdict).toBe('VULNERABLE');

      fetchSpy.mockRestore();
    });
  });

  describe('DockerOrchestratorService (Isolated Test DBs)', () => {
    it('generates docker-compose.test.yml with postgres and redis', () => {
      const res = DockerOrchestratorService.generateTestEnvironment(guard, {
        services: ['postgres', 'redis'],
        projectName: 'veloprove-ci'
      });

      expect(res.composeFile).toContain('postgres:16-alpine');
      expect(res.composeFile).toContain('redis:7-alpine');
      expect(res.envFile).toContain('DATABASE_URL=postgresql://test_user:test_password@localhost:5433/test_db');
      expect(res.envFile).toContain('REDIS_URL=redis://localhost:6380');
      expect(res.servicesIncluded).toEqual(['postgres', 'redis']);
    });
  });

  describe('BrowserMatrixService (Cross-Browser & Viewports)', () => {
    it('generates multi-browser and mobile matrix configuration', () => {
      const result = BrowserMatrixService.generateMatrix({
        browsers: ['chromium', 'firefox', 'webkit'],
        devices: ['desktop', 'iphone_13', 'pixel_7']
      });

      expect(result.matrixCount).toBe(5);
      expect(result.matrix.some(m => m.name === 'Desktop CHROMIUM')).toBe(true);
      expect(result.matrix.some(m => m.name === 'Mobile Safari (iPhone 13)')).toBe(true);
      expect(result.matrix.some(m => m.name === 'Mobile Chrome (Pixel 7)')).toBe(true);
      expect(result.playwrightProjectsSnippet).toContain("browserName: 'chromium'");
      expect(result.playwrightProjectsSnippet).toContain("browserName: 'webkit'");
    });
  });

  describe('BddGeneratorService (Gherkin Feature Specs)', () => {
    it('generates .feature files and step definition skeletons from requirements', () => {
      const reqs = [
        {
          id: 'REQ-01',
          title: 'User Authentication Flow',
          description: 'Login with email and password',
          category: 'auth',
          priority: 'high' as const,
          sourceFile: 'PRD.md',
          tags: ['security', 'login']
        }
      ];

      const features = BddGeneratorService.generateFromRequirements(guard, reqs as any, 'features_test');

      expect(features.length).toBe(1);
      expect(features[0].featureText).toContain('Feature: User Authentication Flow');
      expect(features[0].featureText).toContain('Scenario: Happy path verification for User Authentication Flow');
      expect(features[0].featureText).toContain('Given the application is initialized and healthy');
      expect(features[0].stepDefinitionsCode).toContain("Given('the application is initialized and healthy'");
    });
  });

  describe('WebhookAlertService (Slack / Discord / Teams Notifications)', () => {
    it('formats and dispatches alert payload to webhook endpoint', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      const res = await WebhookAlertService.sendAlert({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/XXXX',
        provider: 'slack',
        payload: {
          projectName: 'MyEnterpriseApp',
          verdict: 'PASSED',
          totalTests: 50,
          passedCount: 50,
          failedCount: 0,
          score: 98
        }
      });

      expect(res.success).toBe(true);
      expect(res.provider).toBe('slack');
      expect(res.httpStatus).toBe(200);

      fetchSpy.mockRestore();
    });
  });

  describe('VeloProveEngine Integration Methods', () => {
    it('exposes all v1.5.0 enterprise engine methods', async () => {
      const engine = new VeloProveEngine(testRoot);

      const docker = engine.generateDockerEnv({ services: ['postgres'] });
      expect(docker.composeFile).toBeDefined();

      const matrix = engine.generateBrowserMatrix();
      expect(matrix.matrixCount).toBeGreaterThan(0);

      const bdd = await engine.generateBddFeatures();
      expect(Array.isArray(bdd)).toBe(true);
    });
  });
});
