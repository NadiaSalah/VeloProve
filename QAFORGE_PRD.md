# QAForge — Product Requirements Document

## Local-First Autonomous QA Engine for Coding Agents

**Version:** 2.0  
**Status:** Implementation-ready  
**Product Name:** QAForge  
**Primary Distribution:** npm package + GitHub package/repository  
**Primary Interfaces:** CLI + MCP Server  
**Primary Environment:** Local project repository  
**Primary Consumers:** Codex, Claude Code, Cursor, Windsurf, Cline, VS Code Agent Mode, GitHub Copilot Agent Mode, and other MCP-compatible coding agents.

---

# 1. Product Vision

Build **QAForge**, a local-first autonomous QA engine that installs directly inside a software project and gives AI coding agents a structured, reliable way to understand, test, diagnose, and validate code changes.

QAForge must be installable directly into a project from:

```bash
npm install -D qaforge
```

or from GitHub:

```bash
npm install -D github:NadiaSalah/qaforge
```

It must run entirely on the developer's machine and operate against the current repository without requiring:

- a hosted SaaS account
- cloud execution
- source-code uploads
- external AI APIs
- vendor-specific infrastructure

The product must not be a thin wrapper around Jest, Vitest, or Playwright.

The core product is:

> **A Local Autonomous QA Engine**

MCP is one interface to the engine.  
CLI is another interface to the same engine.

---

# 2. Product Positioning

QAForge should be positioned as:

> **QAForge — Local Autonomous QA Engine for Coding Agents**

Alternative short positioning:

> **QAForge — Local AI Testing Engine**

Core marketing promise:

> **Your code never leaves your machine.**

---

# 3. Core Product Principles

## 3.1 Local First

All repository analysis, test planning, test generation, test execution, diagnostics, reports, history, and artifacts must work locally.

QAForge must remain usable offline after required npm dependencies and browser binaries are installed.

No mandatory cloud dependency is permitted in v1.

---

## 3.2 Project-Native Installation

QAForge must install directly into the target repository.

Expected project layout:

```text
your-project/
├── src/
├── tests/
├── node_modules/
│   └── qaforge/
├── .qaforge/
│   ├── project-profile.json
│   ├── requirements.json
│   ├── test-map.json
│   ├── runs/
│   ├── artifacts/
│   └── cache/
├── qaforge.config.ts
└── package.json
```

The `.qaforge/` directory is used for generated local QA metadata, history, cache, plans, reports, and artifacts.

Large and temporary artifacts should be ignored by Git by default.

---

## 3.3 Agent Agnostic

Do not hard-code behavior for a specific AI coding agent.

The same QAForge MCP tools must work with compatible hosts including:

- Codex
- Claude Code
- Cursor
- Windsurf
- Cline
- VS Code Agent Mode
- GitHub Copilot Agent Mode
- future MCP-compatible tools

---

## 3.4 Evidence Before Guessing

QAForge must never label a failure as an application bug merely because a test failed.

Every failure must be classified using collected evidence.

Possible classifications:

```text
APPLICATION_BUG
TEST_BUG
FLAKY_TEST
ENVIRONMENT_FAILURE
CONFIGURATION_FAILURE
DEPENDENCY_FAILURE
NETWORK_FAILURE
TIMEOUT
DATA_FAILURE
UNKNOWN
```

Every diagnosis must include:

- confidence
- root cause
- evidence
- affected files
- suggested actions

---

## 3.5 Validate Intent, Not Current Bugs

QAForge should derive expected behavior from product intent whenever possible.

Priority order:

1. PRD / requirements
2. acceptance criteria
3. documentation
4. API contracts
5. route definitions
6. schemas
7. TypeScript types
8. existing tests
9. implementation code

This helps prevent generated tests from simply reproducing implementation bugs.

---

# 4. Primary User Experience

The intended flow is:

```text
Install QAForge
   ↓
Inspect project
   ↓
Discover stack and features
   ↓
Discover requirements
   ↓
Build risk-aware test plan
   ↓
Generate missing tests
   ↓
Run tests
   ↓
Collect evidence
   ↓
Diagnose failures
   ↓
Classify root cause
   ↓
Heal safe test issues or suggest source fix
   ↓
Analyze changed-file impact
   ↓
Re-run impacted tests
   ↓
Generate release confidence
```

