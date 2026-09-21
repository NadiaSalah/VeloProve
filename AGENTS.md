# VeloProve Universal Agent Instructions

This repository is equipped with **VeloProve** (Local Autonomous QA Engine).

**Consumer playbook (full `vp.*` catalog — see `docs/reference/mcp.md`, install loop):** after `npm install`, use packaged [`docs/AGENTS.md`](docs/AGENTS.md). This root file is the **contributor** protocol for developing VeloProve itself.

## How to Test and Verify Code Changes

### 1. Discover & Inspect
- Call `vp.inspect` or run `npx veloprove inspect` to load the active tech stack, routes, API endpoints, and discovered PRD requirements.
- Call `vp.doctor` or run `npx veloprove doctor` to diagnose Node.js version, test runner availability, and project configuration health.
- Call `vp.bootstrap` or run `npx veloprove teach-ai` (alias: `agent-handshake`) for the universal agent self-teaching handshake.
- For interactive live route analysis, call `vp.explore` or run `npx veloprove explore`.

### 2. Plan & Generate Tests
- Call `vp.plan` or run `npx veloprove plan` to generate a prioritized, risk-scored test plan.
- Call `vp.generate` or run `npx veloprove generate` to materialize compiling test files without overwriting developer tests.

### 3. Verify Code Changes & Run Impacted Tests
- After making code changes, call `vp.changed` or run `npx veloprove changed` to identify only the affected tests.
- Execute tests with `vp.run({ scope: "changed" })` or `vp.run({ paths: [...] })`.
- Poll async run status with `vp.run.get` when using long-running MCP executions.

### 4. Failure Diagnosis & Safe Healing
- If a test fails, call `vp.diagnose` to retrieve root-cause evidence (`APPLICATION_BUG`, `TEST_BUG`, `FLAKY_TEST`, `NETWORK_FAILURE`).
- If classified as `TEST_BUG`, call `vp.heal` or run `npx veloprove heal` to repair brittle locators automatically.
- If classified as `APPLICATION_BUG`, call `vp.suggestFix` (MCP-only) to inspect source code fix recommendations.
- Call `vp.flaky` (MCP-only) to inspect flaky-test history; quarantine with `vp.quarantine` / `npx veloprove quarantine`.
- To adjust assertions with natural language, call `vp.refine` or run `npx veloprove refine "instruction"`.

