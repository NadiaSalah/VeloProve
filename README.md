<p align="center">
  <a href="https://github.com/NadiaSalah/VeloProve">
    <img src="docs/assets/veloprove-logo.svg" alt="VeloProve" width="320" />
  </a>
</p>

<p align="center">
  <strong>Build. Test. Trust.</strong><br />
  <em>Local agentic QA and automated testing for modern codebases.</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/tests-passing-brightgreen.svg" alt="Tests" />
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg" alt="Node Version" />
  <img src="https://img.shields.io/badge/Privacy-Local--First-purple.svg" alt="Local First" />
</p>

---

VeloProve is a local, agentic QA and automated testing toolkit that helps AI coding agents and developers generate tests, run them, analyze failures, detect regressions, and improve software quality directly inside the project.

---

## 📚 Complete Documentation

- 🚀 **[Getting Started Guide](docs/guides/getting-started.md)**: Installation, 5-minute tutorial, and setup.
- 🖥️ **[Live Dashboard UI Guide](docs/guides/dashboard.md)**: Interactive web command center, Postman studio, and visual topology graphs.
- ⚡ **[CLI Reference](docs/reference/cli.md)**: Full command-line reference, options, and flags.
- 🤖 **[MCP Reference](docs/reference/mcp.md)**: Model Context Protocol tools, input schemas, and resources.
- 🔍 **[Feature Deep Dive](docs/guides/features.md)**: Detailed breakdown of all VeloProve capabilities.
- 💡 **[Examples & Recipes](docs/guides/examples.md)**: Real-world recipes for Next.js, Express, Vitest, Playwright, and `node:test`.
- 🤖 **[Agent playbook (AGENTS.md)](docs/AGENTS.md)**: Packaged AI loop + MCP setup (ships in the npm package).
- 🔌 **[AI Integrations extras](docs/guides/ai-integrations.md)**: Copilot, Codex, handshake details.
- 🏗 **[Architecture](docs/reference/architecture.md)**: How CLI, MCP, and Dashboard share one engine.
- 📚 **[Docs index](docs/README.md)**: Full documentation table of contents.
---

## System requirements

| Requirement | Details |
|-------------|---------|
| **OS** | **Windows**, **macOS**, and **Linux** (any platform that runs Node.js) |
| **Node.js** | **>= 18.0.0** (`engines.node` in `package.json`) |
| **Network** | Not required for core local QA. Needed only when you call live URL / registry / webhook features |
| **AI coding agent** | **Optional.** CLI, Dashboard, and MCP engines run locally without Cursor/Claude/Windsurf/Cline |

VeloProve does **not** require a cloud LLM API key. Linking an editor MCP improves agent workflows; it is not required for `inspect`, `doctor`, `test`, `verify`, `ask`, security scans, or the Dashboard.

Sensitive file-changing steps (heal, auto-fix, generate, bisect, …) show a clear notice when no agent is linked. Continue with Dashboard **Run without AI**, or CLI `--allow-no-ai` (plus `-y` in CI).

---

## What is VeloProve?

**VeloProve** is a local-first agentic QA and automated testing toolkit designed for developers and AI coding agents (**Cursor, Windsurf, Claude Code, Codex, Cline, VS Code Agent**). It integrates directly into your workspace to generate and run tests, analyze failure root causes, heal brittle locators, detect regressions, and produce actionable quality reports while keeping developers in full control of their testing workflows.

Unlike proprietary cloud platforms that require uploading private code and secrets to remote servers, VeloProve operates locally-first on your machine without forced telemetry or cloud lock-in. Core analysis and orchestration execute locally. Network access occurs only when you explicitly invoke features that target remote endpoints, registries, webhooks, external services, or live applications.

---

## What does VeloProve mean?

**VeloProve** combines **velocity** and **proof**.

- **Velo** — from velocity: fast, continuous quality feedback inside the local workspace.
- **Prove** — to verify, validate, and demonstrate that software is release-ready.

Together, **VeloProve** is a local engineering workspace where software quality is inspected, tested, proven, and strengthened before release.

---

## Why VeloProve?

