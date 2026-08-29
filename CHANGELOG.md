# Changelog

All notable changes to QAForge will be documented in this file.

## [1.0.0] - 2026-08-28

### Core Autonomous QA
- **Local-First Architecture**: 100% local execution without external cloud dependencies or forced telemetry. Network access occurs only when explicitly targeting remote endpoints, registries, webhooks, or external services requested by the user.
- **Zero-Config Stack Detection**: Automatically identifies frameworks and tools (Next.js, React, Vite, Vue, Svelte, Express, Fastify, Vitest, Jest, Playwright).
- **Spec-Driven Requirement Discovery**: PRD Markdown parsing, OpenAPI/Swagger contracts, route definitions, and functional feature mapping.
- **Risk-Based Test Planning & Generation**: Generates prioritized test suites with protected developer test overwrite policies.
- **Git Diff Change Impact Analysis**: Pinpoints and executes only tests impacted by recent code modifications (`qa.changed` / `qaforge changed`).
- **Release Confidence Engine**: Quantitative readiness scoring (`READY`, `READY_WITH_WARNINGS`, `NOT_READY`) and gate validation (`qa.releaseCheck` / `qaforge release`).

### Testing, Diagnostics & Safe Healing
- **Evidence-Based Failure Diagnostics**: Automated classification (`APPLICATION_BUG`, `TEST_BUG`, `FLAKY_TEST`, `NETWORK_FAILURE`) with root-cause confidence scoring (`qa.diagnose` / `qaforge diagnose`).
- **Guarded Test Self-Healing**: Repairs brittle locators using Visual-Aria hierarchies and accessibility selectors (`qa.heal` / `qaforge heal`).
- **Natural Language Test Refinement**: Modifies test assertions in-place via natural language prompts (`qa.refine` / `qaforge refine`).
- **Mutation Testing Quality Score**: Evaluates assertion sensitivity and resistance against subtle code defects (`qa.mutationScore` / `qaforge mutation-score`).
- **AST Flakiness Stabilizer & Auto-Wait Fixer**: Detects and refactors flaky test anti-patterns (hardcoded timeouts, non-deterministic assertions) into resilient web-first assertions (`qa.stabilizeFlaky` / `qaforge stabilize`).
- **Flaky Test Auto-Quarantine**: Variance tracking and automatic isolation of unstable tests to keep CI pipelines green (`qa.quarantine` / `qaforge quarantine`).
- **Autonomous Bug-Fix & Git Patch Synthesizer**: Converts `APPLICATION_BUG` failure diagnostics into reviewable Git patches and unified diffs (`qa.autoBugFix` / `qaforge auto-fix`).
- **Autonomous Git Bisect Regression Hunter**: Automatically traverses Git commit history to pinpoint the exact commit introducing a test failure (`qa.gitBisect` / `qaforge bisect`).
- **Test Failure Visual Replay Package**: Generates interactive standalone SVG/HTML step-by-step visual timeline animation packages for failed tests (`qa.recordFailureReplay` / `qaforge replay`).

### API & Contract Testing
- **Native Dynamic API Engine**: Contract validation, Dynamic Variable interpolation (`{{var}}`), Auto-Auth, and Auto-Cleanup teardown chains.
- **Postman Collection v2.1 Runner & Exporter**: Local parsing and execution of Postman collections (`qa.runCollection` / `qaforge run-collection`), environment variable chaining, and exporting discovered APIs as Postman v2.1 JSON (`qa.exportCollection` / `qaforge export-postman`).
- **Interactive Postman API Client & Playground in Dashboard**: Single-click HTTP request builder, response latency/status inspector, and quick-load from discovered endpoints.
- **OpenAPI Security Fuzzing & Boundary Probes**: Generates automated boundary value probes and authorization bypass checks (`qa.fuzzApi` / `qaforge fuzz-api`).
- **API & OpenAPI Contract Drift Detector**: Bi-directional validation between OpenAPI documentation and code routes (`qa.contractDrift` / `qaforge contract-drift`).
- **GraphQL & WebSocket Real-Time Engines**: Validates GraphQL queries/mutations and WebSocket connection handshakes (`qa.graphqlTest`, `qa.wsTest` / `qaforge graphql`, `qaforge ws-test`).
- **Stateful Dynamic In-Memory Mock Server**: Zero-cloud local RESTful CRUD mock server with automatic collection routing, state mutations, and seed resets (`qa.statefulMock` / `qaforge mock-server`).
- **Mock Service Worker (MSW) Network Generator**: Automated type-safe network mock handlers (`qa.mockNetwork` / `qaforge mock-gen`).

