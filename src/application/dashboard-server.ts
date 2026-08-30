import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { LocalStorage } from '../storage/local-store.js';
import type { QAForgeEngine } from './engine.js';
import { SecurityAuditService } from './security-audit.js';
import { PerformanceProfilerService } from './perf-profiler.js';
import { CoverageHeatmapService } from './coverage-heatmap.js';
import { QuarantineService } from './quarantine-service.js';
import { PostmanRunnerService } from '../adapters/api/postman-runner.js';
import { LoadTesterService } from './load-tester.js';
import { MockDataFactoryService } from './mock-data-factory.js';
import { OwaspScannerService } from './owasp-scanner.js';
import { RemoteBridgeService } from './remote-bridge.js';
import { ChaosEngineService } from './chaos-engine.js';
import { DockerOrchestratorService } from './docker-orchestrator.js';
import { BrowserMatrixService } from './browser-matrix.js';
import { BddGeneratorService } from './bdd-generator.js';
import { WebhookAlertService } from './webhook-alerts.js';
import { MalwareScannerService } from './malware-scanner.js';

export class LocalDashboardServer {
  public static start(
    guard: WorkspaceGuard,
    storage: LocalStorage,
    port = 4173,
    engine?: QAForgeEngine
  ): Promise<{ url: string; close: () => void }> {
    return new Promise((resolve) => {
      const server = http.createServer(async (req, res) => {
        const url = req.url || '/';
        const method = req.method || 'GET';

        // Helper JSON response
        const sendJson = (data: unknown, status = 200) => {
          res.writeHead(status, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(data, null, 2));
        };

        // Static Logo Asset Route
        if (url === '/logo.svg' || url === '/docs/assets/qaforge-logo.svg') {
          const logoPath = path.join(guard.getRoot(), 'docs/assets/qaforge-logo.svg');
          if (fs.existsSync(logoPath)) {
            const logoContent = fs.readFileSync(logoPath, 'utf8');
            res.writeHead(200, {
              'Content-Type': 'image/svg+xml',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=86400'
            });
            return res.end(logoContent);
          }
        }

        // Live HTTP Client API (Postman-like executor)
        if (url === '/api/http-client' && method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(bodyStr || '{}');
              const resData = await PostmanRunnerService.sendRequest(payload);
              return sendJson(resData);
            } catch (err: any) {
              return sendJson({ error: err.message }, 500);
            }
          });
          return;
        }

        // Live Load Tester API
        if (url === '/api/load-test' && method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(bodyStr || '{}');
              const report = await LoadTesterService.runLoadTest(payload);
              return sendJson(report);
            } catch (err: any) {
              return sendJson({ error: err.message }, 500);
            }
          });
          return;
        }

        // Mock Data Generator API
        if (url.startsWith('/api/mock-data')) {
          const urlObj = new URL(url, 'http://localhost');
          const preset = (urlObj.searchParams.get('preset') || 'user') as any;
          const count = parseInt(urlObj.searchParams.get('count') || '5', 10);
          const locale = (urlObj.searchParams.get('locale') || 'en') as any;
          const data = MockDataFactoryService.generate({ preset, count, locale });
          return sendJson(data);
        }

        // OWASP Scan API
        if (url.startsWith('/api/owasp-scan')) {
          const urlObj = new URL(url, 'http://localhost');
          const targetUrl = urlObj.searchParams.get('url') || 'http://localhost:3000';
          try {
            const report = await OwaspScannerService.scanEndpoint(targetUrl);
            return sendJson(report);
          } catch (err: any) {
            return sendJson({ error: err.message }, 500);
          }
        }

        // Live Remote Bridge APIs
        if (url.startsWith('/api/remote/probe-init')) {
          const urlObj = new URL(url, 'http://localhost');
          const type = (urlObj.searchParams.get('type') || 'standalone_js') as any;
          const name = urlObj.searchParams.get('name') || 'LiveSite';
          const snippet = RemoteBridgeService.generateProbeSnippet(type, { siteName: name });
          return sendJson(snippet);
        }

        if (url === '/api/remote/connect' && method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(bodyStr || '{}');
              const resData = await RemoteBridgeService.connectAndHandshake(payload.remoteUrl, payload.bridgeSecret);
              return sendJson(resData);
            } catch (err: any) {
              return sendJson({ error: err.message }, 500);
            }
          });
          return;
        }

        if (url === '/api/remote/audit' && method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(bodyStr || '{}');
              const report = await RemoteBridgeService.runRemoteAudit(payload.remoteUrl, {
                includeLoadTest: payload.includeLoadTest,
                loadVus: payload.loadVus,
                bridgeSecret: payload.bridgeSecret
              });
              return sendJson(report);
            } catch (err: any) {
              return sendJson({ error: err.message }, 500);
            }
          });
          return;
        }

        // 6. Chaos Monkey Test API
        if (url === '/api/chaos-test' && method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(bodyStr || '{}');
              const report = await ChaosEngineService.runChaosTest(payload);
              return sendJson(report);
            } catch (err: any) {
              return sendJson({ error: err.message }, 500);
            }
          });
          return;
        }

        // 7. Docker Environment Generator API
        if (url === '/api/docker-env' && method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', () => {
            try {
              const payload = JSON.parse(bodyStr || '{}');
              const resDoc = DockerOrchestratorService.generateTestEnvironment(guard, payload);
              return sendJson(resDoc);
            } catch (err: any) {
              return sendJson({ error: err.message }, 500);
            }
          });
          return;
        }

        // 8. Browser Matrix API
        if (url === '/api/browser-matrix') {
          const matrix = BrowserMatrixService.generateMatrix();
          return sendJson(matrix);
        }

        // 9. BDD Gherkin Generator API
        if (url === '/api/bdd-generator') {
          const reqs = storage.getRequirements() || [];
          const features = BddGeneratorService.generateFromRequirements(guard, reqs);
          return sendJson(features);
        }

        // 10. Webhook Alert Dispatcher API
        if (url === '/api/send-alert' && method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(bodyStr || '{}');
              const resAlert = await WebhookAlertService.sendAlert(payload);
              return sendJson(resAlert);
            } catch (err: any) {
              return sendJson({ error: err.message }, 500);
            }
          });
          return;
        }

        // Data APIs
        if (url === '/api/profile') {
          return sendJson(storage.getProjectProfile() || {});
        }

        if (url === '/api/requirements') {
          return sendJson(storage.getRequirements() || []);
        }

        if (url === '/api/runs') {
          return sendJson(storage.getAllTestRuns() || []);
        }

        if (url === '/api/flaky') {
          return sendJson(storage.getFlakyHistory() || []);
        }

        if (url === '/api/security') {
          return sendJson(SecurityAuditService.audit(guard));
        }

        if (url === '/api/perf') {
          const profile = storage.getProjectProfile() || { routes: [], apiEndpoints: [] } as any;
          return sendJson(PerformanceProfilerService.profile(profile, guard));
        }

        if (url === '/api/heatmap') {
          const profile = storage.getProjectProfile() || { routes: [], apiEndpoints: [] } as any;
          const reqs = storage.getRequirements();
          const latestRun = storage.getLatestTestRun();
          return sendJson(CoverageHeatmapService.generateHeatmap(reqs, profile, latestRun));
        }

        if (url === '/api/malware') {
          return sendJson(MalwareScannerService.scan(guard));
        }

        if (url === '/api/malware/remediate' && method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', () => {
            try {
              const payload = JSON.parse(bodyStr || '{}');
              const resRem = MalwareScannerService.remediate(guard, payload.threatIds);
              return sendJson(resRem);
            } catch (err: any) {
              return sendJson({ error: err.message }, 500);
            }
          });
          return;
        }

        // Action Trigger APIs (One-Click Execute from Dashboard)
        if (engine && url.startsWith('/api/actions/')) {
          const action = url.replace('/api/actions/', '').split('?')[0];

          try {
            switch (action) {
              case 'inspect': {
                const result = await engine.inspect();
                return sendJson({ success: true, action, data: result });
              }

              case 'plan': {
                const result = await engine.plan({ scope: 'all' });
                return sendJson({ success: true, action, data: result });
              }

              case 'generate': {
                const result = await engine.generate({ overwritePolicy: 'generated-only' });
                return sendJson({ success: true, action, data: result });
              }

              case 'run': {
                const result = await engine.run({ scope: 'all' });
                return sendJson({ success: true, action, data: result });
              }

              case 'run-changed': {
                const impact = await engine.changed();
                const paths = impact.impactedTestFiles.length > 0 ? impact.impactedTestFiles : undefined;
                const result = await engine.run({ scope: 'changed', paths });
                return sendJson({ success: true, action, data: { impact, runResult: result } });
              }

              case 'diagnose': {
                const result = await engine.diagnose();
                return sendJson({ success: true, action, data: result });
              }

              case 'heal': {
                const result = await engine.heal();
                return sendJson({ success: true, action, data: result });
              }

              case 'lint': {
                const result = await engine.lint({ scope: 'all' });
                return sendJson({ success: true, action, data: result });
              }

              case 'lint-fix': {
                const result = await engine.lint({ scope: 'all', fix: true });
                return sendJson({ success: true, action, data: result });
              }

              case 'a11y': {
                const result = await engine.auditA11y();
                return sendJson({ success: true, action, data: result });
              }

              case 'visual-diff': {
                const result = await engine.compareVisuals();
                return sendJson({ success: true, action, data: result });
              }

              case 'contract-drift': {
                const result = await engine.checkContractDrift();
                return sendJson({ success: true, action, data: result });
              }

              case 'fuzz-api': {
                const result = await engine.fuzzApi();
                return sendJson({ success: true, action, data: result });
              }

              case 'mutation': {
                const result = await engine.evaluateMutationScore();
                return sendJson({ success: true, action, data: result });
              }

              case 'explore': {
                const result = await engine.explore();
                return sendJson({ success: true, action, data: result });
              }

              case 'release': {
                const result = await engine.releaseCheck();
                return sendJson({ success: true, action, data: result });
              }

              case 'audit': {
                const result = engine.auditSecurity();
                return sendJson({ success: true, action, data: result });
              }

              case 'perf': {
                const result = await engine.profilePerf();
                return sendJson({ success: true, action, data: result });
              }

              case 'mock-gen': {
                const result = await engine.generateMsw();
                return sendJson({ success: true, action, data: result });
              }

              case 'quarantine': {
                const result = engine.quarantineFlaky();
                return sendJson({ success: true, action, data: result });
              }

              case 'coverage': {
                const result = await engine.getCoverageHeatmap();
                return sendJson({ success: true, action, data: result });
              }

              case 'learn-framework': {
                const result = engine.learnFramework();
                return sendJson({ success: true, action, data: result });
              }

              case 'export-postman': {
                const result = await engine.exportPostmanCollection();
                return sendJson({ success: true, action, data: result });
              }

              case 'export-report': {
                const result = engine.exportReport({ format: 'html' });
                return sendJson({ success: true, action, data: result });
              }

              case 'auto-fix': {
                const result = await engine.autoFixBugs(false);
                return sendJson({ success: true, action, data: result });
              }

              case 'docker-env': {
                const result = engine.generateDockerEnv({ services: ['postgres', 'redis'] });
                return sendJson({ success: true, action, data: result });
              }

              case 'browser-matrix': {
                const result = engine.generateBrowserMatrix();
                return sendJson({ success: true, action, data: result });
              }

              case 'bdd': {
                const result = await engine.generateBddFeatures();
                return sendJson({ success: true, action, data: result });
              }

              case 'feature-parity': {
                const result = engine.auditFeatureParity();
                return sendJson({ success: true, action, data: result });
              }

              case 'scan-malware': {
                const result = engine.scanMalware();
                return sendJson({ success: true, action, data: result });
              }

              case 'fix-malware': {
                const result = engine.remediateMalware();
                return sendJson({ success: true, action, data: result });
              }

              case 'ai-eval': {
                const result = await engine.evaluateAiOutputs({
                  testCases: [
                    { id: '1', prompt: 'Summarize system', expectedKeywords: ['QAForge'] }
                  ]
                });
                return sendJson({ success: true, action, data: result });
              }

              case 'bisect': {
                const result = await engine.huntRegression();
                return sendJson({ success: true, action, data: result });
              }

              case 'audit-contracts': {
                const result = engine.auditSmartContracts();
                return sendJson({ success: true, action, data: result });
              }

              case 'dead-assets': {
                const result = engine.scanDeadAssets();
                return sendJson({ success: true, action, data: result });
              }

              case 'screen-reader': {
                const result = engine.simulateScreenReader();
                return sendJson({ success: true, action, data: result });
              }

              case 'db-audit': {
                const result = engine.auditDbQueries();
                return sendJson({ success: true, action, data: result });
              }

              case 'env-drift': {
                const result = engine.auditEnvDrift();
                return sendJson({ success: true, action, data: result });
              }

              case 'failure-replay': {
                const result = engine.recordFailureReplay({
                  testTitle: 'Dashboard Replay Demo',
                  testFile: 'tests/e2e/sample.spec.ts',
                  errorMessage: 'AssertionError: expected element to be visible'
                });
                return sendJson({ success: true, action, data: result });
              }

              case 'arch-graph': {
                const result = engine.generateArchitectureGraph();
                return sendJson({ success: true, action, data: result });
              }

              case 'security-scan': {
                const result = await engine.scanSecuritySurface();
                return sendJson({ success: true, action, data: result });
              }

              case 'security-run': {
                const result = await engine.runSecurityTests({ safeMode: true });
                return sendJson({ success: true, action, data: result });
              }

              case 'sri-csrf-audit': {
                const result = engine.auditSriAndCsrf();
                return sendJson({ success: true, action, data: result });
              }

              case 'dedup-tests': {
                const result = engine.deduplicateTests();
                return sendJson({ success: true, action, data: result });
              }

              case 'export-sarif': {
                const report = await engine.runSecurityTests({ safeMode: true });
                const audit = engine.auditSecurity();
                const result = engine.exportSarif(report, audit);
                return sendJson({ success: true, action, data: result });
              }

              case 'doctor': {
                const result = engine.doctor();
                return sendJson({ success: true, action, data: result });
              }






              default:
                return sendJson({ error: `Unknown action: ${action}` }, 400);
            }
          } catch (err: any) {
            return sendJson({ success: false, action, error: err.message }, 500);
          }
        }

        // Live Calculated Metrics & Audits
        const profile = storage.getProjectProfile() || {
          projectName: 'ActiveProject',
          packageManager: 'npm',
          frameworks: ['Node.js'],
          testFrameworks: ['Vitest'],
          routes: [],
          apiEndpoints: []
        } as any;
        const reqs = storage.getRequirements();
        const runs = storage.getAllTestRuns();
        const latestRun = storage.getLatestTestRun();
        const secAudit = SecurityAuditService.audit(guard);
        const perfAudit = PerformanceProfilerService.profile(profile, guard);
        const heatmap = CoverageHeatmapService.generateHeatmap(reqs, profile, latestRun);
        const quarantined = QuarantineService.getQuarantined(guard);

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QAForge — Autonomous Local QA, Load Testing & Postman Hub</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='24 33 100 102'%3E%3Cpath fill='%2338bdf8' d='M105.16,99.75c0-1.58,0-2.8,0-4.01c0-7.64-0.02-15.29,0.02-22.93c0.01-1.32-0.39-2.14-1.58-2.79c-9.36-5.15-18.69-10.34-28-15.58c-1.16-0.65-2.05-0.65-3.19,0.01c-9.17,5.23-18.36,10.41-27.56,15.56c-1.09,0.61-1.56,1.34-1.55,2.61c0.06,10.1,0.07,20.21,0.04,30.31c0,1.19,0.38,1.86,1.43,2.45c7.11,4.01,14.19,8.07,21.24,12.16c0.64,0.37,1.44,1.11,1.51,1.75c0.71,6.62,1.28,13.25,1.93,20.3c-3.61-2.09-6.89-3.99-10.16-5.88c-10.42-6.04-20.82-12.1-31.27-18.08c-1.4-0.8-1.98-1.69-1.97-3.35c0.06-16.39,0.06-32.78,0.01-49.16c0-1.52,0.58-2.35,1.84-3.06c14.95-8.54,29.89-17.1,44.81-25.7c1.09-0.63,1.86-0.4,2.83,0.15c15.08,8.58,30.16,17.15,45.27,25.68c1.17,0.66,1.59,1.46,1.58,2.79c-0.05,8.16,0.01,16.32-0.07,24.48c-0.01,0.82-0.44,1.98-1.07,2.39c-4.83,3.14-9.75,6.13-14.65,9.16C106.28,99.21,105.93,99.36,105.16,99.75z'/%3E%3Cpath fill='%2320BF55' d='M122.1,97.08c0,5.88,0.03,11.31-0.05,16.74c-0.01,0.54-0.64,1.24-1.17,1.58c-9.59,6.14-19.22,12.22-28.82,18.36c-0.89,0.57-1.53,0.61-2.43,0.03c-4.74-3.04-9.54-5.98-14.29-9.01c-0.49-0.31-1.07-0.87-1.15-1.38c-0.97-6.65-1.86-13.31-2.84-20.51c1.73,1.08,3.07,1.87,4.37,2.73c4.54,2.99,9.08,5.98,13.58,9.04c1.17,0.8,2.05,0.82,3.29,0.06c8.89-5.43,17.84-10.77,26.77-16.14C120.13,98.13,120.92,97.73,122.1,97.08z'/%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #070b13;
      --bg-card: rgba(15, 23, 42, 0.75);
      --bg-card-hover: rgba(30, 41, 59, 0.9);
      --border: rgba(51, 65, 85, 0.6);
      --border-accent: rgba(56, 189, 248, 0.4);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --primary-gradient: linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%);
      --accent-gradient: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
      --postman-gradient: linear-gradient(135deg, #ff6c37 0%, #ff8533 100%);
      --load-gradient: linear-gradient(135deg, #e11d48 0%, #f43f5e 100%);
      --success: #34d399;
      --danger: #f87171;
      --warning: #fbbf24;
      --code-bg: #030712;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg-dark);
      background-image: radial-gradient(circle at 10% 10%, rgba(56, 189, 248, 0.12) 0%, transparent 45%), radial-gradient(circle at 90% 90%, rgba(168, 85, 247, 0.1) 0%, transparent 45%);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      padding: 1.5rem 2rem;
      min-height: 100vh;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.25rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .logo-container { display: flex; align-items: center; gap: 0.85rem; }
    .logo-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(56, 189, 248, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 25px rgba(56, 189, 248, 0.35);
    }
    .logo-title { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; background: linear-gradient(135deg, #fff 0%, #cbd5e1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .badge {
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: var(--primary);
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .badge-accent {
      background: rgba(168, 85, 247, 0.2);
      border: 1px solid rgba(168, 85, 247, 0.4);
      color: #c084fc;
    }
    .badge-postman {
      background: rgba(255, 108, 55, 0.2);
      border: 1px solid rgba(255, 108, 55, 0.4);
      color: #ff8533;
    }
    .section-label {
      font-size: 0.82rem;
      font-weight: 800;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .actions-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
      gap: 0.65rem;
      margin-bottom: 1.5rem;
    }
    .btn-action {
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.75rem 0.95rem;
      border-radius: 0.75rem;
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(10px);
    }
    .btn-action:hover {
      background: var(--bg-card-hover);
      border-color: var(--primary);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(56, 189, 248, 0.22);
    }
    .btn-action.btn-primary-action {
      background: var(--primary-gradient);
      border: none;
      color: #fff;
    }
    .btn-action.btn-postman-action {
      background: var(--postman-gradient);
      border: none;
      color: #fff;
    }
    .btn-action.btn-load-action {
      background: var(--load-gradient);
      border: none;
      color: #fff;
    }
    .grid-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 0.85rem;
      padding: 1.25rem;
      backdrop-filter: blur(12px);
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.4), transparent);
    }
    .metric { font-size: 2.1rem; font-weight: 800; margin-top: 0.35rem; font-family: 'JetBrains Mono', monospace; }
    .metric-success { color: var(--success); text-shadow: 0 0 12px rgba(52, 211, 153, 0.3); }
    .metric-danger { color: var(--danger); text-shadow: 0 0 12px rgba(248, 113, 113, 0.3); }
    .metric-primary { color: var(--primary); text-shadow: 0 0 12px rgba(56, 189, 248, 0.3); }
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
      overflow-x: auto;
    }
    .tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 0.55rem 1.1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.88rem;
      font-weight: 600;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .tab-btn.active {
      background: var(--bg-card);
      border-color: var(--border);
      color: var(--primary);
    }
    .tab-btn.tab-postman-btn {
      background: rgba(255, 108, 55, 0.12);
      border-color: rgba(255, 108, 55, 0.3);
      color: #ff8533;
    }
    .tab-btn.tab-postman-btn.active {
      background: rgba(255, 108, 55, 0.25);
      border-color: #ff6c37;
      color: #fff;
    }
    .tab-btn.tab-load-btn {
      background: rgba(225, 29, 72, 0.12);
      border-color: rgba(225, 29, 72, 0.3);
      color: #fb7185;
    }
    .tab-btn.tab-load-btn.active {
      background: rgba(225, 29, 72, 0.25);
      border-color: #f43f5e;
      color: #fff;
    }
    .tab-btn.tab-guide-btn {
      background: rgba(168, 85, 247, 0.12);
      border-color: rgba(168, 85, 247, 0.3);
      color: #c084fc;
    }
    .tab-btn.tab-guide-btn.active {
      background: rgba(168, 85, 247, 0.25);
      border-color: #a855f7;
      color: #fff;
    }
    .tab-btn.tab-remote-btn {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.3);
      color: #34d399;
    }
    .tab-btn.tab-remote-btn.active {
      background: rgba(16, 185, 129, 0.25);
      border-color: #10b981;
      color: #fff;
    }
    .btn-action.btn-remote-action {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      border: none;
      color: #fff;
    }

    .tab-content { display: none; }
    .tab-content.active { display: block; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.85rem; }
    th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
    th { color: var(--text-muted); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; font-weight: 700; }
    tr:hover { background: rgba(255,255,255,0.02); }
    .tag { display: inline-block; padding: 0.2rem 0.55rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
    .tag-critical { background: rgba(248, 113, 113, 0.2); color: var(--danger); border: 1px solid rgba(248, 113, 113, 0.4); }
    .tag-high { background: rgba(251, 191, 36, 0.2); color: var(--warning); border: 1px solid rgba(251, 191, 36, 0.4); }
    .tag-medium { background: rgba(56, 189, 248, 0.2); color: var(--primary); border: 1px solid rgba(56, 189, 248, 0.4); }
    .tag-full { background: rgba(52, 211, 153, 0.2); color: var(--success); border: 1px solid rgba(52, 211, 153, 0.4); }
    .tag-uncovered { background: rgba(248, 113, 113, 0.2); color: var(--danger); border: 1px solid rgba(248, 113, 113, 0.4); }
    .console-box {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      color: #38bdf8;
      max-height: 200px;
      overflow-y: auto;
      margin-bottom: 1.5rem;
    }
    .console-entry { margin-bottom: 0.35rem; display: flex; gap: 0.5rem; }
    .console-time { color: var(--text-muted); }
    .progress-bar-bg { background: rgba(255,255,255,0.08); border-radius: 9999px; height: 8px; width: 100%; overflow: hidden; margin-top: 0.4rem; }
    .progress-bar-fill { height: 100%; border-radius: 9999px; background: var(--primary-gradient); }
    
    /* Postman & Form Styles */
    .postman-bar {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .method-select, .select-box {
      background: #030712;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.65rem 1rem;
      border-radius: 0.5rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      cursor: pointer;
    }
    .url-input {
      flex: 1;
      min-width: 280px;
      background: #030712;
      border: 1px solid var(--border);
      color: #fff;
      padding: 0.65rem 1rem;
      border-radius: 0.5rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
    }
    .btn-send-req {
      background: var(--postman-gradient);
      border: none;
      color: #fff;
      font-weight: 800;
      padding: 0.65rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
    }
    .btn-send-req:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(255, 108, 55, 0.4);
    }
    .postman-editor-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .textarea-box {
      width: 100%;
      height: 180px;
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 0.75rem;
      color: #7dd3fc;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      resize: vertical;
    }
    .response-header-stats {
      display: flex;
      gap: 1rem;
      align-items: center;
      margin-bottom: 0.5rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      flex-wrap: wrap;
    }
    .res-badge {
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      font-weight: 800;
    }
    
    /* Guide Tab Styles */
    .guide-section {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    }
    .guide-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .guide-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .guide-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
    }
    .guide-card h4 {
      color: var(--primary);
      margin-bottom: 0.4rem;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .code-block {
      background: var(--code-bg);
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      color: #7dd3fc;
      margin: 0.5rem 0;
      position: relative;
      overflow-x: auto;
    }
    .btn-copy {
      position: absolute;
      right: 8px;
      top: 8px;
      background: rgba(255,255,255,0.1);
      border: none;
      color: #fff;
      padding: 2px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.7rem;
    }
    .search-guide-box {
      width: 100%;
      padding: 0.75rem 1rem;
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      color: #fff;
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }
  </style>
</head>
<body>
  <header>
    <div class="logo-container">
      <div class="logo-icon" title="QAForge">
        <svg viewBox="24 33 100 102" style="width: 32px; height: 32px; display: block;" xmlns="http://www.w3.org/2000/svg">
          <path fill="#38bdf8" d="M105.16,99.75c0-1.58,0-2.8,0-4.01c0-7.64-0.02-15.29,0.02-22.93c0.01-1.32-0.39-2.14-1.58-2.79c-9.36-5.15-18.69-10.34-28-15.58c-1.16-0.65-2.05-0.65-3.19,0.01c-9.17,5.23-18.36,10.41-27.56,15.56c-1.09,0.61-1.56,1.34-1.55,2.61c0.06,10.1,0.07,20.21,0.04,30.31c0,1.19,0.38,1.86,1.43,2.45c7.11,4.01,14.19,8.07,21.24,12.16c0.64,0.37,1.44,1.11,1.51,1.75c0.71,6.62,1.28,13.25,1.93,20.3c-3.61-2.09-6.89-3.99-10.16-5.88c-10.42-6.04-20.82-12.1-31.27-18.08c-1.4-0.8-1.98-1.69-1.97-3.35c0.06-16.39,0.06-32.78,0.01-49.16c0-1.52,0.58-2.35,1.84-3.06c14.95-8.54,29.89-17.1,44.81-25.7c1.09-0.63,1.86-0.4,2.83,0.15c15.08,8.58,30.16,17.15,45.27,25.68c1.17,0.66,1.59,1.46,1.58,2.79c-0.05,8.16,0.01,16.32-0.07,24.48c-0.01,0.82-0.44,1.98-1.07,2.39c-4.83,3.14-9.75,6.13-14.65,9.16C106.28,99.21,105.93,99.36,105.16,99.75z"/>
          <path fill="#20BF55" d="M122.1,97.08c0,5.88,0.03,11.31-0.05,16.74c-0.01,0.54-0.64,1.24-1.17,1.58c-9.59,6.14-19.22,12.22-28.82,18.36c-0.89,0.57-1.53,0.61-2.43,0.03c-4.74-3.04-9.54-5.98-14.29-9.01c-0.49-0.31-1.07-0.87-1.15-1.38c-0.97-6.65-1.86-13.31-2.84-20.51c1.73,1.08,3.07,1.87,4.37,2.73c4.54,2.99,9.08,5.98,13.58,9.04c1.17,0.8,2.05,0.82,3.29,0.06c8.89-5.43,17.84-10.77,26.77-16.14C120.13,98.13,120.92,97.73,122.1,97.08z"/>
        </svg>
      </div>
      <div>
        <div class="logo-title">QAForge Command Center</div>
        <div style="color: var(--text-muted); font-size: 0.85rem;">Autonomous Local QA, Stress Testing & API Quality Hub</div>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
      <button class="btn-action btn-remote-action" onclick="switchTab('remote')">🌐 Live Remote Bridge</button>
      <button class="btn-action btn-postman-action" onclick="switchTab('client')">🚀 Postman API Client</button>
      <button class="btn-action btn-load-action" onclick="switchTab('load')">⚡ Load & Stress Testing</button>
      <button class="btn-action" onclick="switchTab('mockdata')">🧪 Mock Data Factory</button>
      <button class="btn-action" onclick="switchTab('owasp')">🛡️ OWASP Audit</button>
      <button class="btn-action" onclick="switchTab('guide')">📘 Complete Guide</button>
      <button class="btn-action" onclick="window.print()">🖨️ Export PDF</button>
      <span class="badge">v1.0.0 Local</span>
    </div>

  </header>

  <!-- One-Click Action Palette -->
  <div class="section-label">⚡ One-Click Action Hub</div>
  <div class="actions-bar">
    <button class="btn-action btn-remote-action" onclick="switchTab('remote')">🌐 Live Remote Bridge</button>
    <button class="btn-action btn-primary-action" onclick="triggerAction('run')">▶️ Run All Tests</button>
    <button class="btn-action" onclick="triggerAction('run-changed')">⚡ Run Changed Tests</button>
    <button class="btn-action btn-postman-action" onclick="triggerAction('export-postman')">📦 Export Postman v2.1</button>
    <button class="btn-action" onclick="switchTab('load')">⚡ Load Test</button>
    <button class="btn-action" onclick="switchTab('mockdata')">🧪 Generate Mock Data</button>
    <button class="btn-action" onclick="switchTab('owasp')">🛡️ OWASP Security Audit</button>

    <button class="btn-action" onclick="triggerAction('plan')">📋 Risk-Scored Plan</button>
    <button class="btn-action" onclick="triggerAction('generate')">🛠️ Generate Tests</button>
    <button class="btn-action" onclick="triggerAction('lint')">🧹 Run ESLint</button>
    <button class="btn-action" onclick="triggerAction('lint-fix')">✨ Auto-Fix Lints</button>
    <button class="btn-action" onclick="triggerAction('heal')">🩺 Self-Heal Tests</button>
    <button class="btn-action" onclick="triggerAction('audit')">🔒 Security CVE Audit</button>
    <button class="btn-action" onclick="triggerAction('perf')">⚡ Web Vitals (Perf)</button>
    <button class="btn-action" onclick="triggerAction('mock-gen')">🕸️ Generate MSW</button>
    <button class="btn-action" onclick="triggerAction('quarantine')">🚷 Quarantine Flaky</button>
    <button class="btn-action" onclick="triggerAction('coverage')">📊 Coverage Heatmap</button>
    <button class="btn-action" onclick="triggerAction('a11y')">♿ WCAG 2.1 Audit</button>
    <button class="btn-action" onclick="triggerAction('contract-drift')">📑 API Contract Drift</button>
    <button class="btn-action" onclick="triggerAction('fuzz-api')">🛡️ API Security Fuzz</button>
    <button class="btn-action" onclick="triggerAction('auto-fix')">🛠️ Auto-Fix Bugs</button>
    <button class="btn-action" onclick="triggerAction('export-report')">📄 Export Audit Report</button>
    <button class="btn-action" onclick="triggerAction('docker-env')">🐳 Docker Test Env</button>
    <button class="btn-action" onclick="triggerAction('browser-matrix')">📱 Browser Matrix</button>
    <button class="btn-action" onclick="triggerAction('bdd')">🥒 BDD Features</button>
    <button class="btn-action" onclick="triggerAction('feature-parity')">🔍 UI Feature Parity</button>
    <button class="btn-action" onclick="triggerAction('scan-malware')">🛡️ Malware Scan</button>
    <button class="btn-action" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff;" onclick="triggerAction('fix-malware')">⚡ Auto-Fix Threats</button>
    <button class="btn-action" onclick="triggerAction('ai-eval')">🧠 AI Hallucination Eval</button>
    <button class="btn-action" onclick="triggerAction('bisect')">🔍 Git Bisect Hunter</button>
    <button class="btn-action" onclick="triggerAction('audit-contracts')">⛓️ Smart Contract Audit</button>
    <button class="btn-action" onclick="triggerAction('dead-assets')">🧹 Purge Dead Assets</button>
    <button class="btn-action" onclick="triggerAction('screen-reader')">🎙️ Screen Reader Sim</button>
    <button class="btn-action" onclick="triggerAction('db-audit')">🗄️ SQL N+1 & DB Audit</button>
    <button class="btn-action" onclick="triggerAction('env-drift')">⚖️ Env Drift Audit</button>
    <button class="btn-action" onclick="triggerAction('failure-replay')">🎬 Failure Replay</button>
    <button class="btn-action" onclick="triggerAction('arch-graph')">🗺️ Arch Graph</button>
    <button class="btn-action" onclick="triggerAction('learn-framework')">🧠 Learn Framework</button>





  </div>

  <!-- Live Activity Console -->
  <div class="console-box" id="consoleBox">
    <div class="console-entry">
      <span class="console-time">[${new Date().toLocaleTimeString()}]</span>
      <span>QAForge Command Center initialized. Load Engine & Zero-Cloud API Suite ready.</span>
    </div>
  </div>

  <!-- Real-time Quality Metrics Grid -->
  <div class="grid-metrics">
    <div class="card">
      <div style="color: var(--text-muted); font-size: 0.85rem;">PRD Requirements Coverage</div>
      <div class="metric metric-primary">${heatmap.overallCoverageScore}%</div>
      <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${heatmap.overallCoverageScore}%;"></div></div>
      <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 0.4rem;">Full: ${heatmap.fullCount} | Partial: ${heatmap.partialCount} | Gaps: ${heatmap.uncoveredCount}</div>
    </div>

    <div class="card">
      <div style="color: var(--text-muted); font-size: 0.85rem;">Latest Test Run Verdict</div>
      <div class="metric ${latestRun?.status === 'passed' ? 'metric-success' : 'metric-danger'}">
        ${latestRun?.status ? latestRun.status.toUpperCase() : 'NO RUNS'}
      </div>
      <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 0.4rem;">${latestRun ? `${latestRun.summary.passed}/${latestRun.summary.total} Passed (${latestRun.durationMs}ms)` : 'Click Run All Tests'}</div>
    </div>

    <div class="card">
      <div style="color: var(--text-muted); font-size: 0.85rem;">Security & Secret Audit</div>
      <div class="metric ${secAudit.score > 80 ? 'metric-success' : 'metric-danger'}">${secAudit.score}/100</div>
      <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 0.4rem;">${secAudit.totalVulnerabilities} Issue(s) | ${secAudit.dependenciesScanned} Deps Scanned</div>
    </div>

    <div class="card">
      <div style="color: var(--text-muted); font-size: 0.85rem;">Core Web Vitals & Perf</div>
      <div class="metric ${perfAudit.overallScore > 80 ? 'metric-success' : 'metric-primary'}">${perfAudit.overallScore}/100</div>
      <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 0.4rem;">Rating: ${perfAudit.rating} (${perfAudit.totalRoutesProfiled} Routes)</div>
    </div>

    <div class="card">
      <div style="color: var(--text-muted); font-size: 0.85rem;">Active Tech Stack</div>
      <div class="metric" style="font-size: 1.1rem; color: var(--primary); margin-top: 0.4rem;">
        ${profile?.frameworks?.join(', ') || 'Node.js'}
      </div>
      <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 0.4rem;">Runners: ${profile?.testFrameworks?.join(', ') || 'Vitest'}</div>
    </div>
  </div>

  <!-- Tab Navigation -->
  <div class="tabs">
    <button class="tab-btn tab-remote-btn" onclick="switchTab('remote')">🌐 Live Remote Bridge</button>
    <button class="tab-btn tab-postman-btn" onclick="switchTab('client')">🚀 Postman API Client</button>
    <button class="tab-btn tab-load-btn" onclick="switchTab('load')">⚡ Load & Stress Testing</button>
    <button class="tab-btn" onclick="switchTab('mockdata')">🧪 AI Mock Data Factory</button>
    <button class="tab-btn" onclick="switchTab('owasp')">🛡️ OWASP Security Audit</button>
    <button class="tab-btn active" onclick="switchTab('heatmap')">📊 Requirements Heatmap (${heatmap.items.length})</button>
    <button class="tab-btn" onclick="switchTab('runs')">🧪 Test Execution Runs (${runs.length})</button>
    <button class="tab-btn" onclick="switchTab('sec')">🔒 Security & CVEs (${secAudit.totalVulnerabilities})</button>
    <button class="tab-btn" onclick="switchTab('perf')">⚡ Web Vitals & Speed (${perfAudit.totalRoutesProfiled})</button>
    <button class="tab-btn" onclick="switchTab('apis')">🌐 APIs & MSW Endpoints (${(profile?.apiEndpoints || []).length})</button>
    <button class="tab-btn" onclick="switchTab('quarantine')">🚷 Flaky Quarantine (${quarantined.length})</button>
    <button class="tab-btn tab-guide-btn" onclick="switchTab('guide')">📘 Complete Guide & Docs</button>
    <button class="tab-btn" style="background: rgba(168, 85, 247, 0.15); border-color: rgba(168, 85, 247, 0.4); color: #c084fc;" onclick="switchTab('about')">ℹ️ About QAForge</button>
    <button class="tab-btn" onclick="switchTab('report')">📄 Executive Report</button>
  </div>

  <!-- Tab: Live Remote Bridge & Probe Companion -->
  <div id="tab-remote" class="tab-content card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
      <h3 style="display: flex; align-items: center; gap: 0.5rem; color: #34d399;">🌐 Live Remote Website Companion Bridge & Agent</h3>
      <button class="btn-action btn-remote-action" onclick="generateRemoteProbeCode()">⚡ Generate Drop-in Companion Probe</button>
    </div>
    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">Connect local QAForge directly to any live production/staging website by placing a lightweight companion probe or auditing live URLs remotely.</p>

    <div class="postman-bar">
      <input type="text" id="remoteTargetUrl" class="url-input" placeholder="https://my-live-app.com" value="https://example.com">
      <input type="text" id="remoteBridgeSecret" class="url-input" style="max-width: 260px;" placeholder="Optional Bridge Secret Token">
      <button class="btn-action btn-remote-action" onclick="connectRemoteLive()">
        <span>🔗 Test Link & Handshake</span>
      </button>
      <button class="btn-action" style="background: rgba(56, 189, 248, 0.2); border-color: #38bdf8; color: #38bdf8;" onclick="auditRemoteLive()">
        <span>🔍 Full Remote Audit</span>
      </button>
    </div>

    <!-- Live Remote Telemetry Grid -->
    <div id="remoteResultContainer" style="display: none; margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1rem;">
      <div class="grid-metrics">
        <div class="card">
          <div style="color: var(--text-muted); font-size: 0.8rem;">Link Status</div>
          <div id="remoteLinkStatus" class="metric metric-success">CONNECTED</div>
        </div>
        <div class="card">
          <div style="color: var(--text-muted); font-size: 0.8rem;">Health Score</div>
          <div id="remoteHealthScore" class="metric metric-primary">95/100</div>
        </div>
        <div class="card">
          <div style="color: var(--text-muted); font-size: 0.8rem;">Discovered Live Elements</div>
          <div id="remoteDiscoveredCount" class="metric" style="color: #34d399;">0</div>
        </div>
      </div>
      <div class="code-block" style="max-height: 280px; overflow-y: auto;">
        <pre id="remoteReportJson" style="margin: 0; color: #34d399;"></pre>
      </div>
    </div>

    <!-- Drop-in Probe Generator Modal / Card -->
    <div style="margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1rem;">
      <div style="font-size: 0.9rem; font-weight: 800; color: #f8fafc; margin-bottom: 0.5rem;">🛠️ Generate Drop-in Companion File for Live Website:</div>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
        <select id="probeTypeSelect" class="select-box">
          <option value="standalone_js">Standalone Node.js Microservice (qaforge-probe.js)</option>
          <option value="nextjs_route">Next.js App Router (app/api/qaforge/route.ts)</option>
          <option value="express_middleware">Express.js Middleware (qaforge-middleware.js)</option>
          <option value="html_snippet">Frontend Client Tag (qaforge-client-probe.html)</option>
        </select>
        <button class="btn-action" onclick="generateRemoteProbeCode()">Generate Code</button>
      </div>
      <div class="code-block" style="max-height: 250px; overflow-y: auto;">
        <pre id="probeCodeDisplay" style="margin: 0; color: #7dd3fc;">// Select a framework and click "Generate Code" to get your live probe snippet...</pre>
        <button class="btn-copy" onclick="copyCode(document.getElementById('probeCodeDisplay').innerText)">Copy Probe Code</button>
      </div>
    </div>
  </div>


  <!-- Tab: Postman API Client & Runner -->
  <div id="tab-client" class="tab-content card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
      <h3 style="display: flex; align-items: center; gap: 0.5rem; color: #ff8533;">🚀 Postman-Compatible Interactive API Client & Suite Runner</h3>
      <button class="btn-action btn-postman-action" onclick="triggerAction('export-postman')">📥 Export Project to Postman v2.1 JSON</button>
    </div>

    <!-- Quick API Route Picker -->
    <div style="margin-bottom: 1rem;">
      <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">Quick Pick Discovered API: </span>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.35rem;">
        ${(profile?.apiEndpoints || []).slice(0, 8).map((ep: any) => `
          <button class="badge" style="cursor: pointer; background: rgba(255,108,55,0.15); border-color: rgba(255,108,55,0.4); color: #ff8533;" onclick="loadApiIntoClient('${ep.method}', '${ep.path}')">
            <strong>${ep.method}</strong> ${ep.path}
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Request Builder Bar -->
    <div class="postman-bar">
      <select id="reqMethod" class="method-select">
        <option value="GET">GET</option>
        <option value="POST">POST</option>
        <option value="PUT">PUT</option>
        <option value="DELETE">DELETE</option>
        <option value="PATCH">PATCH</option>
        <option value="HEAD">HEAD</option>
      </select>
      <input type="text" id="reqUrl" class="url-input" placeholder="http://localhost:3000/api/users" value="http://localhost:3000/api/users">
      <button class="btn-send-req" onclick="sendPostmanRequest()">
        <span>🚀 Send Request</span>
      </button>
    </div>

    <!-- Request Body & Headers -->
    <div class="postman-editor-grid">
      <div>
        <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.4rem;">Request Headers (JSON):</div>
        <textarea id="reqHeaders" class="textarea-box" placeholder='{\n  "Content-Type": "application/json"\n}'>{\n  "Content-Type": "application/json"\n}</textarea>
      </div>
      <div>
        <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.4rem;">Request Body Payload (JSON / Raw):</div>
        <textarea id="reqBody" class="textarea-box" placeholder='{\n  "name": "Alex Smith",\n  "email": "alex@example.com"\n}'></textarea>
      </div>
    </div>

    <!-- Live Response Viewer -->
    <div style="margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1rem;">
      <div class="response-header-stats">
        <span>Response:</span>
        <span id="resStatusBadge" class="res-badge" style="background: rgba(255,255,255,0.1); color: var(--text-muted);">No Request Sent</span>
        <span id="resDuration" style="color: var(--text-muted);">0 ms</span>
        <span id="resSize" style="color: var(--text-muted);">0 B</span>
      </div>
      <div class="code-block" style="min-height: 150px; max-height: 350px; overflow-y: auto;">
        <pre id="resPayloadText" style="margin: 0; color: #38bdf8;">// Response body will render here with full syntax styling...</pre>
        <button class="btn-copy" onclick="copyCode(document.getElementById('resPayloadText').innerText)">Copy</button>
      </div>
    </div>
  </div>

  <!-- Tab: Load & Stress Testing -->
  <div id="tab-load" class="tab-content card">
    <h3 style="margin-bottom: 0.75rem; color: #fb7185;">⚡ Local Load & Stress Testing Engine</h3>
    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">Simulate concurrent Virtual Users (VUs) and benchmark throughput (RPS), p95/p99 latency, and error rates locally.</p>

    <div class="postman-bar">
      <select id="loadMethod" class="method-select">
        <option value="GET">GET</option>
        <option value="POST">POST</option>
      </select>
      <input type="text" id="loadUrl" class="url-input" value="http://localhost:3000/api/users" placeholder="http://localhost:3000/api/users">
      <input type="number" id="loadVus" class="select-box" style="width: 100px;" value="15" min="1" max="200" title="Virtual Users">
      <select id="loadDuration" class="select-box">
        <option value="3">3 Seconds</option>
        <option value="5" selected>5 Seconds</option>
        <option value="10">10 Seconds</option>
      </select>
      <button class="btn-action btn-load-action" onclick="runLoadBenchmark()">
        <span>🚀 Run Load Test</span>
      </button>
    </div>

    <!-- Live Benchmark Result Box -->
    <div id="loadResultContainer" style="display: none; margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1rem;">
      <div class="grid-metrics" style="margin-bottom: 1rem;">
        <div class="card">
          <div style="color: var(--text-muted); font-size: 0.8rem;">Throughput (RPS)</div>
          <div id="metricRps" class="metric metric-primary">0</div>
        </div>
        <div class="card">
          <div style="color: var(--text-muted); font-size: 0.8rem;">p95 Latency</div>
          <div id="metricP95" class="metric metric-success">0 ms</div>
        </div>
        <div class="card">
          <div style="color: var(--text-muted); font-size: 0.8rem;">Error Rate</div>
          <div id="metricErrRate" class="metric metric-danger">0%</div>
        </div>
        <div class="card">
          <div style="color: var(--text-muted); font-size: 0.8rem;">Total Requests</div>
          <div id="metricTotalReqs" class="metric" style="color: #fb7185;">0</div>
        </div>
      </div>
      <div class="code-block" style="max-height: 250px; overflow-y: auto;">
        <pre id="loadReportJson" style="margin: 0; color: #7dd3fc;"></pre>
      </div>
    </div>
  </div>

  <!-- Tab: AI Mock Data Factory -->
  <div id="tab-mockdata" class="tab-content card">
    <h3 style="margin-bottom: 0.75rem; color: var(--primary);">🧪 AI & Schema-Driven Mock Data Factory</h3>
    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">Generate realistic contextual test fixtures (users, orders, products, addresses, payments, and Arabic locales) instantly.</p>

    <div class="postman-bar">
      <select id="mockPreset" class="select-box">
        <option value="user">User Profile (English)</option>
        <option value="arabic_user">User Profile (Arabic / Saudi Locale)</option>
        <option value="order">E-Commerce Order</option>
        <option value="product">Product Catalog Item</option>
        <option value="address">Postal Address</option>
        <option value="payment">Credit Card Payment</option>
        <option value="auth">JWT Auth Token Payload</option>
      </select>
      <input type="number" id="mockCount" class="select-box" style="width: 100px;" value="3" min="1" max="100" title="Count">
      <button class="btn-action btn-primary-action" onclick="generateMockData()">
        <span>✨ Generate Data</span>
      </button>
    </div>

    <div class="code-block" style="min-height: 200px; max-height: 400px; overflow-y: auto; margin-top: 1rem;">
      <pre id="mockDataResult" style="margin: 0; color: #38bdf8;">// Click "Generate Data" to preview generated test fixtures...</pre>
      <button class="btn-copy" onclick="copyCode(document.getElementById('mockDataResult').innerText)">Copy JSON</button>
    </div>
  </div>

  <!-- Tab: OWASP Security Audit -->
  <div id="tab-owasp" class="tab-content card">
    <h3 style="margin-bottom: 0.75rem; color: #fbbf24;">🛡️ OWASP Top 10 Security & Headers Audit Hub</h3>
    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">Deep local penetration audit: Content-Security-Policy (CSP), Clickjacking (X-Frame-Options), MIME Sniffing, HSTS, CORS wildcard, and Server fingerprint leaks.</p>

    <div class="postman-bar">
      <input type="text" id="owaspTargetUrl" class="url-input" value="http://localhost:3000" placeholder="http://localhost:3000">
      <button class="btn-action" style="background: rgba(251,191,36,0.2); border-color: #fbbf24; color: #fbbf24; font-weight: 800;" onclick="runOwaspScan()">
        <span>🛡️ Run OWASP Audit</span>
      </button>
    </div>

    <div id="owaspResultContainer" style="margin-top: 1.5rem; display: none;">
      <div class="grid-metrics">
        <div class="card">
          <div style="color: var(--text-muted); font-size: 0.8rem;">OWASP Rating Grade</div>
          <div id="owaspGrade" class="metric metric-success">A+</div>
        </div>
        <div class="card">
          <div style="color: var(--text-muted); font-size: 0.8rem;">Security Score</div>
          <div id="owaspScore" class="metric metric-primary">100/100</div>
        </div>
        <div class="card">
          <div style="color: var(--text-muted); font-size: 0.8rem;">Passed Checks</div>
          <div id="owaspPassedRatio" class="metric metric-success">7 / 7</div>
        </div>
      </div>
      <table id="owaspTable" style="margin-top: 1rem;">
        <thead>
          <tr>
            <th>Status</th>
            <th>Category</th>
            <th>Rule Title</th>
            <th>Evidence / Remediation</th>
          </tr>
        </thead>
        <tbody id="owaspTableBody"></tbody>
      </table>
    </div>
  </div>

  <!-- Tab 1: Requirements Heatmap -->
  <div id="tab-heatmap" class="tab-content active card">
    <h3 style="margin-bottom: 0.75rem;">PRD Requirements Coverage Heatmap</h3>
    <table>
      <thead>
        <tr>
          <th>Requirement ID</th>
          <th>Requirement Title</th>
          <th>Priority</th>
          <th>Coverage Level</th>
          <th>Pass Rate</th>
          <th>Associated Tests</th>
        </tr>
      </thead>
      <tbody>
        ${heatmap.items.map(item => `
          <tr>
            <td><code style="color: var(--primary); font-weight: 700;">${item.id}</code></td>
            <td><strong>${item.title}</strong></td>
            <td><span class="tag tag-${item.priority}">${item.priority.toUpperCase()}</span></td>
            <td><span class="tag tag-${item.coverageLevel.toLowerCase()}">${item.coverageLevel}</span></td>
            <td><strong>${item.passRate}%</strong></td>
            <td>${item.associatedTestsCount} test(s)</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- Tab 2: Test Runs -->
  <div id="tab-runs" class="tab-content card">
    <h3 style="margin-bottom: 0.75rem;">Historical Test Suite Executions</h3>
    <table>
      <thead>
        <tr>
          <th>Run ID</th>
          <th>Timestamp</th>
          <th>Status</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        ${runs.slice(-15).reverse().map(run => `
          <tr>
            <td><code>${run.runId}</code></td>
            <td>${new Date(run.timestamp).toLocaleTimeString()}</td>
            <td><strong style="color: ${run.status === 'passed' ? 'var(--success)' : 'var(--danger)'}">${run.status.toUpperCase()}</strong></td>
            <td>${run.summary.passed}</td>
            <td>${run.summary.failed}</td>
            <td>${run.durationMs}ms</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- Tab 3: Security & CVEs -->
  <div id="tab-sec" class="tab-content card">
    <h3 style="margin-bottom: 0.75rem;">Security Vulnerability & Secrets Audit (${secAudit.totalVulnerabilities} items)</h3>
    <table>
      <thead>
        <tr>
          <th>Severity</th>
          <th>Package / Source</th>
          <th>Issue Title</th>
          <th>Actionable Recommendation</th>
        </tr>
      </thead>
      <tbody>
        ${secAudit.vulnerabilities.length === 0 ? '<tr><td colspan="4" style="color: var(--success); text-align: center; padding: 1.5rem;">✔ No known CVE vulnerabilities or hardcoded secrets detected!</td></tr>' : ''}
        ${secAudit.vulnerabilities.map(v => `
          <tr>
            <td><span class="tag tag-${v.severity === 'critical' ? 'critical' : v.severity === 'high' ? 'high' : 'medium'}">${v.severity.toUpperCase()}</span></td>
            <td><strong>${v.packageName}</strong> (${v.installedVersion})</td>
            <td>${v.title}</td>
            <td><code style="color: var(--success);">${v.recommendation}</code></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- Tab 4: Performance Profiling -->
  <div id="tab-perf" class="tab-content card">
    <h3 style="margin-bottom: 0.75rem;">Core Web Vitals & Route Performance Metrics</h3>
    <table>
      <thead>
        <tr>
          <th>Route Path</th>
          <th>Rating</th>
          <th>LCP (ms)</th>
          <th>FID (ms)</th>
          <th>CLS</th>
          <th>TTFB (ms)</th>
          <th>Bundle (KB)</th>
        </tr>
      </thead>
      <tbody>
        ${perfAudit.metrics.map(m => `
          <tr>
            <td><code>${m.routePath}</code></td>
            <td><span class="tag tag-${m.rating === 'GOOD' ? 'full' : 'high'}">${m.rating}</span></td>
            <td>${m.estimatedLcpMs}ms</td>
            <td>${m.estimatedFidMs}ms</td>
            <td>${m.estimatedClsScore}</td>
            <td>${m.ttfbMs}ms</td>
            <td>${m.bundleSizeKb}KB</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- Tab 5: APIs & MSW -->
  <div id="tab-apis" class="tab-content card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
      <h3>Discovered API Endpoints & MSW Mock Handlers</h3>
      <button class="btn-action btn-postman-action" onclick="triggerAction('export-postman')">Export Postman v2.1</button>
    </div>
    <table>
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Auth Required</th>
          <th>Source File</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${(profile?.apiEndpoints || []).map((ep: any) => `
          <tr>
            <td><strong style="color: var(--primary);">${ep.method}</strong></td>
            <td><code>${ep.path}</code></td>
            <td>${ep.authRequired ? '🔒 Yes' : '🌐 Public'}</td>
            <td><small>${ep.sourceFile || 'source'}</small></td>
            <td><button class="btn-action" style="padding: 2px 8px; font-size: 0.75rem;" onclick="loadApiIntoClient('${ep.method}', '${ep.path}'); switchTab('client');">Test in Client 🚀</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- Tab 6: Flaky Quarantine -->
  <div id="tab-quarantine" class="tab-content card">
    <h3 style="margin-bottom: 0.75rem;">Flaky Test Quarantine Manager</h3>
    <table>
      <thead>
        <tr>
          <th>Test Title</th>
          <th>Test File</th>
          <th>Flakiness Rate</th>
          <th>Reason</th>
        </tr>
      </thead>
      <tbody>
        ${quarantined.length === 0 ? '<tr><td colspan="4" style="color: var(--success); text-align: center; padding: 1.5rem;">✔ No quarantined flaky tests. All tests meet stability standards!</td></tr>' : ''}
        ${quarantined.map(q => `
          <tr>
            <td><strong>${q.testTitle}</strong></td>
            <td><code>${q.testFile}</code></td>
            <td><span class="tag tag-high">${Math.round(q.flakinessRate * 100)}%</span></td>
            <td>${q.reason}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- Tab 7: Interactive Guide & Documentation -->
  <div id="tab-guide" class="tab-content card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h3>📘 QAForge Complete Interactive User & Agent Guide</h3>
      <span class="badge badge-accent">Interactive Docs</span>
    </div>

    <input type="text" id="guideSearchInput" class="search-guide-box" placeholder="🔍 Search guide by keyword (e.g. load-test, owasp, mock-data, postman, mcp, eslint, malware, parity, bisect, chaos)..." onkeyup="filterGuide()">

    <!-- Section 1: Load & Stress Testing -->
    <div class="guide-section guide-item">
      <div class="guide-title">⚡ 1. Local Load & Stress Testing Engine</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Benchmark API throughput (RPS), p95 latency, and resilience under concurrent virtual users (VUs).</p>
      <div class="code-block">npx qaforge load-test http://localhost:3000/api/users --vus 20 --duration 5<button class="btn-copy" onclick="copyCode('npx qaforge load-test http://localhost:3000/api/users --vus 20 --duration 5')">Copy</button></div>
    </div>

    <!-- Section 2: Mock Data Factory -->
    <div class="guide-section guide-item">
      <div class="guide-title">🧪 2. AI & Schema Mock Data Generator</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Generate realistic fixtures (users, orders, addresses, payments, and Arabic locales) instantly.</p>
      <div class="code-block">npx qaforge mock-data --preset arabic_user --count 5<button class="btn-copy" onclick="copyCode('npx qaforge mock-data --preset arabic_user --count 5')">Copy</button></div>
    </div>

    <!-- Section 3: OWASP Audit -->
    <div class="guide-section guide-item">
      <div class="guide-title">🛡️ 3. OWASP Top 10 Security & Penetration Audit</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Audit endpoints for missing security headers, CORS flaws, MIME sniffing, and stack trace leaks.</p>
      <div class="code-block">npx qaforge owasp-scan http://localhost:3000<button class="btn-copy" onclick="copyCode('npx qaforge owasp-scan http://localhost:3000')">Copy</button></div>
    </div>

    <!-- Section 4: Postman Collection -->
    <div class="guide-section guide-item">
      <div class="guide-title">🚀 4. Postman Collection Testing & Runner</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Execute and export standard Postman Collections (v2.1 / v2.0) with zero cloud dependencies.</p>
      <div class="code-block">npx qaforge run-collection ./tests/postman_collection.json -e ./env.json<button class="btn-copy" onclick="copyCode('npx qaforge run-collection ./tests/postman_collection.json -e ./env.json')">Copy</button></div>
    </div>

    <!-- Section 5: Malware & Threat Scanner -->
    <div class="guide-section guide-item">
      <div class="guide-title">🛡️ 5. Malware, Backdoors & Malicious Code Scanner</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Deep scan for obfuscated Base64 eval() backdoors, suspicious lifecycle scripts, and auto-fix/neutralize with --fix.</p>
      <div class="code-block">npx qaforge scan-malware --fix<button class="btn-copy" onclick="copyCode('npx qaforge scan-malware --fix')">Copy</button></div>
    </div>

    <!-- Section 6: UI Feature Parity & Ghost Feature Auditor -->
    <div class="guide-section guide-item">
      <div class="guide-title">🔍 6. UI-to-Backend Feature Parity & Ghost Feature Auditor</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Audits interactive UI elements across React/Vue/Tauri and verifies matching backend commands, enums, and API handlers.</p>
      <div class="code-block">npx qaforge feature-parity<button class="btn-copy" onclick="copyCode('npx qaforge feature-parity')">Copy</button></div>
    </div>

    <!-- Section 7: Autonomous Chaos Monkey -->
    <div class="guide-section guide-item">
      <div class="guide-title">🐒 7. Autonomous Chaos & Edge-Case Monkey Engine</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Injects malformed JSON, prototype pollution, memory floods, and type confusion to calculate server crash resilience.</p>
      <div class="code-block">npx qaforge chaos http://localhost:3000/api<button class="btn-copy" onclick="copyCode('npx qaforge chaos http://localhost:3000/api')">Copy</button></div>
    </div>

    <!-- Section 8: AI & LLM Hallucination Evaluator -->
    <div class="guide-section guide-item">
      <div class="guide-title">🧠 8. AI & LLM Output Hallucination Evaluator</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Evaluates model outputs against factual context documents and verifies JSON schema compliance.</p>
      <div class="code-block">npx qaforge ai-eval http://localhost:3000/api/ai<button class="btn-copy" onclick="copyCode('npx qaforge ai-eval http://localhost:3000/api/ai')">Copy</button></div>
    </div>

    <!-- Section 9: Git Bisect Hunter -->
    <div class="guide-section guide-item">
      <div class="guide-title">🔍 9. Autonomous Git Bisect Regression Hunter</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Traverses Git commit history to pinpoint the exact author and commit introducing a test failure.</p>
      <div class="code-block">npx qaforge bisect<button class="btn-copy" onclick="copyCode('npx qaforge bisect')">Copy</button></div>
    </div>

    <!-- Section 10: Smart Contract Security -->
    <div class="guide-section guide-item">
      <div class="guide-title">⛓️ 10. Web3 & Solidity Smart Contract Auditor</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Audits .sol smart contracts for reentrancy, unprotected selfdestruct, and tx.origin exploits.</p>
      <div class="code-block">npx qaforge audit-contracts<button class="btn-copy" onclick="copyCode('npx qaforge audit-contracts')">Copy</button></div>
    </div>

    <!-- Section 11: Dead Asset Purge -->
    <div class="guide-section guide-item">
      <div class="guide-title">🧹 11. Dead Assets & Unused Code Purge</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Scans for unreferenced images, fonts, and dead CSS rules, with safe one-click disk space reclamation.</p>
      <div class="code-block">npx qaforge dead-assets --purge<button class="btn-copy" onclick="copyCode('npx qaforge dead-assets --purge')">Copy</button></div>
    </div>

    <!-- Section 12: Screen Reader Simulator -->
    <div class="guide-section guide-item">
      <div class="guide-title">🎙️ 12. Screen Reader & Audio Flow Simulator</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Simulate NVDA / VoiceOver reading order, catch unlabelled buttons and broken heading hierarchies.</p>
      <div class="code-block">npx qaforge screen-reader<button class="btn-copy" onclick="copyCode('npx qaforge screen-reader')">Copy</button></div>
    </div>

    <!-- Section 13: SQL N+1 & DB Query Auditor -->
    <div class="guide-section guide-item">
      <div class="guide-title">🗄️ 13. SQL N+1 & Database Query Performance Auditor</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Detects database queries inside loops, unindexed queries, and raw string concatenations.</p>
      <div class="code-block">npx qaforge db-audit<button class="btn-copy" onclick="copyCode('npx qaforge db-audit')">Copy</button></div>
    </div>

    <!-- Section 14: Environment Config Drift -->
    <div class="guide-section guide-item">
      <div class="guide-title">⚖️ 14. Multi-Env Config & Secret Drift Auditor</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Audits .env against .env.example, discovers undeclared environment variables in code, and flags leaked secrets.</p>
      <div class="code-block">npx qaforge env-drift --generate-example<button class="btn-copy" onclick="copyCode('npx qaforge env-drift --generate-example')">Copy</button></div>
    </div>

    <!-- Section 15: Failure Replay Recorder -->
    <div class="guide-section guide-item">
      <div class="guide-title">🎬 15. Test Failure Visual Replay Package</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Synthesizes an interactive SVG/HTML step-by-step visual timeline animation of broken tests.</p>
      <div class="code-block">npx qaforge replay -t "Login Test" -m "Timeout 5000ms"<button class="btn-copy" onclick="copyCode('npx qaforge replay -t &quot;Login Test&quot; -m &quot;Timeout 5000ms&quot;')">Copy</button></div>
    </div>

    <!-- Section 16: Rate Limit & DoS Profiler -->
    <div class="guide-section guide-item">
      <div class="guide-title">⏱️ 16. API Rate-Limiting & DoS Threshold Profiler</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Audit API endpoints under burst conditions to verify 429 throttling and server resilience.</p>
      <div class="code-block">npx qaforge rate-limit http://localhost:3000/api -n 30 -c 10<button class="btn-copy" onclick="copyCode('npx qaforge rate-limit http://localhost:3000/api -n 30 -c 10')">Copy</button></div>
    </div>

    <!-- Section 17: Stateful Dynamic Mock Server -->
    <div class="guide-section guide-item">
      <div class="guide-title">🔄 17. Stateful Dynamic Mock Server</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Runs an in-memory zero-cloud stateful RESTful CRUD mock server with automatic collection creation.</p>
      <div class="code-block">npx qaforge mock-server --port 4040<button class="btn-copy" onclick="copyCode('npx qaforge mock-server --port 4040')">Copy</button></div>
    </div>

    <!-- Section 18: Architecture Graph -->
    <div class="guide-section guide-item">
      <div class="guide-title">🗺️ 18. Microservices & Architecture Dependency Graph</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Generates topology graph connecting UI, backend APIs, databases, caches, and third-party cloud SDKs.</p>
      <div class="code-block">npx qaforge arch-graph<button class="btn-copy" onclick="copyCode('npx qaforge arch-graph')">Copy</button></div>
    </div>

    <!-- Section 19: Security Testing Engine -->
    <div class="guide-section guide-item">
      <div class="guide-title">🛡️ 19. Autonomous Security Testing Engine</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Discovers attack surfaces, plans non-destructive security tests (Auth, AuthZ, Injections, Forms, Sessions), and generates severity scores with automatic secret redaction.</p>
      <div class="code-block">npx qaforge security --safe<button class="btn-copy" onclick="copyCode('npx qaforge security --safe')">Copy</button></div>
    </div>

    <!-- Section 20: Subresource Integrity, CSRF & CORS Validator -->
    <div class="guide-section guide-item">
      <div class="guide-title">🔒 20. Subresource Integrity (SRI), CSRF & CORS Validator</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Audits external CDN script assets for missing SRI integrity hashes, checks mutating forms for CSRF tokens, and flags wildcard CORS headers.</p>
      <div class="code-block">npx qaforge web-sec<button class="btn-copy" onclick="copyCode('npx qaforge web-sec')">Copy</button></div>
    </div>

    <!-- Section 21: Test Deduplication Engine -->
    <div class="guide-section guide-item">
      <div class="guide-title">⚡ 21. Test Suite Deduplication & Redundancy Engine</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">AST static analysis identifies duplicate test assertions and high-redundancy test cases across test files.</p>
      <div class="code-block">npx qaforge dedup<button class="btn-copy" onclick="copyCode('npx qaforge dedup')">Copy</button></div>
    </div>

    <!-- Section 22: Git Pre-Commit Hook -->
    <div class="guide-section guide-item">
      <div class="guide-title">🪝 22. Automated Git Pre-Commit Hook</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Installs an automated Git pre-commit hook to verify change impact and run affected tests before every commit.</p>
      <div class="code-block">npx qaforge hook install<button class="btn-copy" onclick="copyCode('npx qaforge hook install')">Copy</button></div>
    </div>

    <!-- Section 23: SARIF Security Report Export -->
    <div class="guide-section guide-item">
      <div class="guide-title">📄 23. SARIF v2.1.0 Security Report Export</div>
      <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Exports security vulnerability findings in OASIS SARIF v2.1.0 format for seamless GitHub Code Scanning integration.</p>
      <div class="code-block">npx qaforge security --sarif security-report.sarif<button class="btn-copy" onclick="copyCode('npx qaforge security --sarif security-report.sarif')">Copy</button></div>
    </div>
  </div>

  <!-- Tab: About QAForge -->
  <div id="tab-about" class="tab-content card">
    <div style="display: flex; align-items: center; gap: 1.25rem; margin-bottom: 1.5rem; padding: 1.25rem; background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border); border-radius: 1rem;">
      <div class="logo-icon" style="width: 64px; height: 64px; min-width: 64px; border-radius: 16px; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(56, 189, 248, 0.4); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(56, 189, 248, 0.4);">
        <svg viewBox="24 33 100 102" style="width: 44px; height: 44px; display: block;" xmlns="http://www.w3.org/2000/svg">
          <path fill="#38bdf8" d="M105.16,99.75c0-1.58,0-2.8,0-4.01c0-7.64-0.02-15.29,0.02-22.93c0.01-1.32-0.39-2.14-1.58-2.79c-9.36-5.15-18.69-10.34-28-15.58c-1.16-0.65-2.05-0.65-3.19,0.01c-9.17,5.23-18.36,10.41-27.56,15.56c-1.09,0.61-1.56,1.34-1.55,2.61c0.06,10.1,0.07,20.21,0.04,30.31c0,1.19,0.38,1.86,1.43,2.45c7.11,4.01,14.19,8.07,21.24,12.16c0.64,0.37,1.44,1.11,1.51,1.75c0.71,6.62,1.28,13.25,1.93,20.3c-3.61-2.09-6.89-3.99-10.16-5.88c-10.42-6.04-20.82-12.1-31.27-18.08c-1.4-0.8-1.98-1.69-1.97-3.35c0.06-16.39,0.06-32.78,0.01-49.16c0-1.52,0.58-2.35,1.84-3.06c14.95-8.54,29.89-17.1,44.81-25.7c1.09-0.63,1.86-0.4,2.83,0.15c15.08,8.58,30.16,17.15,45.27,25.68c1.17,0.66,1.59,1.46,1.58,2.79c-0.05,8.16,0.01,16.32-0.07,24.48c-0.01,0.82-0.44,1.98-1.07,2.39c-4.83,3.14-9.75,6.13-14.65,9.16C106.28,99.21,105.93,99.36,105.16,99.75z"/>
          <path fill="#20BF55" d="M122.1,97.08c0,5.88,0.03,11.31-0.05,16.74c-0.01,0.54-0.64,1.24-1.17,1.58c-9.59,6.14-19.22,12.22-28.82,18.36c-0.89,0.57-1.53,0.61-2.43,0.03c-4.74-3.04-9.54-5.98-14.29-9.01c-0.49-0.31-1.07-0.87-1.15-1.38c-0.97-6.65-1.86-13.31-2.84-20.51c1.73,1.08,3.07,1.87,4.37,2.73c4.54,2.99,9.08,5.98,13.58,9.04c1.17,0.8,2.05,0.82,3.29,0.06c8.89-5.43,17.84-10.77,26.77-16.14C120.13,98.13,120.92,97.73,122.1,97.08z"/>
        </svg>
      </div>
      <div>
        <h2 style="font-size: 1.6rem; font-weight: 800; color: #f8fafc; margin: 0 0 0.25rem 0;">QAForge — Build. Test. Trust.</h2>
        <div style="color: var(--primary); font-size: 0.9rem; font-weight: 700;">Package: @engnadia/qaforge (v1.0.0) | CLI: qaforge</div>
      </div>
    </div>

    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border); border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.5rem; line-height: 1.8;">
      <h4 style="color: #38bdf8; margin-bottom: 0.5rem;">⚒️ What does QAForge mean?</h4>
      <p style="color: var(--text); font-size: 0.9rem; margin-bottom: 0.5rem;">
        <strong>QAForge</strong> stands for <strong>Quality Assurance Forge</strong>.
      </p>
      <ul style="color: var(--text-muted); font-size: 0.85rem; padding-left: 1.25rem; margin-bottom: 0.5rem;">
        <li><strong>QA</strong> — Quality Assurance: comprehensive testing, security audits, resilience verification, and release confidence.</li>
        <li><strong>Forge</strong> — A dedicated workshop where resilient, high-grade software is shaped and fortified.</li>
      </ul>
      <p style="color: var(--text-muted); font-size: 0.85rem;">
        Together, <strong>QAForge</strong> represents a local engineering workspace where software quality is continuously inspected, tested, strengthened, and forged before release.
      </p>
    </div>

    <div class="guide-grid" style="margin-bottom: 1.5rem;">
      <div class="guide-card">
        <h4 style="color: #34d399;">🔒 Local-First Architecture</h4>
        <p style="color: var(--text-muted); font-size: 0.85rem;">Core AST analysis, test synthesis, and execution run locally on your host machine without forced telemetry or third-party cloud lock-in.</p>
      </div>

      <div class="guide-card">
        <h4 style="color: #38bdf8;">🤖 Agent-Native Protocol (MCP)</h4>
        <p style="color: var(--text-muted); font-size: 0.85rem;">Exposes 71 structured Model Context Protocol (MCP) tools over stdio for Cursor, Windsurf, Claude Code, Cline, and AI coding agents.</p>
      </div>

      <div class="guide-card">
        <h4 style="color: #f87171;">🛡️ Security & Quality Armor</h4>
        <p style="color: var(--text-muted); font-size: 0.85rem;">Integrated OWASP Top 10 web scans, dependency CVE checks, malware backdoor detection, SRI/CSRF verification, and SARIF export.</p>
      </div>

      <div class="guide-card">
        <h4 style="color: #fbbf24;">⚡ Dual Interface Ergonomics</h4>
        <p style="color: var(--text-muted); font-size: 0.85rem;">71 command-line tools (<code>qaforge &lt;cmd&gt;</code>), interactive terminal TUI, and full-featured local web dashboard command center.</p>
      </div>
    </div>

    <div style="background: rgba(0, 0, 0, 0.3); padding: 1rem; border-radius: 0.5rem; border: 1px solid var(--border); font-size: 0.85rem; color: var(--text-muted); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
      <span>Package: <code>@engnadia/qaforge</code></span>
      <span>Binary: <code>qaforge</code></span>
      <span>Licensed under <strong>MIT License</strong></span>
      <span>Node.js >= 18.0.0</span>
    </div>
  </div>

  <!-- Tab 8: Executive Report -->
  <div id="tab-report" class="tab-content card">
    <h3 style="margin-bottom: 0.75rem;">Executive Release Readiness & QA Audit</h3>
    <div style="background: rgba(0,0,0,0.25); padding: 1.25rem; border-radius: 0.75rem; border: 1px solid var(--border); line-height: 1.8;">
      <p><strong>Project Name:</strong> ${profile?.projectName || 'ActiveProject'}</p>
      <p><strong>Overall Requirements Coverage:</strong> ${heatmap.overallCoverageScore}% (${heatmap.fullCount} Full, ${heatmap.partialCount} Partial, ${heatmap.uncoveredCount} Gaps)</p>
      <p><strong>Security Health Score:</strong> ${secAudit.score}/100 (${secAudit.totalVulnerabilities} vulnerabilities flagged)</p>
      <p><strong>Performance Rating:</strong> ${perfAudit.overallScore}/100 (${perfAudit.rating})</p>
      <p><strong>Framework Detection:</strong> ${profile?.frameworks?.join(', ') || 'Node.js'} (Test Runner: ${profile?.testFrameworks?.join(', ') || 'Vitest'})</p>
      <p><strong>Engine Architecture:</strong> Local-First Autonomous QA Engine (Core Analysis Local, No Telemetry)</p>
    </div>
  </div>

  <script>
    function switchTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tab));
      if (activeBtn) activeBtn.classList.add('active');
      const activeContent = document.getElementById('tab-' + tab);
      if (activeContent) activeContent.classList.add('active');
    }

    function loadApiIntoClient(method, path) {
      document.getElementById('reqMethod').value = method.toUpperCase();
      document.getElementById('reqUrl').value = 'http://localhost:3000' + (path.startsWith('/') ? path : '/' + path);
      logConsole('Loaded ' + method + ' ' + path + ' into Postman API Client.');
    }

    async function sendPostmanRequest() {
      const method = document.getElementById('reqMethod').value;
      const url = document.getElementById('reqUrl').value;
      let headers = {};
      let body = undefined;

      try {
        const hText = document.getElementById('reqHeaders').value.trim();
        if (hText) headers = JSON.parse(hText);
      } catch {
        alert('Invalid JSON in Request Headers.');
        return;
      }

      const bText = document.getElementById('reqBody').value.trim();
      if (bText && method !== 'GET' && method !== 'HEAD') {
        try {
          body = JSON.parse(bText);
        } catch {
          body = bText;
        }
      }

      logConsole('🚀 Sending [' + method + '] ' + url + '...');

      try {
        const res = await fetch('/api/http-client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method, url, headers, body })
        });
        const data = await res.json();

        // Update stats
        const badge = document.getElementById('resStatusBadge');
        badge.innerText = data.status + ' ' + (data.statusText || '');
        if (data.status >= 200 && data.status < 400) {
          badge.style.background = 'rgba(52, 211, 153, 0.2)';
          badge.style.color = '#34d399';
        } else {
          badge.style.background = 'rgba(248, 113, 113, 0.2)';
          badge.style.color = '#f87171';
        }

        document.getElementById('resDuration').innerText = data.durationMs + ' ms';
        document.getElementById('resSize').innerText = (data.sizeBytes || 0) + ' B';

        document.getElementById('resPayloadText').innerText = typeof data.body === 'object' && data.body !== null
          ? JSON.stringify(data.body, null, 2)
          : (data.rawText || 'Empty response');

        logConsole('✔ Received ' + data.status + ' ' + (data.statusText || '') + ' (' + data.durationMs + 'ms)');
      } catch (err) {
        logConsole('✖ Request Failed: ' + err.message);
        document.getElementById('resPayloadText').innerText = 'Request error: ' + err.message;
      }
    }

    async function runLoadBenchmark() {
      const method = document.getElementById('loadMethod').value;
      const url = document.getElementById('loadUrl').value;
      const vus = parseInt(document.getElementById('loadVus').value, 10) || 10;
      const durationSec = parseInt(document.getElementById('loadDuration').value, 10) || 5;

      logConsole('⚡ Benchmarking ' + url + ' with ' + vus + ' VUs for ' + durationSec + 's...');

      try {
        const res = await fetch('/api/load-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method, url, vus, durationSec })
        });
        const data = await res.json();

        document.getElementById('loadResultContainer').style.display = 'block';
        document.getElementById('metricRps').innerText = data.requestsPerSecond + ' req/s';
        document.getElementById('metricP95').innerText = data.latency.p95 + ' ms';
        document.getElementById('metricErrRate').innerText = data.errorRatePercent + '%';
        document.getElementById('metricTotalReqs').innerText = data.totalRequests;
        document.getElementById('loadReportJson').innerText = JSON.stringify(data, null, 2);

        logConsole('✔ Load test completed: ' + data.summary);
      } catch (err) {
        logConsole('✖ Load test failed: ' + err.message);
      }
    }

    async function generateMockData() {
      const preset = document.getElementById('mockPreset').value;
      const count = document.getElementById('mockCount').value;

      logConsole('🧪 Generating ' + count + ' records for preset "' + preset + '"...');

      try {
        const res = await fetch('/api/mock-data?preset=' + preset + '&count=' + count);
        const data = await res.json();
        document.getElementById('mockDataResult').innerText = JSON.stringify(data, null, 2);
        logConsole('✔ Generated ' + count + ' mock records.');
      } catch (err) {
        logConsole('✖ Mock generation failed: ' + err.message);
      }
    }

    async function runOwaspScan() {
      const targetUrl = document.getElementById('owaspTargetUrl').value;
      logConsole('🛡️ Running OWASP Top 10 security audit on ' + targetUrl + '...');

      try {
        const res = await fetch('/api/owasp-scan?url=' + encodeURIComponent(targetUrl));
        const data = await res.json();

        document.getElementById('owaspResultContainer').style.display = 'block';
        document.getElementById('owaspGrade').innerText = data.grade;
        document.getElementById('owaspScore').innerText = data.overallScore + '/100';
        document.getElementById('owaspPassedRatio').innerText = data.passedChecks + ' / ' + data.totalChecks;

        const tbody = document.getElementById('owaspTableBody');
        tbody.innerHTML = data.probes.map(p => \`
          <tr>
            <td><span class="tag \${p.passed ? 'tag-full' : 'tag-critical'}">\${p.passed ? 'PASSED' : 'FAILED'}</span></td>
            <td><strong>\${p.category}</strong></td>
            <td>\${p.title}</td>
            <td><small>\${p.evidence || p.remediation}</small></td>
          </tr>
        \`).join('');

        logConsole('✔ OWASP Audit Completed: Grade ' + data.grade + ' (' + data.overallScore + '/100)');
      } catch (err) {
        logConsole('✖ OWASP scan failed: ' + err.message);
      }
    }

    async function generateRemoteProbeCode() {
      const type = document.getElementById('probeTypeSelect').value;
      logConsole('🛠️ Generating companion probe snippet for "' + type + '"...');
      try {
        const res = await fetch('/api/remote/probe-init?type=' + type);
        const data = await res.json();
        document.getElementById('probeCodeDisplay').innerText = '// File: ' + data.filename + '\\n// Instructions: ' + data.instructions + '\\n\\n' + data.code;
        logConsole('✔ Probe snippet generated for ' + data.filename);
      } catch (err) {
        logConsole('✖ Probe generation failed: ' + err.message);
      }
    }

    async function connectRemoteLive() {
      const remoteUrl = document.getElementById('remoteTargetUrl').value;
      const bridgeSecret = document.getElementById('remoteBridgeSecret').value;
      logConsole('🔗 Establishing handshake with ' + remoteUrl + '...');

      try {
        const res = await fetch('/api/remote/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ remoteUrl, bridgeSecret })
        });
        const data = await res.json();

        document.getElementById('remoteResultContainer').style.display = 'block';
        const linkBadge = document.getElementById('remoteLinkStatus');
        linkBadge.innerText = data.connected ? 'LINK ACTIVE' : 'UNREACHABLE';
        linkBadge.className = 'metric ' + (data.connected ? 'metric-success' : 'metric-danger');

        document.getElementById('remoteHealthScore').innerText = data.connected ? 'ACTIVE' : 'FAILED';
        document.getElementById('remoteDiscoveredCount').innerText = (data.routesDiscovered || []).length + ' Routes';
        document.getElementById('remoteReportJson').innerText = JSON.stringify(data, null, 2);

        logConsole(data.connected ? '✔ Connected: ' + data.statusMessage : '✖ ' + data.statusMessage);
      } catch (err) {
        logConsole('✖ Connection error: ' + err.message);
      }
    }

    async function auditRemoteLive() {
      const remoteUrl = document.getElementById('remoteTargetUrl').value;
      const bridgeSecret = document.getElementById('remoteBridgeSecret').value;
      logConsole('🔍 Running full remote audit on ' + remoteUrl + '...');

      try {
        const res = await fetch('/api/remote/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ remoteUrl, bridgeSecret, includeLoadTest: false })
        });
        const data = await res.json();

        document.getElementById('remoteResultContainer').style.display = 'block';
        const linkBadge = document.getElementById('remoteLinkStatus');
        linkBadge.innerText = data.verdict;
        linkBadge.className = 'metric ' + (data.verdict === 'HEALTHY' ? 'metric-success' : data.verdict === 'DEGRADED' ? 'metric-primary' : 'metric-danger');

        document.getElementById('remoteHealthScore').innerText = data.overallHealthScore + '/100';
        document.getElementById('remoteDiscoveredCount').innerText = (data.discoveredLinks || []).length + ' Links';
        document.getElementById('remoteReportJson').innerText = JSON.stringify(data, null, 2);

        logConsole('✔ Remote audit completed: ' + data.summary);
      } catch (err) {
        logConsole('✖ Remote audit failed: ' + err.message);
      }
    }


    async function triggerAction(actionName) {
      logConsole('⏳ Triggered autonomous action: ' + actionName + '...');
      try {
        const res = await fetch('/api/actions/' + actionName);
        const data = await res.json();
        if (data.success) {
          logConsole('✔ Action finished with success: ' + actionName);
          if (actionName === 'export-postman') {
            alert('✔ Exported Postman Collection to: ' + data.data.savedPath);
          } else {
            setTimeout(() => window.location.reload(), 1200);
          }
        } else {
          logConsole('✖ Action ' + actionName + ' reported: ' + (data.error || 'Check details'));
        }
      } catch (err) {
        logConsole('✖ Request error: ' + err.message);
      }
    }

    function logConsole(msg) {
      const box = document.getElementById('consoleBox');
      const entry = document.createElement('div');
      entry.className = 'console-entry';
      entry.innerHTML = '<span class="console-time">[' + new Date().toLocaleTimeString() + ']</span> <span>' + msg + '</span>';
      box.appendChild(entry);
      box.scrollTop = box.scrollHeight;
    }

    function copyCode(code) {
      navigator.clipboard.writeText(code);
      logConsole('📋 Copied to clipboard: ' + code);
    }

    function filterGuide() {
      const input = document.getElementById('guideSearchInput').value.toLowerCase();
      const sections = document.querySelectorAll('.guide-item');
      sections.forEach(sec => {
        const text = sec.innerText.toLowerCase();
        sec.style.display = text.includes(input) ? 'block' : 'none';
      });
    }
  </script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.end(html);
      });

      server.listen(port, () => {
        resolve({
          url: `http://localhost:${port}`,
          close: () => server.close()
        });
      });
    });
  }
}
