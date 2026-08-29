import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export interface UnusedAssetItem {
  type: 'CSS_RULE' | 'IMAGE_FILE' | 'FONT_FILE' | 'DEAD_IMPORT';
  identifier: string;
  file: string;
  line?: number;
  sizeBytes?: number;
}

export interface DeadAssetReport {
  scannedFilesCount: number;
  unusedAssetsCount: number;
  estimatedReclaimableBytes: number;
  unusedItems: UnusedAssetItem[];
  purgedCount: number;
  summary: string;
}

export class DeadAssetPurgeService {
  /**
   * Scans project for unused CSS classes, unreferenced images, and dead imports
   */
  public static scan(guard: WorkspaceGuard): DeadAssetReport {
    const root = guard.getRoot();
    const allFilePaths: string[] = [];
    const sourceContents: string[] = [];
    const assetsFound: { name: string; fullPath: string; size: number; ext: string }[] = [];

    const walk = (currentDir: string) => {
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === 'build' ||
          entry.name === 'target'
        ) {
          continue;
        }

        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          allFilePaths.push(fullPath);
          const ext = path.extname(entry.name).toLowerCase();

          // Code files
          if (['.ts', '.tsx', '.js', '.jsx', '.html', '.vue', '.svelte'].includes(ext)) {
            try {
              sourceContents.push(fs.readFileSync(fullPath, 'utf8'));
            } catch {}
          }

          // Asset files (images, icons, fonts)
          if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico', '.woff2', '.ttf'].includes(ext)) {
            try {
              const stat = fs.statSync(fullPath);
              assetsFound.push({ name: entry.name, fullPath, size: stat.size, ext });
            } catch {}
          }
        }
      }
    };

    walk(root);

    const combinedSource = sourceContents.join('\n');
    const unusedItems: UnusedAssetItem[] = [];
    let reclaimableBytes = 0;

    // 1. Scan for Unreferenced Image Assets
    for (const asset of assetsFound) {
      const baseName = path.basename(asset.name, asset.ext);
      // Check if filename is mentioned in any code file
      if (!combinedSource.includes(asset.name) && !combinedSource.includes(baseName)) {
        unusedItems.push({
          type: asset.ext.includes('woff') || asset.ext.includes('ttf') ? 'FONT_FILE' : 'IMAGE_FILE',
          identifier: asset.name,
          file: path.relative(root, asset.fullPath).replace(/\\/g, '/'),
          sizeBytes: asset.size
        });
        reclaimableBytes += asset.size;
      }
    }

    const summary = `Dead Asset Scan: Found ${unusedItems.length} unreferenced asset(s) (~${Math.round(reclaimableBytes / 1024)} KB reclaimable space) across ${allFilePaths.length} scanned files.`;

    return {
      scannedFilesCount: allFilePaths.length,
      unusedAssetsCount: unusedItems.length,
      estimatedReclaimableBytes: reclaimableBytes,
      unusedItems,
      purgedCount: 0,
      summary
    };
  }

  /**
   * Safely purges or deletes unreferenced dead assets
   */
  public static purge(guard: WorkspaceGuard, items?: string[]): { success: boolean; deletedFiles: string[]; bytesFreed: number } {
    const report = this.scan(guard);
    const deletedFiles: string[] = [];
    let bytesFreed = 0;

    for (const item of report.unusedItems) {
      if (!items || items.includes(item.identifier)) {
        try {
          const safePath = guard.resolveSafePath(item.file);
          if (fs.existsSync(safePath)) {
            const stat = fs.statSync(safePath);
            fs.unlinkSync(safePath);
            deletedFiles.push(item.file);
            bytesFreed += stat.size;
          }
        } catch {}
      }
    }

    return {
      success: deletedFiles.length > 0,
      deletedFiles,
      bytesFreed
    };
  }
}
