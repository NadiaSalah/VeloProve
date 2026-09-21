# VeloProve MCP Server Reference

VeloProve includes a built-in **Model Context Protocol (MCP)** server over `stdio` enabling any LLM agent or IDE (Cursor, Windsurf, Cline, Claude Code, OpenAI Codex, GitHub Copilot) to execute autonomous testing loops.

---

## MCP Server Configuration

Add to your editor's MCP configuration (`.cursor/mcp.json`, `~/.codeium/windsurf/mcp_config.json`, or `cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "veloprove": {
      "command": "npx",
      "args": ["-y", "@engnadia/veloprove", "mcp"]
    }
  }
}
```

*(If `@engnadia/veloprove` is already installed locally, `["veloprove", "mcp"]` also works.)*

---

## Available MCP Tools

Counts follow `catalogMcpTools().length` in `src/shared/tool-catalog.ts` (do not hardcode). Numbered list below is the current catalog snapshot.

### 1. `vp.inspect`
Inspects workspace stack, routes, API endpoints, test runners (Vitest / Jest / Playwright / `node:test`), existing tests, and discovered PRD requirements.
```json
// Inputs:
{ "workspace": "optional/path" }
```

### 2. `vp.bootstrap`
Teach AI how to use VeloProve (same as CLI `veloprove teach-ai`). Writes `.veloprove/agent-manifest.json`, optionally rewrites project `AGENTS.md`, optionally creates `.cursor/mcp.json`, and returns a `pasteToAi` briefing for the user's chat.
```json
// Inputs:
{
  "agentName": "CursorAgent",
  "preferredOutput": "json", // "json" | "markdown" | "compact"
  "force": true,             // rewrite AGENTS.md even if present
  "writeMcp": true           // create .cursor/mcp.json when missing
}
```

### 3. `vp.ask`
Answer a user question using **packaged documentation only** (local search; no cloud LLM). Same as CLI `veloprove ask` / Dashboard Docs Chat.
```json
// Inputs:
{ "question": "How do I link Cursor after npm install?" }
```

### 4. `vp.learnFramework`
Teaches VeloProve uncommon or custom in-house framework conventions from `AGENTS.md` or instructions.
```json
// Inputs:
{
  "instructions": "Markdown or natural language framework routing conventions",
  "frameworkName": "CustomFramework",
  "routesDir": "src/pages"
}
```

### 5. `vp.explore`
Live interactive exploration crawler. Walks routes and builds interactive element tree.
```json
// Inputs:
{ "baseURL": "http://localhost:3000" }
```

### 6. `vp.fuzzApi`
Generates security probes, boundary tests, and auth bypass checks for all discovered API routes.
```json
// Inputs:
{}
```

### 7. `vp.mutationScore`
Runs mutation testing simulation to verify assertion sensitivity and resistance to code defects.
```json
// Inputs:
{}
```

### 8. `vp.refine`
Refines or adjusts test assertions in test files using natural language instructions.
```json
// Inputs:
{
  "instruction": "add assertion for coupon code discount",
  "testFilePath": "tests/e2e/checkout.spec.ts"
}
```

### 9. `vp.accessibility`
Runs static WCAG-oriented accessibility heuristics on components and routes (not a certified conformance audit).
```json
// Inputs:
{}
```

### 10. `vp.visualDiff`
Compares UI screenshot baselines with current screenshots to detect visual regression and drift.
```json
// Inputs:
{}
```

### 11. `vp.lint`
Runs ESLint and static analysis with auto-fix capability and changed git scope support.
```json
// Inputs:
{
  "scope": "changed", // "all" | "changed" | "paths"
  "paths": ["src/index.ts"],
  "fix": true
}
```

### 12. `vp.contractDrift`
Detects bi-directional discrepancies between OpenAPI specifications and active source code route implementations.
```json
// Inputs:
{}
```

### 13. `vp.auditSec`
Scans dependencies for known CVE vulnerabilities and detects hardcoded secrets in source files.
```json
// Inputs:
{}
```

### 14. `vp.perf`
Audits Core Web Vitals (LCP, FID, CLS, TTFB, bundle weight) across detected routes.
```json
// Inputs:
{}
```

### 15. `vp.mockNetwork`
Generates Mock Service Worker (MSW) network mock handlers from discovered API endpoints.
```json
// Inputs:
{}
```

### 16. `vp.quarantine`
Isolates and quarantines high-variance flaky tests from breaking CI pipelines.
```json
// Inputs:
{
  "threshold": 0.25
}
```

### 17. `vp.coverage`
Generates PRD requirements coverage heatmap matrix with test pass rate correlation.
```json
// Inputs:
{}
```

### 18. `vp.plan`
Generates prioritized, risk-scored test plans.
```json
// Inputs:
{
  "scope": "uncovered", // "all" | "uncovered" | "critical" | "e2e" | "api" | "unit" | "changed"
  "maxTests": 20
}
```

### 19. `vp.generate`
Materializes test files from the active test plan for Vitest, Jest, Playwright, or `node:test` + `node:assert/strict` (`.test.js`). By default probes live local GET endpoints to ground API status assertions.
```json
// Inputs:
{
  "overwritePolicy": "generated-only", // "never" | "generated-only" | "explicit"
  "liveGround": true,
  "baseURL": "http://localhost:3000"
}
```

### 20. `vp.run`
Executes test suites (Vitest / Jest / Playwright / `node --test`) and captures structured evidence.
```json
// Inputs:
{
  "scope": "changed", // "all" | "changed" | "paths" | "critical"
  "paths": ["tests/unit/auth.test.ts"]
}
```

### 21. `vp.run.get`
Retrieves details and results of a specific historical test run by ID.
```json
// Inputs:
{
  "runId": "run_12345"
}
```

### 22. `vp.changed`
Performs Git change impact analysis, identifying affected source files and tests.
```json
// Inputs:
{}
```

### 23. `vp.diagnose`
Analyzes test failures and classifies root cause (`APPLICATION_BUG`, `TEST_BUG`, `FLAKY_TEST`, `NETWORK_FAILURE`).
```json
// Inputs:
{
  "runId": "optional_run_id"
}
```

### 24. `vp.heal`
Safely self-heals brittle test locators without modifying application code.
```json
// Inputs:
{
  "runId": "optional_run_id"
}
```

### 25. `vp.suggestFix`
Generates source code repair suggestions and patches for `APPLICATION_BUG` failures.
```json
// Inputs:
{
  "diagnosisId": "diag_12345"
}
```

### 26. `vp.flaky`
Inspects flaky test history and variance statistics across local test executions.
```json
// Inputs:
{}
```

### 27. `vp.releaseCheck`
Evaluates release confidence score and readiness verdict (`READY`, `READY_WITH_WARNINGS`, `NOT_READY`).
```json
// Inputs:
{}
```

### 28. `vp.runCollection`
Executes Postman Collection v2.1/v2.0 test suites locally with variable interpolation.
```json
// Inputs:
{
  "collectionPath": "./tests/postman.json",
  "environmentPath": "./env.json",
  "baseURL": "http://localhost:3000"
}
```

### 29. `vp.exportCollection`
Exports discovered APIs and routes to Postman Collection v2.1 JSON.
```json
// Inputs:
{
  "outputPath": "./veloprove_postman_collection.json",
  "collectionName": "VeloProve Discovered APIs"
}
```

### 30. `vp.sendRequest`
Sends an ad-hoc HTTP request (GET, POST, PUT, DELETE, PATCH) like Postman.
```json
// Inputs:
{
  "method": "POST",
  "url": "http://localhost:3000/api/users",
  "headers": { "Content-Type": "application/json" },
  "body": { "name": "Alice" }
}
```

### 31. `vp.loadTest`
Runs local load and stress benchmarks (VUs, duration, RPS, p95 latency).
```json
// Inputs:
{
  "targetUrl": "http://localhost:3000/api",
  "virtualUsers": 20,
  "durationSeconds": 5,
  "method": "GET"
}
```

### 32. `vp.mockData`
Generates contextual mock data fixtures (users, orders, addresses, Arabic locales).
```json
// Inputs:
{
  "preset": "arabic_user",
  "count": 5
}
```

### 33. `vp.owaspScan`
Audits endpoints against OWASP Top 10 security headers, CORS, and leaks.
```json
// Inputs:
{
  "targetUrl": "http://localhost:3000"
}
```

### 34. `vp.graphqlTest`
Executes and validates GraphQL queries and mutations.
```json
// Inputs:
{
  "endpoint": "http://localhost:3000/graphql",
  "query": "query { user(id: 1) { name } }"
}
```

### 35. `vp.wsTest`
Tests WebSocket connection and message interchange.
```json
// Inputs:
{
  "url": "ws://localhost:3000/ws",
  "timeoutMs": 3000
}
```

### 36. `vp.remoteInit`
Generates a drop-in companion probe file (`veloprove-probe.js`, Next.js route, Express middleware).
```json
// Inputs:
{
  "probeType": "nextjs_route" // "standalone_js" | "nextjs_route" | "express_middleware" | "html_snippet"
}
```

### 37. `vp.remoteConnect`
Connects and performs a handshake with a live remote companion probe.
```json
// Inputs:
{
  "remoteUrl": "https://staging.myapp.com",
  "bridgeSecret": "secret-token"
}
```

### 38. `vp.remoteAudit`
Executes full remote QA, link crawl, and security audit against a live website.
```json
// Inputs:
{
  "remoteUrl": "https://staging.myapp.com",
  "bridgeSecret": "secret-token",
  "includeLoadTest": false
}
```

### 39. `vp.recordScenario`
Synthesizes recorded user steps into Playwright/Vitest E2E tests.
```json
// Inputs:
{
  "title": "Cart Checkout Scenario",
  "startUrl": "http://localhost:3000/cart",
  "steps": [{ "action": "CLICK", "target": "#checkout" }]
}
```

### 40. `vp.stabilizeFlaky`
Refactors brittle test code (replacing sleep with auto-wait and web-first assertions).
```json
// Inputs:
{
  "targetFileOrCode": "./tests/flaky.spec.ts",
  "saveFix": true
}
```

### 41. `vp.dbSnapshot`
Creates an isolated backup snapshot of database and fixture files.
```json
// Inputs:
{
  "name": "before-checkout-tests",
  "filePaths": ["data/app.db.json"]
}
```

### 42. `vp.dbRestore`
Restores database state from a previous snapshot.
```json
// Inputs:
{
  "snapshotId": "snap_12345"
}
```

### 43. `vp.autoBugFix`
Synthesizes code repair patches for `APPLICATION_BUG` failures.
```json
// Inputs:
{
  "apply": true
}
```

### 44. `vp.exportReport`
Exports standalone single-file executive QA & Security audit reports (HTML, JSON, Markdown).
```json
// Inputs:
{
  "format": "html" // "html" | "json" | "markdown" | "junit" | "pdf"
}
```

### 45. `vp.chaosTest`
Autonomous chaos monkey: injects malformed JSON, prototype pollution, memory floods, and type confusion.
```json
// Inputs:
{
  "targetUrl": "http://localhost:3000/api",
  "method": "POST"
}
```

### 46. `vp.dockerEnv`
Generates isolated containerized test environments (`docker-compose.test.yml`).
```json
// Inputs:
{
  "services": ["postgres", "redis"]
}
```

### 47. `vp.browserMatrix`
Generates Playwright multi-browser & mobile viewport matrices.
```json
// Inputs:
{
  "browsers": ["chromium", "firefox", "webkit"],
  "devices": ["iPhone 14", "Pixel 7"]
}
```

### 48. `vp.bddFeatures`
Compiles PRD requirements into standard BDD Gherkin `.feature` specs and step skeletons.
```json
// Inputs:
{
  "outputDir": "features"
}
```

### 49. `vp.sendAlert`
Dispatches test run verdicts and quality alerts to Slack, Discord, MS Teams, or webhooks.
```json
// Inputs:
{
  "webhookUrl": "https://hooks.slack.com/services/...",
  "channelType": "slack"
}
```

### 50. `vp.featureParity`
Audits UI-to-Backend parity and detects ghost features without backend logic.
```json
// Inputs:
{
  "generateE2ESuite": true
}
```

### 51. `vp.scanMalware`
Scans codebase for obfuscated Base64 `eval()` backdoors, suspicious lifecycle scripts, and raw IP exfiltration.
```json
// Inputs:
{}
```

### 52. `vp.remediateMalware`
One-click auto-remediation to clean and neutralize detected malware threats.
```json
// Inputs:
{
  "threatIds": ["THREAT_001"]
}
```

### 53. `vp.aiEvaluate`
Evaluates AI / LLM output accuracy, detects hallucinations against ground truth facts, and validates JSON schema compliance.
```json
// Inputs:
{
  "endpointUrl": "http://localhost:3000/api/ai",
  "testCases": [{ "id": "1", "prompt": "Summarize app", "expectedKeywords": ["VeloProve"] }]
}
```

### 54. `vp.gitBisect`
Autonomous Git bisect regression hunter: pinpoints the exact commit that introduced a test failure.
```json
// Inputs:
{
  "testCommand": "npm test",
  "maxCommits": 10
}
```

### 55. `vp.networkThrottle`
Simulates mobile network latency, packet loss, and offline drops against HTTP endpoints.
```json
// Inputs:
{
  "targetUrl": "http://localhost:3000/api",
  "profile": "REGULAR_3G"
}
```

### 56. `vp.smartContractAudit`
Deep security audit for Solidity / Web3 smart contracts (reentrancy, unprotected selfdestruct, tx.origin).
```json
// Inputs:
{}
```

### 57. `vp.deadAssetPurge`
Scans and purges unreferenced images, fonts, and dead CSS to reclaim disk space.
```json
// Inputs:
{
  "purge": true
}
```

### 58. `vp.screenReaderSim`
Simulates screen reader auditory speech order and audits heading hierarchy order.
```json
// Inputs:
{
  "targetPaths": ["src/components/Header.tsx"]
}
```

### 59. `vp.dbQueryAudit`
Audits database query patterns for SQL N+1 in loops, unindexed queries, and raw string concatenations.
```json
// Inputs:
{
  "targetDir": "src/services"
}
```

### 60. `vp.envDriftAudit`
Compares `.env` against `.env.example`, detects undeclared environment variables in code, and flags leaked secrets.
```json
// Inputs:
{
  "generateExample": true
}
```

### 61. `vp.recordFailureReplay`
Generates interactive step-by-step visual timeline animation packages for failed tests.
```json
// Inputs:
{
  "testTitle": "Login Test",
  "testFile": "tests/e2e/login.spec.ts",
  "errorMessage": "Timeout 5000ms",
  "saveToFile": true
}
```

### 62. `vp.rateLimitAudit`
High-concurrency burst tester checking HTTP 429 rate-limiting enforcement and DoS resilience.
```json
// Inputs:
{
  "targetUrl": "http://localhost:3000/api",
  "requestCount": 30,
  "concurrency": 10,
  "method": "GET"
}
```

### 63. `vp.statefulMock`
Starts, stops, or resets a local zero-cloud in-memory stateful RESTful CRUD mock server.
```json
// Inputs:
{
  "action": "start", // "start" | "stop" | "reset"
  "port": 4040
}
```

### 64. `vp.architectureGraph`
Generates microservices & architecture dependency graph with Mermaid topology diagrams.
```json
// Inputs:
{}
```

### 65. `vp.securityScan`
Discovers and inspects security attack surfaces (auth routes, protected routes, forms, file uploads, JWT, cookies, and database technologies).
```json
// Inputs:
{}
```

### 66. `vp.securityPlan`
Generates prioritized, risk-scored security test plan for authentication, authorization, injection, forms, sessions, and uploads.
```json
// Inputs:
{
  "categories": ["authentication", "authorization", "forms_inputs", "injection", "api_security", "sessions_tokens", "file_uploads"],
  "safeMode": true
}
```

### 67. `vp.securityRun`
Executes automated non-destructive security tests against live target or codebase, identifying vulnerabilities with severity and confidence.
```json
// Inputs:
{
  "baseURL": "http://localhost:3000",
  "categories": ["authentication", "injection"],
  "safeMode": true,
  "deepMode": false,
  "environment": "test",
  "allowProduction": false
}
```

### 68. `vp.securityReport`
Generates comprehensive security report with explainable score (0-100), findings, evidence, redacted logs, and remediation roadmap.
```json
// Inputs:
{
  "baseURL": "http://localhost:3000",
  "safeMode": true,
  "format": "json"
}
```

### 69. `vp.exportSarif`
Exports security findings and CVE vulnerabilities in standard SARIF v2.1.0 JSON format for GitHub Security integration.
```json
// Inputs:
{
  "outputPath": ".veloprove/reports/security.sarif"
}
```

### 70. `vp.auditSriCsrf`
Audits Subresource Integrity (SRI) on external CDN assets, CSRF token protections on mutating forms, and CORS policy wildcards.
```json
// Inputs:
{}
```

### 71. `vp.dedupTests`
Analyzes test suites to identify duplicate, redundant, and overlapping test cases across Vitest/Playwright suites.
```json
// Inputs:
{
  "testFiles": ["tests/unit/app.test.ts"]
}
```

### 72. `vp.doctor`
Runs environmental, runtime, and project installation diagnostics to verify readiness (incl. Vitest / Jest / Playwright / `node:test`).
```json
// Inputs:
{}
```

### 73. `vp.ensureDev`
Smart DevServer auto-launcher: probes a base URL, detects package manager scripts (`dev`/`start`), and starts the app when offline.
```json
// Inputs:
{
  "baseURL": "http://localhost:5173",
  "command": "npm run dev",
  "port": 5173,
  "timeoutMs": 30000,
  "forceRestart": false
}
```

### 74. `vp.verify`
Autonomous change-aware QA orchestrator. Runs inspect → impact → targeted (or full) tests → diagnose → optional TEST_BUG heal → release assessment. Returns a versioned `OperationResult` with evidence, warnings, and exit-code mapping. Failures write `.veloprove/evidence/<runId>/`.
```json
// Inputs:
{
  "fullSuite": false,
  "includeSecurity": false,
  "includeA11y": false,
  "noHeal": false,
  "intent": "Find what broke after my last changes",
  "sandbox": false,
  "dockerEnv": false
}
```

### 75. `vp.history`
Load local test-run history trends from `.veloprove` state (pass rate, duration, flaky aggregates, optional last security score).
```json
// Inputs:
{
  "limit": 20
}
```

### 76. `vp.twin`
Build or read **Project Twin** — local composition of inspect SSOT into `.veloprove/twin/latest.json`. **PARTIAL MVP:** evidence classes (`VERIFIED` / `OBSERVED` / `INFERRED` / `STALE`); optional facets wrap `changed` and aggregated drift; supports incremental/force. CLI: `veloprove twin`.
```json
// Inputs:
{
  "action": "build",
  "withImpact": true,
  "withDrift": true,
  "incremental": true,
  "force": false,
  "featureId": "optional-for-inspect"
}
```

### 77. `vp.impact`
Change impact wrapping the same engine as `vp.changed` / `veloprove changed`. When a Twin snapshot exists, attaches related Twin feature hits. CLI: `veloprove impact`.

### 78. `vp.drift`
Aggregated drift wrapping `contract-drift`, `feature-parity`, `env-drift`, and docs API-mention hints. Marks STALE when Twin fingerprint disagrees. CLI: `veloprove drift`.
```json
// Inputs:
{
  "feature": "optional-filter",
  "changed": false
}
```

Canonical MCP namespace is **`vp.*` only** (no `qa.*` aliases).

---

## MCP Resources

VeloProve resources use the **`vp://` scheme only** (same product namespace as `vp.*` tools). There are no legacy aliases.

| URI | Name | Description |
| :--- | :--- | :--- |
| `vp://project/profile` | Project Profile | Active project tech stack and detected routes |
| `vp://requirements` | Requirements | Parsed requirements from PRD, OpenAPI, routes |
| `vp://test-plan/latest` | Latest Test Plan | Active prioritized test plan |
| `vp://runs/latest` | Latest Test Run | Results and timings of the latest test run |
| `vp://release/confidence` | Release Confidence | Quantitative readiness score and blockers (`engine.releaseCheck`) |
| `vp://twin/latest` | Project Twin Latest | Twin snapshot JSON (PARTIAL MVP) |
