# Surface exposure matrix (implementation source of truth)

Derived from `src/shared/tool-catalog.ts` + registrations. **Do not invent tools here.**

| Surface | Count | Notes |
|---------|------:|-------|
| Catalog rows | 83 | Includes CLI-only + MCP-only |
| CLI commands | 75 | `veloprove <cmd>` |
| MCP tools | 75 | `vp.*` |
| Dashboard actions | 54 | curated subset + helpers |

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

`init`, `ui`, `tui`, `setup-ci`, `sandbox`, `watch`, `hook`, `mcp`

### Dashboard-only helpers

`lint-fix` (= `lint --fix`), `init-security-policy` (= `security --init-policy`)

Docs Chat uses `ask-docs` (catalog id `ask` → `vp.ask` / `veloprove ask`).

### History dual path

- `GET /api/history` — SSR sparklines on Dashboard Test Runs
- `/api/actions/history` + UI **Refresh History** — reload aggregates into the Results pane (same engine as `veloprove history` / `vp.history`)

## Validation

- `npm run audit:tools` — catalog ↔ CLI ↔ MCP ↔ docs ↔ UI
- `npm run pack:smoke` — clean consumer install
- `npm run release:check` — build + typecheck + test + pack
