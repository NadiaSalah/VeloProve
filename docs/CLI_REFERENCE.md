# QAForge CLI Reference

The `qaforge` CLI provides a complete set of commands for inspecting, testing, diagnosing, and verifying projects locally.

---

## Command Overview

| Command | Description | Example |
| :--- | :--- | :--- |
| `qaforge init` | Initialize project config and local state | `npx qaforge init` |
| `qaforge doctor` | Run environmental, runtime, and project diagnostics | `npx qaforge doctor` |
| `qaforge inspect` | Inspect stack, routes, APIs, and requirements | `npx qaforge inspect` |
| `qaforge agent-handshake` | Run self-teaching handshake for any AI agent | `npx qaforge agent-handshake -a "ClaudeCode"` |
| `qaforge explore` | Live crawler & interactive UI exploration map | `npx qaforge explore --url http://localhost:3000` |
| `qaforge fuzz-api` | Generate API security and boundary probes | `npx qaforge fuzz-api` |
| `qaforge plan` | Generate risk-prioritized test plan | `npx qaforge plan -s critical -m 20` |
| `qaforge generate` | Generate executable test files | `npx qaforge generate --overwrite generated-only` |
| `qaforge test` | Run tests and collect structured results | `npx qaforge test -s changed` |
| `qaforge run-collection` | Run Postman Collection v2.1/v2.0 test suite | `npx qaforge run-collection ./tests/api.json -e ./env.json` |
| `qaforge export-postman` | Export routes & APIs as Postman Collection v2.1 JSON | `npx qaforge export-postman -o ./postman.json` |
| `qaforge request` | Send ad-hoc HTTP request like Postman | `npx qaforge request GET http://localhost:3000/api/users` |
| `qaforge changed` | Git change impact analysis | `npx qaforge changed` |
| `qaforge diagnose` | Diagnose test failures with root cause evidence | `npx qaforge diagnose` |
| `qaforge heal` | Self-heal brittle test selectors safely | `npx qaforge heal` |
| `qaforge release` | Release confidence score & gate check | `npx qaforge release --ci` |
| `qaforge ui` | Start local live dashboard web server | `npx qaforge ui -p 4173` |
| `qaforge setup-ci` | Generate GitHub Actions autonomous QA workflow | `npx qaforge setup-ci` |
| `qaforge mutation-score` | Calculate assertion mutation quality score | `npx qaforge mutation-score` |
| `qaforge learn-framework` | Teach QAForge uncommon or custom in-house framework | `npx qaforge learn-framework` |
| `qaforge lint` | Run ESLint and static code analysis | `npx qaforge lint -s changed --fix` |
| `qaforge audit` | Scan for CVE vulnerabilities and hardcoded secrets | `npx qaforge audit` |
| `qaforge perf` | Audit Core Web Vitals and route performance | `npx qaforge perf` |
| `qaforge mock-gen` | Generate MSW network mock handlers | `npx qaforge mock-gen` |
| `qaforge quarantine` | Isolate and quarantine flaky tests | `npx qaforge quarantine -t 0.25` |
| `qaforge coverage` | Generate PRD requirements coverage heatmap | `npx qaforge coverage` |
| `qaforge tui` | Open interactive Terminal Command Center | `npx qaforge tui` |
| `qaforge refine` | Refine test assertions with natural language | `npx qaforge refine "validate coupon error state"` |
| `qaforge a11y` | Automated WCAG 2.1 accessibility audit | `npx qaforge a11y` |
| `qaforge visual-diff` | Compare UI screenshots with baseline | `npx qaforge visual-diff` |
| `qaforge contract-drift`| Detect OpenAPI vs code route drift | `npx qaforge contract-drift` |
| `qaforge load-test` | Run local load & stress benchmark | `npx qaforge load-test http://localhost:3000/api -u 20 -d 5` |
| `qaforge mock-data` | Generate realistic test fixtures | `npx qaforge mock-data -p user -c 5` |
| `qaforge owasp-scan` | Run OWASP Top 10 security audit | `npx qaforge owasp-scan http://localhost:3000` |
| `qaforge graphql` | Execute and test GraphQL query | `npx qaforge graphql http://localhost:3000/graphql "query { user { id } }"` |
| `qaforge ws-test` | Test WebSocket connection handshake | `npx qaforge ws-test ws://localhost:3000/ws` |
| `qaforge remote-init` | Generate drop-in companion probe file | `npx qaforge remote-init -t nextjs_route` |
| `qaforge remote-connect` | Connect & handshake with live website | `npx qaforge remote-connect https://app.com -s <token>` |
| `qaforge remote-audit` | Run full live remote audit & crawler | `npx qaforge remote-audit https://app.com --load` |
| `qaforge record-scenario` | Synthesize E2E scenario Playwright test | `npx qaforge record-scenario "Cart Flow" -u http://localhost:3000/cart` |
| `qaforge stabilize` | Refactor flaky tests to auto-wait assertions | `npx qaforge stabilize ./tests/flaky.spec.ts --fix` |
| `qaforge db-snapshot` | Backup & freeze database / fixture state | `npx qaforge db-snapshot "initial" app.db.json` |
| `qaforge db-restore` | Restore database state from snapshot ID | `npx qaforge db-restore snap_12345` |
| `qaforge auto-fix` | Synthesize code patches for app bugs | `npx qaforge auto-fix --apply` |
| `qaforge export-report` | Export standalone executive audit report | `npx qaforge export-report -f html` |
| `qaforge chaos` | Run chaos monkey resilience tests | `npx qaforge chaos http://localhost:3000/api` |
| `qaforge docker-env` | Generate containerized isolated test env | `npx qaforge docker-env -s postgres redis` |
| `qaforge browser-matrix` | Generate multi-browser Playwright matrix | `npx qaforge browser-matrix` |
| `qaforge bdd` | Generate BDD Gherkin .feature specs | `npx qaforge bdd -o features` |
| `qaforge alert` | Dispatch test verdict to Slack/Discord | `npx qaforge alert <webhookUrl>` |
| `qaforge feature-parity` | Audit UI-to-Backend parity & ghost features | `npx qaforge feature-parity` |
| `qaforge scan-malware` | Scan & remediate malware / backdoors | `npx qaforge scan-malware --fix` |
| `qaforge ai-eval` | Evaluate LLM & AI responses for hallucinations | `npx qaforge ai-eval <url>` |
| `qaforge bisect` | Pinpoint bug-introducing commit | `npx qaforge bisect` |
| `qaforge throttle` | Simulate mobile network latency & drops | `npx qaforge throttle <url>` |
| `qaforge audit-contracts` | Audit Solidity & Web3 smart contracts | `npx qaforge audit-contracts` |
| `qaforge dead-assets` | Detect & purge unreferenced dead assets | `npx qaforge dead-assets --purge` |
| `qaforge screen-reader` | Simulate screen reader audio flow & tags | `npx qaforge screen-reader` |
| `qaforge db-audit` | Audit SQL N+1 & unindexed query bottlenecks | `npx qaforge db-audit` |
| `qaforge env-drift` | Audit multi-env configs & secret drift | `npx qaforge env-drift --generate-example` |
| `qaforge replay` | Generate visual failure replay package | `npx qaforge replay -t "Login" -m "Timeout"` |
| `qaforge rate-limit` | Audit API rate-limiting & DoS threshold | `npx qaforge rate-limit http://localhost:3000/api -n 30` |
| `qaforge mock-server` | Start local in-memory CRUD stateful mock server | `npx qaforge mock-server --port 4040` |
| `qaforge arch-graph` | Generate architecture topology & Mermaid graph | `npx qaforge arch-graph` |
| `qaforge security` | Execute comprehensive non-destructive security testing | `npx qaforge security --safe` |
| `qaforge hook` | Install or remove automated Git pre-commit hooks | `npx qaforge hook install` |
| `qaforge web-sec` | Audit Subresource Integrity (SRI), CSRF & CORS policies | `npx qaforge web-sec` |
| `qaforge dedup` | Analyze test suites and identify duplicate test cases | `npx qaforge dedup` |
| `qaforge sandbox` | Launch ephemeral mock DB & sandbox server | `npx qaforge sandbox -p 8089` |
| `qaforge watch` | Real-time interactive watch mode | `npx qaforge watch` |
| `qaforge mcp` | Start QAForge MCP Server over stdio | `npx qaforge mcp` |

