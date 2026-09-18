import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import type { DiagnosticResult } from '../shared/types/diagnostics.js';
import type { TestRunResult } from '../shared/types/tests.js';
import { FailureReplayRecorderService } from './failure-replay-recorder.js';
import { redactSecrets } from '../execution/process-runner.js';

export interface EvidencePackResult {
  packDir: string;
  indexPath: string;
  files: string[];
  failureCount: number;
  /** Absolute path to pack-index.json (agent entrypoint) */
  packIndexPath: string;
  /** Absolute path to evidence.zip when created */
  zipPath?: string;
}

/** Minimal ZIP (STORE only) so we avoid new dependencies. */
function writeStoredZip(zipPath: string, entries: Array<{ name: string; data: Buffer }>): void {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name.replace(/\\/g, '/'), 'utf8');
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8); // STORE
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(0, 14); // crc optional 0 for tooling that ignores
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);
    parts.push(local, entry.data);

    const cen = Buffer.alloc(46 + nameBuf.length);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(0, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt16LE(0, 14);
    cen.writeUInt32LE(0, 16);
    cen.writeUInt32LE(entry.data.length, 20);
    cen.writeUInt32LE(entry.data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt16LE(0, 30);
    cen.writeUInt16LE(0, 32);
    cen.writeUInt16LE(0, 34);
    cen.writeUInt16LE(0, 36);
    cen.writeUInt32LE(0, 38);
    cen.writeUInt32LE(offset, 42);
    nameBuf.copy(cen, 46);
    central.push(cen);
    offset += local.length + entry.data.length;
  }

  const centralSize = central.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  fs.writeFileSync(zipPath, Buffer.concat([...parts, ...central, end]));
}

/**
 * Bundle diagnose + replay + run summary into one agent-ready folder (schema v2).
 */
