import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { LinterService } from '../../src/application/linter-service.js';
import { LocalDashboardServer } from '../../src/application/dashboard-server.js';
import { LocalStorage } from '../../src/storage/local-store.js';
import { ephemeralFixtureDir } from '../helpers/monorepo-fixtures.js';

describe('LinterService & LocalDashboardServer Actions', () => {
  const fixtureDir = ephemeralFixtureDir('lint-test-project');
  let guard: WorkspaceGuard;
  let storage: LocalStorage;

  beforeAll(() => {
    if (!fs.existsSync(fixtureDir)) {
      fs.mkdirSync(fixtureDir, { recursive: true });
    }
    fs.writeFileSync(path.join(fixtureDir, 'package.json'), JSON.stringify({ name: 'lint-app', version: '1.0.0' }));
    fs.writeFileSync(path.join(fixtureDir, 'sample.ts'), `
      // Sample code with linter triggers
      debugger;
      import {} from './empty';
    `);
    guard = new WorkspaceGuard(fixtureDir);
    storage = new LocalStorage(guard);
  });

  afterAll(() => {
    try {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    } catch {}
  });

  it('LinterService detects errors and warnings in built-in mode', async () => {
    const report = await LinterService.runLint(guard, { scope: 'all' });
    expect(report.totalErrors).toBeGreaterThanOrEqual(1);
    expect(report.messages.some(m => m.ruleId === 'no-debugger')).toBe(true);
    expect(report.messages.some(m => m.ruleId === 'no-empty-import')).toBe(true);
  });

  it('LinterService auto-fixes fixable rules with --fix', async () => {
    const report = await LinterService.runLint(guard, { scope: 'all', fix: true });
    expect(report.fixableCount).toBeGreaterThanOrEqual(1);
    const updated = fs.readFileSync(path.join(fixtureDir, 'sample.ts'), 'utf8');
    expect(updated).not.toContain('debugger;');
  });

  it('LocalDashboardServer starts and serves interactive HTML dashboard', async () => {
    const server = await LocalDashboardServer.start(guard, storage, 4199);
    expect(server.url).toBe('http://localhost:4199');

    // Fetch dashboard HTML
    const res = await fetch('http://localhost:4199');
    const html = await res.text();
    expect(html).toContain('VeloProve');
    expect(html).toContain('Command Center');
    expect(html).toContain('sidebar');
    expect(html).toContain('pane-detail');
    expect(html).toContain('pane-results');
    expect(html).toContain('VeloProve Complete Interactive User & Agent Guide');
    expect(html).toContain('view-guide');
    expect(html).toContain('/icon.svg');
    expect(html).toContain('/logo.svg');
    expect(html).toContain('view-security');
    expect(html).toContain('view-websec');
    expect(html).toContain('view-dedup');
    expect(html).toContain('view-throttle');
    expect(html).toContain('/api/events');
    expect(html).toContain('sidebar-quick');
    expect(html).toContain('toast-host');
    expect(html).toContain('function notify');
    expect(html).toContain('__VP_AI__');
    expect(html).toContain('confirmSensitive');
    expect(html).toContain('SENSITIVE_ACTIONS');
    expect(html).toContain('Run without AI');
    expect(html).toContain('No AI coding agent linked');
    expect(html).toContain('closeMobileNav');
    expect(html).toContain('Teach AI');
    expect(html).toContain('Ensure Dev');

    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    expect(scriptMatch).toBeTruthy();
    expect(() => new Function(scriptMatch![1])).not.toThrow();
    expect(scriptMatch![1]).toContain('function selectNav');

    const iconRes = await fetch('http://localhost:4199/icon.svg?v=test');
    expect(iconRes.status).toBe(200);
    expect(iconRes.headers.get('content-type')).toContain('image/svg+xml');
    const iconSvg = await iconRes.text();
    expect(iconSvg).toContain('<svg');
    expect(iconSvg).toContain('linearGradient');
    expect(iconSvg).toMatch(/#007A3D|#002B5B/);

    const logoRes = await fetch('http://localhost:4199/logo.svg?v=test');
    expect(logoRes.status).toBe(200);
    const logoSvg = await logoRes.text();
    expect(logoSvg).toContain('<svg');
    expect(logoSvg).toContain('linearGradient');
    expect(logoSvg).toMatch(/#007A3D|#002B5B|#003C71/);
    expect(logoSvg).not.toMatch(/QAForge|qaforge|qaforce|QAForce/i);

    const faviconRes = await fetch('http://localhost:4199/favicon.ico');
    expect(faviconRes.status).toBe(200);
    expect(faviconRes.headers.get('content-type')).toContain('image/svg+xml');

    // Extension-injected source maps must get 404, not SPA HTML (prevents JSON.parse noise)
    const mapRes = await fetch('http://localhost:4199/installHook.js.map');
    expect(mapRes.status).toBe(404);
    const mapBody = await mapRes.text();
    expect(mapBody).not.toContain('<!DOCTYPE html>');
    expect(mapBody).not.toContain('VeloProve');

    // SSE stream should emit a ready event
    const sseRes = await fetch('http://localhost:4199/api/events');
    expect(sseRes.status).toBe(200);
    expect(sseRes.headers.get('content-type')).toContain('text/event-stream');
    const reader = sseRes.body?.getReader();
    expect(reader).toBeTruthy();
    const { value } = await reader!.read();
    const chunk = new TextDecoder().decode(value);
    expect(chunk).toContain('event: ready');
    reader!.cancel();

    server.close();
  });

  it('MCP server uses vp:// resources only (no qa:// or QAForge leftovers)', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../src/mcp/server.ts'), 'utf8');
    expect(src).not.toMatch(/qa:\/\//);
    expect(src).toMatch(/vp:\/\//);
    expect(src).not.toMatch(/QAForge|qaforge|qaforce|QAForce/i);
  });
});
