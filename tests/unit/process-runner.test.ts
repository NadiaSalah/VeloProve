import { describe, it, expect } from 'vitest';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { SafeProcessRunner } from '../../src/execution/process-runner.js';

describe('SafeProcessRunner reliability', () => {
  it('captures stdout and redacts obvious secrets', async () => {
    const guard = new WorkspaceGuard(process.cwd());
    const runner = new SafeProcessRunner(guard);
    const result = await runner.run(
      'node',
      ['-e', "process.stdout.write('token=abcdEFGH12345678'); process.stderr.write('ok')"],
      { timeoutMs: 10_000 }
    );
    expect(result.exitCode).toBe(0);
    expect(result.cancelled).toBe(false);
    expect(result.timedOut).toBe(false);
    expect(result.stdout).toContain('***');
    expect(result.stdout).not.toContain('abcdEFGH12345678');
  });

  it('honors AbortSignal cancellation', async () => {
    const guard = new WorkspaceGuard(process.cwd());
    const runner = new SafeProcessRunner(guard);
    const controller = new AbortController();
    const pending = runner.run(
      'node',
      ['-e', 'setTimeout(() => {}, 30000)'],
      { timeoutMs: 60_000, signal: controller.signal }
    );
    setTimeout(() => controller.abort(), 50);
    const result = await pending;
    expect(result.cancelled || result.exitCode !== 0).toBe(true);
  });

  it('returns cancelled immediately when already aborted', async () => {
    const guard = new WorkspaceGuard(process.cwd());
    const runner = new SafeProcessRunner(guard);
    const controller = new AbortController();
    controller.abort();
    const result = await runner.run('node', ['-e', 'console.log(1)'], {
      signal: controller.signal
    });
    expect(result.cancelled).toBe(true);
    expect(result.exitCode).toBeNull();
  });

  it('spawns npm ecosystem shims without throwing on Windows', async () => {
    const guard = new WorkspaceGuard(process.cwd());
    const runner = new SafeProcessRunner(guard);
    const result = await runner.run('npx', ['--version'], { timeoutMs: 20_000 });
    expect(result.cancelled).toBe(false);
    expect(result.stderr).not.toMatch(/spawn EINVAL/i);
    expect(result.exitCode === 0 || result.exitCode === 1).toBe(true);
  });

  it('runs node by absolute path without shell splitting on spaces', async () => {
    const guard = new WorkspaceGuard(process.cwd());
    const runner = new SafeProcessRunner(guard);
    const result = await runner.run(process.execPath, ['-e', "process.stdout.write('ok')"], {
      timeoutMs: 10_000
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('ok');
    expect(result.stderr).not.toMatch(/C:\\Program/i);
  });
});
