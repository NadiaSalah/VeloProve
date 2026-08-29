# QAForge Universal Agent Instructions

This repository is equipped with **QAForge** (Local Autonomous QA Engine).

## How to Test and Verify Code Changes

### 1. Discover & Inspect
- Call `qa.inspect` or run `npx qaforge inspect` to load the active tech stack, routes, API endpoints, and discovered PRD requirements.
- Call `qa.doctor` or run `npx qaforge doctor` to diagnose Node.js version, test runner availability, and project configuration health.
- For interactive live route analysis, call `qa.explore` or run `npx qaforge explore`.

### 2. Plan & Generate Tests
- Call `qa.plan` or run `npx qaforge plan` to generate a prioritized, risk-scored test plan.
- Call `qa.generate` or run `npx qaforge generate` to materialize compiling test files without overwriting developer tests.

### 3. Verify Code Changes & Run Impacted Tests
- After making code changes, call `qa.changed` or run `npx qaforge changed` to identify only the affected tests.
- Execute tests with `qa.run({ scope: "changed" })` or `qa.run({ paths: [...] })`.

### 4. Failure Diagnosis & Safe Healing
- If a test fails, call `qa.diagnose` to retrieve root-cause evidence (`APPLICATION_BUG`, `TEST_BUG`, `FLAKY_TEST`, `NETWORK_FAILURE`).
- If classified as `TEST_BUG`, call `qa.heal` or run `npx qaforge heal` to repair brittle locators automatically.
- If classified as `APPLICATION_BUG`, call `qa.suggestFix` to inspect source code fix recommendations.
- To adjust assertions with natural language, call `qa.refine` or run `npx qaforge refine "instruction"`.

### 5. Quality, Security & Contract Audits
- **Static Code Analysis (ESLint)**: Call `qa.lint` or run `npx qaforge lint --fix` to enforce linting rules.
- **Security & Secret Scanning**: Call `qa.auditSec` or run `npx qaforge audit` to scan for CVEs and exposed keys.
- **Performance & Web Vitals**: Call `qa.perf` or run `npx qaforge perf` to audit route performance.
- **Network Mocks (MSW)**: Call `qa.mockNetwork` or run `npx qaforge mock-gen` to generate MSW mock handlers.
- **Flaky Test Quarantine**: Call `qa.quarantine` or run `npx qaforge quarantine` to isolate unstable tests.
- **Coverage Heatmap**: Call `qa.coverage` or run `npx qaforge coverage` to generate PRD coverage heatmaps.
- **Accessibility**: Call `qa.accessibility` or run `npx qaforge a11y` to run WCAG 2.1 checks.
- **Visual Drift**: Call `qa.visualDiff` or run `npx qaforge visual-diff` to compare screenshot baselines.
- **API Drift**: Call `qa.contractDrift` or run `npx qaforge contract-drift` to check OpenAPI contract drift.
- **Security Fuzzing**: Call `qa.fuzzApi` or run `npx qaforge fuzz-api` to generate API boundary probes.
- **Postman Collection Testing & Runner**: Call `qa.runCollection` or run `npx qaforge run-collection <file>` to execute Postman v2.1 collections with chained auth variables.
- **Postman Collection Export**: Call `qa.exportCollection` or run `npx qaforge export-postman` to export routes as Postman JSON.
- **Local Load & Stress Testing**: Call `qa.loadTest` or run `npx qaforge load-test <url> -u 20 -d 5` to benchmark RPS and p95 latency.
- **AI Mock Data Factory**: Call `qa.mockData` or run `npx qaforge mock-data -p user -c 5` to generate realistic test fixtures.
- **OWASP Top 10 Security Audit**: Call `qa.owaspScan` or run `npx qaforge owasp-scan <url>` to audit CSP, CORS, and header flaws.
- **GraphQL & WebSocket Real-time**: Call `qa.graphqlTest` or `qa.wsTest` (CLI: `npx qaforge graphql`, `npx qaforge ws-test`).
- **Live Remote Companion Bridge**: Generate probe with `qa.remoteInit` (`npx qaforge remote-init`), verify connection with `qa.remoteConnect` (`npx qaforge remote-connect <url>`), and run live audits with `qa.remoteAudit` (`npx qaforge remote-audit <url>`).
- **E2E Scenario Recorder**: Synthesize user journeys into Playwright tests (`qa.recordScenario` / `npx qaforge record-scenario`).
- **Flakiness Stabilizer**: Auto-refactor brittle tests to web-first assertions (`qa.stabilizeFlaky` / `npx qaforge stabilize --fix`).
- **Database Snapshot & Rollback**: Freeze and restore database/fixture state (`qa.dbSnapshot`, `qa.dbRestore` / `npx qaforge db-snapshot`, `npx qaforge db-restore`).
- **Automated Bug-Fixing**: Synthesize source code fixes for application bugs (`qa.autoBugFix` / `npx qaforge auto-fix`).
- **Standalone Report Export**: Export single-file executive QA & Security report (`qa.exportReport` / `npx qaforge export-report`).
- **Autonomous Chaos Monkey**: Test resilience against malformed inputs & crashes (`qa.chaosTest` / `npx qaforge chaos <url>`).
- **Isolated Docker Orchestrator**: Generate ephemeral containerized test databases (`qa.dockerEnv` / `npx qaforge docker-env`).
- **Cross-Browser Matrix**: Multi-browser & mobile viewport Playwright matrix (`qa.browserMatrix` / `npx qaforge browser-matrix`).
- **BDD Gherkin Generator**: Compile PRD requirements to .feature files (`qa.bddFeatures` / `npx qaforge bdd`).
- **Webhook Alert Notifications**: Dispatch test verdicts to Slack/Discord/Teams (`qa.sendAlert` / `npx qaforge alert <webhookUrl>`).
- **UI Feature Parity & Ghost Feature Audit**: Detect UI options without backend code (`qa.featureParity` / `npx qaforge feature-parity`).
- **Malware & Backdoor Scanner with Auto-Remediation**: Detect and neutralize obfuscated payloads & backdoors (`qa.scanMalware`, `qa.remediateMalware` / `npx qaforge scan-malware --fix`).
- **AI & LLM Hallucination Evaluator**: Audit AI model outputs against ground truth (`qa.aiEvaluate` / `npx qaforge ai-eval <url>`).
- **Git Bisect Regression Hunter**: Pinpoint bug-introducing commits (`qa.gitBisect` / `npx qaforge bisect`).
- **Network Throttling Simulator**: Simulate 3G/GPRS and offline drops (`qa.networkThrottle` / `npx qaforge throttle <url>`).
- **Smart Contract Security Auditor**: Solidity & Web3 vulnerability scanner (`qa.smartContractAudit` / `npx qaforge audit-contracts`).
- **Dead Asset & CSS Purge**: Clean unreferenced image assets and dead CSS (`qa.deadAssetPurge` / `npx qaforge dead-assets --purge`).
- **Screen Reader & Audio Flow Simulator**: Simulate NVDA / VoiceOver reading flow (`qa.screenReaderSim` / `npx qaforge screen-reader`).
- **SQL N+1 & DB Query Auditor**: Audit queries in loops & missing indices (`qa.dbQueryAudit` / `npx qaforge db-audit`).
- **Multi-Env Config & Secret Drift**: Compare .env files & detect undeclared vars (`qa.envDriftAudit` / `npx qaforge env-drift`).
- **Failure Replay Recorder**: Synthesize visual timeline replay for test failures (`qa.recordFailureReplay` / `npx qaforge replay`).
- **API Rate-Limiting & DoS Profiler**: Probe 429 throttling & burst resilience (`qa.rateLimitAudit` / `npx qaforge rate-limit <url>`).
- **Stateful Dynamic Mock Server**: Local zero-cloud in-memory stateful CRUD REST server (`qa.statefulMock` / `npx qaforge mock-server`).
- **Architecture Dependency Graph**: Topology graph of UI, APIs, DBs & Cloud SDKs (`qa.architectureGraph` / `npx qaforge arch-graph`).
- **Mutation Quality**: Call `qa.mutationScore` or run `npx qaforge mutation-score` to evaluate test sensitivity.




