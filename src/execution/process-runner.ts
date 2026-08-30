import { spawn, type SpawnOptions } from 'node:child_process';
import { WorkspaceGuard } from './workspace-guard.js';

export interface ProcessRunOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

export interface ProcessRunResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
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

    return new Promise<ProcessRunResult>((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const isWindows = process.platform === 'win32';
      let execTarget = executable;
      let useShell = isWindows;

      // On Windows, resolve command wrappers (.cmd) or known executables (.exe) directly to avoid DEP0190 shell warning
      if (isWindows && !executable.endsWith('.cmd') && !executable.endsWith('.exe') && !executable.includes('\\') && !executable.includes('/')) {
        const cmdWrappers = ['npx', 'npm', 'yarn', 'pnpm', 'vitest', 'jest', 'playwright', 'eslint'];
        const directExecs = ['git', 'node', 'docker', 'tar', 'curl', 'taskkill'];
        const low = executable.toLowerCase();

        if (cmdWrappers.includes(low)) {
          execTarget = `${executable}.cmd`;
          useShell = false;
        } else if (directExecs.includes(low)) {
          execTarget = executable;
          useShell = false;
        }
      }

      const spawnOpts: SpawnOptions = {
        cwd,
        env: { ...process.env, ...options.env },
        shell: useShell,
        stdio: ['ignore', 'pipe', 'pipe']
      };

      const child = spawn(execTarget, args, spawnOpts);

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);

      child.stdout?.on('data', (chunk) => {
        const text = chunk.toString();
        stdout += text;
        options.onStdout?.(text);
      });

      child.stderr?.on('data', (chunk) => {
        const text = chunk.toString();
        stderr += text;
        options.onStderr?.(text);
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        stderr += `\nProcess execution error: ${err.message}`;
        resolve({
          exitCode: 1,
          stdout: redactSecrets(stdout),
          stderr: redactSecrets(stderr),
          durationMs: Date.now() - startTime,
          timedOut
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          exitCode: code,
          stdout: redactSecrets(stdout),
          stderr: redactSecrets(stderr),
          durationMs: Date.now() - startTime,
          timedOut
        });
      });
    });
  }
}
