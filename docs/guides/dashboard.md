# 🖥️ VeloProve Live Dashboard UI Guide

VeloProve includes a **zero-cloud, local-first interactive Web Command Center & Dashboard UI**. It lets developers, QA engineers, and managers visualize test plans, trigger live audits, inspect failure root-cause evidence, run Postman-like API requests, view accessibility trees, and monitor architecture topologies—all from a fast, dark-mode browser interface.

---

## 🚀 Launching the Dashboard

You can start the VeloProve Live Dashboard using either `npx` or the local CLI:

```bash
# Start Dashboard on default port (http://localhost:4173)
npx veloprove ui

# Start on custom port and automatically open in default browser
npx veloprove ui -p 4000 -o
```

### CLI Flags for `veloprove ui`:
| Flag | Description | Default |
| :--- | :--- | :--- |
| `-p, --port <port>` | Port number to host the local server | `4173` |
| `-o, --open` | Automatically open the dashboard in your default browser | `false` |

**Sensitive / agentic actions:** if an AI coding agent is linked (or MCP is calling), the action runs. If not, the UI shows a warning with **Run without AI**, **Teach AI**, or Cancel. CLI: same gate; use `--allow-no-ai` (+ `-y` in CI) for local-only overrides. Read-only tools (`inspect`, `doctor`, `test`, `ui`, …) still work without AI.

---

## 🎨 Architecture & Privacy Philosophy

* **Local-First Execution**: The dashboard server runs directly within your local Node.js process using native local HTTP endpoints with on-demand interactive execution.
* **No Telemetry / Cloud Lock-in**: Zero third-party analytics or external API tracking. Core analysis executes locally, with network requests occurring only when explicitly invoking external features (e.g. live remote probes, webhooks, or external URLs).
* **Synchronized with MCP & CLI**: Every action triggered in the UI shares the exact same underlying `VeloProveEngine` instances as the CLI and Model Context Protocol (MCP) server.

---

## 🧭 Layout (Cursor-style Command Center)

The dashboard uses a developer-focused dark IDE layout:

1. **Left sidebar** — workflow groups (**Start**, **Verify**, **Repair**, **Results**, **API**, **Security**, **Experience**, **More**). Only Start + Verify open by default; search expands matching groups. Pin bar: **Docs Chat** only (Export lives under Results).
   - **Desktop**: expanded labels by default; collapse to an icon rail (`Ctrl+[` or menu button).
   - **Tablet (~≤900px)**: icon rail with floating tooltips.
   - **Phone (~≤720px)**: slide-over drawer with backdrop; closes after selecting a tool.
2. **Detail pane** — service description, forms, tables, and primary actions for the selected tool.

Typography and CSS are **fully offline** (system font stacks only — no Google Fonts / CDN).
3. **Results pane** — JSON/output viewer plus a live console for execution feedback.

No top button strips. Selecting a sidebar item updates the detail pane; running an action streams output into the results pane without forcing a full-page reload for interactive tools.

Spacing uses a consistent vertical rhythm (`20px` section gaps, `18–20px` card padding, unified `.row.actions` margins) so Overview metrics, stack cards, forms, and tables breathe evenly across every view.

### Header & chrome
The top bar is chrome only (sidebar/results toggles + project badges). **Ensure Dev**, **Teach AI**, and **Verify** live under sidebar **Start** / **Verify** and Overview **Quick Actions**. Pin strip: **Docs Chat** only.
- **Teach AI** runs the same handshake as `npx veloprove teach-ai --force --mcp` / MCP `vp.bootstrap` — writes `AGENTS.md` + `.veloprove/agent-manifest.json`, creates `.cursor/mcp.json` when missing, and returns a paste-ready briefing in the Results pane.

### Docs Chat
Sidebar **Docs Chat** answers questions from packaged documentation only (no cloud LLM). Same as `npx veloprove ask "…"` / MCP `vp.ask`. Use **Copy Answer** to paste into an external AI chat if needed.

---

## 📑 Dashboard Modules

### 1. 📊 Project Overview & Doctor Diagnostics
* **System Health Badge**: Real-time project health status (`HEALTHY`, `WARNINGS`, `CRITICAL`).
* **Stack Discovery Card**: Visual breakdown of detected frameworks (Next.js, React, Vite, Express, NestJS), package managers, test runners (Vitest / Jest / Playwright / `node:test`), and active routes.
* **Environment Doctor**: Run diagnostic probes (`vp.doctor`) directly from the UI with single-click remediation hints.
* **Summary Metrics**: Quick counters for routes, API endpoints, source files, and PRD requirements.

### 2. 📝 Risk-Prioritized Test Planner
* **Interactive Plan Generator**: Generate prioritized test plans filtered by scope (`all`, `critical`, `e2e`, `api`, `unit`, `changed`).
* **Risk Heatmap**: Visual badges displaying risk scores, complexity levels, and authentication requirements for each test case.
* **One-Click Test Materialization**: Click **"Generate Tests"** to write executable test files directly to disk without overwriting developer tests.

