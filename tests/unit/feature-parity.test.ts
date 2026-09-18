import { describe, it, expect, beforeEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { FeatureParityAuditorService } from '../../src/application/feature-parity-auditor.js';
import { VeloProveEngine } from '../../src/application/engine.js';

describe('FeatureParityAuditorService (UI-to-Backend Ghost Feature & Parity Detection)', () => {
  const fixtureDir = path.resolve(process.cwd(), 'fixtures/parity-test-app');
  let guard: WorkspaceGuard;

  beforeEach(() => {
    // Scaffold multi-language mock application (React UI + Rust Tauri backend)
    if (!fs.existsSync(fixtureDir)) {
      fs.mkdirSync(fixtureDir, { recursive: true });
    }

    const uiDir = path.join(fixtureDir, 'src/ui');
    const backendDir = path.join(fixtureDir, 'src-tauri/src');
    fs.mkdirSync(uiDir, { recursive: true });
    fs.mkdirSync(backendDir, { recursive: true });

    // 1. Write React UI component with:
    // - 1 connected button (recover_files)
    // - 1 ghost button with no-op handler (export_log)
    // - Option select with [jpg, png, pdf] where 'pdf' is NOT in Rust backend enum
    const reactCode = `
import React from 'react';
import { invoke } from '@tauri-apps/api/core';

export function FileRecoveryUI() {
  const handleRecover = () => {
    invoke('recover_files', { extensions: ['jpg', 'png'] });
  };

  const handleExport = () => {
    console.log('TODO: implement export'); // No-op placeholder
  };

  return (
    <div>
      <select name="extensions">
        <option value="jpg">JPEG Image</option>
        <option value="png">PNG Image</option>
        <option value="pdf">PDF Document</option>
      </select>

      <button onClick={handleRecover}>Start Recovery</button>
      <button onClick={handleExport}>Export Results</button>
    </div>
  );
}
`;
    fs.writeFileSync(path.join(uiDir, 'Recovery.tsx'), reactCode, 'utf8');

    // 2. Write Rust Tauri Backend (src-tauri/src/main.rs)
    // Supports only 'jpg' and 'png', command: recover_files
    const rustCode = `
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub enum SupportedExt {
    Jpg,
    Png,
}

#[tauri::command]
fn recover_files(extensions: Vec<SupportedExt>) -> Result<usize, String> {
    for ext in extensions {
        match ext {
            SupportedExt::Jpg => { /* recover jpg */ },
            SupportedExt::Png => { /* recover png */ },
        }
    }
    Ok(42)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![recover_files])
        .run(tauri::generate_context!())
        .expect("error");
}
`;
    fs.writeFileSync(path.join(backendDir, 'main.rs'), rustCode, 'utf8');

    guard = new WorkspaceGuard(fixtureDir);
  });

  it('scans multi-language project and flags no-op handlers and unmatched enum options', () => {
    const report = FeatureParityAuditorService.audit(guard, { generateE2ESuite: true });

    expect(report.totalUiFeaturesFound).toBeGreaterThanOrEqual(4); // 2 buttons + 3 options
    expect(report.ghostFeaturesCount).toBeGreaterThan(0);

    // Should detect the no-op handleExport button
    const noopIssue = report.issues.find(i => i.issueType === 'NOOP_HANDLER');
    expect(noopIssue).toBeDefined();
    expect(noopIssue?.description).toContain('Export Results');

    // Should detect the unmatched 'pdf' option against Rust enum/match arms
    const enumIssue = report.issues.find(i => i.issueType === 'ENUM_UNMATCHED_VALUE');
    expect(enumIssue).toBeDefined();
    expect(enumIssue?.description).toContain('pdf');

    // Should generate E2E test code
    expect(report.generatedE2ETestCode).toContain("test('UI Feature Parity: Start Recovery");
  });

  it('integrates seamlessly with VeloProveEngine facade', () => {
    const engine = new VeloProveEngine(fixtureDir);
    const report = engine.auditFeatureParity();

    expect(report.projectPath).toBe(fixtureDir);
    expect(report.parityScore).toBeLessThanOrEqual(100);
    expect(report.summary).toContain('Parity Score');
  });
});
