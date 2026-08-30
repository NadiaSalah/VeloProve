# 10_DOCUMENTATION_DRIFT.md — Documentation Drift & Discrepancy Audit

This document tracks all audited documentation claims against the actual TypeScript source code implementation.

---

## 1. Audited Documentation Discrepancies & Resolutions

| Item | Document Claimed | Source Code Truth | Severity | Status / Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **MCP Tool Count** | Historical docs previously mentioned 68 tools. | Exactly **71 MCP tools** are registered in `src/mcp/server.ts` (`qa.exportSarif`, `qa.auditSriCsrf`, `qa.dedupTests` added). | Low | **Synchronized & Verified**: `README.md`, `AGENTS.md`, `docs/MCP_REFERENCE.md`, and `tests/unit/interface-parity.test.ts` all assert 71 tools. |
| **CLI Commands Count** | Earlier guides referenced 52 or 56 commands. | Exactly **71 CLI commands** are declared in `src/cli/index.ts` (including `hook`, `web-sec`, `dedup`, `security`, `sandbox`, `watch`, `mcp`). | Low | **Synchronized & Verified**: `docs/CLI_REFERENCE.md` and test suites updated with all 71 commands. |
| **Safe Mode by Default** | Security probing might be assumed aggressive. | `safeMode: true` is hardcoded in `ConfigLoader` and enforced in `SecurityEngine`. Destructive payloads are blocked unless explicitly overridden. | High | **Verified Accurate**: Documented in `docs/FEATURES_GUIDE.md` and `docs/CLI_REFERENCE.md`. |
| **Privacy / Local Execution** | Claims 100% zero cloud communication. | `qaforge` executes entirely locally via Node.js stdio/HTTP without any external telemetry or data exfiltration. Webhook alerts (`qaforge alert`) only send data to user-provided URLs. | Critical | **Verified Accurate**: 100% local-first verified across source code. |

---

## 2. Interface Parity Verification Status

- **CLI Parity**: 100% commands mapped in `src/cli/index.ts`.
- **MCP Parity**: 100% (71/71) tools registered with schemas in `src/mcp/server.ts`.
- **Dashboard Parity**: Live endpoints in `src/application/dashboard-server.ts` match core engine actions.
- **Test Integrity**: `tests/unit/interface-parity.test.ts` passes with 0 drift.
