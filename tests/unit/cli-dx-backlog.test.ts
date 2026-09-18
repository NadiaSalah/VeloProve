import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  ALIAS_HELP_NOTE,
  CLI_HELP_GROUPS,
  DAILY_10_COMMANDS,
  HELP_GROUP_ORDER,
  groupForCommand
} from '../../src/cli/help-groups.js';
import { catalogCliCommands } from '../../src/shared/tool-catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cliBin = path.join(root, 'dist/cli/index.js');

describe('CLI DX backlog (grouped help, json, positional URL, aliases)', () => {
  it('help-groups cover every catalog CLI command', () => {
    const cmds = catalogCliCommands();
    const unmapped = cmds.filter((c) => !(c in CLI_HELP_GROUPS));
    expect(unmapped, `unmapped: ${unmapped.join(', ')}`).toEqual([]);
    for (const d of DAILY_10_COMMANDS) {
      expect(groupForCommand(d), d).not.toBe('More');
    }
    expect(HELP_GROUP_ORDER).toEqual([
      'Start',
      'Verify',
      'Repair',
      'Results',
      'API',
      'Security',
      'Experience',
      'More'
    ]);
  });

  it('root --help is grouped and mentions Daily-10 + alias note', () => {
    expect(fs.existsSync(cliBin)).toBe(true);
    const out = execFileSync(process.execPath, [cliBin, '--help'], {
      encoding: 'utf8',
      cwd: root,
      timeout: 15000
    });
    for (const g of ['Start', 'Verify', 'Repair', 'Results', 'API', 'Security', 'Experience', 'More']) {
      expect(out).toContain(`${g}:`);
    }
    expect(out).toContain('Daily-10');
    expect(out).toMatch(/canonical|Aliases/i);
    expect(ALIAS_HELP_NOTE.length).toBeGreaterThan(20);
  });

  it('program export allows in-process helpInformation without 75 spawns', async () => {
    const mod = await import(pathToFileURL(cliBin).href);
    expect(mod.program).toBeTruthy();
    const cmds = mod.program.commands.map((c: { name: () => string }) => c.name());
    expect(cmds.length).toBeGreaterThanOrEqual(70);

    const failures: string[] = [];
    for (const cmd of cmds) {
      const sub = mod.program.commands.find((c: { name: () => string }) => c.name() === cmd);
      const help = sub?.helpInformation?.() || '';
      if (!/Usage|Options|Arguments|veloprove/i.test(help)) {
        failures.push(cmd);
      }
    }
    expect(failures, failures.join(', ')).toEqual([]);
  });

  it('doctor/inspect/changed/release support --json', () => {
    for (const cmd of ['doctor', 'inspect', 'changed', 'release']) {
      const out = execFileSync(process.execPath, [cliBin, cmd, '--help'], {
        encoding: 'utf8',
        cwd: root,
        timeout: 10000
      });
      expect(out, cmd).toMatch(/--json/);
    }
  });

  it('explore / ensure-dev / security accept positional [url]', () => {
    for (const cmd of ['explore', 'ensure-dev', 'security']) {
      const out = execFileSync(process.execPath, [cliBin, cmd, '--help'], {
        encoding: 'utf8',
        cwd: root,
        timeout: 10000
      });
      expect(out, cmd).toMatch(/\[url\]/);
    }
  });
});
