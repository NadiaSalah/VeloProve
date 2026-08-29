import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { DiagnosticResult, HealResult } from '../shared/types/diagnostics.js';

export interface VisualHealMatch {
  brokenSelector: string;
  proposedLocator: string;
  confidence: number;
  strategy: 'role-match' | 'label-match' | 'text-match' | 'visual-aria';
}

export class VisualAutoHealService {
  public static async healWithVisualAria(
    diagnoses: DiagnosticResult[],
    guard: WorkspaceGuard
  ): Promise<HealResult[]> {
    const healResults: HealResult[] = [];

    for (const diag of diagnoses) {
      if (diag.classification !== 'TEST_BUG' && !diag.canAutoHealTest) {
        continue;
      }

      const testFilePath = guard.resolveSafePath(diag.evidence.testFile);
      if (!fs.existsSync(testFilePath)) {
        continue;
      }

      let content = fs.readFileSync(testFilePath, 'utf8');
      const brokenSelector = diag.evidence.browserEvidence?.failedSelector;

      if (!brokenSelector) {
        continue;
      }

      // Synthesize best resilient locator using accessibility hierarchy
      const match = this.inferResilientLocator(brokenSelector);
      if (match) {
        // Safe regex replace
        const escaped = brokenSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`(?:locator|getByTestId|querySelector)\\(['"]${escaped}['"]\\)`, 'g');

        if (pattern.test(content) || content.includes(brokenSelector)) {
          const beforeSnippet = brokenSelector;
          const afterSnippet = match.proposedLocator;
          content = content.replace(pattern, match.proposedLocator);

          fs.writeFileSync(testFilePath, content, 'utf8');

          healResults.push({
            testFile: diag.evidence.testFile,
            testId: diag.testId,
            success: true,
            beforeSnippet,
            afterSnippet,
            reason: `Visual-Aria auto-heal: matched broken selector "${brokenSelector}" to accessible locator with strategy ${match.strategy}`,
            confidence: match.confidence,
            evidenceUsed: [diag.rootCause, `Strategy: ${match.strategy}`]
          });
        }
      }
    }

    return healResults;
  }

  private static inferResilientLocator(brokenSelector: string): VisualHealMatch | null {
    const clean = brokenSelector.replace(/['"#.]/g, '').trim();

    if (/btn|button|submit|save|confirm|pay|checkout/i.test(clean)) {
      return {
        brokenSelector,
        proposedLocator: `getByRole('button', { name: /${clean.replace(/btn|button/gi, '') || 'button'}/i })`,
        confidence: 0.94,
        strategy: 'role-match'
      };
    }

    if (/email|password|username|search|input|query/i.test(clean)) {
      return {
        brokenSelector,
        proposedLocator: `getByLabel(/${clean}/i).or(page.getByPlaceholder(/${clean}/i))`,
        confidence: 0.91,
        strategy: 'label-match'
      };
    }

    if (/link|nav|menu|tab/i.test(clean)) {
      return {
        brokenSelector,
        proposedLocator: `getByRole('link', { name: /${clean}/i })`,
        confidence: 0.88,
        strategy: 'visual-aria'
      };
    }

    return {
      brokenSelector,
      proposedLocator: `getByText(/${clean}/i).first()`,
      confidence: 0.82,
      strategy: 'text-match'
    };
  }
}
