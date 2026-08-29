import { SafeProcessRunner } from '../../execution/process-runner.js';
import type { WorkspaceGuard } from '../../execution/workspace-guard.js';

export interface ChangedFile {
  filePath: string;
  relativePath: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked';
}

export class GitDiffAnalyzer {
  public static async getChangedFiles(guard: WorkspaceGuard): Promise<ChangedFile[]> {
    const runner = new SafeProcessRunner(guard);
    const changedFiles: ChangedFile[] = [];

    try {
      // 1. Check git status
      const statusRes = await runner.run('git', ['status', '--porcelain'], {
        cwd: guard.getRoot()
      });

      if (statusRes.exitCode === 0 && statusRes.stdout.trim().length > 0) {
        const lines = statusRes.stdout.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          const statusCode = trimmed.slice(0, 2).trim();
          const rawRelPath = trimmed.slice(2).trim().replace(/^"|"$/g, '');
          const relativePath = rawRelPath.replace(/\\/g, '/');
          const filePath = guard.resolveSafePath(relativePath);

          let status: ChangedFile['status'] = 'modified';
          if (statusCode === '??') status = 'untracked';
          else if (statusCode === 'A') status = 'added';
          else if (statusCode === 'D') status = 'deleted';

          changedFiles.push({
            filePath,
            relativePath,
            status
          });
        }
      }
    } catch {
      // Not a git repository or git not available
    }

    return changedFiles;
  }
}
