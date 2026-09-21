# VeloProve Feature Guide & Deep Dive

VeloProve provides an end-to-end, local-first autonomous QA engine. This guide organizes capabilities by domain.

**Surface index:** CLI / MCP / Dashboard ids live in `src/shared/tool-catalog.ts` (`TOOL_SURFACE`). Prefer that catalog (and `docs/reference/cli.md` / `mcp.md`) as the checklist; this guide is a capability essay, not a second registry. A11y / screen-reader are **static heuristics** (not certified WCAG / live NVDA). `vp.suggestFix` is **PARTIAL** guidance; `heal` covers marked tests only; `auto-fix` is **REVIEW_REQUIRED**.

---

# Domain 1: Core Autonomous QA

## 1. Zero-Config Project Scanner (`vp.inspect` / `veloprove inspect`)
- **Frameworks Detected**: Next.js (App Router & Pages Router), React, Vite, Vue, Svelte, Express, Fastify.
- **Test Runners Detected**: Vitest, Jest, Playwright, and Node built-in `node --test` / `node:test`.
- **Route & API Mapping**: Automatically extracts route files (`app/**/page.tsx`, `pages/**/*.tsx`, `routes/*.ts`, `src/api/**/*.ts`).

## 2. Spec-Driven Requirement Discovery
- **PRD Markdown Parsing**: Extracts feature blocks, acceptance criteria, edge cases, and priorities.
- **OpenAPI / Swagger Specs**: Discovers schemas, auth mechanisms, and HTTP parameters.
- **Route & Component Use Cases**: Infers user actions from forms, buttons, and state hooks.

## 3. Risk-Based Test Planning & Test Generation (`vp.plan`, `vp.generate` / `veloprove plan`, `veloprove generate`)
- Calculates risk scores based on priority, complexity, auth requirements, and coverage gaps.
- Generates test files matching the active runner: Vitest / Jest / Playwright templates, or `node:test` + `node:assert/strict` when the plan uses Node’s built-in runner.
- **Live API grounding**: GET-probes local endpoints (batch) and writes status / content-type / JSON-shape asserts; fixtures under `tests/fixtures/veloprove`.
- **Explore → plan**: loads `.veloprove/cache/site-exploration.json` to seed E2E cases with `exploreRoute`.
- **Protected Code Policy**: Never overwrites developer-written tests unless explicitly requested with `--overwrite explicit`.

## 4. Git Change Impact Analysis (`vp.changed` / `veloprove changed`)
- Analyzes `git diff` to identify modified source files.
- Traverses the internal dependency graph to determine the exact impacted tests.
- Runs only relevant tests, reducing feedback loops from minutes to seconds.

## 5. Release Confidence Engine (`vp.releaseCheck` / `veloprove release`)
- Evaluates test pass rates, diagnostic severities, flaky test ratios, and requirement coverage.
- Outputs quantitative readiness scores (0-100) and gate verdicts (`READY`, `READY_WITH_WARNINGS`, `NOT_READY`).

## 6. Autonomous Verify Orchestrator (`vp.verify` / `veloprove verify`)
- CapabilityRegistry-driven pipeline: inspect → impact → targeted (or full) tests → diagnose → optional TEST_BUG heal → release assessment.
- Returns versioned `OperationResult` evidence with warnings and CI exit codes (`0`/`1`/`2`/`3`).
- Supports deterministic `--intent` planning (no LLM) and flags for security / a11y inclusion.
- Optional `--sandbox` / `--docker-env` for ephemeral local isolation; failures write `.veloprove/evidence/<runId>/` (schema v2 + `evidence.zip`).
- Empty suite guidance: `VP_EMPTY_SUITE` / first-verify path (doctor → teach-ai → plan → generate → verify).
- Recurring: `watch --verify` / `watch -i <sec>` / `hook install --verify` — see [scheduled-verify.md](scheduled-verify.md).
- Dashboard Verify presets: sandbox / docker-env / full suite.

