import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { DocsAssistantService, resolvePackagedDocsRoot } from '../../src/application/docs-assistant.js';
import { detectAiEditors, linkAiEditors, resolveAiLinkPolicy } from '../../src/application/ai-link.js';
import { VeloProveEngine } from '../../src/application/engine.js';

describe('Docs assistant + AI link', () => {
  it('resolves packaged docs root containing AGENTS.md', () => {
    const root = resolvePackagedDocsRoot(process.cwd());
    expect(fs.existsSync(path.join(root, 'AGENTS.md'))).toBe(true);
  });

  it('answers a known install/AI question from packaged docs', () => {
    const res = DocsAssistantService.ask('How do I link Cursor MCP after npm install?', process.cwd());
    expect(res.confidence).not.toBe('none');
    expect(res.sources.length).toBeGreaterThan(0);
    expect(res.answer.toLowerCase()).toMatch(/mcp|cursor|teach|init|install/);
    expect(res.docsRoot).toBeTruthy();
  });

  it('blocks non-English questions with English-only notice', () => {
    const res = DocsAssistantService.ask('ازاي اشغل verify؟', process.cwd());
    expect(res.englishOnlyBlocked).toBe(true);
    expect(res.confidence).toBe('none');
    expect(res.answer.toLowerCase()).toMatch(/english-only|english only/);
  });

  it('engine.askDocs mirrors docs assistant', () => {
    const engine = new VeloProveEngine(process.cwd());
    const res = engine.askDocs('what is verify vs release');
    expect(res.question).toMatch(/verify/i);
    expect(res.answer.length).toBeGreaterThan(20);
  });

  it('detects and links Cursor MCP idempotently in temp project', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-ailink-'));
    try {
      fs.mkdirSync(path.join(tmp, '.cursor'), { recursive: true });
      const detected = detectAiEditors(tmp);
      expect(detected.find((d) => d.id === 'cursor')?.projectHint).toBe(true);

      const policy = resolveAiLinkPolicy({
        yes: true,
        projectRoot: tmp
      });
      expect(policy.shouldLink).toBe(true);
      expect(policy.shouldTeach).toBe(true);

      const link = linkAiEditors(tmp, ['cursor']);
      expect(fs.existsSync(path.join(tmp, '.cursor', 'mcp.json'))).toBe(true);
      const again = linkAiEditors(tmp, ['cursor']);
      expect(again.writtenFiles.length).toBe(0);
      expect(link.mcpSnippet).toContain('@engnadia/veloprove');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('--no-link-ai skips linking', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-nolink-'));
    try {
      const policy = resolveAiLinkPolicy({
        yes: true,
        noLinkAi: true,
        teach: true,
        projectRoot: tmp
      });
      expect(policy.shouldLink).toBe(false);
      expect(policy.shouldTeach).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
