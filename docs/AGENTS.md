# VeloProve Agent Instructions (npm package)

**Audience:** AI coding agents in a **consumer project** after `npm install -D @engnadia/veloprove` or `npx @engnadia/veloprove`.

This file ships inside the published package. Use it as the agent playbook. Do **not** treat contributor-only root `AGENTS.md` protocols (editing `src/`) as applying to end-user apps.

Packaged docs path (when installed as a dependency):

`node_modules/@engnadia/veloprove/docs/`

Humans can also ask the local docs assistant: `npx veloprove ask "…"`, Dashboard **Docs Chat**, or MCP `vp.ask` (answers from these packaged markdown files only — no cloud LLM).

**Requirements:** Node.js >= 18 on Windows / macOS / Linux. An AI coding agent is **optional** — the engine runs locally without one; sensitive steps only show a notice (CLI `--allow-no-ai`, Dashboard **Run without AI**).

**Test runners:** Vitest, Jest, Playwright, and Node built-in `node --test` / `node:test` are detected automatically. Prefer `overwritePolicy: "generated-only"` so developer suites are never overwritten.

---

## First run after install

```bash
npx veloprove init -y --teach          # detect editors, link MCP when found, write AGENTS.md
# or interactive: npx veloprove init   # choose Auto / Cursor / multi / Skip AI link
npx veloprove doctor
npx veloprove ask "how do I verify changes?"   # same docs corpus as Dashboard Docs Chat
npx veloprove ui                               # Docs Chat pin + Teach AI (optional)
npx veloprove verify --ci
```

Flags: `--link-ai`, `--no-link-ai`, `--teach`, `-y` (auto-link when Cursor/Claude/Windsurf/Cline hints exist).

**Where agents learn:** this file (`docs/AGENTS.md` inside the package). **Where humans/agents ask docs:** `veloprove ask` / Dashboard **Docs Chat** / MCP `vp.ask` — packaged markdown only, no cloud LLM.

---

## Autonomous QA loop

**One-prompt (preferred):** when the user says “test this project” / “verify my changes”:

```text
1. vp.bootstrap   → once if AGENTS.md / MCP missing (`veloprove teach-ai`)
2. vp.verify      → { "ci": true } / `npx veloprove verify --json --ci`
3. On failure     → read `.veloprove/evidence/<runId>/` then heal / suggestFix
4. vp.history
```

Use plan/generate/run only when verify reports missing coverage or an empty suite.

**Extended loop (when needed):**

```text
1. vp.bootstrap     → Discover capabilities / write local AGENTS.md (`veloprove teach-ai`)
2. vp.inspect       → Stack, routes, APIs, PRD requirements
3. vp.changed       → Impacted source + tests from git diff
   optional: vp.impact / vp.twin / vp.drift  → Twin enrichment (PARTIAL MVP — evidence classes; not AI assumptions)
4. vp.plan          → Risk-prioritized cases
5. vp.generate      → Materialize tests (overwritePolicy: generated-only; live API grounding on by default)
6. vp.run           → Execute affected/full suites (`veloprove test --affected` expands when Twin confidence is low)
7. vp.diagnose      → APPLICATION_BUG | TEST_BUG | FLAKY_TEST | …
8. vp.heal / vp.suggestFix → Repair locators or inspect app-fix hints
9. vp.run           → Confirm green
10. vp.verify / vp.releaseCheck → Change-aware gate + confidence score
```

**Safety:** Never overwrite or delete developer-written tests unless the user explicitly asks. Prefer `overwritePolicy: "generated-only"`.

CLI equivalents use `npx veloprove <command>` (e.g. `inspect`, `verify --ci`, `release`, `ask`, `twin`, `drift`).

Optional local hardening:

- `verify --sandbox` / `verify --docker-env` — ephemeral mock sandbox or docker-compose test env (no vendor cloud)
- `watch --verify` / `watch -i 300` — re-verify on change or on an interval
- `hook install --verify` — pre-commit runs `veloprove verify --ci`
- `generate --no-live-ground` — skip live GET probing when offline
- `twin build --with-impact --with-drift` — refresh Project Twin snapshot (PARTIAL)
- `test --affected` — Twin-aware selection; expands to full suite when confidence is low

