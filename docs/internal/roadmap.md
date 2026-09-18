# VeloProve Roadmap

**Current release line: `v1.0.0`** (`@engnadia/veloprove@1.0.0`)

This document tracks completed v1.0.0 work and post-1.0.x follow-ups.  
**Do not bump to v2** unless a future major breaking platform rewrite is explicitly approved.

---

## ✅ VeloProve v1.0.0 — Complete

Local-first autonomous QA agent: inspect → impact → plan/generate → run → diagnose → heal → security/a11y/perf → evidence → release/verify.

### Core platform
- [x] CLI `veloprove` + MCP `vp.*` (75 tools) + local Dashboard
- [x] `OperationResult`, structured errors, CapabilityRegistry
- [x] `veloprove verify` / `vp.verify` autonomous orchestrator (`--json`, `--ci`, `--intent`)
- [x] `veloprove history` / `vp.history` local run-history trends
- [x] Intent planner (deterministic, no LLM execution)
- [x] Fix safety policy (SAFE / REVIEW_REQUIRED / PROHIBITED)
- [x] SafeProcessRunner (timeouts, AbortSignal, Windows tree kill, secret redaction)
- [x] EnvironmentGuard (block production / unknown remotes by default)
- [x] InspectCache + execution policy (timeouts, retries, concurrency)
- [x] Explainable change-impact + risk areas
- [x] Diagnosis `evidenceSignals` vs `speculationNotes`

### Product surfaces shipped in 1.0.0
- [x] Dashboard polish, brand assets, SSE, sidebar parity, results UX
- [x] Session-theft suite, Smart DevServer, Security Policy Wizard
- [x] History + charts (`.veloprove/state/history.json`)
- [x] API Studio (Local/Staging/Prod, secret masking, token chain, assertions)
- [x] CI reports: `export-report -f junit|pdf|html|json|markdown`
- [x] Browser Scenario Recorder (bookmarklet + Dashboard → Playwright specs)
- [x] Architecture docs (`docs/reference/architecture.md`)

### Explicitly out of scope for 1.0.0 (needs human approval)
- [ ] **Publish to npm / push GitHub tags** — requires explicit user publish/push approval

---

## 1.0.x follow-ups (open) — see also [TODO.md](../../TODO.md)

Open items reset in `TODO.md` (next improvements after competitive-gap cycle). Prior P0–P2 launch DX and TestSprite local-gap items below are **complete**.

### ✅ Prior cycle — launch DX + competitive gaps (complete)
- [x] `init --teach` / `--link-ai` + Docs Chat (`ask` / `vp.ask`)
- [x] Grouped CLI `--help` + Daily-10 + pack smoke + `--json` / positional URL
- [x] Dashboard mobile Quick Actions + AI gate / toast confirm
- [x] One-prompt teach-ai → verify; live API GET grounding; failure evidence pack
- [x] `verify --sandbox` / `--docker-env`; `watch --verify` / `-i`; `hook --verify`
- [x] MCP one-click / no-API-key install docs polish

### ✅ Production audit pass (complete except publish)
- [x] Stale 74→75 surface claims fixed (banner, MCP header, docs)
- [x] Tool-surface UI audit detects `/api/actions/*` (Docs Chat `ask-docs`)
- [x] CAPABILITY_MANIFEST dashboard ids sanitized to real actions
- [x] `engine.run` no longer spawns phantom vitest when no runner (Windows EINVAL)
- [x] `fixtures/broken-app` failure-path integration tests
- [x] Smoke covers generate (temp) + verify; surface-matrix doc
- [x] `node:test` / `node --test` adapter (detect + run + doctor)
- [x] URL-tier smoke with stable `VP_FIXTURE_PORT` + expanded probes

---

## ✅ Post-1.0.0 backlog — Complete (1.0.x)

### DX / maintainability
- [x] Light Dashboard modularization (`dashboard-ui/styles`, `client-script`, `helpers`)
- [x] Reduced MCP `as any` — handlers use `arg-utils` (`strOpt` / `numOpt` / `boolFlag` / …)

### Optional enhancements
- [x] Allure lifecycle export (`export-report -f allure` → `allure-results/*-result.json`)
- [x] OpenAPI → mock response one-click (parser examples → MSW; Dashboard **Generate MSW from OpenAPI / APIs**)
- [x] Richer multi-step API flows UI (ordered steps, `{{var}}` extract, Postman export)
- [x] Chrome extension packaging for recorder (`extensions/recorder` MV3 + shared `recorder-probe`)
- [x] Regression velocity / MTTR alerts across branches (history `branchStats` + webhook enrichment)

### Later research (not scheduled; not a v2 commitment)
- Multi-LLM matrix, k6 exporters, multi-language engines, plugin marketplace, autonomous PR bot

---

*Last updated: September 2026 — Open 1.0.x follow-ups tracked in TODO.md. Maintained by NadiaSalah.*
