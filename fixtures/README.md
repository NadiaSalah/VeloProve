# VeloProve-core fixtures

Local-only test and smoke targets for CI / `npm test` / `npm run audit:features`.

**Not published to npm** (excluded via `.npmignore`).

| Directory | Purpose |
|-----------|---------|
| `real-app-smoke/` | Primary realistic smoke (node:test + tiny HTTP server) |
| `broken-app/` | Failure-path / verify evidence packs |
| `golden-project/` | Minimal PRD + authored tests (MCP contract) |
| `fault-harness/` | Baseline for fault mutation harness |
| `security-local/` | Offline security / deny-network target |
| `api-local/` | Minimal HTTP `/health` + `/api/items` |
| `a11y-local/` | Labeled HTML sample |
| `release-clean/` · `release-warning/` · `release-blocked/` | Release-gate stubs |
| `git-disposable/` | Helper to create a temp git repo (2 commits) |
| `test-project/` | Enterprise / stack-detect sample |

Ephemeral per-test dirs use `ephemeralFixtureDir()` under the OS temp folder — do not commit those.

Resolve paths via `tests/helpers/monorepo-fixtures.ts` (`monorepoFixturesRoot()` / `coreFixture(...)`).