## Run History Trends (`vp.history` / `veloprove history`)
- Aggregates local pass-rate, duration, and flaky counts from `.veloprove` state.
- Shared by CLI, MCP, and dashboard sparklines (`/api/history`).

## Smart DevServer Launcher (`vp.ensureDev` / `veloprove ensure-dev`)
- Probes `baseURL`, detects package scripts, and starts npm/pnpm/yarn/bun when offline.

---

# Domain 2: Testing, Diagnostics & Safe Healing

## Evidence-Based Diagnostics (`vp.diagnose` / `veloprove diagnose`)
- Classifies failures into root causes:
  - `APPLICATION_BUG`: Business logic error, server 500, or wrong response data.
  - `TEST_BUG`: Stale selector, changed markup, locator mismatch.
  - `FLAKY_TEST`: Intermittent timing failure or race condition.
  - `NETWORK_FAILURE`: Unreachable API endpoint or connection drop.

## 7. Guarded Test Self-Healing (`vp.heal` / `veloprove heal`)
- Upgrades fragile CSS selectors (`#submit-btn-2`) to accessible locators (`getByRole('button', { name: 'Submit' })`) in `@veloprove-generated` / `@veloprove-healable` tests only.
- Does NOT touch application business logic or unmarked developer tests.

## 8. Natural Language Test Refinement (`vp.refine` / `veloprove refine`)
- Allows developers and AI agents to update tests using plain English prompts.

## 9. Mutation Testing Quality Score (`vp.mutationScore` / `veloprove mutation-score`)
- Evaluates assertion sensitivity and catches dummy assertions (`expect(true).toBe(true)`).

## 10. AST Flakiness Stabilizer & Auto-Wait Fixer (`vp.stabilizeFlaky` / `veloprove stabilize`)
- AST analysis detects brittle timeouts (`waitForTimeout(5000)`, `setTimeout`) and auto-refactors them to auto-waiting assertions.

## 11. Flaky Test Auto-Quarantine (`vp.quarantine` / `veloprove quarantine`)
- Tracks historical flakiness variance and isolates unstable tests from failing CI builds.

## 12. Autonomous Bug-Fix & Git Patch Synthesizer (`vp.autoBugFix` / `veloprove auto-fix`)
- Proposes reviewable source patches for some `APPLICATION_BUG` failures under FixSafetyPolicy (**REVIEW_REQUIRED** — not guaranteed auto-apply).

## 13. Autonomous Git Bisect Regression Hunter (`vp.gitBisect` / `veloprove bisect`)
- Traverses Git history to find the exact commit that introduced a test failure.

## 14. Test Failure Visual Replay Package (`vp.recordFailureReplay` / `veloprove replay`)
- Generates interactive standalone SVG/HTML step-by-step visual timeline animation packages for failed tests.

---

# Domain 3: API & Contract Testing

## 15. Native Dynamic API Engine (`vp.sendRequest` / `veloprove request`)
- **Dynamic Variables**: Interpolates dynamic placeholders (`{{$uuid}}`, `{{$randomEmail}}`, `{{$timestamp}}`).
- **Auto-Auth Chains**: Automatically executes login and injects tokens into downstream requests.
- **Auto-Cleanup**: Registers created entity IDs and runs teardown `DELETE` steps automatically.

## 16. Postman Collection v2.1 Runner & Exporter (`vp.runCollection`, `vp.exportCollection` / `veloprove run-collection`, `veloprove export-postman`)
- Executes standard Postman collections with variable interpolation locally.
- Exports discovered code endpoints directly into Postman Collection v2.1 JSON.

## 17. OpenAPI Security Fuzzing (`vp.fuzzApi` / `veloprove fuzz-api`)
- Injects SQL injection probes, boundary buffers, and unauthorized access checks across discovered routes.

## 18. API & OpenAPI Contract Drift Detector (`vp.contractDrift` / `veloprove contract-drift`)
- Compares OpenAPI/spec routes to scanned code endpoints. Also covered by the **`veloprove drift`** aggregator (which adds parity/env/docs).
- Detects discrepancies between OpenAPI documentation specifications and active code routes.

