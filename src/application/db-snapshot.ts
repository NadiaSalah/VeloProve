import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export interface DatabaseSnapshotInfo {
  id: string;
  name: string;
  createdAt: string;
  targetFiles: string[];
  totalBytes: number;
}

export class DatabaseSnapshotService {
  private static getSnapshotDir(guard: WorkspaceGuard): string {
    const dir = guard.resolveSafePath('.veloprove/snapshots');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Take a snapshot of database / fixture files (e.g. sqlite db, json db, fixtures)
   */
  public static createSnapshot(
    guard: WorkspaceGuard,
    name: string,
    filePaths: string[]
  ): DatabaseSnapshotInfo {
    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const snapshotDir = path.join(this.getSnapshotDir(guard), snapshotId);
    fs.mkdirSync(snapshotDir, { recursive: true });

    let totalBytes = 0;
    const backedUpFiles: string[] = [];

    for (const relPath of filePaths) {
      try {
        const fullSrc = guard.resolveSafePath(relPath);
        if (fs.existsSync(fullSrc)) {
          const stats = fs.statSync(fullSrc);
          if (stats.isFile()) {
            const destName = Buffer.from(relPath).toString('base64url');
            const destPath = path.join(snapshotDir, destName);
            fs.copyFileSync(fullSrc, destPath);
            totalBytes += stats.size;
            backedUpFiles.push(relPath);
          }
        }
      } catch {}
    }

    const meta: DatabaseSnapshotInfo = {
      id: snapshotId,
      name,
      createdAt: new Date().toISOString(),
      targetFiles: backedUpFiles,
      totalBytes
    };

    fs.writeFileSync(path.join(snapshotDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
    return meta;
  }

  /**
   * Restore state from a snapshot, overwriting any modified files
   */
  public static restoreSnapshot(
    guard: WorkspaceGuard,
    snapshotId: string
  ): { success: boolean; restoredFiles: string[]; error?: string } {
    const snapshotDir = path.join(this.getSnapshotDir(guard), snapshotId);
    const metaPath = path.join(snapshotDir, 'meta.json');

    if (!fs.existsSync(metaPath)) {
      return { success: false, restoredFiles: [], error: `Snapshot ${snapshotId} not found.` };
    }

    try {
      const meta: DatabaseSnapshotInfo = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const restored: string[] = [];

      for (const relPath of meta.targetFiles) {
        const destName = Buffer.from(relPath).toString('base64url');
        const backupPath = path.join(snapshotDir, destName);
        const targetPath = guard.resolveSafePath(relPath);

        if (fs.existsSync(backupPath)) {
          const targetDir = path.dirname(targetPath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          fs.copyFileSync(backupPath, targetPath);
          restored.push(relPath);
        }
      }

      return { success: true, restoredFiles: restored };
    } catch (err: any) {
      return { success: false, restoredFiles: [], error: err.message };
    }
  }

  /**
   * List all stored snapshots
   */
  public static listSnapshots(guard: WorkspaceGuard): DatabaseSnapshotInfo[] {
    const dir = this.getSnapshotDir(guard);
    const items = fs.readdirSync(dir);
    const list: DatabaseSnapshotInfo[] = [];

    for (const item of items) {
      const metaPath = path.join(dir, item, 'meta.json');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          list.push(meta);
        } catch {}
      }
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Delete a snapshot
   */
  public static deleteSnapshot(guard: WorkspaceGuard, snapshotId: string): boolean {
    const snapshotDir = path.join(this.getSnapshotDir(guard), snapshotId);
    if (fs.existsSync(snapshotDir)) {
      fs.rmSync(snapshotDir, { recursive: true, force: true });
      return true;
    }
    return false;
  }
}
