# QAForge Feature Guide & Deep Dive

QAForge provides an end-to-end, local-first autonomous QA engine. This guide organizes all capabilities into cohesive engineering domains.

---

# Domain 1: Core Autonomous QA

## 1. Zero-Config Project Scanner (`qa.inspect` / `qaforge inspect`)
- **Frameworks Detected**: Next.js (App Router & Pages Router), React, Vite, Vue, Svelte, Express, Fastify.
- **Test Runners Detected**: Vitest, Jest, Playwright.
- **Route & API Mapping**: Automatically extracts route files (`app/**/page.tsx`, `pages/**/*.tsx`, `routes/*.ts`, `src/api/**/*.ts`).

## 2. Spec-Driven Requirement Discovery
- **PRD Markdown Parsing**: Extracts feature blocks, acceptance criteria, edge cases, and priorities.
- **OpenAPI / Swagger Specs**: Discovers schemas, auth mechanisms, and HTTP parameters.
- **Route & Component Use Cases**: Infers user actions from forms, buttons, and state hooks.

## 3. Risk-Based Test Planning & Test Generation (`qa.plan`, `qa.generate` / `qaforge plan`, `qaforge generate`)
- Calculates risk scores based on priority, complexity, auth requirements, and coverage gaps.
- Generates test files conforming strictly to your test runner (Vitest, Jest, Playwright).
- **Protected Code Policy**: Never overwrites developer-written tests unless explicitly requested with `--overwrite explicit`.

## 4. Git Change Impact Analysis (`qa.changed` / `qaforge changed`)
- Analyzes `git diff` to identify modified source files.
- Traverses the internal dependency graph to determine the exact impacted tests.
- Runs only relevant tests, reducing feedback loops from minutes to seconds.

## 5. Release Confidence Engine (`qa.releaseCheck` / `qaforge release`)
- Evaluates test pass rates, diagnostic severities, flaky test ratios, and requirement coverage.
- Outputs quantitative readiness scores (0-100) and gate verdicts (`READY`, `READY_WITH_WARNINGS`, `NOT_READY`).

---

# Domain 2: Testing, Diagnostics & Safe Healing

## 6. Evidence-Based Diagnostics (`qa.diagnose` / `qaforge diagnose`)
- Classifies failures into root causes:
  - `APPLICATION_BUG`: Business logic error, server 500, or wrong response data.
  - `TEST_BUG`: Stale selector, changed markup, locator mismatch.
  - `FLAKY_TEST`: Intermittent timing failure or race condition.
  - `NETWORK_FAILURE`: Unreachable API endpoint or connection drop.

## 7. Guarded Test Self-Healing (`qa.heal` / `qaforge heal`)
- Upgrades fragile CSS selectors (`#submit-btn-2`) to accessible locators (`getByRole('button', { name: 'Submit' })`).
- Does NOT touch application business logic.

## 8. Natural Language Test Refinement (`qa.refine` / `qaforge refine`)
- Allows developers and AI agents to update tests using plain English prompts.

## 9. Mutation Testing Quality Score (`qa.mutationScore` / `qaforge mutation-score`)
- Evaluates assertion sensitivity and catches dummy assertions (`expect(true).toBe(true)`).

## 10. AST Flakiness Stabilizer & Auto-Wait Fixer (`qa.stabilizeFlaky` / `qaforge stabilize`)
- AST analysis detects brittle timeouts (`waitForTimeout(5000)`, `setTimeout`) and auto-refactors them to auto-waiting assertions.

## 11. Flaky Test Auto-Quarantine (`qa.quarantine` / `qaforge quarantine`)
- Tracks historical flakiness variance and isolates unstable tests from failing CI builds.

## 12. Autonomous Bug-Fix & Git Patch Synthesizer (`qa.autoBugFix` / `qaforge auto-fix`)
- Generates verified source code fix patches for `APPLICATION_BUG` failures with unified Git diffs.

## 13. Autonomous Git Bisect Regression Hunter (`qa.gitBisect` / `qaforge bisect`)
- Traverses Git history to find the exact commit that introduced a test failure.

## 14. Test Failure Visual Replay Package (`qa.recordFailureReplay` / `qaforge replay`)
- Generates interactive standalone SVG/HTML step-by-step visual timeline animation packages for failed tests.

---

# Domain 3: API & Contract Testing

## 15. Native Dynamic API Engine (`qa.sendRequest` / `qaforge request`)
- **Dynamic Variables**: Interpolates dynamic placeholders (`{{$uuid}}`, `{{$randomEmail}}`, `{{$timestamp}}`).
- **Auto-Auth Chains**: Automatically executes login and injects tokens into downstream requests.
- **Auto-Cleanup**: Registers created entity IDs and runs teardown `DELETE` steps automatically.

