import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import {
  PROJECT_EXPORTS_DIR,
  ensureProjectExportsDir,
  resolveProjectExportPath,
  writeExportToAbsolute,
  writeExportWithProjectFallback
} from '../../src/application/export-save.js';

describe('export-save project fallback', () => {
  const root = path.join(os.tmpdir(), `vp-export-save-${process.pid}-${Date.now()}`);
  const guard = new WorkspaceGuard(root);

  it('creates .veloprove/exports and writes HTML with fallback', () => {
    fs.mkdirSync(root, { recursive: true });
    const dir = ensureProjectExportsDir(guard);
    expect(dir.replace(/\\/g, '/')).toContain('.veloprove/exports');
    expect(fs.existsSync(dir)).toBe(true);

    const built = {
      content: '<html>ok</html>',
      suggestedName: 'veloprove-executive-report.html',
      sizeBytes: 12,
      mimeType: 'text/html'
    };
    const result = writeExportWithProjectFallback(guard, 'html', built, null, 'no path');
    expect(result.saved).toBe(true);
    expect(result.usedFallback).toBe(true);
    expect(result.filePath.replace(/\\/g, '/')).toContain(PROJECT_EXPORTS_DIR);
    expect(fs.existsSync(result.filePath)).toBe(true);
    expect(fs.readFileSync(result.filePath, 'utf8')).toBe('<html>ok</html>');
    expect(result.message).toMatch(/Saved to project folder/i);
  });

  it('falls back when preferred path is invalid', () => {
    const built = {
      content: 'junit',
      suggestedName: 'veloprove-junit.xml',
      sizeBytes: 5,
      mimeType: 'application/xml'
    };
    const result = writeExportWithProjectFallback(
      guard,
      'junit',
      built,
      path.join(root, 'no-such-parent-deep', '\0bad.xml'),
      undefined
    );
    // null byte rejected → fallback
    expect(result.usedFallback).toBe(true);
    expect(fs.existsSync(result.filePath)).toBe(true);
  });

  it('writes absolute path when valid and unique-ifies collisions', () => {
    const first = resolveProjectExportPath(guard, 'pdf', 'report.pdf', false);
    writeExportToAbsolute('pdf', { contentBase64: Buffer.from('%PDF').toString('base64'), sizeBytes: 4 }, first);
    const second = resolveProjectExportPath(guard, 'pdf', 'report.pdf', false);
    expect(second).not.toBe(first);
    expect(path.basename(second)).toMatch(/report-\d{8}-\d{6}\.pdf/);
  });
});
