# VeloProve CLI Reference

The `veloprove` CLI provides a complete set of commands for inspecting, testing, diagnosing, and verifying projects locally.

Root `veloprove --help` lists commands in groups matching the Dashboard sidebar: **Start**, **Verify**, **Repair**, **Results**, **API**, **Security**, **Experience**, **More**. **Daily-10:** `init`, `teach-ai`, `ask`, `inspect`, `doctor`, `verify`, `test`, `changed`, `security`, `history`.

Aliases (e.g. `chat`→`ask`, `dev`→`ensure-dev`) are shortcuts only; documentation and MCP tools use the full canonical command / `vp.*` name.

### Dashboard availability

Most commands are reachable from Dashboard **Tool Lab** (same engine). Exceptions:

| Dashboard class | Commands | Notes |
| :--- | :--- | :--- |
| **Terminal only** | `ui`, `tui`, `mcp`, `watch`, `mock-server` | Cannot nest inside Dashboard — run in a terminal |
| **Partial** | `alert`, `db-snapshot`, `db-restore`, `refine`, `run-collection`, `dead-assets` | Degraded Dashboard path; prefer CLI for full options |

Full matrix: `docs/reference/surface-matrix.md`. Guide/About in `veloprove ui` list the Terminal-only set explicitly.

---

## Command Overview

