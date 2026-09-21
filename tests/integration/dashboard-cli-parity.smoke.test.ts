/**
 * Dashboard ↔ CLI parity smoke: same engine methods for inspect/doctor/diagnose.
 * Prefer mapping assertions over Playwright (flaky dashboard boot avoided).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOL_SURFACE } from '../../src/shared/tool-catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_SERVER = path.resolve(__dirname, '../../src/application/dashboard-server.ts');
const CLI_INDEX = path.resolve(__dirname, '../../src/cli/index.ts');

describe('Dashboard ↔ CLI parity (mapping smoke)', () => {
  it('dashboard actions for inspect/doctor/diagnose call matching engine methods', () => {
    const dash = fs.readFileSync(DASHBOARD_SERVER, 'utf8');

    expect(dash).toMatch(/case\s+'inspect':\s*data\s*=\s*await\s+engine\.inspect\(\)/);
    expect(dash).toMatch(/case\s+'doctor':\s*data\s*=\s*engine\.doctor\(\)/);
    expect(dash).toMatch(/case\s+'diagnose':\s*data\s*=\s*await\s+engine\.diagnose\(\)/);
  });

  it('CLI wires inspect/doctor/diagnose to the same engine surface', () => {
    const cli = fs.readFileSync(CLI_INDEX, 'utf8');
    // Commander command registrations + engine calls
    expect(cli).toMatch(/\.command\(['"]inspect['"]\)/);
    expect(cli).toMatch(/\.command\(['"]doctor['"]\)/);
    expect(cli).toMatch(/\.command\(['"]diagnose['"]\)/);
    expect(cli).toMatch(/engine\.inspect\(/);
    expect(cli).toMatch(/engine\.doctor\(/);
    expect(cli).toMatch(/engine\.diagnose\(/);
  });

  it('TOOL_SURFACE maps inspect/doctor/diagnose to CLI + dashboard + MCP', () => {
    for (const id of ['inspect', 'doctor', 'diagnose'] as const) {
      const entry = TOOL_SURFACE.find((t) => t.id === id);
      expect(entry?.cli).toBeTruthy();
      expect(entry?.mcp).toMatch(/^vp\./);
      expect(entry?.dashboardAction).toBeTruthy();
    }
  });
});
