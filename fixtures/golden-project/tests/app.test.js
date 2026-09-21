/** Authored unit test — hash-locked; generate must not overwrite without policy. */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { greet, health } from '../src/app.js';

describe('golden app', () => {
  it('health ok', () => {
    assert.equal(health().ok, true);
  });

  it('greets by name', () => {
    const r = greet('Ada');
    assert.equal(r.ok, true);
    assert.match(r.message, /Ada/);
  });
});
