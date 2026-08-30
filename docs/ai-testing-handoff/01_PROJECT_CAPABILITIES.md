# 01_PROJECT_CAPABILITIES.md — QAForge Master Capabilities Blueprint

## 1. Executive Technical Summary
**QAForge** (`@engnadia/qaforge`) is a local-first, agent-native autonomous QA engine and automated testing orchestration platform. It is engineered for autonomous AI coding agents (Cursor, Windsurf, Claude Code, OpenAI Codex, Cline, GitHub Copilot) and human engineering teams to discover application surfaces, parse functional requirements, generate risk-prioritized test plans, synthesize and execute test files (Vitest, Jest, Playwright, Native API), classify test failures using evidence-based heuristics, auto-heal stale visual locators, perform deep non-destructive security testing, profile performance, and evaluate release readiness with zero cloud dependency.

---

## 2. High-Level System Architecture & Major Subsystems

| System Domain | Core Subsystem | Implementation Root | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **Intelligence & Discovery** | Project Scanner & Stack Detector | `src/intelligence/project-scanner/` | Multi-framework AST scanning, route extraction, monorepo detection (`apps/`, `packages/`, `services/`, `libs/`). |
| **Requirements Discovery** | Spec & Contract Ingestion | `src/intelligence/requirement-discovery/` | Markdown PRD ingestion, OpenAPI/Swagger 3.0 contract parsing, route-to-requirement mapping. |
| **Feature Topology** | Feature Map Builder | `src/intelligence/feature-map/` | Builds functional requirements graph, correlates routes, API endpoints, and test coverage. |
| **Change Impact** | Git Diff Impact Engine | `src/intelligence/change-impact/` | Git diff parsing, dependency import graph traversal, impacted test isolation. |
| **Test Planning & Risk** | Risk Scoring & Planner | `src/domain/risk/`, `src/application/plan-tests.ts` | Multi-variable risk calculation (complexity, volatility, auth requirements), test budget filtering. |
| **Test Generation & Healing** | AST Synthesizer & Healer | `src/domain/tests/`, `src/application/heal-test.ts` | Compiles compiling Vitest/Jest/Playwright suites, Visual-Aria hierarchy auto-healing. |
| **Security Suite** | Security Engine & DAST | `src/application/security-engine.ts`, `src/intelligence/security-scanner/` | Surface discovery, Auth, AuthZ/IDOR, SQLi/XSS/Command/Path Traversal injection, SARIF export. |
| **API & Performance** | Postman Runner & Load Engine | `src/adapters/api/`, `src/application/load-tester.ts` | Postman v2.1 runner, dynamic variable chaining, high-VU asynchronous load benchmarks. |
| **Ecosystem & Interop** | MCP Server & CLI Command Center | `src/mcp/server.ts`, `src/cli/index.ts`, `src/application/dashboard-server.ts` | 71 stdio MCP tools, 71 CLI commands, live web dashboard. |

---

## 3. Public Interfaces & Integration Channels

### A. Model Context Protocol (MCP) — 71 Tools
Exposed over `stdio` via `@modelcontextprotocol/sdk` in `src/mcp/server.ts`. Enables full bidirectional agentic interaction:
- `qa.inspect`, `qa.plan`, `qa.generate`, `qa.run`, `qa.diagnose`, `qa.heal`, `qa.suggestFix`, `qa.refine`
- `qa.changed`, `qa.releaseCheck`, `qa.auditSec`, `qa.perf`, `qa.mockNetwork`, `qa.quarantine`, `qa.coverage`
- `qa.accessibility`, `qa.contractDrift`, `qa.fuzzApi`, `qa.runCollection`, `qa.exportCollection`, `qa.visualDiff`
- `qa.remoteInit`, `qa.remoteConnect`, `qa.remoteAudit`, `qa.recordScenario`, `qa.stabilizeFlaky`, `qa.dbSnapshot`
- `qa.dbRestore`, `qa.autoBugFix`, `qa.exportReport`, `qa.chaosTest`, `qa.dockerEnv`, `qa.browserMatrix`
- `qa.bddFeatures`, `qa.sendAlert`, `qa.featureParity`, `qa.scanMalware`, `qa.remediateMalware`, `qa.aiEvaluate`
- `qa.gitBisect`, `qa.networkThrottle`, `qa.smartContractAudit`, `qa.deadAssetPurge`, `qa.screenReaderSim`
- `qa.dbQueryAudit`, `qa.envDriftAudit`, `qa.recordFailureReplay`, `qa.rateLimitAudit`, `qa.statefulMock`
- `qa.architectureGraph`, `qa.securityScan`, `qa.securityPlan`, `qa.securityRun`, `qa.securityReport`
- `qa.exportSarif`, `qa.auditSriCsrf`, `qa.dedupTests`, `qa.doctor`, etc.

