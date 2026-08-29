import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { QAForgeEngine } from '../../src/application/engine.js';

describe('QAForge v1.1.0 Advanced Features', () => {
  const root = path.resolve(process.cwd());
  const engine = new QAForgeEngine(root);

  it('should execute universal agent handshake and generate manifest', () => {
    const res = engine.handshake({ agentName: 'CustomFutureAI', preferredOutput: 'json' });
    expect(res.agentName).toBe('CustomFutureAI');
    expect(res.protocolVersion).toBe('1.0.0');
    expect(res.supportedTools.length).toBeGreaterThanOrEqual(8);
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