---

## Dashboard Tool Lab honesty (required reading)

Dashboard **sidebar / Guide** = curated daily workflows. **Tool Lab** = full CLI catalog (same engine).

| Class | Commands | Rule for agents |
|-------|----------|-----------------|
| **Terminal only** | `ui`, `tui`, `mcp`, `watch`, `mock-server` | **Never nest** inside Dashboard — run in a separate terminal (`npx veloprove <cmd>`) |
| **Partial** | `alert`, `db-snapshot`, `db-restore`, `refine`, `run-collection`, `dead-assets` | Dashboard path is incomplete — prefer CLI for full options |
| **Run / URL / Write** | Most other CLI commands | Safe one-click via Tool Lab / curated views |

Full matrix: `docs/reference/surface-matrix.md`. MCP resources for Twin: `vp://twin/latest`, `vp://twin/evidence`, `vp://twin/graph`.

---

## MCP setup (stdio)

Canonical args include `-y` so `npx` does not prompt. **No API key required** — VeloProve is local stdio MCP.

```json
{
  "mcpServers": {
    "veloprove": {
      "command": "npx",
      "args": ["-y", "@engnadia/veloprove", "mcp"]
    }
  }
}
```

| Editor | Config location / one-click |
|--------|----------------------------|
| Cursor | `.cursor/mcp.json` or **Settings → MCP → Add** (paste JSON above). Marketplace listing: search “VeloProve” when published. |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Claude Code | `claude mcp add veloprove npx -y @engnadia/veloprove mcp` or `~/.claude.json` |
| Claude Desktop | `claude_desktop_config.json` |
| Cline | `cline_mcp_settings.json` (optional `autoApprove` for `vp.inspect`, `vp.run`, `vp.verify`, `vp.ask`, …) |

Or: `npx veloprove init --link-ai --teach` / `npx veloprove teach-ai --force --mcp` to write configs for you.

If the package is already a local dependency, `["veloprove", "mcp"]` is also valid.

**Namespace:** tools are `vp.*` only (full catalog including `vp.ask` — length from `catalogMcpTools()`). **Resources:** `vp://…` only (examples: `vp://project/profile`, `vp://release/confidence`, `vp://twin/latest`, `vp://twin/evidence`, `vp://twin/graph`).

---

## FAQ (short)

- **verify vs release:** `verify` = full change-aware QA; `release` = confidence score only.  
- **Teach AI:** `teach-ai` / `vp.bootstrap` / Dashboard Teach AI → `AGENTS.md` + paste briefing.  
- **Docs Q&A:** `ask` / `vp.ask` / Docs Chat — packaged docs only.  
- **audit vs security:** `audit` = CVEs/secrets; `security` = live non-destructive suite.  

More: [guides/faq.md](guides/faq.md).

---

## Where to read more (same package)

| Doc | Purpose |
|-----|---------|
| [guides/faq.md](guides/faq.md) | Install, AI link, verify, ask — FAQ |
| [guides/ai-integrations.md](guides/ai-integrations.md) | Copilot / Codex / handshake extras |
| [reference/mcp.md](reference/mcp.md) | All MCP tools + schemas + resources (catalog length) |
| [reference/cli.md](reference/cli.md) | All CLI commands + short aliases (catalog length) |
| [reference/surface-matrix.md](reference/surface-matrix.md) | Exposure matrix + intentional CLI/MCP/UI asymmetries |
| [guides/features.md](guides/features.md) | Capability map by domain |
| [guides/getting-started.md](guides/getting-started.md) | Install + first run |
| [guides/scheduled-verify.md](guides/scheduled-verify.md) | watch/hook + OS scheduler recipes |
| [assets/marketplace/](assets/marketplace/README.md) | MCP listing copy + no-API-key badge |

Bootstrap any editor: `npx veloprove teach-ai --force --mcp` (alias: `agent-handshake`) or MCP `vp.bootstrap`.
