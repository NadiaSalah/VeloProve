# Getting Started with QAForge

**Build. Test. Trust.**

**QAForge** is a local-first agentic QA and automated testing toolkit designed for developers and AI coding agents. It integrates directly with a project to generate and run tests, analyze failures, detect regressions, and produce actionable quality reports while keeping developers in control of their testing workflow. Core execution is local-first—network access occurs only when explicitly targeting remote endpoints, registries, webhooks, or external services requested by the user.

---

## ⚡ Quick Installation

You can run QAForge directly via `npx` or install it globally / locally in your project.

### Method 1: Using npx (Zero Install)
```bash
npx @engnadia/qaforge inspect
```

### Method 2: Local Project Dependency
```bash
npm install --save-dev @engnadia/qaforge
# or
pnpm add -D @engnadia/qaforge
# or
yarn add -D @engnadia/qaforge
```

### Method 3: Global CLI Tool
```bash
npm install -g @engnadia/qaforge
```

---

## 🚀 5-Minute Quickstart

### Step 1: Initialize QAForge in your Project
Navigate to your project root and run:
```bash
npx qaforge init
```
This automatically:
- Scans your framework (Next.js, React, Vite, Vue, Svelte, Express, Fastify).
- Detects test runners (Vitest, Jest, Playwright).
- Generates user-editable `qaforge.config.json` with sensible defaults.
- Creates `.qaforge/` local state storage (`config/`, `reports/`, `state/`).
- Adds convenience scripts to your `package.json` (`qa:doctor`, `qa:test`, `qa:changed`, `qa:release`).

### Step 2: Run Environment & Installation Diagnostics
```bash
npx qaforge doctor
```
Verifies Node.js version (>=18.0.0), package manager, test runner availability, configuration integrity, and filesystem permissions.

### Step 3: Inspect Discovered Requirements & Routes
```bash
npx qaforge inspect
```
QAForge parses your project's `PRD.md`, `openapi.json`, route directories, and API endpoints, building an internal use-case and requirement graph.

### Step 4: Generate a Risk-Scored Test Plan
```bash
npx qaforge plan --scope uncovered
```

### Step 5: Materialize Test Files
```bash
npx qaforge generate
```
Test files are generated directly in your test directories without overwriting any developer-written tests.

### Step 6: Execute Tests and Check Release Readiness
```bash
npx qaforge test
npx qaforge release
```

### Step 7: Launch Live Web Dashboard UI
```bash
npx qaforge ui -o
```
Explore test plans, real-time runner logs, failure self-healing, Postman-like API tester, and architecture graphs in your browser. (See [Dashboard UI Guide](DASHBOARD_UI.md)).

---

## 🤖 Connecting to AI Editors (Cursor, Windsurf, Claude Code, Cline)

Add the QAForge MCP server to your editor settings:

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

Now your AI assistant can run `qa.inspect`, `qa.plan`, `qa.run`, `qa.diagnose`, `qa.heal`, `qa.refine`, `qa.accessibility`, and `qa.releaseCheck` autonomously!
