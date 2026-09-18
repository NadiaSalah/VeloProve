import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { RemoteBridgeService } from '../../src/application/remote-bridge.js';
import { VeloProveEngine } from '../../src/application/engine.js';

describe('RemoteBridgeService & Live Companion Bridge Engine', () => {
  let mockLiveServer: http.Server;
  const mockPort = 5998;
  const targetUrl = `http://localhost:${mockPort}`;
  const validSecret = 'qaf_secret_test_123';

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      mockLiveServer = http.createServer((req, res) => {
        const url = req.url || '';

        // Live Probe Endpoint
        if (url.startsWith('/api/veloprove') || url.startsWith('/.well-known/veloprove.json')) {
          const authHeader = req.headers['x-veloprove-secret'];
          if (authHeader !== validSecret) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Unauthorized' }));
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            status: 'active',
            siteName: 'MockProductionApp',
            serverTime: new Date().toISOString(),
            uptimeSeconds: 3600,
            environment: 'production',
            nodeVersion: 'v20.10.0',
            routesDiscovered: ['/', '/api/items', '/login', '/checkout'],
            recentErrors: []
          }));
        }

        // Standard Webpage
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN'
        });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Live Test App</title></head>
            <body>
              <h1>Welcome to Live Site</h1>
              <a href="/about">About</a>
              <a href="https://example.com/pricing">Pricing</a>
              <form action="/login" method="POST">
                <input name="username" />
                <input name="password" type="password" />
              </form>
            </body>
          </html>
        `);
      });
      mockLiveServer.listen(mockPort, () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => mockLiveServer.close(() => resolve()));
  });

  it('generates drop-in probe snippets across multiple stacks (standalone, nextjs, express, html)', () => {
    const standalone = RemoteBridgeService.generateProbeSnippet('standalone_js', { siteName: 'MySite' });
    expect(standalone.code).toContain('veloprove-probe.js');
    expect(standalone.filename).toBe('veloprove-probe.js');

    const nextjs = RemoteBridgeService.generateProbeSnippet('nextjs_route');
    expect(nextjs.filename).toBe('app/api/veloprove/route.ts');
    expect(nextjs.code).toContain('NextResponse.json');

    const express = RemoteBridgeService.generateProbeSnippet('express_middleware');
    expect(express.filename).toBe('veloprove-middleware.js');
    expect(express.code).toContain('veloproveBridgeMiddleware');

    const html = RemoteBridgeService.generateProbeSnippet('html_snippet');
    expect(html.filename).toBe('veloprove-client-probe.html');
    expect(html.code).toContain('__VELOPROVE_CLIENT_PROBE__');
  });

  it('successfully handshakes with live remote probe when valid secret token is provided', async () => {
    const result = await RemoteBridgeService.connectAndHandshake(targetUrl, validSecret);
    expect(result.connected).toBe(true);
    expect(result.siteName).toBe('MockProductionApp');
    expect(result.routesDiscovered).toContain('/checkout');
    expect(result.environment).toBe('production');
  });

  it('rejects connection when wrong or missing secret token is passed', async () => {
    const result = await RemoteBridgeService.connectAndHandshake(targetUrl, 'wrong_token');
    expect(result.connected).toBe(false);
  });

  it('runs complete remote audit extracting links, forms, and security grades', async () => {
    const report = await RemoteBridgeService.runRemoteAudit(targetUrl, {
      includeLoadTest: false
    });

    expect(report.reachability.isOnline).toBe(true);
    expect(report.discoveredLinks.length).toBeGreaterThan(0);
    expect(report.discoveredForms.length).toBe(1);
    expect(report.discoveredForms[0].inputs).toContain('username');
    expect(report.owaspReport.overallScore).toBeGreaterThan(0);
    expect(report.overallHealthScore).toBeGreaterThan(0);
  });

  it('VeloProveEngine provides generateRemoteProbe, connectRemoteSite, and auditRemoteSite methods', async () => {
    const engine = new VeloProveEngine(process.cwd());
    const snippet = engine.generateRemoteProbe('standalone_js');
    expect(snippet.code).toBeDefined();

    const handshake = await engine.connectRemoteSite(targetUrl, validSecret);
    expect(handshake.connected).toBe(true);

    const audit = await engine.auditRemoteSite(targetUrl);
    expect(audit.reachability.isOnline).toBe(true);
  });
});
