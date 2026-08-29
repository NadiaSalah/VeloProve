<p align="center">
  <img src="https://raw.githubusercontent.com/NadiaSalah/QAForge/main/docs/assets/qaforge-logo.svg" alt="QAForge Logo" width="380" />
</p>

<h1 align="center">QAForge</h1>

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

QAForge is a local, agentic QA and automated testing toolkit that helps AI coding agents and developers generate tests, run them, analyze failures, detect regressions, and improve software quality directly inside the project.

---

## 📚 Complete Documentation

- 🚀 **[Getting Started Guide](docs/GETTING_STARTED.md)**: Installation, 5-minute tutorial, and setup.
- ⚡ **[CLI Reference](docs/CLI_REFERENCE.md)**: Full command-line reference, options, and flags.
- 🤖 **[MCP Reference](docs/MCP_REFERENCE.md)**: Model Context Protocol tools, input schemas, and resources.
- 🔍 **[Feature Deep Dive](docs/FEATURES_GUIDE.md)**: Detailed breakdown of all QAForge capabilities.
- 💡 **[Examples & Recipes](docs/EXAMPLES_AND_RECIPES.md)**: Real-world recipes for Next.js, Express, Vitest, and Playwright.
- 🔌 **[AI Agent Integration Guide](docs/AI_INTEGRATIONS.md)**: Connecting Cursor, Windsurf, Cline, and Claude Code.

---

## What is QAForge?

**QAForge** is a local-first agentic QA and automated testing toolkit designed for developers and AI coding agents (**Cursor, Windsurf, Claude Code, Codex, Cline, VS Code Agent**). It integrates directly into your workspace to generate and run tests, analyze failure root causes, heal brittle locators, detect regressions, and produce actionable quality reports while keeping developers in full control of their testing workflows.

Unlike proprietary cloud platforms that require uploading your private code and secrets to remote servers, QAForge operates 100% locally on your machine without forced telemetry or cloud lock-in.

---

## Why QAForge?

- **Local-First & Private**: Core execution runs entirely on your local machine. Source code, secrets, and test results never leave your workspace.
- **Agent-Native (MCP)**: Exposes 64 structured Model Context Protocol (MCP) tools for coding agents to inspect, plan, write, run, diagnose, and heal tests autonomously.
- **Deep Code & Framework Awareness**: Analyzes AST structures across Next.js, React, Vite, Express, Fastify, Vue, and Svelte to discover routes, API contracts, and requirements.
- **Evidence-Based Diagnostics**: Classifies test failures with confidence scoring (`APPLICATION_BUG`, `TEST_BUG`, `FLAKY_TEST`, `NETWORK_FAILURE`) and provides recommended source code fixes.
- **Smart Change Impact**: Analyzes `git diff` to identify and run only the tests affected by your recent code edits.
- **Comprehensive Testing Spectrum**: Unifies Unit, Component, API (Dynamic Variables + Auto-Auth + Auto-Cleanup), E2E (Playwright), Security (OWASP Top 10 + CVEs), and Accessibility (WCAG 2.1).
- **Developer-Controlled**: Seamlessly runs via standard CLI, interactive terminal dashboard (TUI), local live web dashboard, or CI/CD quality gates.

---

## ✨ Key Features

- 🤖 **AI-Assisted Test Generation**: Materializes Vitest, Jest, and Playwright tests from discovered PRD requirements, routes, and OpenAPI contracts.
- ⚡ **Automated Test Execution & Watch Mode**: Runs test suites with compact structured summaries and real-time watch feedback.
- 🔬 **Failure Root-Cause Analysis**: Evidence-based diagnostics separating application bugs from test bugs with actionable recommendations.
- 🩺 **Safe Test Self-Healing**: Automatically repairs stale locators using Visual-Aria and accessibility hierarchies without breaking tests.
- 🔍 **Autonomous Git Bisect**: Traverses commit history (`qaforge bisect`) to pinpoint bug-introducing commits automatically.
- 📬 **API Testing & Postman Runner**: Executes Postman v2.1 collections, interpolates chained variables, and tests OpenAPI boundary probes.
- 🛡️ **Security & Secret Scanning**: Audits dependencies for CVEs, scans for leaked credentials, and runs OWASP Top 10 checks.
- 🎙️ **Accessibility & Screen Reader Simulation**: Audits WCAG 2.1 A/AA/AAA guidelines and simulates NVDA/VoiceOver speech order.
- 🎬 **Visual Failure Replay & Executive Reports**: Generates standalone animated SVG/HTML replay packages and single-file executive QA reports.
- 🌐 **64 Model Context Protocol (MCP) Tools**: Native stdio MCP server for full AI coding agent interoperability.

