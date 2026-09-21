# VeloProve MCP marketplace listing pack

Assets and copy for Cursor / Claude / Windsurf MCP directories. **Runtime needs no API key** — local stdio only.

After npm install, agents learn from **`docs/AGENTS.md`** (packaged playbook). Humans/agents also use **Docs Chat** (`veloprove ui` pin, `veloprove ask`, MCP `vp.ask`) — answers come **only** from packaged `docs/**/*.md` (no cloud LLM).

## Install badge (markdown)

```markdown
[![MCP — no API key](https://img.shields.io/badge/MCP-no%20API%20key-0a7a3e)](https://github.com/NadiaSalah/VeloProve)
[![Local-first](https://img.shields.io/badge/Privacy-Local--First-7c3aed)](https://github.com/NadiaSalah/VeloProve)
```

SVG badge in this folder: [`no-api-key-badge.svg`](./no-api-key-badge.svg)

## One-click install JSON (canonical)

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

Or: `npx veloprove init --link-ai --teach`

## Listing blurb (short)

**VeloProve** — local agentic QA for coding agents. Inspect, plan, generate, run, diagnose, heal, and `verify` entirely on your machine via `vp.*` MCP tools (catalog length from `TOOL_SURFACE`). No cloud sandbox, no API key for MCP. Teach AI writes `AGENTS.md`; Docs Chat answers from packaged docs only.

## Listing blurb (long)

VeloProve is a local-first autonomous QA engine for Cursor, Claude Code, Windsurf, Cline, and Codex. After `teach-ai` / `init --teach`, tell your agent “test this project” — it follows packaged `docs/AGENTS.md`, runs change-aware `vp.verify`, packs failures under `.veloprove/evidence/`, and keeps developer tests safe (`overwritePolicy: generated-only`). Dashboard **Docs Chat** (and `veloprove ask` / `vp.ask`) answers from packaged markdown only — no cloud LLM.

## Screenshots checklist (capture locally — do not commit)

Use the **local-only** sandbox (gitignored, not in npm pack):

```bash
# from repo root (after npm run build)
cd _local_demo/sample-app
npm install && npm test
node ../../dist/cli/index.js init -y --teach --no-link-ai
node ../../dist/cli/index.js verify --json --ci
node ../../dist/cli/index.js ui --port 4177
# other terminal:
cd ../ && node capture-screenshots.mjs
```

Save PNGs under `_local_demo/screenshots/` (never under git/npm):

1. `01-dashboard-overview.png` — Dashboard Overview / Quick Actions  
2. `02-dashboard-verify.png` — Verify presets panel  
3. `03-dashboard-docs-chat.png` — **Docs Chat** answering a question (required for marketplace)  
4. `04-cli-doctor.txt` / `verify-output.json` — optional CLI proof  

After npm publish, upload those stills to Cursor/Claude marketplace listings manually.

## Post-install AI path (must work from the tarball)

```bash
npx veloprove init -y --teach
npx veloprove ask "how do I verify changes?"   # Docs Chat corpus
npx veloprove ui                               # Docs Chat pin + Teach AI
# Agent reads: node_modules/@engnadia/veloprove/docs/AGENTS.md
```

## Store metadata suggestions

| Field | Value |
|-------|--------|
| Name | VeloProve |
| Category | Testing / QA / Developer Tools |
| Keywords | mcp, local-first, playwright, vitest, autonomous-qa, docs-chat |
| Homepage | https://github.com/NadiaSalah/VeloProve |
| Privacy | Local stdio; no telemetry required |
