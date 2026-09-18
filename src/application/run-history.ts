import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { LocalStorage } from '../storage/local-store.js';
import type { TestRunResult } from '../shared/types/tests.js';
import type { FlakyTestReport } from '../shared/types/release.js';

export interface HistoryPoint {
  runId: string;
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  passRate: number;
  status: string;
  /** Best-effort git branch at record time */
  branch?: string;
}

export interface BranchVelocityStats {
  branch: string;
  runCount: number;
  avgPassRate: number;
  failStreak: number;
  /** Mean time to recover (hours) from fail→pass transitions on this branch */
  mttrHours: number | null;
  /** Pass-rate delta vs previous run on the same branch (percentage points) */
  velocityDelta: number | null;
  regressionAlert: boolean;
}

export interface RunHistorySnapshot {
  schemaVersion: '1';
  updatedAt: string;
  points: HistoryPoint[];
  aggregates: {
    runCount: number;
    avgPassRate: number;
    avgDurationMs: number;
    flakyCount: number;
    lastSecurityScore?: number;
    /** Cross-branch regression / MTTR summary */
    branchStats?: BranchVelocityStats[];
    currentBranch?: string;
    currentMttrHours?: number | null;
    regressionAlert?: boolean;
  };
  charts: {
    passRate: number[];
    durationMs: number[];
  };
}

const MAX_POINTS = 50;
/** Alert when pass rate drops by this many percentage points vs prior run on same branch */
const REGRESSION_DROP_PP = 15;

export class RunHistoryService {
  public static historyPath(guard: WorkspaceGuard): string {
    const stateDir = path.join(guard.getVeloProveDirectory(), 'state');
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    return path.join(stateDir, 'history.json');
  }

  public static detectBranch(guard: WorkspaceGuard): string | undefined {
    try {
      const out = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: guard.getRoot(),
        encoding: 'utf8',
        timeout: 3000,
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();
      return out && out !== 'HEAD' ? out : undefined;
    } catch {
      return undefined;
    }
  }

  public static rebuild(guard: WorkspaceGuard, storage: LocalStorage): RunHistorySnapshot {
    const runs = storage.getAllTestRuns().slice(0, MAX_POINTS);
    const flaky = storage.getFlakyHistory();
    return RunHistoryService.persist(guard, runs, flaky);
  }

  public static recordRun(
    guard: WorkspaceGuard,
    storage: LocalStorage,
    run: TestRunResult
  ): RunHistorySnapshot {
    const existing = RunHistoryService.load(guard);
    const point = RunHistoryService.toPoint(run, RunHistoryService.detectBranch(guard));
    const points = [point, ...(existing?.points || []).filter((p) => p.runId !== point.runId)].slice(
      0,
      MAX_POINTS
    );
    const flaky = storage.getFlakyHistory();
    return RunHistoryService.write(guard, points, flaky, existing?.aggregates.lastSecurityScore);
  }

  public static load(guard: WorkspaceGuard): RunHistorySnapshot | null {
    const file = RunHistoryService.historyPath(guard);
    if (!fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8')) as RunHistorySnapshot;
    } catch {
      return null;
    }
  }

  public static recordSecurityScore(guard: WorkspaceGuard, score: number): void {
    const current = RunHistoryService.load(guard);
    if (!current) return;
    current.aggregates.lastSecurityScore = score;
    current.updatedAt = new Date().toISOString();
    fs.writeFileSync(RunHistoryService.historyPath(guard), JSON.stringify(current, null, 2), 'utf8');
  }

