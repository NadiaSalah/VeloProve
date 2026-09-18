import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { LocalStorage } from '../../src/storage/local-store.js';
import { ScenarioRecorderService } from '../../src/application/scenario-recorder.js';
import { FlakinessStabilizerService } from '../../src/application/flakiness-stabilizer.js';
import { DatabaseSnapshotService } from '../../src/application/db-snapshot.js';
import { BugFixSynthesizerService } from '../../src/application/bugfix-synthesizer.js';
import { StandaloneReportExporter } from '../../src/application/report-exporter.js';
import { VeloProveEngine } from '../../src/application/engine.js';
import type { DiagnosticResult } from '../../src/shared/types/index.js';

describe('v1.4.0 Extended Autonomous Engines (Scenario Recorder, Stabilizer, DB Snapshot, BugFix, Report Exporter)', () => {
  const testDir = path.join(process.cwd(), '.test_v140_sandbox');
  let guard: WorkspaceGuard;
  let storage: LocalStorage;

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    guard = new WorkspaceGuard(testDir);
    storage = new LocalStorage(guard);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('ScenarioRecorderService synthesizes Playwright test with Visual-Aria selectors', () => {
    const scenario = ScenarioRecorderService.synthesizeScenario(guard, {
      title: 'User Checkout Journey',
      startUrl: 'http://localhost:3000/cart',
      framework: 'playwright',
      steps: [
        { type: 'click', role: 'button', name: 'Proceed to Checkout', description: 'Click checkout' },
        { type: 'fill', selector: 'placeholder:Email', value: 'buyer@test.com' },
        { type: 'click', role: 'button', name: 'Pay Now' },
        { type: 'assert_visible', selector: 'text=Order Confirmed' }
      ],
      outputFile: 'tests/e2e/checkout.spec.ts'
    });

    expect(scenario.code).toContain('Scenario: User Checkout Journey');
    expect(scenario.code).toContain("page.getByRole('button', { name: /Proceed to Checkout/i })");
    expect(scenario.code).toContain("page.getByPlaceholder('Email').fill('buyer@test.com')");
    expect(scenario.code).toContain("page.getByText('Order Confirmed')");
    expect(scenario.savedPath).toBeDefined();
    expect(fs.existsSync(scenario.savedPath!)).toBe(true);
  });

  it('FlakinessStabilizerService detects hardcoded sleeps and refactors to auto-waiting assertions', () => {
    const rawBrittleTest = `
      test('flaky dashboard load', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForTimeout(3000);
        expect(await page.locator('.stats-card').isVisible()).toBe(true);
      });
    `;

    const result = FlakinessStabilizerService.stabilize(guard, rawBrittleTest, false);
    expect(result.issuesFound).toBeGreaterThanOrEqual(2);
    expect(result.stabilizedCode).toContain('await expect(page.locator(\'.stats-card\')).toBeVisible()');
    expect(result.stabilizedCode).not.toContain('page.waitForTimeout(3000)');
    expect(result.wasModified).toBe(true);
  });

  it('DatabaseSnapshotService takes file snapshot, restores it, and rolls back modifications', () => {
    const testDbFile = path.join(testDir, 'app.db.json');
    fs.writeFileSync(testDbFile, JSON.stringify({ users: [{ id: 1, name: 'Alice' }] }), 'utf8');

    // 1. Create snapshot
    const snap = DatabaseSnapshotService.createSnapshot(guard, 'initial-state', ['app.db.json']);
    expect(snap.id).toBeDefined();
    expect(snap.targetFiles).toContain('app.db.json');

    // 2. Corrupt / modify file
    fs.writeFileSync(testDbFile, JSON.stringify({ users: [] }), 'utf8');
    expect(JSON.parse(fs.readFileSync(testDbFile, 'utf8')).users.length).toBe(0);

    // 3. Restore snapshot
    const restoreResult = DatabaseSnapshotService.restoreSnapshot(guard, snap.id);
    expect(restoreResult.success).toBe(true);

    const restoredData = JSON.parse(fs.readFileSync(testDbFile, 'utf8'));
    expect(restoredData.users.length).toBe(1);
    expect(restoredData.users[0].name).toBe('Alice');
  });

  it('BugFixSynthesizerService synthesizes safe code patches for APPLICATION_BUG diagnoses', () => {
    const buggyFilePath = path.join(testDir, 'user-service.ts');
    fs.writeFileSync(buggyFilePath, `
export function formatUserProfile(user: any) {
  return user.profile.name.toUpperCase();
}
    `, 'utf8');

    const diagnoses: DiagnosticResult[] = [
      {
        diagnosisId: 'diag_1',
        testId: 'user-service-test',
        classification: 'APPLICATION_BUG',
        confidence: 0.95,
        rootCause: 'TypeError: Cannot read properties of undefined (reading "name")',
        evidence: {
          testId: 'user-service-test',
          testName: 'formatUserProfile',
          testFile: 'user-service.test.ts',
          errorMessage: 'TypeError: Cannot read properties of undefined (reading "name")',
          sourceLocation: {
            file: 'user-service.ts',
            line: 3
          }
        },
        affectedFiles: ['user-service.ts'],
        suggestedActions: ['Add optional chaining guard for user.profile.name'],
        canAutoHealTest: false,
        evidenceSignals: ['errorMessage mentions undefined property name'],
        speculationNotes: []
      }
    ];


    const report = BugFixSynthesizerService.synthesizePatches(guard, diagnoses, true);
    expect(report.diagnosedBugCount).toBe(1);
    expect(report.patches.length).toBe(1);
    expect(report.unifiedDiff).toContain('+');
    expect(report.patches[0].safety).toBe('REVIEW_REQUIRED');
    expect(report.applied).toBe(false);
    expect(report.blockedByPolicy.some((b) => /REVIEW_REQUIRED/.test(b))).toBe(true);

    // Application patches are proposed, not silently written
    const fixedContent = fs.readFileSync(buggyFilePath, 'utf8');
    expect(fixedContent).toContain('user.profile.name');
    expect(fixedContent).not.toContain('?.name');
    expect(report.patches[0].repairedCodeSnippet).toContain('?.name');
  });

  it('StandaloneReportExporter exports single-file executive HTML and JSON reports', () => {
    const htmlExport = StandaloneReportExporter.export(guard, storage, {
      format: 'html',
      outputPath: 'veloprove-executive-report.html'
    });

    expect(fs.existsSync(htmlExport.filePath)).toBe(true);
    expect(htmlExport.sizeBytes).toBeGreaterThan(500);

    const jsonExport = StandaloneReportExporter.export(guard, storage, {
      format: 'json',
      outputPath: 'veloprove-executive-report.json'
    });

    expect(fs.existsSync(jsonExport.filePath)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(jsonExport.filePath, 'utf8'));
    expect(parsed.generatedAt).toBeDefined();
    expect(parsed.release).toBeDefined();
  });

  it('VeloProveEngine provides full method wrappers for all extended engines', () => {
    const engine = new VeloProveEngine(testDir);
    const scenario = engine.recordScenario({
      title: 'Home Test',
      startUrl: 'http://localhost:3000',
      steps: [{ type: 'assert_visible', selector: 'body' }]
    });
    expect(scenario.code).toBeDefined();

    const stabilize = engine.stabilizeTests('expect(await loc.isVisible()).toBe(true);');
    expect(stabilize.wasModified).toBe(true);

    const report = engine.exportReport({ format: 'markdown' });
    expect(fs.existsSync(report.filePath)).toBe(true);
  });
});
