import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { LoadTesterService } from '../../src/application/load-tester.js';
import { MockDataFactoryService } from '../../src/application/mock-data-factory.js';
import { OwaspScannerService } from '../../src/application/owasp-scanner.js';
import { RealtimeTesterService } from '../../src/application/realtime-tester.js';

describe('Advanced v1.3.0 Testing Engines (Load Tester, Mock Data Factory, OWASP Scanner, Realtime Tester)', () => {
  let mockServer: http.Server;
  const mockPort = 5992;
  const targetUrl = `http://localhost:${mockPort}/api/test`;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      mockServer = http.createServer((req, res) => {
        const url = req.url || '';
        if (url === '/graphql') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ data: { user: { id: '123', name: 'GraphQL User' } } }));
          });
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY'
        });
        res.end(JSON.stringify({ message: 'Hello from QAForge test server' }));
      });
      mockServer.listen(mockPort, () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
  });

  it('LoadTesterService executes concurrent requests and computes latency percentiles', async () => {
    const report = await LoadTesterService.runLoadTest({
      url: targetUrl,
      vus: 5,
      durationSec: 1
    });

    expect(report.totalRequests).toBeGreaterThan(0);
    expect(report.successfulRequests).toBe(report.totalRequests);
    expect(report.requestsPerSecond).toBeGreaterThan(0);
    expect(report.latency.avg).toBeGreaterThanOrEqual(0);
    expect(report.latency.p95).toBeGreaterThanOrEqual(report.latency.p50);
    expect(report.status).toBe('PASSED');
  });

  it('MockDataFactoryService generates realistic mock data across presets and locales', () => {
    const users = MockDataFactoryService.generate({ preset: 'user', count: 3 });
    expect(users.length).toBe(3);
    expect((users[0] as any).email).toContain('@example.com');

    const arabicUsers = MockDataFactoryService.generate({ preset: 'arabic_user', count: 2, locale: 'ar' });
    expect(arabicUsers.length).toBe(2);
    expect((arabicUsers[0] as any).country).toBe('Saudi Arabia');

    const orders = MockDataFactoryService.generate({ preset: 'order', count: 1 });
    expect((orders[0] as any).orderId).toContain('ORD-');

    const customSchemaData = MockDataFactoryService.generate({
      schema: {
        userId: 'string',
        userEmail: 'string',
        age: 'number',
        isAdmin: 'boolean'
      },
      count: 2
    });
    expect(customSchemaData.length).toBe(2);
    expect(typeof (customSchemaData[0] as any).age).toBe('number');
  });

  it('OwaspScannerService evaluates endpoint security headers and scores compliance', async () => {
    const report = await OwaspScannerService.scanEndpoint(targetUrl);
    expect(report.targetUrl).toBe(targetUrl);
    expect(report.totalChecks).toBeGreaterThan(4);
    expect(report.passedChecks).toBeGreaterThan(0);
    expect(report.probes.some(p => p.ruleId === 'SEC-HEADER-CLICKJACK' && p.passed)).toBe(true);
    expect(report.probes.some(p => p.ruleId === 'SEC-HEADER-NOSNIFF' && p.passed)).toBe(true);
  });

  it('RealtimeTesterService executes GraphQL query and validates expected data key', async () => {
    const result = await RealtimeTesterService.runGraphQL({
      endpoint: `http://localhost:${mockPort}/graphql`,
      query: 'query { user { id name } }',
      expectedDataKey: 'user'
    });

    expect(result.status).toBe('passed');
    expect(result.httpStatus).toBe(200);
    expect((result.data as any).user.name).toBe('GraphQL User');
  });
});