A coding agent should be able to execute this flow without requiring the developer to manually orchestrate terminal commands.

---

# 5. CLI Experience

QAForge must work without MCP.

Core commands:

```bash
npx qaforge init
npx qaforge inspect
npx qaforge plan
npx qaforge generate
npx qaforge test
npx qaforge changed
npx qaforge diagnose
npx qaforge heal
npx qaforge coverage
npx qaforge release
npx qaforge mcp
```

CLI and MCP must call the same application/domain layer.

Do not duplicate testing logic between interfaces.

---

# 6. MCP Integration

Primary local MCP transport:

```text
stdio
```

Example configuration:

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

QAForge should expose a coherent tool namespace:

```text
qa.inspect
qa.plan
qa.generate
qa.run
qa.run.get
qa.changed
qa.diagnose
qa.heal
qa.suggestFix
qa.coverage
qa.flaky
qa.releaseCheck
```

Future remote operation should use Streamable HTTP.

Do not design new remote features around legacy HTTP+SSE.

---

# 7. Product Modes

QAForge must support explicit modes.

## Mode A — Inspect

Analyze repository structure without modifying files.

Produces:

- project profile
- frameworks
- routes
- APIs
- components
- existing tests
- testing gaps
- risk areas

---

## Mode B — Plan

Generate a structured test plan without writing test files.

---

## Mode C — Generate

Generate missing tests from an approved test plan.

---

## Mode D — Validate

Run existing and/or generated tests.

---

## Mode E — Changed

Analyze Git changes and select impacted tests.

---

## Mode F — Diagnose

Analyze failures and determine likely root cause.

---

## Mode G — Heal

Attempt safe repairs to generated or brittle tests.

Never silently modify application source code.

---

## Mode H — Release

Run release-level validation and calculate release confidence.

---

# 8. Project Intelligence Engine

Create:

```text
src/intelligence/
```

The subsystem must build a normalized model of the repository.

Detect where applicable:

- package manager
- workspace system
- monorepo structure
- languages
- frameworks
- build tools
- test frameworks
- entry points
- frontend routes
- backend routes
- API endpoints
- components
- services
- stores
- schemas
- environment configuration
- authentication flows
- CI configuration
- existing test suites
- Git changes
- module dependencies

Initial ecosystem support:

- JavaScript
- TypeScript
- React
- Vue
- Svelte
- Next.js
- Vite
- Node.js
- Express
- Fastify

Architecture must allow future ecosystem adapters.

---

# 9. Project Profile

QAForge must generate a machine-readable `ProjectProfile`.

Conceptual interface:

```ts
interface ProjectProfile {
  root: string;
  packageManager: string;
  workspaceType?: string;

  languages: string[];
  frameworks: string[];
  buildTools: string[];
  testFrameworks: string[];

  apps: ApplicationTarget[];

  routes: RouteDefinition[];
  apiEndpoints: ApiEndpoint[];

  sourceFiles: SourceModule[];
  testFiles: TestModule[];

  capabilities: ProjectCapability[];
  warnings: ProjectWarning[];
}
```

Implementation may improve this model where justified.

---

# 10. Requirement Intelligence

QAForge must discover product intent from local repository files.

Potential sources:

- README files
- PRDs
- docs
- specifications
- acceptance criteria
- TODO files
- OpenAPI definitions
- GraphQL schemas
- route definitions
- validation schemas
- TypeScript types
- existing tests
- source code

Normalize discovered requirements.

Each requirement should contain:

```text
requirementId
title
description
source
sourceLocation
priority
confidence
relatedModules
relatedRoutes
relatedEndpoints
testCoverage
```

---

# 11. Requirement-to-Test Traceability

Maintain the internal graph:

```text
Requirement
   ↓
Feature
   ↓
Module / Route / API
   ↓
Test Case
   ↓
Test Run
   ↓
Evidence
   ↓
Result
```

QAForge must be able to answer:

