import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { login } from '../src/auth.js';
import { acceptContact } from '../src/validate.js';

describe('auth', () => {
  it('rejects empty password', () => {
    const res = login('alice', '');
    assert.equal(res.ok, false);
    assert.equal(res.status, 401);
  });
});

describe('validation', () => {
  it('rejects malformed email', () => {
    const res = acceptContact({ email: 'not-an-email' });
    assert.equal(res.ok, false);
    assert.equal(res.status, 400);
  });
});
