import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import { DevServerManager, type DevServerOptions } from '../execution/server-manager.js';
import { ConfigLoader } from '../shared/config-loader.js';

export interface EnsureDevServerOptions {
  /** Target URL to bring online (defaults to config browser/api baseURL). */
  baseURL?: string;
  /** Force start even if reuseExisting is preferred. */
  forceRestart?: boolean;
  /** Override spawn command (e.g. "npm run dev"). */
  command?: string;
  port?: number;
  healthEndpoint?: string;
  timeoutMs?: number;
  /** When true (default), skip spawn if URL already healthy. */
  reuseExisting?: boolean;
}

export interface EnsureDevServerResult {
  baseURL: string;
  alreadyRunning: boolean;
  started: boolean;
  command?: string;
  port: number;
  healthEndpoint: string;
  durationMs: number;
  message: string;
}

/**
 * Smart DevServer Auto-Launcher:
 * probes a baseURL, auto-detects npm/pnpm/yarn/bun dev scripts,
 * and starts a local server when offline — used before E2E/security/live scans.
 */
export class SmartDevServerService {
  public static async ensure(
    guard: WorkspaceGuard,
    options: EnsureDevServerOptions = {}
  ): Promise<EnsureDevServerResult> {
    const startedAt = Date.now();
    const config = await new ConfigLoader(guard).loadConfig();
    const detected = this.detectDevScript(guard.getRoot());

    const port =
      options.port ||
      this.portFromUrl(options.baseURL) ||
      config.devServer?.port ||
      this.portFromUrl(config.browser?.baseURL) ||
      this.portFromUrl(config.api?.baseURL) ||
      detected.port ||
      5173;

    const healthEndpoint = options.healthEndpoint || config.devServer?.healthEndpoint || '/';
    const timeoutMs = options.timeoutMs || config.devServer?.timeoutMs || 30000;
    const reuseExisting = options.reuseExisting ?? config.devServer?.reuseExisting ?? true;
    const command =
      options.command ||
      config.devServer?.command ||
      detected.command;

    const baseURL =
      options.baseURL ||
      config.browser?.baseURL ||
      config.api?.baseURL ||
      `http://localhost:${port}`;

    const healthy = await this.probeUrl(baseURL, healthEndpoint);
    if (healthy && reuseExisting && !options.forceRestart) {
      return {
        baseURL,
        alreadyRunning: true,
        started: false,
        command,
        port,
        healthEndpoint,
        durationMs: Date.now() - startedAt,
        message: `Dev server already healthy at ${baseURL}`
      };
    }

    if (!command) {
      return {
        baseURL,
        alreadyRunning: healthy,
        started: false,
        port,
        healthEndpoint,
        durationMs: Date.now() - startedAt,
        message: healthy
          ? `Target reachable at ${baseURL}`
          : `Target offline at ${baseURL} and no dev script detected (add "dev"/"start" to package.json or set devServer.command in veloprove.config.json)`
      };
    }

    const manager = new DevServerManager(guard);
    const ensureOpts: DevServerOptions = {
      command,
      port,
      healthEndpoint,
      timeoutMs,
      reuseExisting
    };

    try {
      const url = await manager.ensureServer(ensureOpts);
      const nowHealthy = await this.probeUrl(url, healthEndpoint);
      return {
        baseURL: url,
        alreadyRunning: false,
        started: nowHealthy,
        command,
        port,
        healthEndpoint,
        durationMs: Date.now() - startedAt,
        message: nowHealthy
          ? `Started "${command}" and confirmed health at ${url}`
          : `Spawned "${command}" but health check did not pass within ${timeoutMs}ms`
      };
    } catch (err: any) {
      return {
        baseURL,
        alreadyRunning: false,
        started: false,
        command,
        port,
        healthEndpoint,
        durationMs: Date.now() - startedAt,
        message: `Failed to start dev server: ${err.message}`
      };
    }
  }

  public static detectDevScript(projectRoot: string): { command?: string; port?: number } {
    const pkgPath = path.join(projectRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) return {};

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const scripts = pkg.scripts || {};
      const pm = this.detectPackageManager(projectRoot);
      const scriptName = ['dev', 'start', 'develop', 'serve'].find((s) => typeof scripts[s] === 'string');
      if (!scriptName) return {};

      const scriptBody = String(scripts[scriptName]);
      const portMatch = scriptBody.match(/(?:--port|-p|PORT=)\s*(\d{2,5})/i);
      const port = portMatch ? parseInt(portMatch[1], 10) : undefined;

      const command =
        pm === 'pnpm'
          ? `pnpm run ${scriptName}`
          : pm === 'yarn'
            ? `yarn ${scriptName}`
            : pm === 'bun'
              ? `bun run ${scriptName}`
              : `npm run ${scriptName}`;

      return { command, port };
    } catch {
      return {};
    }
  }

  public static detectPackageManager(projectRoot: string): 'npm' | 'pnpm' | 'yarn' | 'bun' {
    if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(projectRoot, 'bun.lockb')) || fs.existsSync(path.join(projectRoot, 'bun.lock'))) {
      return 'bun';
    }
    return 'npm';
  }

  public static portFromUrl(url?: string): number | undefined {
    if (!url) return undefined;
    try {
      const parsed = new URL(url);
      if (parsed.port) return parseInt(parsed.port, 10);
      if (parsed.protocol === 'https:') return 443;
      if (parsed.protocol === 'http:') return 80;
    } catch {
      return undefined;
    }
    return undefined;
  }

  public static probeUrl(baseURL: string, healthEndpoint = '/'): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const target = new URL(healthEndpoint, baseURL);
        const lib = target.protocol === 'https:' ? https : http;
        const req = lib.get(
          {
            hostname: target.hostname,
            port: target.port || (target.protocol === 'https:' ? 443 : 80),
            path: target.pathname + target.search,
            timeout: 1500,
            headers: { 'User-Agent': 'VeloProve-SmartDevServer/1.0' }
          },
          (res) => {
            res.resume();
            resolve(res.statusCode !== undefined && res.statusCode < 500);
          }
        );
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  }
}
