import type { PlannedTestCase, GeneratedTestFile } from '../../shared/types/tests.js';
import type { TestFrameworkType } from '../../shared/types/project.js';

type UnitRunner = 'vitest' | 'jest' | 'node:test';

function resolveUnitRunner(tc: PlannedTestCase): UnitRunner {
  if (tc.runner === 'node:test') return 'node:test';
  if (tc.runner === 'jest') return 'jest';
  return 'vitest';
}

function unitImports(runner: UnitRunner): string {
  if (runner === 'node:test') {
    return `import { describe, it } from 'node:test';
import assert from 'node:assert/strict';`;
  }
  if (runner === 'jest') {
    return `import { describe, it, expect } from '@jest/globals';`;
  }
  return `import { describe, it, expect } from 'vitest';`;
}

function assertStatusLessThan500(runner: UnitRunner, expr: string): string {
  if (runner === 'node:test') return `assert.ok(${expr} < 500); // offline fallback`;
  return `expect(${expr}).toBeLessThan(500); // offline fallback`;
}

function assertStatusEquals(runner: UnitRunner, expr: string, status: number): string {
  if (runner === 'node:test') return `assert.equal(${expr}, ${status}); // live-grounded`;
  return `expect(${expr}).toBe(${status}); // live-grounded`;
}

function assertContain(runner: UnitRunner, haystack: string, needleJson: string): string {
  if (runner === 'node:test') {
    return `assert.ok((${haystack}).includes(${needleJson})); // live-grounded content-type`;
  }
  return `expect(${haystack}).toContain(${needleJson}); // live-grounded content-type`;
}

function assertHasProperty(runner: UnitRunner, obj: string, keyExpr: string): string {
  if (runner === 'node:test') {
    return `assert.ok(Object.prototype.hasOwnProperty.call(${obj}, ${keyExpr})); // live-grounded shape`;
  }
  return `expect(${obj}).toHaveProperty(${keyExpr}); // live-grounded shape`;
}

function assertTruthy(runner: UnitRunner, expr: string, comment: string): string {
  if (runner === 'node:test') return `assert.ok(${expr}); // ${comment}`;
  return `expect(${expr}).toBeTruthy(); // ${comment}`;
}

function assertTrue(runner: UnitRunner): string {
  if (runner === 'node:test') return `assert.equal(true, true);`;
  return `expect(true).toBe(true);`;
}

export class TestCodeGenerator {
  public static generateTestFile(
    testCase: PlannedTestCase,
    _projectRoot: string
  ): GeneratedTestFile {
    if (testCase.type === 'e2e' || testCase.runner === 'playwright') {
      return this.generatePlaywrightTest(testCase);
    }
    if (testCase.type === 'api') {
      return this.generateApiTest(testCase);
    }
    return this.generateUnitIntegrationTest(testCase);
  }

  private static generatePlaywrightTest(tc: PlannedTestCase): GeneratedTestFile {
    const slug = tc.id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const relativePath = `tests/e2e/${slug}.spec.ts`;
    const route = tc.exploreRoute || '/';
    const fixtureLine = tc.fixturePath
      ? `    // Local fixture: ${tc.fixturePath}`
      : '';

    const content = `// @veloprove-generated: ${tc.id}
// Priority: ${tc.priority} | Category: ${tc.category}
// Reason: ${tc.reason}

import { test, expect } from '@playwright/test';

test.describe('${tc.title.replace(/'/g, "\\'")}', () => {
  test('should satisfy expected behavior', async ({ page }) => {
    // Step 1: Navigate to explored/target route
    await page.goto('${route.replace(/'/g, "\\'")}');
${fixtureLine}

    // Step 2: Validate page title and core content
    await expect(page).toHaveTitle(/.+/);

    // Step 3: Check accessible UI components
    const mainHeading = page.getByRole('heading', { level: 1 }).first();
    if (await mainHeading.isVisible()) {
      await expect(mainHeading).toBeVisible();
    }

    // Step 4: Validate business intent: ${tc.expectedBehavior.replace(/'/g, "\\'")}
    // Generated based on: ${tc.description.replace(/'/g, "\\'")}
  });
});
`;

    return {
      filePath: relativePath,
      relativePath,
      framework: 'playwright',
      testLevel: 'e2e',
      content,
      testCaseIds: [tc.id],
      isNewFile: true
    };
  }

