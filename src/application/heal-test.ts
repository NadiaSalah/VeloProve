import fs from 'node:fs';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { DiagnosticResult, HealResult } from '../shared/types/diagnostics.js';
import { FixSafetyPolicy } from './fix-safety-policy.js';
import { isHealableTestContent } from './healable-policy.js';

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

      const policy = FixSafetyPolicy.classifyFileEdit(diag.evidence.testFile, 'test-heal');
      if (!policy.mayAutoApply) {
        healResults.push({
          testFile: diag.evidence.testFile,
          testId: diag.testId,
          success: false,
          beforeSnippet: '',
          afterSnippet: '',
          reason: `Heal blocked by safety policy (${policy.classification}): ${policy.reason}`,
          confidence: 1,
          evidenceUsed: [policy.reason]
        });
        continue;
      }

      const testFilePath = guard.resolveSafePath(diag.evidence.testFile);
      if (!fs.existsSync(testFilePath)) {
        continue;
      }

      const content = fs.readFileSync(testFilePath, 'utf8');

      // Ensure we only auto-heal generated or explicitly marked tests
      if (!isHealableTestContent(content)) {
        continue;
      }

      const failedSelector = diag.evidence.browserEvidence?.failedSelector;
      let newContent = content;
      let beforeSnippet = '';
      let afterSnippet = '';
      let healed = false;

      // 1. Repair stale CSS selectors with accessible locators
      if (failedSelector && (failedSelector.includes('#') || failedSelector.includes('.'))) {
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
          reason: `Replaced fragile/stale selector with resilient locator for: ${diag.rootCause} [${policy.classification}]`,
          confidence: 0.9,
          evidenceUsed: [diag.rootCause, policy.reason]
        });
      }
    }

    return healResults;
  }
}
