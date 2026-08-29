import { describe, it, expect } from 'vitest';
import { FailureClassifier } from '../../src/diagnostics/classifier.js';
import type { FailureEvidence } from '../../src/shared/types/diagnostics.js';

describe('Failure Classifier Engine', () => {
  it('should classify locator not found as TEST_BUG with healable flag', () => {
    const evidence: FailureEvidence = {
      testId: 'e2e-login',
      testName: 'should login user',
      testFile: 'tests/e2e/login.spec.ts',
      errorMessage: 'locator.click: Timeout 5000ms waiting for locator("#submit-btn")',
      browserEvidence: {
        failedSelector: '#submit-btn'
      }
    };

    const outcome = FailureClassifier.classify(evidence);
    expect(outcome.classification).toBe('TEST_BUG');
    expect(outcome.canAutoHeal).toBe(true);
    expect(outcome.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('should classify value mismatch as APPLICATION_BUG', () => {
    const evidence: FailureEvidence = {
      testId: 'unit-calc',
      testName: 'should calculate total discount',
      testFile: 'tests/unit/calc.test.ts',
      errorMessage: 'Expected: 80, Received: 100',
      assertionDiff: {
        expected: '80',
        actual: '100'
      }
    };

    const outcome = FailureClassifier.classify(evidence);
    expect(outcome.classification).toBe('APPLICATION_BUG');
    expect(outcome.canAutoHeal).toBe(false);
    expect(outcome.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('should classify connection refused as NETWORK_FAILURE', () => {
    const evidence: FailureEvidence = {
      testId: 'api-checkout',
      testName: 'should call checkout endpoint',
      testFile: 'tests/api/checkout.test.ts',
      errorMessage: 'fetch failed: connect ECONNREFUSED 127.0.0.1:3000'
    };

    const outcome = FailureClassifier.classify(evidence);
    expect(outcome.classification).toBe('NETWORK_FAILURE');
    expect(outcome.canAutoHeal).toBe(false);
  });
});