- **Local-First & Private**: Core analysis and orchestration execute directly on your local machine without forced telemetry. Network access occurs only when explicitly targeting remote endpoints, registries, webhooks, or live applications requested by the user.
- **Agent-Native (MCP)**: Exposes 75 structured Model Context Protocol (MCP) tools for coding agents to inspect, plan, write, run, diagnose, heal, and verify tests autonomously.
- **Deep Code & Framework Awareness**: Analyzes AST structures across Next.js, React, Vite, Express, Fastify, Vue, and Svelte to discover routes, API contracts, and requirements.
- **Evidence-Based Diagnostics**: Classifies test failures with confidence scoring (`APPLICATION_BUG`, `TEST_BUG`, `FLAKY_TEST`, `NETWORK_FAILURE`) and provides recommended source code fixes.
- **Smart Change Impact**: Analyzes `git diff` to identify and run only the tests affected by your recent code edits.
- **Comprehensive Testing Spectrum**: Unifies Unit, Component, API (Dynamic Variables + Auto-Auth + Auto-Cleanup), E2E (Playwright), Security (OWASP Top 10 + CVEs), and Accessibility (WCAG 2.1).
- **Developer-Controlled**: Seamlessly runs via standard CLI, interactive terminal dashboard (TUI), local live web dashboard, or CI/CD quality gates.

---

## ✨ Key Features

- 🤖 **AI-Assisted Test Generation**: Materializes Vitest, Jest, and Playwright tests from discovered PRD requirements, routes, and OpenAPI contracts. Projects that already use Node’s built-in `node --test` / `node:test` are detected and executed without installing Vitest.
- ⚡ **Automated Test Execution & Watch Mode**: Runs test suites with compact structured summaries and real-time watch feedback.
- 🔬 **Failure Root-Cause Analysis**: Evidence-based diagnostics separating application bugs from test bugs with actionable recommendations.
- 🩺 **Safe Test Self-Healing**: Automatically repairs stale locators using Visual-Aria and accessibility hierarchies without breaking tests.
- 🔍 **Autonomous Git Bisect**: Traverses commit history (`veloprove bisect`) to pinpoint bug-introducing commits automatically.
- 🛡️ **Comprehensive Security Testing**: Autonomous non-destructive vulnerability testing for authentication, authorization (IDOR / privilege escalation), input injections (SQLi, NoSQLi, XSS, Command, Path Traversal), form tampering, JWT tokens, and file uploads.
- 📬 **API Testing & Postman Runner**: Executes Postman v2.1 collections, interpolates chained variables, and tests OpenAPI boundary probes.
- 🛡️ **Security & Secret Scanning**: Audits dependencies for CVEs, scans for leaked credentials, and runs OWASP Top 10 checks.
- 🎙️ **Accessibility & Screen Reader Simulation**: Audits WCAG 2.1 A/AA/AAA guidelines and simulates NVDA/VoiceOver speech order.
- 🎬 **Visual Failure Replay & Executive Reports**: Generates standalone animated SVG/HTML replay packages and single-file executive QA reports.
- 🌐 **75 Model Context Protocol (MCP) Tools**: Native stdio MCP server for full AI coding agent interoperability (includes docs-grounded `vp.ask`).

---

## ⚡ Quick Start

### Installation & Initialization

End users and coding agents can run VeloProve instantly without cloning the repository:

```bash
# Initialize VeloProve inside any existing project (scaffolds .veloprove/, scripts, and config)
npx @engnadia/veloprove init

# Run environment & installation health diagnostics
npx @engnadia/veloprove doctor
```

Alternatively, install as a project devDependency:

```bash
npm install -D @engnadia/veloprove
# or pnpm add -D @engnadia/veloprove / yarn add -D @engnadia/veloprove / bun add -D @engnadia/veloprove
```

### Basic QA Workflow

```bash
# 1. Initialize VeloProve in your project
npx veloprove init

# 2. Inspect project stack, routes, and discovered PRD requirements
npx veloprove inspect

# 3. Generate prioritized test plan
npx veloprove plan --scope critical

# 4. Materialize test files (protected against overwriting existing tests)
npx veloprove generate

# 5. Execute tests & verify release readiness
npx veloprove test
npx veloprove release

# Optional: teach AI + ask from packaged docs
npx veloprove init -y --teach
npx veloprove ask "how do I verify changes?"
```

### Daily-10 (most used)

`init` · `teach-ai` · `ask` · `inspect` · `doctor` · `verify` · `test` · `changed` · `security` · `history`

Root `veloprove --help` groups all **75** commands like the Dashboard sidebar: Start / Verify / Repair / Results / API / Security / Experience / More. Aliases are shortcuts only — docs and MCP keep the full canonical name.

---

## 🖥️ Live Web Dashboard & Command Center

VeloProve includes a **zero-cloud, local-first interactive Web Dashboard UI** with dark mode, interactive testing controls, and rich visual diagnostics.