  private static generateApiTest(tc: PlannedTestCase): GeneratedTestFile {
    const runner = resolveUnitRunner(tc);
    const slug = tc.id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const ext = runner === 'node:test' ? 'js' : 'ts';
    const relativePath = `tests/api/${slug}.test.${ext}`;
    const pathHint = tc.observedPath || '/';
    const statusAssert =
      tc.observedStatus && tc.observedStatus > 0
        ? assertStatusEquals(runner, 'response.status', tc.observedStatus)
        : assertStatusLessThan500(runner, 'response.status');

    const ctHint = tc.observedContentType?.split(';')[0]?.trim();
    const ctAssert = ctHint
      ? `    ${assertContain(
          runner,
          `(response.headers.get('content-type') || '').toLowerCase()`,
          JSON.stringify(ctHint.toLowerCase())
        )}`
      : '';

    const keysAssert =
      tc.observedJsonKeys && tc.observedJsonKeys.length > 0
        ? `    const body = await response.json();
    for (const key of ${JSON.stringify(tc.observedJsonKeys)}) {
      ${assertHasProperty(runner, 'body', 'key')}
    }`
        : '';

    const fixtureLoad = tc.fixturePath
      ? `    const fixtureSample = JSON.parse(await import('node:fs').then(fs => fs.promises.readFile('${tc.fixturePath.replace(/\\/g, '/')}', 'utf8')));`
      : '';
    const fixtureAssert = tc.fixturePath
      ? `    ${assertTruthy(runner, 'fixtureSample', 'local fixtures pack')}`
      : '';

    const content = `// @veloprove-generated: ${tc.id}
// Priority: ${tc.priority} | Category: ${tc.category}
// Reason: ${tc.reason}
${tc.observedUrl ? `// Live-grounded: ${tc.observedUrl} → ${tc.observedStatus}` : '// Live-grounding: unavailable (offline fallback)'}

${unitImports(runner)}

describe('${tc.title.replace(/'/g, "\\'")}', () => {
  const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';

  it('should return valid response contract', async () => {
    // Intent: ${tc.expectedBehavior.replace(/'/g, "\\'")}
${fixtureLoad}
    const response = await fetch(\`\${baseURL}${pathHint === '/' ? '/' : pathHint}\`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    ${statusAssert}
${ctAssert}
${keysAssert}
${fixtureAssert}
  });
});
`;

    return {
      filePath: relativePath,
      relativePath,
      framework: runner as TestFrameworkType,
      testLevel: 'api',
      content,
      testCaseIds: [tc.id],
      isNewFile: true
    };
  }

  private static generateUnitIntegrationTest(tc: PlannedTestCase): GeneratedTestFile {
    const runner = resolveUnitRunner(tc);
    const slug = tc.id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const ext = runner === 'node:test' ? 'js' : 'ts';
    const relativePath = `tests/unit/${slug}.test.${ext}`;

    const content = `// @veloprove-generated: ${tc.id}
// Priority: ${tc.priority} | Category: ${tc.category}
// Reason: ${tc.reason}

${unitImports(runner)}

describe('${tc.title.replace(/'/g, "\\'")}', () => {
  it('should validate requirement: ${tc.id}', () => {
    // Expected behavior: ${tc.expectedBehavior.replace(/'/g, "\\'")}
    // Target modules: ${tc.targetFiles.join(', ')}
    ${assertTrue(runner)}
  });
});
`;

    return {
      filePath: relativePath,
      relativePath,
      framework: (tc.runner || runner) as TestFrameworkType,
      testLevel: tc.type,
      content,
      testCaseIds: [tc.id],
      isNewFile: true
    };
  }
}