| Command | Description | Example | Dashboard |
| :--- | :--- | :--- | :--- |
| `veloprove init` | Initialize project config and local state | `npx veloprove init` | Run |
| `veloprove doctor` | Run diagnostics (Vitest/Jest/Playwright/`node:test`) | `npx veloprove doctor --json` | Run |
| `veloprove ensure-dev` | Smart DevServer auto-launcher when app is offline. Alias: `dev` | `npx veloprove dev http://localhost:5173` | Run |
| `veloprove verify` | Autonomous change-aware QA orchestrator | `npx veloprove verify --json --ci` | Run |
| `veloprove twin` | Build/inspect Project Twin (PARTIAL MVP) | `npx veloprove twin build --with-impact --with-drift` | Run |
| `veloprove impact` | Change impact (wraps `changed` + Twin hits) | `npx veloprove impact --json` | Run |
| `veloprove drift` | Aggregated drift (contract + parity + env + docs) | `npx veloprove drift --json` | Run |
| `veloprove history` | Local test-run history trends | `npx veloprove history -n 20 --json` | Run |
| `veloprove inspect` | Inspect stack, routes, APIs, runners (incl. `node:test`), requirements | `npx veloprove inspect --json` | Run |
| `veloprove teach-ai` | Teach project AI how to use VeloProve (AGENTS.md + paste briefing). Alias: `agent-handshake` | `npx veloprove teach-ai --force --mcp -a "Cursor"` | Run |
| `veloprove ask` | Docs-grounded Q&A from packaged markdown (no cloud LLM). Alias: `chat` | `npx veloprove ask "how do I link Cursor?"` | Run |
| `veloprove explore` | Live crawler & interactive UI exploration map | `npx veloprove explore http://localhost:3000` | URL |
| `veloprove fuzz-api` | Generate API security and boundary probes. Alias: `fuzz` | `npx veloprove fuzz` | Run |
| `veloprove plan` | Generate risk-prioritized test plan | `npx veloprove plan -s critical -m 20` | Run |
| `veloprove generate` | Generate Vitest/Jest/Playwright/`node:test` files | `npx veloprove generate --overwrite generated-only` | Write |
| `veloprove test` | Run suites (Vitest/Jest/Playwright/`node --test`) | `npx veloprove test -s changed` | Run |
| `veloprove run-collection` | Run Postman Collection v2.1/v2.0 test suite. Alias: `collection` | `npx veloprove collection ./tests/api.json -e ./env.json` | Partial |
| `veloprove export-postman` | Export routes & APIs to Postman JSON. Alias: `postman` | `npx veloprove postman -o ./postman.json` | Run |
| `veloprove request` | Send ad-hoc HTTP request like Postman | `npx veloprove request GET http://localhost:3000/api/users` | URL |
| `veloprove changed` | List tests impacted by Git changes (run with `test -s changed`) | `npx veloprove changed --json` | Run |
| `veloprove diagnose` | Diagnose test failures with root cause evidence | `npx veloprove diagnose` | Run |
| `veloprove heal` | Self-heal brittle test selectors safely | `npx veloprove heal` | Write |
| `veloprove release` | Release confidence gate only (use `verify` for full QA) | `npx veloprove release --json --ci` | Run |
| `veloprove ui` | Start local live dashboard web server | `npx veloprove ui -p 4173` | **Terminal only** |
| `veloprove setup-ci` | Generate GitHub Actions autonomous QA workflow | `npx veloprove setup-ci` | Write |
| `veloprove mutation-score` | Calculate assertion mutation quality score. Alias: `mutation` | `npx veloprove mutation` | Run |
| `veloprove learn-framework` | Teach uncommon/custom framework. Alias: `learn` | `npx veloprove learn` | Run |
| `veloprove lint` | Run ESLint and static code analysis | `npx veloprove lint -s changed --fix` | Run / Write |
| `veloprove audit` | CVE + secrets scan (not live security suite) | `npx veloprove audit` | Run |
| `veloprove perf` | Audit Core Web Vitals and route performance | `npx veloprove perf` | URL |
| `veloprove mock-gen` | Generate MSW network mock handlers | `npx veloprove mock-gen` | Run |
| `veloprove quarantine` | Isolate and quarantine flaky tests | `npx veloprove quarantine -t 0.25` | Run |
| `veloprove coverage` | Generate PRD requirements coverage heatmap | `npx veloprove coverage` | Run |
| `veloprove tui` | Open interactive Terminal Command Center | `npx veloprove tui` | **Terminal only** |
| `veloprove refine` | Refine test assertions with natural language | `npx veloprove refine "validate coupon error state"` | Partial |
| `veloprove a11y` | Static WCAG-oriented accessibility heuristics | `npx veloprove a11y` | Run |
| `veloprove visual-diff` | Compare UI screenshots with baseline. Alias: `vdiff` | `npx veloprove vdiff` | Run |
| `veloprove contract-drift`| Detect OpenAPI vs code route drift | `npx veloprove contract-drift` | Run |
| `veloprove load-test` | Local load & stress benchmark. Alias: `load` | `npx veloprove load http://localhost:3000/api -c 20 -d 5` | URL |
| `veloprove mock-data` | Generate realistic test fixtures | `npx veloprove mock-data -p user -c 5` | Run |
| `veloprove owasp-scan` | OWASP headers/CSP/CORS probe. Alias: `owasp` | `npx veloprove owasp http://localhost:3000` | URL |
| `veloprove graphql` | Execute and test GraphQL query | `npx veloprove graphql http://localhost:3000/graphql "query { user { id } }"` | URL |
| `veloprove ws-test` | Test WebSocket connection handshake | `npx veloprove ws-test ws://localhost:3000/ws` | URL |
| `veloprove remote-init` | Generate drop-in companion probe file. Alias: `probe` | `npx veloprove probe -t nextjs_route` | Run |
| `veloprove remote-connect` | Connect & handshake with live website. Alias: `connect` | `npx veloprove connect https://app.com -s <token>` | URL |
| `veloprove remote-audit` | Run full live remote audit & crawler. Alias: `raudit` | `npx veloprove raudit https://app.com --load` | URL |
| `veloprove record-scenario` | Synthesize E2E scenario Playwright test. Alias: `record` | `npx veloprove record "Cart Flow" -u http://localhost:3000/cart` | Run |
| `veloprove stabilize` | Refactor flaky tests to auto-wait assertions | `npx veloprove stabilize ./tests/flaky.spec.ts --fix` | Run |
| `veloprove db-snapshot` | Backup & freeze database / fixture state | `npx veloprove db-snapshot "initial" app.db.json` | Partial |
| `veloprove db-restore` | Restore database state from snapshot ID | `npx veloprove db-restore snap_12345` | Partial |
| `veloprove auto-fix` | Synthesize code patches for app bugs | `npx veloprove auto-fix --apply` | Write |
| `veloprove export-report` | Export executive report. Alias: `report` | `npx veloprove report -f allure` | Run |
| `veloprove chaos` | Run chaos monkey resilience tests | `npx veloprove chaos http://localhost:3000/api` | URL |
| `veloprove docker-env` | Generate containerized isolated test env. Alias: `docker` | `npx veloprove docker -s postgres redis` | Run |
| `veloprove browser-matrix` | Generate multi-browser Playwright matrix. Alias: `browsers` | `npx veloprove browsers` | Run |
| `veloprove bdd` | Generate BDD Gherkin .feature specs | `npx veloprove bdd -o features` | Run |
| `veloprove alert` | Dispatch test verdict to Slack/Discord | `npx veloprove alert <webhookUrl>` | Partial |
| `veloprove feature-parity` | Audit UI-to-Backend parity. Alias: `parity` | `npx veloprove parity` | Run |
| `veloprove scan-malware` | Scan & remediate malware / backdoors. Alias: `malware` | `npx veloprove malware --fix` | Run / Write |
| `veloprove ai-eval` | Evaluate LLM & AI responses for hallucinations | `npx veloprove ai-eval <url>` | URL |
| `veloprove bisect` | Pinpoint bug-introducing commit | `npx veloprove bisect` | Write |
| `veloprove throttle` | Simulate mobile network latency & drops | `npx veloprove throttle <url>` | URL |
| `veloprove audit-contracts` | Audit Solidity & Web3 contracts. Alias: `contracts` | `npx veloprove contracts` | Run |
| `veloprove dead-assets` | Detect & purge dead assets. Alias: `dead` | `npx veloprove dead --purge` | Partial (scan) / Write (CLI `--purge`) |
| `veloprove screen-reader` | Simulate screen reader audio flow. Alias: `sr` | `npx veloprove sr` | Run |
| `veloprove db-audit` | Audit SQL N+1 & unindexed query bottlenecks | `npx veloprove db-audit` | Run |
| `veloprove env-drift` | Audit multi-env configs & secret drift | `npx veloprove env-drift --generate-example` | Run |
| `veloprove replay` | Generate visual failure replay package | `npx veloprove replay -t "Login" -m "Timeout"` | Run |
| `veloprove rate-limit` | Audit API rate-limiting & DoS threshold | `npx veloprove rate-limit http://localhost:3000/api -n 30` | URL |
| `veloprove mock-server` | Start local in-memory CRUD stateful mock server | `npx veloprove mock-server --port 4040` | **Terminal only** |
| `veloprove arch-graph` | Generate architecture topology & Mermaid graph | `npx veloprove arch-graph` | Run |
| `veloprove security` | Live non-destructive security suite (≠ `audit` / `owasp` / `web-sec`) | `npx veloprove security --safe --sessions` | Run / URL |
| `veloprove hook` | Install or remove automated Git pre-commit hooks | `npx veloprove hook install` | Write |
| `veloprove web-sec` | Static SRI / CSRF / CORS policy audit | `npx veloprove web-sec` | Run |
| `veloprove dedup` | Analyze test suites and identify duplicate test cases | `npx veloprove dedup` | Run |
| `veloprove sandbox` | Launch ephemeral mock DB & sandbox server | `npx veloprove sandbox -p 8089` | Run |
| `veloprove watch` | Real-time interactive watch mode | `npx veloprove watch` | **Terminal only** |
| `veloprove mcp` | Start VeloProve MCP Server over stdio | `npx veloprove mcp` | **Terminal only** |

