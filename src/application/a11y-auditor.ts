import fs from 'node:fs';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { ProjectProfile } from '../shared/types/project.js';

export interface A11yViolation {
  id: string;
  rule: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  helpUrl: string;
  file: string;
  line?: number;
  snippet?: string;
  suggestedFix: string;
}

export interface A11yAuditResult {
  score: number; // 0 - 100
  wcagLevel: 'A' | 'AA' | 'AAA' | 'NON_COMPLIANT';
  violations: A11yViolation[];
  passesCount: number;
  totalChecks: number;
  timestamp: string;
}

export class A11yAuditorService {
  public static audit(profile: ProjectProfile, guard: WorkspaceGuard): A11yAuditResult {
    const violations: A11yViolation[] = [];
    let passesCount = 0;

    const sourceFiles = profile.sourceFiles.filter(
      s => s.isComponent || s.relativePath.endsWith('.tsx') || s.relativePath.endsWith('.jsx') || s.relativePath.endsWith('.vue') || s.relativePath.endsWith('.svelte')
    );
    const filesToAudit = sourceFiles.length > 0 ? sourceFiles : profile.sourceFiles;

    for (const src of filesToAudit) {
      const fullPath = guard.resolveSafePath(src.relativePath);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 1. Image without alt attribute
        if (/<img\b(?![^>]*\balt=)[^>]*>/i.test(line)) {
          violations.push({
            id: 'image-alt',
            rule: 'WCAG 1.1.1 Non-text Content',
            impact: 'critical',
            description: 'Images must have an alt attribute describing the visual content or alt="" for decorative images.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
            file: src.relativePath,
            line: i + 1,
            snippet: line.trim(),
            suggestedFix: 'Add alt="Descriptive text" or alt="" to the <img> element.'
          });
        } else if (/<img\b[^>]*\balt=/i.test(line)) {
          passesCount++;
        }

        // 2. Button without accessible name
        if (/<button[^>]*>\s*<\/button>/i.test(line) && !line.includes('aria-label')) {
          violations.push({
            id: 'button-name',
            rule: 'WCAG 4.1.2 Name, Role, Value',
            impact: 'serious',
            description: 'Buttons must have discernible text or an aria-label for screen readers.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
            file: src.relativePath,
            line: i + 1,
            snippet: line.trim(),
            suggestedFix: 'Add visible text or aria-label="Action Name" to the button.'
          });
        } else if (/<button[^>]*>/i.test(line)) {
          passesCount++;
        }

        // 3. Input without label or aria-label
        if (/<input\b(?![^>]*\b(aria-label|aria-labelledby|id=))[^>]*>/i.test(line) && !line.includes('type="hidden"')) {
          violations.push({
            id: 'input-label',
            rule: 'WCAG 3.3.2 Labels or Instructions',
            impact: 'moderate',
            description: 'Form input elements must have associated labels or aria-label attributes.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
            file: src.relativePath,
            line: i + 1,
            snippet: line.trim(),
            suggestedFix: 'Provide an associated <label> or aria-label attribute.'
          });
        } else if (/<input\b/i.test(line)) {
          passesCount++;
        }

        // 4. Clickable div / span without keyboard accessibility (role and tabIndex)
        if (/<(div|span)\b[^>]*\bonClick\b(?![^>]*(role=|tabIndex=))[^>]*>/i.test(line)) {
          violations.push({
            id: 'interactive-role-missing',
            rule: 'WCAG 2.1.1 Keyboard',
            impact: 'serious',
            description: 'Non-interactive elements with onClick must specify role="button" and tabIndex={0} with key handler.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html',
            file: src.relativePath,
            line: i + 1,
            snippet: line.trim(),
            suggestedFix: 'Replace with <button> or add role="button" tabIndex={0} and onKeyDown handler.'
          });
        }

        // 5. Empty or placeholder links
        if (/<a\b[^>]*href=["'](#|javascript:void\(0\)|)["'][^>]*>/i.test(line)) {
          violations.push({
            id: 'invalid-link-target',
            rule: 'WCAG 2.4.4 Link Purpose (In Context)',
            impact: 'minor',
            description: 'Anchor tags should not use placeholder href values ("#" or "javascript:void(0)").',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
            file: src.relativePath,
            line: i + 1,
            snippet: line.trim(),
            suggestedFix: 'Use a proper route href or replace with a <button> element.'
          });
        }
      }
    }

    const totalChecks = Math.max(1, passesCount + violations.length);
    const score = Math.max(0, Math.round(((totalChecks - violations.length) / totalChecks) * 100));

    let wcagLevel: A11yAuditResult['wcagLevel'] = 'AAA';
    if (score < 70) wcagLevel = 'NON_COMPLIANT';
    else if (score < 85) wcagLevel = 'A';
    else if (score < 95) wcagLevel = 'AA';

    return {
      score,
      wcagLevel,
      violations,
      passesCount,
      totalChecks,
      timestamp: new Date().toISOString()
    };
  }
}