## 19. GraphQL & WebSocket Real-Time Testing (`vp.graphqlTest`, `vp.wsTest` / `veloprove graphql`, `veloprove ws-test`)
- Executes and validates GraphQL queries/mutations against schemas and verifies WebSocket handshakes.

## 20. Stateful Dynamic In-Memory Mock Server (`vp.statefulMock` / `veloprove mock-server`)
- Spins up an in-memory RESTful CRUD server that dynamically persists state across calls for offline testing.

## 21. Mock Service Worker (MSW) Network Generator (`vp.mockNetwork` / `veloprove mock-gen`)
- Auto-generates Mock Service Worker (MSW) handlers from discovered API schemas.

---

# Domain 4: Web & E2E Testing

## 22. Interactive Live Exploration (`vp.explore` / `veloprove explore`)
- Crawls live web applications to build visual site maps and discover interactive forms and buttons.

## 23. E2E Scenario Recorder & Synthesizer (`vp.recordScenario` / `veloprove record-scenario`)
- Compiles interactive user journeys into resilient Playwright/Vitest E2E test files with Visual-Aria selectors.

## 24. Cross-Browser & Mobile Matrix Runner (`vp.browserMatrix` / `veloprove browser-matrix`)
- Synthesizes Playwright multi-browser matrices covering Chromium, Firefox, WebKit, Mobile Safari, and Pixel.

## 25. Visual Regression & Pixel Diff Engine (`vp.visualDiff` / `veloprove visual-diff`)
- Compares UI screenshot baselines with current screenshots to detect visual regression.

## 26. Accessibility Auditor (`vp.accessibility` / `veloprove a11y`)
- Static WCAG-oriented heuristics on component JSX/TSX and routes (missing alt tags, form labels, roles). Score labels are **not** a WCAG 2.1 A/AA/AAA conformance claim.

## 27. Screen Reader & Audio Flow Simulator (`vp.screenReaderSim` / `veloprove screen-reader`)
- Heuristic speech-order preview for headings/controls — **not** a live NVDA / VoiceOver session.

## 28. Live Remote Companion Bridge & Probe Agent (`vp.remoteInit`, `vp.remoteConnect`, `vp.remoteAudit` / `veloprove remote-init`, `veloprove remote-connect`, `veloprove remote-audit`)
- Connects local VeloProve to any live production/staging website via a lightweight drop-in companion probe file.

---

# Domain 5: Security & Vulnerability Auditing

## 29. Dependency CVE & Secret Scanner (`vp.auditSec` / `veloprove audit`)
- Scans `package.json` for known CVEs and detects exposed API keys or tokens in source code.

## 30. OWASP Top 10 Security & Headers Audit (`vp.owaspScan` / `veloprove owasp-scan`)
- Deep local penetration audit for CSP, X-Frame-Options, MIME sniffing, CORS, and stack trace leaks.

## 31. Malware, Backdoor & Obfuscation Scanner with Auto-Remediation (`vp.scanMalware`, `vp.remediateMalware` / `veloprove scan-malware --fix`)
- Detects dangerous obfuscated Base64 `eval()` backdoors, suspicious lifecycle scripts, and raw IP data exfiltration, with one-click automatic neutralization.

## 32. Web3 & Smart Contract Security Auditor (`vp.smartContractAudit` / `veloprove audit-contracts`)
- Audits Solidity `.sol` contracts for reentrancy, unprotected `selfdestruct`, and `tx.origin` phishing exploits.

---

# Domain 6: Performance & Reliability

## 33. Local Load & Stress Testing Engine (`vp.loadTest` / `veloprove load-test`)
- Benchmarks API throughput (RPS), p95 latency, and error rates under concurrent virtual users.

## 34. Core Web Vitals & Route Performance Profiler (`vp.perf` / `veloprove perf`)
- Measures route-level LCP, FID, CLS, TTFB, and JS bundle weight.