  /** Compute per-branch velocity / MTTR from chronological points (oldest → newest). */
  public static computeBranchStats(points: HistoryPoint[]): BranchVelocityStats[] {
    const byBranch = new Map<string, HistoryPoint[]>();
    // points are newest-first in storage; reverse for chronology
    const chrono = [...points].reverse();
    for (const p of chrono) {
      const b = p.branch || 'unknown';
      if (!byBranch.has(b)) byBranch.set(b, []);
      byBranch.get(b)!.push(p);
    }

    const stats: BranchVelocityStats[] = [];
    for (const [branch, list] of byBranch) {
      const avgPassRate =
        list.length > 0
          ? Math.round((list.reduce((s, p) => s + p.passRate, 0) / list.length) * 10) / 10
          : 0;

      let failStreak = 0;
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].failed > 0 || list[i].status === 'failed') failStreak += 1;
        else break;
      }

      const recoveries: number[] = [];
      let failStart: string | null = null;
      for (const p of list) {
        const failing = p.failed > 0 || p.status === 'failed';
        if (failing && !failStart) failStart = p.timestamp;
        if (!failing && failStart) {
          const ms = Date.parse(p.timestamp) - Date.parse(failStart);
          if (Number.isFinite(ms) && ms >= 0) recoveries.push(ms / 3_600_000);
          failStart = null;
        }
      }
      const mttrHours =
        recoveries.length > 0
          ? Math.round((recoveries.reduce((a, b) => a + b, 0) / recoveries.length) * 100) / 100
          : null;

      const last = list[list.length - 1];
      const prev = list.length > 1 ? list[list.length - 2] : undefined;
      const velocityDelta =
        last && prev ? Math.round((last.passRate - prev.passRate) * 10) / 10 : null;
      const regressionAlert =
        velocityDelta !== null && velocityDelta <= -REGRESSION_DROP_PP;

      stats.push({
        branch,
        runCount: list.length,
        avgPassRate,
        failStreak,
        mttrHours,
        velocityDelta,
        regressionAlert
      });
    }
    return stats.sort((a, b) => b.runCount - a.runCount);
  }

  private static toPoint(run: TestRunResult, branch?: string): HistoryPoint {
    const total = run.summary.total || 0;
    const passed = run.summary.passed || 0;
    return {
      runId: run.runId,
      timestamp: run.timestamp,
      total,
      passed,
      failed: run.summary.failed || 0,
      durationMs: run.durationMs || 0,
      passRate: total > 0 ? Math.round((passed / total) * 1000) / 10 : 0,
      status: run.status,
      branch
    };
  }

  private static persist(
    guard: WorkspaceGuard,
    runs: TestRunResult[],
    flaky: FlakyTestReport[]
  ): RunHistorySnapshot {
    const branch = RunHistoryService.detectBranch(guard);
    const points = runs.map((r) => RunHistoryService.toPoint(r, branch));
    return RunHistoryService.write(guard, points, flaky);
  }

  private static write(
    guard: WorkspaceGuard,
    points: HistoryPoint[],
    flaky: FlakyTestReport[],
    lastSecurityScore?: number
  ): RunHistorySnapshot {
    const avgPassRate =
      points.length > 0
        ? Math.round((points.reduce((s, p) => s + p.passRate, 0) / points.length) * 10) / 10
        : 0;
    const avgDurationMs =
      points.length > 0
        ? Math.round(points.reduce((s, p) => s + p.durationMs, 0) / points.length)
        : 0;

    const branchStats = RunHistoryService.computeBranchStats(points);
    const currentBranch = points[0]?.branch || RunHistoryService.detectBranch(guard);
    const current = branchStats.find((s) => s.branch === currentBranch) || branchStats[0];

    const snapshot: RunHistorySnapshot = {
      schemaVersion: '1',
      updatedAt: new Date().toISOString(),
      points,
      aggregates: {
        runCount: points.length,
        avgPassRate,
        avgDurationMs,
        flakyCount: flaky.length,
        lastSecurityScore,
        branchStats,
        currentBranch,
        currentMttrHours: current?.mttrHours ?? null,
        regressionAlert: current?.regressionAlert || branchStats.some((s) => s.regressionAlert)
      },
      charts: {
        passRate: [...points].reverse().map((p) => p.passRate),
        durationMs: [...points].reverse().map((p) => p.durationMs)
      }
    };

    fs.writeFileSync(RunHistoryService.historyPath(guard), JSON.stringify(snapshot, null, 2), 'utf8');
    return snapshot;
  }
}