- Which requirement does this test validate?
- Which requirements have no tests?
- Which tests validate this feature?
- Which requirements were affected by the current Git diff?

---

# 12. Risk-Based Testing

Calculate a risk score for relevant areas.

Possible signals:

- recently changed code
- high dependency fan-in
- authentication/security sensitivity
- payment/data mutation
- complex branching
- previous failures
- low code coverage
- missing tests
- critical user-facing route
- API contract changes
- schema changes
- large Git diff

Example:

```text
riskScore: 0–100
```

Use risk score to prioritize test generation and execution.

---

# 13. Change Impact Analysis

QAForge must be Git-aware.

Analyze:

```bash
git diff
git diff --cached
git status
```

Build dependency relationships where practical.

Given:

```text
src/cart/calculateTotal.ts
```

QAForge should infer potentially impacted:

- unit tests
- cart integration tests
- checkout API tests
- checkout E2E workflows

Expose this through:

```text
qa.changed
```

---

# 14. Test Levels

QAForge should understand multiple levels.

## Static Validation

- TypeScript
- lint
- configuration validation

## Unit

- pure functions
- utilities
- stores
- hooks
- services

## Component

- component behavior
- user interactions

## Integration

- service boundaries
- module interactions
- database adapters
- API integrations

## API

- request validation
- authentication
- authorization
- HTTP status codes
- response contracts

## E2E

- browser workflows
- critical user journeys

---

# 15. v1 Test Runner Support

The first production release must include:

## Vitest

Unit and integration testing.

## Jest

Unit and integration testing.

## Playwright

Browser and E2E testing.

Playwright is a v1 requirement and must not be postponed.

---

# 16. Adapter Architecture

Create:

```text
src/adapters/
├── vitest/
├── jest/
└── playwright/
```

Conceptual interface:

```ts
interface TestAdapter {
  detect(context): Promise<DetectionResult>;
  discover(context): Promise<TestDiscovery>;
  generate?(request): Promise<GeneratedTests>;
  run(request): Promise<TestExecution>;
  coverage?(request): Promise<CoverageResult>;
  parseResults(raw): Promise<NormalizedTestResult>;
}
```

Adapters must not own product intelligence.

---

# 17. API Testing

API testing must be supported independently of browser testing.

Detect where possible:

- OpenAPI
- REST routes
- Express handlers
- Fastify handlers
- validation schemas

Generate relevant tests for:

- success
- missing fields
- invalid values
- authentication
- authorization
- unsupported methods
- boundaries
- server errors
- contract violations

---

# 18. Browser Testing

Playwright support should collect structured evidence.

Default browser:

```text
Chromium
```

Optional:

```text
Firefox
WebKit
```

On failure collect when configured:

- screenshot
- DOM snapshot
- console errors
- page errors
- failed network requests
- response status
- current URL
- selector details
- trace
- video

---

# 19. Stable Locator Strategy

Generated Playwright tests should prefer:

1. `getByRole`
2. `getByLabel`
3. `getByPlaceholder`
4. `getByText`
5. explicit test IDs
6. CSS selectors only as fallback

Avoid fragile structural selectors whenever possible.

---

# 20. Test Planning

Expose:

```text
qa.plan
```

Inputs should support:

```text
scope
paths
requirements
mode
riskThreshold
maxTests
includeE2E
includeAPI
```

Output:

```text
planId
summary
detectedFeatures
risks
testCases
coverageGaps
estimatedScope
```

Each proposed test:

```text
testCaseId
title
type
priority
requirementIds
targetFiles
reason
expectedBehavior
```

---

# 21. Test Generation

Expose:

```text
qa.generate
```

Generate tests from a test plan whenever possible.

Inputs:

```text
planId
testCaseIds
framework
overwritePolicy
```

Allowed overwrite policies:

```text
never
generated-only
explicit
```

Never silently overwrite developer-written tests.

---

# 22. Test Execution

Expose:

```text
qa.run
```

Scopes:

```text
all
changed
paths
plan
testIds
critical
```

Return compact structured output.

Concept:

