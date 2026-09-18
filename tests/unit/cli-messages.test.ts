import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { msg, cliMsg, AI_REQUIRED_MESSAGE } from '../../src/cli/messages.js';
import * as aiLink from '../../src/application/ai-link.js';

describe('CLI messages', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.VELOPROVE_MCP;
    delete process.env.VELOPROVE_AGENT;
  });

  it('prints leveled one-liners', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    cliMsg('ok', 'Done', '12ms');
    msg.warn('Busy');
    msg.err('Failed', 'boom');
    msg.info('Hint');
    expect(spy).toHaveBeenCalled();
    const joined = spy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(joined).toMatch(/Done/);
    expect(joined).toMatch(/Busy|Failed|Hint/);
  });

  it('prints a notice box', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    msg.notice('Next steps', ['npx veloprove verify']);
    const joined = spy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(joined).toMatch(/Next steps/);
    expect(joined).toMatch(/verify/);
  });

  it('confirmSensitive refuses without AI (needs AI message)', async () => {
    vi.spyOn(aiLink, 'resolveAiPresence').mockReturnValue({
      hasAi: false,
      mcpClient: false,
      editors: [],
      mcpConfigPresent: false,
      summary: 'No AI coding agent detected'
    });
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ok = await msg.confirmSensitive({
      title: 'Delete files',
      lines: ['This is destructive'],
      yes: true
    });
    expect(ok).toBe(false);
    const joined = spy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(joined).toMatch(/AI coding agent required|init --teach|allow-no-ai/i);
    expect(AI_REQUIRED_MESSAGE.length).toBeGreaterThan(20);
  });

  it('confirmSensitive executes when AI is present', async () => {
    vi.spyOn(aiLink, 'resolveAiPresence').mockReturnValue({
      hasAi: true,
      mcpClient: true,
      editors: [],
      mcpConfigPresent: true,
      summary: 'AI agent context (MCP)'
    });
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ok = await msg.confirmSensitive({
      title: 'Apply patches',
      lines: ['Writes source']
    });
    expect(ok).toBe(true);
    const joined = spy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(joined).toMatch(/AI assistant detected — executing/i);
  });

  it('confirmSensitive allows --allow-no-ai with --yes', async () => {
    vi.spyOn(aiLink, 'resolveAiPresence').mockReturnValue({
      hasAi: false,
      mcpClient: false,
      editors: [],
      mcpConfigPresent: false,
      summary: 'No AI coding agent detected'
    });
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ok = await msg.confirmSensitive({
      title: 'Apply patches',
      lines: ['Writes source'],
      allowNoAi: true,
      yes: true
    });
    expect(ok).toBe(true);
    const joined = spy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(joined).toMatch(/allow-no-ai/i);
  });
});

describe('resolveAiPresence', () => {
  beforeEach(() => {
    delete process.env.VELOPROVE_MCP;
    delete process.env.VELOPROVE_AGENT;
  });

  it('treats VELOPROVE_MCP as AI context', () => {
    process.env.VELOPROVE_MCP = '1';
    const p = aiLink.resolveAiPresence(process.cwd());
    expect(p.hasAi).toBe(true);
    expect(p.mcpClient).toBe(true);
  });
});
