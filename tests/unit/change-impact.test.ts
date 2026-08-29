import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../src/intelligence/change-impact/dependency-graph.js';
import type { ProjectProfile } from '../../src/shared/types/project.js';

describe('Change Impact Analysis', () => {
  const mockProfile: ProjectProfile = {
    root: '/app',
    projectName: 'mock-app',
    packageManager: 'npm',
    workspaceType: 'single',
    languages: ['typescript'],
    frameworks: ['react'],
    buildTools: ['vite'],
    testFrameworks: ['vitest', 'playwright'],
    apps: [],
    routes: [
      { path: '/checkout', sourceFile: 'src/pages/checkout.tsx', type: 'page' }
    ],
    apiEndpoints: [
      { method: 'POST', path: '/api/orders', sourceFile: 'src/api/orders.ts' }
    ],
    sourceFiles: [
      {
        path: '/app/src/cart/calc.ts',
        relativePath: 'src/cart/calc.ts',
        language: 'typescript',
        hasTests: true,
        imports: [],
        exports: ['calculateTotal']
      }
    ],
    testFiles: [
      {
        path: '/app/tests/unit/calc.test.ts',
        relativePath: 'tests/unit/calc.test.ts',
        runner: 'vitest',
        level: 'unit',
        targetedFiles: ['src/cart/calc.ts']
      },
      {
        path: '/app/tests/e2e/checkout.spec.ts',
        relativePath: 'tests/e2e/checkout.spec.ts',
        runner: 'playwright',
        level: 'e2e',
        targetedFiles: []
      }
    ],
    capabilities: [],
    warnings: [],
    scanTimestamp: new Date().toISOString()
  };

  it('should identify impacted unit test for changed source file', () => {
    const impact = DependencyGraph.findImpactedTests(['src/cart/calc.ts'], mockProfile);
    expect(impact.impactedTestFiles).toContain('tests/unit/calc.test.ts');
  });

  it('should identify impacted route and e2e test when route page changes', () => {
    const impact = DependencyGraph.findImpactedTests(['src/pages/checkout.tsx'], mockProfile);
    expect(impact.impactedRoutes).toContain('/checkout');
    expect(impact.impactedTestFiles).toContain('tests/e2e/checkout.spec.ts');
  });
});