```json
{
  "runId": "...",
  "status": "failed",
  "summary": {
    "total": 84,
    "passed": 80,
    "failed": 3,
    "skipped": 1
  },
  "durationMs": 4200,
  "failures": [],
  "artifacts": []
}
```

Do not dump full runner logs into the agent context.

---

# 23. Failure Diagnosis Engine

Create:

```text
src/diagnostics/
```

For every failure collect relevant evidence:

- test name
- test file
- source location
- stack trace
- assertion diff
- relevant stdout/stderr
- recent code changes
- browser evidence
- network evidence
- retries
- timing

Return:

```text
classification
confidence
rootCause
evidence
affectedFiles
suggestedActions
```

---

# 24. Failure Classification

Supported classifications:

```text
APPLICATION_BUG
TEST_BUG
FLAKY_TEST
ENVIRONMENT_FAILURE
CONFIGURATION_FAILURE
DEPENDENCY_FAILURE
NETWORK_FAILURE
TIMEOUT
DATA_FAILURE
UNKNOWN
```

Confidence:

```text
0.00 – 1.00
```

Never present unsupported certainty.

---

# 25. Safe Test Self-Healing

Expose:

```text
qa.heal
```

QAForge may automatically repair test code only when evidence indicates test fragility.

Safe examples:

- stale locator
- timing issue
- moved UI element
- renamed accessible label
- harmless test infrastructure drift

Do not change expected business behavior merely to make tests pass.

Every healing operation must report:

```text
before
after
reason
evidence
confidence
```

---

# 26. Source Fix Suggestions

Expose:

```text
qa.suggestFix
```

This tool must not silently modify application source.

Output:

```text
problem
probableRootCause
affectedFiles
suggestedChange
confidence
evidence
recommendedValidation
```

The connected coding agent remains responsible for source edits.

---

# 27. Verify-Fix Loop

QAForge should support:

```text
inspect
  ↓
plan
  ↓
generate
  ↓
run
  ↓
diagnose
  ↓
coding agent edits application
  ↓
changed impact analysis
  ↓
rerun impacted tests
  ↓
release confidence
```

---

# 28. Flaky Test Detection

Maintain local test history.

Track:

```text
runs
pass rate
failure signatures
average duration
duration variance
retry behavior
```

Expose:

```text
qa.flaky
```

Classification:

```text
stable
suspected-flaky
confirmed-flaky
```

---

# 29. Test Quality Score

Generated tests should receive a quality score based on factors such as:

- assertion usefulness
- requirement coverage
- edge-case coverage
- implementation coupling
- duplicated coverage
- selector stability
- mutation sensitivity where available

Example:

```text
TestQualityScore: 0–100
```

Passing alone must not equal high-quality testing.

---

# 30. Coverage

Expose:

```text
qa.coverage
```

Support:

- line coverage
- function coverage
- branch coverage
- statement coverage

Return both:

```text
codeCoverage
requirementCoverage
```

Code coverage must not be treated as the sole quality signal.

---

# 31. Requirement Coverage

Example:

```text
REQ-AUTH-001       covered
REQ-AUTH-002       partial
REQ-CHECKOUT-003   missing
```

Requirement coverage is separate from code coverage.

---

# 32. Persistent Local QA State

Use:

```text
.qaforge/
```

Potential content:

```text
.qaforge/
├── project-profile.json
├── requirements.json
├── test-map.json
├── plans/
├── runs/
├── artifacts/
├── reports/
└── cache/
```

Do not commit large generated content by default.

Provide `.gitignore` recommendations.

---

# 33. Persistent Test Sessions

Every run receives:

```text
runId
```

Expose:

```text
qa.run.get
qa.run.compare
```

Agents should be able to compare:

```text
before fix
vs
after fix
```

---

# 34. Release Confidence

Expose:

```text
qa.releaseCheck
```

Use signals including:

- critical test results
- requirement coverage
- changed-file coverage
- regressions
- flaky tests
- unresolved failures
- code coverage changes
- risk score
- lint/type errors where configured

Return:

```text
READY
READY_WITH_WARNINGS
NOT_READY
```

Also return:

```text
score: 0–100
```

with supporting reasons.

---

# 35. MCP Resources

