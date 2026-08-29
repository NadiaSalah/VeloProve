import fs from 'node:fs';
import path from 'node:path';
import type { QAForgeEngine } from './engine.js';

export class WatchModeService {
  public static startWatch(
    engine: QAForgeEngine,
    onIteration?: (info: { changedFile: string; impactedTests: string[]; status: 'passed' | 'failed' }) => void
  ): { close: () => void } {
    const root = engine.guard.getRoot();
    let debounceTimer: NodeJS.Timeout | null = null;
    let isRunning = false;

    const watcher = fs.watch(root, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      const norm = filename.replace(/\\/g, '/');
      if (
        norm.includes('node_modules') ||
        norm.includes('.git') ||
        norm.includes('.qaforge') ||
        norm.includes('dist') ||
        norm.includes('.next')
      ) {
        return;
      }

      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(async () => {
        if (isRunning) return;
        isRunning = true;

        try {
          const { profile } = await engine.inspect();
          const impact = await engine.changed();
          const testsToRun = impact.impactedTestFiles.length > 0
            ? impact.impactedTestFiles
            : [norm];

          const runResult = await engine.run({ paths: testsToRun });

          onIteration?.({
            changedFile: norm,
            impactedTests: testsToRun,
            status: runResult.status === 'passed' ? 'passed' : 'failed'
          });
        } catch {
          // ignore watch errors
        } finally {
          isRunning = false;
        }
      }, 300);
    });

    return {
      close: () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        watcher.close();
      }
    };
  }
}