### Web, Mobile & E2E Testing
- **Interactive Live Exploration**: Crawls live applications to build visual site maps and discover interactive controls (`qa.explore` / `qaforge explore`).
- **E2E Scenario Recorder & Synthesizer**: Converts interactive user journeys into resilient Playwright/Vitest E2E tests (`qa.recordScenario` / `qaforge record-scenario`).
- **Cross-Browser & Mobile Matrix Runner**: Synthesizes Playwright multi-browser matrices covering Chromium, Firefox, WebKit, Mobile Safari, and Pixel viewports (`qa.browserMatrix` / `qaforge browser-matrix`).
- **Visual Regression & Pixel Diff Engine**: Snapshot baseline comparison and visual drift detection (`qa.visualDiff` / `qaforge visual-diff`).
- **Automated WCAG 2.1 Accessibility Auditor**: Automated component and route accessibility checks with remediation steps (`qa.accessibility` / `qaforge a11y`).
- **Screen Reader & Audio Flow Simulator**: Simulates auditory speech order (NVDA / VoiceOver), flags missing alt/aria-labels, ambiguous button text, and heading hierarchy skips (`qa.screenReaderSim` / `qaforge screen-reader`).
- **Live Remote Companion Bridge & Probe Agent**: Connects local QAForge to any live production/staging website via lightweight companion probes (`qa.remoteInit`, `qa.remoteConnect`, `qa.remoteAudit` / `qaforge remote-init`, `qaforge remote-connect`, `qaforge remote-audit`).

### Security & Vulnerability Auditing
- **Dependency CVE & Secret Scanner**: Scans `package.json` dependencies for known vulnerabilities and detects hardcoded secrets (`qa.auditSec` / `qaforge audit`).
- **OWASP Top 10 Security & Headers Audit**: Deep local penetration audit for CSP, X-Frame-Options, MIME sniffing, CORS, and stack trace leaks (`qa.owaspScan` / `qaforge owasp-scan`).
- **Malware, Backdoor & Obfuscated Code Scanner with One-Click Remediation**: Detects dangerous obfuscated Base64 `eval()` backdoors, suspicious lifecycle scripts, raw IP data exfiltration, and exposed high-entropy secrets, with one-click automatic neutralization (`qa.scanMalware`, `qa.remediateMalware` / `qaforge scan-malware --fix`).
- **Web3 & Smart Contract Security Auditor**: Deep vulnerability scanner for Solidity (.sol) contracts detecting reentrancy, unprotected selfdestruct, and tx.origin exploits (`qa.smartContractAudit` / `qaforge audit-contracts`).

### Performance, Reliability & Stress Testing
- **Local Load & Stress Testing Engine**: High-throughput asynchronous load testing engine with Virtual Users (VUs), duration, throughput (req/s), and latency percentiles (`qa.loadTest` / `qaforge load-test`).
- **Core Web Vitals & Performance Profiling**: Route-level LCP, FID, CLS, TTFB, and bundle metrics (`qa.perf` / `qaforge perf`).
- **Autonomous Chaos & Edge-Case Monkey Engine**: Systematic injection of malformed JSON, prototype pollution, memory floods, type confusion, and concurrent bursts (`qa.chaosTest` / `qaforge chaos`).
- **API Rate-Limiting & DoS Threshold Profiler**: High-concurrency burst tester checking HTTP 429 throttling and server degradation under load (`qa.rateLimitAudit` / `qaforge rate-limit`).
- **Network Throttling & Offline Simulator**: Simulates real-world mobile network profiles (GPRS, 3G, 4G, packet loss, offline drops) to test app resilience (`qa.networkThrottle` / `qaforge throttle`).
- **Database Query & SQL N+1 Performance Auditor**: Detects database queries inside loops, unindexed queries, raw string concatenations, and unbounded fetches (`qa.dbQueryAudit` / `qaforge db-audit`).

