# QAForge MCP Server Reference

QAForge includes a built-in **Model Context Protocol (MCP)** server over `stdio` enabling any LLM agent or IDE (Cursor, Windsurf, Cline, Claude Code, OpenAI Codex, GitHub Copilot) to execute autonomous testing loops.

---

## MCP Server Configuration

Add to your editor's MCP configuration (`.cursor/mcp.json`, `~/.codeium/windsurf/mcp_config.json`, or `cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "qaforge": {
      "command": "npx",
      "args": ["qaforge", "mcp"]
    }
  }
}
```

---

## Available MCP Tools (71 Tools)

### 1. `qa.inspect`
Inspects workspace stack, routes, API endpoints, existing tests, and discovered PRD requirements.
```json
// Inputs:
{ "workspace": "optional/path" }
```

### 2. `qa.bootstrap`
Universal agent handshake and self-teaching protocol. Returns instructions for AI agents on how to execute autonomous QA.
```json
// Inputs:
{
  "agentName": "CursorAgent",
  "preferredOutput": "json" // "json" | "markdown" | "compact"
}
```

### 3. `qa.learnFramework`
Teaches QAForge uncommon or custom in-house framework conventions from `AGENTS.md` or instructions.
```json
// Inputs:
{
  "instructions": "Markdown or natural language framework routing conventions",
  "frameworkName": "CustomFramework",
  "routesDir": "src/pages"
}
```

### 4. `qa.explore`
Live interactive exploration crawler. Walks routes and builds interactive element tree.
```json
// Inputs:
{ "baseURL": "http://localhost:3000" }
```

### 5. `qa.fuzzApi`
Generates security probes, boundary tests, and auth bypass checks for all discovered API routes.
```json
// Inputs:
{}
```

### 6. `qa.mutationScore`
Runs mutation testing simulation to verify assertion sensitivity and resistance to code defects.
```json
// Inputs:
{}
```

### 7. `qa.refine`
Refines or adjusts test assertions in test files using natural language instructions.
```json
// Inputs:
{
  "instruction": "add assertion for coupon code discount",
  "testFilePath": "tests/e2e/checkout.spec.ts"
}
```

### 8. `qa.accessibility`
Runs automated WCAG 2.1 accessibility audits on components and routes.
```json
// Inputs:
{}
```

### 9. `qa.visualDiff`
Compares UI screenshot baselines with current screenshots to detect visual regression and drift.
```json
// Inputs:
{}
```

### 10. `qa.lint`
Runs ESLint and static analysis with auto-fix capability and changed git scope support.
```json
// Inputs:
{
  "scope": "changed", // "all" | "changed" | "paths"
  "paths": ["src/index.ts"],
  "fix": true
}
```

### 11. `qa.contractDrift`
Detects bi-directional discrepancies between OpenAPI specifications and active source code route implementations.
```json
// Inputs:
{}
```

### 12. `qa.auditSec`
Scans dependencies for known CVE vulnerabilities and detects hardcoded secrets in source files.
```json
// Inputs:
{}
```

### 13. `qa.perf`
Audits Core Web Vitals (LCP, FID, CLS, TTFB, bundle weight) across detected routes.
```json
// Inputs:
{}
```

### 14. `qa.mockNetwork`
Generates Mock Service Worker (MSW) network mock handlers from discovered API endpoints.
```json
// Inputs:
{}
```

### 15. `qa.quarantine`
Isolates and quarantines high-variance flaky tests from breaking CI pipelines.
```json
// Inputs:
{
  "threshold": 0.25
}
```

### 16. `qa.coverage`
Generates PRD requirements coverage heatmap matrix with test pass rate correlation.
```json
// Inputs:
{}
```

### 17. `qa.plan`
Generates prioritized, risk-scored test plans.
```json
// Inputs:
{
  "scope": "uncovered", // "all" | "uncovered" | "critical" | "e2e" | "api" | "unit" | "changed"
  "maxTests": 20
}
```

### 18. `qa.generate`
Materializes test files from the active test plan.
```json
// Inputs:
{
  "overwritePolicy": "generated-only" // "never" | "generated-only" | "explicit"
}
```

### 19. `qa.run`
Executes test suites and captures structured evidence.
```json
// Inputs:
{
  "scope": "changed", // "all" | "changed" | "paths" | "critical"
  "paths": ["tests/unit/auth.test.ts"]
}
```

### 20. `qa.run.get`
Retrieves details and results of a specific historical test run by ID.
```json
// Inputs:
{
  "runId": "run_12345"
}
```

### 21. `qa.changed`
Performs Git change impact analysis, identifying affected source files and tests.
```json
// Inputs:
{}
```

### 22. `qa.diagnose`
Analyzes test failures and classifies root cause (`APPLICATION_BUG`, `TEST_BUG`, `FLAKY_TEST`, `NETWORK_FAILURE`).
```json
// Inputs:
{
  "runId": "optional_run_id"
}
```

### 23. `qa.heal`
Safely self-heals brittle test locators without modifying application code.
```json
// Inputs:
{
  "runId": "optional_run_id"
}
```

### 24. `qa.suggestFix`
Generates source code repair suggestions and patches for `APPLICATION_BUG` failures.
```json
// Inputs:
{
  "diagnosisId": "diag_12345"
}
```

### 25. `qa.flaky`
Inspects flaky test history and variance statistics across local test executions.
```json
// Inputs:
{}
```

### 26. `qa.releaseCheck`
Evaluates release confidence score and readiness verdict (`READY`, `READY_WITH_WARNINGS`, `NOT_READY`).
```json
// Inputs:
{}
```

### 27. `qa.runCollection`
Executes Postman Collection v2.1/v2.0 test suites locally with variable interpolation.
```json
// Inputs:
{
  "collectionPath": "./tests/postman.json",
  "environmentPath": "./env.json",
  "baseURL": "http://localhost:3000"
}
```

### 28. `qa.exportCollection`
Exports discovered APIs and routes to Postman Collection v2.1 JSON.
```json
// Inputs:
{
  "outputPath": "./qaforge_postman_collection.json",
  "collectionName": "QAForge Discovered APIs"
}
```

### 29. `qa.sendRequest`
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

### 30. `qa.loadTest`
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

### 31. `qa.mockData`
Generates contextual mock data fixtures (users, orders, addresses, Arabic locales).
```json
// Inputs:
{
  "preset": "arabic_user",
  "count": 5
}
```

### 32. `qa.owaspScan`
Audits endpoints against OWASP Top 10 security headers, CORS, and leaks.
```json
// Inputs:
{
  "targetUrl": "http://localhost:3000"
}
```

### 33. `qa.graphqlTest`
Executes and validates GraphQL queries and mutations.
```json
// Inputs:
{
  "endpoint": "http://localhost:3000/graphql",
  "query": "query { user(id: 1) { name } }"
}
```

### 34. `qa.wsTest`
Tests WebSocket connection and message interchange.
```json
// Inputs:
{
  "url": "ws://localhost:3000/ws",
  "timeoutMs": 3000
}
```

### 35. `qa.remoteInit`
Generates a drop-in companion probe file (`qaforge-probe.js`, Next.js route, Express middleware).
```json
// Inputs:
{
  "probeType": "nextjs_route" // "standalone_js" | "nextjs_route" | "express_middleware" | "html_snippet"
}
```

### 36. `qa.remoteConnect`
Connects and performs a handshake with a live remote companion probe.
```json
// Inputs:
{
  "remoteUrl": "https://staging.myapp.com",
  "bridgeSecret": "secret-token"
}
```

### 37. `qa.remoteAudit`
Executes full remote QA, link crawl, and security audit against a live website.
```json
// Inputs:
{
  "remoteUrl": "https://staging.myapp.com",
  "bridgeSecret": "secret-token",
  "includeLoadTest": false
}
```

### 38. `qa.recordScenario`
Synthesizes recorded user steps into Playwright/Vitest E2E tests.
```json
// Inputs:
{
  "title": "Cart Checkout Scenario",
  "startUrl": "http://localhost:3000/cart",
  "steps": [{ "action": "CLICK", "target": "#checkout" }]
}
```

### 39. `qa.stabilizeFlaky`
Refactors brittle test code (replacing sleep with auto-wait and web-first assertions).
```json
// Inputs:
{
  "targetFileOrCode": "./tests/flaky.spec.ts",
  "saveFix": true
}
```

### 40. `qa.dbSnapshot`
Creates an isolated backup snapshot of database and fixture files.
```json
// Inputs:
{
  "name": "before-checkout-tests",
  "filePaths": ["data/app.db.json"]
}
```

### 41. `qa.dbRestore`
Restores database state from a previous snapshot.
```json
// Inputs:
{
  "snapshotId": "snap_12345"
}
```

### 42. `qa.autoBugFix`
Synthesizes code repair patches for `APPLICATION_BUG` failures.
```json
// Inputs:
{
  "apply": true
}
```

### 43. `qa.exportReport`
Exports standalone single-file executive QA & Security audit reports (HTML, JSON, Markdown).
```json
// Inputs:
{
  "format": "html" // "html" | "json" | "markdown"
}
```

### 44. `qa.chaosTest`
Autonomous chaos monkey: injects malformed JSON, prototype pollution, memory floods, and type confusion.
```json
// Inputs:
{
  "targetUrl": "http://localhost:3000/api",
  "method": "POST"
}
```

### 45. `qa.dockerEnv`
Generates isolated containerized test environments (`docker-compose.test.yml`).
```json
// Inputs:
{
  "services": ["postgres", "redis"]
}
```

### 46. `qa.browserMatrix`
Generates Playwright multi-browser & mobile viewport matrices.
```json
// Inputs:
{
  "browsers": ["chromium", "firefox", "webkit"],
  "devices": ["iPhone 14", "Pixel 7"]
}
```

### 47. `qa.bddFeatures`
Compiles PRD requirements into standard BDD Gherkin `.feature` specs and step skeletons.
```json
// Inputs:
{
  "outputDir": "features"
}
```

### 48. `qa.sendAlert`
Dispatches test run verdicts and quality alerts to Slack, Discord, MS Teams, or webhooks.
```json
// Inputs:
{
  "webhookUrl": "https://hooks.slack.com/services/...",
  "channelType": "slack"
}
```

### 49. `qa.featureParity`
Audits UI-to-Backend parity and detects ghost features without backend logic.
```json
// Inputs:
{
  "generateE2ESuite": true
}
```

### 50. `qa.scanMalware`
Scans codebase for obfuscated Base64 `eval()` backdoors, suspicious lifecycle scripts, and raw IP exfiltration.
```json
// Inputs:
{}
```

### 51. `qa.remediateMalware`
One-click auto-remediation to clean and neutralize detected malware threats.
```json
// Inputs:
{
  "threatIds": ["THREAT_001"]
}
```

### 52. `qa.aiEvaluate`
Evaluates AI / LLM output accuracy, detects hallucinations against ground truth facts, and validates JSON schema compliance.
```json
// Inputs:
{
  "endpointUrl": "http://localhost:3000/api/ai",
  "testCases": [{ "id": "1", "prompt": "Summarize app", "expectedKeywords": ["QAForge"] }]
}
```

### 53. `qa.gitBisect`
Autonomous Git bisect regression hunter: pinpoints the exact commit that introduced a test failure.
```json
// Inputs:
{
  "testCommand": "npm test",
  "maxCommits": 10
}
```

### 54. `qa.networkThrottle`
Simulates mobile network latency, packet loss, and offline drops against HTTP endpoints.
```json
// Inputs:
{
  "targetUrl": "http://localhost:3000/api",
  "profile": "REGULAR_3G"
}
```

### 55. `qa.smartContractAudit`
Deep security audit for Solidity / Web3 smart contracts (reentrancy, unprotected selfdestruct, tx.origin).
```json
// Inputs:
{}
```

### 56. `qa.deadAssetPurge`
Scans and purges unreferenced images, fonts, and dead CSS to reclaim disk space.
```json
// Inputs:
{
  "purge": true
}
```

### 57. `qa.screenReaderSim`
Simulates screen reader auditory speech order and audits heading hierarchy order.
```json
// Inputs:
{
  "targetPaths": ["src/components/Header.tsx"]
}
```

### 58. `qa.dbQueryAudit`
Audits database query patterns for SQL N+1 in loops, unindexed queries, and raw string concatenations.
```json
// Inputs:
{
  "targetDir": "src/services"
}
```

### 59. `qa.envDriftAudit`
Compares `.env` against `.env.example`, detects undeclared environment variables in code, and flags leaked secrets.
```json
// Inputs:
{
  "generateExample": true
}
```

### 60. `qa.recordFailureReplay`
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

### 61. `qa.rateLimitAudit`
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

### 62. `qa.statefulMock`
Starts, stops, or resets a local zero-cloud in-memory stateful RESTful CRUD mock server.
```json
// Inputs:
{
  "action": "start", // "start" | "stop" | "reset"
  "port": 4040
}
```

### 63. `qa.architectureGraph`
Generates microservices & architecture dependency graph with Mermaid topology diagrams.
```json
// Inputs:
{}
```

### 64. `qa.securityScan`
Discovers and inspects security attack surfaces (auth routes, protected routes, forms, file uploads, JWT, cookies, and database technologies).
```json
// Inputs:
{}
```

### 65. `qa.securityPlan`
Generates prioritized, risk-scored security test plan for authentication, authorization, injection, forms, sessions, and uploads.
```json
// Inputs:
{
  "categories": ["authentication", "authorization", "forms_inputs", "injection", "api_security", "sessions_tokens", "file_uploads"],
  "safeMode": true
}
```

### 66. `qa.securityRun`
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

### 67. `qa.securityReport`
Generates comprehensive security report with explainable score (0-100), findings, evidence, redacted logs, and remediation roadmap.
```json
// Inputs:
{
  "baseURL": "http://localhost:3000",
  "safeMode": true,
  "format": "json"
}
```

### 68. `qa.exportSarif`
Exports security findings and CVE vulnerabilities in standard SARIF v2.1.0 JSON format for GitHub Security integration.
```json
// Inputs:
{
  "outputPath": ".qaforge/reports/security.sarif"
}
```

### 69. `qa.auditSriCsrf`
Audits Subresource Integrity (SRI) on external CDN assets, CSRF token protections on mutating forms, and CORS policy wildcards.
```json
// Inputs:
{}
```

### 70. `qa.dedupTests`
Analyzes test suites to identify duplicate, redundant, and overlapping test cases across Vitest/Playwright suites.
```json
// Inputs:
{
  "testFiles": ["tests/unit/app.test.ts"]
}
```

### 71. `qa.doctor`
Runs environmental, runtime, and project installation diagnostics to verify readiness.
```json
// Inputs:
{}
```

---

## MCP Resources

| URI | Name | Description |
| :--- | :--- | :--- |
| `qa://project/profile` | Project Profile | Active project tech stack and detected routes |
| `qa://requirements` | Requirements | Parsed requirements from PRD, OpenAPI, routes |
| `qa://test-plan/latest` | Latest Test Plan | Active prioritized test plan |
| `qa://runs/latest` | Latest Test Run | Results and timings of the latest test run |
| `qa://release/confidence` | Release Confidence | Quantitative readiness score and blockers |