Use MCP resources for reusable or potentially large structured data.

Potential resources:

```text
qa://project/profile
qa://requirements
qa://test-plan/{id}
qa://runs/{id}
qa://artifacts/{id}
```

---

# 36. MCP Prompts

Optional reusable MCP prompts:

```text
qa-review-changes
qa-test-feature
qa-debug-failure
qa-release-review
```

Core functionality must remain in tools, not prompts.

---

# 37. MCP SDK

Target the current stable MCP TypeScript server architecture.

Use the current supported server package and APIs.

Primary local transport:

```text
stdio
```

Future remote transport:

```text
Streamable HTTP
```

Do not design new functionality around deprecated transport patterns.

---

# 38. Configuration

Support:

```text
qaforge.config.ts
```

or:

```text
qaforge.config.json
```

Conceptual example:

```ts
export default {
  test: {
    unit: "vitest",
    e2e: "playwright"
  },

  browser: {
    baseURL: "http://localhost:5173"
  },

  safety: {
    allowGeneratedTestWrites: true,
    allowTestHealing: true,
    allowSourceWrites: false
  }
};
```

Configuration must remain optional.

Zero-config detection should be the default.

---

# 39. Zero-Config Detection

Attempt to detect:

- Jest
- Vitest
- Playwright
- package scripts
- package manager
- application startup command
- base URL
- TypeScript
- workspace layout
- monorepo layout

Explicit config overrides auto-detection.

---

# 40. Dev Server Management

For E2E tests QAForge may launch the target app.

Rules:

- detect existing dev server first
- avoid duplicates
- store PID for processes started by QAForge
- terminate only processes QAForge owns
- configurable timeout
- configurable health endpoint
- never kill unrelated processes

---

# 41. Safety Model

Never expose arbitrary shell command execution through MCP.

Runner commands must be constructed internally.

Validate:

- paths
- runner arguments
- file scopes
- config values

Protect against:

```text
path traversal
shell injection
malicious arguments
unexpected executable invocation
workspace escape
```

---

# 42. Process Execution

Prefer:

```ts
spawn(binary, args, {
  shell: false
});
```

Avoid constructing shell command strings from user-controlled input.

---

# 43. Repository Boundary

All file operations must remain inside the configured project root unless explicitly permitted.

Normalize and resolve paths before access.

Consider symlink-based escapes.

---

# 44. Secrets

Never expose secret values through MCP output or reports.

Redact likely secrets from:

```text
.env
Authorization headers
cookies
API tokens
database URLs
private keys
```

---

# 45. Browser Privacy

Browser artifacts can contain sensitive application data.

Allow configuration for:

```text
screenshots
videos
traces
networkBodies
```

Use privacy-preserving defaults.

---

# 46. Token Efficiency

Every MCP tool must return compact, agent-friendly results.

Use structures like:

```text
summary
topFailures
artifactReferences
truncated
```

Store verbose evidence locally.

Do not inject large console logs into the model context.

---

# 47. Structured Artifacts

Potential local artifacts:

```text
screenshots
traces
videos
coverage
HTML reports
JSON reports
console logs
network logs
DOM snapshots
```

MCP output should reference artifacts rather than embed large binary or verbose content.

---

# 48. Reporting

Support machine-readable reports:

```text
JSON
```

and human-readable reports:

```text
HTML
Markdown
```

Reports should include:

- project summary
- requirements tested
- test plan
- pass/fail results
- diagnostics
- evidence
- coverage
- risk
- unresolved problems
- release confidence

---

# 49. Recommended Source Architecture

```text
src/
├── cli/
│   ├── index.ts
│   └── commands/
│
├── mcp/
│   ├── server.ts
│   ├── tools/
│   ├── resources/
│   └── prompts/
│
├── application/
│   ├── inspect-project.ts
│   ├── plan-tests.ts
│   ├── generate-tests.ts
│   ├── execute-tests.ts
│   ├── diagnose-failure.ts
│   ├── heal-test.ts
│   ├── analyze-changes.ts
│   └── release-check.ts
│
├── domain/
│   ├── project/
│   ├── requirements/
│   ├── tests/
│   ├── diagnostics/
│   ├── coverage/
│   └── risk/
│
├── intelligence/
│   ├── project-scanner/
│   ├── dependency-graph/
│   ├── requirement-discovery/
│   └── change-impact/
│
├── adapters/
│   ├── jest/
│   ├── vitest/
│   └── playwright/
│
├── execution/
│   ├── process-runner.ts
│   ├── server-manager.ts
│   └── workspace-guard.ts
│
├── diagnostics/
├── storage/
├── reports/
└── shared/
```

