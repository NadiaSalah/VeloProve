/**
 * Full Dashboard Tool Lab catalog — every CLI surface, grouped like help-groups.
 * Meta/long-running tools use cli-hint (show command) instead of nesting servers.
 */
import { TOOL_SURFACE, type ToolSurfaceEntry } from '../shared/tool-catalog.js';
import {
  CLI_HELP_GROUPS,
  HELP_GROUP_ORDER,
  groupForCommand,
  type HelpGroupId
} from '../cli/help-groups.js';

export type LabRunMode = 'run' | 'needs-url' | 'destructive' | 'cli-hint';

export interface DashboardLabTool {
  id: string;
  /** `/api/actions/<action>` id */
  action: string;
  cli: string;
  label: string;
  summary: string;
  group: HelpGroupId;
  mode: LabRunMode;
  mcp?: string;
  /** Dashboard path is incomplete vs full CLI — show Partial badge; do not remove Run. */
  degraded?: boolean;
}

/** CLI names that must not start nested long-running processes from the Dashboard. */
export const CLI_HINT_ONLY = new Set(['ui', 'tui', 'mcp', 'watch', 'mock-server']);

/**
 * Dashboard runs a degraded path — full power remains CLI.
 * Keep in sync with docs/reference/surface-matrix.md “Dashboard partial”.
 */
export const DASHBOARD_PARTIAL_CLI = new Set([
  'alert',
  'db-snapshot',
  'db-restore',
  'refine',
  'run-collection',
  'dead-assets'
]);

/** Prefer existing dashboardAction ids when present. */
function actionFor(entry: ToolSurfaceEntry): string {
  if (entry.dashboardAction) return entry.dashboardAction;
  if (entry.cli === 'test') return 'run';
  if (entry.cli === 'mutation-score') return 'mutation';
  if (entry.cli === 'security') return 'security-run';
  if (entry.cli === 'dedup') return 'dedup-tests';
  if (entry.cli === 'web-sec') return 'sri-csrf-audit';
  if (entry.cli === 'replay') return 'failure-replay';
  if (entry.cli === 'record-scenario') return 'recorder-bookmarklet';
  return entry.cli!;
}

function modeFor(entry: ToolSurfaceEntry): LabRunMode {
  if (!entry.cli) return 'cli-hint';
  if (CLI_HINT_ONLY.has(entry.cli)) return 'cli-hint';
  if (entry.tier === 'destructive') return 'destructive';
  if (entry.tier === 'needs-url') return 'needs-url';
  if (entry.tier === 'interactive' && entry.cli !== 'sandbox') return 'cli-hint';
  return 'run';
}

function labelFor(cli: string): string {
  return cli
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

/**
 * One row per CLI command in TOOL_SURFACE (deduped by action).
 */
export function buildDashboardLabCatalog(): DashboardLabTool[] {
  const seen = new Set<string>();
  const out: DashboardLabTool[] = [];

  for (const entry of TOOL_SURFACE) {
    if (!entry.cli) continue;
    const action = actionFor(entry);
    if (seen.has(action)) continue;
    seen.add(action);
    out.push({
      id: entry.id,
      action,
      cli: entry.cli,
      label: labelFor(entry.cli),
      summary: entry.summary,
      group: CLI_HELP_GROUPS[entry.cli] || groupForCommand(entry.cli),
      mode: modeFor(entry),
      mcp: entry.mcp,
      degraded: DASHBOARD_PARTIAL_CLI.has(entry.cli)
    });
  }

  // Stable order: help-group order, then label
  const groupRank = new Map(HELP_GROUP_ORDER.map((g, i) => [g, i]));
  out.sort((a, b) => {
    const ga = groupRank.get(a.group) ?? 99;
    const gb = groupRank.get(b.group) ?? 99;
    if (ga !== gb) return ga - gb;
    return a.label.localeCompare(b.label);
  });

  return out;
}

export function renderLabCatalogHtml(tools: DashboardLabTool[]): string {
  const byGroup = new Map<HelpGroupId, DashboardLabTool[]>();
  for (const g of HELP_GROUP_ORDER) byGroup.set(g, []);
  for (const t of tools) {
    const list = byGroup.get(t.group) || [];
    list.push(t);
    byGroup.set(t.group, list);
  }

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const sections: string[] = [];
  for (const g of HELP_GROUP_ORDER) {
    const list = byGroup.get(g) || [];
    if (!list.length) continue;
    const rows = list
      .map((t) => {
        const badge =
          t.mode === 'needs-url'
            ? '<span class="pill warn">URL</span>'
            : t.mode === 'destructive'
              ? '<span class="pill bad">Write</span>'
              : t.mode === 'cli-hint'
                ? '<span class="pill warn" title="Cannot nest inside Dashboard — use a terminal">Terminal only</span>'
                : '<span class="pill ok">Run</span>';
        const partialBadge = t.degraded
          ? '<span class="pill" title="Dashboard path is incomplete — prefer CLI for full options">Partial</span>'
          : '';
        const btnLabel =
          t.mode === 'cli-hint' ? 'Copy CLI' : t.mode === 'destructive' ? 'Run…' : 'Run';
        const btnClass = t.mode === 'destructive' ? 'btn danger sm' : 'btn sm';
        const hintLine =
          t.mode === 'cli-hint'
            ? `<div class="muted lab-hint">Terminal only — cannot run inside Dashboard. Use: <code>npx veloprove ${esc(t.cli)}</code></div>`
            : t.degraded
              ? `<div class="muted lab-hint">Partial in Dashboard — full options via CLI: <code>npx veloprove ${esc(t.cli)}</code></div>`
              : '';
        return `<div class="lab-row" data-lab-group="${esc(g)}" data-lab-mode="${esc(t.mode)}" data-lab-q="${esc(
          `${t.label} ${t.cli} ${t.summary} ${t.mcp || ''} terminal partial`.toLowerCase()
        )}">
          <div class="lab-meta">
            <div class="lab-title">${esc(t.label)} ${badge}${partialBadge}</div>
            <div class="muted lab-sum">${esc(t.summary)}</div>
            <div class="muted lab-cli"><code>veloprove ${esc(t.cli)}</code>${
              t.mcp ? ` · <code>${esc(t.mcp)}</code>` : ''
            }</div>
            ${hintLine}
          </div>
          <button type="button" class="${btnClass}" onclick="runLabTool('${esc(t.action)}','${esc(
          t.mode
        )}','${esc(t.cli)}')">${btnLabel}</button>
        </div>`;
      })
      .join('');
    sections.push(
      `<section class="lab-group" data-group="${esc(g)}"><h4 class="lab-group-title">${esc(
        g
      )}</h4><div class="lab-list">${rows}</div></section>`
    );
  }
  return sections.join('\n');
}
