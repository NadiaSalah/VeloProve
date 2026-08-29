import type { TestRunResult } from '../shared/types/tests.js';
import type { DiagnosticResult } from '../shared/types/diagnostics.js';
import { EvidenceCollector } from '../diagnostics/evidence-collector.js';
import { FailureClassifier } from '../diagnostics/classifier.js';

export class DiagnoseFailureService {
  public static diagnose(runResult: TestRunResult): DiagnosticResult[] {
    const diagnoses: DiagnosticResult[] = [];

    for (const failure of runResult.failures) {
      const evidence = EvidenceCollector.collect(failure);
      const outcome = FailureClassifier.classify(evidence);

      diagnoses.push({
        diagnosisId: `diag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        testId: failure.id,
        classification: outcome.classification,
        confidence: outcome.confidence,
        rootCause: outcome.rootCause,
        evidence,
        affectedFiles: failure.error?.location?.file
          ? [failure.error.location.file]
          : [failure.filePath],
        suggestedActions: outcome.suggestedActions,
        canAutoHealTest: outcome.canAutoHeal
      });
    }

    return diagnoses;
  }
}
