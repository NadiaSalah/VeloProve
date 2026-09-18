import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { TOOL_SURFACE, catalogCliCommands, catalogMcpTools } from '../../src/shared/tool-catalog.js';

/**
 * Professional tool-surface audit:
 * every registered CLI/MCP tool must be catalogued, documented, and
 * (when applicable) reachable from Dashboard UI / Guide / About.
 */
describe('Tool surface audit (CLI × MCP × UI × Docs × AI)', () => {
  const root = path.resolve(__dirname, '../..');
  const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

  const mcpSource = read('src/mcp/server.ts');
  const cliSource = read('src/cli/index.ts');
  const dashServer = read('src/application/dashboard-server.ts');
  const dashUi = read('src/application/dashboard-ui.ts');
  const dashClient = read('src/application/dashboard-ui/client-script.ts');
  const mcpDoc = read('docs/reference/mcp.md');
  const cliDoc = read('docs/reference/cli.md');
  const featuresDoc = read('docs/guides/features.md');
  const agentsDoc = [read('AGENTS.md'), read('docs/AGENTS.md')].join('\n');
  const readme = read('README.md');
  const handshake = read('src/application/agent-handshake.ts');
  const aboutGuideBlob = dashUi; // Guide + About live in dashboard HTML

  const extractMcp = (): string[] => {
    const out: string[] = [];
    const re = /name:\s*'(vp\.[a-zA-Z0-9_.]+)'/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(mcpSource))) out.push(m[1]);
    return out;
  };

  const extractCli = (): string[] => {
    const out: string[] = [];
    const re = /\.command\('([a-zA-Z0-9_-]+)(?:\s+[^']*)?'\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(cliSource))) out.push(m[1]);
    return out;
  };

  const extractDashActions = (): string[] => {
    const out: string[] = [];
    const re = /case\s*'([a-zA-Z0-9_-]+)':/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(dashServer))) out.push(m[1]);
    return out;
  };

  /** UI may invoke via runAction('x') or fetch('/api/actions/x') (e.g. Docs Chat). */
  const extractUiActions = (): string[] => {
    const blob = `${dashUi}\n${dashClient}`;
    const fromRun = [...blob.matchAll(/runAction\('([a-zA-Z0-9_-]+)'/g)].map((m) => m[1]);
    const fromFetch = [...blob.matchAll(/\/api\/actions\/([a-zA-Z0-9_-]+)/g)].map((m) => m[1]);
    return [...new Set([...fromRun, ...fromFetch])];
  };

  const registeredMcp = extractMcp();
  const registeredCli = extractCli();
  const dashActions = extractDashActions();
  const uiActions = extractUiActions();

  it('catalog covers every registered MCP tool and CLI command exactly once where mapped', () => {
    const catMcp = new Set(catalogMcpTools());
    const catCli = new Set(catalogCliCommands());

    expect(registeredMcp.length).toBe(75);
    expect(registeredCli.length).toBe(75);

    for (const tool of registeredMcp) {
      expect(catMcp.has(tool), `MCP ${tool} missing from TOOL_SURFACE catalog`).toBe(true);
    }
    for (const cmd of registeredCli) {
      expect(catCli.has(cmd), `CLI ${cmd} missing from TOOL_SURFACE catalog`).toBe(true);
    }

    // No phantom catalog entries
    for (const tool of catMcp) {
      expect(registeredMcp, `Catalog MCP ${tool} not registered`).toContain(tool);
    }
    for (const cmd of catCli) {
      expect(registeredCli, `Catalog CLI ${cmd} not registered`).toContain(cmd);
    }
  });

  it('every MCP tool has schema description + handler + mcp.md + AI-facing docs', () => {
    for (const tool of registeredMcp) {
      expect(mcpSource).toContain(`case '${tool}':`);
      expect(mcpDoc).toContain(`\`${tool}\``);

      // Description block near registration (tool listed with description string nearby)
      const idx = mcpSource.indexOf(`name: '${tool}'`);
      expect(idx, `registration for ${tool}`).toBeGreaterThanOrEqual(0);
      const window = mcpSource.slice(idx, idx + 400);
      expect(window.includes('description:'), `${tool} missing description in ListTools`).toBe(true);
    }

    // AI handshake must teach core loop + point agents at full catalog
    expect(handshake).toContain('vp.inspect');
    expect(handshake).toContain('vp.verify');
    expect(handshake).toMatch(/75|full catalog|docs\/reference\/mcp/i);
  });

  it('every CLI command is documented in cli.md and has a .description()', () => {
    for (const cmd of registeredCli) {
      expect(cliDoc).toContain(`\`veloprove ${cmd}\``);
      // description appears after command registration in commander chain
      const re = new RegExp(`\\.command\\('${cmd}(?:\\s[^']*)?'\\)[\\s\\S]{0,200}?\\.description\\(`);
      expect(re.test(cliSource), `CLI ${cmd} missing .description()`).toBe(true);
    }
  });

  it('dashboard actions referenced by UI exist on the server; orphan server actions are listed intentionally', () => {
    for (const action of new Set(uiActions)) {
      expect(dashActions, `UI runAction('${action}') has no server case`).toContain(action);
    }

    // Cataloged dashboard actions must exist on server
    for (const entry of TOOL_SURFACE) {
      if (!entry.dashboardAction) continue;
      expect(
        dashActions,
        `Catalog dashboardAction ${entry.dashboardAction} missing in dashboard-server`
      ).toContain(entry.dashboardAction);
    }
  });

  it('docs surfaces (features, AGENTS, packaged docs/AGENTS, README, Guide/About) mention high-value tools', () => {
    const combinedUserDocs = [featuresDoc, agentsDoc, readme, aboutGuideBlob].join('\n');

    const mustAppearSomewhere = [
      'security',
      'web-sec',
      'dedup',
      'hook',
      'verify',
      'doctor',
      'vp.bootstrap',
      'vp.sendRequest',
      'vp.suggestFix',
      'vp.flaky',
      'vp.run.get',
      'docs/reference/mcp.md',
      'docs/reference/cli.md',
      'vp://',
      'node_modules/@engnadia/veloprove/docs'
    ];

    for (const marker of mustAppearSomewhere) {
      expect(combinedUserDocs.toLowerCase()).toContain(marker.toLowerCase());
    }

    // Guide + About must advertise 75 tools and brand assets
    expect(aboutGuideBlob).toContain('75');
    expect(aboutGuideBlob).toContain('veloprove-logo.svg');
    expect(aboutGuideBlob).toContain('docs/reference/mcp.md');
  });

  it('produces a machine-readable coverage summary artifact', () => {
    const uiSet = new Set(uiActions);
    const rows = TOOL_SURFACE.map((entry) => {
      const docsOk = entry.docMarkers.every(
        (m) => mcpDoc.includes(m) || cliDoc.includes(m) || featuresDoc.includes(m) || agentsDoc.includes(m) || readme.includes(m)
      );
      const dashOk = !entry.dashboardAction || dashActions.includes(entry.dashboardAction);
      const uiOk = !entry.dashboardAction || uiSet.has(entry.dashboardAction);
      const guideOk = !entry.uiGuideMarker || aboutGuideBlob.toLowerCase().includes(entry.uiGuideMarker.toLowerCase());

      return {
        id: entry.id,
        cli: entry.cli ?? null,
        mcp: entry.mcp ?? null,
        dashboardAction: entry.dashboardAction ?? null,
        tier: entry.tier,
        docsOk,
        dashServerOk: dashOk,
        dashUiOk: uiOk,
        guideAboutOk: guideOk,
        summary: entry.summary
      };
    });

    const outDir = path.join(root, 'docs', 'generated');
    fs.mkdirSync(outDir, { recursive: true });
    const report = {
      generatedAt: new Date().toISOString(),
      totals: {
        catalog: TOOL_SURFACE.length,
        mcpRegistered: registeredMcp.length,
        cliRegistered: registeredCli.length,
        dashboardActions: dashActions.length,
        uiActions: uiSet.size,
        docsOk: rows.filter((r) => r.docsOk).length,
        dashUiWired: rows.filter((r) => r.dashUiOk).length,
        offlineSmokeCandidates: rows.filter((r) => r.tier === 'offline').length
      },
      gaps: {
        docs: rows.filter((r) => !r.docsOk).map((r) => r.id),
        dashServer: rows.filter((r) => !r.dashServerOk).map((r) => r.id),
        dashUiNotWired: rows.filter((r) => entryHasDash(r) && !r.dashUiOk).map((r) => r.id),
        guideAbout: rows.filter((r) => !r.guideAboutOk).map((r) => r.id)
      },
      rows
    };

    function entryHasDash(r: { dashboardAction: string | null }) {
      return !!r.dashboardAction;
    }

    fs.writeFileSync(path.join(outDir, 'TOOL_SURFACE_AUDIT.json'), JSON.stringify(report, null, 2));

    expect(report.totals.mcpRegistered).toBe(75);
    expect(report.totals.cliRegistered).toBe(75);
    expect(report.gaps.docs, `Doc gaps: ${report.gaps.docs.join(', ')}`).toEqual([]);
    expect(report.gaps.dashServer, `Dash server gaps: ${report.gaps.dashServer.join(', ')}`).toEqual([]);
    expect(report.gaps.dashUiNotWired, `Dash UI gaps: ${report.gaps.dashUiNotWired.join(', ')}`).toEqual([]);
  });
});