---

## ⚡ Quick Start

### Installation & Initialization

End users and coding agents can run QAForge instantly without cloning the repository:

```bash
# Initialize QAForge inside any existing project (scaffolds .qaforge/, scripts, and config)
npx qaforge init

# Run environment & installation health diagnostics
npx qaforge doctor
```

Alternatively, install as a project devDependency:

```bash
npm install -D qaforge
# or pnpm add -D qaforge / yarn add -D qaforge / bun add -D qaforge
```

### Basic QA Workflow

```bash
# 1. Initialize QAForge in your project
npx qaforge init

# 2. Inspect project stack, routes, and discovered PRD requirements
npx qaforge inspect

# 3. Generate prioritized test plan
npx qaforge plan --scope critical

# 4. Materialize test files (protected against overwriting existing tests)
npx qaforge generate

# 5. Execute tests & verify release readiness
npx qaforge test
npx qaforge release
```

---

## 🛠️ CLI Quick Reference

```bash
# Core Discovery & Planning
npx qaforge init                # Initialize project config, scripts, and local state
npx qaforge doctor              # Run environmental, runtime, and project diagnostics
npx qaforge inspect             # Deep project scanning (frameworks, routes, APIs, PRD)
npx qaforge agent-handshake     # Teach any unconfigured AI agent how to interact
npx qaforge explore             # Live route exploration and interactive element map
npx qaforge plan                # Generate risk-scored test plan from PRD & routes
npx qaforge generate            # Generate missing tests without overwriting existing

# Test Execution & Verification
npx qaforge test                # Run test suites (Vitest, Jest, Playwright)
npx qaforge changed             # Analyze Git diff and run affected tests only
npx qaforge run-collection col.json -e env.json # Run Postman Collection v2.1 locally
npx qaforge export-postman      # Export discovered APIs to Postman Collection v2.1
npx qaforge request GET <url>   # Send ad-hoc HTTP request and inspect response
npx qaforge watch               # Real-time interactive watch mode
npx qaforge diagnose            # Classify failures (APPLICATION_BUG vs TEST_BUG)
npx qaforge heal                # Safely repair broken/stale locators in generated tests
npx qaforge refine "instruction"# Refine test assertions with natural language

# Live Remote Testing & Companion Bridge
npx qaforge remote-init         # Generate drop-in companion probe file (qaforge-probe.js / Next.js route)
npx qaforge remote-connect <url># Connect and verify handshake link with live website
npx qaforge remote-audit <url>  # Full live remote QA, OWASP security, and link crawl audit

# Advanced Quality & Security Engines
npx qaforge load-test <url>     # Run local load & stress benchmark (VUs, RPS, p95 latency)
npx qaforge mock-data           # Generate realistic mock data (users, orders, addresses, Arabic)
npx qaforge owasp-scan <url>    # Deep OWASP Top 10 security & headers audit
npx qaforge graphql <url> <q>   # Execute & validate GraphQL query/mutation
npx qaforge ws-test <url>       # Test WebSocket connection & handshake
npx qaforge learn-framework     # Teach QAForge uncommon or in-house frameworks
npx qaforge lint --fix          # Run ESLint & auto-fix code style issues
npx qaforge audit               # Scan for CVE vulnerabilities and hardcoded secrets
npx qaforge perf                # Audit Core Web Vitals and route performance metrics
npx qaforge mock-gen            # Generate Mock Service Worker (MSW) handlers
npx qaforge quarantine          # Isolate and quarantine flaky tests
npx qaforge coverage            # Generate PRD requirements coverage heatmap
npx qaforge tui                 # Open interactive Terminal Command Center
npx qaforge a11y                # Automated WCAG 2.1 accessibility audit
npx qaforge visual-diff         # Compare UI screenshots with baseline for visual regression
npx qaforge contract-drift      # Detect API drift between OpenAPI specs and routes
npx qaforge fuzz-api            # Run security, boundary, and auth-bypass probes
npx qaforge mutation-score      # Evaluate test quality and assertion sensitivity
npx qaforge sandbox             # Launch ephemeral mock DB and HTTP sandbox server
npx qaforge record-scenario "Cart Flow" --url http://localhost:3000/cart # Synthesize E2E scenario
npx qaforge stabilize ./tests/flaky.spec.ts --fix # Refactor test flakiness (auto-wait & web-first)
npx qaforge db-snapshot "before-tests" app.db.json # Isolate & backup database state
npx qaforge db-restore snap_12345                 # Rollback database state
npx qaforge auto-fix --apply                      # Synthesize & apply Git patches for application bugs
npx qaforge export-report -f html                 # Export standalone executive audit report
npx qaforge chaos http://localhost:3000/api       # Run autonomous chaos & edge-case monkey test
npx qaforge docker-env -s postgres redis          # Generate containerized test env (docker-compose.test.yml)
npx qaforge browser-matrix                        # Generate Playwright multi-browser & mobile matrix
npx qaforge bdd -o features                       # Generate BDD Gherkin .feature specs from requirements
npx qaforge alert <webhookUrl>                    # Dispatch test run verdict alert to Slack/Discord
npx qaforge feature-parity                        # Audit UI-to-Backend parity & detect ghost features
npx qaforge scan-malware --fix                    # Scan for backdoors/malware & auto-neutralize threats
npx qaforge ai-eval <url>                         # Evaluate LLM & AI responses for hallucinations
npx qaforge bisect                                # Autonomous Git bisect regression hunter
npx qaforge throttle <url> -p REGULAR_3G          # Simulate mobile network latency & packet loss
npx qaforge audit-contracts                       # Audit Web3 & Solidity smart contracts
npx qaforge dead-assets --purge                   # Detect and purge unreferenced images & dead assets
npx qaforge screen-reader                         # Simulate screen reader reading order & auditory accessibility
npx qaforge db-audit                              # Audit SQL N+1 queries in loops & unindexed queries
npx qaforge env-drift --generate-example          # Audit .env configuration & secret drift across environments
npx qaforge replay                                # Generate interactive SVG/HTML visual failure replay
npx qaforge rate-limit <url> -n 30 -c 10          # Audit API rate-limiting enforcement & DoS resilience
npx qaforge mock-server --port 4040               # Run local stateful in-memory CRUD REST mock server
npx qaforge arch-graph                            # Generate microservices & architecture dependency graph
npx qaforge ui                  # Launch local live HTML dashboard

npx qaforge setup-ci            # Generate GitHub Actions CI quality gate
npx qaforge release             # Calculate Release Confidence Score (0-100)
npx qaforge mcp                 # Start QAForge MCP Server over stdio
```