```bash
# Start Dashboard on default port (http://localhost:4173)
npx veloprove ui

# Start on custom port and open automatically in browser
npx veloprove ui -p 4000 -o
```

### ✨ Dashboard Highlights:
* 📊 **Project Discovery & Diagnostics**: Inspect discovered routes, frameworks, test runners, and PRD requirements with single-click Doctor checks.
* 📝 **Visual Test Planner**: Browse risk-scored test cases, filter by scope (`critical`, `e2e`, `api`, `changed`), and materialize tests on demand.
* 🧪 **Live Runner & Self-Healing Studio**: Execute tests in real time, view failure classifications, and preview Visual-Aria locator healing diffs.
* 📬 **Postman-like API Studio**: Send interactive HTTP requests, execute Postman v2.1 collections, and export discovered routes to Postman JSON.
* 🗺️ **Architecture & Topology Graph**: Render interactive Mermaid.js diagrams mapping UI routes, backend APIs, databases, and microservices.
* 🛡️ **Security & Accessibility Center**: Run OWASP Top 10 scans, audit WCAG 2.1 rules, and simulate screen reader speech flows.

👉 **[Read the Full Dashboard UI Documentation](docs/guides/dashboard.md)**

---

## 🛠️ CLI Quick Reference

```bash
npx veloprove init                 # Scaffold .veloprove/, scripts, config
npx veloprove doctor               # Environment & install health
npx veloprove inspect              # Stack, routes, APIs, PRD
npx veloprove plan / generate      # Risk-scored plan → materialize tests
npx veloprove test / changed       # Full suite or impact-selected tests
npx veloprove diagnose / heal      # Classify failures; heal TEST_BUG locators
npx veloprove verify / release     # Change-aware gate + confidence score
npx veloprove ui / tui / mcp       # Dashboard, terminal center, MCP stdio
```

Full command list (**75**): **[CLI Reference](docs/reference/cli.md)**.

---

## 🤖 MCP Server Setup for AI Coding Agents

Add to `.cursor/mcp.json`, `~/.codeium/windsurf/mcp_config.json`, or `cline_mcp_settings.json`:

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
*(Note: If `@engnadia/veloprove` is installed locally in your project dependencies, `["veloprove", "mcp"]` may also be used).*

### Core MCP Tools

VeloProve exposes 75 structured Model Context Protocol (MCP) tools over stdio. The core tools for autonomous coding agent loops include:

- `vp.inspect`: Deep project scanning (frameworks, routes, APIs, PRD requirements).
- `vp.doctor`: Run environment, runtime, and project diagnostics.
- `vp.bootstrap`: Protocol handshake to self-teach any AI agent how to operate VeloProve.
- `vp.changed`: Change impact analysis mapping `git diff` to affected tests.
- `vp.plan`: Risk-scored test planning from specs & routes.
- `vp.generate`: Generate compiling test files for Vitest, Jest, or Playwright (existing `node:test` suites are run via the NodeTest adapter).
- `vp.run`: Execute tests with compact structured result summaries.
- `vp.diagnose`: Evidence-based failure classification (`APPLICATION_BUG`, `TEST_BUG`, `FLAKY_TEST`, etc.).
- `vp.heal`: Safe self-healing for test locators using accessibility and visual-aria hierarchies.
- `vp.suggestFix`: Source code fix recommendations for application bugs.
- `vp.refine`: Modify test assertions in place via natural language commands.
- `vp.releaseCheck`: Calculate release readiness verdict (`READY`, `READY_WITH_WARNINGS`, `NOT_READY`).
- `vp.verify`: Autonomous change-aware orchestrator returning structured `OperationResult` evidence.
- `vp.history`: Local run-history trends (pass rate, duration, flaky aggregates).
- `vp.ensureDev`: Smart DevServer auto-launcher when the app is offline.

👉 **[Agent playbook](docs/AGENTS.md)** · **[Complete MCP reference (75 tools)](docs/reference/mcp.md)**

---

## 🔒 Safety & Privacy Guarantee

- **Workspace Guard**: Prevents path traversal and confines all file access inside the project root.
- **Safe Process Execution**: Executes commands with explicit argument arrays without arbitrary shell string evaluation.
- **Secret Redaction**: Redacts API keys, bearer tokens, passwords, and database connection strings from logs and MCP output.
- **Protected Developer Tests**: Existing developer-written tests are never overwritten without explicit policy configuration.

---

## 📄 License

MIT License © 2026 NadiaSalah
