import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { QAForgeEngine } from '../../src/application/engine.js';

describe('Autonomous QA Engine Full Loop', () => {
  const root = path.resolve(process.cwd());
  const engine = new QAForgeEngine(root);

  it('should complete full inspect -> plan -> releaseCheck cycle', async () => {
    // 1. Inspect
    const { profile, requirements, featureMap } = await engine.inspect();
    expect(profile.projectName).toBe('qaforge');
    expect(requirements.length).toBeGreaterThan(0);
    expect(featureMap.features.length).toBeGreaterThan(0);

    // 2. Plan
    const plan = await engine.plan({ maxTests: 5 });
    expect(plan.testCases.length).toBeGreaterThan(0);
    expect(plan.summary.totalTests).toBeLessThanOrEqual(5);

    // 3. Changed
    const changed = await engine.changed();
    expect(changed.riskScore).toBeGreaterThanOrEqual(0);

    // 4. Release check
    const release = await engine.releaseCheck();
    expect(release.verdict).toBeDefined();
    expect(release.confidenceScore).toBeGreaterThanOrEqual(0);
  });
});
