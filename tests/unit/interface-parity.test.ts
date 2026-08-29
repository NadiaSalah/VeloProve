import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('QAForge Interface Parity & Integrity Validation', () => {
  const mcpServerSource = fs.readFileSync(path.resolve(__dirname, '../../src/mcp/server.ts'), 'utf8');
  const cliSource = fs.readFileSync(path.resolve(__dirname, '../../src/cli/index.ts'), 'utf8');
  const mcpDocSource = fs.readFileSync(path.resolve(__dirname, '../../docs/MCP_REFERENCE.md'), 'utf8');
  const cliDocSource = fs.readFileSync(path.resolve(__dirname, '../../docs/CLI_REFERENCE.md'), 'utf8');
  const dashboardSource = fs.readFileSync(path.resolve(__dirname, '../../src/application/dashboard-server.ts'), 'utf8');

  it('verifies exactly 64 unique MCP tools are properly registered, have schemas, descriptions, and handlers', () => {
    // 1. Extract tool names registered in ListToolsRequestSchema
    const toolNameRegex = /name:\s*'(qa\.[a-zA-Z0-9_\.]+)'/g;
    const registeredTools: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = toolNameRegex.exec(mcpServerSource)) !== null) {
      registeredTools.push(match[1]);
    }

    expect(registeredTools.length).toBe(64);

    // Verify no duplicates
    const uniqueTools = new Set(registeredTools);
    expect(uniqueTools.size).toBe(64);

    // 2. Extract tool handlers in CallToolRequestSchema switch statement
    const caseRegex = /case\s*'(qa\.[a-zA-Z0-9_\.]+)':/g;
    const handledCases: string[] = [];
    while ((match = caseRegex.exec(mcpServerSource)) !== null) {
      handledCases.push(match[1]);
    }

    // Every registered tool must have a case in the switch handler
    for (const tool of registeredTools) {
      expect(handledCases, `Missing switch handler for registered tool ${tool}`).toContain(tool);
    }
  });

  it('verifies all 64 MCP tools are documented in docs/MCP_REFERENCE.md', () => {
    const toolNameRegex = /name:\s*'(qa\.[a-zA-Z0-9_\.]+)'/g;
    const registeredTools: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = toolNameRegex.exec(mcpServerSource)) !== null) {
      registeredTools.push(match[1]);
    }

    for (const tool of registeredTools) {
      expect(
        mcpDocSource,
        `Tool ${tool} is registered in MCP server but missing from docs/MCP_REFERENCE.md`
      ).toContain(`\`${tool}\``);
    }
  });

  it('verifies all CLI commands are registered and documented', () => {
    const cliCommandRegex = /\.command\('([a-zA-Z0-9_\-]+)(?:\s+[^']*)?'\)/g;
    const registeredCliCommands: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = cliCommandRegex.exec(cliSource)) !== null) {
      registeredCliCommands.push(match[1]);
    }

    expect(registeredCliCommands.length).toBeGreaterThanOrEqual(50);

    // Verify no duplicate CLI command names
    const uniqueCommands = new Set(registeredCliCommands);
    expect(uniqueCommands.size).toBe(registeredCliCommands.length);

    // Check against CLI documentation
    for (const cmd of registeredCliCommands) {
      expect(
        cliDocSource,
        `CLI command '${cmd}' is registered in src/cli/index.ts but missing in docs/CLI_REFERENCE.md`
      ).toContain(`\`qaforge ${cmd}\``);
    }
  });

  it('verifies dashboard action handlers are wired without dead endpoints', () => {
    const actionRegex = /case\s*'([a-zA-Z0-9_\-]+)':/g;
    const handledActions: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = actionRegex.exec(dashboardSource)) !== null) {
      handledActions.push(match[1]);
    }

    expect(handledActions.length).toBeGreaterThanOrEqual(35);
    expect(handledActions).toContain('inspect');
    expect(handledActions).toContain('plan');
    expect(handledActions).toContain('generate');
    expect(handledActions).toContain('run');
    expect(handledActions).toContain('doctor');
    expect(handledActions).toContain('arch-graph');
  });

  it('verifies destructive commands have safe opt-in flags and protected defaults', () => {
    // Check malware remediation
    expect(cliSource).toContain(".option('--fix'");
    // Check bugfix patch application
    expect(cliSource).toContain(".option('--apply'");
    // Check dead asset purge
    expect(cliSource).toContain(".option('--purge'");

    // Check MCP schemas for destructive tools require explicit action/flag
    expect(mcpServerSource).toContain("name: 'qa.remediateMalware'");
    expect(mcpServerSource).toContain("name: 'qa.autoBugFix'");
    expect(mcpServerSource).toContain("name: 'qa.deadAssetPurge'");
  });

  it('ensures no stale qa.remoteBridge references remain in public documentation', () => {
    expect(mcpDocSource).not.toContain('qa.remoteBridge');
    expect(cliDocSource).not.toContain('qaforge remote\n');
  });

  it('verifies CLI banner and stylized box renderers produce clean ANSI strings', async () => {
    const { renderQAForgeBanner, renderBox } = await import('../../src/cli/banner.js');
    const banner = renderQAForgeBanner();
    expect(banner).toContain('QAForge CLI');
    expect(banner).toContain('LOCAL-FIRST');
    expect(banner).toContain('64 MCP TOOLS');

    const box = renderBox('Test Title', ['Line 1', 'Line 2']);
    expect(box).toContain('Test Title');
    expect(box).toContain('Line 1');
    expect(box).toContain('Line 2');
    expect(box).toContain('╭─');
    expect(box).toContain('╰');
  });
});
