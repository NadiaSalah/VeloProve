# 02_FEATURE_INVENTORY.md — QAForge Comprehensive Feature Inventory

This document details every single feature implemented in QAForge, verified directly against the TypeScript source code.

---

### FEATURE-001: Automatic Stack & Monorepo Detection
- **Feature ID**: `FEATURE-001`
- **Name**: Project Stack, Framework & Monorepo Detector
- **Category**: `intelligence_discovery`
- **Status**: `COMPLETE`
- **Risk**: `LOW`
- **User Value**: Zero-configuration bootstrapping by automatically recognizing React, Next.js, Vue, Svelte, Express, NestJS, and monorepo packages.
- **Trigger**: CLI `qaforge inspect`, `qaforge init`, MCP `qa.inspect`, `QAForgeEngine.inspect()`.
- **Entry Point**: `src/intelligence/project-scanner/index.ts` -> `ProjectScanner.scan()`
- **Files**:
  - `src/intelligence/project-scanner/index.ts`
  - `src/intelligence/project-scanner/stack-detector.ts`
  - `src/intelligence/project-scanner/source-mapper.ts`
- **Symbols**: `ProjectScanner`, `StackDetector.detect()`, `SourceMapper.scan()`
- **Dependencies**: `node:fs`, `node:path`
- **Inputs**: `projectRoot: string`
- **Outputs**: `ProjectProfile` object containing `frameworks`, `testFrameworks`, `buildTools`, `routes`, `apiEndpoints`, `applications`.
- **Side Effects**: Saves active profile in `.qaforge/state/profile.json` if storage is active.
- **Strategy**:
  1. Inspects root `package.json` dependencies and devDependencies.
  2. Scans for configuration files (`tsconfig.json`, `vite.config.ts`, `next.config.js`, `nx.json`, `lerna.json`).
  3. Iterates through monorepo folders (`apps/`, `packages/`, `services/`, `libs/`) to detect sub-applications.
  4. Scans all source and test files excluding ignored directories (`node_modules`, `.git`, `dist`, `.next`).
- **Execution Flow**: `inspect()` -> `StackDetector.detect()` -> `RouteScanner.scan()` -> `SourceMapper.scan()` -> build `ProjectProfile`.
- **Failure Handling**: Gracefully falls back to `'vanilla'` framework and default port `3000` if `package.json` is missing or corrupted.
- **Existing Tests**: `tests/unit/scanner-requirements.test.ts`, `tests/unit/v100-stability-enhancements.test.ts`
- **Missing Tests**: Testing monorepo with circular symlinks or deeply nested pnpm workspaces.
- **Documentation**: `docs/FEATURES_GUIDE.md` (Section 1), `README.md`.

---

### FEATURE-002: Next.js & REST Route Extraction
- **Feature ID**: `FEATURE-002`
- **Name**: Route and API Endpoint AST Scanner
- **Category**: `intelligence_discovery`
- **Status**: `COMPLETE`
- **Risk**: `LOW`
- **User Value**: Discovers all pages, layouts, dynamic routes (`/users/:id`), and REST endpoints from source files automatically.
- **Trigger**: CLI `qaforge inspect`, MCP `qa.inspect`, `RouteScanner.scan()`.
- **Entry Point**: `src/intelligence/project-scanner/route-scanner.ts` -> `RouteScanner.scan()`
- **Files**: `src/intelligence/project-scanner/route-scanner.ts`
- **Symbols**: `RouteScanner.scan()`, `RouteScanner.scanAppRouter()`, `RouteScanner.scanPagesRouter()`, `RouteScanner.scanExpressEndpoints()`
- **Dependencies**: `node:fs`, `node:path`
- **Inputs**: `projectRoot: string`
- **Outputs**: `{ routes: RouteDefinition[], apiEndpoints: ApiEndpoint[] }`
- **Side Effects**: None (read-only filesystem scan).
- **Strategy**:
  - Traverses Next.js App Router (`app/**/page.tsx`, `app/**/route.ts`).
  - Traverses Next.js Pages Router (`pages/**/*.tsx`, `pages/api/**/*.ts`).
  - RegEx parses Express/Fastify route declarations (`app.get(...)`, `router.post(...)`).
  - Converts bracket syntax `[id]` to dynamic route parameter syntax `:id`.