### B. Command-Line Interface (CLI) — 71 Commands
Built with `commander` in `src/cli/index.ts` with ANSI banner, spinners, and structured output formatting:
- `init`, `doctor`, `inspect`, `agent-handshake`, `explore`, `fuzz-api`, `plan`, `generate`, `test`, `run-collection`
- `export-postman`, `request`, `changed`, `diagnose`, `heal`, `refine`, `release`, `ui`, `tui`, `setup-ci`
- `mutation-score`, `learn-framework`, `lint`, `audit`, `perf`, `mock-gen`, `quarantine`, `coverage`, `a11y`
- `visual-diff`, `contract-drift`, `load-test`, `mock-data`, `owasp-scan`, `graphql`, `ws-test`, `remote-init`
- `remote-connect`, `remote-audit`, `record-scenario`, `stabilize`, `db-snapshot`, `db-restore`, `auto-fix`
- `export-report`, `chaos`, `dockerEnv`, `browserMatrix`, `bdd`, `alert`, `feature-parity`, `scan-malware`
- `ai-eval`, `bisect`, `throttle`, `audit-contracts`, `dead-assets`, `screen-reader`, `db-audit`, `env-drift`
- `replay`, `rate-limit`, `mock-server`, `arch-graph`, `security`, `hook`, `web-sec`, `dedup`, `sandbox`, `watch`, `mcp`

### C. Live Web Dashboard Server
Embedded zero-cloud HTTP server in `src/application/dashboard-server.ts` providing visual metrics, Postman playground, topology graph renderer, and live trigger endpoints.

---

## 4. Supported Technologies & Framework Matrix

```text
Frontend Frameworks:
├── Next.js (App Router + Pages Router)
├── React (Vite / CRA / Vanilla)
├── Vue (Nuxt / Vite / Vue CLI)
├── Svelte (SvelteKit / Vite)
└── Angular / Vanilla HTML5

Backend & API Frameworks:
├── Express.js
├── Fastify
├── NestJS (Guards, Decorators, Controllers)
├── Django / Flask / FastAPI (Python spec discovery)
└── Custom in-house frameworks (via qaforge.framework.json & qa.learnFramework)

Test Runners & Adapters:
├── Vitest (Unit / Component / Integration / In-Source)
├── Playwright (E2E / Cross-Browser / Mobile Viewports)
├── Jest (Unit / Integration)
└── Native Dynamic HTTP Runner (Zero-Dependency API Testing)

Database & ORM Detection:
├── SQL: PostgreSQL (pg), MySQL (mysql2), SQLite (better-sqlite3), Prisma, Sequelize, TypeORM, Knex, Drizzle
└── NoSQL: MongoDB (mongoose), Redis (ioredis), CouchDB
```

---

## 5. Top Architectural & Operational Risks

1. **Child Process & Shell Execution (`src/execution/process-runner.ts`)**:
   - *Risk*: Execution of dynamic package test commands on Windows/POSIX.
   - *Guard*: `WorkspaceGuard` confines execution and paths inside project root; input flags are parameterized.
2. **Dynamic Live Webhook/HTTP Invocations (`src/application/remote-bridge.ts`, `security-engine.ts`)**:
   - *Risk*: Targeting untrusted remote endpoints or staging databases without user authorization.
   - *Guard*: Safe Security Mode (`safeMode: true`) enforced by default; production execution rejected unless `allowProduction: true`.
3. **Automated Source Modification (`src/application/bugfix-synthesizer.ts`, `heal-test.ts`)**:
   - *Risk*: Overwriting developer-written code or tests.
   - *Guard*: Default policy is `generated-only` and `allowSourceWrites: false` in `qaforge.config.json`.
