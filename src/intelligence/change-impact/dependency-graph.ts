import path from 'node:path';
import type { ProjectProfile } from '../../shared/types/project.js';

export interface ImpactAnalysisResult {
  changedFiles: string[];
  impactedTestFiles: string[];
  impactedRoutes: string[];
  impactedEndpoints: string[];
  riskScore: number;
}

export class DependencyGraph {
  public static findImpactedTests(
    changedRelativePaths: string[],
    profile: ProjectProfile
  ): ImpactAnalysisResult {
    const impactedTestFiles = new Set<string>();
    const impactedRoutes = new Set<string>();
    const impactedEndpoints = new Set<string>();

    for (const changed of changedRelativePaths) {
      const changedNorm = changed.replace(/\\/g, '/');
      const changedBase = path.basename(changedNorm).replace(/\.[^.]+$/, '');

      // 1. Check if the changed file is itself a test file
      const selfTest = profile.testFiles.find(t => t.relativePath === changedNorm);
      if (selfTest) {
        impactedTestFiles.add(selfTest.relativePath);
      }

      // 2. Direct unit test matching (e.g. foo.ts -> foo.test.ts or foo.spec.ts)
      for (const test of profile.testFiles) {
        const testBase = path.basename(test.relativePath);
        if (testBase.includes(changedBase) || test.targetedFiles.includes(changedNorm)) {
          impactedTestFiles.add(test.relativePath);
        }
      }

      // 3. Match against Routes
      for (const route of profile.routes) {
        if (route.sourceFile === changedNorm || changedNorm.includes(route.path.replace(/^\//, ''))) {
          impactedRoutes.add(route.path);
          // Add e2e tests for this route
          for (const test of profile.testFiles.filter(t => t.level === 'e2e')) {
            if (test.relativePath.includes(route.path.replace(/[^a-zA-Z0-9]+/g, '-'))) {
              impactedTestFiles.add(test.relativePath);
            }
          }
        }
      }

      // 4. Match against Endpoints
      for (const ep of profile.apiEndpoints) {
        if (ep.sourceFile === changedNorm || changedNorm.includes(ep.path.replace(/^\//, ''))) {
          impactedEndpoints.add(`${ep.method} ${ep.path}`);
          for (const test of profile.testFiles.filter(t => t.level === 'api')) {
            impactedTestFiles.add(test.relativePath);
          }
        }
      }
    }

    // Calculate risk score based on number of changes & critical paths
    let riskScore = Math.min(100, changedRelativePaths.length * 15);
    if (impactedRoutes.size > 0) riskScore += 20;
    if (impactedEndpoints.size > 0) riskScore += 20;

    return {
      changedFiles: changedRelativePaths,
      impactedTestFiles: Array.from(impactedTestFiles),
      impactedRoutes: Array.from(impactedRoutes),
      impactedEndpoints: Array.from(impactedEndpoints),
      riskScore: Math.min(100, riskScore)
    };
  }
}
