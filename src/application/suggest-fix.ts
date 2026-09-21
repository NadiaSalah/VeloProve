import type { DiagnosticResult, SourceFixSuggestion } from '../shared/types/diagnostics.js';

/**
 * Application-bug fix suggestions.
 *
 * Honesty note (trust hardening): `suggestedChange.diffOrPatch` is PARTIAL —
 * this service returns prose guidance only until real unified diffs/patches ship.
 * Do not claim "guaranteed fix" or auto-apply patches from suggest alone.
 */
export class SuggestFixService {
  public static suggest(diagnosis: DiagnosticResult): SourceFixSuggestion {
    const errorMsg = diagnosis.evidence.errorMessage;
    const affectedFile = diagnosis.affectedFiles[0] || 'Unknown file';

    let suggestedDescription = `Investigate logic in ${affectedFile} related to: ${diagnosis.rootCause}`;

    if (diagnosis.evidence.assertionDiff) {
      suggestedDescription = `Fix value mismatch in ${affectedFile}. Test expected "${diagnosis.evidence.assertionDiff.expected}", but code produced "${diagnosis.evidence.assertionDiff.actual}". Check return values, state mutations, or branching conditions.`;
    } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
      suggestedDescription = `Verify authentication / authorization handler in ${affectedFile}. Ensure tokens/credentials are parsed and validated correctly.`;
    }

    const suggestedChange: SourceFixSuggestion['suggestedChange'] = {
      file: affectedFile,
      description: suggestedDescription
      // diffOrPatch omitted on purpose — PARTIAL until real patch synthesis exists
    };

    return {
      problem: errorMsg,
      probableRootCause: diagnosis.rootCause,
      affectedFiles: diagnosis.affectedFiles,
      suggestedChange,
      completeness: suggestedChange.diffOrPatch ? 'COMPLETE' : 'PARTIAL',
      confidence: diagnosis.confidence,
      evidence: [
        diagnosis.evidence.errorMessage,
        ...(diagnosis.evidence.assertionDiff
          ? [
              `Expected: ${diagnosis.evidence.assertionDiff.expected}, Actual: ${diagnosis.evidence.assertionDiff.actual}`
            ]
          : []),
        'completeness=PARTIAL: guidance only — no unified diff/patch'
      ],
      recommendedValidation: `Run \`veloprove test --paths ${diagnosis.evidence.testFile}\` after applying the fix.`
    };
  }
}