- **Existing Tests**: `tests/unit/scanner-requirements.test.ts`
- **Documentation**: `docs/FEATURES_GUIDE.md` (Section 2).

---

### FEATURE-003: Spec-Driven Requirement Ingestion (PRD & OpenAPI)
- **Feature ID**: `FEATURE-003`
- **Name**: Requirement & Contract Discovery Parser
- **Category**: `requirements_engine`
- **Status**: `COMPLETE`
- **Risk**: `LOW`
- **User Value**: Parses PRD Markdown files and OpenAPI 3.0 specs to extract testable functional criteria.
- **Trigger**: `RequirementDiscovery.discover(profile)`
- **Entry Point**: `src/intelligence/requirement-discovery/index.ts`
- **Files**:
  - `src/intelligence/requirement-discovery/index.ts`
  - `src/intelligence/requirement-discovery/prd-parser.ts`
  - `src/intelligence/requirement-discovery/openapi-parser.ts`
- **Symbols**: `RequirementDiscovery.discover()`, `PrdParser.parse()`, `OpenApiParser.parse()`
- **Inputs**: `ProjectProfile`
- **Outputs**: `DiscoveredRequirement[]`
- **Strategy**: Extracts user stories, acceptance criteria, HTTP methods, status codes, and path parameters; infers requirements from discovered routes when no formal PRD is provided.
- **Existing Tests**: `tests/unit/scanner-requirements.test.ts`
- **Documentation**: `docs/FEATURES_GUIDE.md` (Section 3).

---

### FEATURE-004: Git Diff Change Impact Analysis
- **Feature ID**: `FEATURE-004`
- **Name**: Git Change Impact & Test Isolation Engine
- **Category**: `test_orchestration`
- **Status**: `COMPLETE`
- **Risk**: `MEDIUM`
- **User Value**: Identifies only the test files affected by recent git modifications, reducing test execution time by up to 90%.
- **Trigger**: CLI `qaforge changed`, `qaforge test -s changed`, MCP `qa.changed`.
- **Entry Point**: `src/application/analyze-changes.ts` -> `AnalyzeChangesService.analyze()`
- **Files**:
  - `src/application/analyze-changes.ts`
  - `src/intelligence/change-impact/git-diff-analyzer.ts`
  - `src/intelligence/change-impact/dependency-graph.js`
- **Symbols**: `AnalyzeChangesService.analyze()`, `GitDiffAnalyzer.getChangedFiles()`, `DependencyGraph.build()`
- **Dependencies**: `node:child_process` (git diff), `node:fs`
- **Inputs**: Optional `baseBranch: string` (default: `'HEAD~1'` or unstaged working tree).
- **Outputs**: `ImpactAnalysisResult` ({ `changedFiles`, `impactedTestFiles`, `directImpact`, `transitiveImpact` }).
- **Strategy**: Runs `git status` / `git diff`, parses modified files, traverses the reverse import graph, and finds all test files that import or reference the changed modules.
- **Existing Tests**: `tests/unit/change-impact.test.ts`
- **Documentation**: `docs/FEATURES_GUIDE.md` (Section 4).

---

### FEATURE-005: Risk-Scored Test Planning
- **Feature ID**: `FEATURE-005`
- **Name**: Risk-Prioritized Test Planner
- **Category**: `test_planning`
- **Status**: `COMPLETE`
- **Risk**: `LOW`
- **User Value**: Generates prioritized, risk-weighted test plans balancing coverage, execution budget, and criticality.
- **Trigger**: CLI `qaforge plan`, MCP `qa.plan`, `QAForgeEngine.plan()`.
- **Entry Point**: `src/application/plan-tests.ts` -> `PlanTestsService.createPlan()`
- **Files**:
  - `src/application/plan-tests.ts`
  - `src/domain/risk/risk-scorer.ts`
- **Symbols**: `PlanTestsService.createPlan()`, `RiskScorer.scoreRequirement()`
- **Inputs**: `ProjectProfile`, `DiscoveredRequirement[]`, `PlanTestsOptions` (`scope`, `maxTests`, `impactedTestFiles`).
- **Outputs**: `TestPlan` with risk scores (0-100) and priority tiers (`critical`, `high`, `medium`, `low`).
- **Strategy**: Multi-factor scoring weighting route complexity, dynamic parameters, authentication requirements, and recent change history.
- **Existing Tests**: `tests/integration/autonomous-flow.test.ts`
- **Documentation**: `docs/FEATURES_GUIDE.md` (Section 5).

