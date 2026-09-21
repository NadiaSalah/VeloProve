import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { LocalStorage } from '../storage/local-store.js';
import type { VeloProveEngine } from './engine.js';
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
import { RunHistoryService } from './run-history.js';
import { renderDashboardHtml } from './dashboard-ui.js';
import {
  ensureProjectExportsDir,
  resolveProjectExportPath,
  writeExportWithProjectFallback,
  PROJECT_EXPORTS_DIR
} from './export-save.js';
import { DEFAULT_CONFIG } from '../shared/config-loader.js';
import { buildDashboardLabCatalog } from './dashboard-lab-catalog.js';
import { getPackageRoot } from '../shared/package-meta.js';

type SsePayload = Record<string, unknown>;

function resolveBrandAsset(guard: WorkspaceGuard, filename: string): string | null {
  const packageRoot = getPackageRoot();
  const candidates = [
    path.join(packageRoot, 'docs', 'assets', filename),
    path.join(guard.getRoot(), 'docs', 'assets', filename)
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function serveSvgAsset(res: http.ServerResponse, assetPath: string): void {
  const content = fs.readFileSync(assetPath, 'utf8');
  const etag = `"${Buffer.byteLength(content)}-${fs.statSync(assetPath).mtimeMs.toFixed(0)}"`;
  res.writeHead(200, {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    // Brand marks change with releases — avoid sticky browser cache of stale logos
    'Cache-Control': 'public, max-age=60, must-revalidate',
    ETag: etag
  });
  res.end(content);
}

function requestPathname(url: string): string {
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    return url.split('?')[0] || '/';
  }
}

/** Plain 404 — never return SPA HTML for missing static assets (avoids source-map JSON.parse errors). */
function sendNotFound(res: http.ServerResponse): void {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

function createSseHub() {
  const clients = new Set<http.ServerResponse>();

  const broadcast = (event: string, data: SsePayload) => {
    const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
      try {
        client.write(chunk);
      } catch {
        clients.delete(client);
      }
    }
  };

  const attach = (req: http.IncomingMessage, res: http.ServerResponse) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no'
    });
    res.write(`event: ready\ndata: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);
    clients.add(res);
    const heartbeat = setInterval(() => {
      try {
        res.write(`: ping ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeat);
        clients.delete(res);
      }
    }, 25000);
    req.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(res);
    });
  };

  return { broadcast, attach, clientCount: () => clients.size };
}

export class LocalDashboardServer {
  public static start(
    guard: WorkspaceGuard,
    storage: LocalStorage,
    port = 4173,
    engine?: VeloProveEngine
  ): Promise<{ url: string; close: () => void }> {
    return new Promise((resolve) => {
      const sse = createSseHub();
      const server = http.createServer(async (req, res) => {
        const url = req.url || '/';
        const method = req.method || 'GET';
        const pathname = requestPathname(url);

        // Helper JSON response
        const sendJson = (data: unknown, status = 200) => {
          res.writeHead(status, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(data, null, 2));
        };

        // Live SSE stream for Results pane
        if (pathname === '/api/events') {
          return sse.attach(req, res);
        }

        // Static brand assets (package docs/assets, with project-root fallback)
        // Use pathname so ?v= cache-bust query strings still match.
        if (
          pathname === '/logo.svg' ||
          pathname === '/docs/assets/veloprove-logo.svg'
        ) {
          const logoPath = resolveBrandAsset(guard, 'veloprove-logo.svg');
          if (logoPath) return serveSvgAsset(res, logoPath);
          return sendNotFound(res);
        }

        if (
          pathname === '/icon.svg' ||
          pathname === '/docs/assets/veloprove-icon.svg'
        ) {
          const iconPath = resolveBrandAsset(guard, 'veloprove-icon.svg');
          if (iconPath) return serveSvgAsset(res, iconPath);
          return sendNotFound(res);
        }

        if (pathname === '/favicon.ico') {
          const iconPath = resolveBrandAsset(guard, 'veloprove-icon.svg');
          if (iconPath) return serveSvgAsset(res, iconPath);
          return sendNotFound(res);
        }

        // Scenario recorder: generate Playwright from pasted bookmarklet JSON
        if (engine && pathname === '/api/recorder/generate' && method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', () => {
            try {
              const payload = JSON.parse(bodyStr || '{}');
              const title = String(payload.title || 'Dashboard recorded scenario');
              const result = engine.recordScenarioFromPayload({
                title,
                startUrl: String(payload.startUrl || 'http://localhost:3000'),
                steps: Array.isArray(payload.steps) ? payload.steps : [],
                outputFile: payload.outputFile
                  ? String(payload.outputFile)
                  : `tests/e2e/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.spec.ts`,
                framework: payload.framework === 'vitest' ? 'vitest' : 'playwright'
              });
              return sendJson({ success: true, data: result });
            } catch (err: any) {
              return sendJson({ success: false, error: err.message }, 500);
            }
          });
          return;
        }

        // Live HTTP Client API (Postman-like executor)
        if (pathname === '/api/http-client' && method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(bodyStr || '{}');
              const resData = await PostmanRunnerService.sendRequest(payload);
              const assertions = Array.isArray(payload.assertions) ? payload.assertions : [];
              if (assertions.length > 0) {
                (resData as any).assertionResults = assertions.map((a: any) => {
                  try {
                    if (a && typeof a.equals !== 'undefined' && a.path === 'status') {
                      return { ...a, ok: resData.status === a.equals, actual: resData.status };
                    }
                    if (a && a.path && typeof a.equals !== 'undefined') {
                      const parts = String(a.path).split('.');
                      let cur: any = resData;
                      for (const p of parts) cur = cur?.[p];
                      return { ...a, ok: cur === a.equals, actual: cur };
                    }
                    return { ...a, ok: false, error: 'unsupported assertion' };
                  } catch (err: any) {
                    return { ...a, ok: false, error: err.message };
                  }
                });
              }
              return sendJson(resData);
            } catch (err: any) {
              return sendJson({ error: err.message }, 500);
            }
          });
          return;
        }

