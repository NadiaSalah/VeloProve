# VeloProve Documentation

Canonical docs for `@engnadia/veloprove`. **Start here**, then follow the path that matches your role.

## Start here (beginners)

1. [Getting Started](guides/getting-started.md) — install + 5-minute first run  
2. [FAQ](guides/faq.md) — no-AI mode, after install, verify vs release, **Tool Lab honesty**  
3. [Trust & privacy](guides/trust.md) — local vs network, writes, git  
4. [Dashboard UI](guides/dashboard.md) — `veloprove ui` + Terminal only / Partial tools  
5. [Surface matrix](reference/surface-matrix.md) — CLI ↔ MCP ↔ Dashboard (what exists where)

## AI agents (after npm install)

Read **[AGENTS.md](AGENTS.md) first** — packaged playbook + MCP JSON + autonomous loop.

Then keep open:

- [Surface matrix](reference/surface-matrix.md) — do **not** nest `ui` / `tui` / `mcp` / `watch` / `mock-server` inside Dashboard  
- [CLI Reference](reference/cli.md) · [MCP Reference](reference/mcp.md)  
- Humans/agents can also ask: `npx veloprove ask "…"`, Dashboard **Docs Chat**, or MCP `vp.ask` (packaged markdown only — no cloud LLM)

## Guides (deeper)

| Doc | Description |
|-----|-------------|
| [Features](guides/features.md) | Capability deep dive by domain (read after getting-started) |
| [Examples & Recipes](guides/examples.md) | Next.js, Express, Vitest, Playwright, `node:test` |
| [AI Integrations](guides/ai-integrations.md) | Extra editor notes (MCP JSON lives in [AGENTS.md](AGENTS.md)) |
| [Scheduled verify](guides/scheduled-verify.md) | `watch` / `hook` + OS schedulers |
| [Project Twin](guides/features.md) | **PARTIAL MVP** — search “Project Twin” in Features; CLI `twin` / `impact` / `drift` / `test --affected` |
| [MCP marketplace pack](assets/marketplace/README.md) | Listing copy, no-API-key badge, screenshot checklist |

## Reference

| Doc | Description |
|-----|-------------|
| [CLI Reference](reference/cli.md) | Commands + Dashboard column (catalog SSOT) |
| [MCP Reference](reference/mcp.md) | `vp.*` tools + `vp://` resources |
| [Architecture](reference/architecture.md) | CLI / MCP / Dashboard → engine |
| [Surface matrix](reference/surface-matrix.md) | Counts + Terminal only / Partial / MCP-only |

## Assets

| File | Use |
|------|-----|
| [veloprove-logo.svg](assets/veloprove-logo.svg) | Wordmark (README, About, `/logo.svg`) |
| [veloprove-icon.svg](assets/veloprove-icon.svg) | Mark (favicon, sidebar, `/icon.svg`) |

## Repo-only (not published to npm)

| Path | Purpose |
|------|---------|
| [internal/roadmap.md](internal/roadmap.md) | Completed backlog archive |
| `generated/*.json` | Local audit / smoke / capability manifests |
| Root [AGENTS.md](../AGENTS.md) | **Contributor** protocol (`src/`, parity) — not for consumer apps |

Root maintainer docs: [CONTRIBUTING.md](../CONTRIBUTING.md) · [RELEASING.md](../RELEASING.md) · [SECURITY.md](../SECURITY.md) · [CHANGELOG.md](../CHANGELOG.md) · [TODO.md](../TODO.md)