The exact structure may be improved if architectural boundaries remain clean.

---

# 50. Domain Independence

The core domain must not depend directly on:

- MCP
- CLI
- Jest
- Vitest
- Playwright

This enables future interfaces such as:

- REST API
- desktop app
- CI integration
- IDE extension
- remote team service

without rewriting the core QA engine.

---

# 51. Future Runner Plugins

Prepare for future adapters:

```text
pytest
PHPUnit
cargo test
Go test
JUnit
Cypress
WebdriverIO
```

Do not implement all of these in v1.

---

# 52. Monorepo Support

Support:

- npm workspaces
- pnpm workspaces
- Yarn workspaces

Detect package boundaries.

Example:

```text
apps/web
apps/api
packages/core
packages/ui
```

Test plans must respect workspace boundaries.

---

# 53. Workspace-Specific Testing

Examples:

```ts
qa.inspect({
  workspace: "apps/web"
});
```

```ts
qa.run({
  scope: "changed",
  workspace: "packages/core"
});
```

---

# 54. Existing Test Preservation

Existing developer-written tests are first-class project assets.

QAForge must:

- discover them
- reuse them
- analyze their gaps
- avoid overwriting them automatically

Generated tests should be identifiable.

---

# 55. Test Generation Rules

Generated tests must:

- compile
- follow project conventions
- reuse existing helpers
- reuse fixtures
- respect import aliases
- respect formatter/linter configuration
- avoid unnecessary mocks
- avoid implementation-detail assertions
- use stable Playwright locators
- include meaningful assertions

---

# 56. Test Deduplication

Before generating new tests, inspect existing coverage.

Avoid generating multiple equivalent tests that validate the same behavior without adding useful coverage.

---

# 57. Edge Case Discovery

Consider relevant cases such as:

- empty input
- null/undefined
- min/max
- invalid formats
- unauthorized
- forbidden
- network failure
- server error
- duplicate action
- race-like actions
- loading state
- empty state
- malformed API response

Generate only relevant cases.

---

# 58. Accessibility — Optional v1 / v1.1

Prepare optional Playwright accessibility support through tools such as axe-core.

Potential future tool:

```text
qa.accessibility
```

---

# 59. Visual Regression — Future

Prepare architecture for:

```text
screenshot baselines
image comparison
snapshot approval
```

Not a release blocker for v1.

---

# 60. Mutation Testing — Future

Prepare optional future integration with tools such as Stryker.

Mutation score may later augment Test Quality Score.

---

# 61. Performance Testing — Future

Prepare architecture for later support of:

- Lighthouse
- k6
- Playwright performance metrics

Not required for v1.

---

# 62. CI Mode

QAForge must support deterministic CI operation.

Example:

```bash
npx qaforge release --ci
```

Suggested exit codes:

```text
0 = success
1 = validation failure
2 = configuration/runtime failure
```

Document exact semantics.

---

# 63. MCP Error Model

Every tool must use typed errors.

Suggested categories:

```text
INVALID_REQUEST
PROJECT_NOT_FOUND
FRAMEWORK_NOT_SUPPORTED
RUNNER_NOT_FOUND
CONFIG_ERROR
EXECUTION_ERROR
TIMEOUT
PERMISSION_ERROR
INTERNAL_ERROR
```

Do not expose uncontrolled stack traces by default.

---

# 64. Logging

Support:

```text
silent
error
warn
info
debug
trace
```

For stdio MCP:

> stdout must remain reserved for MCP protocol messages.

Diagnostic logs must go to stderr or files.

---

# 65. Performance Requirements

## MCP startup

Target approximately:

