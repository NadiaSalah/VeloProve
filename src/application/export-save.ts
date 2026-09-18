import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

/** Project-local folder for dashboard / fallback report exports (created on demand). */
export const PROJECT_EXPORTS_DIR = '.veloprove/exports';

export interface BuiltExportPayload {
  content?: string;
  contentBase64?: string;
  files?: Array<{ name: string; content: string }>;
  isDirectory?: boolean;
  sizeBytes?: number;
  suggestedName?: string;
  mimeType?: string;
}

export interface ExportWriteResult {
  filePath: string;
  format: string;
  sizeBytes: number;
  saved: boolean;
  suggestedName?: string;
  mimeType?: string;
  isDirectory?: boolean;
  /** True when native dialog / absolute path failed and we wrote under the project. */
  usedFallback?: boolean;
  fallbackReason?: string;
  /** Human message including the final save location. */
  message?: string;
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    '-' +
    p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds())
  );
}

/** Ensure `.veloprove/exports` exists and return its absolute path. */
export function ensureProjectExportsDir(guard: WorkspaceGuard): string {
  const dir = guard.resolveSafePath(PROJECT_EXPORTS_DIR);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Resolve a unique path under `.veloprove/exports` for the export.
 * Reuses the suggested basename when free; otherwise appends a timestamp.
 */
export function resolveProjectExportPath(
  guard: WorkspaceGuard,
  format: string,
  suggestedName: string,
  isDirectory = false
): string {
  const dir = ensureProjectExportsDir(guard);
  const base = path.basename(
    suggestedName || (isDirectory || format === 'allure' ? 'allure-results' : `veloprove-report.${format}`)
  );

  if (isDirectory || format === 'allure') {
    let target = path.join(dir, base);
    if (fs.existsSync(target)) {
      target = path.join(dir, `${base}-${stamp()}`);
    }
    return target;
  }

  let target = path.join(dir, base);
  if (fs.existsSync(target)) {
    const ext = path.extname(base);
    const stem = path.basename(base, ext);
    target = path.join(dir, `${stem}-${stamp()}${ext}`);
  }
  return target;
}

/** Write built export content to an absolute path (file or directory). */
export function writeExportToAbsolute(
  format: string,
  built: BuiltExportPayload,
  target: string
): ExportWriteResult {
  const resolved = path.resolve(target);
  if (!resolved || resolved.includes('\0')) {
    throw new Error('Invalid save path');
  }

  if (built.isDirectory || format === 'allure') {
    fs.mkdirSync(resolved, { recursive: true });
    for (const file of built.files || []) {
      const safeName = path.basename(file.name);
      fs.writeFileSync(path.join(resolved, safeName), file.content || '', 'utf8');
    }
    return {
      filePath: resolved,
      format,
      sizeBytes: built.sizeBytes || 0,
      saved: true,
      suggestedName: built.suggestedName || path.basename(resolved),
      isDirectory: true,
      message: `Saved to ${resolved}`
    };
  }

  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  if (built.contentBase64) {
    fs.writeFileSync(resolved, Buffer.from(built.contentBase64, 'base64'));
  } else {
    fs.writeFileSync(resolved, built.content || '', 'utf8');
  }
  return {
    filePath: resolved,
    format,
    sizeBytes: built.sizeBytes || 0,
    saved: true,
    suggestedName: path.basename(resolved),
    mimeType: built.mimeType,
    message: `Saved to ${resolved}`
  };
}

/**
 * Prefer `preferredPath` when provided; on any write failure (or empty path),
 * save under `.veloprove/exports` and mark `usedFallback`.
 */
export function writeExportWithProjectFallback(
  guard: WorkspaceGuard,
  format: string,
  built: BuiltExportPayload,
  preferredPath?: string | null,
  fallbackReason?: string
): ExportWriteResult {
  const suggested = built.suggestedName || (built.isDirectory ? 'allure-results' : `veloprove-report.${format}`);
  const isDir = !!built.isDirectory || format === 'allure';
  const preferred = preferredPath && String(preferredPath).trim() ? String(preferredPath).trim() : '';

  if (preferred) {
    try {
      const written = writeExportToAbsolute(format, built, preferred);
      return {
        ...written,
        usedFallback: false,
        message: `Saved to ${written.filePath}`
      };
    } catch (err: any) {
      const reason = fallbackReason || err?.message || 'Preferred path write failed';
      const fb = resolveProjectExportPath(guard, format, suggested, isDir);
      const written = writeExportToAbsolute(format, built, fb);
      return {
        ...written,
        usedFallback: true,
        fallbackReason: reason,
        message: `Preferred path failed (${reason}). Saved to project folder: ${written.filePath}`
      };
    }
  }

  const fb = resolveProjectExportPath(guard, format, suggested, isDir);
  const written = writeExportToAbsolute(format, built, fb);
  return {
    ...written,
    usedFallback: true,
    fallbackReason: fallbackReason || 'No path provided — used project exports folder',
    message: `Saved to project folder: ${written.filePath}`
  };
}
