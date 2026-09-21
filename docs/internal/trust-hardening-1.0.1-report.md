# Trust Hardening 1.0.1 Report

**Package:** `@engnadia/veloprove`  
**Version:** 1.0.1  
**Date:** 2026-09-19 (updated: full 16-fault expansion)  
**Fixtures root:** `VeloProve-core/fixtures/` (package-local; excluded from npm)

---

## A. Executive summary

Trust Hardening for 1.0.1 adds a measurable fault harness (all **16** catalog faults enabled), MCP contract spot-checks, local-first offline tests, canary secret redaction coverage, softened WCAG/marketing claims, Windows process-runner quoting, FLAKY_TEST classifier support, and expanded monorepo fixtures. Package version is **1.0.1**; capability manifest regenerated from package SSOT. No npm publish / no GitHub release in this pass — human approval required.

**Recommendation:** see section I. Follow-up cleanup (2026-09-19): honesty strings, SecretRedactor/healable SSOT, ephemeral fixtures, npm README raw URLs, catalog-language docs.

---

## B. SSOT (version / counts)

| Source | Role |
|--------|------|
| `package.json` version | Canonical package version (**1.0.1**) |
| `src/shared/package-meta.ts` | Runtime `getPackageVersion()` |
| `src/shared/tool-catalog.ts` `TOOL_SURFACE` | CLI / MCP / Dashboard counts |
| `scripts/generate-manifest.js` → `docs/generated/CAPABILITY_MANIFEST.json` | Regenerated after bump |

Banner / CLI / MCP / dashboard / handshake consume package-meta + catalog lengths.

---

## C. Fault harness metrics

Location: `VeloProve-core/tests/fault-harness/`  
Catalog: FAULT-001..016 in `faults.json` + typed `fault-definitions.ts`  
Disposable fixtures: `fixtures/fault-harness/baseline` (+ specialized copies)  
Report artifact: `tests/fault-harness/reports/latest.json`

| Metric | Value |
|--------|-------|
| total (enabled) | **16** |
| skipped | **0** |
| detected | **16** |
| diagnosedCorrectly | **16** |
| healed | **1** (FAULT-009 locator) |
| autoFixed | **0** |
| detectionRate | **1.0** |
| diagnosisAccuracy | **1.0** |
| healRate | **0.0625** |
| autoFixRate | **0** |

Coverage by mode: diagnose (logic/validation/auth/authz/API/hostile/flake/not-found), heal-locator, audit-secret, a11y-label, git-impact, bisect, coverage-gap, release.

Honest marking: APPLICATION_BUG arithmetic/auth/validation faults record `healed:false` / `autoFixed:false` with PARTIAL notes when synthesizer cannot rewrite logic. Harness success means **runs and measures rates**, not 100% heal/auto-fix.

---

## D. MCP parity

- `tests/integration/mcp-contract-harness.test.ts` parses `vp.*` names from `src/mcp/server.ts`, asserts `inputSchema` windows, aligns with `catalogMcpTools()`.
- Spot-checks `inspect` / `doctor` / `ask` via `VeloProveEngine` (no MCP stdio).
- Golden project hash-lock: authored `tests/app.test.js` unchanged under `overwritePolicy: 'never'`.
- Dashboard↔CLI mapping smoke: `dashboard-cli-parity.smoke.test.ts`.

---

## E. Fixtures

| Path | Purpose |
|------|---------|
| `fixtures/fault-harness/` | Baseline + disposable fault mutations |
| `fixtures/golden-project/` | Minimal package + PRD + authored tests |
| `fixtures/security-local/` | Clean offline security target |
| `fixtures/api-local/` | Minimal HTTP `/health` + `/api/items` |
| `fixtures/a11y-local/` | Labeled HTML sample |
| `fixtures/release-{clean,warning,blocked}/` | Release gate package stubs |
| `fixtures/git-disposable/` | Temp git repo helper (2 commits) |

Tests and `pack-smoke.js` resolve fixtures via `VeloProve-core/fixtures/` (same package root; excluded from npm).

---

## F. Trust observability

- `tests/unit/canary-secret-redaction.test.ts` — canary must not survive `SecretRedactor`
- `tests/unit/deny-network-local-first.test.ts` — fetch denied; doctor/inspect/ask still work
- `docs/guides/trust.md` — local / network / writes / git
- Telemetry scan: **no** PostHog/Segment/Mixpanel/Amplitude in product `src/` → **No telemetry by default**
- `SafeProcessRunner`: `shell:false` default; Windows `.cmd`/`.bat` + shim arg quoting via `quoteWindowsShellArg`
- Classifier: `FLAKY_TEST` when `retryAttempts > 1` or intermittent signals (FAULT-010)

---

## G. Pack

`package.json` `files` allowlist already excludes `docs/internal/`, `docs/generated/`, screenshot corpora beyond marketplace assets. `tests/unit/package-distribution.test.ts` asserts no `docs/internal/` in `npm pack`. Trust report stays repo-only under `docs/internal/`.

---

## H. Residual risks

1. BugFixSynthesizer does not repair arithmetic invert / empty-password auth — expected PARTIAL (`autoFixRate` 0).
2. Heal covers locator TEST_BUG only today (`healRate` ~6%); VisualAutoHeal shares `@veloprove-generated` / healable policy.
3. A11y remains heuristic — do not claim certified WCAG.
4. Some diagnose paths use synthetic `TestRunResult` failures (deterministic CI) rather than full live Playwright E2E for every fault.

---

## I. Recommendation

**READY_WITH_WARNINGS**

Ready for a human-gated **1.0.1** publish: fault harness **16/16** detected + diagnosed; heal/auto-fix rates honest and non-zero where product supports them (heal on FAULT-009); MCP contract + canary + interface-parity + fixture path fixes green. Warnings: auto-fix still PARTIAL for app logic; a11y heuristic; synthetic diagnose inputs for several faults.

---

## J. Evidence

| Artifact | Path |
|----------|------|
| Fault report | `tests/fault-harness/reports/latest.json` |
| Manifest | `docs/generated/CAPABILITY_MANIFEST.json` |
| Trust guide | `docs/guides/trust.md` |
| This report | `docs/internal/trust-hardening-1.0.1-report.md` |
| CHANGELOG | `CHANGELOG.md` `[1.0.1]` |

Verification commands (from `VeloProve-core`):

```bash
npm run build
npm test -- tests/fault-harness/run-fault-harness.test.ts
npm test -- tests/unit/canary-secret-redaction.test.ts tests/integration/mcp-contract-harness.test.ts tests/unit/interface-parity.test.ts
```

---

## K. Next steps (optional, post-publish)

1. Expand live E2E (Playwright) for FAULT-007/008/009 beyond synthetic failures.
2. Grow BugFixSynthesizer toward safe arithmetic/auth patches with REVIEW_REQUIRED gate.
3. Human approve → `npm publish` + GitHub Release `v1.0.1` (not automated here).