### Developer Intelligence, Data & Environment
- **AI & Schema Mock Data Factory**: Generates realistic contextual test fixtures (users, orders, addresses, payments, and Arabic locales) (`qa.mockData` / `qaforge mock-data`).
- **Universal UI-to-Backend Feature Parity & Ghost Feature Auditor**: Scans interactive UI elements across React, Vue, Svelte, Tauri/Rust, Express, and Python/FastAPI, matching them with backend commands and detecting dummy no-ops (`qa.featureParity` / `qaforge feature-parity`).
- **Database Snapshot & State Isolation Engine**: Creates and restores database/fixture snapshots for clean test execution (`qa.dbSnapshot`, `qa.dbRestore` / `qaforge db-snapshot`, `qaforge db-restore`).
- **Docker & Ephemeral Container Orchestrator**: Generates isolated containerized test environments (`docker-compose.test.yml`) for PostgreSQL, Redis, MongoDB, and MySQL (`qa.dockerEnv` / `qaforge docker-env`).
- **Multi-Environment Config & Secret Drift Auditor**: Compares `.env` against `.env.example`, detects undeclared code references (`process.env`), and flags leaked secrets (`qa.envDriftAudit` / `qaforge env-drift`).
- **Dead Code, CSS & Unused Asset Purge Engine**: Scans projects for unreferenced image assets, font files, and dead CSS rules, with safe one-click disk space reclamation (`qa.deadAssetPurge` / `qaforge dead-assets --purge`).
- **Microservices & Architecture Dependency Graph**: Maps frontend UI, backend APIs, databases, caches, and third-party cloud SDKs into interactive topology graphs and Mermaid diagrams (`qa.architectureGraph` / `qaforge arch-graph`).
- **ESLint & Static Code Quality Engine**: Zero-config static analysis, rule enforcement, and auto-fixing (`qa.lint` / `qaforge lint --fix`).
- **BDD Gherkin Feature Spec Generator**: Automated compilation of discovered PRD requirements into standard `.feature` files and step definition skeletons (`qa.bddFeatures` / `qaforge bdd`).
- **Interactive Real-Time Test Watch Mode**: Instant feedback loop on code save (`qaforge watch`).
- **Ephemeral Mock DB & Environment Isolation**: In-memory database and HTTP sandbox (`qaforge sandbox`).

### AI Agent Integration & LLM Testing
- **Universal AI Agent Handshake & Discovery**: Self-teaching protocol (`qa.bootstrap` / `qaforge agent-handshake`) for any AI editor or agent (Cursor, Windsurf, Claude Code, Cline, Codex, GitHub Copilot).
- **Custom & In-House Framework Self-Teaching**: Dynamic framework ingestion from `AGENTS.md` and custom routing specs (`qa.learnFramework` / `qaforge learn-framework`).
- **LLM & AI Output Hallucination & Accuracy Evaluator**: Evaluates AI model outputs against ground truth facts, forbidden toxic tokens, and validates JSON schema compliance (`qa.aiEvaluate` / `qaforge ai-eval`).

### CLI, MCP, Dashboard & Reporting
- **Dual Interfaces**: High-ergonomics CLI (`npx qaforge`) + MCP Server (stdio) with 64 structured tools.
- **Environment & Installation Doctor**: Built-in diagnostics command (`qa.doctor` / `qaforge doctor`) checking Node.js version, package manager, test framework detection, MCP configuration, and filesystem permissions with actionable remediations.
- **Production Packaging & NPX Architecture**: Strict npm allowlist (`"files": ["dist", "docs", "README.md", "CHANGELOG.md", "LICENSE"]`), isolated from development sources and test fixtures.
- **Idempotent Non-Destructive Project Initialization**: Enhanced `npx qaforge init` detecting package managers (npm, pnpm, yarn, bun), scaffolding `.qaforge/` directories, and adding non-destructive convenience scripts to `package.json`.
- **Pre-Release Integrity Automation**: Automated pre-pack validation (`npm run release:check`) verifying package size (< 5MB), allowlisted assets, executable shebangs, and zero forbidden development files.
- **Local Live HTML Dashboard**: Interactive quality command center (`qaforge ui`) with real-time metrics, Action Hub, Postman client, and embedded Doctor diagnostics.
- **Interactive Terminal Command Center (TUI)**: Live terminal quality matrix and shortcuts dashboard (`qaforge tui`).
- **Interactive Dashboard Guide & Docs Tab**: Complete embedded user & agent guide in the UI dashboard with keyword search and CLI reference.
- **Standalone Executive Audit & QA Report Exporter**: Self-contained, responsive single-file HTML/JSON/Markdown executive report generator (`qa.exportReport` / `qaforge export-report`).
- **Webhook Alerts & Notification Dispatcher**: Dispatches test run verdicts, quality scores, and security alerts directly to Slack, Discord, MS Teams, or webhooks (`qa.sendAlert` / `qaforge alert`).
- **CI Workflow Generator**: GitHub Actions autonomous quality gate (`qaforge setup-ci`).
- **PRD Requirements Coverage Heatmap**: Color-coded functional requirement coverage matrix (`qa.coverage` / `qaforge coverage`).
