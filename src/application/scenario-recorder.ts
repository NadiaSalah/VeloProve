import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export type RecordedActionType =
  | 'navigate'
  | 'click'
  | 'fill'
  | 'press'
  | 'select'
  | 'check'
  | 'assert_text'
  | 'assert_visible'
  | 'assert_url'
  | 'custom';

export interface RecordedUserStep {
  type: RecordedActionType;
  selector?: string;
  role?: string;
  name?: string;
  value?: string;
  url?: string;
  description?: string;
}

export interface ScenarioRecordingOptions {
  title: string;
  startUrl: string;
  framework?: 'playwright' | 'vitest';
  steps: RecordedUserStep[];
  outputFile?: string;
}

export interface GeneratedScenarioResult {
  title: string;
  framework: string;
  code: string;
  savedPath?: string;
  stepsCount: number;
}

export class ScenarioRecorderService {
  /**
   * Convert high-level recorded interactions into robust Playwright or Vitest test code
   */
  public static synthesizeScenario(
    guard: WorkspaceGuard,
    options: ScenarioRecordingOptions
  ): GeneratedScenarioResult {
    const framework = options.framework || 'playwright';
    const testTitle = options.title.replace(/['"\\]/g, '');
    const cleanUrl = options.startUrl || 'http://localhost:3000';

    const generatedSteps: string[] = [];

    // Initial navigation
    generatedSteps.push(`    // Navigate to target application`);
    generatedSteps.push(`    await page.goto('${cleanUrl}', { waitUntil: 'domcontentloaded' });`);

    for (const step of options.steps) {
      if (step.description) {
        generatedSteps.push(`    // ${step.description}`);
      }

      switch (step.type) {
        case 'navigate': {
          const dest = step.url || cleanUrl;
          generatedSteps.push(`    await page.goto('${dest}');`);
          break;
        }

        case 'click': {
          const locator = this.buildLocator(step);
          generatedSteps.push(`    await ${locator}.click();`);
          break;
        }

        case 'fill': {
          const locator = this.buildLocator(step);
          const val = (step.value ?? '').replace(/'/g, "\\'");
          generatedSteps.push(`    await ${locator}.fill('${val}');`);
          break;
        }

        case 'press': {
          const key = step.value || 'Enter';
          if (step.selector || step.role) {
            const locator = this.buildLocator(step);
            generatedSteps.push(`    await ${locator}.press('${key}');`);
          } else {
            generatedSteps.push(`    await page.keyboard.press('${key}');`);
          }
          break;
        }

        case 'select': {
          const locator = this.buildLocator(step);
          const val = (step.value ?? '').replace(/'/g, "\\'");
          generatedSteps.push(`    await ${locator}.selectOption('${val}');`);
          break;
        }

        case 'check': {
          const locator = this.buildLocator(step);
          generatedSteps.push(`    await ${locator}.check();`);
          break;
        }

        case 'assert_text': {
          const locator = this.buildLocator(step);
          const expected = (step.value ?? '').replace(/'/g, "\\'");
          generatedSteps.push(`    await expect(${locator}).toContainText('${expected}');`);
          break;
        }

        case 'assert_visible': {
          const locator = this.buildLocator(step);
          generatedSteps.push(`    await expect(${locator}).toBeVisible();`);
          break;
        }

        case 'assert_url': {
          const expectedUrl = (step.url || step.value || '').replace(/'/g, "\\'");
          generatedSteps.push(`    await expect(page).toHaveURL(/${expectedUrl}/);`);
          break;
        }

        case 'custom':
        default: {
          if (step.value) {
            generatedSteps.push(`    ${step.value}`);
          }
          break;
        }
      }
    }

    let code = '';
    if (framework === 'playwright') {
      code = `import { test, expect } from '@playwright/test';

test.describe('Scenario: ${testTitle}', () => {
  test('executes recorded end-to-end user journey', async ({ page }) => {
${generatedSteps.join('\n')}
  });
});
`;
    } else {
      // Vitest / Component runner format
      code = `import { describe, it, expect } from 'vitest';

describe('Scenario: ${testTitle}', () => {
  it('executes recorded interaction flow', async () => {
    // Note: Mount component or initialize browser environment
${generatedSteps.join('\n')}
  });
});
`;
    }

    let savedPath: string | undefined;
    if (options.outputFile) {
      savedPath = guard.resolveSafePath(options.outputFile);
      const dir = path.dirname(savedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(savedPath, code, 'utf8');
    }

    return {
      title: options.title,
      framework,
      code,
      savedPath,
      stepsCount: options.steps.length
    };
  }

  /**
   * Helper to build robust accessibility / Visual-Aria locators
   */
  private static buildLocator(step: RecordedUserStep): string {
    if (step.role) {
      if (step.name) {
        return `page.getByRole('${step.role}', { name: /${step.name}/i })`;
      }
      return `page.getByRole('${step.role}')`;
    }

    if (step.selector) {
      if (step.selector.startsWith('test-id:') || step.selector.startsWith('data-testid=')) {
        const id = step.selector.replace(/^(test-id:|data-testid=)/, '').replace(/['"]/g, '');
        return `page.getByTestId('${id}')`;
      }
      if (step.selector.startsWith('label:')) {
        const lbl = step.selector.replace(/^label:/, '');
        return `page.getByLabel('${lbl}')`;
      }
      if (step.selector.startsWith('placeholder:')) {
        const ph = step.selector.replace(/^placeholder:/, '');
        return `page.getByPlaceholder('${ph}')`;
      }
      if (step.selector.startsWith('text=')) {
        const txt = step.selector.replace(/^text=/, '');
        return `page.getByText('${txt}')`;
      }
      return `page.locator('${step.selector}')`;
    }

    return `page.locator('body')`;
  }
}