### 5. Quality, Security & Contract Audits
- **Static Code Analysis (ESLint)**: Call `vp.lint` or run `npx veloprove lint --fix` to enforce linting rules.
- **Security & Secret Scanning**: Call `vp.auditSec` or run `npx veloprove audit` to scan for CVEs and exposed keys.
- **Ad-hoc HTTP**: Call `vp.sendRequest` or run `npx veloprove request GET <url>` for Postman-style requests.
- **Performance & Web Vitals**: Call `vp.perf` or run `npx veloprove perf` to audit route performance.
- **Network Mocks (MSW)**: Call `vp.mockNetwork` or run `npx veloprove mock-gen` to generate MSW mock handlers.
- **Flaky Test Quarantine**: Call `vp.quarantine` or run `npx veloprove quarantine` to isolate unstable tests.
- **Coverage Heatmap**: Call `vp.coverage` or run `npx veloprove coverage` to generate PRD coverage heatmaps.
- **Accessibility**: Call `vp.accessibility` or run `npx veloprove a11y` to run WCAG 2.1 checks.
- **Visual Drift**: Call `vp.visualDiff` or run `npx veloprove visual-diff` to compare screenshot baselines.
- **API Drift**: Call `vp.contractDrift` or run `npx veloprove contract-drift` to check OpenAPI contract drift.
- **Security Fuzzing**: Call `vp.fuzzApi` or run `npx veloprove fuzz-api` to generate API boundary probes.
- **Postman Collection Testing & Runner**: Call `vp.runCollection` or run `npx veloprove run-collection <file>` to execute Postman v2.1 collections with chained auth variables.
- **Postman Collection Export**: Call `vp.exportCollection` or run `npx veloprove export-postman` to export routes as Postman JSON.
- **Local Load & Stress Testing**: Call `vp.loadTest` or run `npx veloprove load <url> -c 20 -d 5` to benchmark RPS and p95 latency.
- **AI Mock Data Factory**: Call `vp.mockData` or run `npx veloprove mock-data -p user -c 5` to generate realistic test fixtures.
- **OWASP Top 10 Security Audit**: Call `vp.owaspScan` or run `npx veloprove owasp-scan <url>` to audit CSP, CORS, and header flaws.
- **GraphQL & WebSocket Real-time**: Call `vp.graphqlTest` or `vp.wsTest` (CLI: `npx veloprove graphql`, `npx veloprove ws-test`).
- **Live Remote Companion Bridge**: Generate probe with `vp.remoteInit` (`npx veloprove remote-init`), verify connection with `vp.remoteConnect` (`npx veloprove remote-connect <url>`), and run live audits with `vp.remoteAudit` (`npx veloprove remote-audit <url>`).
- **E2E Scenario Recorder**: Synthesize user journeys into Playwright tests (`vp.recordScenario` / `npx veloprove record-scenario`).
- **Flakiness Stabilizer**: Auto-refactor brittle tests to web-first assertions (`vp.stabilizeFlaky` / `npx veloprove stabilize --fix`).
- **Database Snapshot & Rollback**: Freeze and restore database/fixture state (`vp.dbSnapshot`, `vp.dbRestore` / `npx veloprove db-snapshot`, `npx veloprove db-restore`).
- **Automated Bug-Fixing**: Synthesize source code fixes for application bugs (`vp.autoBugFix` / `npx veloprove auto-fix`).
- **Standalone Report Export**: Export single-file executive QA & Security report (`vp.exportReport` / `npx veloprove export-report`).
- **Autonomous Chaos Monkey**: Test resilience against malformed inputs & crashes (`vp.chaosTest` / `npx veloprove chaos <url>`).
- **Isolated Docker Orchestrator**: Generate ephemeral containerized test databases (`vp.dockerEnv` / `npx veloprove docker-env`).
- **Cross-Browser Matrix**: Multi-browser & mobile viewport Playwright matrix (`vp.browserMatrix` / `npx veloprove browser-matrix`).
- **BDD Gherkin Generator**: Compile PRD requirements to .feature files (`vp.bddFeatures` / `npx veloprove bdd`).
- **Webhook Alert Notifications**: Dispatch test verdicts to Slack/Discord/Teams (`vp.sendAlert` / `npx veloprove alert <webhookUrl>`).
- **UI Feature Parity & Ghost Feature Audit**: Detect UI options without backend code (`vp.featureParity` / `npx veloprove feature-parity`).
- **Malware & Backdoor Scanner with Auto-Remediation**: Detect and neutralize obfuscated payloads & backdoors (`vp.scanMalware`, `vp.remediateMalware` / `npx veloprove scan-malware --fix`).
- **AI & LLM Hallucination Evaluator**: Audit AI model outputs against ground truth (`vp.aiEvaluate` / `npx veloprove ai-eval <url>`).
- **Git Bisect Regression Hunter**: Pinpoint bug-introducing commits (`vp.gitBisect` / `npx veloprove bisect`).
- **Network Throttling Simulator**: Simulate 3G/GPRS and offline drops (`vp.networkThrottle` / `npx veloprove throttle <url>`).
- **Smart Contract Security Auditor**: Solidity & Web3 vulnerability scanner (`vp.smartContractAudit` / `npx veloprove audit-contracts`).
- **Dead Asset & CSS Purge**: Clean unreferenced image assets and dead CSS (`vp.deadAssetPurge` / `npx veloprove dead-assets --purge`).
- **Screen Reader & Audio Flow Simulator**: Simulate NVDA / VoiceOver reading flow (`vp.screenReaderSim` / `npx veloprove screen-reader`).
- **SQL N+1 & DB Query Auditor**: Audit queries in loops & missing indices (`vp.dbQueryAudit` / `npx veloprove db-audit`).
- **Multi-Env Config & Secret Drift**: Compare .env files & detect undeclared vars (`vp.envDriftAudit` / `npx veloprove env-drift`).
- **Failure Replay Recorder**: Synthesize visual timeline replay for test failures (`vp.recordFailureReplay` / `npx veloprove replay`).
- **API Rate-Limiting & DoS Profiler**: Probe 429 throttling & burst resilience (`vp.rateLimitAudit` / `npx veloprove rate-limit <url>`).
- **Stateful Dynamic Mock Server**: Local zero-cloud in-memory stateful CRUD REST server (`vp.statefulMock` / `npx veloprove mock-server`).
- **Architecture Dependency Graph**: Topology graph of UI, APIs, DBs & Cloud SDKs (`vp.architectureGraph` / `npx veloprove arch-graph`).
- **Comprehensive Security Testing (Auth, AuthZ, Injections, Forms, Sessions/Session-Theft, Uploads)**: Discover attack surfaces (`vp.securityScan`), plan test cases (`vp.securityPlan`), and execute non-destructive tests with severity & confidence (`vp.securityRun`, `vp.securityReport` / `npx veloprove security --safe`). Session theft suite covers cookie flags, URL session leaks, fixation, client-side token storage, and logout invalidation (`veloprove security --sessions`).
- **SARIF Security Report Export**: Export standard SARIF v2.1.0 for GitHub Code Scanning (`vp.exportSarif` / `npx veloprove security --sarif <path>`).
- **Subresource Integrity (SRI), CSRF & CORS Validator**: Audit external CDN assets, mutating form CSRF protections, and wildcard CORS policies (`vp.auditSriCsrf` / `npx veloprove web-sec`).
- **Test Suite Deduplication & Redundancy Engine**: Detect duplicate test assertions and redundancy percentages (`vp.dedupTests` / `npx veloprove dedup`).
- **Automated Git Pre-Commit Hook**: Install or remove automated pre-commit change impact verification hooks (`npx veloprove hook install`, `npx veloprove hook uninstall`).
- **Mutation Quality**: Call `vp.mutationScore` or run `npx veloprove mutation-score` to evaluate test sensitivity.
- **Custom Framework Self-Teaching**: Call `vp.learnFramework` or run `npx veloprove learn-framework` to learn uncommon stacks.