```text
< 2 seconds
```

on a typical development machine.

## Project Inspection

Use caching.

Do not rescan unchanged files unnecessarily.

## Large Repositories

Avoid loading the entire repository into memory when streaming/indexed processing is possible.

---

# 66. Cache Invalidation

Use metadata or content hashes where appropriate.

Example:

```text
file change
   ↓
partial dependency graph update
   ↓
partial requirement map update
   ↓
recalculate impacted tests
```

---

# 67. npm Distribution

Primary package:

```text
qaforge
```

Install:

```bash
npm install -D qaforge
```

Run MCP:

```bash
npx -y qaforge mcp
```

---

# 68. GitHub Distribution

Allow installation directly from GitHub.

Example:

```bash
npm install -D github:NadiaSalah/qaforge
```

The repository should contain source code, documentation, issues, releases, and development history.

npm remains the preferred installation method for stable releases.

---

# 69. Package Requirements

Include:

```text
package.json
README.md
CHANGELOG.md
LICENSE
SECURITY.md
CONTRIBUTING.md
```

Use semantic versioning.

---

# 70. Documentation Requirements

README must contain tested setup instructions for:

- npm installation
- GitHub installation
- CLI usage
- MCP usage
- Cursor
- Claude Code
- Codex
- Windsurf
- Cline
- VS Code compatible MCP hosts

Do not claim host compatibility unless verified.

---

# 71. Testing QAForge Itself

QAForge must have comprehensive automated tests.

## Unit Tests

At minimum:

- project detection
- path safety
- result normalization
- failure classification
- risk scoring
- configuration
- redaction
- cache invalidation

## Integration Tests

At minimum:

- Jest adapter
- Vitest adapter
- Playwright adapter
- MCP interface
- CLI interface

---

# 72. Fixture Projects

Create real sample fixtures:

```text
fixtures/
├── vitest-react/
├── jest-node/
├── playwright-vite/
├── broken-tests/
├── monorepo/
├── auth-bug/
└── stale-locator/
```

---

# 73. Golden Fixtures

Maintain fixtures with known expected outcomes.

Example:

```text
fixture: auth-bug

expected:
login-success -> PASS
wrong-password -> PASS
missing-token -> FAIL APPLICATION_BUG
```

These fixtures protect QAForge from regressions in its own diagnostic logic.

---

# 74. Acceptance Test — Autonomous Flow

A mandatory integration test must prove:

```text
fixture project
    ↓
qa.inspect
    ↓
qa.plan
    ↓
qa.generate
    ↓
qa.run
    ↓
intentional application bug detected
    ↓
qa.diagnose
    ↓
APPLICATION_BUG
```

This is a release gate.

---

# 75. Acceptance Test — Change Impact

Create a fixture where:

```text
core function A
       ↓
service B
       ↓
page C
```

Modify A.

`qa.changed` must identify relevant unit, integration, and E2E tests without selecting unrelated suites.

---

# 76. Acceptance Test — Test Healing

Create a Playwright fixture containing an intentionally stale locator.

QAForge must:

1. detect the failure
2. classify it as likely `TEST_BUG`
3. find a stable accessible locator
4. suggest or perform safe healing
5. rerun the test
6. preserve the original business assertion

---

# 77. Release Gates

Before publishing v1:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

must pass.

Also run fixture-based end-to-end validation.

---

# 78. Version 1 Scope

## Core Engine

- project inspection
- zero-config stack detection
- requirement discovery
- dependency mapping
- risk scoring
- test planning
- test generation
- execution
- diagnostics
- safe test healing
- changed-file impact analysis
- release confidence

## Test Runners

- Vitest
- Jest
- Playwright

## Interfaces

- CLI
- MCP stdio

## Evidence

- logs
- screenshots
- Playwright traces when enabled
- coverage
- reports

---

# 79. Version 1.1

Possible additions:

- enhanced REST/OpenAPI testing
- accessibility testing
- advanced flaky-test analysis
- richer requirement parsing
- deeper CI integrations

---

# 80. Version 1.2+

Potential additions:

