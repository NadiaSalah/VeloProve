import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = 'D:/projects/VeloProve/VeloProve-core';
const { TOOL_SURFACE, catalogCliCommands } = await import(
  pathToFileURL(path.join(root, 'dist/shared/tool-catalog.js')).href
);
const dashUi = fs.readFileSync(path.join(root, 'src/application/dashboard-ui.ts'), 'utf8');
const dashSrv = fs.readFileSync(path.join(root, 'src/application/dashboard-server.ts'), 'utf8');
const docsBlob = [
  'docs/reference/cli.md',
  'docs/reference/mcp.md',
  'docs/guides/features.md',
  'docs/AGENTS.md',
  'README.md'
]
  .map((p) => fs.readFileSync(path.join(root, p), 'utf8'))
  .join('\n');

const actionRe = /case\s+'([^']+)'/g;
const serverActions = new Set();
let m;
while ((m = actionRe.exec(dashSrv))) serverActions.add(m[1]);

const withDash = TOOL_SURFACE.filter((t) => t.dashboardAction);
const cliNoDash = TOOL_SURFACE.filter((t) => t.cli && !t.dashboardAction);

const dashActionMissingServer = withDash
  .filter((t) => !serverActions.has(t.dashboardAction))
  .map((t) => ({ id: t.id, action: t.dashboardAction }));

const documented = (t) => {
  const needles = [`veloprove ${t.cli}`, `\`veloprove ${t.cli}\``, t.mcp ? `\`${t.mcp}\`` : null].filter(Boolean);
  return needles.some((n) => docsBlob.includes(n));
};

const inUiText = (t) => {
  const markers = [t.cli, t.uiGuideMarker, 'Project Twin'].filter(Boolean);
  return markers.some((x) => dashUi.includes(x));
};

const report = {
  counts: {
    catalogRows: TOOL_SURFACE.length,
    cli: catalogCliCommands().length,
    dashboardActionsInCatalog: withDash.length,
    dashboardActionsInServer: [...serverActions].filter((a) =>
      !['lint-fix', 'init-security-policy'].includes(a) ? true : true
    ).length,
    cliWithoutDashboardAction: cliNoDash.length
  },
  intentionalCliWithoutDashButton: cliNoDash.map((t) => ({
    cli: t.cli,
    tier: t.tier,
    documented: documented(t),
    mentionedInUiCopy: inUiText(t)
  })),
  catalogDashMissingServer: dashActionMissingServer,
  serverOnlyHelpers: [...serverActions].filter(
    (a) => !withDash.some((t) => t.dashboardAction === a)
  )
};

fs.writeFileSync(
  path.join(root, 'docs/generated/CLI_UI_DOCS_COVERAGE.json'),
  JSON.stringify(report, null, 2)
);
console.log(JSON.stringify(report, null, 2));
