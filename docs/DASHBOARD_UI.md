# 🖥️ QAForge Live Dashboard UI Guide

QAForge includes a **zero-cloud, local-first interactive Web Command Center & Dashboard UI**. It lets developers, QA engineers, and managers visualize test plans, trigger live audits, inspect failure root-cause evidence, run Postman-like API requests, view accessibility trees, and monitor architecture topologies—all from a fast, dark-mode browser interface.

---

## 🚀 Launching the Dashboard

You can start the QAForge Live Dashboard using either `npx` or the local CLI:

```bash
# Start Dashboard on default port (http://localhost:3333)
npx qaforge ui

# Start on custom port and automatically open in default browser
npx qaforge ui -p 4000 -o
```

### CLI Flags for `qaforge ui`:
| Flag | Description | Default |
| :--- | :--- | :--- |
| `-p, --port <port>` | Port number to host the local server | `3333` |
| `-o, --open` | Automatically open the dashboard in your default browser | `false` |

---

## 🎨 Architecture & Privacy Philosophy

* **Local-First Execution**: The dashboard server runs directly within your local Node.js process using native local HTTP endpoints with on-demand interactive execution.
* **No Telemetry / Cloud Lock-in**: Zero third-party analytics or external API tracking. Core analysis executes locally, with network requests occurring only when explicitly invoking external features (e.g. live remote probes, webhooks, or external URLs).
* **Synchronized with MCP & CLI**: Every action triggered in the UI shares the exact same underlying `QAForgeEngine` instances as the CLI and Model Context Protocol (MCP) server.

---

## 📑 Dashboard Tabs & Feature Modules

### 1. 📊 Project Overview & Doctor Diagnostics
* **System Health Badge**: Real-time project health status (`HEALTHY`, `WARNINGS`, `CRITICAL`).
* **Stack Discovery Card**: Visual breakdown of detected frameworks (Next.js, React, Vite, Express, NestJS), package managers, test runners, and active routes.
* **Environment Doctor**: Run diagnostic probes (`qa.doctor`) directly from the UI with single-click remediation hints.
* **Summary Metrics**: Quick counters for routes, API endpoints, source files, and PRD requirements.

### 2. 📝 Risk-Prioritized Test Planner
* **Interactive Plan Generator**: Generate prioritized test plans filtered by scope (`all`, `critical`, `e2e`, `api`, `unit`, `changed`).
* **Risk Heatmap**: Visual badges displaying risk scores, complexity levels, and authentication requirements for each test case.
* **One-Click Test Materialization**: Click **"Generate Tests"** to write executable test files directly to disk without overwriting developer tests.

### 3. 🧪 Live Test Runner & Impacted Tests
* **Targeted Execution**: Run full suites, critical-only tests, or change-impacted tests via Git diff analysis.
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
* **Single-File Report Export**: Export standalone, executive-ready HTML/JSON QA and security reports with zero external dependencies.

### 10. ℹ️ System, MCP Integrations & About
* **MCP Integration Guide**: Copy-pasteable configuration snippets for Cursor, Claude Code, Windsurf, and Cline.
* **Engine Specs**: Detailed feature index, active version (`v1.0.0`), and repository links.

---

## ⚡ REST API & Dashboard RPC Endpoints

The dashboard server exposes local REST/JSON endpoints that can be integrated into custom developer tools:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the standalone responsive HTML/CSS/JS Dashboard single-page application |
| `GET` | `/api/inspect` | Returns discovered project profile, tech stack, routes, and PRD requirements |
| `GET` | `/api/doctor` | Executes environment and test framework diagnostics |
| `POST` | `/api/action` | Executes parameterized QA actions (`plan`, `generate`, `run`, `heal`, `release`, etc.) |
| `GET` | `/logo.svg` | Serves official QAForge SVG brand asset |

---

## 💡 Quick Tips for Daily Use

1. **Keep Dashboard Running**: Run `npx qaforge ui` in a background terminal tab while coding.
2. **Instant Feedback**: After saving files, switch to the dashboard and run **"Analyze Git Changes"** to test only what you touched.
3. **AI Agent Companion**: While your AI Agent (Cursor / Claude Code) works over MCP, you can watch the test results, graphs, and plans update in real time in the UI!
