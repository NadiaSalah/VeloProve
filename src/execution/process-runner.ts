import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { WorkspaceGuard } from './workspace-guard.js';

export interface ProcessRunOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  /** Soft cap on combined stdout+stderr retained in memory (default 8MB). */
  maxOutputBytes?: number;
  signal?: AbortSignal;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

export interface ProcessRunResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  cancelled: boolean;
  truncated: boolean;
}

const SENSITIVE_PATTERNS = [
  /Bearer\s+([a-zA-Z0-9_\-.~+/]+=*)/gi,
  /(?:api[_-]?key|secret|token|password|auth|private[_-]?key)\s*[:=]\s*["']?([a-zA-Z0-9_\-.~+/]+=*)["']?/gi,
  /postgres:\/\/[^:]+:([^@]+)@/gi,
  /mongodb(?:\+srv)?:\/\/[^:]+:([^@]+)@/gi,
  /mysql:\/\/[^:]+:([^@]+)@/gi
];

export function redactSecrets(text: string): string {
  let redacted = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, (match, p1) => {
      if (p1 && p1.length > 4) {
        return match.replace(p1, `${p1.slice(0, 2)}***${p1.slice(-2)}`);
      }
      return match.replace(p1, '***');
    });
  }
  return redacted;
}

function killProcessTree(child: ChildProcess): void {
  if (!child.pid) {
    try {
      child.kill('SIGKILL');
    } catch {
      /* ignore */
    }
    return;
  }

  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
        shell: false
      });
      return;
    } catch {
      /* fall through */
    }
  }

  try {
    child.kill('SIGKILL');
  } catch {
    /* ignore */
  }
}

export class SafeProcessRunner {
  private workspaceGuard: WorkspaceGuard;

  constructor(workspaceGuard: WorkspaceGuard) {
    this.workspaceGuard = workspaceGuard;
  }

  public async run(
    executable: string,
    args: string[],
    options: ProcessRunOptions = {}
  ): Promise<ProcessRunResult> {
    const cwd = options.cwd
      ? this.workspaceGuard.resolveSafePath(options.cwd)
      : this.workspaceGuard.getRoot();

    const startTime = Date.now();
    const timeoutMs = options.timeoutMs ?? 120_000;
    const maxOutputBytes = options.maxOutputBytes ?? 8 * 1024 * 1024;

    if (options.signal?.aborted) {
      return {
        exitCode: null,
        stdout: '',
        stderr: 'Process cancelled before start',
        durationMs: 0,
        timedOut: false,
        cancelled: true,
        truncated: false
      };
    }

    return new Promise<ProcessRunResult>((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let cancelled = false;
      let truncated = false;
      let settled = false;

      const isWindows = process.platform === 'win32';
      let execTarget = executable;
      // Default: never use shell for absolute/.exe paths (spaces in "Program Files").
      let useShell = false;

      // Bare npm ecosystem shims need shell on Windows (.cmd resolution).
      if (
        isWindows &&
        !executable.endsWith('.cmd') &&
        !executable.endsWith('.exe') &&
        !executable.includes('\\') &&
        !executable.includes('/')
      ) {
        const cmdWrappers = ['npx', 'npm', 'yarn', 'pnpm', 'vitest', 'jest', 'playwright', 'eslint', 'bun'];
        const low = executable.toLowerCase();
        if (cmdWrappers.includes(low)) {
          execTarget = executable;
          useShell = true;
        }
      }

      const spawnOpts: SpawnOptions = {
        cwd,
        env: { ...process.env, ...options.env },
        shell: useShell,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      };

      let child: ChildProcess;
      try {
        child = spawn(execTarget, args, spawnOpts);
      } catch (err) {
        resolve({
          exitCode: 1,
          stdout: '',
          stderr: redactSecrets(err instanceof Error ? err.message : String(err)),
          durationMs: Date.now() - startTime,
          timedOut: false,
          cancelled: false,
          truncated: false
        });
        return;
      }

      const finish = (exitCode: number | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', onAbort);
        resolve({
          exitCode,
          stdout: redactSecrets(stdout),
          stderr: redactSecrets(stderr),
          durationMs: Date.now() - startTime,
          timedOut,
          cancelled,
          truncated
        });
      };

      const appendBounded = (target: 'stdout' | 'stderr', text: string) => {
        const current = stdout.length + stderr.length;
        if (current >= maxOutputBytes) {
          truncated = true;
          return;
        }
        const room = maxOutputBytes - current;
        const chunk = text.length > room ? text.slice(0, room) : text;
        if (chunk.length < text.length) truncated = true;
        if (target === 'stdout') stdout += chunk;
        else stderr += chunk;
      };

      const onAbort = () => {
        cancelled = true;
        killProcessTree(child);
      };

      const timer = setTimeout(() => {
        timedOut = true;
        killProcessTree(child);
      }, timeoutMs);

      options.signal?.addEventListener('abort', onAbort, { once: true });

      child.stdout?.on('data', (chunk) => {
        const text = chunk.toString();
        appendBounded('stdout', text);
        options.onStdout?.(text);
      });

      child.stderr?.on('data', (chunk) => {
        const text = chunk.toString();
        appendBounded('stderr', text);
        options.onStderr?.(text);
      });

      child.on('error', (err) => {
        appendBounded('stderr', `\nProcess execution error: ${err.message}`);
        finish(1);
      });

      child.on('close', (code) => {
        finish(code);
      });
    });
  }
}
