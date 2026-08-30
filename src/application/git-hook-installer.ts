import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export interface HookInstallResult {
  installed: boolean;
  hookPath: string;
  hookType: 'git-native' | 'husky';
  message: string;
}

export class GitHookInstallerService {
  public static installPreCommit(guard: WorkspaceGuard, command = 'npx qaforge changed'): HookInstallResult {
    const root = guard.getRoot();
    const gitDir = path.join(root, '.git');
    const huskyDir = path.join(root, '.husky');

    if (fs.existsSync(huskyDir)) {
      const huskyPreCommit = path.join(huskyDir, 'pre-commit');
      const hookContent = `#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\n\n${command}\n`;
      fs.writeFileSync(huskyPreCommit, hookContent, { mode: 0o755 });
      return {
        installed: true,
        hookPath: huskyPreCommit,
        hookType: 'husky',
        message: `Configured Husky pre-commit hook to run "${command}".`
      };
    }

    if (fs.existsSync(gitDir)) {
      const hooksDir = path.join(gitDir, 'hooks');
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
      }
      const preCommitPath = path.join(hooksDir, 'pre-commit');
      const hookContent = `#!/bin/sh\n# QAForge Autonomous Pre-Commit Hook\n${command}\n`;
      fs.writeFileSync(preCommitPath, hookContent, { mode: 0o755 });
      return {
        installed: true,
        hookPath: preCommitPath,
        hookType: 'git-native',
        message: `Installed native .git/hooks/pre-commit to execute "${command}".`
      };
    }

    return {
      installed: false,
      hookPath: '',
      hookType: 'git-native',
      message: 'No .git directory found. Initialize a git repository before installing hooks.'
    };
  }

  public static uninstallPreCommit(guard: WorkspaceGuard): { uninstalled: boolean; message: string } {
    const root = guard.getRoot();
    const gitPreCommit = path.join(root, '.git', 'hooks', 'pre-commit');
    const huskyPreCommit = path.join(root, '.husky', 'pre-commit');

    let removed = false;
    if (fs.existsSync(gitPreCommit)) {
      fs.unlinkSync(gitPreCommit);
      removed = true;
    }
    if (fs.existsSync(huskyPreCommit)) {
      fs.unlinkSync(huskyPreCommit);
      removed = true;
    }

    return {
      uninstalled: removed,
      message: removed ? 'Pre-commit hook removed successfully.' : 'No active pre-commit hook found.'
    };
  }
}