---

### FEATURE-006: Compiling Test Code Generation
- **Feature ID**: `FEATURE-006`
- **Name**: Multi-Framework Test File Synthesizer
- **Category**: `test_generation`
- **Status**: `COMPLETE`
- **Risk**: `MEDIUM`
- **User Value**: Generates clean, compiling TypeScript test suites for Vitest, Jest, and Playwright without overwriting existing tests.
- **Trigger**: CLI `qaforge generate`, MCP `qa.generate`.
- **Entry Point**: `src/application/generate-tests.ts` -> `GenerateTestsService.generate()`
- **Files**:
  - `src/application/generate-tests.ts`
  - `src/domain/tests/test-generator.ts`
- **Symbols**: `GenerateTestsService.generate()`, `TestGenerator.generateFile()`
- **Inputs**: `TestPlan`, `ProjectProfile`, `OverwritePolicy` (`'never' | 'generated-only' | 'explicit'`).
- **Outputs**: `GeneratedTestFile[]` written safely to `tests/unit/` or `tests/e2e/`.
- **Strategy**: Emits idiomatic test code using web-first assertions (`expect(locator).toBeVisible()`), valid import paths, and cleanup blocks.
- **Existing Tests**: `tests/integration/autonomous-flow.test.ts`
- **Documentation**: `docs/FEATURES_GUIDE.md` (Section 6).

---

### FEATURE-007: Evidence-Based Failure Diagnostics & Classification
- **Feature ID**: `FEATURE-007`
- **Name**: Failure Root Cause Classifier
- **Category**: `diagnostics`
- **Status**: `COMPLETE`
- **Risk**: `MEDIUM`
- **User Value**: Distinguishes application bugs from test locator bugs, network failures, and flaky tests with confidence scores.
- **Trigger**: CLI `qaforge diagnose`, MCP `qa.diagnose`.
- **Entry Point**: `src/application/diagnose-failure.ts`
- **Files**:
  - `src/application/diagnose-failure.ts`
  - `src/diagnostics/classifier.ts`
  - `src/diagnostics/evidence-collector.ts`
- **Symbols**: `DiagnoseFailureService.diagnose()`, `Classifier.classify()`, `EvidenceCollector.collect()`
- **Outputs**: `DiagnosticResult` (`APPLICATION_BUG`, `TEST_BUG`, `FLAKY_TEST`, `NETWORK_FAILURE`, `TIMEOUT`).
- **Strategy**: Parses stack traces, assertion diffs, browser console errors, and locator syntax errors through deterministic classification rules.
- **Existing Tests**: `tests/unit/classifier-diagnostics.test.ts`
- **Documentation**: `docs/FEATURES_GUIDE.md` (Section 7).

---

### FEATURE-008: Visual-Aria Test Self-Healing
- **Feature ID**: `FEATURE-008`
- **Name**: Visual-Aria Test Locator Auto-Healer
- **Category**: `healing`
- **Status**: `COMPLETE`
- **Risk**: `MEDIUM`
- **User Value**: Automatically repairs broken or brittle test selectors using accessibility roles and Visual-Aria hierarchies.
- **Trigger**: CLI `qaforge heal`, MCP `qa.heal`.
- **Entry Point**: `src/application/heal-test.ts` / `src/application/visual-autoheal.ts`
- **Files**:
  - `src/application/heal-test.ts`
  - `src/application/visual-autoheal.ts`
- **Symbols**: `HealTestService.heal()`, `VisualAutoHealService.healLocator()`
- **Outputs**: `HealResult` ({ `originalSelector`, `healedSelector`, `confidence`, `applied` }).
- **Strategy**: Analyzes DOM snapshots and error logs to suggest accessibility-compliant locators (`getByRole('button', { name: 'Submit' })`).
- **Existing Tests**: `tests/unit/advanced-qa-services.test.ts`
- **Documentation**: `docs/FEATURES_GUIDE.md` (Section 8).

---

