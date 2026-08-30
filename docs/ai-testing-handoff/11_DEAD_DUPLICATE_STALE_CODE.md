# 11_DEAD_DUPLICATE_STALE_CODE.md — Dead, Duplicate & Stale Code Audit

This document catalogues codebase hygiene findings across all source directories.

---

## 1. Dead Code & Unused Exports Audit

| File Path | Symbol / Entity | Type | Recommendation |
| :--- | :--- | :--- | :--- |
| `src/intelligence/change-impact/dependency-graph.js` | Legacy CommonJS Graph helper | Legacy / Redundant | Retained for backward compatibility with older dynamic plugins; TypeScript version in `dependency-graph.ts` is primary. |
| `src/intelligence/project-scanner/source-mapper.ts` | Deprecated fallback helper for Node 14 | Stale fallback | Safe to preserve for legacy node environments; modern ES2022 traversal is active. |

---

## 2. Duplicate Code Patterns

- **Filesystem Traversal Helpers (`gatherSourceFiles`)**:
  - Found across `SriCsrfValidatorService`, `SecuritySurfaceScanner`, and `TestDeduplicatorService`.
  - *Observation*: Each service implements a local recursive directory scanner filtering by respective extensions (`.ts`, `.tsx`, `.html`, `.test.ts`).
  - *Status*: Working cleanly as encapsulated private methods; future refactor could consolidate into `WorkspaceGuard.gatherFiles()`.

---

## 3. Stale Files / Build Artifacts
- Repository `.gitignore` properly excludes `dist/`, `node_modules/`, `.qaforge/state/`, and test coverage artifacts.
- No obsolete temporary files found in source directories.
