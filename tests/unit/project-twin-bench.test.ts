/**
 * Soft Twin performance smoke — not an SLA; records rough build timing.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ephemeralFixtureDir } from '../helpers/monorepo-fixtures.js';
import { VeloProveEngine } from '../../src/application/engine.js';

describe('Project Twin soft benchmark smoke', () => {
  const dir = ephemeralFixtureDir('twin-bench');

  beforeAll(() => {
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'twin-bench', version: '1.0.0', type: 'module' }),
      'utf8'
    );
    for (let i = 0; i < 40; i++) {
      fs.writeFileSync(path.join(dir, 'src', `m${i}.js`), `export const v${i}=${i};\n`, 'utf8');
      fs.writeFileSync(
        path.join(dir, 'tests', `m${i}.test.js`),
        `import { test } from 'node:test';\ntest('m${i}', () => {});\n`,
        'utf8'
      );
    }
  });

  afterAll(() => {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('initial twin build completes under soft budget (30s)', async () => {
    const engine = new VeloProveEngine(dir);
    const t0 = Date.now();
    const result = await engine.twinBuild({ force: true, withImpact: true, withDrift: true });
    const ms = Date.now() - t0;
    expect(result.success).toBe(true);
    // Soft budget only — tune with measured data later; do not treat as SLA.
    expect(ms).toBeLessThan(30_000);
    const incr = await engine.twinBuild({ incremental: true });
    expect(incr.metadata.skippedRebuild === true || incr.success).toBe(true);
  }, 60_000);
});
