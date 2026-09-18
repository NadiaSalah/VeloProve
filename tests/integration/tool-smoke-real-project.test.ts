import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawn, type ChildProcess } from 'node:child_process';
import { VeloProveEngine } from '../../src/application/engine.js';
import { TOOL_SURFACE } from '../../src/shared/tool-catalog.js';

/**
 * Smoke-execute offline-capable tools against fixtures/real-app-smoke.
 * URL / interactive / destructive tiers are catalog-gated (not fully executed).
 */
describe('Tool smoke on realistic project (fixtures/real-app-smoke)', () => {
  const fixture = path.resolve(__dirname, '../../fixtures/real-app-smoke');
  const FIXTURE_PORT = Number(process.env.VP_FIXTURE_PORT || 3456);
  const healthUrl = `http://127.0.0.1:${FIXTURE_PORT}/api/health`;
  let engine: VeloProveEngine;
  let serverProc: ChildProcess | null = null;
  const results: Array<{ id: string; ok: boolean; note?: string }> = [];

  async function waitForHealth(timeoutMs = 15000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        if ((await fetch(healthUrl)).ok) return true;
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    return false;
  }

  beforeAll(async () => {
    expect(fs.existsSync(path.join(fixture, 'package.json'))).toBe(true);
    engine = new VeloProveEngine(fixture);
    serverProc = spawn(process.execPath, ['src/server.js'], {
      cwd: fixture,
      stdio: 'ignore',
      env: {
        ...process.env,
        PORT: String(FIXTURE_PORT),
        VP_FIXTURE_PORT: String(FIXTURE_PORT)
      }
    });
    const up = await waitForHealth();
    results.push({
      id: 'fixture-server',
      ok: up,
      note: up ? `ready :${FIXTURE_PORT}` : `not ready :${FIXTURE_PORT}`
    });
  }, 25000);

  afterAll(() => {
    if (serverProc && !serverProc.killed) {
      try {
        serverProc.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    }
  });

  it('core discovery loop: inspect, doctor, handshake, plan, coverage, release, history', async () => {
    const inspected = await engine.inspect();
    expect(inspected.profile.projectName).toBeTruthy();
    results.push({ id: 'inspect', ok: true });

    const doctor = engine.doctor();
    expect(doctor).toBeTruthy();
    results.push({ id: 'doctor', ok: true });

    const handshake = engine.handshake({ agentName: 'SmokeAgent', preferredOutput: 'json' });
    expect(handshake.supportedTools.length).toBeGreaterThanOrEqual(8);
    expect(handshake.instructionPrompt).toMatch(/75|docs\/reference\/mcp/i);
    results.push({ id: 'bootstrap', ok: true });

    const plan = await engine.plan({ scope: 'all', maxTests: 10 });
    expect(plan).toBeTruthy();
    results.push({ id: 'plan', ok: true });

    // Generate into an isolated temp workspace so we do not dirty the fixture tree
    const tmpGen = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-smoke-gen-'));
    try {
      fs.writeFileSync(
        path.join(tmpGen, 'package.json'),
        JSON.stringify({ name: 'smoke-gen', version: '1.0.0', type: 'module' })
      );
      const genEngine = new VeloProveEngine(tmpGen);
      await genEngine.inspect();
      // Seed a tiny plan via storage by planning after inspect (may be empty → still returns)
      const tmpPlan = await genEngine.plan({ scope: 'all', maxTests: 5 });
      expect(tmpPlan).toBeTruthy();
      const generated = await genEngine.generate({ liveGround: false, writeFixtures: true });
      expect(generated).toHaveProperty('writtenCount');
      results.push({ id: 'generate', ok: true, note: `written=${generated.writtenCount}` });
    } finally {
      fs.rmSync(tmpGen, { recursive: true, force: true });
    }

    const verify = await engine.verify({ fullSuite: false, noHeal: true });
    expect(verify).toHaveProperty('success');
    expect(verify).toHaveProperty('status');
    if (verify.data) {
      expect(verify.data.schemaVersion).toBe('1');
    }
    results.push({ id: 'verify', ok: true, note: verify.status });

    const heatmap = await engine.getCoverageHeatmap();
    expect(heatmap).toBeTruthy();
    results.push({ id: 'coverage', ok: true });

    const release = await engine.releaseCheck();
    expect(release).toBeTruthy();
    results.push({ id: 'release', ok: true });

    const history = engine.getRunHistory();
    expect(history).toBeTruthy();
    results.push({ id: 'history', ok: true });

    const changed = await engine.changed();
    expect(changed).toBeTruthy();
    results.push({ id: 'changed', ok: true });
  }, 90000);

  it('offline quality/security engines return structured payloads', async () => {
    const checks: Array<[string, () => unknown | Promise<unknown>]> = [
      ['audit', () => engine.auditSecurity()],
      ['scan-malware', () => engine.scanMalware()],
      ['arch-graph', () => engine.generateArchitectureGraph()],
      ['feature-parity', () => engine.auditFeatureParity()],
      ['env-drift', () => engine.auditEnvDrift()],
      ['web-sec', () => engine.auditSriAndCsrf()],
      ['dedup', () => engine.deduplicateTests()],
      ['security-scan', () => engine.scanSecuritySurface()],
      ['security-plan', () => engine.planSecurityTests({ safeMode: true })],
      ['export-postman', () => engine.exportPostmanCollection()],
      ['mock-data', () => engine.generateMockData({ preset: 'user', count: 2 })],
      ['bdd', () => engine.generateBddFeatures(path.join(fixture, 'features'))],
      ['docker-env', () => engine.generateDockerEnv({ services: ['postgres'] })],
      ['browser-matrix', () => engine.generateBrowserMatrix()],
      ['audit-contracts', () => engine.auditSmartContracts()],
      ['dead-assets', () => engine.scanDeadAssets()],
      ['db-audit', () => engine.auditDbQueries()],
      ['a11y', () => engine.auditA11y()],
      ['screen-reader', () => engine.simulateScreenReader()],
      ['fuzz-api', () => engine.fuzzApi()],
      [
        'learn-framework',
        async () => {
          try {
            return engine.learnFramework();
          } catch (err) {
            // Expected on vanilla fixtures without custom framework docs
            return { expectedError: true, message: err instanceof Error ? err.message : String(err) };
          }
        }
      ],
      ['mock-gen', () => engine.generateMsw()],
      ['quarantine', () => engine.quarantineFlaky()],
      ['remote-init', () => engine.generateRemoteProbe('standalone_js')],
      ['record-scenario', () => engine.getRecorderBookmarklet()],
      ['setup-ci', () => engine.setupCi()],
      ['flaky', () => engine.getFlaky()],
      ['lint', () => engine.lint({ scope: 'all' })]
    ];

    for (const [id, fn] of checks) {
      const value = await fn();
      expect(value, `${id} returned empty`).toBeTruthy();
      results.push({ id, ok: true });
    }
  }, 120000);

  it('URL-tier smoke against local fixture server when available', async () => {
    let up = false;
    try {
      up = (await fetch(healthUrl)).ok;
    } catch {
      up = false;
    }

    if (!up) {
      // CI without bindable port: still assert catalog has needs-url tools
      results.push({ id: 'url-tier', ok: false, note: `fixture server not reachable at ${healthUrl}` });
      expect(TOOL_SURFACE.some((t) => t.tier === 'needs-url')).toBe(true);
      return;
    }

    const owasp = await engine.scanOwasp(healthUrl);
    expect(owasp).toBeTruthy();
    results.push({ id: 'owasp-scan', ok: true });

    const load = await engine.runLoadTest({ url: healthUrl, vus: 2, durationSec: 1 });
    expect(load).toBeTruthy();
    results.push({ id: 'load-test', ok: true });

    const req = await engine.sendHttpRequest({ method: 'GET', url: healthUrl });
    expect(req).toBeTruthy();
    results.push({ id: 'request', ok: true });

    const rate = await engine.auditRateLimit({ targetUrl: healthUrl, requestCount: 8, concurrency: 2 });
    expect(rate).toBeTruthy();
    results.push({ id: 'rate-limit', ok: true });

    const chaos = await engine.runChaosTest({ targetUrl: healthUrl, iterations: 2 });
    expect(chaos).toBeTruthy();
    results.push({ id: 'chaos', ok: true });

    const throttle = await engine.throttleRequest({
      targetUrl: healthUrl,
      profile: 'REGULAR_3G'
    });
    expect(throttle).toBeTruthy();
    results.push({ id: 'throttle', ok: true });

    results.push({ id: 'url-tier', ok: true, note: `expanded against :${FIXTURE_PORT}` });
  }, 90000);

  it('CLI --help works for Daily-10 + sampled commands (full surface covered in unit cli-dx-backlog)', async () => {
    const cliBin = path.resolve(__dirname, '../../dist/cli/index.js');
    expect(fs.existsSync(cliBin)).toBe(true);

    const { DAILY_10_COMMANDS } = await import('../../src/cli/help-groups.js');
    const sample = [
      ...DAILY_10_COMMANDS,
      'fuzz-api',
      'export-report',
      'mcp',
      'ui',
      'web-sec'
    ];
    const unique = [...new Set(sample)];
    const { execFileSync } = await import('node:child_process');

    const failures: string[] = [];
    for (const cmd of unique) {
      try {
        const out = execFileSync(process.execPath, [cliBin, cmd, '--help'], {
          encoding: 'utf8',
          timeout: 8000,
          cwd: fixture
        });
        if (!/Usage|Options|Commands|Arguments|veloprove/i.test(out)) {
          failures.push(`${cmd}: unexpected help output`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/Usage|Options/i.test(msg)) failures.push(`${cmd}: ${msg.slice(0, 120)}`);
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
    results.push({ id: 'cli-help-sample', ok: true, note: `${unique.length} commands` });
  }, 60000);

  it('writes smoke report artifact', () => {
    const outDir = path.resolve(__dirname, '../../docs/generated');
    fs.mkdirSync(outDir, { recursive: true });
    const report = {
      fixture,
      generatedAt: new Date().toISOString(),
      executed: results,
      tiers: {
        offline: TOOL_SURFACE.filter((t) => t.tier === 'offline').map((t) => t.id),
        needsUrl: TOOL_SURFACE.filter((t) => t.tier === 'needs-url').map((t) => t.id),
        needsState: TOOL_SURFACE.filter((t) => t.tier === 'needs-state').map((t) => t.id),
        destructive: TOOL_SURFACE.filter((t) => t.tier === 'destructive').map((t) => t.id),
        interactive: TOOL_SURFACE.filter((t) => t.tier === 'interactive').map((t) => t.id)
      }
    };
    fs.writeFileSync(path.join(outDir, 'TOOL_SMOKE_REPORT.json'), JSON.stringify(report, null, 2));
    expect(results.filter((r) => r.ok).length).toBeGreaterThan(20);
  });
});