- pytest
- PHPUnit
- Rust
- Go
- visual regression
- mutation testing
- performance testing
- Streamable HTTP transport
- shared team history
- optional dashboard

---

# 81. Explicit Non-Goals for v1

Do not build:

- hosted SaaS
- mandatory cloud accounts
- billing
- large web dashboard
- arbitrary shell execution
- automatic application-source modification
- every testing framework
- remote execution infrastructure

Build the local engine exceptionally well first.

---

# 82. Implementation Rules for Coding Agents

While implementing QAForge:

1. Inspect the repository before writing code.
2. Never assume dependency versions.
3. Verify APIs against installed/current versions.
4. Keep core domain independent from MCP.
5. Avoid giant files.
6. Avoid circular dependencies.
7. Avoid duplicated logic.
8. Use strict TypeScript.
9. Avoid `any` unless justified.
10. Add tests with every major subsystem.
11. Run relevant tests after meaningful changes.
12. Never weaken tests merely to obtain a green build.
13. Never delete existing functionality silently.
14. Preserve backward compatibility when practical.
15. Never expose arbitrary shell execution.
16. Validate every path crossing CLI or MCP boundaries.
17. Redact secrets.
18. Keep MCP outputs compact and structured.
19. Treat developer-written tests as protected assets.
20. Keep all generated local state within `.qaforge/` unless explicitly configured otherwise.

---

# 83. Implementation Phases

## Phase A — Foundation

Build:

- package structure
- domain types
- configuration
- CLI bootstrap
- MCP bootstrap
- workspace guard
- safe process runner

Validate before proceeding.

---

## Phase B — Project Intelligence

Build:

- scanner
- package detection
- framework detection
- test framework detection
- workspace detection
- project profile

Validate with fixtures.

---

## Phase C — Runner Layer

Build:

- Vitest adapter
- Jest adapter
- normalized result model

Validate.

---

## Phase D — Playwright

Build:

- browser execution
- dev server management
- screenshots
- console errors
- network evidence
- optional traces

Validate.

---

## Phase E — Requirements & Planning

Build:

- requirement discovery
- requirement normalization
- risk scoring
- test plans

Validate.

---

## Phase F — Test Generation

Build:

- framework-aware generation
- deduplication
- overwrite policies
- generated-test identification

Validate.

---

## Phase G — Diagnostics

Build:

- failure evidence collection
- classification
- root-cause model
- confidence scoring

Validate.

---

## Phase H — Changed Testing

Build:

- Git diff analyzer
- dependency graph
- impacted test selection

Validate.

---

## Phase I — Healing

Build guarded test self-healing.

Validate against stale-locator and brittle-test fixtures.

---

## Phase J — Release Intelligence

Build:

- requirement coverage
- test quality score
- flaky detection
- release confidence

Validate.

---

## Phase K — Packaging

Finalize:

- npm package
- GitHub installation
- npx execution
- README
- MCP host configs
- changelog
- security docs

Run full release gates.

---

# 84. Development Checkpoint Rule

At the end of every implementation phase, output:

```text
PHASE
Implemented
Files changed
Tests added
Tests passed
Known limitations
Next phase
```

Do not continue to the next phase while the current phase has unresolved build or test failures.

---

# 85. Definition of Done

QAForge v1 is complete only when a fresh supported project can perform:

```text
install
 ↓
initialize
 ↓
connect MCP or use CLI
 ↓
inspect project
 ↓
discover features
 ↓
discover requirements
 ↓
build test plan
 ↓
generate missing tests
 ↓
run unit/integration/E2E tests
 ↓
collect evidence
 ↓
diagnose failures
 ↓
classify root causes
 ↓
analyze changed-file impact
 ↓
rerun affected tests
 ↓
produce release confidence
```

without requiring manual terminal test orchestration.

---

# 86. Final Product Standard

Do not optimize merely for:

> "The tests ran."

Optimize for:

> "A coding agent can trust QAForge to independently verify whether its code changes actually work."

QAForge must behave like a local autonomous QA engineer embedded in the project, not like a thin command runner.

Its architecture must support future languages, runners, CI integrations, IDE integrations, remote transports, and optional UI layers without rewriting the testing core.