### FEATURE-009: Comprehensive Security Engine & Attack Surface Scanner
- **Feature ID**: `FEATURE-009`
- **Name**: Autonomous Security & Vulnerability Auditor
- **Category**: `security`
- **Status**: `COMPLETE`
- **Risk**: `CRITICAL`
- **User Value**: Discovers attack surfaces, plans non-destructive security tests, probes for Auth/AuthZ/Injections, and produces explainable Security Scores (0-100) with secret redaction.
- **Trigger**: CLI `qaforge security`, MCP `qa.securityScan`, `qa.securityPlan`, `qa.securityRun`, `qa.securityReport`.
- **Entry Point**: `src/application/security-engine.ts`
- **Files**:
  - `src/application/security-engine.ts`
  - `src/intelligence/security-scanner/surface-scanner.ts`
  - `src/intelligence/security-scanner/security-planner.ts`
  - `src/shared/secret-redactor.ts`
  - `src/shared/types/security.ts`
- **Symbols**: `SecurityEngine.scanSurface()`, `SecurityEngine.createPlan()`, `SecurityEngine.runTests()`, `SecretRedactor.redact()`
- **Inputs**: `SecurityTestingOptions` (`baseURL`, `categories`, `safeMode: true`, `deepMode: false`).
- **Outputs**: `SecurityReport` ({ `securityScore`, `verdict`, `findings`, `remediationRoadmap` }).
- **Strategy**:
  - Surface discovery for auth endpoints, protected routes, forms, file uploads, JWT, cookies, and database technologies.
  - Safe, non-destructive probing for authentication bypass, user enumeration, IDOR, SQLi error leakage, reflected/stored XSS, command injection, path traversal, and upload MIME validation.
  - Safe Mode enabled by default; production execution blocked unless explicitly authorized.
  - Automatic redaction of passwords, bearer tokens, JWTs, and session cookies from logs.
- **Existing Tests**: `tests/unit/security-testing.test.ts`
- **Documentation**: `docs/FEATURES_GUIDE.md` (Section 56-58), `docs/CLI_REFERENCE.md`.

---

### FEATURE-010: Postman Collection v2.1 Runner & Exporter
- **Feature ID**: `FEATURE-010`
- **Name**: Postman Collection Runner, Exporter & Dynamic API Client
- **Category**: `api_testing`
- **Status**: `COMPLETE`
- **Risk**: `LOW`
- **User Value**: Runs Postman v2.1/v2.0 test suites locally with dynamic variable interpolation (`{{var}}`), pre-request scripts, test assertions, and exports discovered routes to Postman JSON.
- **Trigger**: CLI `qaforge run-collection`, `qaforge export-postman`, `qaforge request`, MCP `qa.runCollection`, `qa.exportCollection`.
- **Entry Point**: `src/adapters/api/postman-runner.ts`
- **Files**:
  - `src/adapters/api/postman-runner.ts`
  - `src/adapters/api/dynamic-variables.ts`
- **Symbols**: `PostmanRunnerService.runCollection()`, `PostmanRunnerService.exportCollection()`, `DynamicVariablesService.interpolate()`
- **Outputs**: `PostmanRunResult` with pass/fail counts, assertion results, and response timings.
- **Existing Tests**: `tests/unit/postman-runner.test.ts`, `tests/unit/dynamic-variables.test.ts`
- **Documentation**: `docs/FEATURES_GUIDE.md` (Section 13-14).

---

### FEATURE-011: SARIF v2.1.0 Security Report Exporter
- **Feature ID**: `FEATURE-011`
- **Name**: SARIF v2.1.0 GitHub Security Exporter
- **Category**: `reporting_security`
- **Status**: `COMPLETE`
- **Risk**: `LOW`
- **User Value**: Converts security findings and CVE vulnerabilities into standard SARIF v2.1.0 JSON format for native integration into GitHub Code Scanning and Security tabs.
- **Trigger**: CLI `qaforge security --sarif <path>`, MCP `qa.exportSarif`, `QAForgeEngine.exportSarif()`.
- **Entry Point**: `src/application/sarif-exporter.ts` -> `SarifExporterService.exportSecurityReport()`
- **Files**: `src/application/sarif-exporter.ts`
- **Symbols**: `SarifExporterService.exportSecurityReport()`
- **Outputs**: Standard SARIF JSON log saved to `.qaforge/reports/security.sarif`.
- **Existing Tests**: `tests/unit/v100-stability-dx-suite.test.ts`
- **Documentation**: `docs/CLI_REFERENCE.md`, `docs/MCP_REFERENCE.md`.

