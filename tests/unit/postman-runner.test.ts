import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { PostmanRunnerService, type PostmanCollection } from '../../src/adapters/api/postman-runner.js';
import { QAForgeEngine } from '../../src/application/engine.js';

describe('PostmanRunnerService & Collection Suite Runner', () => {
  const fixtureDir = path.resolve(process.cwd(), 'fixtures/postman-test-project');
  let guard: WorkspaceGuard;
  let mockServer: http.Server;
  const mockPort = 5988;

  beforeAll(async () => {
    if (!fs.existsSync(fixtureDir)) {
      fs.mkdirSync(fixtureDir, { recursive: true });
    }

    // Start a mock HTTP server to test real requests and variable extractions
    await new Promise<void>((resolve) => {
      mockServer = http.createServer((req, res) => {
        const url = req.url || '';
        const method = req.method || 'GET';

        if (url === '/api/login' && method === 'POST') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ token: 'jwt-mock-token-xyz', user: { id: 42, name: 'Tester' } }));
          return;
        }

        if (url === '/api/users' && method === 'GET') {
          const auth = req.headers['authorization'];
          if (auth && auth.includes('jwt-mock-token-xyz')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]));
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
          }
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      });

      mockServer.listen(mockPort, () => resolve());
    });

    guard = new WorkspaceGuard(fixtureDir);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
    try {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    } catch {}
  });

  it('sends single ad-hoc HTTP request and parses status and payload', async () => {
    const res = await PostmanRunnerService.sendRequest({
      method: 'POST',
      url: `http://localhost:${mockPort}/api/login`,
      body: { username: 'test', password: 'password' }
    });

    expect(res.status).toBe(200);
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
    expect(res.sizeBytes).toBeGreaterThan(0);
    expect(typeof res.body).toBe('object');
    expect((res.body as any).token).toBe('jwt-mock-token-xyz');
  });

  it('runs Postman collection with chained authentication and variable resolution', async () => {
    const sampleCollection: PostmanCollection = {
      info: {
        name: 'Auth & Users Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: '1. User Login',
          request: {
            method: 'POST',
            url: `http://localhost:${mockPort}/api/login`,
            body: {
              mode: 'raw',
              raw: JSON.stringify({ email: 'test@example.com' })
            }
          }
        },
        {
          name: '2. Get Users (Authenticated)',
          request: {
            method: 'GET',
            url: `http://localhost:${mockPort}/api/users`,
            header: [
              { key: 'Authorization', value: 'Bearer {{token}}' }
            ]
          }
        }
      ]
    };

    const runResult = await PostmanRunnerService.runCollection(sampleCollection);
    expect(runResult.totalRequests).toBe(2);
    expect(runResult.passedCount).toBe(2);
    expect(runResult.failedCount).toBe(0);
    expect(runResult.environment['token']).toBe('jwt-mock-token-xyz');
    expect(runResult.steps[1].httpStatus).toBe(200);
  });

  it('exports project routes to valid Postman v2.1 collection JSON', async () => {
    const mockProfile: any = {
      projectName: 'EcommerceApi',
      apiEndpoints: [
        { method: 'GET', path: '/api/products', authRequired: false, sourceFile: 'products.ts' },
        { method: 'POST', path: '/api/orders', authRequired: true, sourceFile: 'orders.ts' }
      ]
    };

    const col = PostmanRunnerService.exportToPostman(mockProfile);
    expect(col.info.name).toContain('EcommerceApi');
    expect(col.info.schema).toContain('v2.1.0');
    expect(col.item.length).toBeGreaterThan(0);

    const ordersGroup = col.item.find(i => i.name === 'ORDERS' || i.name === 'API');
    expect(ordersGroup).toBeDefined();
  });

  it('QAForgeEngine provides runPostmanCollection and exportPostmanCollection wrappers', async () => {
    const engine = new QAForgeEngine(fixtureDir);
    const exportResult = await engine.exportPostmanCollection('sample_export.json');
    expect(fs.existsSync(exportResult.savedPath)).toBe(true);

    const loaded = PostmanRunnerService.loadCollection(guard, 'sample_export.json');
    expect(loaded.info.schema).toContain('getpostman.com');
  });
});
