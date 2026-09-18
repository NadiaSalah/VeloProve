import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { VeloProveEngine } from '../../src/application/engine.js';
import { ScreenReaderSimulatorService } from '../../src/application/screen-reader-simulator.js';
import { DatabaseQueryAuditorService } from '../../src/application/db-query-auditor.js';
import { EnvDriftAuditorService } from '../../src/application/env-drift-auditor.js';
import { FailureReplayRecorderService } from '../../src/application/failure-replay-recorder.js';
import { RateLimitAuditorService } from '../../src/application/rate-limit-auditor.js';
import { StatefulMockServerService } from '../../src/application/stateful-mock-server.js';
import { ArchitectureGraphService } from '../../src/application/architecture-graph.js';

describe('Phase 7 Next-Gen Enterprise Suite', () => {
  let tmpDir: string;
  let guard: WorkspaceGuard;
  let engine: VeloProveEngine;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'veloprove-p7-test-'));
    guard = new WorkspaceGuard(tmpDir);
    engine = new VeloProveEngine(tmpDir);
  });

  afterEach(() => {
    try {
      StatefulMockServerService.stopServer();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('ScreenReaderSimulatorService simulates reading flow and flags missing accessible names and heading skips', () => {
    const rawHtml = `
      <main>
        <h1>Welcome to VeloProve</h1>
        <h4>Skipped Heading</h4>
        <img src="logo.png" />
        <button></button>
        <button aria-label="Submit Order">Submit</button>
        <input type="text" placeholder="Your name" />
      </main>
    `;

    const report = ScreenReaderSimulatorService.simulate(guard, { rawHtml });
    expect(report.totalElementsScanned).toBeGreaterThan(0);
    expect(report.interactiveElements).toBeGreaterThanOrEqual(2);
    expect(report.issues.length).toBeGreaterThan(0);

    const missingAlt = report.issues.find(i => i.message.includes('missing accessible text'));
    expect(missingAlt).toBeDefined();

    const emptyBtn = report.issues.find(i => i.message.includes('has no text'));
    expect(emptyBtn).toBeDefined();

    const headingViolation = report.headingHierarchy.find(h => h.isOrderViolation);
    expect(headingViolation).toBeDefined();
  });

  it('DatabaseQueryAuditorService identifies SQL N+1 queries in loops and unindexed selects', () => {
    const codeFile = path.join(tmpDir, 'src', 'services', 'user-service.ts');
    fs.mkdirSync(path.dirname(codeFile), { recursive: true });
    fs.writeFileSync(codeFile, `
      export async function fetchUsers(ids: string[]) {
        const users = [];
        for (const id of ids) {
          const user = await db.user.findOne({ where: { id } });
          users.push(user);
        }
        return users;
      }

      export async function rawQuery(param: string) {
        return db.rawQuery("SELECT * FROM users WHERE name = '" + param + "'");
      }
    `);

    const report = DatabaseQueryAuditorService.audit(guard);
    expect(report.filesAnalyzed).toBeGreaterThanOrEqual(1);
    expect(report.totalIssues).toBeGreaterThanOrEqual(2);

    const nPlusOne = report.issues.find(i => i.category === 'N_PLUS_ONE_IN_LOOP');
    expect(nPlusOne).toBeDefined();
    expect(nPlusOne?.severity).toBe('CRITICAL');

    const sqli = report.issues.find(i => i.category === 'RAW_SQL_STRING_CONCAT');
    expect(sqli).toBeDefined();
  });

  it('EnvDriftAuditorService detects missing keys in active .env and undeclared code usages', () => {
    fs.writeFileSync(path.join(tmpDir, '.env.example'), 'PORT=3000\nDATABASE_URL=postgres://localhost/db\nAPI_KEY=your_key_here\n');
    fs.writeFileSync(path.join(tmpDir, '.env'), 'PORT=3000\n');

    const srcFile = path.join(tmpDir, 'src', 'config.ts');
    fs.mkdirSync(path.dirname(srcFile), { recursive: true });
    fs.writeFileSync(srcFile, `
      const secret = process.env.STRIPE_SECRET_KEY;
      const db = process.env.DATABASE_URL;
    `);

    const report = EnvDriftAuditorService.audit(guard, { generateExample: true });
    expect(report.scannedEnvFiles.length).toBeGreaterThanOrEqual(2);
    expect(report.missingInActive).toContain('DATABASE_URL');
    expect(report.undeclaredInEnv).toContain('STRIPE_SECRET_KEY');
    expect(report.suggestedExampleContent).toBeDefined();
    expect(report.suggestedExampleContent).toContain('STRIPE_SECRET_KEY=');
  });

  it('FailureReplayRecorderService generates standalone interactive replay HTML package', () => {
    const replay = FailureReplayRecorderService.recordFromFailure(guard, {
      testTitle: 'Checkout Flow Test',
      testFile: 'tests/e2e/checkout.spec.ts',
      errorMessage: 'Timed out waiting for locator [data-testid="pay-button"]',
      steps: [
        { action: 'NAVIGATE', target: 'http://localhost:3000/cart', durationMs: 120, passed: true },
        { action: 'CLICK', target: 'button.checkout', durationMs: 80, passed: true },
        { action: 'ASSERT', target: '[data-testid="pay-button"]', durationMs: 5000, passed: false }
      ],
      saveToFile: true
    });

    expect(replay.id).toBeDefined();
    expect(replay.failedStepIndex).toBe(3);
    expect(replay.frames.length).toBe(3);
    expect(replay.standaloneHtmlReplayer).toContain('VeloProve Failure Visual Replayer');
    expect(replay.standaloneHtmlReplayer).toContain('Checkout Flow Test');
  });

  it('RateLimitAuditorService probes HTTP server and calculates resilience verdict', async () => {
    // Scaffold test local HTTP server with rate-limiting response
    let callCount = 0;
    const testServer = http.createServer((req, res) => {
      callCount++;
      if (callCount > 5) {
        res.writeHead(429, {
          'Content-Type': 'application/json',
          'RateLimit-Limit': '5',
          'RateLimit-Remaining': '0'
        });
        res.end(JSON.stringify({ error: 'Too Many Requests' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'OK' }));
      }
    });

    await new Promise<void>((resolve) => testServer.listen(9876, () => resolve()));

    try {
      const probe = await RateLimitAuditorService.auditEndpoint({
        targetUrl: 'http://127.0.0.1:9876/api',
        requestCount: 15,
        concurrency: 5
      });

      expect(probe.totalRequestsSent).toBe(15);
      expect(probe.rateLimited429Count).toBeGreaterThan(0);
      expect(probe.hasRateLimitingProtection).toBe(true);
      expect(probe.detectedHeaders.limitHeader).toBe('5');
    } finally {
      testServer.close();
    }
  });

  it('StatefulMockServerService starts in-memory CRUD server, handles state mutations, and resets', async () => {
    const mockRes = await StatefulMockServerService.startServer({
      port: 4949,
      initialData: {
        books: [{ id: 'b1', title: 'Clean Architecture' }]
      }
    });

    expect(mockRes.status).toBe('RUNNING');
    expect(mockRes.collections).toContain('books');

    // Make request to get books
    const getBooks = await new Promise<{ status: number; body: any }>((resolve) => {
      http.get('http://127.0.0.1:4949/api/books', (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
        });
      });
    });

    expect(getBooks.status).toBe(200);
    expect(getBooks.body.length).toBe(1);
    expect(getBooks.body[0].title).toBe('Clean Architecture');

    // Reset state
    const resetRes = StatefulMockServerService.resetState();
    expect(resetRes.itemCount).toBe(1);

    const stopRes = StatefulMockServerService.stopServer();
    expect(stopRes.status).toBe('STOPPED');
  });

  it('ArchitectureGraphService generates system topology and Mermaid diagram', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      dependencies: {
        'pg': '^8.0.0',
        'redis': '^4.0.0',
        'stripe': '^12.0.0',
        'openai': '^4.0.0'
      }
    }));

    const graph = ArchitectureGraphService.generateGraph(guard);
    expect(graph.nodesCount).toBeGreaterThanOrEqual(4);
    expect(graph.edgesCount).toBeGreaterThanOrEqual(3);
    expect(graph.mermaidDiagram).toContain('graph TD');
    expect(graph.summary.databases).toContain('PostgreSQL / Relational DB');
    expect(graph.summary.externalIntegrations).toContain('Stripe Payments');
    expect(graph.summary.externalIntegrations).toContain('AI / LLM Provider');
  });

  it('VeloProveEngine provides unified access to all Phase 7 services', async () => {
    const screenRep = engine.simulateScreenReader({ rawHtml: '<button aria-label="Save">Save</button>' });
    expect(screenRep.readabilityScore).toBe(100);

    const dbRep = engine.auditDbQueries();
    expect(dbRep.verdict).toBeDefined();

    const envRep = engine.auditEnvDrift();
    expect(envRep.verdict).toBeDefined();

    const archGraph = engine.generateArchitectureGraph();
    expect(archGraph.mermaidDiagram).toBeDefined();
  });
});
