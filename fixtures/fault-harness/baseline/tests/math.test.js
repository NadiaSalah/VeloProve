import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { add } from '../src/math.js';

describe('math', () => {
  it('adds two numbers', () => {
    assert.equal(add(2, 3), 5);
  });
});
