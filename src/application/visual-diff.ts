import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export interface VisualDiffItem {
  snapshotName: string;
  baselinePath: string;
  currentPath: string;
  diffPercentage: number;
  status: 'match' | 'drift_detected' | 'new_baseline';
}

export interface VisualRegressionReport {
  totalSnapshots: number;
  matchingSnapshots: number;
  mismatchedSnapshots: number;
  newSnapshots: number;
  items: VisualDiffItem[];
  timestamp: string;
}

export class VisualDiffService {
  public static compareSnapshots(guard: WorkspaceGuard): VisualRegressionReport {
    const qaDir = guard.getQAForgeDirectory();
    const baselineDir = path.join(qaDir, 'artifacts', 'baselines');
    const currentDir = path.join(qaDir, 'artifacts', 'screenshots');

    if (!fs.existsSync(baselineDir)) {
      fs.mkdirSync(baselineDir, { recursive: true });
    }
    if (!fs.existsSync(currentDir)) {
      fs.mkdirSync(currentDir, { recursive: true });
    }

    const currentFiles = fs.readdirSync(currentDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    const items: VisualDiffItem[] = [];

    let matching = 0;
    let mismatched = 0;
    let newBaselines = 0;

    for (const file of currentFiles) {
      const currentPath = path.join(currentDir, file);
      const baselinePath = path.join(baselineDir, file);

      if (!fs.existsSync(baselinePath)) {
        // Promote current to baseline if no baseline exists
        fs.copyFileSync(currentPath, baselinePath);
        items.push({
          snapshotName: file,
          baselinePath,
          currentPath,
          diffPercentage: 0,
          status: 'new_baseline'
        });
        newBaselines++;
      } else {
        const currentBuf = fs.readFileSync(currentPath);
        const baselineBuf = fs.readFileSync(baselinePath);

        const diffPercentage = this.calculateBufferDiff(currentBuf, baselineBuf);
        const isMatch = diffPercentage < 1.0; // Under 1% pixel drift tolerance

        if (isMatch) {
          matching++;
        } else {
          mismatched++;
        }

        items.push({
          snapshotName: file,
          baselinePath,
          currentPath,
          diffPercentage,
          status: isMatch ? 'match' : 'drift_detected'
        });
      }
    }

    return {
      totalSnapshots: items.length,
      matchingSnapshots: matching,
      mismatchedSnapshots: mismatched,
      newSnapshots: newBaselines,
      items,
      timestamp: new Date().toISOString()
    };
  }

  private static calculateBufferDiff(bufA: Buffer, bufB: Buffer): number {
    if (bufA.length === 0 || bufB.length === 0) return 100;
    if (bufA.equals(bufB)) return 0;

    const minLen = Math.min(bufA.length, bufB.length);
    const maxLen = Math.max(bufA.length, bufB.length);
    let diffBytes = maxLen - minLen;

    for (let i = 0; i < minLen; i++) {
      if (bufA[i] !== bufB[i]) {
        diffBytes++;
      }
    }

    return Math.round((diffBytes / maxLen) * 10000) / 100;
  }
}
