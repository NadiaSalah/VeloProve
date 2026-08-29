import crypto from 'node:crypto';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import { OwaspScannerService, type OwaspScanReport } from './owasp-scanner.js';
import { LoadTesterService, type LoadTestReport } from './load-tester.js';

export type ProbeType = 'standalone_js' | 'nextjs_route' | 'express_middleware' | 'html_snippet';

export interface RemoteProbeConfig {
  secretToken?: string;
  siteName?: string;
  allowedOrigins?: string[];
  enableErrorCapture?: boolean;
}

export interface RemoteHandshakeResult {
  connected: boolean;
  targetUrl: string;
  siteName: string;
  serverTime: string;
  uptimeSeconds?: number;
  environment?: string;
  nodeVersion?: string;
  routesDiscovered: string[];
  recentErrors: Array<{ timestamp: string; message: string; stack?: string }>;
  statusMessage: string;
}

export interface RemoteAuditReport {
  targetUrl: string;
  auditedAt: string;
  reachability: {
    status: number;
    statusText: string;
    responseTimeMs: number;
    isOnline: boolean;
  };
  discoveredLinks: string[];
  discoveredForms: Array<{ action?: string; method?: string; inputs: string[] }>;
  owaspReport: OwaspScanReport;
  loadBenchmark?: LoadTestReport;
  overallHealthScore: number; // 0 - 100
  verdict: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  summary: string;
}

