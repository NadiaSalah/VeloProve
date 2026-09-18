import fs from 'node:fs';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export interface FlakinessIssue {
  type: 'HARDCODED_SLEEP' | 'BRITTLE_EVAL' | 'SYNC_BOOLEAN_ASSERTION' | 'MISSING_AWAIT' | 'UNGUARDED_SELECTOR';
  line: number;
  snippet: string;
  recommendation: string;
}

export interface FlakinessAuditResult {
  filePath?: string;
  issuesFound: number;
  issues: FlakinessIssue[];
  stabilizedCode: string;
  wasModified: boolean;
}

export class FlakinessStabilizerService {
  /**
   * Scan and stabilize a test file or raw test code against common flakiness patterns
   */
  public static stabilize(
    guard: WorkspaceGuard,
    targetFileOrCode: string,
    saveFix = false
  ): FlakinessAuditResult {
    let rawContent = targetFileOrCode;
    let resolvedPath: string | undefined;

    // Check if input is a file path
    try {
      if (targetFileOrCode.endsWith('.ts') || targetFileOrCode.endsWith('.js') || targetFileOrCode.endsWith('.tsx')) {
        const potentialPath = guard.resolveSafePath(targetFileOrCode);
        if (fs.existsSync(potentialPath)) {
          resolvedPath = potentialPath;
          rawContent = fs.readFileSync(potentialPath, 'utf8');
        }
      }
    } catch {}

    const lines = rawContent.split('\n');
    const issues: FlakinessIssue[] = [];
    const stabilizedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const lineNum = i + 1;

      // Pattern 1: page.waitForTimeout(1000) or sleep(1000)
      if (/page\.waitForTimeout\s*\(\s*\d+\s*\)/.test(line)) {
        issues.push({
          type: 'HARDCODED_SLEEP',
          line: lineNum,
          snippet: line.trim(),
          recommendation: 'Replace static waitForTimeout with auto-waiting web-first assertion (toBeVisible / expect.poll).'
        });
        // Transform: replace with resilient assertion hint or poll
        line = line.replace(/await\s+page\.waitForTimeout\s*\(\s*(\d+)\s*\);?/, '// [VeloProve Stabilized: Auto-wait converted]\n    await page.waitForLoadState("networkidle").catch(() => {});');
      } else if (/new\s+Promise\s*\(\s*r\s*=>\s*setTimeout\s*\(\s*r\s*,\s*\d+\s*\)\s*\)/.test(line)) {
        issues.push({
          type: 'HARDCODED_SLEEP',
          line: lineNum,
          snippet: line.trim(),
          recommendation: 'Avoid hardcoded Promise timeout sleeps in async tests.'
        });
        line = line.replace(/await\s+new\s+Promise\s*\(\s*r\s*=>\s*setTimeout\s*\(\s*r\s*,\s*\d+\s*\)\s*\);?/, '// [VeloProve Stabilized: Replaced hardcoded sleep with auto-poll]');
      }

      // Pattern 2: expect(await locator.isVisible()).toBe(true) -> await expect(locator).toBeVisible()
      const syncAssertRegex = /expect\s*\(\s*await\s+([a-zA-Z0-9_$.()'"[\]\s\-]+)\.isVisible\(\)\s*\)\.toBe\s*\(\s*true\s*\)/;
      if (syncAssertRegex.test(line)) {
        issues.push({
          type: 'SYNC_BOOLEAN_ASSERTION',
          line: lineNum,
          snippet: line.trim(),
          recommendation: 'Use auto-retrying web-first assertion "await expect(locator).toBeVisible()" instead of boolean snapshot.'
        });
        line = line.replace(syncAssertRegex, (_, loc) => `await expect(${loc.trim()}).toBeVisible()`);
      }

      // Pattern 3: expect(await locator.innerText()).toBe('text') -> await expect(locator).toHaveText('text')
      const syncTextRegex = /expect\s*\(\s*await\s+([a-zA-Z0-9_$.()'"[\]\s\-]+)\.innerText\(\)\s*\)\.toBe\s*\(\s*(['"][^'"]+['"])\s*\)/;

      if (syncTextRegex.test(line)) {
        issues.push({
          type: 'SYNC_BOOLEAN_ASSERTION',
          line: lineNum,
          snippet: line.trim(),
          recommendation: 'Use auto-retrying web-first assertion "await expect(locator).toHaveText(...)"'
        });
        line = line.replace(syncTextRegex, (_, loc, txt) => `await expect(${loc.trim()}).toHaveText(${txt})`);
      }

      stabilizedLines.push(line);
    }

    const stabilizedCode = stabilizedLines.join('\n');
    const wasModified = stabilizedCode !== rawContent;

    if (saveFix && resolvedPath && wasModified) {
      fs.writeFileSync(resolvedPath, stabilizedCode, 'utf8');
    }

    return {
      filePath: resolvedPath,
      issuesFound: issues.length,
      issues,
      stabilizedCode,
      wasModified
    };
  }
}