## 35. Autonomous Chaos & Edge-Case Monkey Engine (`vp.chaosTest` / `veloprove chaos`)
- Injects malformed JSON, prototype pollution, memory floods, and concurrent bursts to measure server crash resilience.

## 36. API Rate-Limiting & DoS Threshold Profiler (`vp.rateLimitAudit` / `veloprove rate-limit`)
- Burst-tests HTTP endpoints to verify 429 throttling enforcement and server degradation.

## 37. Network Throttling & Offline Simulator (`vp.networkThrottle` / `veloprove throttle`)
- Emulates mobile network conditions (3G, GPRS, packet loss, offline drops) to verify resilience.

## 38. Database Query & SQL N+1 Performance Auditor (`vp.dbQueryAudit` / `veloprove db-audit`)
- Detects database queries inside loops, unindexed queries, raw string concatenations, and unbounded fetches.

---

# Domain 7: Developer Intelligence, Data & Environment

## 39. AI & Schema Mock Data Factory (`vp.mockData` / `veloprove mock-data`)
- Generates realistic contextual test fixtures (users, orders, addresses, payments, and Arabic locales).

## 40. Universal UI-to-Backend Feature Parity & Ghost Feature Auditor (`vp.featureParity` / `veloprove feature-parity`)
- Scans interactive UI elements across React, Vue, Svelte, Tauri/Rust, Express, and Python/FastAPI, matching them with backend commands and detecting dummy no-ops.

## 41. Database Snapshot & State Isolation Engine (`vp.dbSnapshot`, `vp.dbRestore` / `veloprove db-snapshot`, `veloprove db-restore`)
- Freezes and restores database/fixture state for reproducible, isolated testing.

## 42. Docker & Ephemeral Container Orchestrator (`vp.dockerEnv` / `veloprove docker-env`)
- Generates containerized test environments (`docker-compose.test.yml`) for PostgreSQL, Redis, MongoDB, and MySQL.

## 43. Multi-Environment Config & Secret Drift Auditor (`vp.envDriftAudit` / `veloprove env-drift`)
- Compares `.env` against `.env.example`, detects undeclared code references (`process.env`), and flags leaked secrets.

## 44. Dead Code, CSS & Unused Asset Purge Engine (`vp.deadAssetPurge` / `veloprove dead-assets --purge`)
- Scans for unreferenced images, fonts, and dead CSS rules, with safe one-click disk space reclamation.

## 45. Microservices & Architecture Dependency Graph (`vp.architectureGraph` / `veloprove arch-graph`)
- Maps frontend UI, backend APIs, databases, caches, and third-party cloud SDKs into interactive topology graphs and Mermaid diagrams.

## 46. ESLint & Static Code Quality Engine (`vp.lint` / `veloprove lint --fix`)
- Enforces code quality rules, formats files, and auto-fixes lint violations.

## 47. BDD Gherkin Feature Spec Generator (`vp.bddFeatures` / `veloprove bdd`)
- Compiles PRD requirements into standard `.feature` specs and Cucumber/Playwright step skeletons.

---

# Domain 8: AI Agent Integration & LLM Testing

## 48. Teach AI / Universal Agent Handshake (`vp.bootstrap` / `veloprove teach-ai`)
- Self-teaching protocol for any AI editor or agent (Cursor, Windsurf, Claude Code, Cline, Codex, Copilot). Writes `AGENTS.md`, optional `.cursor/mcp.json`, and a paste-ready briefing. Alias: `agent-handshake`. Dashboard: sidebar **Start → Teach AI** (and Overview Quick Actions).

## 49. Docs Chat (`vp.ask` / `veloprove ask`)
- Answers questions from **packaged markdown docs only** (no cloud LLM). CLI: `veloprove ask "…"`, `--repl`. MCP: `vp.ask`. Dashboard pin: **Docs Chat**. Use Copy Answer to paste into an external agent chat.

