import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { WorkspaceGuard } from '../../src/execution/workspace-guard.js';
import { ScenarioRecorderService } from '../../src/application/scenario-recorder.js';

describe('Scenario recorder bookmarklet + synthesize', () => {
  let tmp: string;
  let guard: WorkspaceGuard;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-rec-'));
    guard = new WorkspaceGuard(tmp);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('generates a javascript: bookmarklet', () => {
    const bm = ScenarioRecorderService.generateBookmarklet();
    expect(bm.startsWith('javascript:')).toBe(true);
    expect(decodeURIComponent(bm.slice('javascript:'.length))).toContain('__vpDump');
  });

  it('synthesizes accessibility-first Playwright from payload', () => {
    const result = ScenarioRecorderService.synthesizeFromPayload(guard, {
      title: 'Login flow',
      startUrl: 'http://localhost:3000/login',
      steps: [
        { type: 'click', role: 'button', name: 'Sign in' },
        { type: 'fill', role: 'textbox', name: 'Email', value: 'a@b.com' },
        { type: 'assert_visible', role: 'heading', name: 'Dashboard' }
      ],
      outputFile: 'tests/e2e/login-flow.spec.ts'
    });
    expect(result.code).toContain("getByRole('button'");
    expect(result.code).toContain("getByRole('textbox'");
    expect(result.savedPath).toBeTruthy();
    expect(fs.existsSync(result.savedPath!)).toBe(true);
  });
});