## 16. Postman Collection v2.1 Runner & Exporter (`qa.runCollection`, `qa.exportCollection` / `qaforge run-collection`, `qaforge export-postman`)
- Executes standard Postman collections with variable interpolation locally.
- Exports discovered code endpoints directly into Postman Collection v2.1 JSON.

## 17. OpenAPI Security Fuzzing (`qa.fuzzApi` / `qaforge fuzz-api`)
- Injects SQL injection probes, boundary buffers, and unauthorized access checks across discovered routes.

## 18. API & OpenAPI Contract Drift Detector (`qa.contractDrift` / `qaforge contract-drift`)
- Detects discrepancies between OpenAPI documentation specifications and active code routes.

## 19. GraphQL & WebSocket Real-Time Testing (`qa.graphqlTest`, `qa.wsTest` / `qaforge graphql`, `qaforge ws-test`)
- Executes and validates GraphQL queries/mutations against schemas and verifies WebSocket handshakes.

## 20. Stateful Dynamic In-Memory Mock Server (`qa.statefulMock` / `qaforge mock-server`)
- Spins up an in-memory RESTful CRUD server that dynamically persists state across calls for offline testing.

## 21. Mock Service Worker (MSW) Network Generator (`qa.mockNetwork` / `qaforge mock-gen`)
- Auto-generates Mock Service Worker (MSW) handlers from discovered API schemas.

---

# Domain 4: Web & E2E Testing

## 22. Interactive Live Exploration (`qa.explore` / `qaforge explore`)
- Crawls live web applications to build visual site maps and discover interactive forms and buttons.

## 23. E2E Scenario Recorder & Synthesizer (`qa.recordScenario` / `qaforge record-scenario`)
- Compiles interactive user journeys into resilient Playwright/Vitest E2E test files with Visual-Aria selectors.

## 24. Cross-Browser & Mobile Matrix Runner (`qa.browserMatrix` / `qaforge browser-matrix`)
- Synthesizes Playwright multi-browser matrices covering Chromium, Firefox, WebKit, Mobile Safari, and Pixel.

## 25. Visual Regression & Pixel Diff Engine (`qa.visualDiff` / `qaforge visual-diff`)
- Compares UI screenshot baselines with current screenshots to detect visual regression.

## 26. Automated WCAG 2.1 Accessibility Auditor (`qa.accessibility` / `qaforge a11y`)
- Audits component JSX/TSX and routes against accessibility standards (missing alt tags, button contrast, form labels).

## 27. Screen Reader & Audio Flow Simulator (`qa.screenReaderSim` / `qaforge screen-reader`)
- Simulates auditory speech flow order (NVDA / VoiceOver) and detects heading hierarchy skips and unlabelled controls.

## 28. Live Remote Companion Bridge & Probe Agent (`qa.remoteInit`, `qa.remoteConnect`, `qa.remoteAudit` / `qaforge remote-init`, `qaforge remote-connect`, `qaforge remote-audit`)
- Connects local QAForge to any live production/staging website via a lightweight drop-in companion probe file.

---

# Domain 5: Security & Vulnerability Auditing

## 29. Dependency CVE & Secret Scanner (`qa.auditSec` / `qaforge audit`)
- Scans `package.json` for known CVEs and detects exposed API keys or tokens in source code.

## 30. OWASP Top 10 Security & Headers Audit (`qa.owaspScan` / `qaforge owasp-scan`)
- Deep local penetration audit for CSP, X-Frame-Options, MIME sniffing, CORS, and stack trace leaks.

## 31. Malware, Backdoor & Obfuscation Scanner with Auto-Remediation (`qa.scanMalware`, `qa.remediateMalware` / `qaforge scan-malware --fix`)
- Detects dangerous obfuscated Base64 `eval()` backdoors, suspicious lifecycle scripts, and raw IP data exfiltration, with one-click automatic neutralization.

## 32. Web3 & Smart Contract Security Auditor (`qa.smartContractAudit` / `qaforge audit-contracts`)
- Audits Solidity `.sol` contracts for reentrancy, unprotected `selfdestruct`, and `tx.origin` phishing exploits.

---

# Domain 6: Performance & Reliability

## 33. Local Load & Stress Testing Engine (`qa.loadTest` / `qaforge load-test`)
- Benchmarks API throughput (RPS), p95 latency, and error rates under concurrent virtual users.

## 34. Core Web Vitals & Route Performance Profiler (`qa.perf` / `qaforge perf`)
- Measures route-level LCP, FID, CLS, TTFB, and JS bundle weight.

