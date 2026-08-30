# 13_AI_TEST_AGENT_INSTRUCTIONS.md — Instructions for Autonomous AI Testing Agents

This document is a formal handoff prompt and operational guide for another AI coding/testing agent interacting with or validating QAForge.

---

## 1. Operating Principles for AI Test Agents

When an AI agent is instructed to benchmark, test, or extend QAForge, it must strictly adhere to the following sequence:

1. **Read Handoff Index First**:
   - Inspect `docs/ai-testing-handoff/01_PROJECT_CAPABILITIES.md` through `16_TEST_CASES.json` before touching source code.
2. **Build and Sanity Check**:
   - Execute `npm run build` to verify TypeScript AST emission and type safety.
   - Run existing unit test suite via `npm test`.
3. **Execute Feature-by-Feature Verification**:
   - Use the test case definitions in `16_TEST_CASES.json` to systematically validate features.
4. **Enforce Non-Destructive Operation**:
   - Always run security scans in Safe Mode (`safeMode: true`).
   - Never issue raw destructive database or filesystem operations against unmocked environments.
5. **Enforce Public Interface Parity**:
   - When modifying or adding any capability, execute `npm test -- tests/unit/interface-parity.test.ts`.
   - Ensure tool count matches in `src/cli/banner.ts`, `src/mcp/server.ts`, `README.md`, `AGENTS.md`, and `docs/MCP_REFERENCE.md`.

---

## 2. Test Execution Commands Quick Reference

```bash
# 1. Typecheck and Compile
npm run build

# 2. Run All Unit & Integration Tests
npm test

# 3. Validate Public Interface & MCP Parity
npx vitest run tests/unit/interface-parity.test.ts

# 4. Run Security Suite Unit Tests
npx vitest run tests/unit/security-testing.test.ts

# 5. Run Stability & DX Tests (SARIF, SRI/CSRF, Dedup, Git Hooks)
npx vitest run tests/unit/v100-stability-dx-suite.test.ts
```
