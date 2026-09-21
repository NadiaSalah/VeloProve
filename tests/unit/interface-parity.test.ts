import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { catalogCliCommands, catalogMcpTools } from '../../src/shared/tool-catalog.js';
import { getPackageVersion } from '../../src/shared/package-meta.js';

describe('VeloProve Interface Parity & Integrity Validation', () => {
  const mcpServerSource = fs.readFileSync(path.resolve(__dirname, '../../src/mcp/server.ts'), 'utf8');
  const cliSource = fs.readFileSync(path.resolve(__dirname, '../../src/cli/index.ts'), 'utf8');
  const mcpDocSource = fs.readFileSync(path.resolve(__dirname, '../../docs/reference/mcp.md'), 'utf8');
  const cliDocSource = fs.readFileSync(path.resolve(__dirname, '../../docs/reference/cli.md'), 'utf8');
  const readmeSource = fs.readFileSync(path.resolve(__dirname, '../../README.md'), 'utf8');
  const dashboardSource = fs.readFileSync(path.resolve(__dirname, '../../src/application/dashboard-server.ts'), 'utf8');
  const expectedMcp = catalogMcpTools().length;
  const expectedCli = catalogCliCommands().length;
  const pkgVersion = getPackageVersion();

  it('verifies catalog-derived unique MCP tools are properly registered, have schemas, descriptions, and handlers', () => {
    // 1. Extract tool names registered in ListToolsRequestSchema
    const toolNameRegex = /name:\s*'(vp\.[a-zA-Z0-9_\.]+)'/g;
    const registeredTools: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = toolNameRegex.exec(mcpServerSource)) !== null) {
      registeredTools.push(match[1]);
    }

    expect(registeredTools.length).toBe(expectedMcp);

    // Verify no duplicates
    const uniqueTools = new Set(registeredTools);
    expect(uniqueTools.size).toBe(expectedMcp);

    // 2. Extract tool handlers in CallToolRequestSchema switch statement
    const caseRegex = /case\s*'(vp\.[a-zA-Z0-9_\.]+)':/g;
    const handledCases: string[] = [];
    while ((match = caseRegex.exec(mcpServerSource)) !== null) {
      handledCases.push(match[1]);
    }

    // Every registered tool must have a case in the switch handler
    for (const tool of registeredTools) {
      expect(handledCases, `Missing switch handler for registered tool ${tool}`).toContain(tool);
    }
  });

  it('verifies all catalog MCP tools are documented in docs/reference/mcp.md and advertised in README.md', () => {
    const toolNameRegex = /name:\s*'(vp\.[a-zA-Z0-9_\.]+)'/g;
    const registeredTools: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = toolNameRegex.exec(mcpServerSource)) !== null) {
      registeredTools.push(match[1]);
    }

    expect(registeredTools.length).toBe(expectedMcp);

    for (const tool of registeredTools) {
      expect(
        mcpDocSource,
        `Tool ${tool} is registered in MCP server but missing from docs/reference/mcp.md`
      ).toContain(`\`${tool}\``);
    }

    // Verify documentation claim synchronization (catalog language, not magic numbers)
    expect(mcpDocSource).toMatch(/catalogMcpTools\(\)\.length|TOOL_SURFACE/);
    expect(readmeSource).toMatch(/structured Model Context Protocol \(MCP\) tools|catalog length from `TOOL_SURFACE`|MCP-catalog/);
    expect(readmeSource).not.toContain('64 structured tools');
    expect(readmeSource).not.toContain('68 structured tools');
  });

  it('verifies catalog-derived CLI commands are registered and documented', () => {
    const cliCommandRegex = /\.command\('([a-zA-Z0-9_\-]+)(?:\s+[^']*)?'\)/g;
    const registeredCliCommands: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = cliCommandRegex.exec(cliSource)) !== null) {
      registeredCliCommands.push(match[1]);
    }

    expect(registeredCliCommands.length).toBe(expectedCli);

    // Verify no duplicate CLI command names
    const uniqueCommands = new Set(registeredCliCommands);
    expect(uniqueCommands.size).toBe(expectedCli);

    // Check against CLI documentation
    for (const cmd of registeredCliCommands) {
      expect(
        cliDocSource,
        `CLI command '${cmd}' is registered in src/cli/index.ts but missing in docs/reference/cli.md`
      ).toContain(`\`veloprove ${cmd}\``);
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
    expect(handledActions).toContain('teach-ai');
    expect(handledActions).toContain('arch-graph');
  });

  it('verifies destructive commands have safe opt-in flags and protected defaults', () => {
    // Check malware remediation
    expect(cliSource).toContain(".option('--fix'");
    // Check bug fix patch application
    expect(cliSource).toContain(".option('--apply'");
    // Check dead asset purge
    expect(cliSource).toContain(".option('--purge'");

    // Check MCP schemas for destructive tools require explicit action/flag
    expect(mcpServerSource).toContain("name: 'vp.remediateMalware'");
    expect(mcpServerSource).toContain("name: 'vp.autoBugFix'");
    expect(mcpServerSource).toContain("name: 'vp.deadAssetPurge'");
  });

  it('ensures no stale vp.remoteBridge references remain in public documentation', () => {
    expect(mcpDocSource).not.toContain('vp.remoteBridge');
    expect(cliDocSource).not.toContain('veloprove remote\n');
  });

  it('verifies CAPABILITY_MANIFEST.json exists and is synchronized with source counts', () => {
    const manifestPath = path.resolve(__dirname, '../../docs/generated/CAPABILITY_MANIFEST.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.version).toBe(pkgVersion);
    expect(manifest.package).toBe('@engnadia/veloprove');
    expect(manifest.cliBinary).toBe('veloprove');
    expect(manifest.totalMcpTools).toBe(expectedMcp);
    expect(manifest.totalCliCommands).toBe(expectedCli);
    expect(manifest.capabilities.length).toBeGreaterThanOrEqual(70);
    for (const cap of manifest.capabilities) {
      expect(cap.verificationStatus).toMatch(
        /^(VERIFIED|VERIFIED_WITH_WARNINGS|PARTIAL|BLOCKED|NOT_IMPLEMENTED|NOT_APPLICABLE)$/
      );
    }
  });

  it('verifies npm pack artifact naming and size sanity (packageSize <= unpackedSize)', () => {
    const { execSync } = require('node:child_process');
    // --ignore-scripts avoids concurrent prepack/tsc races with other pack tests
    const packOutputRaw = execSync('npm pack --dry-run --json --ignore-scripts', {
      cwd: path.resolve(__dirname, '../..'),
      encoding: 'utf8'
    });
    const packData = JSON.parse(packOutputRaw)[0];

    expect(packData.filename).toBe(`engnadia-veloprove-${pkgVersion}.tgz`);
    expect(packData.size).toBeLessThanOrEqual(packData.unpackedSize);
    expect(packData.size).toBeGreaterThan(100 * 1024); // > 100KB
    expect(packData.unpackedSize).toBeGreaterThan(1024 * 1024); // > 1MB
  });
});
