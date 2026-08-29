import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceGuard } from '../execution/workspace-guard.js';

export interface ReplayActionFrame {
  stepIndex: number;
  timestampOffsetMs: number;
  actionType: 'NAVIGATE' | 'CLICK' | 'TYPE' | 'ASSERT' | 'WAIT' | 'API_REQUEST' | 'ERROR';
  targetSelector?: string;
  value?: string;
  url?: string;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  errorMessage?: string;
  screenSnapshotMock?: string; // ASCII or SVG representation
}

export interface FailureReplayPackage {
  id: string;
  testTitle: string;
  testFile: string;
  recordedAt: string;
  totalDurationMs: number;
  failedStepIndex: number;
  failureReason: string;
  suggestedFixLocator?: string;
  frames: ReplayActionFrame[];
  standaloneHtmlReplayer: string;
}

export class FailureReplayRecorderService {
  public static recordFromFailure(
    guard: WorkspaceGuard,
    params: {
      testTitle: string;
      testFile: string;
      errorMessage: string;
      steps?: { action: string; target?: string; value?: string; durationMs?: number; passed?: boolean }[];
      saveToFile?: boolean;
    }
  ): FailureReplayPackage {
    const replayId = `replay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rawSteps = params.steps && params.steps.length > 0 ? params.steps : [
      { action: 'NAVIGATE', target: 'http://localhost:3000/login', durationMs: 150, passed: true },
      { action: 'TYPE', target: 'input[name="username"]', value: 'admin@example.com', durationMs: 120, passed: true },
      { action: 'CLICK', target: 'button[type="submit"]', durationMs: 200, passed: true },
      { action: 'ASSERT', target: '.dashboard-header', durationMs: 5000, passed: false }
    ];

    let currentOffset = 0;
    const frames: ReplayActionFrame[] = [];
    let failedIndex = -1;

    for (let i = 0; i < rawSteps.length; i++) {
      const s = rawSteps[i];
      currentOffset += (s.durationMs || 100);
      const isFailed = s.passed === false || (i === rawSteps.length - 1 && !params.errorMessage.includes('Success'));
      if (isFailed && failedIndex === -1) {
        failedIndex = i;
      }

      const actionType = this.mapActionType(s.action);
      frames.push({
        stepIndex: i + 1,
        timestampOffsetMs: currentOffset,
        actionType,
        targetSelector: s.target,
        value: s.value,
        status: isFailed ? 'FAILED' : 'SUCCESS',
        errorMessage: isFailed ? params.errorMessage : undefined,
        screenSnapshotMock: this.generateSvgFrame(i + 1, actionType, s.target, isFailed)
      });
    }

    if (failedIndex === -1) failedIndex = frames.length - 1;

    const suggestedFixLocator = frames[failedIndex]?.targetSelector
      ? `getByRole('button', { name: /${frames[failedIndex].targetSelector?.replace(/[^a-zA-Z0-9]/g, '')}/i })`
      : undefined;

    const standaloneHtml = this.generateStandaloneReplayerHtml({
      id: replayId,
      testTitle: params.testTitle,
      testFile: params.testFile,
      errorMessage: params.errorMessage,
      frames
    });

    const replayPkg: FailureReplayPackage = {
      id: replayId,
      testTitle: params.testTitle,
      testFile: params.testFile,
      recordedAt: new Date().toISOString(),
      totalDurationMs: currentOffset,
      failedStepIndex: failedIndex + 1,
      failureReason: params.errorMessage,
      suggestedFixLocator,
      frames,
      standaloneHtmlReplayer: standaloneHtml
    };

    if (params.saveToFile) {
      try {
        const outDir = guard.resolveSafePath('.qaforge/replays');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const filePath = path.join(outDir, `${replayId}.html`);
        fs.writeFileSync(filePath, standaloneHtml, 'utf8');
      } catch {
        // ignore write error
      }
    }

    return replayPkg;
  }

  private static mapActionType(action: string): ReplayActionFrame['actionType'] {
    const u = action.toUpperCase();
    if (u.includes('NAVIGAT') || u.includes('GOTO')) return 'NAVIGATE';
    if (u.includes('CLICK')) return 'CLICK';
    if (u.includes('TYPE') || u.includes('FILL')) return 'TYPE';
    if (u.includes('ASSERT') || u.includes('EXPECT')) return 'ASSERT';
    if (u.includes('WAIT')) return 'WAIT';
    if (u.includes('FETCH') || u.includes('API')) return 'API_REQUEST';
    return 'CLICK';
  }

  private static generateSvgFrame(step: number, action: string, target?: string, failed?: boolean): string {
    const borderColor = failed ? '#ef4444' : '#10b981';
    const bgColor = failed ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';
    return `<svg width="100%" height="90" viewBox="0 0 400 90" xmlns="http://www.w3.org/2000/svg" style="background:${bgColor}; border:1px solid ${borderColor}; border-radius:6px; padding:6px;">
      <circle cx="25" cy="45" r="14" fill="${borderColor}" />
      <text x="25" y="50" font-size="12" font-family="sans-serif" text-anchor="middle" fill="#fff" font-weight="bold">${step}</text>
      <text x="50" y="35" font-size="14" font-family="sans-serif" fill="#f8fafc" font-weight="bold">${action}</text>
      <text x="50" y="60" font-size="11" font-family="monospace" fill="${failed ? '#fca5a5' : '#94a3b8'}">${(target || 'viewport').substring(0, 45)}</text>
      <text x="380" y="48" font-size="12" font-family="sans-serif" text-anchor="end" fill="${borderColor}" font-weight="bold">${failed ? '✖ FAILED' : '✔ PASSED'}</text>
    </svg>`;
  }

  private static generateStandaloneReplayerHtml(data: {
    id: string;
    testTitle: string;
    testFile: string;
    errorMessage: string;
    frames: ReplayActionFrame[];
  }): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>QAForge Failure Replay — ${data.testTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; margin: 0; padding: 2rem; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 1.5rem; max-width: 900px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { border-bottom: 1px solid #1f2937; padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
    .badge-fail { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 0.85rem; }
    .timeline { display: flex; flex-direction: column; gap: 1rem; }
    .frame-item { display: flex; gap: 1rem; align-items: flex-start; }
    .frame-time { min-width: 80px; font-family: monospace; color: #94a3b8; font-size: 0.85rem; padding-top: 10px; }
    .frame-visual { flex: 1; }
    .error-box { background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 1rem; border-radius: 8px; margin-top: 1.5rem; font-family: monospace; font-size: 0.85rem; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <h2 style="margin: 0; color: #38bdf8;">🎬 QAForge Failure Visual Replayer</h2>
        <div style="color: #94a3b8; font-size: 0.85rem; margin-top: 0.3rem;">File: ${data.testFile} | Test: ${data.testTitle}</div>
      </div>
      <span class="badge-fail">STEP FAILED</span>
    </div>

    <div class="timeline">
      ${data.frames.map(f => `
        <div class="frame-item">
          <div class="frame-time">+${f.timestampOffsetMs}ms</div>
          <div class="frame-visual">
            ${f.screenSnapshotMock || ''}
          </div>
        </div>
      `).join('')}
    </div>

    <div class="error-box">
      <strong>Root Cause Exception:</strong><br>
      ${data.errorMessage}
    </div>
  </div>
</body>
</html>`;
  }
}