### 3. 🧪 Live Test Runner, Verify & History
* **Targeted Execution**: Run full suites, critical-only tests, or change-impacted tests via Git diff analysis.
* **Autonomous Verify**: One-click `verify` action (impact → test → diagnose → heal → release) with OperationResult evidence.
* **Run History Sparklines**: Pass-rate and duration trends from SSR + `GET /api/history` / `veloprove history`. Use **Refresh History** (`/api/actions/history`) on Test Runs to reload aggregates into the Results pane (branch, MTTR, regression alerts).
* **API Studio multi-step flows**: Ordered request steps with `{{var}}` substitution and Postman export.
* **OpenAPI mock one-click**: Discovered APIs → Generate MSW using OpenAPI examples when present.
* **Scenario Recorder**: Bookmarklet or Chrome extension (`extensions/recorder`).
* **Execution Log Viewer**: Inspect test stdout/stderr, assertion failures, and execution duration in a terminal-like viewer.
* **Failure Classification**: Automatic root-cause categorization (`APPLICATION_BUG`, `TEST_BUG`, `FLAKY_TEST`, `NETWORK_FAILURE`).

### 4. 🩺 Safe Test Self-Healing & Repair
* **Visual-Aria Locator Healing**: Inspect stale selectors and preview AI-suggested accessible replacements (`getByRole`, `getByLabel`).
* **Before / After Diff**: Review proposed locator transformations before applying them.
* **Protected Code Safeguards**: Only generated locators are healed—application business logic is strictly preserved.

### 5. 📬 Postman-like API & Security Studio
* **Interactive Request Builder**: Send `GET`, `POST`, `PUT`, `DELETE`, `PATCH` requests with custom headers, query params, and JSON bodies.
* **Collection Runner**: Load and execute Postman Collection v2.1 suites with automated environment variable chaining.
* **Collection Exporter**: Export discovered codebase routes to standard Postman JSON format with one click.
* **Boundary & Security Probing**: Run automated API fuzzing and parameter boundary probes.

### 6. 🛡️ OWASP Security, CVEs & Secret Auditing
* **Vulnerability Scanner**: Run local dependency CVE scans and identify hardcoded tokens or private keys.
* **OWASP Top 10 Audit**: Audit HTTP endpoints for Missing Content-Security-Policy (CSP), CORS misconfigurations, and unsafe headers.
* **Malware & Backdoor Scanner**: Deep AST scan for suspicious lifecycle scripts, obfuscated payloads, and network leaks.

### 7. 🎙️ Accessibility & WCAG 2.1 Audits
* **A11y Rule Verification**: Run automated WCAG 2.1 Level A, AA, and AAA checks on rendered components and routes.
* **Screen Reader Speech Simulator**: View simulated NVDA and VoiceOver auditory reading flows, heading structures, and missing aria tags.

### 8. 🗺️ Microservices & Architecture Topology Graph
* **Visual Graph Rendering**: View live interactive Mermaid.js diagrams mapping UI pages, backend controllers, databases, and third-party integrations.
* **Database & Query Auditor**: Inspect detected SQL queries in loops (N+1 problems), unindexed WHERE clauses, and raw string concatenations.

### 9. 🎬 Visual Failure Replay & Report Exporter
* **Interactive Failure Replay**: Replay simulated user interaction timelines leading up to a test assertion failure.
* **Single-File Report Export**: Preview then save HTML / JUnit / Allure / PDF. Type a full path, or use the default project folder `.veloprove/exports` (Reset to project folder). No OS file dialog.

### 10. 📘 Guide, About & MCP Integrations
* **Interactive Guide**: Searchable workflow snippets for verify, ensure-dev, history, security, MCP, and more.
* **About**: Package identity, 75 `vp.*` tools, dashboard port `4173`, safety guarantees.
* **MCP Integration Guide**: Copy-pasteable configuration snippets for Cursor, Claude Code, Windsurf, and Cline.

---

## ⚡ REST API & Dashboard RPC Endpoints

The dashboard server exposes local REST/JSON endpoints that can be integrated into custom developer tools:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the standalone responsive HTML/CSS/JS Dashboard single-page application |
| `GET` | `/api/profile` | Project profile / stack snapshot |
| `GET` | `/api/runs` | Stored test runs |
| `GET` | `/api/history` | Run-history trends (pass rate, duration, flaky aggregates) |
| `GET` | `/api/events` | Server-Sent Events stream for live action logs and progress in the Results pane |
| `POST` | `/api/actions/<name>` | Executes QA actions (`inspect`, `verify`, `ensure-dev`, `plan`, `run`, `heal`, `release`, …) |
| `POST` | `/api/recorder/generate` | Generate Playwright test from recorded scenario |
| `POST` | `/api/http-client` | Ad-hoc HTTP client (API Studio) |
| `GET` | `/logo.svg` | Official wordmark (`docs/assets/veloprove-logo.svg`) |
| `GET` | `/icon.svg` | Official mark (`docs/assets/veloprove-icon.svg`) for favicon and sidebar |

---

## 💡 Quick Tips for Daily Use

1. **Keep Dashboard Running**: Run `npx veloprove ui` in a background terminal tab while coding.
2. **Instant Feedback**: After saving files, switch to the dashboard and run **"Analyze Git Changes"** to test only what you touched.
3. **AI Agent Companion**: While your AI Agent (Cursor / Claude Code) works over MCP, you can watch the test results, graphs, and plans update in real time in the UI!
