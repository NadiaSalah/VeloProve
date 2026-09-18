import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { SecuritySurfaceScanner } from '../../src/intelligence/security-scanner/surface-scanner.js';
import { SecurityPlanner } from '../../src/intelligence/security-scanner/security-planner.js';
import { SecurityEngine } from '../../src/application/security-engine.js';
import { SecretRedactor } from '../../src/shared/secret-redactor.js';
import { ConfigLoader, DEFAULT_CONFIG } from '../../src/shared/config-loader.js';
import { SessionTheftAuditor } from '../../src/application/session-theft-auditor.js';

describe('VeloProve Security Testing Domain & Engines', () => {
  let tmpDir: string;
  let guard: WorkspaceGuard;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'veloprove-sec-test-'));
    guard = new WorkspaceGuard(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe('0. Session Theft Cookie Parser', () => {
    it('flags auth cookies missing HttpOnly/Secure/SameSite', () => {
      const parsed = SessionTheftAuditor.parseSetCookieHeader('connect.sid=s%3Aabc; Path=/');
      expect(parsed.httpOnly).toBe(false);
      expect(parsed.secure).toBe(false);
      expect(parsed.issues.length).toBeGreaterThanOrEqual(2);
    });

    it('accepts hardened session cookies', () => {
      const parsed = SessionTheftAuditor.parseSetCookieHeader(
        'session=xyz; Path=/; HttpOnly; Secure; SameSite=Lax'
      );
      expect(parsed.issues).toEqual([]);
    });
  });

  describe('1. Secret Redaction Utility', () => {
    it('redacts JWT tokens, passwords, bearer tokens, API keys, and session cookies', () => {
      const rawText = 'User token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakSecretSignature and Bearer eyJ9876543210abcdef and password="SuperSecretPassword123" and connect.sid=s%3A123456';
      const redacted = SecretRedactor.redact(rawText);

      expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(redacted).not.toContain('SuperSecretPassword123');
      expect(redacted).not.toContain('s%3A123456');
      expect(redacted).toContain('[REDACTED_JWT]');
      expect(redacted).toContain('***REDACTED***');
      expect(redacted).toContain('[REDACTED_SESSION_COOKIE]');
    });

    it('redacts nested fields in objects safely', () => {
      const sensitiveObj = {
        user: 'admin',
        password: 'TopSecretPassword!',
        token: 'eyJ1234567890.abcdefghij.signature123456',
        meta: {
          apiKey: 'sec_key_999999999'
        }
      };

      const sanitized = SecretRedactor.redactObject(sensitiveObj);
      expect(sanitized.password).toBe('***REDACTED***');
      expect(sanitized.meta.apiKey).toBe('***REDACTED***');
      expect(sanitized.user).toBe('admin');
    });
  });

  describe('2. Security Configuration Loader', () => {
    it('loads default security configuration with Safe Mode enabled', async () => {
      const loader = new ConfigLoader(guard);
      const config = await loader.loadConfig();

      expect(config.security).toBeDefined();
      expect(config.security?.enabled).toBe(true);
      expect(config.security?.safeMode).toBe(true);
      expect(config.security?.environment).toBe('test');
      expect(config.security?.allowProduction).toBe(false);
      expect(config.security?.auth?.testRateLimit).toBe(true);
      expect(config.security?.inputs?.sqlInjection).toBe(true);
      expect(config.security?.inputs?.xss).toBe(true);
    });
  });

  describe('3. Attack Surface Discovery', () => {
    it('identifies auth routes, protected routes, forms, file uploads, JWT and database technologies', () => {
      // Scaffold mock source files in tmpDir
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        name: 'sample-secure-app',
        dependencies: {
          'express': '^4.19.2',
          'jsonwebtoken': '^9.0.2',
          'pg': '^8.11.3',
          'multer': '^1.4.5-lts.1'
        }
      }, null, 2));

      fs.writeFileSync(path.join(srcDir, 'auth-controller.ts'), `
        import express from 'express';
        const router = express.Router();
        router.post('/api/auth/login', (req, res) => res.json({ token: 'jwt' }));
        router.post('/api/auth/register', (req, res) => res.json({ ok: true }));
        router.post('/api/auth/logout', (req, res) => res.json({ ok: true }));
        export default router;
      `);

      fs.writeFileSync(path.join(srcDir, 'upload-controller.ts'), `
        import multer from 'multer';
        const upload = multer({ dest: 'uploads/' });
        router.post('/api/upload', upload.single('file'), (req, res) => res.json({ ok: true }));
      `);

      fs.writeFileSync(path.join(srcDir, 'LoginForm.tsx'), `
        export function LoginForm() {
          return (
            <form action="/login" method="POST">
              <input name="email" type="email" required />
              <input name="password" type="password" required />
              <input name="role" type="hidden" value="user" />
            </form>
          );
        }
      `);

      const surface = SecuritySurfaceScanner.scan(guard);

      expect(surface.authEndpoints.length).toBeGreaterThanOrEqual(3);
      expect(surface.sessionAndTokenMechanisms.jwtDetected).toBe(true);
      expect(surface.databaseTechnologies.sqlDetected).toBe(true);
      expect(surface.fileUploadEndpoints.length).toBeGreaterThanOrEqual(1);
      expect(surface.formsAndInputs.length).toBeGreaterThanOrEqual(1);
      expect(surface.summary.totalFormInputs).toBeGreaterThanOrEqual(3);
    });
  });

  describe('4. Security Test Planner', () => {
    it('generates prioritized, non-destructive test cases across all categories', () => {
      const surface = SecuritySurfaceScanner.scan(guard);
      const plan = SecurityPlanner.createPlan(surface);

      expect(plan.testCases.length).toBeGreaterThan(5);
      expect(plan.summary.byCategory.authentication).toBeGreaterThan(0);
      expect(plan.summary.byCategory.authorization).toBeGreaterThan(0);
      expect(plan.summary.byCategory.injection).toBeGreaterThan(0);
      expect(plan.summary.byCategory.sessions_tokens).toBeGreaterThan(0);

      // Verify destructive = false on every single test
      for (const tc of plan.testCases) {
        expect(tc.destructive).toBe(false);
        expect(tc.safeModeCompatible).toBe(true);
      }
    });

    it('filters test cases by selected categories', () => {
      const surface = SecuritySurfaceScanner.scan(guard);
      const plan = SecurityPlanner.createPlan(surface, {
        categories: ['authentication', 'injection']
      });

      expect(plan.summary.byCategory.authentication).toBeGreaterThan(0);
      expect(plan.summary.byCategory.injection).toBeGreaterThan(0);
      expect(plan.summary.byCategory.authorization).toBe(0);
    });
  });

  describe('5. Security Execution Engine & Safe Mode Guards', () => {
    it('refuses intrusive security tests on production environment when allowProduction=false', async () => {
      const surface = SecuritySurfaceScanner.scan(guard);
      const plan = SecurityPlanner.createPlan(surface);

      await expect(
        SecurityEngine.runTests(guard, plan, {
          baseURL: 'https://production.example.com',
          environment: 'production',
          allowProduction: false
        })
      ).rejects.toThrow(/Target environment is production and allowProduction is false/);
    });

    it('executes safe offline static security scan on a secure mock project', async () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, 'safe-db.ts'), `
        export async function getUser(db: any, id: string) {
          return db.query('SELECT * FROM users WHERE id = $1', [id]);
        }
      `);

      fs.writeFileSync(path.join(srcDir, 'SafeView.tsx'), `
        export function SafeView({ text }: { text: string }) {
          return <div>{text}</div>;
        }
      `);

      const surface = SecuritySurfaceScanner.scan(guard);
      const plan = SecurityPlanner.createPlan(surface);
      const report = await SecurityEngine.runTests(guard, plan, { safeMode: true });

      expect(report.securityScore).toBeGreaterThanOrEqual(90);
      expect(report.verdict).toBe('SECURE');
      expect(report.summary.severityCounts.critical).toBe(0);
    });

    it('detects unparameterized SQL query and flags CRITICAL finding in vulnerable mock project', async () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, 'vulnerable-db.ts'), `
        export async function searchUsers(db: any, userInput: string) {
          return db.query(\`SELECT * FROM users WHERE name = '\${userInput}'\`);
        }
      `);

      const surface = SecuritySurfaceScanner.scan(guard);
      const plan = SecurityPlanner.createPlan(surface, { categories: ['injection'] });
      const report = await SecurityEngine.runTests(guard, plan, { safeMode: true });

      expect(report.findings.some(f => f.category === 'injection' && f.severity === 'CRITICAL')).toBe(true);
      expect(report.verdict).toBe('CRITICAL_VULNERABILITIES');
      expect(report.securityScore).toBeLessThan(100);
    });

    it('detects dangerouslySetInnerHTML without sanitization and flags HIGH warning', async () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, 'UnsafeComponent.tsx'), `
        export function Unsafe({ rawContent }: { rawContent: string }) {
          return <div dangerouslySetInnerHTML={{ __html: rawContent }} />;
        }
      `);

      const surface = SecuritySurfaceScanner.scan(guard);
      const plan = SecurityPlanner.createPlan(surface, { categories: ['injection'] });
      const report = await SecurityEngine.runTests(guard, plan, { safeMode: true });

      expect(report.findings.some(f => f.category === 'injection' && f.status === 'WARN')).toBe(true);
      expect(report.remediationRoadmap.length).toBeGreaterThan(0);
    });

    it('detects session theft vectors: httpOnly:false, URL session ids, fixation, and client storage', async () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, 'auth-session.ts'), `
        import session from 'express-session';
        export function login(req: any, res: any) {
          // vulnerable: session id is never rotated after auth
          req.session.userId = 1;
          res.cookie('connect.sid', 'abc', { httpOnly: false });
        }
        export function logout(req: any, res: any) {
          res.redirect('/logout');
        }
        export function openSession(req: any) {
          const sid = req.query.session_id;
          return sid;
        }
      `);

      fs.writeFileSync(path.join(srcDir, 'client-auth.ts'), `
        export function persistToken(token: string) {
          localStorage.setItem('authToken', token);
        }
      `);

      const surface = SecuritySurfaceScanner.scan(guard);
      const plan = SecurityPlanner.createPlan(surface, { categories: ['sessions_tokens'] });
      expect(plan.testCases.some(t => t.id === 'sec_session_fixation')).toBe(true);
      expect(plan.testCases.some(t => t.id === 'sec_session_client_storage_theft')).toBe(true);
      expect(plan.testCases.some(t => t.id === 'sec_session_id_url_exposure')).toBe(true);

      const report = await SecurityEngine.runTests(guard, plan, { safeMode: true });
      const kinds = report.findings.map(f => f.title + '|' + f.evidence);
      expect(report.findings.some(f => /HttpOnly|httpOnly/i.test(f.evidence) || /HttpOnly/i.test(f.title))).toBe(true);
      expect(report.findings.some(f => /URL|session_id|query/i.test(f.evidence))).toBe(true);
      expect(report.findings.some(f => /fixation|regenerat/i.test(f.evidence + f.impact))).toBe(true);
      expect(report.findings.some(f => /localStorage|Client-Side/i.test(f.evidence + f.title))).toBe(true);
      expect(kinds.length).toBeGreaterThan(0);
    });
  });
});
