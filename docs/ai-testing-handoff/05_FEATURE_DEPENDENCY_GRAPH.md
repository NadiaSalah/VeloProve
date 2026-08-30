# 05_FEATURE_DEPENDENCY_GRAPH.md — Subsystem & Feature Dependency Graph

This document maps the inter-feature dependencies, data flows, and prerequisite relationships across QAForge.

---

## 1. Subsystem Dependency Graph

```mermaid
graph LR
    subgraph Discovery
        F001[FEATURE-001: Stack Detector]
        F002[FEATURE-002: Route Scanner]
        F003[FEATURE-003: Requirement Discovery]
    end

    subgraph Impact
        F004[FEATURE-004: Git Impact Engine]
    end

    subgraph PlanningAndGeneration
        F005[FEATURE-005: Risk-Scored Planner]
        F006[FEATURE-006: Multi-Framework Generator]
        F013[FEATURE-013: Test Deduplicator]
    end

    subgraph ExecutionAndDiagnostics
        F007[FEATURE-007: Failure Classifier]
        F008[FEATURE-008: Visual-Aria Healer]
        F010[FEATURE-010: Postman Collection Runner]
    end

    subgraph SecurityAndAudit
        F009[FEATURE-009: Security Engine]
        F011[FEATURE-011: SARIF Exporter]
        F012[FEATURE-012: SRI & CSRF Validator]
    end

    subgraph Integrations
        F014[FEATURE-014: Git Hook Installer]
        F015[FEATURE-015: MCP Stdio Server]
    end

    F001 --> F002
    F001 --> F003
    F002 --> F005
    F003 --> F005
    F004 --> F005
    F005 --> F006
    F006 --> F013
    F006 --> F007
    F007 --> F008
    F001 --> F009
    F002 --> F009
    F009 --> F011
    F001 --> F012
    F004 --> F014
    F001 --> F015
    F005 --> F015
    F007 --> F015
    F009 --> F015
```

---

## 2. Feature Prerequisite & Dependency Table

| Target Feature | Direct Prerequisites | Shared Data Structures | Upstream Failure Effect |
| :--- | :--- | :--- | :--- |
| **`FEATURE-002` (Route Scanner)** | `FEATURE-001` (Stack Detector) | `ProjectProfile` | Defaults to empty routes; falls back to manual test paths. |
| **`FEATURE-003` (Requirement Discovery)**| `FEATURE-001`, `FEATURE-002` | `ProjectProfile`, `DiscoveredRequirement` | Generates basic synthetic requirements from route paths. |
| **`FEATURE-004` (Change Impact)** | Git repo initialized | `ImpactAnalysisResult` | Falls back to running full test suite (`scope: "all"`). |
| **`FEATURE-005` (Test Planner)** | `FEATURE-003`, `FEATURE-004` | `TestPlan`, `RiskScore` | Generates flat unweighted test plan. |
| **`FEATURE-006` (Test Generator)** | `FEATURE-005` | `TestPlan`, `GeneratedTestFile` | Blocked if test plan generation fails. |
| **`FEATURE-007` (Diagnostics)** | Test execution output | `DiagnosticResult`, `FailureArtifact` | Defaults to generic `TEST_BUG` classification. |
| **`FEATURE-008` (Visual Healer)** | `FEATURE-007` (`TEST_BUG`) | `DOMSnapshot`, `HealResult` | Cannot heal if failure is `APPLICATION_BUG`. |
| **`FEATURE-009` (Security Engine)** | `FEATURE-001`, `FEATURE-002` | `SecurityAttackSurface`, `SecurityReport` | Probes default URL if routes not auto-discovered. |
| **`FEATURE-011` (SARIF Exporter)** | `FEATURE-009` (Security Engine) | `SecurityReport`, `SarifLog` | Outputs empty SARIF log if no security findings exist. |
| **`FEATURE-015` (MCP Server)** | All Core Services | JSON-RPC Schemas | Stdio server boots independently; tools fail gracefully on error. |