---

## Short aliases (same commands, less typing)

Aliases do **not** add new commands (parity stays at `catalogCliCommands().length`). Use either name:

| Short | Full command |
| :--- | :--- |
| `teach-ai` / `agent-handshake` | Teach AI handshake |
| `ask` / `chat` | Docs-grounded Q&A |
| `learn` | `learn-framework` |
| `fuzz` | `fuzz-api` |
| `mutation` | `mutation-score` |
| `vdiff` | `visual-diff` |
| `collection` | `run-collection` |
| `postman` | `export-postman` |
| `load` | `load-test` |
| `owasp` | `owasp-scan` |
| `probe` | `remote-init` |
| `connect` | `remote-connect` |
| `raudit` | `remote-audit` |
| `record` | `record-scenario` |
| `report` | `export-report` |
| `docker` | `docker-env` |
| `browsers` | `browser-matrix` |
| `parity` | `feature-parity` |
| `malware` | `scan-malware` |
| `contracts` | `audit-contracts` |
| `dead` | `dead-assets` |
| `sr` | `screen-reader` |
| `dev` | `ensure-dev` |

### Flag conventions
- **`-u` / `--url`** = URL target (explore, security, ensure-dev, record, collections, …). Positional `[url]` is also accepted for `explore`, `ensure-dev` / `dev`, and `security`.
- **`--json`** = machine-readable JSON on stdout for `inspect`, `doctor`, `changed`, `release`, `verify`, `history`, `ask` (and others where noted).
- **`-c` / `--vus`** = concurrent virtual users on `load-test` / `remote-audit` (not `-u`)
- **`-o` / `--out`** = output path (`export-postman`, `export-report`, `remote-init`, …)
- **`-y` / `--yes`** = skip interactive confirmation for sensitive write ops when using `--allow-no-ai` (local manual mode). With a linked AI agent / MCP, sensitive ops auto-execute.
- **`--allow-no-ai`** = run a sensitive step locally without Cursor/Claude/Windsurf/Cline (advanced). Without AI and without this flag, the CLI prints that the agentic operation requires an AI coding agent.
- **`--force` / `--fix` / `--apply` / `--purge`** = explicit opt-in for destructive or overwrite actions (still gated by AI presence / `--allow-no-ai` as above)

