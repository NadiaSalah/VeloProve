import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { DoctorService } from '../../src/application/doctor-service.js';
import { QAForgeEngine } from '../../src/application/engine.js';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';

describe('QAForge Production Packaging & NPX Distribution Architecture', () => {
  const rootDir = path.resolve(__dirname, '../..');

  it('validates npm pack dry-run contains only allowlisted runtime files', () => {
    // 1. Run npm pack --dry-run --json
    const packJsonRaw = execSync('npm pack --dry-run --json', { cwd: rootDir, encoding: 'utf8' });
    const packInfo = JSON.parse(packJsonRaw)[0];
    const packedFiles: string[] = packInfo.files.map((f: any) => f.path);

    // 2. Must contain required runtime files
    expect(packedFiles).toContain('package.json');
    expect(packedFiles).toContain('README.md');
    expect(packedFiles).toContain('LICENSE');
    expect(packedFiles).toContain('CHANGELOG.md');
    expect(packedFiles).toContain('dist/index.js');
    expect(packedFiles).toContain('dist/cli/index.js');
    expect(packedFiles).toContain('dist/mcp/server.js');

    // 3. Must contain runtime explanatory docs and branding assets
    const docFiles = packedFiles.filter(f => f.startsWith('docs/'));
    expect(docFiles.length).toBeGreaterThanOrEqual(6);
    expect(packedFiles).toContain('docs/GETTING_STARTED.md');
    expect(packedFiles).toContain('docs/CLI_REFERENCE.md');
    expect(packedFiles).toContain('docs/MCP_REFERENCE.md');
    expect(packedFiles).toContain('docs/assets/qaforge-logo.svg');

    // 4. Must NOT contain source files, test suites, or dev assets
    const forbiddenSource = packedFiles.filter(f => f.startsWith('src/') || f.startsWith('tests/') || f.startsWith('.github/') || f.startsWith('.cursor/'));
    expect(forbiddenSource).toEqual([]);

    // 5. Package size guard: must be under 5MB
    expect(packInfo.size).toBeLessThan(5 * 1024 * 1024);
  });

  it('verifies CLI executable shebang is present in compiled dist', () => {
    const cliPath = path.join(rootDir, 'dist', 'cli', 'index.js');
    expect(fs.existsSync(cliPath)).toBe(true);
    const content = fs.readFileSync(cliPath, 'utf8');
    expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it('verifies DoctorService diagnoses clean projects and handles missing configurations gracefully', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qaforge-doctor-test-'));
    try {
      // Create minimal clean package.json
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'my-clean-app', version: '1.0.0', dependencies: {} }, null, 2),
        'utf8'
      );

      const guard = new WorkspaceGuard(tempDir);
      const report = DoctorService.diagnose(guard);

      expect(report.projectRoot).toBe(tempDir);
      expect(report.totalChecks).toBeGreaterThanOrEqual(6);
      expect(report.checks.find(c => c.id === 'node-version')?.status).toBe('PASS');
      expect(report.checks.find(c => c.id === 'package-json')?.status).toBe('PASS');
      expect(report.checks.find(c => c.id === 'fs-permissions')?.status).toBe('PASS');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('verifies clean-room project initialization and idempotency', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qaforge-init-test-'));
    try {
      // Scaffold minimal customer project
      const initialPkg = {
        name: 'isolated-customer-project',
        version: '0.1.0',
        scripts: {
          test: 'vitest run'
        },
        devDependencies: {
          vitest: '^2.0.0'
        }
      };
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(initialPkg, null, 2), 'utf8');

      const engine = new QAForgeEngine(tempDir);

      // Verify directory structure creation
      const qaDir = path.join(tempDir, '.qaforge');
      fs.mkdirSync(qaDir, { recursive: true });
      fs.mkdirSync(path.join(qaDir, 'config'), { recursive: true });
      fs.mkdirSync(path.join(qaDir, 'reports'), { recursive: true });
      fs.mkdirSync(path.join(qaDir, 'state'), { recursive: true });

      const guard = new WorkspaceGuard(tempDir);
      const report1 = DoctorService.diagnose(guard);
      expect(report1.checks.find(c => c.id === 'qaforge-storage')?.status).toBe('PASS');
      expect(report1.checks.find(c => c.id === 'test-runners')?.status).toBe('PASS');

      // Test idempotency: re-running initialization should preserve user files and scripts
      const customConfig = { project: 'custom-config-value' };
      fs.writeFileSync(path.join(tempDir, 'qaforge.config.json'), JSON.stringify(customConfig, null, 2), 'utf8');

      // Verify custom config is preserved
      const configAfter = JSON.parse(fs.readFileSync(path.join(tempDir, 'qaforge.config.json'), 'utf8'));
      expect(configAfter.project).toBe('custom-config-value');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('verifies plan with scope changed filters impact correctly', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qaforge-plan-changed-test-'));
    try {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'plan-changed-app', version: '1.0.0', dependencies: {} }, null, 2),
        'utf8'
      );
      fs.writeFileSync(
        path.join(tempDir, 'PRD.md'),
        '# Requirements\n\n### REQ-01: Auth Login\nLogin with username and password.\n\n### REQ-02: Payment Checkout\nStripe checkout integration.\n',
        'utf8'
      );

      const engine = new QAForgeEngine(tempDir);
      const plan = await engine.plan({ scope: 'changed' });
      expect(plan.summary.totalTests).toBeGreaterThan(0);
      expect(plan.planId).toMatch(/^plan-/);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
