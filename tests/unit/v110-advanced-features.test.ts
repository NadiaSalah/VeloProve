import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { VeloProveEngine } from '../../src/application/engine.js';
import { catalogCliCommands } from '../../src/shared/tool-catalog.js';

describe('VeloProve v1.1.0 Advanced Features', () => {
  const root = path.resolve(process.cwd());
  const engine = new VeloProveEngine(root);

  it('CLI exposes short aliases without adding new .command() entries', () => {
    const cli = fs.readFileSync(path.resolve(__dirname, '../../src/cli/index.ts'), 'utf8');
    const commands = [...cli.matchAll(/\.command\('([a-zA-Z0-9_\-]+)/g)].map((m) => m[1]);
    expect(new Set(commands).size).toBe(catalogCliCommands().length);
    expect(cli).toContain(".alias('load')");
    expect(cli).toContain(".alias('vdiff')");
    expect(cli).toContain(".alias('postman')");
    expect(cli).toContain(".alias('dev')");
    expect(cli).toContain("-c, --vus");
    expect(cli).not.toMatch(/load-test[\s\S]{0,200}-u, --vus/);
  });

  it('should execute universal agent handshake and generate manifest', () => {
    const res = engine.handshake({ agentName: 'CustomFutureAI', preferredOutput: 'json' });
    expect(res.agentName).toBe('CustomFutureAI');
    expect(res.protocolVersion).toBe('1.0.0');
    expect(res.supportedTools.length).toBeGreaterThanOrEqual(8);
    expect(res.pasteToAi).toMatch(/VeloProve|vp\./);
    expect(res.mcpSnippet).toContain('@engnadia/veloprove');
    expect(res.agentsMdPath).toBeTruthy();
    expect(res.writtenFiles.length).toBeGreaterThanOrEqual(1);
  });

  it('teach-ai force rewrite AGENTS.md and optional mcp.json in isolated workspace', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-teach-ai-'));
    try {
      const local = new VeloProveEngine(tmp);
      const first = local.handshake({ agentName: 'T1', forceAgentsMd: true });
      expect(fs.existsSync(first.agentsMdPath)).toBe(true);
      expect(first.writtenFiles).toContain(first.agentsMdPath);
      fs.writeFileSync(first.agentsMdPath, '# stale\n', 'utf8');

      const second = local.handshake({
        agentName: 'T2',
        forceAgentsMd: true,
        writeMcpConfig: true
      });
      const agentsBody = fs.readFileSync(second.agentsMdPath, 'utf8');
      expect(agentsBody).toContain('teach-ai');
      expect(agentsBody).not.toContain('# stale');
      expect(second.mcpConfigPath).toBeTruthy();
      expect(fs.existsSync(second.mcpConfigPath!)).toBe(true);
      expect(second.pasteToAi).toContain('T2');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('should explore live application and generate site visual map', async () => {
    const res = await engine.explore({ baseURL: 'http://localhost:5173' });
    expect(res.totalRoutes).toBeGreaterThanOrEqual(1);
    expect(res.screens.length).toBeGreaterThanOrEqual(1);
  });

  it('should generate API fuzzing and security probes', async () => {
    const probes = await engine.fuzzApi();
    expect(Array.isArray(probes)).toBe(true);
  });

  it('should calculate mutation testing score', async () => {
    const score = await engine.evaluateMutationScore();
    expect(score.mutationScorePct).toBeGreaterThanOrEqual(0);
    expect(score.qualityVerdict).toBeDefined();
  });
});