---

### FEATURE-012: Subresource Integrity (SRI), CSRF & CORS Auditor
- **Feature ID**: `FEATURE-012`
- **Name**: Web Asset Security, SRI, CSRF & CORS Auditor
- **Category**: `security`
- **Status**: `COMPLETE`
- **Risk**: `LOW`
- **User Value**: Audits external CDN script/link tags for missing cryptographic hashes (`integrity="sha384-..."`), forms for missing CSRF tokens, and dangerous wildcard CORS credentials.
- **Trigger**: CLI `qaforge web-sec`, MCP `qa.auditSriCsrf`, `QAForgeEngine.auditSriAndCsrf()`.
- **Entry Point**: `src/application/sri-csrf-validator.ts` -> `SriCsrfValidatorService.audit()`
- **Files**: `src/application/sri-csrf-validator.ts`
- **Symbols**: `SriCsrfValidatorService.audit()`
- **Outputs**: `AdvancedWebSecurityReport` with `sriFindings`, `csrfFindings`, and `corsFindings`.
- **Existing Tests**: `tests/unit/v100-stability-dx-suite.test.ts`
- **Documentation**: `docs/CLI_REFERENCE.md`, `docs/MCP_REFERENCE.md`.

---

### FEATURE-013: AST Test Deduplication Engine
- **Feature ID**: `FEATURE-013`
- **Name**: Test Suite Redundancy & Deduplication Analyzer
- **Category**: `test_optimization`
- **Status**: `COMPLETE`
- **Risk**: `LOW`
- **User Value**: Identifies identical or redundant test titles across test files and recommends parameterization (`test.each`) to minimize execution duration.
- **Trigger**: CLI `qaforge dedup`, MCP `qa.dedupTests`, `QAForgeEngine.deduplicateTests()`.
- **Entry Point**: `src/domain/tests/test-deduplicator.ts` -> `TestDeduplicatorService.analyze()`
- **Files**: `src/domain/tests/test-deduplicator.ts`
- **Symbols**: `TestDeduplicatorService.analyze()`
- **Outputs**: `TestDeduplicationReport` ({ `totalTestsScanned`, `redundantCount`, `redundancyPercentage`, `duplicates` }).
- **Existing Tests**: `tests/unit/v100-stability-dx-suite.test.ts`
- **Documentation**: `docs/CLI_REFERENCE.md`, `docs/MCP_REFERENCE.md`.

---

### FEATURE-014: Automated Git Pre-Commit Hook Installer
- **Feature ID**: `FEATURE-014`
- **Name**: Git Pre-Commit Hook Manager
- **Category**: `devops_git`
- **Status**: `COMPLETE`
- **Risk**: `LOW`
- **User Value**: Installs or removes native `.git/hooks/pre-commit` or Husky hooks to run change impact tests (`qaforge changed`) before commit.
- **Trigger**: CLI `qaforge hook install`, `qaforge hook uninstall`.
- **Entry Point**: `src/application/git-hook-installer.ts` -> `GitHookInstallerService.installPreCommit()`
- **Files**: `src/application/git-hook-installer.ts`
- **Symbols**: `GitHookInstallerService.installPreCommit()`, `GitHookInstallerService.uninstallPreCommit()`
- **Existing Tests**: `tests/unit/v100-stability-dx-suite.test.ts`
- **Documentation**: `docs/CLI_REFERENCE.md`.

---

### FEATURE-015: Model Context Protocol (MCP) Server
- **Feature ID**: `FEATURE-015`
- **Name**: Model Context Protocol Stdio Server (71 Tools)
- **Category**: `agent_interop`
- **Status**: `COMPLETE`
- **Risk**: `LOW`
- **User Value**: Exposes the entire testing suite to AI coding agents over standardized JSON-RPC stdio.
- **Trigger**: CLI `qaforge mcp`, MCP client initialization.
- **Entry Point**: `src/mcp/server.ts` -> `runMcpServer()`
- **Files**: `src/mcp/server.ts`
- **Symbols**: `runMcpServer()`
- **Dependencies**: `@modelcontextprotocol/sdk`
- **Existing Tests**: `tests/unit/interface-parity.test.ts`
- **Documentation**: `docs/MCP_REFERENCE.md`, `AGENTS.md`.
