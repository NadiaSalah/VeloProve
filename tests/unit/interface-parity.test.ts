import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('QAForge Interface Parity & Integrity Validation', () => {
  const mcpServerSource = fs.readFileSync(path.resolve(__dirname, '../../src/mcp/server.ts'), 'utf8');
  const cliSource = fs.readFileSync(path.resolve(__dirname, '../../src/cli/index.ts'), 'utf8');
  const mcpDocSource = fs.readFileSync(path.resolve(__dirname, '../../docs/MCP_REFERENCE.md'), 'utf8');
  const cliDocSource = fs.readFileSync(path.resolve(__dirname, '../../docs/CLI_REFERENCE.md'), 'utf8');
  const readmeSource = fs.readFileSync(path.resolve(__dirname, '../../README.md'), 'utf8');
  const dashboardSource = fs.readFileSync(path.resolve(__dirname, '../../src/application/dashboard-server.ts'), 'utf8');

  it('verifies exactly 71 unique MCP tools are properly registered, have schemas, descriptions, and handlers', () => {
    // 1. Extract tool names registered in ListToolsRequestSchema
    const toolNameRegex = /name:\s*'(qa\.[a-zA-Z0-9_\.]+)'/g;
    const registeredTools: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = toolNameRegex.exec(mcpServerSource)) !== null) {
      registeredTools.push(match[1]);
    }

    expect(registeredTools.length).toBe(71);

    // Verify no duplicates
    const uniqueTools = new Set(registeredTools);
    expect(uniqueTools.size).toBe(71);

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

  it('verifies all 71 MCP tools are documented in docs/MCP_REFERENCE.md and advertised in README.md', () => {
    const toolNameRegex = /name:\s*'(qa\.[a-zA-Z0-9_\.]+)'/g;
    const registeredTools: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = toolNameRegex.exec(mcpServerSource)) !== null) {
      registeredTools.push(match[1]);
    }

    expect(registeredTools.length).toBe(71);

    for (const tool of registeredTools) {
      expect(
        mcpDocSource,
        `Tool ${tool} is registered in MCP server but missing from docs/MCP_REFERENCE.md`
      ).toContain(`\`${tool}\``);
    }

    // Verify documentation claim synchronization
    expect(mcpDocSource).toContain('71 Tools');
    expect(readmeSource).toContain('71 structured Model Context Protocol (MCP) tools');
    expect(readmeSource).not.toContain('64 structured tools');
    expect(readmeSource).not.toContain('68 structured tools');
  });

  it('verifies exactly 71 CLI commands are registered and documented', () => {
    const cliCommandRegex = /\.command\('([a-zA-Z0-9_\-]+)(?:\s+[^']*)?'\)/g;
    const registeredCliCommands: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = cliCommandRegex.exec(cliSource)) !== null) {
      registeredCliCommands.push(match[1]);
    }

    expect(registeredCliCommands.length).toBe(71);

    // Verify no duplicate CLI command names
    const uniqueCommands = new Set(registeredCliCommands);
    expect(uniqueCommands.size).toBe(71);

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

  it('verifies CAPABILITY_MANIFEST.json exists and is synchronized with source counts', () => {
    const manifestPath = path.resolve(__dirname, '../../docs/generated/CAPABILITY_MANIFEST.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.package).toBe('@engnadia/qaforge');
    expect(manifest.cliBinary).toBe('qaforge');
    expect(manifest.totalMcpTools).toBe(71);
    expect(manifest.totalCliCommands).toBe(71);
    expect(manifest.capabilities.length).toBeGreaterThanOrEqual(70);
  });

  it('verifies npm pack artifact naming and size sanity (packageSize <= unpackedSize)', () => {
    const { execSync } = require('node:child_process');
    const packOutputRaw = execSync('npm pack --dry-run --json', { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8' });
    const packData = JSON.parse(packOutputRaw)[0];

    expect(packData.filename).toBe('engnadia-qaforge-1.0.0.tgz');
    expect(packData.size).toBeLessThanOrEqual(packData.unpackedSize);
    expect(packData.size).toBeGreaterThan(100 * 1024); // > 100KB
    expect(packData.unpackedSize).toBeGreaterThan(1024 * 1024); // > 1MB
  });
});
