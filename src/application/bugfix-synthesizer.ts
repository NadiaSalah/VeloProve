import fs from 'node:fs';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { DiagnosticResult } from '../shared/types/index.js';

export interface ProposedPatch {
  targetFile: string;
  originalCodeSnippet: string;
  repairedCodeSnippet: string;
  explanation: string;
  confidence: number;
}

export interface BugFixReport {
  diagnosedBugCount: number;
  patches: ProposedPatch[];
  unifiedDiff: string;
  applied: boolean;
}

export class BugFixSynthesizerService {
  /**
   * Synthesize code repairs and Git patches from failure diagnostics
   */
  public static synthesizePatches(
    guard: WorkspaceGuard,
    diagnoses: DiagnosticResult[],
    apply = false
  ): BugFixReport {
    const appBugs = diagnoses.filter(d => d.classification === 'APPLICATION_BUG');
    const patches: ProposedPatch[] = [];
    const diffChunks: string[] = [];

    for (const bug of appBugs) {
      const targetFile = bug.evidence?.sourceLocation?.file || (bug.affectedFiles && bug.affectedFiles[0]);
      if (!targetFile) continue;

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

      // Pattern 1: Null check / undefined property access in failure message
      if (errorText.includes('Cannot read properties of undefined') || errorText.includes('null is not an object')) {
        const propMatch = /reading ['"]?([a-zA-Z0-9_$]+)['"]?/.exec(errorText);
        const propName = propMatch ? propMatch[1] : 'name';

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(`.${propName}`) && !lines[i].includes(`?.${propName}`)) {
            originalSnippet = lines[i];
            repairedSnippet = lines[i].replace(new RegExp(`\\.${propName}`, 'g'), `?.${propName}`);
            if (apply) {
              lines[i] = repairedSnippet;
            }
            break;
          }
        }
      }

      // Pattern 2: Missing HTTP status / return statement in route
      if (!repairedSnippet && (errorText.includes('404') || errorText.includes('500'))) {
        originalSnippet = lines[Math.max(0, lines.length - 2)];
        repairedSnippet = originalSnippet + '\n  // [QAForge Auto-Fix: Guard return]\n  if (!res.headersSent) res.status(200);';
        explanation = 'Added fallback guard to ensure valid HTTP response is dispatched.';
      }

      if (originalSnippet && repairedSnippet && originalSnippet !== repairedSnippet) {
        patches.push({
          targetFile,
          originalCodeSnippet: originalSnippet.trim(),
          repairedCodeSnippet: repairedSnippet.trim(),
          explanation,
          confidence: bug.confidence
        });

        diffChunks.push(`--- a/${targetFile}\n+++ b/${targetFile}\n@@ -1,1 +1,1 @@\n- ${originalSnippet.trim()}\n+ ${repairedSnippet.trim()}`);

        if (apply) {
          fs.writeFileSync(targetFullPath, lines.join('\n'), 'utf8');
        }
      }
    }

    const unifiedDiff = diffChunks.join('\n\n');

    return {
      diagnosedBugCount: appBugs.length,
      patches,
      unifiedDiff,
      applied: apply && patches.length > 0
    };
  }
}
