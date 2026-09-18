import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DependencyGraph } from '../../src/intelligence/change-impact/dependency-graph.js';
import type { ProjectProfile, TestModule } from '../../src/shared/types/project.js';

function profileWithTests(testFiles: TestModule[], routes: ProjectProfile['routes'] = []): ProjectProfile {
  return {
    root: '',
    projectName: 'fixture',
    packageManager: 'npm',
    workspaceType: 'single',
    languages: ['typescript'],
    frameworks: ['react'],
    buildTools: [],
    testFrameworks: ['vitest'],
    apps: [],
    routes,
    apiEndpoints: [],
    sourceFiles: [],
    testFiles,
    capabilities: [],
    warnings: [],
    scanTimestamp: new Date().toISOString()
  };
}

describe('DependencyGraph impact analysis', () => {
  it('selects tests via targetedFiles metadata and explains why', () => {
    const result = DependencyGraph.findImpactedTests(
      ['src/auth/login.ts'],
      profileWithTests([
        {
          path: '',
          relativePath: 'tests/unit/login.test.ts',
          runner: 'vitest',
          level: 'unit',
          targetedFiles: ['src/auth/login.ts']
        },
        {
          path: '',
          relativePath: 'tests/e2e/home.spec.ts',
          runner: 'playwright',
          level: 'e2e',
          targetedFiles: []
        }
      ])
    );

    expect(result.impactedTestFiles).toContain('tests/unit/login.test.ts');
    expect(result.riskAreas).toContain('auth');
    expect(result.recommendedCapabilities).toContain('security');
    expect(result.reasoningEvidence.some((r) => r.testFile.includes('login'))).toBe(true);
  });

  it('detects monorepo modules and import relationships', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-impact-'));
    const testRel = 'tests/unit/widget.test.ts';
    fs.mkdirSync(path.join(tmp, 'tests/unit'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, testRel),
      `import { Widget } from '../../packages/ui/src/widget';\ndescribe('w', () => it('ok', () => {}));\n`
    );

    const result = DependencyGraph.findImpactedTests(
      ['packages/ui/src/widget.ts'],
      profileWithTests([
        {
          path: path.join(tmp, testRel),
          relativePath: testRel,
          runner: 'vitest',
          level: 'unit',
          targetedFiles: []
        }
      ]),
      tmp
    );

    expect(result.affectedModules).toContain('packages/ui');
    expect(result.impactedTestFiles).toContain(testRel);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
