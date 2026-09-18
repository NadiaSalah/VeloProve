import { describe, it, expect } from 'vitest';
import { TestCodeGenerator } from '../../src/domain/tests/test-generator.js';
import type { PlannedTestCase } from '../../src/shared/types/tests.js';

function baseCase(over: Partial<PlannedTestCase>): PlannedTestCase {
  return {
    id: 'REQ-1',
    title: 'Sample case',
    description: 'desc',
    type: 'unit',
    priority: 'high',
    category: 'functional',
    runner: 'vitest',
    reason: 'coverage',
    expectedBehavior: 'works',
    targetFiles: ['src/math.js'],
    requirementIds: [],
    riskScore: 50,
    ...over
  };
}

describe('TestCodeGenerator runner emission', () => {
  it('emits node:test + assert for node:test unit cases', () => {
    const file = TestCodeGenerator.generateTestFile(
      baseCase({ runner: 'node:test', type: 'unit' }),
      process.cwd()
    );
    expect(file.relativePath).toMatch(/\.test\.js$/);
    expect(file.content).toContain("from 'node:test'");
    expect(file.content).toContain("from 'node:assert/strict'");
    expect(file.content).not.toContain("from 'vitest'");
    expect(file.framework).toBe('node:test');
  });

  it('emits node:test for api cases with node:test runner', () => {
    const file = TestCodeGenerator.generateTestFile(
      baseCase({ runner: 'node:test', type: 'api', observedPath: '/api/health', observedStatus: 200 }),
      process.cwd()
    );
    expect(file.content).toContain("from 'node:test'");
    expect(file.content).toContain('assert.equal');
    expect(file.content).not.toContain("from 'vitest'");
  });

  it('emits jest globals for jest runner', () => {
    const file = TestCodeGenerator.generateTestFile(
      baseCase({ runner: 'jest', type: 'unit' }),
      process.cwd()
    );
    expect(file.content).toContain("from '@jest/globals'");
    expect(file.content).not.toContain("from 'vitest'");
  });

  it('keeps vitest for default unit cases', () => {
    const file = TestCodeGenerator.generateTestFile(baseCase({}), process.cwd());
    expect(file.content).toContain("from 'vitest'");
  });
});