---

## Detailed Command Options

### `veloprove plan`
- `-s, --scope <scope>`: Filter planning scope (`all`, `uncovered`, `critical`, `e2e`, `api`, `unit`, `changed`).
- `-m, --max <max>`: Maximum number of test cases to produce.

### `veloprove generate`
- Emits runner-matched files: Vitest/Jest/Playwright TypeScript, or `node:test` + `node:assert/strict` (`.test.js`) when the plan runner is `node:test`.
- `--overwrite <policy>`: File write policy (`never`, `generated-only`, `explicit`). Default: `generated-only`.
- `--no-live-ground`: Skip live GET probing before writing API status / content-type / shape assertions.
- `-u, --url <url>`: Base URL for live grounding (default `API_BASE_URL` or `http://localhost:3000`).
- Writes/refreshes local fixtures under `tests/fixtures/veloprove` by default.
- Plan prefers `.veloprove/cache/site-exploration.json` when present (run `explore` first for richer E2E).

### `veloprove test`
- `-s, --scope <scope>`: Scope to run (`all`, `changed`, `paths`, `critical`).
- `-p, --paths <paths...>`: Space-separated list of specific test files.

### `veloprove release`
- `--ci`: Exit with process status code `1` if verdict is `NOT_READY`.

### `veloprove refine`
- `<instruction>`: Natural language requirement or assertion change.
- `-f, --file <file>`: Specific target test file path.

### `veloprove sandbox`
- `-p, --port <port>`: Port to bind sandbox mock HTTP server (default: `8089`).

### `veloprove security`
- `--auth`: Test authentication (login, password reset, rate-limiting, enumeration).
- `--authorization`: Test authorization (IDOR, role escalation, protected routes).
- `--forms`: Test forms and input parameter tampering.
- `--injection`: Test SQLi, NoSQLi, XSS, Command, and Path Traversal injections.
- `--api`: Test API security and verbose error/stack trace leakage.
- `--uploads`: Test file upload extension and MIME sanitization.
- `--sessions`: Session theft suite (cookie flags, URL leaks, fixation, client storage, logout invalidation) + JWT integrity.
- `--ensure-dev`: Auto-start local app via Smart DevServer when target is offline.
- `--init-policy`: Generate starter security policy (`baseline` | `owasp-asvs` | `soc2` | `hipaa`).
- `--policy <framework>`: Framework used with `--init-policy` (default: `baseline`).
- `--safe`: Enable safe mode non-destructive constraints (default: `true`).
- `--deep`: Enable deep security testing mode.
- `--sarif <path>`: Export findings in SARIF v2.1.0 format for GitHub Security.
- `-u, --url <url>`: Target live application URL.
- `-f, --format <format>`: Output format (`console`, `json`, `markdown`).
- `--ci`: Exit with code 1 if CRITICAL or HIGH findings exist.

