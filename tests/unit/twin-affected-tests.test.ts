/**
 * Twin affected-test planner — expand on low confidence; never shrink below graph.
 */
import { describe, it, expect } from 'vitest';
import { planAffectedTests } from '../../src/application/twin-affected-tests.js';
import type { ImpactAnalysisResult } from '../../src/intelligence/change-impact/dependency-graph.js';
import type { TwinLatestDocument } from '../../src/shared/types/project-twin.js';
import { TWIN_SCHEMA_VERSION } from '../../src/shared/types/project-twin.js';

function impact(partial: Partial<ImpactAnalysisResult>): ImpactAnalysisResult {
  return {
    changedFiles: [],
    impactedTestFiles: [],
    impactedRoutes: [],
    impactedEndpoints: [],
    affectedModules: [],
    riskScore: 0,
    riskAreas: [],
    recommendedCapabilities: [],
    reasoningEvidence: [],
    selectionNotes: [],
    ...partial
  };
}

describe('planAffectedTests', () => {
  const allTests = ['tests/a.test.js', 'tests/b.test.js', 'tests/c.test.js', 'tests/d.test.js'];

  it('unions Twin + graph paths when confidence is adequate', () => {
    const twin = {
      schemaVersion: TWIN_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      projectRoot: '/tmp',
      fingerprint: 'abc',
      refs: {
        projectProfile: '.veloprove/project-profile.json',
        requirements: '.veloprove/requirements.json'
      },
      summary: {
        features: 0,
        sourceFiles: 0,
        testFiles: 4,
        routes: 0,
        apiEndpoints: 0,
        requirements: 0,
        frameworks: [],
        workspaceType: 'single',
        packageManager: 'npm'
      },
      nodes: [],
      edges: [],
      facets: {
        impact: {
          included: true,
          changedFiles: ['src/a.js'],
          items: [
            {
              targetId: 'test:tests/a.test.js',
              targetKind: 'test' as const,
              certainty: 'CONFIRMED' as const,
              reason: 'direct',
              confidence: 0.95
            },
            {
              targetId: 'test:tests/b.test.js',
              targetKind: 'test' as const,
              certainty: 'DIRECT' as const,
              reason: 'direct',
              confidence: 0.85
            }
          ],
          riskScore: 20,
          riskAreas: [],
          selectionNotes: [],
          source: 'changed-wrap' as const
        }
      },
      warnings: []
    } satisfies TwinLatestDocument;

    const plan = planAffectedTests(
      impact({
        changedFiles: ['src/a.js'],
        impactedTestFiles: ['tests/a.test.js']
      }),
      twin,
      allTests
    );

    expect(plan.expandedToAll).toBe(false);
    expect(plan.paths).toContain('tests/a.test.js');
    expect(plan.paths).toContain('tests/b.test.js');
    expect(plan.twinUsed).toBe(true);
  });

  it('expands to all when changed files exist but no mapped tests', () => {
    const plan = planAffectedTests(
      impact({ changedFiles: ['src/orphan.js'], impactedTestFiles: [] }),
      null,
      allTests
    );
    expect(plan.expandedToAll).toBe(true);
    expect(plan.paths).toEqual(allTests);
  });

  it('expands when Twin certainty is mostly UNKNOWN/PROBABLE with narrow set', () => {
    const twin = {
      schemaVersion: TWIN_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      projectRoot: '/tmp',
      fingerprint: 'abc',
      refs: {
        projectProfile: '.veloprove/project-profile.json',
        requirements: '.veloprove/requirements.json'
      },
      summary: {
        features: 0,
        sourceFiles: 0,
        testFiles: 20,
        routes: 0,
        apiEndpoints: 0,
        requirements: 0,
        frameworks: [],
        workspaceType: 'single',
        packageManager: 'npm'
      },
      nodes: [],
      edges: [],
      facets: {
        impact: {
          included: true,
          changedFiles: ['src/x.js'],
          items: [
            {
              targetId: 'test:tests/a.test.js',
              targetKind: 'test' as const,
              certainty: 'UNKNOWN' as const,
              reason: 'guess',
              confidence: 0.1
            },
            {
              targetId: 'test:tests/b.test.js',
              targetKind: 'test' as const,
              certainty: 'PROBABLE' as const,
              reason: 'guess',
              confidence: 0.3
            }
          ],
          riskScore: 50,
          riskAreas: [],
          selectionNotes: [],
          source: 'changed-wrap' as const
        }
      },
      warnings: []
    } satisfies TwinLatestDocument;

    const manyTests = Array.from({ length: 20 }, (_, i) => `tests/t${i}.test.js`);
    const plan = planAffectedTests(
      impact({
        changedFiles: ['src/x.js'],
        impactedTestFiles: ['tests/a.test.js']
      }),
      twin,
      manyTests
    );
    expect(plan.expandedToAll).toBe(true);
  });
});
