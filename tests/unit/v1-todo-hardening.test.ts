import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import http from 'node:http';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { SmartDevServerService } from '../../src/application/smart-dev-server.js';
import { SecurityPolicyWizard } from '../../src/application/security-policy-wizard.js';
import { VeloProveEngine } from '../../src/application/engine.js';

describe('VeloProve v1 Smart DevServer & Security Policy Wizard', () => {
  let tmpDir: string;
  let guard: WorkspaceGuard;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'veloprove-v1-todo-'));
    guard = new WorkspaceGuard(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('detects npm/pnpm/yarn/bun package managers and scripts', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'app', scripts: { dev: 'vite --port 5173' } }, null, 2)
    );
    fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
    const detected = SmartDevServerService.detectDevScript(tmpDir);
    expect(detected.command).toBe('pnpm run dev');
    expect(detected.port).toBe(5173);
    expect(SmartDevServerService.detectPackageManager(tmpDir)).toBe('pnpm');
  });

  it('probes healthy localhost servers', async () => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200);
      res.end('ok');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const ok = await SmartDevServerService.probeUrl(`http://127.0.0.1:${port}`);
    expect(ok).toBe(true);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('reports offline target without inventing a command when no scripts exist', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'empty' }, null, 2));
    const res = await SmartDevServerService.ensure(guard, {
      baseURL: 'http://127.0.0.1:59999',
      timeoutMs: 500
    });
    expect(res.started).toBe(false);
    expect(res.alreadyRunning).toBe(false);
    expect(res.message).toMatch(/offline|no dev script/i);
  });

  it('writes security policy frameworks and merges into veloprove.config.json', () => {
    const res = SecurityPolicyWizard.initPolicy(guard, {
      framework: 'owasp-asvs',
      mergeIntoConfig: true
    });
    expect(res.framework).toBe('owasp-asvs');
    expect(fs.existsSync(path.join(tmpDir, res.policyPath))).toBe(true);
    expect(res.configUpdated).toBe(true);
    const cfg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'veloprove.config.json'), 'utf8'));
    expect(cfg.security.policyFile).toBe('veloprove.security.json');
    expect(cfg.security.safeMode).toBe(true);
  });

  it('exposes ensureDevServer and initSecurityPolicy on the engine', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'app', scripts: { start: 'node server.js' } }, null, 2)
    );
    const engine = new VeloProveEngine(tmpDir);
    const ensure = await engine.ensureDevServer({ baseURL: 'http://127.0.0.1:59998', timeoutMs: 300 });
    expect(ensure.command).toContain('start');
    const policy = engine.initSecurityPolicy({ framework: 'hipaa' });
    expect(policy.summary).toMatch(/hipaa/i);
  });
});
