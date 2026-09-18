/**
 * Conservative policy for automatic edits performed by VeloProve.
 * Application business logic must never be silently rewritten.
 */

export type FixSafetyClass = 'SAFE' | 'REVIEW_REQUIRED' | 'PROHIBITED_AUTOMATIC';

export interface FixPolicyDecision {
  classification: FixSafetyClass;
  reason: string;
  mayAutoApply: boolean;
}

const SAFE_PATH_HINTS = [
  /\.test\.[jt]sx?$/i,
  /\.spec\.[jt]sx?$/i,
  /\/__tests__\//i,
  /\/tests?\//i,
  /veloprove\.generated/i,
  /\.feature$/i
];

const REVIEW_PATH_HINTS = [
  /auth/i,
  /session/i,
  /payment/i,
  /billing/i,
  /checkout/i,
  /security/i,
  /middleware/i,
  /prisma/i,
  /migration/i,
  /\/api\//i
];

const PROHIBITED_HINTS = [
  /\.env/i,
  /credentials/i,
  /private[_-]?key/i,
  /id_rsa/i,
  /secret/i
];

export class FixSafetyPolicy {
  public static classifyFileEdit(relativePath: string, kind: 'test-heal' | 'app-fix' | 'generated'): FixPolicyDecision {
    const path = relativePath.replace(/\\/g, '/');

    if (PROHIBITED_HINTS.some((r) => r.test(path))) {
      return {
        classification: 'PROHIBITED_AUTOMATIC',
        reason: 'Path looks secrets- or credential-related',
        mayAutoApply: false
      };
    }

    if (kind === 'test-heal' || kind === 'generated') {
      if (SAFE_PATH_HINTS.some((r) => r.test(path))) {
        return {
          classification: 'SAFE',
          reason: 'Edit targets generated/test surfaces only',
          mayAutoApply: true
        };
      }
      return {
        classification: 'REVIEW_REQUIRED',
        reason: 'Heal/generated edit outside known test paths',
        mayAutoApply: false
      };
    }

    // app-fix
    if (REVIEW_PATH_HINTS.some((r) => r.test(path))) {
      return {
        classification: 'REVIEW_REQUIRED',
        reason: 'Application path touches auth/payment/API/security-sensitive areas',
        mayAutoApply: false
      };
    }

    return {
      classification: 'REVIEW_REQUIRED',
      reason: 'Application source edits always require review by default',
      mayAutoApply: false
    };
  }
}
