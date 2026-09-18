# VeloProve Documentation

Canonical docs for `@engnadia/veloprove`. Start here, then pick a guide or reference.

**AI agents (after npm install):** read [AGENTS.md](AGENTS.md) first — packaged playbook + MCP setup.

## Guides

| Doc | Description |
|-----|-------------|
| [Getting Started](guides/getting-started.md) | Install, system requirements, 5-minute tutorial |
| [FAQ](guides/faq.md) | OS / no-AI mode, after-install, AI link, verify vs release, Docs Chat |
| [Features](guides/features.md) | Capability deep dive by domain |
| [Examples & Recipes](guides/examples.md) | Next.js, Express, Vitest, Playwright, `node:test` recipes |
| [Dashboard UI](guides/dashboard.md) | Live command center (`veloprove ui`) |
| [AI Integrations](guides/ai-integrations.md) | Copilot, Codex, handshake extras (MCP JSON → [AGENTS.md](AGENTS.md)) |
| [Scheduled verify](guides/scheduled-verify.md) | watch/hook + Windows Task Scheduler / systemd / cron recipes |
| [MCP marketplace pack](assets/marketplace/README.md) | Listing copy, no-API-key badge, screenshot checklist |

## Reference

| Doc | Description |
|-----|-------------|
| [CLI Reference](reference/cli.md) | Commands, flags, and options (**75**) |
| [MCP Reference](reference/mcp.md) | `vp.*` tools, schemas, `vp://` resources (**75**) |
| [Architecture](reference/architecture.md) | CLI / MCP / Dashboard → engine map |
| [Surface matrix](reference/surface-matrix.md) | 75 CLI / 75 MCP / 54 Dashboard + intentional asymmetries |

## Assets

Official brand marks (shipped under `docs/assets/`):

| File | Use |
|------|-----|
| [veloprove-logo.svg](assets/veloprove-logo.svg) | Wordmark + mark (README, About pane, `/logo.svg`) |
| [veloprove-icon.svg](assets/veloprove-icon.svg) | App mark (favicon, sidebar, `/icon.svg`) |

## Repo-only (not published to npm)

| Path | Purpose |
|------|---------|
| [internal/roadmap.md](internal/roadmap.md) | Completed v1.0.0 / post-1.0 backlog |
| `generated/*.json` | Tool-surface / smoke / capability manifests from local audits |
| Root [AGENTS.md](../AGENTS.md) | **Contributor** agent protocol (edit `src/`, parity tests) — not for consumer apps |

Root contributor docs: [CONTRIBUTING.md](../CONTRIBUTING.md) · [RELEASING.md](../RELEASING.md) · [SECURITY.md](../SECURITY.md) · [CHANGELOG.md](../CHANGELOG.md)
