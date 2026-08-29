import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { LinterService } from '../../src/application/linter-service.js';
import { LocalDashboardServer } from '../../src/application/dashboard-server.js';
import { LocalStorage } from '../../src/storage/local-store.js';

describe('LinterService & LocalDashboardServer Actions', () => {
  const fixtureDir = path.resolve(process.cwd(), 'fixtures/lint-test-project');
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
    expect(html).toContain('QAForge Command Center');
    expect(html).toContain('One-Click Action');
    expect(html).toContain('QAForge Complete Interactive User & Agent Guide');
    expect(html).toContain('tab-guide');

    server.close();
  });
});
