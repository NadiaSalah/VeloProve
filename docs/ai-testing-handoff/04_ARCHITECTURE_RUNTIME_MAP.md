# 04_ARCHITECTURE_RUNTIME_MAP.md — Architectural & Runtime Map

This document outlines the layered architecture, component boundaries, execution flows, and cross-cutting systems.

---

## 1. High-Level Layered Architecture

```mermaid
graph TD
    Client[AI Agent / Human CLI / Web Dashboard / CI Pipeline] --> EntryLayer

    subgraph EntryLayer [Entry & Interoperability Layer]
        CLI[Commander CLI - src/cli/]
        MCP[Model Context Protocol Server - src/mcp/]
        Dashboard[Live Dashboard Server - src/application/dashboard-server.ts]
    end

    subgraph AppLayer [Application Orchestration Layer]
        Engine[QAForgeEngine - src/application/engine.ts]
        SecEngine[SecurityEngine - src/application/security-engine.ts]
        PostmanService[PostmanRunnerService - src/adapters/api/]
        HealService[HealTestService & VisualAutoHeal - src/application/]
        SarifService[SarifExporterService - src/application/sarif-exporter.ts]
    end

    subgraph IntelLayer [Intelligence & Static Analysis Layer]
        Scanner[ProjectScanner - src/intelligence/project-scanner/]
        ReqDisc[RequirementDiscovery - src/intelligence/requirement-discovery/]
        Impact[GitDiffAnalyzer - src/intelligence/change-impact/]
        SecScanner[SecuritySurfaceScanner - src/intelligence/security-scanner/]
    end

    subgraph CoreLayer [Domain & Execution Layer]
        Planner[PlanTestsService & SecurityPlanner]
        Generator[TestGenerator - src/domain/tests/]
        Runner[ProcessRunner - src/execution/process-runner.ts]
        Classifier[Diagnostic Classifier - src/diagnostics/]
    end

    subgraph GuardLayer [Safety & Security Boundary]
        Guard[WorkspaceGuard - src/shared/workspace-guard.ts]
        Redactor[SecretRedactor - src/shared/secret-redactor.ts]
        Config[ConfigLoader - src/shared/config-loader.ts]
    end

    EntryLayer --> AppLayer
    AppLayer --> IntelLayer
    AppLayer --> CoreLayer
    CoreLayer --> GuardLayer
    IntelLayer --> GuardLayer
```

---

## 2. Core Execution Flows

### A. Autonomous Testing & Healing Loop

```mermaid
sequenceDiagram
    participant Agent as AI Coding Agent
    participant MCP as MCP Server (qa.run / qa.heal)
    participant Engine as QAForgeEngine
    participant Runner as ProcessRunner
    participant Classifier as Diagnostic Classifier
    participant Healer as Visual-Aria Healer

    Agent->>MCP: Call qa.run({ scope: "changed" })
    MCP->>Engine: runTests(options)
    Engine->>Runner: executeTestProcess(impactedTests)
    Runner-->>Engine: Raw Test Output & Exit Code (Failure)
    Engine->>Classifier: diagnose(failureArtifacts)
    Classifier-->>Engine: Classified as TEST_BUG (Stale Locator)
    Engine-->>MCP: Test Run Verdict & Failure Classification
    MCP-->>Agent: Returns Diagnostic Result

    Agent->>MCP: Call qa.heal({ failureId, testFilePath })
    MCP->>Healer: healLocator(testFilePath)
    Healer-->>MCP: Returns Healed Code & Locator
    MCP-->>Agent: Code Diff with getByRole Locator
```

### B. Security Discovery, Probing & SARIF Export Flow

```mermaid
sequenceDiagram
    participant User as CLI (qaforge security --sarif)
    participant SecEng as SecurityEngine
    participant SurfScan as SecuritySurfaceScanner
    participant SecPlan as SecurityPlanner
    participant Prober as Non-Destructive Prober
    participant Redactor as SecretRedactor
    participant SarifExp as SarifExporterService

    User->>SecEng: runSecuritySuite(options)
    SecEng->>SurfScan: scan(guard, profile)
    SurfScan-->>SecEng: Discovered Attack Surface (Auth, Forms, SQL, Uploads)
    SecEng->>SecPlan: createPlan(surface, options)
    SecPlan-->>SecEng: Safe Security Test Plan (Non-Destructive)
    SecEng->>Prober: executeTestCases(plan)
    Prober->>Redactor: redact(tokens, passwords, responses)
    Redactor-->>SecEng: Sanitized Findings
    SecEng->>SarifExp: exportSecurityReport(report)
    SarifExp-->>User: Security Report (Score: 92/100, SARIF Log Created)
```

---

## 3. Cross-Cutting Safety & Sandboxing Systems

1. **`WorkspaceGuard` (`src/shared/workspace-guard.ts`)**:
   - Enforces path containment within project boundaries.
   - Blocks path traversal attacks (`../../../etc/passwd` or `C:\Windows\System32`).
2. **`SecretRedactor` (`src/shared/secret-redactor.ts`)**:
   - Intercepts all stdout, stderr, and JSON payloads to prevent leaking sensitive API keys, JWTs, and session cookies.
3. **Safe Security Mode (`safeMode: true`)**:
   - Built into `SecurityEngine` and `ConfigLoader` to guarantee non-destructive probe behavior in staging/test environments.