## 35. Autonomous Chaos & Edge-Case Monkey Engine (`qa.chaosTest` / `qaforge chaos`)
- Injects malformed JSON, prototype pollution, memory floods, and concurrent bursts to measure server crash resilience.

## 36. API Rate-Limiting & DoS Threshold Profiler (`qa.rateLimitAudit` / `qaforge rate-limit`)
- Burst-tests HTTP endpoints to verify 429 throttling enforcement and server degradation.

## 37. Network Throttling & Offline Simulator (`qa.networkThrottle` / `qaforge throttle`)
- Emulates mobile network conditions (3G, GPRS, packet loss, offline drops) to verify resilience.

## 38. Database Query & SQL N+1 Performance Auditor (`qa.dbQueryAudit` / `qaforge db-audit`)
- Detects database queries inside loops, unindexed queries, raw string concatenations, and unbounded fetches.

---

# Domain 7: Developer Intelligence, Data & Environment

## 39. AI & Schema Mock Data Factory (`qa.mockData` / `qaforge mock-data`)
- Generates realistic contextual test fixtures (users, orders, addresses, payments, and Arabic locales).

## 40. Universal UI-to-Backend Feature Parity & Ghost Feature Auditor (`qa.featureParity` / `qaforge feature-parity`)
- Scans interactive UI elements across React, Vue, Svelte, Tauri/Rust, Express, and Python/FastAPI, matching them with backend commands and detecting dummy no-ops.

## 41. Database Snapshot & State Isolation Engine (`qa.dbSnapshot`, `qa.dbRestore` / `qaforge db-snapshot`, `qaforge db-restore`)
- Freezes and restores database/fixture state for reproducible, isolated testing.

## 42. Docker & Ephemeral Container Orchestrator (`qa.dockerEnv` / `qaforge docker-env`)
- Generates containerized test environments (`docker-compose.test.yml`) for PostgreSQL, Redis, MongoDB, and MySQL.

## 43. Multi-Environment Config & Secret Drift Auditor (`qa.envDriftAudit` / `qaforge env-drift`)
- Compares `.env` against `.env.example`, detects undeclared code references (`process.env`), and flags leaked secrets.

## 44. Dead Code, CSS & Unused Asset Purge Engine (`qa.deadAssetPurge` / `qaforge dead-assets --purge`)
- Scans for unreferenced images, fonts, and dead CSS rules, with safe one-click disk space reclamation.

## 45. Microservices & Architecture Dependency Graph (`qa.architectureGraph` / `qaforge arch-graph`)
- Maps frontend UI, backend APIs, databases, caches, and third-party cloud SDKs into interactive topology graphs and Mermaid diagrams.

## 46. ESLint & Static Code Quality Engine (`qa.lint` / `qaforge lint --fix`)
- Enforces code quality rules, formats files, and auto-fixes lint violations.

## 47. BDD Gherkin Feature Spec Generator (`qa.bddFeatures` / `qaforge bdd`)
- Compiles PRD requirements into standard `.feature` specs and Cucumber/Playwright step skeletons.

---

# Domain 8: AI Agent Integration & LLM Testing

## 48. Universal AI Agent Handshake (`qa.bootstrap` / `qaforge agent-handshake`)
- Self-teaching protocol for any AI editor or agent (Cursor, Windsurf, Claude Code, Cline, Codex, Copilot).

## 49. Custom Framework Self-Teaching (`qa.learnFramework` / `qaforge learn-framework`)
- Ingests custom or in-house framework conventions from `AGENTS.md` and repository guidelines.

## 50. LLM & AI Output Hallucination & Accuracy Evaluator (`qa.aiEvaluate` / `qaforge ai-eval`)
- Evaluates AI model outputs against ground truth facts and validates JSON schema compliance.

---

# Domain 9: Reporting, CI & Collaboration

## 51. Standalone Executive Audit & QA Report Exporter (`qa.exportReport` / `qaforge export-report`)
- Exports comprehensive single-file HTML, JSON, or Markdown reports.

## 52. Webhook Alerts & Notification Dispatcher (`qa.sendAlert` / `qaforge alert`)
- Dispatches test run verdicts and quality alerts to Slack, Discord, MS Teams, or webhooks.

## 53. PRD Requirements Coverage Heatmap (`qa.coverage` / `qaforge coverage`)
- Generates functional requirement coverage matrices correlated with test pass rates.

## 54. CI Quality Gate Generator (`qaforge setup-ci`)
- Generates GitHub Actions autonomous quality gate workflows.

## 55. Local HTML Dashboard & Command Center (`qaforge ui`, `qaforge tui`)
- Interactive web dashboard and Terminal Command Center for triggering actions and visualizing metrics.
