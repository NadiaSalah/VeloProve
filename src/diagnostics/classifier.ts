import type { FailureEvidence, FailureClassification } from '../shared/types/diagnostics.js';

export interface ClassificationOutcome {
  classification: FailureClassification;
  confidence: number;
  rootCause: string;
  suggestedActions: string[];
  canAutoHeal: boolean;
}

export class FailureClassifier {
  public static classify(evidence: FailureEvidence): ClassificationOutcome {
    const msg = (evidence.errorMessage || '').toLowerCase();
    const stack = (evidence.stackTrace || '').toLowerCase();
    const combined = `${msg} \n ${stack}`;

    // 1. Network / Connection Failures
    if (combined.includes('econnrefused') || combined.includes('enotfound') || combined.includes('fetch failed')) {
      return {
        classification: 'NETWORK_FAILURE',
        confidence: 0.95,
        rootCause: 'Target service or dev server was not reachable at requested URL.',
        suggestedActions: [
          'Verify that the local dev server / API backend is running',
          'Check host and port configuration in qaforge.config.json or environment variables'
        ],
        canAutoHeal: false
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
            'Run `qaforge heal` to repair stale locators automatically'
          ],
          canAutoHeal: true
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
        canAutoHeal: false
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
          'Run automated safe test healing via `qaforge heal`'
        ],
        canAutoHeal: true
      };
    }

    // 4. Environment / Config Failure
    if (
      combined.includes('module not found') ||
      combined.includes('cannot find module') ||
      combined.includes('missing environment variable') ||
      combined.includes('invalid credentials')
    ) {
      return {
        classification: 'CONFIGURATION_FAILURE',
        confidence: 0.90,
        rootCause: 'Missing required configuration, module, or environment variable.',
        suggestedActions: [
          'Ensure .env or test credentials are provided',
          'Run `npm install` to ensure all dependencies are available'
        ],
        canAutoHeal: false
      };
    }

    // 5. Application Bug (Assertion Failure / 500 status code)
    if (
      combined.includes('expected') && combined.includes('received') ||
      combined.includes('assertion') ||
      combined.includes('status 500') ||
      combined.includes('internal server error') ||
      combined.includes('to equal') ||
      combined.includes('to be')
    ) {
      return {
        classification: 'APPLICATION_BUG',
        confidence: 0.90,
        rootCause: evidence.assertionDiff
          ? `Value mismatch. Expected "${evidence.assertionDiff.expected}", but received "${evidence.assertionDiff.actual}".`
          : `Assertion failed: ${evidence.errorMessage.slice(0, 150)}`,
        suggestedActions: [
          'Inspect application implementation in the referenced source file',
          'Ask the AI coding agent to review and correct the logic'
        ],
        canAutoHeal: false
      };
    }

    // 6. Unknown / Fallback
    return {
      classification: 'UNKNOWN',
      confidence: 0.50,
      rootCause: `Uncategorized failure: ${evidence.errorMessage.slice(0, 150)}`,
      suggestedActions: [
        'Review failure logs and stack trace manually'
      ],
      canAutoHeal: false
    };
  }
}
