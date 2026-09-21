import { describe, it, expect } from 'vitest';
import { catalogCliCommands } from '../../src/shared/tool-catalog.js';
import {
  buildDashboardLabCatalog,
  CLI_HINT_ONLY,
  DASHBOARD_PARTIAL_CLI
} from '../../src/application/dashboard-lab-catalog.js';
import fs from 'node:fs';
import path from 'node:path';

describe('Dashboard Tool Lab catalog', () => {
  it('covers every CLI command exactly once by action', () => {
    const lab = buildDashboardLabCatalog();
    const cli = catalogCliCommands();
    expect(lab.length).toBe(cli.length);

    const actions = lab.map((t) => t.action);
    expect(new Set(actions).size).toBe(actions.length);

    for (const cmd of cli) {
      expect(
        lab.some((t) => t.cli === cmd),
        `CLI ${cmd} missing from Tool Lab`
      ).toBe(true);
    }
  });

  it('marks meta servers as Terminal-only (cli-hint)', () => {
    const lab = buildDashboardLabCatalog();
    for (const id of CLI_HINT_ONLY) {
      const row = lab.find((t) => t.cli === id);
      expect(row?.mode, id).toBe('cli-hint');
    }
  });

  it('marks known degraded Dashboard tools', () => {
    const lab = buildDashboardLabCatalog();
    for (const cli of DASHBOARD_PARTIAL_CLI) {
      const row = lab.find((t) => t.cli === cli);
      expect(row?.degraded, cli).toBe(true);
    }
  });

  it('docs name Terminal only + Partial sets', () => {
    const root = path.resolve(__dirname, '../..');
    const surface = fs.readFileSync(path.join(root, 'docs/reference/surface-matrix.md'), 'utf8');
    const cliDoc = fs.readFileSync(path.join(root, 'docs/reference/cli.md'), 'utf8');
    const dashDoc = fs.readFileSync(path.join(root, 'docs/guides/dashboard.md'), 'utf8');
    const blob = `${surface}\n${cliDoc}\n${dashDoc}`;
    expect(blob).toMatch(/Terminal only/i);
    expect(blob).toMatch(/Dashboard partial|Partial/i);
    for (const cmd of CLI_HINT_ONLY) {
      expect(blob.includes(cmd), `docs missing ${cmd}`).toBe(true);
    }
  });
});
