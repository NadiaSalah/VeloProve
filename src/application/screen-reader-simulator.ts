import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceGuard } from '../execution/workspace-guard.js';

export interface ScreenReaderSpeechNode {
  index: number;
  tagName: string;
  role: string;
  spokenText: string;
  accessibleName: string;
  isInteractive: boolean;
  fileSource?: string;
  lineNumber?: number;
  warning?: string;
}

export interface ScreenReaderSimulationReport {
  timestamp: string;
  totalElementsScanned: number;
  interactiveElements: number;
  readabilityScore: number; // 0 - 100
  speechFlow: ScreenReaderSpeechNode[];
  headingHierarchy: { level: number; text: string; file: string; isOrderViolation: boolean }[];
  issues: {
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    message: string;
    file: string;
    line?: number;
    elementHtml?: string;
  }[];
  verdict: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'INACCESSIBLE';
}

export class ScreenReaderSimulatorService {
  public static simulate(
    guard: WorkspaceGuard,
    options: { targetPaths?: string[]; rawHtml?: string } = {}
  ): ScreenReaderSimulationReport {
    const root = guard.getRoot();
    const speechFlow: ScreenReaderSpeechNode[] = [];
    const headingHierarchy: ScreenReaderSimulationReport['headingHierarchy'] = [];
    const issues: ScreenReaderSimulationReport['issues'] = [];

    let elementIndex = 0;
    let lastHeadingLevel = 0;

    if (options.rawHtml) {
      this.parseHtmlFragment(options.rawHtml, 'raw-input.html', speechFlow, headingHierarchy, issues, () => ++elementIndex);
    } else {
      const targetExts = ['.html', '.jsx', '.tsx', '.vue', '.svelte'];
      const filesToScan: string[] = [];

      const walk = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(root, fullPath);
          if (entry.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
              walk(fullPath);
            }
          } else if (targetExts.some(ext => entry.name.endsWith(ext))) {
            filesToScan.push(relPath);
          }
        }
      };

      walk(root);

      for (const relFile of filesToScan) {
        try {
          const content = fs.readFileSync(path.join(root, relFile), 'utf8');
          this.parseHtmlFragment(content, relFile, speechFlow, headingHierarchy, issues, () => ++elementIndex);
        } catch {
          // ignore unreadable
        }
      }
    }

    // Check heading hierarchy violations
    for (const h of headingHierarchy) {
      if (lastHeadingLevel > 0 && h.level > lastHeadingLevel + 1) {
        h.isOrderViolation = true;
        issues.push({
          severity: 'WARNING',
          message: `Heading hierarchy skipped level: jumped from <h${lastHeadingLevel}> directly to <h${h.level}>`,
          file: h.file
        });
      }
      lastHeadingLevel = h.level;
    }

    const interactiveCount = speechFlow.filter(n => n.isInteractive).length;
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length;
    const warningIssues = issues.filter(i => i.severity === 'WARNING').length;

    let score = 100 - (criticalIssues * 15) - (warningIssues * 5);
    if (score < 0) score = 0;

    let verdict: ScreenReaderSimulationReport['verdict'] = 'EXCELLENT';
    if (score < 50) verdict = 'INACCESSIBLE';
    else if (score < 75) verdict = 'NEEDS_IMPROVEMENT';
    else if (score < 90) verdict = 'GOOD';

    return {
      timestamp: new Date().toISOString(),
      totalElementsScanned: speechFlow.length,
      interactiveElements: interactiveCount,
      readabilityScore: score,
      speechFlow,
      headingHierarchy,
      issues,
      verdict
    };
  }

  private static parseHtmlFragment(
    content: string,
    file: string,
    speechFlow: ScreenReaderSpeechNode[],
    headingHierarchy: ScreenReaderSimulationReport['headingHierarchy'],
    issues: ScreenReaderSimulationReport['issues'],
    nextIndex: () => number
  ): void {
    // Extract interactive and semantic tags: a, button, input, select, textarea, h1-h6, img
    const tagRegex = /<([a-zA-Z0-9]+)([^>]*)>([^<]*)/gi;
    let match: RegExpExecArray | null;

    let matchCount = 0;
    while ((match = tagRegex.exec(content)) !== null && matchCount < 300) {
      matchCount++;
      const tagName = match[1].toLowerCase();
      const rawAttrs = match[2] || '';
      const immediateText = (match[3] || '').trim();

      // Determine Line number
      const lineNum = content.substring(0, match.index).split('\n').length;

      // Extract ARIA & attributes
      const ariaLabel = (rawAttrs.match(/aria-label=["']([^"']+)["']/i) || [])[1] || '';
      const altText = (rawAttrs.match(/alt=["']([^"']+)["']/i) || [])[1] || '';
      const role = (rawAttrs.match(/role=["']([^"']+)["']/i) || [])[1] || this.getDefaultRole(tagName);
      const isAriaHidden = /aria-hidden=["']true["']/i.test(rawAttrs);

      if (isAriaHidden) continue;

      const isInteractive = ['button', 'a', 'input', 'select', 'textarea'].includes(tagName) || ['button', 'link', 'textbox'].includes(role);

      // Headings
      if (/^h[1-6]$/.test(tagName)) {
        const level = parseInt(tagName.charAt(1), 10);
        const headingText = ariaLabel || immediateText || 'Untitled Heading';
        headingHierarchy.push({ level, text: headingText, file, isOrderViolation: false });

        speechFlow.push({
          index: nextIndex(),
          tagName,
          role: 'heading',
          accessibleName: headingText,
          spokenText: `Heading level ${level}, ${headingText}`,
          isInteractive: false,
          fileSource: file,
          lineNumber: lineNum
        });
        continue;
      }

      // Images
      if (tagName === 'img') {
        let warning: string | undefined;
        if (!altText && !ariaLabel) {
          warning = 'Missing alt text or aria-label for image';
          issues.push({
            severity: 'CRITICAL',
            message: `Image missing accessible text (alt or aria-label)`,
            file,
            line: lineNum,
            elementHtml: match[0].substring(0, 100)
          });
        } else if (/^(image|photo|picture|icon)\s*(of)?$/i.test(altText.trim())) {
          warning = 'Redundant alt text phrasing ("image of...")';
          issues.push({
            severity: 'WARNING',
            message: `Redundant alt attribute containing "image/photo": "${altText}"`,
            file,
            line: lineNum
          });
        }

        const accessibleName = ariaLabel || altText || 'Unlabeled graphic';
        speechFlow.push({
          index: nextIndex(),
          tagName: 'img',
          role: 'image',
          accessibleName,
          spokenText: `Image, ${accessibleName}`,
          isInteractive: false,
          fileSource: file,
          lineNumber: lineNum,
          warning
        });
        continue;
      }

      // Buttons and Links
      if (['button', 'a'].includes(tagName) || role === 'button' || role === 'link') {
        const accessibleName = ariaLabel || immediateText || '';
        let warning: string | undefined;

        if (!accessibleName) {
          warning = `Empty interactive element <${tagName}> without accessible name or text`;
          issues.push({
            severity: 'CRITICAL',
            message: `Interactive element <${tagName}> has no text, aria-label, or title`,
            file,
            line: lineNum,
            elementHtml: match[0].substring(0, 100)
          });
        } else if (/^(click here|read more|more|link)$/i.test(accessibleName.trim())) {
          warning = `Ambiguous link/button text: "${accessibleName}"`;
          issues.push({
            severity: 'WARNING',
            message: `Ambiguous interactive text "${accessibleName}" provides poor context for screen readers`,
            file,
            line: lineNum
          });
        }

        const spokenRole = tagName === 'a' ? 'link' : 'button';
        speechFlow.push({
          index: nextIndex(),
          tagName,
          role: spokenRole,
          accessibleName: accessibleName || 'Unlabeled',
          spokenText: `${accessibleName || 'Unlabeled'}, ${spokenRole}`,
          isInteractive: true,
          fileSource: file,
          lineNumber: lineNum,
          warning
        });
        continue;
      }

      // Form inputs
      if (['input', 'textarea', 'select'].includes(tagName)) {
        const type = (rawAttrs.match(/type=["']([^"']+)["']/i) || [])[1] || 'text';
        const placeholder = (rawAttrs.match(/placeholder=["']([^"']+)["']/i) || [])[1] || '';
        const accessibleName = ariaLabel || placeholder || '';

        let warning: string | undefined;
        if (!accessibleName) {
          warning = `Input missing label, aria-label, or placeholder`;
          issues.push({
            severity: 'CRITICAL',
            message: `Form input element <${tagName} type="${type}"> lacks label association`,
            file,
            line: lineNum,
            elementHtml: match[0].substring(0, 100)
          });
        }

        speechFlow.push({
          index: nextIndex(),
          tagName,
          role: type === 'checkbox' ? 'checkbox' : type === 'radio' ? 'radio' : 'edit text',
          accessibleName: accessibleName || 'Unlabeled form control',
          spokenText: `${accessibleName || 'Unlabeled'}, ${type} field`,
          isInteractive: true,
          fileSource: file,
          lineNumber: lineNum,
          warning
        });
      }
    }
  }

  private static getDefaultRole(tagName: string): string {
    switch (tagName) {
      case 'a': return 'link';
      case 'button': return 'button';
      case 'img': return 'image';
      case 'input': return 'textbox';
      case 'ul':
      case 'ol': return 'list';
      case 'li': return 'listitem';
      case 'nav': return 'navigation';
      case 'main': return 'main';
      case 'header': return 'banner';
      case 'footer': return 'contentinfo';
      default: return 'generic';
    }
  }
}
