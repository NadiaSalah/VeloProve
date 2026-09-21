/**
 * Sequential offline feature pass on fixtures/real-app-smoke.
 * Writes docs/generated/FEATURE_PASS_REPORT.json for publish honesty.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const fixture = path.resolve(root, 'fixtures/real-app-smoke');

async function main() {
  const { VeloProveEngine } = await import(pathToFileURL(path.join(root, 'dist/application/engine.js')).href);
  const { TOOL_SURFACE } = await import(pathToFileURL(path.join(root, 'dist/shared/tool-catalog.js')).href);

  const engine = new VeloProveEngine(fixture);
  const results = [];

  const run = async (id, fn) => {
    const t0 = Date.now();
    try {
      const value = await fn();
      results.push({ id, ok: true, ms: Date.now() - t0, note: value && typeof value === 'object' && value.status ? String(value.status) : undefined });
      process.stdout.write(`✔ ${id}\n`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ id, ok: false, ms: Date.now() - t0, error: msg.slice(0, 400) });
      process.stdout.write(`✖ ${id}: ${msg.slice(0, 160)}\n`);
    }
  };

  // Start fixture server for URL tools
  const port = 3460;
  const healthUrl = `http://127.0.0.1:${port}/api/health`;
  const server = spawn(process.execPath, ['src/server.js'], {
    cwd: fixture,
    stdio: 'ignore',
    env: { ...process.env, PORT: String(port), VP_FIXTURE_PORT: String(port) }
  });

  const waitHealth = async () => {
    const start = Date.now();
    while (Date.now() - start < 12000) {
      try {
        if ((await fetch(healthUrl)).ok) return true;
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    return false;
  };
  const up = await waitHealth();
  await run('fixture-server', async () => {
    if (!up) throw new Error(`not ready ${healthUrl}`);
    return { up };
  });

  // Core sequence (one after another)
  await run('inspect', () => engine.inspect());
  await run('doctor', () => engine.doctor());
  await run('teach-ai', () => engine.handshake({ agentName: 'FeaturePass', preferredOutput: 'json' }));
  await run('ask', () => engine.askDocs('how do I verify changes?'));
  await run('plan', () => engine.plan({ scope: 'all', maxTests: 8 }));
  await run('changed', () => engine.changed());
  await run('twin', () => engine.twinBuild({ withImpact: true, withDrift: true, force: true }));
  await run('impact', () => engine.impactAnalysis());
  await run('drift', () => engine.drift());
  await run('test', () => engine.run({ scope: 'all' }));
  await run('test-affected', () => engine.run({ scope: 'affected' }));
  await run('verify', () => engine.verify({ fullSuite: false, noHeal: true }));
  await run('coverage', () => engine.getCoverageHeatmap());
  await run('release', () => engine.releaseCheck());
  await run('history', () => engine.getRunHistory());
  await run('audit', () => engine.auditSecurity());
  await run('scan-malware', () => engine.scanMalware());
  await run('env-drift', () => engine.auditEnvDrift());
  await run('contract-drift', () => engine.checkContractDrift());
  await run('feature-parity', () => engine.auditFeatureParity());
  await run('a11y', () => engine.auditA11y());
  await run('web-sec', () => engine.auditSriAndCsrf());
  await run('arch-graph', () => engine.generateArchitectureGraph());
  await run('dedup', () => engine.deduplicateTests());
  await run('security-scan', () => engine.scanSecuritySurface());
  await run('mock-gen', () => engine.generateMsw());
  await run('mock-data', () => engine.generateMockData({ preset: 'user', count: 2 }));
  await run('export-postman', () => engine.exportPostmanCollection());
  await run('bdd', () => engine.generateBddFeatures(path.join(fixture, 'features')));
  await run('flaky', () => engine.getFlaky());
  await run('lint', () => engine.lint({ scope: 'all' }));
  await run('quarantine', () => engine.quarantineFlaky());
  await run('db-audit', () => engine.auditDbQueries());
  await run('dead-assets', () => engine.scanDeadAssets());
  await run('screen-reader', () => engine.simulateScreenReader());
  await run('fuzz-api', () => engine.fuzzApi());
  await run('setup-ci', () => engine.setupCi());
  await run('browser-matrix', () => engine.generateBrowserMatrix());
  await run('docker-env', () => engine.generateDockerEnv({ services: ['postgres'] }));
  await run('remote-init', () => engine.generateRemoteProbe('standalone_js'));
  await run('record-scenario', () => engine.getRecorderBookmarklet());
  await run('audit-contracts', () => engine.auditSmartContracts());
  await run('mutation-score', () => engine.evaluateMutationScore());
  await run('visual-diff', () => engine.compareVisuals());
  await run('export-report', () => engine.exportReport({ format: 'html' }));

  if (up) {
    await run('request', () => engine.sendHttpRequest({ method: 'GET', url: healthUrl }));
    await run('owasp-scan', () => engine.scanOwasp(healthUrl));
    await run('load-test', () => engine.runLoadTest({ url: healthUrl, vus: 2, durationSec: 1 }));
    await run('rate-limit', () => engine.auditRateLimit({ targetUrl: healthUrl, requestCount: 6, concurrency: 2 }));
    await run('chaos', () => engine.runChaosTest({ targetUrl: healthUrl, iterations: 2 }));
    await run('throttle', () => engine.throttleRequest({ targetUrl: healthUrl, profile: 'REGULAR_3G' }));
  }

  try {
    server.kill('SIGTERM');
  } catch {
    /* ignore */
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const report = {
    fixture,
    generatedAt: new Date().toISOString(),
    summary: { total: results.length, passed, failed: failed.length },
    failed,
    results,
    catalogOffline: TOOL_SURFACE.filter((t) => t.tier === 'offline').map((t) => t.id)
  };

  const outDir = path.join(root, 'docs/generated');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'FEATURE_PASS_REPORT.json'), JSON.stringify(report, null, 2));
  console.log(`\n${passed}/${results.length} passed → docs/generated/FEATURE_PASS_REPORT.json`);
  if (failed.length) {
    console.log('FAILED:', failed.map((f) => f.id).join(', '));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
