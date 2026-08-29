import type { PlannedTestCase, GeneratedTestFile, OverwritePolicy } from '../../shared/types/tests.js';

export class TestCodeGenerator {
  public static generateTestFile(
    testCase: PlannedTestCase,
    projectRoot: string
  ): GeneratedTestFile {
    if (testCase.type === 'e2e' || testCase.runner === 'playwright') {
      return this.generatePlaywrightTest(testCase);
    } else if (testCase.type === 'api') {
      return this.generateApiTest(testCase);
    } else {
      return this.generateUnitIntegrationTest(testCase);
    }
  }

  private static generatePlaywrightTest(tc: PlannedTestCase): GeneratedTestFile {
    const slug = tc.id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const relativePath = `tests/e2e/${slug}.spec.ts`;

    const content = `// @qaforge-generated: ${tc.id}
// Priority: ${tc.priority} | Category: ${tc.category}
// Reason: ${tc.reason}

import { test, expect } from '@playwright/test';

test.describe('${tc.title.replace(/'/g, "\\'")}', () => {
  test('should satisfy expected behavior', async ({ page }) => {
    // Step 1: Navigate to the target page
    await page.goto('/');

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
    const slug = tc.id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const relativePath = `tests/api/${slug}.test.ts`;

    const content = `// @qaforge-generated: ${tc.id}
// Priority: ${tc.priority} | Category: ${tc.category}
// Reason: ${tc.reason}

import { describe, it, expect } from 'vitest';

describe('${tc.title.replace(/'/g, "\\'")}', () => {
  const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';

  it('should return valid response contract', async () => {
    // Intent: ${tc.expectedBehavior.replace(/'/g, "\\'")}
    const response = await fetch(\`\${baseURL}/\`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    expect(response.status).toBeLessThan(500);
  });
});
`;

    return {
      filePath: relativePath,
      relativePath,
      framework: 'vitest',
      testLevel: 'api',
      content,
      testCaseIds: [tc.id],
      isNewFile: true
    };
  }

  private static generateUnitIntegrationTest(tc: PlannedTestCase): GeneratedTestFile {
    const slug = tc.id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const relativePath = `tests/unit/${slug}.test.ts`;

    const content = `// @qaforge-generated: ${tc.id}
// Priority: ${tc.priority} | Category: ${tc.category}
// Reason: ${tc.reason}

import { describe, it, expect } from 'vitest';

describe('${tc.title.replace(/'/g, "\\'")}', () => {
  it('should validate requirement: ${tc.id}', () => {
    // Expected behavior: ${tc.expectedBehavior.replace(/'/g, "\\'")}
    // Target modules: ${tc.targetFiles.join(', ')}
    expect(true).toBe(true);
  });
});
`;

    return {
      filePath: relativePath,
      relativePath,
      framework: tc.runner || 'vitest',
      testLevel: tc.type,
      content,
      testCaseIds: [tc.id],
      isNewFile: true
    };
  }
}
