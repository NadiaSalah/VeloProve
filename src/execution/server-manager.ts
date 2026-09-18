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

/** Split a command into argv without invoking a shell. */
function parseCommand(command: string): { executable: string; args: string[] } {
  const trimmed = command.trim();
  if (!trimmed) {
    throw new Error('Dev server command is empty');
  }
  // Reject obvious shell metacharacters — callers must pass a simple argv-style command
  if (/[|&;<>`$(){}]/.test(trimmed) || trimmed.includes('\n')) {
    throw new Error(
      'Dev server command contains shell metacharacters. Pass a simple command like "npm run dev".'
    );
  }

  const parts = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((p) => p.replace(/^"|"$/g, '')) || [];
  if (parts.length === 0) {
    throw new Error('Dev server command could not be parsed');
  }

  let executable = parts[0];
  const args = parts.slice(1);

  if (process.platform === 'win32') {
    const low = executable.toLowerCase();
    const cmdWrappers = ['npm', 'npx', 'yarn', 'pnpm', 'bun'];
    if (cmdWrappers.includes(low) && !executable.endsWith('.cmd')) {
      executable = `${executable}.cmd`;
    }
  }

  return { executable, args };
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

    const isRunning = await this.checkHealth(this.port, healthEndpoint);
    if (isRunning) {
      return baseURL;
    }

    if (!options.command) {
      return baseURL;
    }

    const { executable, args } = parseCommand(options.command);

    this.serverProcess = spawn(executable, args, {
      cwd: this.workspaceGuard.getRoot(),
      shell: false,
      stdio: 'ignore',
      windowsHide: true
    });

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      await new Promise((r) => setTimeout(r, 500));
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
          spawn('taskkill', ['/pid', String(this.serverProcess.pid), '/f', '/t'], {
            shell: false,
            stdio: 'ignore',
            windowsHide: true
          });
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
          res.resume();
          resolve(typeof res.statusCode === 'number' && res.statusCode < 500);
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
