# Surface exposure matrix (implementation source of truth)

Derived from `src/shared/tool-catalog.ts` + registrations. **Do not invent tools here.**

| Surface | Count | Notes |
|---------|------:|-------|
| Catalog rows | see `TOOL_SURFACE.length` | Includes CLI-only + MCP-only |
| CLI commands | `catalogCliCommands().length` | `veloprove <cmd>` — SSOT in `tool-catalog.ts` |
| MCP tools | `catalogMcpTools().length` | `vp.*` — SSOT in `tool-catalog.ts` |
| Dashboard Tool Lab | `buildDashboardLabCatalog().length` | **Full CLI** — grouped/searchable; sidebar/Guide stay curated workflows |

Live audit artifact (repo-only): `docs/generated/TOOL_SURFACE_AUDIT.json` via unit audit / `npm run audit:tools`.

## Intentional asymmetries (not bugs)

### MCP-only (no dedicated CLI twin)

| MCP | How humans reach it |
|-----|---------------------|
| `vp.run.get` | Poll after async MCP `vp.run` |
| `vp.suggestFix` | After `APPLICATION_BUG` diagnosis |
| `vp.flaky` | History aggregates |
| `vp.remediateMalware` | Also via CLI `scan-malware --fix` |
| `vp.securityPlan` / `vp.securityRun` / `vp.securityReport` | CLI umbrella: `security` |
| `vp.exportSarif` | CLI: `security --sarif` |

### CLI-only (no MCP twin)

These have **no `vp.*` twin**. That is **not** the same as “cannot run in Dashboard”.

`init`, `ui`, `tui`, `setup-ci`, `sandbox`, `watch`, `hook`, `mcp`

Several of these **do** have Dashboard actions (`init`, `setup-ci`, `sandbox`, `hook`). The interactive/long-running ones are **Dashboard Terminal-only** (below).

### Dashboard Tool Lab modes

| Mode | Behavior |
|------|----------|
| **Run** | One-click `/api/actions/<id>` via same engine |
| **URL** | Uses API Studio / Load / Throttle base URL (`?url=`) |
| **Write** | Confirm gate (or AI auto-continue) before mutating |
| **Terminal only** (`cli-hint`) | **Cannot nest inside Dashboard** — copy `npx veloprove …` to a terminal |
| **Partial** (`degraded`) | Dashboard path exists but incomplete vs full CLI options |

### Dashboard Terminal only (cannot nest)

| CLI | Why |
|-----|-----|
| `ui` | Dashboard is already that server |
| `tui` | Interactive terminal UI |
| `mcp` | Long-running stdio MCP server |
| `watch` | Long-running file watcher |
| `mock-server` | Long-running mock HTTP server |

Source of truth: `CLI_HINT_ONLY` in `src/application/dashboard-lab-catalog.ts`.

### Dashboard partial (degraded vs CLI)

| CLI | Dashboard behavior | Prefer CLI for |
|-----|--------------------|----------------|
| `alert` | Skips without webhook URL | `--webhook` / full payload |
| `db-snapshot` | Lists snapshots | Creating named snapshots + file lists |
| `db-restore` | Restores latest/first if present | Explicit snapshot id |
| `refine` | Default instruction | Custom NL instruction + `--file` |
| `run-collection` | Default collection path | Explicit collection / env paths |
| `dead-assets` | Scan-only in Dashboard | `--purge -y` to delete (CLI only) |

Source of truth: `DASHBOARD_PARTIAL_CLI` in `src/application/dashboard-lab-catalog.ts`.

Sidebar + Guide remain curated daily workflows. Tool Lab is the full catalog UI.

### Dashboard-only helpers

`lint-fix` (= `lint --fix`), `init-security-policy` (= `security --init-policy`)

Docs Chat uses `ask-docs` (catalog id `ask` → `vp.ask` / `veloprove ask`).

### History dual path

- `GET /api/history` — SSR sparklines on Dashboard Test Runs
- `/api/actions/history` + UI **Refresh History** — reload aggregates into the Results pane (same engine as `veloprove history` / `vp.history`)

## Docs coverage expectation

Every CLI command should appear in `docs/reference/cli.md` (and MCP twins in `docs/reference/mcp.md`). Feature deep-dives live in `docs/guides/features.md`. Tool Lab coverage is validated by `tests/unit/tool-surface-audit.test.ts` + `tests/unit/dashboard-lab-catalog.test.ts`.

## Validation

- `npm run audit:tools` — catalog ↔ CLI ↔ MCP ↔ docs ↔ UI markers
- `node scripts/audit-cli-ui-docs.mjs` — CLI without Dashboard action + docs mention report
- `npm run pack:smoke` — clean consumer install
- `npm run release:check` — build + typecheck + test + pack
