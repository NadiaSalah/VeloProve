import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createSpinner } from '../../src/cli/spinner.js';
import { promptInitQuestions } from '../../src/cli/prompts.js';
import { StackDetector } from '../../src/intelligence/project-scanner/stack-detector.js';
import { ProjectScanner } from '../../src/intelligence/project-scanner/index.js';
import { ReportSummaryService } from '../../src/application/report-summary-service.js';

describe('v1.0.0 Release Stability & First-Class DX Enhancements', () => {
  it('creates and executes CLI Spinner with proper state transitions', () => {
    const spinner = createSpinner('Validating dependencies...');
    expect(spinner).toBeDefined();

    spinner.start('Running diagnostic scan...');
    spinner.update('Still scanning...');
    spinner.succeed('Dependencies ready');
    spinner.warn('Minor deprecation warning');
    spinner.info('Found 3 routes');
    spinner.fail('Test failure recorded');
    spinner.stop();
  });

  it('verifies non-TTY default fallback for promptInitQuestions', async () => {
    const answers = await promptInitQuestions({
      projectName: 'test-app',
      frameworks: ['react'],
      testFrameworks: ['vitest']
    });

    expect(answers).toBeDefined();
    expect(answers.configureMcp).toBe(true);
    expect(answers.mcpTargets).toContain('cursor');
  });

  it('detects monorepo configurations (pnpm, turborepo, nx, lerna)', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'veloprove-monorepo-'));
    try {
      // 1. Turborepo
      fs.writeFileSync(path.join(tempDir, 'turbo.json'), JSON.stringify({ pipeline: {} }), 'utf8');
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'my-turbo-monorepo' }), 'utf8');
      const turboStack = StackDetector.detect(tempDir);
      expect(turboStack.workspaceType).toBe('turborepo');

      // 2. Nx
      fs.unlinkSync(path.join(tempDir, 'turbo.json'));
      fs.writeFileSync(path.join(tempDir, 'nx.json'), JSON.stringify({}), 'utf8');
      const nxStack = StackDetector.detect(tempDir);
      expect(nxStack.workspaceType).toBe('nx');

      // 3. Sub-packages discovery in packages/
      const packagesDir = path.join(tempDir, 'packages');
      fs.mkdirSync(path.join(packagesDir, 'ui'), { recursive: true });
      fs.writeFileSync(
        path.join(packagesDir, 'ui', 'package.json'),
        JSON.stringify({ name: '@monorepo/ui', dependencies: { react: '^18.0.0' } }),
        'utf8'
      );

      const profile = ProjectScanner.scan(tempDir);
      expect(profile.workspaceType).toBe('nx');
      expect(profile.apps.length).toBeGreaterThanOrEqual(2);
      expect(profile.apps.some(a => a.name === '@monorepo/ui')).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('generates structured Markdown summary in .veloprove/reports/latest-summary.md', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'veloprove-report-test-'));
    try {
      const summaryFile = ReportSummaryService.writeSummary({
        projectRoot: tempDir,
        commandName: 'doctor',
        title: 'Environment & Diagnostics Verification',
        verdict: 'HEALTHY',
        metrics: {
          'Node Version': 'v20.0.0',
          'Checks Passed': '8/8',
          'Platform': 'linux'
        },
        details: ['All 8 health checks passed successfully', 'Found installed Vitest runner'],
        recommendations: ['Run "veloprove plan" to create test suite']
      });

      expect(fs.existsSync(summaryFile)).toBe(true);
      const content = fs.readFileSync(summaryFile, 'utf8');
      expect(content).toContain('# ⚡ VeloProve Execution Summary');
      expect(content).toContain('`veloprove doctor`');
      expect(content).toContain('Environment & Diagnostics Verification');
      expect(content).toContain('Checks Passed');
      expect(content).toContain('Run "veloprove plan"');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
