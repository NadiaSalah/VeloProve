import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';

describe('WorkspaceGuard', () => {
  const root = path.resolve(process.cwd());
  const guard = new WorkspaceGuard(root);

  it('should allow relative paths within project root', () => {
    const resolved = guard.resolveSafePath('src/index.ts');
    expect(resolved).toBe(path.join(root, 'src', 'index.ts'));
    expect(guard.isWithinWorkspace('src/index.ts')).toBe(true);
  });

  it('should block directory traversal escaping root', () => {
    expect(() => {
      guard.resolveSafePath('../../../outside-file.txt');
    }).toThrow(/Security Violation/);

    expect(guard.isWithinWorkspace('../../../outside-file.txt')).toBe(false);
  });
});
