# 12_PUBLIC_API_AND_MCP_CONTRACTS.md — Public API, CLI & MCP Contracts

This document specifies the exact interface contracts, parameter schemas, outputs, and exit codes of QAForge.

---

## 1. Public Programmatic API (`src/index.ts`)

```typescript
export { QAForgeEngine } from './application/engine.js';
export { SecurityEngine } from './application/security-engine.ts';
export { ProjectScanner } from './intelligence/project-scanner/index.js';
export { RequirementDiscovery } from './intelligence/requirement-discovery/index.js';
export { PlanTestsService } from './application/plan-tests.js';
export { GenerateTestsService } from './application/generate-tests.js';
export { RunTestsService } from './application/run-tests.js';
export { DiagnoseFailureService } from './application/diagnose-failure.js';
export { HealTestService } from './application/heal-test.js';
export { SarifExporterService } from './application/sarif-exporter.js';
export { SriCsrfValidatorService } from './application/sri-csrf-validator.js';
export { TestDeduplicatorService } from './domain/tests/test-deduplicator.js';
export { GitHookInstallerService } from './application/git-hook-installer.js';
export { SecretRedactor } from './shared/secret-redactor.js';
export { WorkspaceGuard } from './shared/workspace-guard.js';
```

---

## 2. Model Context Protocol (MCP) Contract (71 Tools)

- **Transport**: JSON-RPC over `stdio`.
- **Selected Representative Tool Schemas (`src/mcp/server.ts`)**:

```json
{
  "name": "qa.inspect",
  "description": "Inspect project stack, frameworks, routes, and PRD requirements",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": { "type": "string", "description": "Project root directory" }
    }
  }
}
```

```json
{
  "name": "qa.securityRun",
  "description": "Execute non-destructive security vulnerability tests (Auth, Injections, Forms)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "baseURL": { "type": "string", "description": "Target server URL" },
      "categories": { "type": "array", "items": { "type": "string" } },
      "safeMode": { "type": "boolean", "default": true }
    }
  }
}
```

```json
{
  "name": "qa.exportSarif",
  "description": "Export security findings to standard SARIF v2.1.0 JSON format for GitHub Security",
  "inputSchema": {
    "type": "object",
    "properties": {
      "outputPath": { "type": "string", "description": "Destination path for SARIF log" }
    }
  }
}
```

---

## 3. CLI Command & Exit Code Contracts

- **Process Exit Codes**:
  - `0`: Success / All tests passed / Clean security audit / Clean release confidence score ($\ge 85$).
  - `1`: General command error / Uncaught exception / Test failure.
  - `2`: Release Gate Failed (Confidence score $< 85$ or critical CVEs detected).
