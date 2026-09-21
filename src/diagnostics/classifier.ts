import type { FailureEvidence, FailureClassification } from '../shared/types/diagnostics.js';

export interface ClassificationOutcome {
  classification: FailureClassification;
  /** Classifier confidence (model certainty), distinct from evidenceSignals. */
  confidence: number;
  rootCause: string;
  suggestedActions: string[];
  canAutoHeal: boolean;
  /** Observable facts from the failure payload. */
  evidenceSignals: string[];
  /** Unproven hypotheses — never treat as confirmed findings. */
  speculationNotes: string[];
}

function baseSignals(evidence: FailureEvidence): string[] {
  const signals: string[] = [];
  if (evidence.errorMessage) signals.push(`errorMessage: ${evidence.errorMessage.slice(0, 200)}`);
  if (evidence.assertionDiff) {
    signals.push(
      `assertionDiff: expected=${evidence.assertionDiff.expected} actual=${evidence.assertionDiff.actual}`
    );
  }
  if (evidence.browserEvidence?.failedSelector) {
    signals.push(`failedSelector: ${evidence.browserEvidence.failedSelector}`);
  }
  if (evidence.browserEvidence?.failedUrl) {
    signals.push(`failedUrl: ${evidence.browserEvidence.failedUrl}`);
  }
  if (evidence.retryAttempts && evidence.retryAttempts > 1) {
    signals.push(`retryAttempts: ${evidence.retryAttempts}`);
  }
  if (evidence.sourceLocation?.file) {
    signals.push(
      `sourceLocation: ${evidence.sourceLocation.file}${evidence.sourceLocation.line ? ':' + evidence.sourceLocation.line : ''}`
    );
  }
  return signals;
}

export class FailureClassifier {
  public static classify(evidence: FailureEvidence): ClassificationOutcome {
    const msg = (evidence.errorMessage || '').toLowerCase();
    const stack = (evidence.stackTrace || '').toLowerCase();
    const combined = `${msg} \n ${stack}`;
    const signals = baseSignals(evidence);

    // 1. Network / Connection Failures
    if (combined.includes('econnrefused') || combined.includes('enotfound') || combined.includes('fetch failed')) {
      return {
        classification: 'NETWORK_FAILURE',
        confidence: 0.95,
        rootCause: 'Target service or dev server was not reachable at requested URL.',
        suggestedActions: [
          'Verify that the local dev server / API backend is running',
          'Check host and port configuration in veloprove.config.json or environment variables'
        ],
        canAutoHeal: false,
        evidenceSignals: signals,
        speculationNotes: ['Service may be temporarily offline rather than permanently misconfigured.']
      };
    }

    // 2. Timeout Failures
    if (combined.includes('timeout') || combined.includes('timed out') || combined.includes('exceeded timeout')) {
      if (evidence.browserEvidence?.failedSelector) {
        return {
          classification: 'TEST_BUG',
          confidence: 0.88,
          rootCause: `Locator timed out waiting for element "${evidence.browserEvidence.failedSelector}". Element may have moved or selector is stale.`,
          suggestedActions: [
            'Update locator to an accessible role/label locator',
            'Run `veloprove heal` to repair stale locators automatically'
          ],
          canAutoHeal: true,
          evidenceSignals: signals,
          speculationNotes: [
            'Timeout with a failed selector is treated as selector drift; slow network alone cannot be ruled out without timing baselines.'
          ]
        };
      }
      return {
        classification: 'TIMEOUT',
        confidence: 0.85,
        rootCause: 'Operation exceeded maximum allowed execution time.',
        suggestedActions: [
          'Check for hanging asynchronous promises or slow external dependencies',
          'Increase timeout threshold if testing heavy end-to-end flows'
        ],
        canAutoHeal: false,
        evidenceSignals: signals,
        speculationNotes: ['Could be application hang, environment slowness, or insufficient timeout budget.']
      };
    }

    // 3. Stale / Bad Selector (Test Bug)
    if (
      combined.includes('waiting for locator') ||
      combined.includes('strict mode violation') ||
      combined.includes('element is not visible') ||
      combined.includes('no element matches selector')
    ) {
      return {
        classification: 'TEST_BUG',
        confidence: 0.92,
        rootCause: `Test selector failed to match active DOM structure: "${evidence.browserEvidence?.failedSelector || 'Unknown selector'}".`,
        suggestedActions: [
          'Use getByRole() or getByLabel() with accessible names',
          'Run automated safe test healing via `veloprove heal`'
        ],
        canAutoHeal: true,
        evidenceSignals: signals,
        speculationNotes: ['UI may have changed intentionally; confirm product intent before healing.']
      };
    }

    // 4. Flaky — retries / intermittent signals (before assertion default)
    if (
      (evidence.retryAttempts && evidence.retryAttempts > 1) ||
      combined.includes('flaky') ||
      combined.includes('intermittent') ||
      combined.includes('passed on retry')
    ) {
      return {
        classification: 'FLAKY_TEST',
        confidence: 0.82,
        rootCause: evidence.retryAttempts && evidence.retryAttempts > 1
          ? `Test showed intermittent behavior across ${evidence.retryAttempts} attempts.`
          : 'Failure message indicates flaky/intermittent test behavior.',
        suggestedActions: [
          'Quarantine or stabilize the test with `veloprove stabilize`',
          'Inspect shared state, timing, and async races'
        ],
        canAutoHeal: false,
        evidenceSignals: signals,
        speculationNotes: ['Retries alone do not prove product flake; environment load can contribute.']
      };
    }

    // 5. Environment / Config Failure
    if (
      combined.includes('module not found') ||
      combined.includes('cannot find module') ||
      combined.includes('missing environment variable') ||
      combined.includes('invalid credentials')
    ) {
      return {
        classification: 'CONFIGURATION_FAILURE',
        confidence: 0.9,
        rootCause: 'Missing required configuration, module, or environment variable.',
        suggestedActions: [
          'Ensure .env or test credentials are provided',
          'Run `npm install` to ensure all dependencies are available'
        ],
        canAutoHeal: false,
        evidenceSignals: signals,
        speculationNotes: []
      };
    }

    // 6. Application Bug (Assertion Failure / 500 status code)
    if (
      (combined.includes('expected') && combined.includes('received')) ||
      combined.includes('assertion') ||
      combined.includes('status 500') ||
      combined.includes('internal server error') ||
      combined.includes('to equal') ||
      combined.includes('to be')
    ) {
      return {
        classification: 'APPLICATION_BUG',
        confidence: 0.9,
        rootCause: evidence.assertionDiff
          ? `Value mismatch. Expected "${evidence.assertionDiff.expected}", but received "${evidence.assertionDiff.actual}".`
          : `Assertion failed: ${evidence.errorMessage.slice(0, 150)}`,
        suggestedActions: [
          'Inspect application implementation in the referenced source file',
          'Ask the AI coding agent to review and correct the logic'
        ],
        canAutoHeal: false,
        evidenceSignals: signals,
        speculationNotes: [
          'Assertion failures are classified as application defects by default; outdated expectations would be TEST_BUG if product intent changed.'
        ]
      };
    }

    // 7. Unknown / Fallback
    return {
      classification: 'UNKNOWN',
      confidence: 0.5,
      rootCause: `Uncategorized failure: ${evidence.errorMessage.slice(0, 150)}`,
      suggestedActions: ['Review failure logs and stack trace manually'],
      canAutoHeal: false,
      evidenceSignals: signals,
      speculationNotes: ['Classification is inconclusive — confidence reflects uncertainty, not evidence quality.']
    };
  }
}
