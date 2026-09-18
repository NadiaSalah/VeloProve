import fs from 'node:fs';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { DiagnosticResult } from '../shared/types/index.js';
import { FixSafetyPolicy } from './fix-safety-policy.js';

export interface ProposedPatch {
  targetFile: string;
  originalCodeSnippet: string;
  repairedCodeSnippet: string;
  explanation: string;
  confidence: number;
  safety: 'SAFE' | 'REVIEW_REQUIRED' | 'PROHIBITED_AUTOMATIC';
}

export interface BugFixReport {
  diagnosedBugCount: number;
  patches: ProposedPatch[];
  unifiedDiff: string;
  applied: boolean;
  blockedByPolicy: string[];
}

export class BugFixSynthesizerService {
  /**
   * Synthesize code repairs and Git patches from failure diagnostics.
   * Application edits are REVIEW_REQUIRED by default and never silently applied.
   */
  public static synthesizePatches(
    guard: WorkspaceGuard,
    diagnoses: DiagnosticResult[],
    apply = false
  ): BugFixReport {
    const appBugs = diagnoses.filter((d) => d.classification === 'APPLICATION_BUG');
    const patches: ProposedPatch[] = [];
    const diffChunks: string[] = [];
    const blockedByPolicy: string[] = [];
    let appliedAny = false;

    for (const bug of appBugs) {
      const targetFile =
        bug.evidence?.sourceLocation?.file || (bug.affectedFiles && bug.affectedFiles[0]);
      if (!targetFile) continue;

      const policy = FixSafetyPolicy.classifyFileEdit(targetFile, 'app-fix');
      if (policy.classification === 'PROHIBITED_AUTOMATIC') {
        blockedByPolicy.push(`${targetFile}: ${policy.reason}`);
        continue;
      }

      let targetFullPath: string;
      try {
        targetFullPath = guard.resolveSafePath(targetFile);
      } catch {
        continue;
      }

      if (!fs.existsSync(targetFullPath)) continue;

      const currentContent = fs.readFileSync(targetFullPath, 'utf8');
      const lines = currentContent.split('\n');

      let originalSnippet = '';
      let repairedSnippet = '';
      let explanation = bug.rootCause || 'Automated code repair';

      const errorText = `${bug.evidence?.errorMessage || ''} ${bug.rootCause || ''}`;

      if (
        errorText.includes('Cannot read properties of undefined') ||
        errorText.includes('null is not an object')
      ) {
        const propMatch = /reading ['"]?([a-zA-Z0-9_$]+)['"]?/.exec(errorText);
        const propName = propMatch ? propMatch[1] : 'name';

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(`.${propName}`) && !lines[i].includes(`?.${propName}`)) {
            originalSnippet = lines[i];
            repairedSnippet = lines[i].replace(new RegExp(`\\.${propName}`, 'g'), `?.${propName}`);
            if (apply && policy.mayAutoApply) {
              lines[i] = repairedSnippet;
            }
            break;
          }
        }
      }

      if (!repairedSnippet && (errorText.includes('404') || errorText.includes('500'))) {
        originalSnippet = lines[Math.max(0, lines.length - 2)];
        repairedSnippet =
          originalSnippet +
          '\n  // [VeloProve Auto-Fix: Guard return]\n  if (!res.headersSent) res.status(200);';
        explanation = 'Added fallback guard to ensure valid HTTP response is dispatched.';
      }

      if (originalSnippet && repairedSnippet && originalSnippet !== repairedSnippet) {
        patches.push({
          targetFile,
          originalCodeSnippet: originalSnippet.trim(),
          repairedCodeSnippet: repairedSnippet.trim(),
          explanation: `${explanation} [${policy.classification}]`,
          confidence: bug.confidence,
          safety: policy.classification
        });

        diffChunks.push(
          `--- a/${targetFile}\n+++ b/${targetFile}\n@@ -1,1 +1,1 @@\n- ${originalSnippet.trim()}\n+ ${repairedSnippet.trim()}`
        );

        if (apply && policy.mayAutoApply) {
          fs.writeFileSync(targetFullPath, lines.join('\n'), 'utf8');
          appliedAny = true;
        } else if (apply && !policy.mayAutoApply) {
          blockedByPolicy.push(
            `${targetFile}: apply requested but ${policy.classification} — patch proposed only`
          );
        }
      }
    }

    return {
      diagnosedBugCount: appBugs.length,
      patches,
      unifiedDiff: diffChunks.join('\n\n'),
      applied: appliedAny,
      blockedByPolicy
    };
  }
}