---

## 🤖 MCP Server Setup for AI Coding Agents

Add to `.cursor/mcp.json`, `~/.codeium/windsurf/mcp_config.json`, or `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "qaforge": {
      "command": "npx",
      "args": ["qaforge", "mcp"]
    }
  }
}
```

### Core MCP Tools

QAForge exposes 64 structured tools over stdio. The core tools for autonomous coding agent loops include:

- `qa.inspect`: Deep project scanning (frameworks, routes, APIs, PRD requirements).
- `qa.doctor`: Run environment, runtime, and project diagnostics.
- `qa.bootstrap`: Protocol handshake to self-teach any AI agent how to operate QAForge.
- `qa.changed`: Change impact analysis mapping `git diff` to affected tests.
- `qa.plan`: Risk-scored test planning from specs & routes.
- `qa.generate`: Generate compiling test files for Vitest, Jest, or Playwright.
- `qa.run`: Execute tests with compact structured result summaries.
- `qa.diagnose`: Evidence-based failure classification (`APPLICATION_BUG`, `TEST_BUG`, `FLAKY_TEST`, etc.).
- `qa.heal`: Safe self-healing for test locators using accessibility and visual-aria hierarchies.
- `qa.suggestFix`: Source code fix recommendations for application bugs.
- `qa.refine`: Modify test assertions in place via natural language commands.
- `qa.releaseCheck`: Calculate release readiness verdict (`READY`, `READY_WITH_WARNINGS`, `NOT_READY`).

👉 **[View the Complete MCP Reference & Schemas for all 64 tools](docs/MCP_REFERENCE.md)**

---

## 🔒 Safety & Privacy Guarantee

- **Workspace Guard**: Prevents path traversal and confines all file access inside the project root.
- **Safe Process Execution**: Executes commands with explicit argument arrays without arbitrary shell string evaluation.
- **Secret Redaction**: Redacts API keys, bearer tokens, passwords, and database connection strings from logs and MCP output.
- **Protected Developer Tests**: Existing developer-written tests are never overwritten without explicit policy configuration.

---

## 📄 License

MIT License © 2026 NadiaSalah