export class FailureEvidencePackService {
  public static pack(options: {
    guard: WorkspaceGuard;
    run?: TestRunResult | null;
    diagnoses?: DiagnosticResult[];
    runId?: string;
  }): EvidencePackResult {
    const root = options.guard.getRoot();
    const runId = options.runId || options.run?.runId || `pack_${Date.now()}`;
    const packDir = path.join(root, '.veloprove', 'evidence', runId);
    fs.mkdirSync(packDir, { recursive: true });
    const files: string[] = [];

    const failed = (options.run?.testResults || []).filter((r) => r.status === 'failed');
    const diagnoses = options.diagnoses || [];

    const consoleLines: string[] = [];
    const networkLines: string[] = [];
    const artifactIndex: Array<{ testId: string; type: string; file: string }> = [];

    for (const [i, f] of failed.slice(0, 10).entries()) {
      for (const art of f.artifacts || []) {
        if (!art.path) continue;
        if (art.type === 'console_log' && fs.existsSync(art.path)) {
          try {
            consoleLines.push(`--- ${f.id} ---\n${fs.readFileSync(art.path, 'utf8').slice(0, 4000)}`);
          } catch { /* skip */ }
        }
        if (art.type === 'network_log' && fs.existsSync(art.path)) {
          try {
            networkLines.push(`--- ${f.id} ---\n${fs.readFileSync(art.path, 'utf8').slice(0, 4000)}`);
          } catch { /* skip */ }
        }
      }
      if (f.error?.message) {
        consoleLines.push(`[${f.id}] ${redactSecrets(f.error.message)}`);
      }
    }

    if (consoleLines.length) {
      const p = path.join(packDir, 'console-summary.txt');
      fs.writeFileSync(p, consoleLines.join('\n\n'), 'utf8');
      files.push(p);
    }
    if (networkLines.length) {
      const p = path.join(packDir, 'network-summary.txt');
      fs.writeFileSync(p, networkLines.join('\n\n'), 'utf8');
      files.push(p);
    }

    const summary = {
      schemaVersion: '2',
      runId,
      packedAt: new Date().toISOString(),
      failureCount: failed.length,
      diagnoseCount: diagnoses.length,
      hasConsoleSummary: consoleLines.length > 0,
      hasNetworkSummary: networkLines.length > 0,
      failedTests: failed.map((f) => ({
        id: f.id,
        title: f.title,
        filePath: f.filePath,
        errorMessage: redactSecrets(f.error?.message || ''),
        durationMs: f.durationMs,
        artifactTypes: (f.artifacts || []).map((a) => a.type)
      })),
      diagnoses: diagnoses.map((d) => ({
        testId: d.testId,
        classification: d.classification,
        confidence: d.confidence,
        rootCause: d.rootCause,
        suggestedActions: d.suggestedActions
      }))
    };

    const summaryPath = path.join(packDir, 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    files.push(summaryPath);

    for (const [i, f] of failed.slice(0, 10).entries()) {
      const replay = FailureReplayRecorderService.recordFromFailure(options.guard, {
        testTitle: f.title || f.id,
        testFile: f.filePath || 'unknown',
        errorMessage: redactSecrets(f.error?.message || 'Test failed'),
        saveToFile: false
      });
      const replayPath = path.join(packDir, `replay-${i + 1}.html`);
      fs.writeFileSync(replayPath, replay.standaloneHtmlReplayer, 'utf8');
      files.push(replayPath);

      for (const art of f.artifacts || []) {
        if (!art.path || !fs.existsSync(art.path)) continue;
        const destName = `${art.type}-${i + 1}-${path.basename(art.path)}`;
        const dest = path.join(packDir, destName);
        try {
          fs.copyFileSync(art.path, dest);
          files.push(dest);
          artifactIndex.push({ testId: f.id, type: art.type, file: destName });
        } catch {
          /* skip locked files */
        }
      }
    }

    const artifactsPath = path.join(packDir, 'artifacts.json');
    fs.writeFileSync(artifactsPath, JSON.stringify({ artifacts: artifactIndex }, null, 2), 'utf8');
    files.push(artifactsPath);

    const indexMd = [
      `# VeloProve failure evidence — ${runId}`,
      '',
      `- Schema: v2`,
      `- Failures: ${failed.length}`,
      `- Diagnoses: ${diagnoses.length}`,
      `- Packed: ${summary.packedAt}`,
      '',
      '## Agent next steps',
      '1. Read `summary.json` + `pack-index.json`',
      '2. Open `replay-*.html` / console-summary.txt / network-summary.txt',
      '3. Or unzip `evidence.zip` elsewhere',
      '4. If TEST_BUG → `vp.heal` / `veloprove heal --allow-no-ai -y`',
      '5. If APPLICATION_BUG → `vp.suggestFix` then edit source',
      '6. Re-run `vp.verify`',
      '',
      '## Files',
      ...files.map((f) => `- ${path.relative(root, f).replace(/\\/g, '/')}`)
    ].join('\n');

    const indexPath = path.join(packDir, 'README.md');
    fs.writeFileSync(indexPath, indexMd, 'utf8');
    files.push(indexPath);

    const packIndex = {
      schemaVersion: '2',
      runId,
      packDir: path.relative(root, packDir).replace(/\\/g, '/'),
      readme: 'README.md',
      summary: 'summary.json',
      zip: 'evidence.zip',
      failureCount: failed.length,
      files: files.map((f) => path.basename(f))
    };
    const packIndexPath = path.join(packDir, 'pack-index.json');
    fs.writeFileSync(packIndexPath, JSON.stringify(packIndex, null, 2), 'utf8');
    files.push(packIndexPath);

    let zipPath: string | undefined;
    try {
      zipPath = path.join(packDir, 'evidence.zip');
      const zipEntries = files
        .filter((f) => path.basename(f) !== 'evidence.zip')
        .map((f) => ({
          name: path.basename(f),
          data: fs.readFileSync(f)
        }));
      writeStoredZip(zipPath, zipEntries);
      files.push(zipPath);
    } catch {
      zipPath = undefined;
    }

    return { packDir, indexPath, files, failureCount: failed.length, packIndexPath, zipPath };
  }
}