---

## Detailed Command Options

### `qaforge plan`
- `-s, --scope <scope>`: Filter planning scope (`all`, `uncovered`, `critical`, `e2e`, `api`, `unit`, `changed`).
- `-m, --max <max>`: Maximum number of test cases to produce.

### `qaforge generate`
- `--overwrite <policy>`: File write policy (`never`, `generated-only`, `explicit`). Default: `generated-only`.

### `qaforge test`
- `-s, --scope <scope>`: Scope to run (`all`, `changed`, `paths`, `critical`).
- `-p, --paths <paths...>`: Space-separated list of specific test files.

### `qaforge release`
- `--ci`: Exit with process status code `1` if verdict is `NOT_READY`.

### `qaforge refine`
- `<instruction>`: Natural language requirement or assertion change.
- `-f, --file <file>`: Specific target test file path.

### `qaforge sandbox`
- `-p, --port <port>`: Port to bind sandbox mock HTTP server (default: `8089`).

### `qaforge security`
- `--auth`: Test authentication (login, password reset, rate-limiting, enumeration).
- `--authorization`: Test authorization (IDOR, role escalation, protected routes).
- `--forms`: Test forms and input parameter tampering.
- `--injection`: Test SQLi, NoSQLi, XSS, Command, and Path Traversal injections.
- `--api`: Test API security and verbose error/stack trace leakage.
- `--uploads`: Test file upload extension and MIME sanitization.
- `--sessions`: Test session cookie flags (HttpOnly, Secure) and JWT integrity.
- `--safe`: Enable safe mode non-destructive constraints (default: `true`).
- `--deep`: Enable deep security testing mode.
- `--sarif <path>`: Export findings in SARIF v2.1.0 format for GitHub Security.
- `-u, --url <url>`: Target live application URL.
- `-f, --format <format>`: Output format (`console`, `json`, `markdown`).
- `--ci`: Exit with code 1 if CRITICAL or HIGH findings exist.

### `qaforge hook`
- `install`: Set up `.git/hooks/pre-commit` or Husky hook to run change-impact tests.
- `uninstall`: Remove existing QAForge pre-commit hooks.
- `-c, --cmd <command>`: Command to execute (default: `npx qaforge changed`).

### `qaforge web-sec`
- Audits Subresource Integrity (`integrity="sha384-..."`), mutating form CSRF tokens, and dangerous CORS credential wildcards.

### `qaforge dedup`
- Scans Vitest/Playwright/Jest test suites to identify duplicate test assertions and redundancy percentage.
