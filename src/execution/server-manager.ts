import http from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import type { WorkspaceGuard } from './workspace-guard.js';

export interface DevServerOptions {
  command?: string;
  port?: number;
  healthEndpoint?: string;
  timeoutMs?: number;
  reuseExisting?: boolean;
}

export class DevServerManager {
  private workspaceGuard: WorkspaceGuard;
  private serverProcess: ChildProcess | null = null;
  private port: number = 5173;

  constructor(workspaceGuard: WorkspaceGuard) {
    this.workspaceGuard = workspaceGuard;
  }

  public async ensureServer(options: DevServerOptions = {}): Promise<string> {
    this.port = options.port || 5173;
    const healthEndpoint = options.healthEndpoint || '/';
    const timeoutMs = options.timeoutMs || 30000;
    const baseURL = `http://localhost:${this.port}`;

    // 1. Check if server already running
    const isRunning = await this.checkHealth(this.port, healthEndpoint);
    if (isRunning) {
      return baseURL;
    }

    if (!options.command) {
      return baseURL; // Assume external server or offline test
    }

    // 2. Start dev server
    const isWindows = process.platform === 'win32';
    const parts = options.command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    this.serverProcess = spawn(cmd, args, {
      cwd: this.workspaceGuard.getRoot(),
      shell: isWindows,
      stdio: 'ignore'
    });

    // 3. Poll health check until ready
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      await new Promise(r => setTimeout(r, 500));
      const healthy = await this.checkHealth(this.port, healthEndpoint);
      if (healthy) {
        return baseURL;
      }
    }

    throw new Error(`Dev server failed to start on ${baseURL} within ${timeoutMs}ms`);
  }

  public async stopServer(): Promise<void> {
    if (this.serverProcess && this.serverProcess.pid) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(this.serverProcess.pid), '/f', '/t'], { shell: true });
        } else {
          this.serverProcess.kill('SIGTERM');
        }
      } catch {
        // ignore cleanup errors
      }
      this.serverProcess = null;
    }
  }

  private checkHealth(port: number, endpoint: string): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(
        {
          host: 'localhost',
          port,
          path: endpoint,
          timeout: 1000
        },
        (res) => {
          resolve(res.statusCode !== undefined && res.statusCode < 500);
        }
      );

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }
}
