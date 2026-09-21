/**
 * MCP contract harness — parse tool names from server.ts + TOOL_SURFACE catalog;
 * assert schemas exist; spot-check inspect/doctor/ask via engine (no MCP stdio).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { TOOL_SURFACE, catalogMcpTools } from '../../src/shared/tool-catalog.js';
import { VeloProveEngine } from '../../src/application/engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_TS = path.resolve(__dirname, '../../src/mcp/server.ts');
const GOLDEN = path.resolve(__dirname, '../../fixtures/golden-project');

function parseMcpToolNamesFromServer(source: string): string[] {
  const names: string[] = [];
  const re = /name:\s*'(vp\.[A-Za-z0-9.]+)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    names.push(m[1]);
  }
  return [...new Set(names)];
}

describe('MCP contract harness', () => {
  it('server.ts tool names align with TOOL_SURFACE catalog', () => {
    const source = fs.readFileSync(SERVER_TS, 'utf8');
    const fromServer = parseMcpToolNamesFromServer(source);
    const fromCatalog = catalogMcpTools();

    expect(fromServer.length).toBeGreaterThanOrEqual(70);
    expect(fromCatalog.length).toBe(fromServer.length);

    for (const name of fromCatalog) {
      expect(fromServer).toContain(name);
      // Each listed tool should have an inputSchema nearby in ListTools payload
      const idx = source.indexOf(`name: '${name}'`);
      expect(idx).toBeGreaterThan(-1);
      const window = source.slice(idx, idx + 800);
      expect(window).toMatch(/inputSchema/);
    }
  });

  it('spot-checks inspect / doctor / ask via engine (offline)', async () => {
    expect(fs.existsSync(GOLDEN)).toBe(true);
    const engine = new VeloProveEngine(GOLDEN);

    const inspect = await engine.inspect();
    expect(inspect.profile).toBeTruthy();
    expect(inspect.profile.projectName).toBeTruthy();

    const doctor = engine.doctor();
    expect(['HEALTHY', 'WARNINGS', 'CRITICAL_ISSUES']).toContain(doctor.verdict);
    expect(doctor.totalChecks).toBeGreaterThan(0);

    const ask = engine.askDocs('how do I run doctor?');
    expect(ask.answer.length).toBeGreaterThan(10);
    expect(ask.sources.length).toBeGreaterThan(0);
  });

  it('golden project inspect→plan→generate preserves authored test hash', async () => {
    const authored = path.join(GOLDEN, 'tests', 'app.test.js');
    const before = fs.readFileSync(authored, 'utf8');
    const { createHash } = await import('node:crypto');
    const hashBefore = createHash('sha256').update(before).digest('hex');

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-golden-'));
    try {
      // Copy golden into temp so generate cannot mutate monorepo fixture
      const copy = (src: string, dest: string) => {
        fs.mkdirSync(dest, { recursive: true });
        for (const e of fs.readdirSync(src, { withFileTypes: true })) {
          const from = path.join(src, e.name);
          const to = path.join(dest, e.name);
          if (e.isDirectory()) copy(from, to);
          else fs.copyFileSync(from, to);
        }
      };
      copy(GOLDEN, tmp);

      const engine = new VeloProveEngine(tmp);
      await engine.inspect();
      const plan = await engine.plan({ scope: 'all' });
      expect(plan.testCases.length).toBeGreaterThanOrEqual(0);

      await engine.generate({ overwritePolicy: 'never' });

      const afterPath = path.join(tmp, 'tests', 'app.test.js');
      expect(fs.existsSync(afterPath)).toBe(true);
      const hashAfter = createHash('sha256').update(fs.readFileSync(afterPath)).digest('hex');
      expect(hashAfter).toBe(hashBefore);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }, 90_000);

  it('catalog entries for representative tools have mcp ids', () => {
    const reps = ['inspect', 'doctor', 'ask', 'diagnose', 'heal'];
    for (const id of reps) {
      const entry = TOOL_SURFACE.find((t) => t.id === id);
      expect(entry?.mcp).toMatch(/^vp\./);
    }
  });
});