## 50. Custom Framework Self-Teaching (`vp.learnFramework` / `veloprove learn-framework`)
- Ingests custom or in-house framework conventions from `AGENTS.md` and repository guidelines.

## 51. LLM & AI Output Hallucination & Accuracy Evaluator (`vp.aiEvaluate` / `veloprove ai-eval`)
- Evaluates AI model outputs against ground truth facts and validates JSON schema compliance.

---

# Domain 9: Reporting, CI & Collaboration

## 51. Standalone Executive Audit & QA Report Exporter (`vp.exportReport` / `veloprove export-report`)
- Exports comprehensive single-file HTML, JSON, or Markdown reports.
- CI formats: **JUnit XML**, dependency-free **PDF**, and **Allure 2** results (`-f allure` → `allure-results/*-result.json`).

## 52. Webhook Alerts & Notification Dispatcher (`vp.sendAlert` / `veloprove alert`)
- Dispatches test run verdicts and quality alerts to Slack, Discord, MS Teams, or webhooks.
- Enriches payloads with git **branch**, **MTTR hours**, and **regression velocity** alerts from local run history.

## 53. PRD Requirements Coverage Heatmap (`vp.coverage` / `veloprove coverage`)
- Generates functional requirement coverage matrices correlated with test pass rates.

## 54. CI Quality Gate Generator (`veloprove setup-ci`)
- Generates GitHub Actions autonomous quality gate workflows.

## 55. Local HTML Dashboard & Command Center (`veloprove ui`, `veloprove tui`)
- Interactive web dashboard and Terminal Command Center for triggering actions and visualizing metrics.
- API Studio supports **multi-step flows** with `{{var}}` chaining; Discovered APIs can one-click **MSW mocks from OpenAPI examples**.
- Scenario Recorder: bookmarklet or load-unpacked Chrome extension under `extensions/recorder`.

---

# Domain 10: Autonomous Security Testing & Vulnerability Auditor

## 56. Attack Surface Discovery (`vp.securityScan` / `veloprove security`)
- Automatically inspects project routes, controllers, middleware, guards, forms, and dependencies to map out security-sensitive surfaces:
  - Auth endpoints (`/login`, `/register`, `/logout`, `/password-reset`, `/oauth/*`, `/profile`)
  - Role-protected routes (`admin`, `authenticated`)
  - HTML/JSX form inputs (`text`, `password`, `hidden`, `disabled`, `select`, `textarea`)
  - File upload endpoints (`multer`, `formidable`, `multipart/form-data`)
  - Session & Token mechanisms (JWT, session cookies, cookie flags `HttpOnly`, `Secure`, `SameSite`)
  - Database technologies (SQL: PostgreSQL, MySQL, SQLite, Prisma, TypeORM; NoSQL: MongoDB, Mongoose)

## 57. Security Test Plan Generation (`vp.securityPlan`)
- Generates prioritized, risk-based test plans spanning 7 security domains without combinatorial explosion:
  1. **Authentication**: Login validation, invalid password rejection without account enumeration, empty/malformed resilience, safe brute force rate-limiting.
  2. **Authorization**: Unauthenticated access, vertical privilege escalation (user vs admin), and Insecure Direct Object References (IDOR).
  3. **Forms & Inputs**: Parameter tampering on hidden/disabled fields (roles, prices), extreme boundary lengths, and unicode edge cases.
  4. **Injections**: Safe SQL injection probes, NoSQL operator injections, reflected/stored XSS verification (distinguishing safe HTML entity encoding as PASS), OS command injection proof signals, and path traversal sanitization.
  5. **API Security**: Verbose error leakage, stack trace exposure, and content-type mismatch hardening.
  6. **Sessions & Tokens (Session Theft Suite)**: Cookie theft vectors (`HttpOnly` / `Secure` / `SameSite`), session ID URL leakage, session fixation (missing ID regeneration), client-side token storage (XSS exfiltration), logout invalidation gaps, and JWT signature tampering rejection.
  7. **File Uploads**: Executable extension rejection (`.php`, `.exe`, `.sh`), MIME type validation, and filename traversal sanitization.

