import fs from 'node:fs';
import type { VeloProveEngine } from './engine.js';

export interface WatchModeOptions {
  /** Also run change-aware verify instead of impacted unit tests only */
  verify?: boolean;
  /** Optional interval (ms) for scheduled verify while watching (in addition to file events) */
  intervalMs?: number;
}

export class WatchModeService {
  public static startWatch(
    engine: VeloProveEngine,
    onIteration?: (info: {
      changedFile: string;
      impactedTests: string[];
      status: 'passed' | 'failed';
      mode?: 'watch' | 'verify' | 'interval';
    }) => void,
    options: WatchModeOptions = {}
  ): { close: () => void } {
    const root = engine.guard.getRoot();
    let debounceTimer: NodeJS.Timeout | null = null;
    let intervalTimer: NodeJS.Timeout | null = null;
    let isRunning = false;

    const runOnce = async (changedFile: string, mode: 'watch' | 'verify' | 'interval') => {
      if (isRunning) return;
      isRunning = true;
      try {
        if (options.verify || mode === 'verify' || mode === 'interval') {
          const result = await engine.verify({ fullSuite: false });
          const status = result.success ? 'passed' : 'failed';
          onIteration?.({
            changedFile,
            impactedTests: result.data?.selection?.selectedTests || [],
            status,
            mode: mode === 'interval' ? 'interval' : 'verify'
          });
          return;
        }

        await engine.inspect();
        const impact = await engine.changed();
        const testsToRun = impact.impactedTestFiles.length > 0
          ? impact.impactedTestFiles
          : [changedFile];
        const runResult = await engine.run({ paths: testsToRun });
        onIteration?.({
          changedFile,
          impactedTests: testsToRun,
          status: runResult.status === 'passed' ? 'passed' : 'failed',
          mode: 'watch'
        });
      } catch {
        // ignore watch errors
      } finally {
        isRunning = false;
      }
    };

    const watcher = fs.watch(root, { recursive: true }, (_eventType, filename) => {
      if (!filename) return;
      const norm = filename.replace(/\\/g, '/');
      if (
        norm.includes('node_modules') ||
        norm.includes('.git') ||
        norm.includes('.veloprove') ||
        norm.includes('dist') ||
        norm.includes('.next')
      ) {
        return;
      }

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void runOnce(norm, options.verify ? 'verify' : 'watch');
      }, 300);
    });

    if (options.intervalMs && options.intervalMs >= 5000) {
      intervalTimer = setInterval(() => {
        void runOnce('(interval)', 'interval');
      }, options.intervalMs);
    }

    return {
      close: () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (intervalTimer) clearInterval(intervalTimer);
        watcher.close();
      }
    };
  }
}