export class RemoteBridgeService {
  /**
   * Generate a secure secret token for the bridge probe
   */
  public static generateSecretToken(): string {
    return 'qaf_bridge_' + crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate companion probe script / middleware to place in the live website
   */
  public static generateProbeSnippet(
    type: ProbeType = 'standalone_js',
    config: RemoteProbeConfig = {}
  ): { code: string; filename: string; instructions: string } {
    const secret = config.secretToken || this.generateSecretToken();
    const siteName = config.siteName || 'LiveApp';

    switch (type) {
      case 'nextjs_route': {
        const code = `// app/api/qaforge/route.ts (Next.js App Router)
import { NextResponse } from 'next/server';

const QAFORGE_SECRET = process.env.QAFORGE_BRIDGE_SECRET || '${secret}';
const capturedErrors: any[] = [];

// Optional: Global error tap
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err) => {
    capturedErrors.push({ timestamp: new Date().toISOString(), message: err.message, stack: err.stack });
    if (capturedErrors.length > 50) capturedErrors.shift();
  });
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('x-qaforge-secret') || new URL(req.url).searchParams.get('secret');
  if (authHeader !== QAFORGE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized QAForge probe access' }, { status: 401 });
  }

  return NextResponse.json({
    status: 'active',
    siteName: '${siteName}',
    serverTime: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'production',
    nodeVersion: process.version,
    routesDiscovered: ['/', '/api/users', '/login', '/dashboard'],
    recentErrors: capturedErrors.slice(-10)
  });
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('x-qaforge-secret');
  if (authHeader !== QAFORGE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({ success: true, echo: body, timestamp: Date.now() });
}
`;
        return {
          code,
          filename: 'app/api/qaforge/route.ts',
          instructions: `Place this file in your Next.js project at "app/api/qaforge/route.ts". Ensure secret token is "${secret}".`
        };
      }

      case 'express_middleware': {
        const code = `// qaforge-middleware.js (Express / Node Server)
const QAFORGE_SECRET = process.env.QAFORGE_BRIDGE_SECRET || '${secret}';
const errorBuffer = [];

function qaforgeBridgeMiddleware(req, res, next) {
  if (req.path === '/api/qaforge-probe' || req.path === '/.well-known/qaforge.json') {
    const auth = req.headers['x-qaforge-secret'] || req.query.secret;
    if (auth !== QAFORGE_SECRET) {
      return res.status(401).json({ error: 'Unauthorized QAForge Probe' });
    }
    return res.json({
      status: 'active',
      siteName: '${siteName}',
      serverTime: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'production',
      nodeVersion: process.version,
      routesDiscovered: req.app._router ? req.app._router.stack.filter(r => r.route).map(r => r.route.path) : [],
      recentErrors: errorBuffer.slice(-10)
    });
  }
  next();
}

module.exports = { qaforgeBridgeMiddleware, QAFORGE_SECRET };
`;
        return {
          code,
          filename: 'qaforge-middleware.js',
          instructions: `Import into your Express app: "app.use(qaforgeBridgeMiddleware);". Accessible at "/api/qaforge-probe".`
        };
      }

      case 'html_snippet': {
        const code = `<!-- QAForge Live Client Bridge Script -->
<script>
(function() {
  window.__QAFORGE_CLIENT_PROBE__ = {
    version: '1.0.0',
    site: '${siteName}',
    errors: [],
    logs: []
  };
  window.addEventListener('error', function(e) {
    window.__QAFORGE_CLIENT_PROBE__.errors.push({
      message: e.message,
      source: e.filename,
      lineno: e.lineno,
      timestamp: new Date().toISOString()
    });
  });
})();
</script>
`;
        return {
          code,
          filename: 'qaforge-client-probe.html',
          instructions: `Paste this <script> inside the <head> of your live web application's HTML template.`
        };
      }

      case 'standalone_js':
      default: {
        const code = `// qaforge-probe.js (Zero-dependency standalone HTTP bridge for any live server)
const http = require('http');

const PORT = process.env.QAFORGE_PROBE_PORT || 7788;
const SECRET = process.env.QAFORGE_BRIDGE_SECRET || '${secret}';
const SITE_NAME = '${siteName}';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'x-qaforge-secret, Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const token = req.headers['x-qaforge-secret'] || new URL(req.url, 'http://localhost').searchParams.get('secret');
  if (token !== SECRET) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unauthorized: Invalid QAForge Bridge Token' }));
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'active',
    siteName: SITE_NAME,
    serverTime: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'production',
    nodeVersion: process.version,
    routesDiscovered: ['/', '/api/health', '/api/data'],
    recentErrors: []
  }, null, 2));
});

server.listen(PORT, () => {
  console.log(\`⚡ QAForge Live Remote Companion Probe running on port \${PORT}\`);
  console.log(\`Bridge Secret: \${SECRET}\`);
});
`;
        return {
          code,
          filename: 'qaforge-probe.js',
          instructions: `Upload "qaforge-probe.js" to your live server and run with "node qaforge-probe.js". Connect via port 7788.`
        };
      }
    }
  }

  /**
   * Connect and handshake with a live remote website via probe endpoint
   */
  public static async connectAndHandshake(
    remoteUrl: string,
    bridgeSecret?: string
  ): Promise<RemoteHandshakeResult> {
    const cleanUrl = remoteUrl.replace(/\/+$/, '');
    const probeEndpoints = [
      `${cleanUrl}/api/qaforge`,
      `${cleanUrl}/api/qaforge-probe`,
      `${cleanUrl}/.well-known/qaforge.json`,
      cleanUrl
    ];

    let lastError = 'No response from probe endpoints';

    for (const endpoint of probeEndpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const headers: Record<string, string> = {
          'User-Agent': 'QAForge-Remote-Agent/1.0'
        };
        if (bridgeSecret) {
          headers['x-qaforge-secret'] = bridgeSecret;
        }

        const res = await fetch(endpoint, {
          method: 'GET',
          headers,
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data: any = await res.json().catch(() => null);
          if (data && (data.status === 'active' || data.siteName)) {
            return {
              connected: true,
              targetUrl: remoteUrl,
              siteName: data.siteName || 'Remote Application',
              serverTime: data.serverTime || new Date().toISOString(),
              uptimeSeconds: data.uptimeSeconds,
              environment: data.environment || 'live',
              nodeVersion: data.nodeVersion,
              routesDiscovered: Array.isArray(data.routesDiscovered) ? data.routesDiscovered : [],
              recentErrors: Array.isArray(data.recentErrors) ? data.recentErrors : [],
              statusMessage: `Successfully established authenticated link with ${endpoint}`
            };
          }
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    return {
      connected: false,
      targetUrl: remoteUrl,
      siteName: 'Unknown',
      serverTime: new Date().toISOString(),
      routesDiscovered: [],
      recentErrors: [],
      statusMessage: `Failed to connect with live probe. Error: ${lastError}`
    };
  }

  /**
   * Run comprehensive remote QA & security audit against any live website
   */
  public static async runRemoteAudit(
    remoteUrl: string,
    options: {
      includeLoadTest?: boolean;
      loadVus?: number;
      bridgeSecret?: string;
    } = {}
  ): Promise<RemoteAuditReport> {
    const startTime = Date.now();
    let isOnline = false;
    let status = 0;
    let statusText = '';
    let htmlContent = '';
    const discoveredLinks: string[] = [];
    const discoveredForms: Array<{ action?: string; method?: string; inputs: string[] }> = [];

    // Step 1: Reachability & HTML Parse
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(remoteUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'QAForge-LiveAuditor/1.0' },
        signal: controller.signal
      });
      clearTimeout(timeout);

      status = res.status;
      statusText = res.statusText;
      isOnline = res.status >= 200 && res.status < 500;
      htmlContent = await res.text();

      // Extract href links
      const linkRegex = /href=["'](https?:\/\/[^"']+|\/[^"']+)["']/gi;
      let match;
      while ((match = linkRegex.exec(htmlContent)) !== null) {
        if (!discoveredLinks.includes(match[1]) && !match[1].startsWith('#')) {
          discoveredLinks.push(match[1]);
        }
      }

      // Extract forms
      const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
      let formMatch;
      while ((formMatch = formRegex.exec(htmlContent)) !== null) {
        const formAttrs = formMatch[1];
        const formBody = formMatch[2];
        const actionMatch = /action=["']([^"']+)["']/i.exec(formAttrs);
        const methodMatch = /method=["']([^"']+)["']/i.exec(formAttrs);

        const inputs: string[] = [];
        const inputRegex = /<input\b[^>]*name=["']([^"']+)["']/gi;
        let inputMatch;
        while ((inputMatch = inputRegex.exec(formBody)) !== null) {
          inputs.push(inputMatch[1]);
        }

        discoveredForms.push({
          action: actionMatch ? actionMatch[1] : undefined,
          method: methodMatch ? methodMatch[1].toUpperCase() : 'GET',
          inputs
        });
      }
    } catch {
      isOnline = false;
    }

    const responseTimeMs = Date.now() - startTime;

    // Step 2: OWASP Top 10 Security Audit
    const owaspReport = await OwaspScannerService.scanEndpoint(remoteUrl);

    // Step 3: Optional Load Benchmark
    let loadBenchmark: LoadTestReport | undefined;
    if (options.includeLoadTest && isOnline) {
      loadBenchmark = await LoadTesterService.runLoadTest({
        url: remoteUrl,
        vus: options.loadVus || 8,
        durationSec: 3
      });
    }

    // Step 4: Calculate Health Score
    let healthScore = 100;
    if (!isOnline) {
      healthScore = 0;
    } else {
      if (owaspReport.overallScore < 70) healthScore -= 25;
      else if (owaspReport.overallScore < 85) healthScore -= 10;

      if (responseTimeMs > 1200) healthScore -= 20;
      else if (responseTimeMs > 600) healthScore -= 10;

      if (loadBenchmark && loadBenchmark.errorRatePercent > 5) healthScore -= 20;
    }
    healthScore = Math.max(0, Math.min(100, healthScore));

    let verdict: RemoteAuditReport['verdict'] = 'HEALTHY';
    if (healthScore < 50) verdict = 'CRITICAL';
    else if (healthScore < 80) verdict = 'DEGRADED';

    const summary = `${verdict} (Score: ${healthScore}/100): Remote site is ${isOnline ? 'ONLINE' : 'OFFLINE'} (${responseTimeMs}ms TTFB). Discovered ${discoveredLinks.length} link(s), ${discoveredForms.length} form(s). OWASP Grade: ${owaspReport.grade} (${owaspReport.overallScore}/100).`;

    return {
      targetUrl: remoteUrl,
      auditedAt: new Date().toISOString(),
      reachability: {
        status,
        statusText,
        responseTimeMs,
        isOnline
      },
      discoveredLinks: discoveredLinks.slice(0, 50),
      discoveredForms,
      owaspReport,
      loadBenchmark,
      overallHealthScore: healthScore,
      verdict,
      summary
    };
  }
}
