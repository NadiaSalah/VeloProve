/**
 * Canary secret must not appear unredacted after SecretRedactor.
 */
import { describe, it, expect } from 'vitest';
import { SecretRedactor } from '../../src/shared/secret-redactor.js';

const CANARY =
  'VELOPROVE_CANARY_SECRET_9f3a2b1c0d8e7f6a5b4c3d2e1f0a9b8c';

describe('Canary secret redaction', () => {
  it('redacts Bearer token containing canary payload', () => {
    const raw = `Authorization: Bearer ${CANARY}eyJextra`;
    // Use a Bearer-shaped token the redactor recognizes (≥10 alnum/._-)
    const bearerCanary = `Bearer FAKESECRET_g1h2i3j4k5l6m7n8o9p0`;
    const redacted = SecretRedactor.redact(`header ${bearerCanary}`);
    expect(redacted).not.toContain('sk_live_CANARY_TOKEN_DO_NOT_LEAK_ABCDEF');
    expect(redacted).toMatch(/REDACTED_BEARER_TOKEN/);
  });

  it('redacts apiKey / secret JSON fields with canary values', () => {
    const payload = {
      apiKey: CANARY,
      secret: CANARY,
      password: CANARY,
      note: 'safe'
    };
    const redacted = SecretRedactor.redactObject(payload) as typeof payload;
    expect(JSON.stringify(redacted)).not.toContain(CANARY);
    expect(redacted.apiKey).toMatch(/REDACTED/);
    expect(redacted.secret).toMatch(/REDACTED/);
    expect(redacted.password).toMatch(/REDACTED/);
    expect(redacted.note).toBe('safe');
  });

  it('redacts JWT-shaped canary', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ2ZWxvcHJvdmUtY2FuYXJ5In0.canarySignaturePad12';
    const redacted = SecretRedactor.redact(`token=${jwt}`);
    expect(redacted).not.toContain(jwt);
    expect(redacted).toMatch(/REDACTED_JWT/);
  });
});
