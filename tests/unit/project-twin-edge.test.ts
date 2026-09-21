/**
 * Twin failure / edge-case fixtures — honest UNKNOWN / empty graph behavior.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ephemeralFixtureDir } from '../helpers/monorepo-fixtures.js';
import { VeloProveEngine } from '../../src/application/engine.js';
import { ProjectTwinService } from '../../src/application/project-twin.js';
import type { ProjectProfile } from '../../src/shared/types/project.js';
import type { FeatureMap } from '../../src/shared/types/requirements.js';

describe('Project Twin failure / edge cases', () => {
  const emptyDir = ephemeralFixtureDir('twin-empty');
  const unknownLangDir = ephemeralFixtureDir('twin-unknown-lang');

  beforeAll(() => {
    fs.mkdirSync(emptyDir, { recursive: true });
    fs.writeFileSync(
      path.join(emptyDir, 'package.json'),
      JSON.stringify({ name: 'empty-twin', version: '0.0.0' }),
      'utf8'
    );

    fs.mkdirSync(unknownLangDir, { recursive: true });
    fs.writeFileSync(
      path.join(unknownLangDir, 'package.json'),
      JSON.stringify({ name: 'cobol-ish', version: '0.0.0' }),
      'utf8'
    );
    fs.writeFileSync(path.join(unknownLangDir, 'MAIN.CBL'), 'IDENTIFICATION DIVISION.\n', 'utf8');
  });

  afterAll(() => {
    for (const d of [emptyDir, unknownLangDir]) {
      try {
        fs.rmSync(d, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  it('empty-ish profile still assembles with honesty warnings', () => {
    const profile: ProjectProfile = {
      root: emptyDir,
      projectName: 'empty-twin',
      packageManager: 'npm',
      workspaceType: 'single',
      languages: [],
      frameworks: [],
      buildTools: [],
      testFrameworks: [],
      apps: [],
      routes: [],
      apiEndpoints: [],
      sourceFiles: [],
      testFiles: [],
      capabilities: [],
      warnings: [],
      scanTimestamp: new Date().toISOString()
    };
    const featureMap: FeatureMap = {
      features: [],
      unmappedRequirements: [],
      generatedAt: new Date().toISOString()
    };
    const twin = ProjectTwinService.assemble(emptyDir, profile, [], featureMap);
    expect(twin.nodes.length).toBeGreaterThanOrEqual(0);
    expect(twin.warnings.some((w) => /INFERRED|MVP/i.test(w))).toBe(true);
  });

  it('engine twinBuild on sparse fixture does not throw', async () => {
    const engine = new VeloProveEngine(emptyDir);
    const result = await engine.twinBuild({ force: true });
    expect(result.success).toBe(true);
    expect(result.metadata.verificationStatus).toBe('PARTIAL');
  }, 60_000);

  it('unsupported language surface stays UNKNOWN-honest (no false VERIFIED features)', async () => {
    const engine = new VeloProveEngine(unknownLangDir);
    const result = await engine.twinBuild({ force: true, withDrift: true });
    expect(result.success).toBe(true);
    const features = result.data?.nodes.filter((n) => n.kind === 'feature') || [];
    // Sparse COBOL file should not invent VERIFIED feature nodes
    expect(features.every((f) => !f.evidence.some((e) => e.class === 'VERIFIED' && e.kind === 'ai'))).toBe(
      true
    );
  }, 60_000);
});