### 6. Release Gate & Confidence Check
- Call `vp.verify` or run `npx veloprove verify --ci` for change-aware autonomous QA, or `vp.releaseCheck` / `npx veloprove release --ci` for the release confidence gate alone.
- Call `vp.history` or run `npx veloprove history` to inspect local pass-rate / duration trends.
- Call `vp.ensureDev` or run `npx veloprove ensure-dev` (also `--ensure-dev` on security/explore) to auto-start the local app when offline.
- For live browser-based execution, launch `npx veloprove ui` or the interactive terminal command center `npx veloprove tui`.

---

## Mandatory Post-Modification Protocol (إلزامية التزامن والتنظيف والاختبار)

Any coding agent working on this repository MUST strictly follow this 5-step protocol on **every code or feature change**:

1. **Immediate Verification & Test Execution (اختبار فوري)**:
   - Run affected and full test suites (`npm run test` or `vp.run`) immediately after making changes to prevent regressions.
2. **Synchronized Ecosystem Updates (تحديث متزامن لكافة الواجهات والتوثيق)**:
   - **CLI (`src/cli/index.ts`)**: Add/update CLI commands, flags, and help descriptions.
   - **MCP Server (`src/mcp/server.ts`)**: Update tool schemas and handlers.
   - **Dashboard (`src/application/dashboard-server.ts`)**: Update action triggers, data endpoints, metrics cards, and tab views when applicable.
   - **Documentation (`.md` files & `docs/`)**: Update `README.md`, root `AGENTS.md` (contributor), packaged `docs/AGENTS.md` (consumer), `CHANGELOG.md`, and relevant files under `docs/guides/` and `docs/reference/` (see `docs/README.md`).
3. **Dead Code & Redundancy Purge (تنظيف الكود المكرر والقديم)**:
   - Search for and delete unused, legacy, or duplicate code, dead imports, and obsolete comments across modified areas.
4. **Public Interface Parity & Integrity Validation (التحقق من تطابق الواجهات)**:
   - Verify CLI registration, MCP registration, Dashboard exposure (when applicable), docs, tests, and examples.
   - Run the interface parity/integrity automated test (`npm test -- tests/unit/interface-parity.test.ts`).
5. **Final Build & Test Validation (التحقق النهائي)**:
   - Always run `npm run build` and `npm run test` as the final step before concluding. Ensure 0 linter errors and 100% test pass rate.