### `veloprove ensure-dev`
- `-u, --url <url>`: Target base URL to bring online.
- `-c, --command <command>`: Override start command (e.g. `npm run dev`).
- `-p, --port <port>`: Port override.
- `-t, --timeout <ms>`: Health timeout (default: `30000`).
- `--force`: Force restart even if already healthy.

### `veloprove verify`
Autonomous change-aware verification pipeline (CapabilityRegistry-driven).
- `--full`: Run the full suite instead of impacted tests only.
- `--security`: Force non-destructive security suite inclusion.
- `--a11y`: Force accessibility audit inclusion.
- `--no-heal`: Skip automatic TEST_BUG healing.
- `--intent <text>`: Deterministic natural-language planner (no LLM execution); biases capability selection.
- `--sandbox`: Start local mock sandbox and set `API_BASE_URL` for this run (no vendor cloud).
- `--docker-env`: Generate local docker-compose test env files before verify.
- `--json`: Emit pure `OperationResult` JSON on stdout (logs stay on stderr via spinner suppression).
- `--ci`: Apply exit codes: `0` success / warnings, `1` quality blocked, `2` config, `3` infrastructure.
- On failures: writes agent-ready pack under `.veloprove/evidence/<runId>/`.

### `veloprove watch`
- `--verify`: Run change-aware `verify` on each change instead of impacted tests only.
- `-i, --interval <sec>`: Also run verify on an interval (minimum 30s).

### `veloprove twin`
Build or inspect **Project Twin** (local JSON under `.veloprove/twin/`). Composes `inspect` SSOT; optional `--with-impact` / `--with-drift` wrap existing `changed` and the drift aggregator. Supports `--incremental` (default) / `--force`. **PARTIAL MVP** — INFERRED edges are not confirmed facts.

```bash
npx veloprove twin build --with-impact --with-drift
npx veloprove twin build --force
npx veloprove twin status --json
npx veloprove twin inspect <featureId>
```

### `veloprove impact`
Git change impact wrapping `changed`. When Twin exists, lists related Twin features. Prefer `changed` for the raw test map.

- `--json`: Emit impact + Twin attachment JSON.

### `veloprove drift`
Aggregator over `contract-drift`, `feature-parity`, `env-drift`, plus docs API-mention STALE hints. Marks Twin fingerprint disagreement as STALE.

```bash
npx veloprove drift
npx veloprove drift <feature> --changed --json
```

### `veloprove test --affected`
Twin-aware test selection (unions DependencyGraph + Twin impact). **Expands to full suite** when confidence is low or no tests map — never silently shrinks.

### `veloprove history`
Show local test-run history trends from `.veloprove` state.
- `-n, --limit <n>`: Max points to print (default: `20`, max: `50`).
- `--json`: Emit full history snapshot JSON.

### `veloprove hook`
- `install`: Set up `.git/hooks/pre-commit` or Husky hook to run change-impact tests.
- `uninstall`: Remove existing VeloProve pre-commit hooks.
- `-c, --cmd <command>`: Command to execute (default: `npx veloprove changed`).
- `--verify`: Preset command `npx veloprove verify --ci`.

### `veloprove web-sec`
- Audits Subresource Integrity (`integrity="sha384-..."`), mutating form CSRF tokens, and dangerous CORS credential wildcards.

### `veloprove dedup`
- Scans Vitest/Playwright/Jest test suites to identify duplicate test assertions and redundancy percentage.

---

## MCP-only tools (no CLI twin)

These are available only over the MCP server (`vp.*`). Use them from coding agents; there is no `veloprove <cmd>` equivalent.

| MCP tool | Purpose |
| :--- | :--- |
| `vp.run.get` | Poll status of a long-running `vp.run` |
| `vp.suggestFix` | Source-fix suggestions after `APPLICATION_BUG` diagnosis |
| `vp.flaky` | Read flaky-test history aggregates |

Related CLI (different names): `teach-ai` (alias `agent-handshake`) ↔ `vp.bootstrap`; `request` ↔ `vp.sendRequest`; `security` covers `vp.securityScan|Plan|Run|Report` + SARIF. See **Short aliases** above for typing shortcuts.
