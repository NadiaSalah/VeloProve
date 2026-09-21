# Changelog

All notable changes to VeloProve will be documented in this file.

## [1.0.1] - 2026-09-21

### Fixed
- Softened WCAG / screen-reader marketing claims to match static heuristics (not certified A/AA/AAA or live NVDA/VoiceOver) across CLI, MCP, Dashboard, and catalog summaries.
- Windows `SafeProcessRunner`: quote args when `shell:true` for `.cmd`/`.bat` and npm-ecosystem shims.
- `release-check` asserts CLI `--version` against `package.json` (no hardcoded 1.0.0); requires packaged `docs/guides/trust.md`.
- `vp.suggestFix` surfaces `completeness: PARTIAL` when no unified diff exists.
- Twin impact certainty for high-confidence graph tests; drift CLI wording; stale “75 tools” hardcodes in release docs / capability-registry comments.

### Added
- **Project Twin MVP (PARTIAL):** `veloprove twin` / `vp.twin` builds `.veloprove/twin/latest.json` from inspect SSOT; optional impact/drift facets wrap `changed` + aggregated drift; `veloprove impact` / `vp.impact` attaches Twin feature hits; `veloprove drift` / `vp.drift` aggregates contract+parity+env+docs; `test --affected` expands on low Twin confidence. Incremental fingerprint reuse + `--force`. Not AI ground-truth — see `TODO.md` for remaining Twin phases.

### Changed
- Package version **1.0.1**; capability manifest regenerated from package SSOT; package-lock lockstep.
- Test fixtures relocated into `VeloProve-core/fixtures/` (was monorepo-sibling `../fixtures/`); pack-smoke and helpers updated.
- Fault harness (`tests/fault-harness`) runs all **16** catalog faults (detect/diagnose rates measured; heal/auto-fix honest PARTIAL).
- Classifier emits `FLAKY_TEST` for retry/intermittent signals; ephemeral/monorepo fixture helpers replace `cwd/fixtures` noise.
- Shared `healable-policy` + `SecretRedactor` SSOT for process-runner redaction.
- **Dashboard Tool Lab**: full CLI catalog (help-groups + search + Run/URL/Write/Terminal-only/Partial); Twin Build/Impact/Drift + evidence table; surface-matrix honesty updated.
- Docs: beginner/AI path in `docs/README.md`; Tool Lab honesty in `docs/AGENTS.md` + FAQ; `TODO.md` reset for 1.0.1 publish prep; README gallery screenshots recaptured.
- Dashboard Guide/About: Tool Lab note, honesty lines, Twin PARTIAL note; `brandV` from package version.
- Docs: `features.md` / `docs/AGENTS.md` / About UI synced for Twin · impact · drift · `--affected`.
- Monorepo fixtures expanded: `fault-harness`, `golden-project`, `security-local`, `api-local`, `a11y-local`, `release-*`, `git-disposable`.

### Security
- Canary secret redaction unit test; trust guide documents local vs network vs writes vs git.
- Confirmed no PostHog/Segment/analytics SDK in product source (no telemetry by default).

### Documentation
- Added `docs/guides/trust.md` and `docs/internal/trust-hardening-1.0.1-report.md`.
- Catalog-language counts in packaged docs; verify-first examples; features Twin sections; TODO Twin title honesty.
- README / Guide / About synced for Twin · impact · drift · `--affected`; sequential real-fixture feature pass (`scripts/feature-pass-real.mjs` → `FEATURE_PASS_REPORT.json`).
- npm README screenshots/logo use GitHub raw URLs (screenshots stay out of the tarball).
- Pack `files` allowlist continues to exclude `docs/internal`, `docs/generated`, and screenshot corpora.

## [1.0.0] - 2026-08-28