## 58. Safe Non-Destructive Security Execution (`vp.securityRun`, `vp.securityReport` / `veloprove security --safe`)
- **Safe Mode**: Enabled by default to prohibit destructive SQL (`DROP`, `DELETE *`, `TRUNCATE`), malware uploads, or aggressive DoS floods.
- **Environment Protection**: Refuses intrusive tests on production targets unless explicitly overridden with `allowProduction: true`.
- **Secret Redaction**: Automatically sanitizes JWTs, passwords, session cookies, auth headers, and API keys across all logs and reports.
- **Explainable Scoring**: Calculates an explainable 0-100 Security Score with weighted severity deductions (Critical, High, Medium, Low, Info) and stack-aware remediation guidance.

## 59. SARIF Security Export (`vp.exportSarif` / `veloprove security --sarif <path>`)
- Writes GitHub Code Scanning–compatible **SARIF v2.1.0** from the latest security findings for PR annotations.

## 60. SRI / CSRF / CORS Web Security Validator (`vp.auditSriCsrf` / `veloprove web-sec`)
- Audits external CDN scripts for Subresource Integrity, mutating forms for CSRF tokens, and wildcard CORS policies.

## 61. Test Suite Deduplication (`vp.dedupTests` / `veloprove dedup`)
- Detects duplicate assertions and redundant test cases; reports overlap percentages to shrink flaky surface area.

## 62. Environment Doctor (`vp.doctor` / `veloprove doctor`)
- Validates Node.js version, package manager, test runners (Vitest / Jest / Playwright / `node:test`), Playwright browsers, and project config health before agents run deep loops.

## 63. Application Fix Suggestions (`vp.suggestFix` — MCP-only)
- When diagnosis is `APPLICATION_BUG`, returns evidence-backed **prose guidance** (`completeness: PARTIAL` until real diffs ship). There is no CLI twin; agents should call `vp.suggestFix` over MCP. Not a guaranteed fix.

## 64. Git Pre-Commit Hook (`veloprove hook install|uninstall`)
- Installs or removes a local pre-commit hook that runs change-impact verification before commits (CLI-only companion to the verify loop).

## 65. Flaky History Reader (`vp.flaky` — MCP-only)
- Reads local flaky-test history aggregates. Pair with `vp.quarantine` / `veloprove quarantine` and `vp.stabilizeFlaky` / `veloprove stabilize` for remediation.

## 66. Async Run Polling (`vp.run.get` — MCP-only)
- Polls status for long-running `vp.run` executions when agents need non-blocking orchestration.

## 67. Project Twin (**PARTIAL MVP**) (`vp.twin` / `veloprove twin`)
- Builds a local project model under `.veloprove/twin/latest.json` from **inspect SSOT** (not a second scanner, not AI assumptions).
- Evidence classes: `VERIFIED` / `OBSERVED` / `INFERRED` / `STALE` / `UNKNOWN`.
- Optional facets: `--with-impact` (wraps `changed`), `--with-drift` (aggregator). Incremental fingerprint reuse; `--force` rebuilds.
- Do **not** market as complete Ground Truth — see repo `TODO.md`.

## 68. Impact enrichment (`vp.impact` / `veloprove impact`)
- Thin wrap over `changed` that attaches Twin feature hits when a Twin snapshot exists.

## 69. Drift aggregator (`vp.drift` / `veloprove drift`)
- Composes `contract-drift` + `feature-parity` + `env-drift` + docs/package hints. Marks Twin fingerprint disagreement as `STALE`.
- Individual engines remain available as separate commands (not aliases of `drift`).

## 70. Twin-aware affected tests (`veloprove test --affected` / `--scope affected`)
- Unions DependencyGraph + Twin impact. **Expands to the full suite** when confidence is low or no tests map — never silently shrinks.

