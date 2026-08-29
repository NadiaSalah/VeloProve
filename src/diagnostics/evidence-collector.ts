import type { TestCaseResult } from '../shared/types/tests.js';
import type { FailureEvidence } from '../shared/types/diagnostics.js';

export class EvidenceCollector {
  public static collect(failure: TestCaseResult): FailureEvidence {
    const errorMsg = failure.error?.message || 'Unknown test failure';
    const stack = failure.error?.stack || '';

    // Extract assertion diff if present in error message
    let assertionDiff: FailureEvidence['assertionDiff'];
    const diffMatch = errorMsg.match(/Expected:?\s*(.+?)\s+Received:?\s*(.+)/s) ||
                      errorMsg.match(/expected:?\s*(.+?)\s+actual:?\s*(.+)/s);
    if (diffMatch) {
      assertionDiff = {
        expected: diffMatch[1].trim(),
        actual: diffMatch[2].trim()
      };
    }

    // Extract failed selector if present in message or stack
    let failedSelector: string | undefined;
    const selectorMatch = errorMsg.match(/(?:locator|selector|getByRole|getByLabel|getByText)\((.+?)\)/) ||
                          errorMsg.match(/waiting for locator\(['"](.+?)['"]\)/);
    if (selectorMatch) {
      failedSelector = selectorMatch[1];
    }

    // Extract failed URL if present
    let failedUrl: string | undefined;
    const urlMatch = errorMsg.match(/https?:\/\/[^\s'")]+/);
    if (urlMatch) {
      failedUrl = urlMatch[0];
    }

    return {
      testId: failure.id,
      testName: failure.title,
      testFile: failure.filePath,
      sourceLocation: failure.error?.location,
      errorMessage: errorMsg,
      stackTrace: stack,
      assertionDiff,
      browserEvidence: {
        failedSelector,
        failedUrl,
        screenshotPath: failure.artifacts?.find(a => a.type === 'screenshot')?.path,
        domSnapshotPath: failure.artifacts?.find(a => a.type === 'dom_snapshot')?.path
      },
      timingMs: failure.durationMs,
      retryAttempts: failure.retryCount
    };
  }
}
