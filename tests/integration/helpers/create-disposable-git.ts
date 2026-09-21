/**
 * Creates a disposable temp git repo with two commits for changed/bisect exercises.
 * Mirrors fixtures/git-disposable/create-repo.mjs for TypeScript/vitest imports.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

export interface DisposableGitRepo {
  dir: string;
  commitA: string;
  commitB: string;
  cleanup: () => void;
}

function git(cwd: string, args: string[]): string {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${res.stderr || res.stdout}`);
  }
  return (res.stdout || '').trim();
}

export function createDisposableGitRepo(): DisposableGitRepo {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-git-disposable-'));
  git(dir, ['init']);
  git(dir, ['config', 'user.email', 'veloprove-test@example.com']);
  git(dir, ['config', 'user.name', 'VeloProve Fixture']);

  fs.writeFileSync(
    path.join(dir, 'products.json'),
    JSON.stringify({ name: 'Travel Pack' }, null, 2),
    'utf8'
  );
  git(dir, ['add', 'products.json']);
  git(dir, ['commit', '-m', 'commit-a: Travel Pack']);
  const commitA = git(dir, ['rev-parse', 'HEAD']);

  fs.writeFileSync(
    path.join(dir, 'products.json'),
    JSON.stringify({ name: 'Adventure Kit' }, null, 2),
    'utf8'
  );
  git(dir, ['add', 'products.json']);
  git(dir, ['commit', '-m', 'commit-b: Adventure Kit']);
  const commitB = git(dir, ['rev-parse', 'HEAD']);

  return {
    dir,
    commitA,
    commitB,
    cleanup: () => {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  };
}
