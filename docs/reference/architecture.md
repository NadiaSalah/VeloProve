# VeloProve Architecture

```text
               User / Agent / CI
                      │
          ┌───────────┼───────────┐
          │           │           │
         CLI         MCP      Dashboard
          │           │           │
          └───────────┼───────────┘
                      ↓
            VeloProveEngine (facade)
                      ↓
              QA Orchestrator
           (VerifyOrchestrator)
                      ↓
             CapabilityRegistry
                      ↓
    ┌────────────────────────────────┐
    │ Inspect │ Test │ Security │ …  │
    │ Diagnose│ Heal │ Release  │ …  │
    └────────────────────────────────┘
                      ↓
            OperationResult + Evidence
                      ↓
         Terminal / JSON / Dashboard
```

## Core contracts

- **`OperationResult<T>`** (`src/shared/types/operation.ts`): success, status, data, warnings, errors, evidence, diagnostics, durationMs, runId, metadata.
- **`CapabilityRegistry`** (`src/application/capability-registry.ts`): capability ids, triggers, CLI/MCP mapping, autonomous plan selection.
- **`VerifyOrchestrator`** (`src/application/verify-orchestrator.ts`): deterministic change-aware verify pipeline.

## Boundaries

| Layer | Responsibility |
| --- | --- |
| CLI / MCP / Dashboard | Input validation, rendering, triggering |
| Engine facade | Thin delegation to application services |
| Application services | Domain workflows |
| Adapters / execution | Process runners, test frameworks |
| Storage | Local `.veloprove` state |

## Surface parity

CLI (`veloprove`), MCP (`vp.*`, 75 tools), and Dashboard share `VeloProveEngine`. New capabilities must register in CapabilityRegistry (verify subset) and ship CLI + MCP + docs (+ Dashboard action when applicable). Catalog surface is 83 rows (75 MCP + 8 CLI-only). `vp.history` / `veloprove history` expose the same run-history snapshot as `GET /api/history`.

AI may assist planning/generation; filesystem, process execution, gates, and schemas remain deterministic.