- **Custom Framework Self-Teaching**: Call `qa.learnFramework` or run `npx qaforge learn-framework` to learn uncommon stacks.

### 6. Release Gate & Confidence Check
- Before concluding a PR or major refactor, call `qa.releaseCheck` or run `npx qaforge release --ci`.
- For live browser-based execution, launch `npx qaforge ui` or the interactive terminal command center `npx qaforge tui`.

---

## Mandatory Post-Modification Protocol (إلزامية التزامن والتنظيف والاختبار)

Any coding agent working on this repository MUST strictly follow this 5-step protocol on **every code or feature change**:

1. **Immediate Verification & Test Execution (اختبار فوري)**:
   - Run affected and full test suites (`npm run test` or `qa.run`) immediately after making changes to prevent regressions.
2. **Synchronized Ecosystem Updates (تحديث متزامن لكافة الواجهات والتوثيق)**:
   - **CLI (`src/cli/index.ts`)**: Add/update CLI commands, flags, and help descriptions.
   - **MCP Server (`src/mcp/server.ts`)**: Update tool schemas and handlers.
   - **Dashboard (`src/application/dashboard-server.ts`)**: Update action triggers, data endpoints, metrics cards, and tab views when applicable.
   - **Documentation (`.md` files & `docs/`)**: Update `README.md`, `AGENTS.md`, `CHANGELOG.md`, and relevant files under `docs/` with usage guides and concrete examples.
3. **Dead Code & Redundancy Purge (تنظيف الكود المكرر والقديم)**:
   - Search for and delete unused, legacy, or duplicate code, dead imports, and obsolete comments across modified areas.
4. **Public Interface Parity & Integrity Validation (التحقق من تطابق الواجهات)**:
   - Verify CLI registration, MCP registration, Dashboard exposure (when applicable), docs, tests, and examples.
   - Run the interface parity/integrity automated test (`npm test -- tests/unit/interface-parity.test.ts`).
5. **Final Build & Test Validation (التحقق النهائي)**:
   - Always run `npm run build` and `npm run test` as the final step before concluding. Ensure 0 linter errors and 100% test pass rate.

