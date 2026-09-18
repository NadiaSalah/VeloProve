# Getting Started with VeloProve

**Build. Test. Trust.**

**VeloProve** is a local-first agentic QA and automated testing toolkit designed for developers and AI coding agents. It integrates directly with a project to generate and run tests, analyze failures, detect regressions, and produce actionable quality reports while keeping developers in control of their testing workflow. Core execution is local-first—network access occurs only when explicitly targeting remote endpoints, registries, webhooks, or external services requested by the user.

---

## System requirements

| | |
|--|--|
| **Operating systems** | Windows, macOS, Linux (Node.js-supported platforms) |
| **Runtime** | Node.js **>= 18.0.0** |
| **AI / LLM** | **Not required** for core QA. Optional MCP link to Cursor / Claude / Windsurf / Cline |
| **Cloud API key** | **Not required** (local stdio MCP + local engine) |

If an AI agent is not linked, VeloProve still runs. Actions that prefer an agent show a warning message; use Dashboard **Run without AI** or CLI `--allow-no-ai` for those steps.

---

## ⚡ Quick Installation

You can run VeloProve directly via `npx` or install it globally / locally in your project.

### Method 1: Using npx (Zero Install)
```bash
npx @engnadia/veloprove inspect
```

### Method 2: Local Project Dependency
```bash
npm install --save-dev @engnadia/veloprove
# or
pnpm add -D @engnadia/veloprove
# or
yarn add -D @engnadia/veloprove
```

### Method 3: Global CLI Tool
```bash
npm install -g @engnadia/veloprove
```

**Daily-10:** `init` · `teach-ai` · `ask` · `inspect` · `doctor` · `verify` · `test` · `changed` · `security` · `history` — see `veloprove --help` (grouped like Dashboard: Start / Verify / Repair / Results / API / Security / Experience / More).

---

## 🚀 5-Minute Quickstart

### Step 1: Initialize VeloProve in your Project
Navigate to your project root and run:
```bash
npx veloprove init
```
This automatically:
- Scans your framework (Next.js, React, Vite, Vue, Svelte, Express, Fastify).
- Detects test runners (Vitest, Jest, Playwright, and Node built-in `node --test` / `node:test`).
- Generates user-editable `veloprove.config.json` with sensible defaults.
- Creates `.veloprove/` local state storage (`config/`, `reports/`, `state/`).
- Adds convenience scripts to your `package.json` (`vp:doctor`, `vp:test`, `vp:changed`, `vp:release`).

### Step 2: Run Environment & Installation Diagnostics
```bash
npx veloprove doctor
```
Verifies Node.js version (>=18.0.0), package manager, test runner availability, configuration integrity, and filesystem permissions.

### Step 3: Inspect Discovered Requirements & Routes
```bash
npx veloprove inspect
```
VeloProve parses your project's `PRD.md`, `openapi.json`, route directories, and API endpoints, building an internal use-case and requirement graph.

### Step 4: Generate a Risk-Scored Test Plan
```bash
npx veloprove plan --scope uncovered
```

### Step 5: Materialize Test Files
```bash
npx veloprove generate
```
Test files are generated directly in your test directories without overwriting any developer-written tests.

### Step 6: Execute Tests and Check Release Readiness
```bash
npx veloprove test
npx veloprove history -n 10
npx veloprove verify --ci
# or gate alone:
npx veloprove release
```

### Step 7: Teach your AI + ask docs (recommended)
```bash
npx veloprove init -y --teach
# or if already initialized:
npx veloprove teach-ai --force --mcp
npx veloprove ask "how do I verify my changes?"
```
`init --teach` / `--link-ai` detects Cursor/Claude/Windsurf/Cline when possible, writes MCP configs, and prints a paste-ready briefing. Docs Chat answers from packaged markdown only (`veloprove ask`, Dashboard **Docs Chat**, MCP `vp.ask`).

### Step 8: Launch Live Web Dashboard UI
```bash
npx veloprove ui -o
```
Explore verify, Teach AI, **Docs Chat**, run history, test plans, real-time runner logs, failure self-healing, Postman-like API tester, and architecture graphs in your browser (default port `4173`). (See [Dashboard UI Guide](dashboard.md)).

---

## 🤖 Connecting to AI Editors (Cursor, Windsurf, Claude Code, Cline)

Add the VeloProve MCP server to your editor settings:

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
*(If installed locally in your project dependencies, `["veloprove", "mcp"]` can also be used).*

Now your AI assistant can run `vp.inspect`, `vp.plan`, `vp.run`, `vp.diagnose`, `vp.heal`, `vp.refine`, `vp.verify`, `vp.history`, `vp.ensureDev`, `vp.accessibility`, and `vp.releaseCheck` autonomously.

Full packaged agent playbook (loop + every editor MCP snippet): see [`docs/AGENTS.md`](../AGENTS.md) inside this package (`node_modules/@engnadia/veloprove/docs/AGENTS.md` after install).
