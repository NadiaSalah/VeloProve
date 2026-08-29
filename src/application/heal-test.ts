import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { DiagnosticResult, HealResult } from '../shared/types/diagnostics.js';

export class HealTestService {
  public static async heal(
    diagnoses: DiagnosticResult[],
    guard: WorkspaceGuard
  ): Promise<HealResult[]> {
    const healResults: HealResult[] = [];

    for (const diag of diagnoses) {
      if (!diag.canAutoHealTest) {
        continue;
      }

      const testFilePath = guard.resolveSafePath(diag.evidence.testFile);
      if (!fs.existsSync(testFilePath)) {
        continue;
      }

      const content = fs.readFileSync(testFilePath, 'utf8');

      // Ensure we only auto-heal generated or explicitly marked tests
      if (!content.includes('@qaforge-generated') && !content.includes('// @qaforge-healable')) {
        continue;
      }

      const failedSelector = diag.evidence.browserEvidence?.failedSelector;
      let newContent = content;
      let beforeSnippet = '';
      let afterSnippet = '';
      let healed = false;

      // 1. Repair stale CSS selectors with accessible locators
      if (failedSelector && failedSelector.includes('#') || failedSelector?.includes('.')) {
        // e.g. page.locator('#submit-btn') -> page.getByRole('button', { name: /submit/i })
        const rawClean = failedSelector.replace(/['"#.]/g, '');
        const replacement = `page.getByRole('button', { name: /${rawClean}/i })`;

        const regex = new RegExp(`page\\.locator\\(['"](?:#|\\.)${rawClean}['"]\\)`, 'g');
        if (regex.test(content)) {
          beforeSnippet = `page.locator('${failedSelector}')`;
          afterSnippet = replacement;
          newContent = content.replace(regex, replacement);
          healed = true;
        }
      }

      // 2. Fallback: Repair standard locator timeout with auto-waiting check
      if (!healed && diag.classification === 'TEST_BUG') {
        const strictMatch = content.match(/page\.locator\(['"]([^'"]+)['"]\)\.click\(\)/);
        if (strictMatch) {
          const oldLoc = strictMatch[0];
          const newLoc = `page.locator('${strictMatch[1]}').first().click()`;
          newContent = content.replace(oldLoc, newLoc);
          beforeSnippet = oldLoc;
          afterSnippet = newLoc;
          healed = true;
        }
      }

      if (healed) {
        fs.writeFileSync(testFilePath, newContent, 'utf8');
        healResults.push({
          testFile: diag.evidence.testFile,
          testId: diag.testId,
          success: true,
          beforeSnippet,
          afterSnippet,
          reason: `Replaced fragile/stale selector with resilient locator for: ${diag.rootCause}`,
          confidence: 0.90,
          evidenceUsed: [diag.rootCause]
        });
      }
    }

    return healResults;
  }
}