### Status
- **VeloProve v1.0.0 is published:** [`@engnadia/veloprove`](https://www.npmjs.com/package/@engnadia/veloprove) on npm (`npx @engnadia/veloprove`).
- **VeloProve v1.0.0 feature set is complete in this repository.** Remaining marketplace screenshot upload is gated on explicit human approval.
- No v2 version bump: continued work stays on the **1.0.x / 1.x** line unless a breaking major rewrite is explicitly approved.

### Unreleased / v1.0.x follow-ups (folded into 1.0.0 line)
- **Production audit pass**: Fixed stale 74→75 surface claims; dashboard UI audit detects `fetch(/api/actions/…)`; CAPABILITY_MANIFEST dashboard ids sanitized to real actions; surface-matrix doc; broken-app failure fixture + integration tests; smoke covers generate/verify; gitignore ephemeral lint/fixture noise.
- **v1 quality pass (no publish)**: richer API grounding (batch + content-type/shape), explore→plan seeding, local fixtures pack, evidence pack v2 + zip, scheduled-verify recipes, MCP marketplace listing assets, dashboard verify presets, first-verify empty-suite guidance.
- **Competitive gaps (local-first)**: One-prompt teach-ai → verify path; live GET API grounding on `generate`; failure evidence pack under `.veloprove/evidence/`; `verify --sandbox` / `--docker-env`; `watch --verify` / `-i`; `hook --verify`; MCP marketplace / no-API-key install docs.
- **Hygiene & docs sync**: Removed orphan `_dash-script.js`; fixed verify selection-mode dead ternary; MCP `boolFlag` coerces `"true"`/`1`; dashboard `/api/*` matches on pathname; MCP resources are **`vp://` only** (no legacy aliases) including `release/confidence`; README/AGENTS/features/cli/mcp + Guide/About synced for security/web-sec/dedup/hook and MCP-only tools. Product namespace is VeloProve / `vp.*` exclusively.
- **Docs for AI-after-install**: Packaged consumer playbook [`docs/AGENTS.md`](docs/AGENTS.md) (loop + MCP); removed redundant `docs/integrations/`; README CLI dump slimmed to core commands; handshake points agents at `node_modules/@engnadia/veloprove/docs/…`.
- **Teach AI**: CLI `veloprove teach-ai` (alias `agent-handshake`) + Dashboard header **Teach AI** + MCP `vp.bootstrap` with `force` / `writeMcp`; returns `pasteToAi` briefing, rewrites `AGENTS.md` on demand, optional `.cursor/mcp.json`.
- **AI link on init**: `init --teach` / `--link-ai` / `--no-link-ai`; auto-detect Cursor/Claude/Windsurf/Cline; interactive Auto/Cursor/multi/Skip; MCP args `npx -y @engnadia/veloprove mcp`.
- **Docs Chat**: CLI `veloprove ask` (alias `chat`, `--repl`) + MCP `vp.ask` + Dashboard **Docs Chat** — answers from packaged markdown only (no cloud LLM). Surface count **75** CLI/MCP. FAQ: `docs/guides/faq.md`. Dashboard composer grows like Cursor (Enter send / Shift+Enter newline; Ask + Copy under the box with icons).
- **Pre-publish DX**: Grouped root `--help` aligned with Dashboard sidebar (Start / Verify / Repair / Results / API / Security / Experience / More) + Daily-10 callout + alias canonical-name note; `--json` on `inspect`/`doctor`/`changed`/`release`; positional `[url]` on `explore`/`ensure-dev`/`security`; faster help smoke (in-process + sample); `npm run pack:smoke` consumer gate (`scripts/pack-smoke.js`, wired into `release:check`).
- **Dashboard mobile + toasts**: Critical actions moved to sidebar **Quick Actions** + Overview; toast host for feedback; **AI gate** — if AI/MCP detected, sensitive ops auto-execute; if not, warn + **Run without AI** / Teach AI / Cancel. CLI: `msg.confirmSensitive` + `--allow-no-ai` escape for local-only.
- **Dashboard UI polish**: Docs Chat Cursor-like layout (answer above, composer docked); XSS-safe console/toasts/API flow; button-group active state after confirm; Guide renumbered; print stylesheet; disabled Copy until an answer exists.
- **Dashboard sidebar UX**: Reclassified into Start / Verify / Repair / Results / API / Security / Experience / More; only Start+Verify open by default; pin bar Docs Chat only.
- **Export Save**: Path field + Save only (no OS Browse dialog). Default/fallback: `.veloprove/exports` (auto-created); typed path optional; final path shown after save.
- **Dashboard UI cleanup**: Removed dead CSS (`.empty`, `.sq-btn.primary`), legacy JS aliases (`triggerAction`, `switchTab`, unused `runQuick`/`db-restore` gate), unread export-meta fields; compacted table HTML; utility `.stack*` instead of inline margins — same design, lighter payload.
- **Surface sync**: Wired Dashboard **Refresh History** (`runAction('history')`); fixed stale dashboard header docs; added Docs Chat (`vp.ask`) to features guide; renumbered `mcp.md` tools 1–75; root `AGENTS.md` points consumers to packaged `docs/AGENTS.md`.
- **Publish readiness**: Release gate requires packaged AI/Docs Chat corpus (`docs/AGENTS.md`, FAQ, marketplace badge); RELEASING + marketplace README document npm vs GitHub vs screenshot upload; consumer pack smoke covers `init --teach` → `ask`.
- **node:test adapter**: Detect/run `node --test` / `node:test` projects (broken-app + real-app-smoke); doctor/verify treat it as a first-class runner.
- **URL-tier smoke**: Stable fixture port via `VP_FIXTURE_PORT`/`PORT`, health wait, expanded probes (owasp, load, request, rate-limit, chaos, throttle).
- **Docs/UI/CLI sync**: Documented `node:test` across README, getting-started, dashboard, AGENTS, cli/mcp references, Dashboard Doctor/Runner/About, and CLI/MCP tool descriptions.
- **Test generator runners**: `TestCodeGenerator` emits Vitest, Jest (`@jest/globals`), or `node:test` + `node:assert/strict` (`.test.js`) from the planned runner — no longer hard-codes Vitest for node:test/Jest plans. Init prompts include Choice 4=`node:test`. Dashboard/report exporter fallbacks no longer fake `Vitest` when profile is missing. LoadTester unit assert accepts `PASSED|DEGRADED` when error rate is zero.
- **CLI syntax DX**: Short aliases for long commands (`load`, `vdiff`, `postman`, `parity`, `dev`, …); `-u` reserved for URLs; load VUs use `-c/--vus`; path outputs prefer `-o/--out`; clearer help for `changed` / `audit` / `security` / `release`.
- **Tool surface audit**: Canonical `TOOL_SURFACE` catalog + `tests/unit/tool-surface-audit.test.ts` + real-project smoke (`fixtures/real-app-smoke`, `tests/integration/tool-smoke-real-project.test.ts`); artifacts in `docs/generated/TOOL_SURFACE_AUDIT.json` / `TOOL_SMOKE_REPORT.json`. Dashboard **Tool Lab** wires previously orphan server actions. Agent handshake teaches 75-tool catalogs.
- **Dashboard UX (offline-first)**: System font stacks only (no webfont CDN); mobile drawer nav with backdrop; larger tap targets; stacked panes + scrollable tables on small screens.
- **Works without AI + OS docs**: Documented Windows/macOS/Linux + Node >= 18; AI agent optional for core QA. Dashboard sensitive actions offer **Run without AI** (warn toast, no hard crash). CLI messages clarify local-only mode + `--allow-no-ai`.
- **Brand assets**: README hero uses official `docs/assets/veloprove-logo.svg` (GitHub + npm README); dashboard favicon/sidebar/About serve `veloprove-icon.svg` / `veloprove-logo.svg` from the published package.
- **Docs reorg**: Published docs under `docs/guides/`, `docs/reference/`, `docs/AGENTS.md` with `docs/README.md` index; removed stale `ai-testing-handoff/` + final-release audit; unused fixtures purged.
- **Dashboard modularization**: HTML styles, client script, and helpers split under `src/application/dashboard-ui/`.
- **MCP arg narrowing (complete)**: Remaining CallTool handlers use `arg-utils` (zero `as any` in MCP switch).
- **Allure export**: `veloprove export-report -f allure` / `vp.exportReport` writes Allure 2 `*-result.json` + `executor.json`.
- **OpenAPI → MSW examples**: OpenAPI `example` / schema samples preferred in `mock-gen` handlers; Dashboard one-click on Discovered APIs.
- **Multi-step API Studio flows**: Ordered steps with `{{var}}` substitution, JSONPath extract, and Postman collection export.
- **Chrome recorder extension**: Load-unpacked MV3 package at `extensions/recorder` (shared probe with bookmarklet).
- **Branch velocity / MTTR**: Run history records git branch, computes MTTR / velocity delta / regression alerts; `sendAlert` enriches Slack/Discord/Teams payloads.

### Unreleased / v1.0.x hardening (folded into 1.0.0)
- **Autonomous Verify Orchestrator**: `veloprove verify` / `vp.verify` runs inspect → change impact → targeted tests → diagnose → conservative TEST_BUG heal → release assessment, returning a versioned `OperationResult` with evidence and CI exit codes (`0/1/2/3`).
- **Capability Registry + OperationResult**: Shared capability catalog and structured result/error model for coherent CLI/MCP/Dashboard execution.
- **Intent planner (deterministic)**: `--intent` / MCP `intent` maps natural language to capability plans without LLM execution.
- **Safer process runner**: AbortSignal cancellation, output caps, Windows process-tree kill, secret redaction.
- **Explainable change-impact**: import-aware test selection, risk areas, recommended capabilities, reasoning evidence.
- **Fix safety policy**: SAFE / REVIEW_REQUIRED / PROHIBITED_AUTOMATIC gates for heal and auto-fix.
- **Execution policy**: Configurable timeouts, bounded transient retries, concurrency pool (`mapPool`).
- **EnvironmentGuard**: Blocks production and unknown remotes for intrusive probes by default.
- **InspectCache**: Hash-based inspect memoization to avoid repeated full scans.
- **Safer FS/process boundaries**: WorkspaceGuard null-byte/symlink checks; DevServerManager spawns without `shell:true`.
- **Diagnosis evidence split**: `evidenceSignals` vs `speculationNotes` separate from classifier `confidence`.
- **MCP/CLI parity**: 75 tools/commands (`vp.verify` / `verify`, `vp.history` / `history`, `vp.ask` / `ask`).
- **MCP arg narrowing**: Shared `arg-utils` for verify/ensureDev/run/diagnose/heal/dedup (fewer `as any` at the MCP boundary).
- **Run history**: `.veloprove/state/history.json` with pass-rate/duration charts; exposed via dashboard `GET /api/history`, `veloprove history`, and `vp.history`.
- **CI reports**: `export-report -f junit|pdf` for JUnit XML and a dependency-free executive PDF.
- **API Studio**: Local/Staging/Prod environments, secret masking, token chaining, lightweight assertions.
- **Scenario Recorder**: Dashboard bookmarklet + JSON paste → accessibility-first Playwright specs.

### Project Rename
- The project is now officially named **VeloProve**.
- This is a naming and repository consistency migration. Existing v1 functionality remains unchanged.
- Canonical package: `@engnadia/veloprove` · CLI binary: `veloprove` · Config: `veloprove.config.json` · Local state: `.veloprove/`
- Canonical GitHub repository: [`https://github.com/NadiaSalah/VeloProve`](https://github.com/NadiaSalah/VeloProve)
- MCP tool namespace migrated from `qa.*` to `vp.*` (historical count at migration; current surface is **75** tools/commands).

### Core Autonomous QA
- **Local-First Architecture**: 100% local execution without external cloud dependencies or forced telemetry. Network access occurs only when explicitly targeting remote endpoints, registries, webhooks, or external services requested by the user.
- **Zero-Config Stack Detection**: Automatically identifies frameworks and tools (Next.js, React, Vite, Vue, Svelte, Express, Fastify, Vitest, Jest, Playwright).
- **Spec-Driven Requirement Discovery**: PRD Markdown parsing, OpenAPI/Swagger contracts, route definitions, and functional feature mapping.
- **Risk-Based Test Planning & Generation**: Generates prioritized test suites with protected developer test overwrite policies.
- **Git Diff Change Impact Analysis**: Pinpoints and executes only tests impacted by recent code modifications (`vp.changed` / `veloprove changed`).
- **Release Confidence Engine**: Quantitative readiness scoring (`READY`, `READY_WITH_WARNINGS`, `NOT_READY`) and gate validation (`vp.releaseCheck` / `veloprove release`).

### Testing, Diagnostics & Safe Healing
- **Evidence-Based Failure Diagnostics**: Automated classification (`APPLICATION_BUG`, `TEST_BUG`, `FLAKY_TEST`, `NETWORK_FAILURE`) with root-cause confidence scoring (`vp.diagnose` / `veloprove diagnose`).
- **Guarded Test Self-Healing**: Repairs brittle locators using Visual-Aria hierarchies and accessibility selectors (`vp.heal` / `veloprove heal`).
- **Natural Language Test Refinement**: Modifies test assertions in-place via natural language prompts (`vp.refine` / `veloprove refine`).
- **Mutation Testing Quality Score**: Evaluates assertion sensitivity and resistance against subtle code defects (`vp.mutationScore` / `veloprove mutation-score`).
- **AST Flakiness Stabilizer & Auto-Wait Fixer**: Detects and refactors flaky test anti-patterns (hardcoded timeouts, non-deterministic assertions) into resilient web-first assertions (`vp.stabilizeFlaky` / `veloprove stabilize`).
- **Flaky Test Auto-Quarantine**: Variance tracking and automatic isolation of unstable tests to keep CI pipelines green (`vp.quarantine` / `veloprove quarantine`).
- **Autonomous Bug-Fix & Git Patch Synthesizer**: Converts `APPLICATION_BUG` failure diagnostics into reviewable Git patches and unified diffs (`vp.autoBugFix` / `veloprove auto-fix`).
- **Autonomous Git Bisect Regression Hunter**: Automatically traverses Git commit history to pinpoint the exact commit introducing a test failure (`vp.gitBisect` / `veloprove bisect`).
- **Test Failure Visual Replay Package**: Generates interactive standalone SVG/HTML step-by-step visual timeline animation packages for failed tests (`vp.recordFailureReplay` / `veloprove replay`).

### API & Contract Testing
- **Native Dynamic API Engine**: Contract validation, Dynamic Variable interpolation (`{{var}}`), Auto-Auth, and Auto-Cleanup teardown chains.
- **Postman Collection v2.1 Runner & Exporter**: Local parsing and execution of Postman collections (`vp.runCollection` / `veloprove run-collection`), environment variable chaining, and exporting discovered APIs as Postman v2.1 JSON (`vp.exportCollection` / `veloprove export-postman`).
- **Interactive Postman API Client & Playground in Dashboard**: Single-click HTTP request builder, response latency/status inspector, and quick-load from discovered endpoints.
- **OpenAPI Security Fuzzing & Boundary Probes**: Generates automated boundary value probes and authorization bypass checks (`vp.fuzzApi` / `veloprove fuzz-api`).
- **API & OpenAPI Contract Drift Detector**: Bi-directional validation between OpenAPI documentation and code routes (`vp.contractDrift` / `veloprove contract-drift`).
- **GraphQL & WebSocket Real-Time Engines**: Validates GraphQL queries/mutations and WebSocket connection handshakes (`vp.graphqlTest`, `vp.wsTest` / `veloprove graphql`, `veloprove ws-test`).
- **Stateful Dynamic In-Memory Mock Server**: Zero-cloud local RESTful CRUD mock server with automatic collection routing, state mutations, and seed resets (`vp.statefulMock` / `veloprove mock-server`).
- **Mock Service Worker (MSW) Network Generator**: Automated type-safe network mock handlers (`vp.mockNetwork` / `veloprove mock-gen`).

### Web, Mobile & E2E Testing
- **Interactive Live Exploration**: Crawls live applications to build visual site maps and discover interactive controls (`vp.explore` / `veloprove explore`).
- **E2E Scenario Recorder & Synthesizer**: Converts interactive user journeys into resilient Playwright/Vitest E2E tests (`vp.recordScenario` / `veloprove record-scenario`).
- **Cross-Browser & Mobile Matrix Runner**: Synthesizes Playwright multi-browser matrices covering Chromium, Firefox, WebKit, Mobile Safari, and Pixel viewports (`vp.browserMatrix` / `veloprove browser-matrix`).
- **Visual Regression & Pixel Diff Engine**: Snapshot baseline comparison and visual drift detection (`vp.visualDiff` / `veloprove visual-diff`).
- **Automated WCAG 2.1 Accessibility Auditor**: Automated component and route accessibility checks with remediation steps (`vp.accessibility` / `veloprove a11y`).
- **Screen Reader & Audio Flow Simulator**: Simulates auditory speech order (NVDA / VoiceOver), flags missing alt/aria-labels, ambiguous button text, and heading hierarchy skips (`vp.screenReaderSim` / `veloprove screen-reader`).
- **Live Remote Companion Bridge & Probe Agent**: Connects local VeloProve to any live production/staging website via lightweight companion probes (`vp.remoteInit`, `vp.remoteConnect`, `vp.remoteAudit` / `veloprove remote-init`, `veloprove remote-connect`, `veloprove remote-audit`).

### Security & Vulnerability Auditing
- **Comprehensive Security Testing Expansion**: Autonomous non-destructive vulnerability testing for authentication, authorization (IDOR / privilege escalation), input injections (SQLi, NoSQLi, XSS, Command, Path Traversal), form tampering, JWT tokens, and file uploads (`vp.securityScan`, `vp.securityPlan`, `vp.securityRun`, `vp.securityReport` / `veloprove security`).
- **Safe Security Testing Mode & Secret Redaction**: Non-destructive by default with automated secret sanitization for JWTs, passwords, cookies, and tokens across logs and reports.
- **Dependency CVE & Secret Scanner**: Scans `package.json` dependencies for known vulnerabilities and detects hardcoded secrets (`vp.auditSec` / `veloprove audit`).
- **OWASP Top 10 Security & Headers Audit**: Deep local penetration audit for CSP, X-Frame-Options, MIME sniffing, CORS, and stack trace leaks (`vp.owaspScan` / `veloprove owasp-scan`).
- **Malware, Backdoor & Obfuscated Code Scanner with One-Click Remediation**: Detects dangerous obfuscated Base64 `eval()` backdoors, suspicious lifecycle scripts, raw IP data exfiltration, and exposed high-entropy secrets, with one-click automatic neutralization (`vp.scanMalware`, `vp.remediateMalware` / `veloprove scan-malware --fix`).
- **Web3 & Smart Contract Security Auditor**: Deep vulnerability scanner for Solidity (.sol) contracts detecting reentrancy, unprotected selfdestruct, and tx.origin exploits (`vp.smartContractAudit` / `veloprove audit-contracts`).

### Performance, Reliability & Stress Testing
- **Local Load & Stress Testing Engine**: High-throughput asynchronous load testing engine with Virtual Users (VUs), duration, throughput (req/s), and latency percentiles (`vp.loadTest` / `veloprove load-test`).
- **Core Web Vitals & Performance Profiling**: Route-level LCP, FID, CLS, TTFB, and bundle metrics (`vp.perf` / `veloprove perf`).
- **Autonomous Chaos & Edge-Case Monkey Engine**: Systematic injection of malformed JSON, prototype pollution, memory floods, type confusion, and concurrent bursts (`vp.chaosTest` / `veloprove chaos`).
- **API Rate-Limiting & DoS Threshold Profiler**: High-concurrency burst tester checking HTTP 429 throttling and server degradation under load (`vp.rateLimitAudit` / `veloprove rate-limit`).
- **Network Throttling & Offline Simulator**: Simulates real-world mobile network profiles (GPRS, 3G, 4G, packet loss, offline drops) to test app resilience (`vp.networkThrottle` / `veloprove throttle`).
- **Database Query & SQL N+1 Performance Auditor**: Detects database queries inside loops, unindexed queries, raw string concatenations, and unbounded fetches (`vp.dbQueryAudit` / `veloprove db-audit`).

### Developer Intelligence, Data & Environment
- **AI & Schema Mock Data Factory**: Generates realistic contextual test fixtures (users, orders, addresses, payments, and Arabic locales) (`vp.mockData` / `veloprove mock-data`).
- **Universal UI-to-Backend Feature Parity & Ghost Feature Auditor**: Scans interactive UI elements across React, Vue, Svelte, Tauri/Rust, Express, and Python/FastAPI, matching them with backend commands and detecting dummy no-ops (`vp.featureParity` / `veloprove feature-parity`).
- **Database Snapshot & State Isolation Engine**: Creates and restores database/fixture snapshots for clean test execution (`vp.dbSnapshot`, `vp.dbRestore` / `veloprove db-snapshot`, `veloprove db-restore`).
- **Docker & Ephemeral Container Orchestrator**: Generates isolated containerized test environments (`docker-compose.test.yml`) for PostgreSQL, Redis, MongoDB, and MySQL (`vp.dockerEnv` / `veloprove docker-env`).
- **Multi-Environment Config & Secret Drift Auditor**: Compares `.env` against `.env.example`, detects undeclared code references (`process.env`), and flags leaked secrets (`vp.envDriftAudit` / `veloprove env-drift`).
- **Dead Code, CSS & Unused Asset Purge Engine**: Scans projects for unreferenced image assets, font files, and dead CSS rules, with safe one-click disk space reclamation (`vp.deadAssetPurge` / `veloprove dead-assets --purge`).
- **Microservices & Architecture Dependency Graph**: Maps frontend UI, backend APIs, databases, caches, and third-party cloud SDKs into interactive topology graphs and Mermaid diagrams (`vp.architectureGraph` / `veloprove arch-graph`).
- **ESLint & Static Code Quality Engine**: Zero-config static analysis, rule enforcement, and auto-fixing (`vp.lint` / `veloprove lint --fix`).
- **BDD Gherkin Feature Spec Generator**: Automated compilation of discovered PRD requirements into standard `.feature` files and step definition skeletons (`vp.bddFeatures` / `veloprove bdd`).
- **Interactive Real-Time Test Watch Mode**: Instant feedback loop on code save (`veloprove watch`).
- **Ephemeral Mock DB & Environment Isolation**: In-memory database and HTTP sandbox (`veloprove sandbox`).

### AI Agent Integration & LLM Testing
- **Universal AI Agent Handshake & Discovery**: Self-teaching protocol (`vp.bootstrap` / `veloprove teach-ai`, alias `agent-handshake`) for any AI editor or agent (Cursor, Windsurf, Claude Code, Cline, Codex, GitHub Copilot).
- **Custom & In-House Framework Self-Teaching**: Dynamic framework ingestion from `AGENTS.md` and custom routing specs (`vp.learnFramework` / `veloprove learn-framework`).
- **LLM & AI Output Hallucination & Accuracy Evaluator**: Evaluates AI model outputs against ground truth facts, forbidden toxic tokens, and validates JSON schema compliance (`vp.aiEvaluate` / `veloprove ai-eval`).

### CLI, MCP, Dashboard & Reporting
- **Cursor-like Dashboard Layout**: Sidebar navigation with detail/results split panes and developer-oriented dark theme (`veloprove ui`).
- **Dashboard Spacing Polish**: Consistent vertical rhythm across all panes — larger card padding, section gaps, and unified action-row spacing.
- **Official Brand Assets**: Dashboard favicon/sidebar use `veloprove-icon.svg`; About pane and README use `veloprove-logo.svg`.
- **CLI Icon Banner**: Startup/help banner uses an ASCII mark matching the official icon (navy V + green proof) instead of the old cyan block wordmark.
- **Dashboard SSE Streaming**: Live Results console via `GET /api/events` while actions run.
- **Sidebar Tool Parity**: Security Suite, Web-Sec, Dedup, Screen Reader, Bisect, Throttle, A11y, Explore, and Release Gate exposed in the UI.
- **Results Pane UX**: Loading/empty/error states plus Copy & Download JSON; `Ctrl/Cmd+K` focuses tool search.
- **Session Theft / Hijacking Security Suite**: Non-destructive tests for cookie flag gaps, session IDs in URLs, session fixation, client-side token storage, and logout invalidation (`vp.securityRun` / `veloprove security --sessions`).
- **Smart DevServer Auto-Launcher**: Probe offline apps and start `npm/pnpm/yarn/bun` scripts (`vp.ensureDev` / `veloprove ensure-dev`, also `--ensure-dev` on security/explore).
- **Security Policy Wizard**: Generate baseline/OWASP ASVS/SOC2/HIPAA starter policies (`veloprove security --init-policy`).
- **MCP namespace `vp.*` only**: Tools are registered and invoked as `vp.*` (no `qa.*` compatibility aliases).
- **Dashboard UX**: Arrow-key tool nav, collapsible sidebar/results, Ensure Dev action.
- **Dual Interfaces**: High-ergonomics CLI (**75** commands) + MCP Server (stdio) with **75** structured tools.
- **Environment & Installation Doctor**: Built-in diagnostics command (`vp.doctor` / `veloprove doctor`) checking Node.js version, package manager, test framework detection, MCP configuration, and filesystem permissions with actionable remediations.
- **Production Packaging & NPX Architecture**: Strict npm allowlist (`docs/AGENTS.md`, `docs/guides`, `docs/reference`, `docs/assets`, `extensions/recorder`, `dist`, root README/CHANGELOG/LICENSE), isolated from development sources and test fixtures.
- **Idempotent Non-Destructive Project Initialization**: Enhanced `npx veloprove init` detecting package managers (npm, pnpm, yarn, bun), scaffolding `.veloprove/` directories, and adding non-destructive convenience scripts to `package.json`.
- **Pre-Release Integrity Automation**: Automated pre-pack validation (`npm run release:check`) verifying package size (< 5MB), allowlisted assets, executable shebangs, and zero forbidden development files.
- **Local Live HTML Dashboard**: Interactive quality command center (`veloprove ui`) with real-time metrics, Action Hub, Postman client, and embedded Doctor diagnostics.
- **Interactive Terminal Command Center (TUI)**: Live terminal quality matrix and shortcuts dashboard (`veloprove tui`).
- **Interactive Dashboard Guide & Docs Tab**: Complete embedded user & agent guide in the UI dashboard with keyword search and CLI reference.
- **Standalone Executive Audit & QA Report Exporter**: Self-contained, responsive single-file HTML/JSON/Markdown executive report generator (`vp.exportReport` / `veloprove export-report`).
- **Webhook Alerts & Notification Dispatcher**: Dispatches test run verdicts, quality scores, and security alerts directly to Slack, Discord, MS Teams, or webhooks (`vp.sendAlert` / `veloprove alert`).
- **CI Workflow Generator**: GitHub Actions autonomous quality gate (`veloprove setup-ci`).
- **PRD Requirements Coverage Heatmap**: Color-coded functional requirement coverage matrix (`vp.coverage` / `veloprove coverage`).
