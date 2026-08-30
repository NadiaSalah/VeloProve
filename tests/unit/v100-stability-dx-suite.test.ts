import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { SarifExporterService } from '../../src/application/sarif-exporter.js';
import { SriCsrfValidatorService } from '../../src/application/sri-csrf-validator.js';
import { TestDeduplicatorService } from '../../src/domain/tests/test-deduplicator.js';
import { GitHookInstallerService } from '../../src/application/git-hook-installer.js';
import type { SecurityReport } from '../../src/shared/types/security.js';

describe('QAForge v1.0.x Stability & First-Class DX Suite', () => {
  let tmpDir: string;
  let guard: WorkspaceGuard;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qaforge-stability-test-'));
    guard = new WorkspaceGuard(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe('1. SARIF v2.1.0 Exporter for GitHub Security', () => {
    it('generates standard SARIF log conforming to GitHub Code Scanning schema', () => {
      const mockReport: SecurityReport = {
        reportId: 'sec_rep_1',
        timestamp: new Date().toISOString(),
        target: 'sample-app',
        environment: 'test',
        safeMode: true,
        deepMode: false,
        securityScore: 75,
        verdict: 'NEEDS_ATTENTION',
        categoryScores: {
          authentication: 100,
          authorization: 80,
          forms_inputs: 100,
          injection: 70,
          api_security: 100,
          sessions_tokens: 100,
          file_uploads: 100
        },
        summary: {
          totalTests: 10,
          passed: 8,
          failed: 1,
          warnings: 1,
          skipped: 0,
          severityCounts: { critical: 0, high: 1, medium: 1, low: 0, info: 0 }
        },
        findings: [
          {
            id: 'find_1',
            title: 'Reflected XSS Vulnerability',
            category: 'injection',
            severity: 'HIGH',
            confidence: 'CONFIRMED',
            status: 'FAIL',
            sourceLocation: { file: 'src/components/Search.tsx', line: 42 },
            evidence: 'Unescaped user input in search query',
            expectedBehavior: 'Escape input HTML entities',
            actualBehavior: 'Raw script executed',
            impact: 'Session hijacking',
            remediation: 'Use DOMPurify.sanitize()',
            testId: 'sec_inj_xss',
            timestamp: new Date().toISOString()
          }
        ],
        remediationRoadmap: []
      };

      const { sarifPath, log } = SarifExporterService.exportSecurityReport(guard, mockReport);

      expect(fs.existsSync(sarifPath)).toBe(true);
      expect(log.version).toBe('2.1.0');
      expect(log.runs[0].tool.driver.name).toBe('QAForge Security Engine');
      expect(log.runs[0].results.length).toBe(1);
      expect(log.runs[0].results[0].level).toBe('error'); // High maps to error in SARIF
      expect(log.runs[0].results[0].locations![0].physicalLocation.artifactLocation.uri).toBe('src/components/Search.tsx');
    });
  });

  describe('2. Subresource Integrity (SRI), CSRF & CORS Validator', () => {
    it('detects external scripts missing integrity hashes, mutating forms missing CSRF, and wildcard CORS', () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      // Unsafe external script and link
      fs.writeFileSync(path.join(srcDir, 'index.html'), `
        <!DOCTYPE html>
        <html>
          <head>
            <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css">
          </head>
          <body>
            <form method="POST" action="/transfer">
              <input name="amount" type="number" />
            </form>
          </body>
        </html>
      `);

      // Unsafe CORS config
      fs.writeFileSync(path.join(srcDir, 'server.ts'), `
        import cors from 'cors';
        app.use(cors({
          origin: '*',
          credentials: true
        }));
      `);

      const report = SriCsrfValidatorService.audit(guard);

      expect(report.summary.missingSriCount).toBeGreaterThanOrEqual(2);
      expect(report.summary.missingCsrfCount).toBeGreaterThanOrEqual(1);
      expect(report.summary.corsIssuesCount).toBeGreaterThanOrEqual(1);
      expect(report.verdict).toBe('VULNERABLE');
      expect(report.score).toBeLessThan(80);
    });
  });

  describe('3. AST Test Deduplication & Redundancy Engine', () => {
    it('identifies identical or duplicate test titles across files', () => {
      const testsDir = path.join(tmpDir, 'tests');
      fs.mkdirSync(testsDir, { recursive: true });

      fs.writeFileSync(path.join(testsDir, 'auth-1.test.ts'), `
        it('should login successfully with valid credentials', () => {
          expect(true).toBe(true);
        });
        it('should reject invalid password', () => {
          expect(false).toBe(false);
        });
      `);

      fs.writeFileSync(path.join(testsDir, 'auth-2.test.ts'), `
        it('should login successfully with valid credentials', () => {
          expect(1).toBe(1);
        });
      `);

      const report = TestDeduplicatorService.analyze(guard);

      expect(report.totalTestsScanned).toBe(3);
      expect(report.uniqueTestTitles).toBe(2);
      expect(report.redundantCount).toBe(1);
      expect(report.duplicates.length).toBe(1);
      expect(report.duplicates[0].testTitle).toContain('should login successfully with valid credentials');
    });
  });

  describe('4. Automated Git Pre-Commit Hook Installer', () => {
    it('installs and uninstalls pre-commit hook in .git directory', () => {
      const gitDir = path.join(tmpDir, '.git');
      fs.mkdirSync(gitDir, { recursive: true });

      const installRes = GitHookInstallerService.installPreCommit(guard, 'npx qaforge changed');
      expect(installRes.installed).toBe(true);
      expect(fs.existsSync(installRes.hookPath)).toBe(true);

      const content = fs.readFileSync(installRes.hookPath, 'utf8');
      expect(content).toContain('npx qaforge changed');

      const uninstallRes = GitHookInstallerService.uninstallPreCommit(guard);
      expect(uninstallRes.uninstalled).toBe(true);
      expect(fs.existsSync(installRes.hookPath)).toBe(false);
    });
  });
});