        // Live Load Tester API
        if (pathname === '/api/load-test' && method === 'POST') {
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
        if (pathname.startsWith('/api/mock-data')) {
          const urlObj = new URL(url, 'http://localhost');
          const preset = (urlObj.searchParams.get('preset') || 'user') as any;
          const count = parseInt(urlObj.searchParams.get('count') || '5', 10);
          const locale = (urlObj.searchParams.get('locale') || 'en') as any;
          const data = MockDataFactoryService.generate({ preset, count, locale });
          return sendJson(data);
        }

        // OWASP Scan API
        if (pathname.startsWith('/api/owasp-scan')) {
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
        if (pathname.startsWith('/api/remote/probe-init')) {
          const urlObj = new URL(url, 'http://localhost');
          const type = (urlObj.searchParams.get('type') || 'standalone_js') as any;
          const name = urlObj.searchParams.get('name') || 'LiveSite';
          const snippet = RemoteBridgeService.generateProbeSnippet(type, { siteName: name });
          return sendJson(snippet);
        }

        if (pathname === '/api/remote/connect' && method === 'POST') {
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

        if (pathname === '/api/remote/audit' && method === 'POST') {
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
        if (pathname === '/api/chaos-test' && method === 'POST') {
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
        if (pathname === '/api/docker-env' && method === 'POST') {
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
        if (pathname === '/api/browser-matrix') {
          const matrix = BrowserMatrixService.generateMatrix();
          return sendJson(matrix);
        }

        // 9. BDD Gherkin Generator API
        if (pathname === '/api/bdd-generator') {
          const reqs = storage.getRequirements() || [];
          const features = BddGeneratorService.generateFromRequirements(guard, reqs);
          return sendJson(features);
        }

        // 10. Webhook Alert Dispatcher API
        if (pathname === '/api/send-alert' && method === 'POST') {
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
        if (pathname === '/api/profile') {
          return sendJson(storage.getProjectProfile() || {});
        }

        if (pathname === '/api/requirements') {
          return sendJson(storage.getRequirements() || []);
        }

        if (pathname === '/api/runs') {
          return sendJson(storage.getAllTestRuns() || []);
        }

        if (pathname === '/api/history') {
          return sendJson(
            RunHistoryService.load(guard) || RunHistoryService.rebuild(guard, storage)
          );
        }

        if (pathname === '/api/flaky') {
          return sendJson(storage.getFlakyHistory() || []);
        }

        if (pathname === '/api/security') {
          return sendJson(SecurityAuditService.audit(guard));
        }

        if (pathname === '/api/perf') {
          const profile = storage.getProjectProfile() || { routes: [], apiEndpoints: [] } as any;
          return sendJson(PerformanceProfilerService.profile(profile, guard));
        }

        if (pathname === '/api/heatmap') {
          const profile = storage.getProjectProfile() || { routes: [], apiEndpoints: [] } as any;
          const reqs = storage.getRequirements();
          const latestRun = storage.getLatestTestRun();
          return sendJson(CoverageHeatmapService.generateHeatmap(reqs, profile, latestRun));
        }

        if (pathname === '/api/malware') {
          return sendJson(MalwareScannerService.scan(guard));
        }

        if (pathname === '/api/malware/remediate' && method === 'POST') {
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
        if (engine && pathname.startsWith('/api/actions/')) {
          const action = pathname.replace('/api/actions/', '').replace(/\/$/, '');
          const startedAt = Date.now();
          sse.broadcast('log', { message: `▶ Starting ${action}` });
          sse.broadcast('action', { phase: 'start', action, ts: startedAt });

          try {
            let data: unknown;
            switch (action) {
              case 'inspect': data = await engine.inspect(); break;
              case 'plan': data = await engine.plan({ scope: 'all' }); break;
              case 'generate': data = await engine.generate({ overwritePolicy: 'generated-only' }); break;
              case 'run': {
                sse.broadcast('log', { message: 'Running full test suite…' });
                data = await engine.run({ scope: 'all' });
                break;
              }
              case 'run-changed': {
                sse.broadcast('log', { message: 'Analyzing change impact…' });
                const impact = await engine.changed();
                const paths = impact.impactedTestFiles.length > 0 ? impact.impactedTestFiles : undefined;
                data = { impact, runResult: await engine.run({ scope: 'changed', paths }) };
                break;
              }
              case 'diagnose': data = await engine.diagnose(); break;
              case 'heal': data = await engine.heal(); break;
              case 'lint': data = await engine.lint({ scope: 'all' }); break;
              case 'lint-fix': data = await engine.lint({ scope: 'all', fix: true }); break;
              case 'a11y': data = await engine.auditA11y(); break;
              case 'visual-diff': data = await engine.compareVisuals(); break;
              case 'contract-drift': data = await engine.checkContractDrift(); break;
              case 'fuzz-api': data = await engine.fuzzApi(); break;
              case 'mutation': data = await engine.evaluateMutationScore(); break;
              case 'explore': data = await engine.explore(); break;
              case 'release': data = await engine.releaseCheck(); break;
              case 'audit': data = engine.auditSecurity(); break;
              case 'perf': data = await engine.profilePerf(); break;
              case 'mock-gen': data = await engine.generateMsw(); break;
              case 'quarantine': data = engine.quarantineFlaky(); break;
              case 'coverage': data = await engine.getCoverageHeatmap(); break;
              case 'learn-framework': data = engine.learnFramework(); break;
              case 'export-postman': data = await engine.exportPostmanCollection(); break;
              case 'export-report': {
                const urlObj = new URL(req.url || '/api/actions/export-report', 'http://localhost');
                const fmt = (urlObj.searchParams.get('format') || 'html').toLowerCase();
                const format =
                  fmt === 'json' || fmt === 'markdown' || fmt === 'junit' || fmt === 'pdf' || fmt === 'allure'
                    ? fmt
                    : 'html';
                const preview =
                  urlObj.searchParams.get('preview') === '1' || urlObj.searchParams.get('preview') === 'true';
                const download =
                  urlObj.searchParams.get('download') === '1' || urlObj.searchParams.get('download') === 'true';
                const outputPath = urlObj.searchParams.get('outputPath') || undefined;
                const absolutePathRaw = urlObj.searchParams.get('absolutePath') || undefined;
                const useProjectFallback =
                  urlObj.searchParams.get('projectFallback') === '1' ||
                  urlObj.searchParams.get('projectFallback') === 'true';

                // Save: typed absolute path and/or project folder `.veloprove/exports` (no OS file dialog)
                if (absolutePathRaw || useProjectFallback) {
                  const built = engine.exportReport({ format, download: true });
                  data = writeExportWithProjectFallback(
                    guard,
                    format,
                    built,
                    absolutePathRaw || null,
                    absolutePathRaw ? undefined : 'Project exports folder'
                  );
                  break;
                }

                data = engine.exportReport({ format, preview, download, outputPath });
                if (preview && data && typeof data === 'object') {
                  const suggested =
                    (data as { suggestedName?: string }).suggestedName ||
                    (format === 'allure' ? 'allure-results' : `veloprove-report.${format}`);
                  const isDir = format === 'allure' || !!(data as { isDirectory?: boolean }).isDirectory;
                  ensureProjectExportsDir(guard);
                  const projectFallbackPath = resolveProjectExportPath(guard, format, suggested, isDir);
                  (data as { defaultSavePath?: string }).defaultSavePath = projectFallbackPath;
                  (data as { projectFallbackPath?: string }).projectFallbackPath = projectFallbackPath;
                  (data as { exportsDir?: string }).exportsDir = PROJECT_EXPORTS_DIR;
                }
                break;
              }
              case 'history': {
                data = engine.getRunHistory();
                break;
              }
              case 'auto-fix': data = await engine.autoFixBugs(false); break;
              case 'docker-env': data = engine.generateDockerEnv({ services: ['postgres', 'redis'] }); break;
              case 'browser-matrix': data = engine.generateBrowserMatrix(); break;
              case 'bdd': data = await engine.generateBddFeatures(); break;
              case 'feature-parity': data = engine.auditFeatureParity(); break;
              case 'scan-malware': data = engine.scanMalware(); break;
              case 'fix-malware': data = engine.remediateMalware(); break;
              case 'ai-eval':
                data = await engine.evaluateAiOutputs({
                  testCases: [{ id: '1', prompt: 'Summarize system', expectedKeywords: ['VeloProve'] }]
                });
                break;
              case 'bisect': {
                sse.broadcast('log', { message: 'Starting git bisect regression hunt…' });
                data = await engine.huntRegression();
                break;
              }
              case 'audit-contracts': data = engine.auditSmartContracts(); break;
              case 'dead-assets': data = engine.scanDeadAssets(); break;
              case 'screen-reader': data = engine.simulateScreenReader(); break;
              case 'db-audit': data = engine.auditDbQueries(); break;
              case 'env-drift': data = engine.auditEnvDrift(); break;
              case 'failure-replay':
                data = engine.recordFailureReplay({
                  testTitle: 'Dashboard Replay Demo',
                  testFile: 'tests/e2e/sample.spec.ts',
                  errorMessage: 'AssertionError: expected element to be visible'
                });
                break;
              case 'arch-graph': data = engine.generateArchitectureGraph(); break;
              case 'security-scan': {
                sse.broadcast('log', { message: 'Scanning security attack surface…' });
                data = await engine.scanSecuritySurface();
                break;
              }
              case 'security-run': {
                sse.broadcast('log', { message: 'Running non-destructive security suite (safe mode)…' });
                data = await engine.runSecurityTests({ safeMode: true });
                break;
              }
              case 'sri-csrf-audit': data = engine.auditSriAndCsrf(); break;
              case 'dedup-tests': data = engine.deduplicateTests(); break;
              case 'export-sarif': {
                const report = await engine.runSecurityTests({ safeMode: true });
                const audit = engine.auditSecurity();
                data = engine.exportSarif(report, audit);
                break;
              }
              case 'throttle': {
                const urlObj = new URL(req.url || '/api/actions/throttle', 'http://localhost');
                const targetUrl = urlObj.searchParams.get('url') || 'http://localhost:3000';
                const profileParam = (urlObj.searchParams.get('profile') || 'REGULAR_3G').toUpperCase();
                const profileMap: Record<string, 'GPRS_SLOW' | 'REGULAR_3G' | 'GOOD_4G' | 'OFFLINE_DROP' | 'PACKET_LOSS'> = {
                  GPRS: 'GPRS_SLOW',
                  '3G': 'REGULAR_3G',
                  '4G': 'GOOD_4G',
                  OFFLINE: 'OFFLINE_DROP',
                  GPRS_SLOW: 'GPRS_SLOW',
                  REGULAR_3G: 'REGULAR_3G',
                  GOOD_4G: 'GOOD_4G',
                  OFFLINE_DROP: 'OFFLINE_DROP',
                  PACKET_LOSS: 'PACKET_LOSS'
                };
                const profile = profileMap[profileParam] || 'REGULAR_3G';
                sse.broadcast('log', { message: `Throttling ${targetUrl} as ${profile}…` });
                data = await engine.throttleRequest({ targetUrl, profile });
                break;
              }
              case 'doctor': data = engine.doctor(); break;
              case 'teach-ai': {
                data = engine.handshake({
                  agentName: 'Dashboard',
                  forceAgentsMd: true,
                  writeMcpConfig: true,
                  preferredOutput: 'json'
                });
                break;
              }
              case 'ask-docs': {
                const urlObj = new URL(req.url || '/api/actions/ask-docs', 'http://localhost');
                const q = urlObj.searchParams.get('q') || urlObj.searchParams.get('question') || '';
                data = engine.askDocs(q);
                break;
              }
              case 'ensure-dev': {
                sse.broadcast('log', { message: 'Ensuring local DevServer is online…' });
                data = await engine.ensureDevServer({ reuseExisting: true });
                break;
              }
              case 'verify': {
                const urlObj = new URL(req.url || '/api/actions/verify', 'http://localhost');
                const sandbox = urlObj.searchParams.get('sandbox') === '1' || urlObj.searchParams.get('sandbox') === 'true';
                const dockerEnv = urlObj.searchParams.get('dockerEnv') === '1' || urlObj.searchParams.get('docker-env') === '1';
                const fullSuite = urlObj.searchParams.get('full') === '1';
                sse.broadcast('log', {
                  message: `Running autonomous verify${sandbox ? ' (sandbox)' : ''}${dockerEnv ? ' (docker-env)' : ''}${fullSuite ? ' (full)' : ''}…`
                });
                data = await engine.verify({ sandbox, dockerEnv, fullSuite });
                break;
              }
              case 'recorder-bookmarklet': {
                data = { bookmarklet: engine.getRecorderBookmarklet() };
                break;
              }
              case 'init-security-policy': {
                data = engine.initSecurityPolicy({ framework: 'baseline', mergeIntoConfig: true });
                break;
              }
              case 'twin': {
                const urlObj = new URL(req.url || '/api/actions/twin', 'http://localhost');
                const mode = (urlObj.searchParams.get('mode') || 'build').toLowerCase();
                if (mode === 'status') {
                  data = engine.twinEvidenceSummary();
                  break;
                }
                if (mode === 'update') {
                  data = await engine.twinUpdate({ withImpact: true, withDrift: true });
                  break;
                }
                data = await engine.twinBuild({ withImpact: true, withDrift: true, incremental: true });
                break;
              }
              case 'twin-status': {
                data = engine.twinEvidenceSummary();
                break;
              }
              case 'impact': {
                data = await engine.impactAnalysis();
                break;
              }
              case 'drift': {
                data = await engine.drift({});
                break;
              }
              case 'refine': {
                const urlObj = new URL(req.url || '/api/actions/refine', 'http://localhost');
                const instruction =
                  urlObj.searchParams.get('instruction') ||
                  'Strengthen assertions with clearer expects and remove brittle timing assumptions';
                const testFilePath = urlObj.searchParams.get('file') || undefined;
                data = await engine.refineTest({ instruction, testFilePath: testFilePath || undefined });
                break;
              }
              case 'run-collection': {
                const urlObj = new URL(req.url || '/api/actions/run-collection', 'http://localhost');
                const collectionPath =
                  urlObj.searchParams.get('collection') ||
                  urlObj.searchParams.get('path') ||
                  'veloprove_postman_collection.json';
                const baseURL = urlObj.searchParams.get('url') || urlObj.searchParams.get('baseURL') || undefined;
                data = await engine.runPostmanCollection(collectionPath, undefined, baseURL);
                break;
              }
              case 'request': {
                const urlObj = new URL(req.url || '/api/actions/request', 'http://localhost');
                const target = urlObj.searchParams.get('url') || 'http://localhost:3000/api';
                const method = (urlObj.searchParams.get('method') || 'GET').toUpperCase();
                data = await engine.sendHttpRequest({
                  method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS',
                  url: target
                });
                break;
              }
              case 'load-test': {
                const urlObj = new URL(req.url || '/api/actions/load-test', 'http://localhost');
                const target = urlObj.searchParams.get('url') || 'http://localhost:3000/api';
                const vus = Number(urlObj.searchParams.get('vus') || 10);
                const durationSec = Number(urlObj.searchParams.get('duration') || 3);
                data = await engine.runLoadTest({ url: target, vus, durationSec, method: 'GET' });
                break;
              }
              case 'mock-data': {
                data = engine.generateMockData({ preset: 'user', count: 5, locale: 'en' });
                break;
              }
              case 'owasp-scan': {
                const urlObj = new URL(req.url || '/api/actions/owasp-scan', 'http://localhost');
                const target = urlObj.searchParams.get('url') || 'http://localhost:3000';
                data = await engine.scanOwasp(target);
                break;
              }
              case 'graphql': {
                const urlObj = new URL(req.url || '/api/actions/graphql', 'http://localhost');
                const endpoint = urlObj.searchParams.get('url') || 'http://localhost:3000/graphql';
                data = await engine.runGraphQL({
                  endpoint,
                  query: '{ __typename }'
                });
                break;
              }
              case 'ws-test': {
                const urlObj = new URL(req.url || '/api/actions/ws-test', 'http://localhost');
                let target = urlObj.searchParams.get('url') || 'ws://localhost:3000';
                if (target.startsWith('http://')) target = 'ws://' + target.slice('http://'.length);
                if (target.startsWith('https://')) target = 'wss://' + target.slice('https://'.length);
                data = await engine.testWebSocket({ url: target });
                break;
              }
              case 'remote-init': {
                data = engine.generateRemoteProbe('standalone_js', { siteName: 'Dashboard Remote' });
                break;
              }
              case 'remote-connect': {
                const urlObj = new URL(req.url || '/api/actions/remote-connect', 'http://localhost');
                const target = urlObj.searchParams.get('url') || 'http://localhost:3000';
                data = await engine.connectRemoteSite(target);
                break;
              }
              case 'remote-audit': {
                const urlObj = new URL(req.url || '/api/actions/remote-audit', 'http://localhost');
                const target = urlObj.searchParams.get('url') || 'http://localhost:3000';
                data = await engine.auditRemoteSite(target, { includeLoadTest: false });
                break;
              }
              case 'stabilize': {
                const urlObj = new URL(req.url || '/api/actions/stabilize', 'http://localhost');
                const target = urlObj.searchParams.get('file') || 'tests';
                data = engine.stabilizeTests(target, false);
                break;
              }
              case 'db-snapshot': {
                const snaps = engine.listDbSnapshots();
                data = {
                  snapshots: snaps,
                  note: 'Dashboard lists snapshots. Create via CLI: veloprove db-snapshot <name> --files …'
                };
                break;
              }
              case 'db-restore': {
                const urlObj = new URL(req.url || '/api/actions/db-restore', 'http://localhost');
                const snapshotId = urlObj.searchParams.get('id') || '';
                const snaps = engine.listDbSnapshots();
                const id = snapshotId || snaps[0]?.id || '';
                if (!id) {
                  data = { success: false, error: 'No snapshot available. Create one with veloprove db-snapshot first.' };
                } else {
                  data = engine.restoreDbSnapshot(id);
                }
                break;
              }
              case 'chaos': {
                const urlObj = new URL(req.url || '/api/actions/chaos', 'http://localhost');
                const target = urlObj.searchParams.get('url') || 'http://localhost:3000/api';
                data = await engine.runChaosTest({ targetUrl: target, iterations: 3 });
                break;
              }
              case 'alert': {
                const urlObj = new URL(req.url || '/api/actions/alert', 'http://localhost');
                const webhookUrl = urlObj.searchParams.get('url') || urlObj.searchParams.get('webhook') || '';
                if (!webhookUrl) {
                  data = {
                    skipped: true,
                    note: 'Webhook URL required. Use CLI: veloprove alert <webhookUrl> or MCP vp.sendAlert'
                  };
                } else {
                  data = await engine.sendAlert({
                    webhookUrl,
                    provider: 'generic',
                    payload: {
                      projectName: 'Dashboard',
                      verdict: 'READY',
                      totalTests: 0,
                      passedCount: 0,
                      failedCount: 0,
                      detailsUrl: 'veloprove ui'
                    }
                  });
                }
                break;
              }
              case 'rate-limit': {
                const urlObj = new URL(req.url || '/api/actions/rate-limit', 'http://localhost');
                const target = urlObj.searchParams.get('url') || 'http://localhost:3000/api';
                data = await engine.auditRateLimit({
                  targetUrl: target,
                  requestCount: 20,
                  concurrency: 5,
                  method: 'GET'
                });
                break;
              }
              case 'setup-ci': {
                data = { workflowPath: engine.setupCi() };
                break;
              }
              case 'sandbox': {
                const sandbox = await engine.startSandbox(18089);
                data = { baseURL: sandbox.baseURL, note: 'Sandbox stays up while the dashboard process is running.' };
                break;
              }
              case 'hook': {
                data = engine.installGitHook('npx veloprove changed');
                break;
              }
              case 'init': {
                const root = guard.getRoot();
                const dirs = [
                  path.join(root, '.veloprove'),
                  path.join(root, '.veloprove', 'config'),
                  path.join(root, '.veloprove', 'reports'),
                  path.join(root, '.veloprove', 'state')
                ];
                for (const d of dirs) {
                  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
                }
                const configPath = path.join(root, 'veloprove.config.json');
                let createdConfig = false;
                if (!fs.existsSync(configPath)) {
                  fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
                  createdConfig = true;
                }
                const inspected = await engine.inspect();
                data = {
                  createdConfig,
                  configPath,
                  projectName: inspected.profile.projectName,
                  frameworks: inspected.profile.frameworks
                };
                break;
              }
              case 'ui':
              case 'tui':
              case 'mcp':
              case 'watch':
              case 'mock-server': {
                const hints: Record<string, string> = {
                  ui: 'npx veloprove ui',
                  tui: 'npx veloprove tui',
                  mcp: 'npx veloprove mcp',
                  watch: 'npx veloprove watch',
                  'mock-server': 'npx veloprove mock-server'
                };
                data = {
                  mode: 'cli-hint',
                  command: hints[action],
                  note: 'Interactive / long-running — run in a terminal (Dashboard already hosts the UI).'
                };
                break;
              }
              default: {
                // Lab catalog completeness: unknown ids should not silently 400 if catalog drifts
                const labKnown = buildDashboardLabCatalog().some((t) => t.action === action);
                if (labKnown) {
                  data = {
                    mode: 'cli-hint',
                    command: `npx veloprove ${action}`,
                    note: `Action '${action}' is cataloged but has no dedicated dashboard handler yet. Use CLI.`
                  };
                  break;
                }
                sse.broadcast('action', { phase: 'error', action, error: `Unknown action: ${action}` });
                sse.broadcast('log', { message: `✖ Unknown action: ${action}` });
                return sendJson({ error: `Unknown action: ${action}` }, 400);
              }
            }

            const durationMs = Date.now() - startedAt;
            const payload = { success: true, action, data, durationMs };
            sse.broadcast('action', { phase: 'complete', action, success: true, durationMs });
            sse.broadcast('log', { message: `✔ ${action} completed in ${durationMs}ms` });
            return sendJson(payload);
          } catch (err: any) {
            const durationMs = Date.now() - startedAt;
            sse.broadcast('action', { phase: 'error', action, error: err.message, durationMs });
            sse.broadcast('log', { message: `✖ ${action}: ${err.message}` });
            return sendJson({ success: false, action, error: err.message, durationMs }, 500);
          }
        }

        // Missing static assets (e.g. installHook.js.map from browser extensions) must not
        // fall through to HTML — DevTools would JSON.parse the page and warn loudly.
        if (/\.(map|js|mjs|cjs|css|woff2?|ttf|png|jpe?g|gif|webp)$/i.test(pathname)) {
          return sendNotFound(res);
        }

        if (pathname.startsWith('/api/')) {
          return sendJson({ error: 'Not found' }, 404);
        }

        // Live Calculated Metrics & Audits
        const profile = storage.getProjectProfile() || {
          projectName: 'ActiveProject',
          packageManager: 'npm',
          frameworks: ['nodejs'],
          testFrameworks: [],
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
        const history = RunHistoryService.load(guard) || RunHistoryService.rebuild(guard, storage);

        const html = renderDashboardHtml({
          profile,
          heatmap,
          runs,
          secAudit,
          perfAudit,
          quarantined,
          history
        });

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
