# 03_FEATURE_STRATEGIES.md — Algorithmic & Implementation Strategies

This document dissects the internal algorithms, data structures, and operational strategies governing QAForge.

---

## 1. Stack & Route AST Discovery Strategy

```text
Discovery Pipeline:
1. File System Traversal (Recursive, excluding ignore-list: node_modules, dist, .next)
2. Dependency Analysis: parse package.json dependencies and devDependencies
3. Convention Matching:
   ├── App Router: detect app/**/page.tsx or src/app/**/route.ts
   ├── Pages Router: detect pages/**/*.tsx or pages/api/**/*.ts
   └── Express/Fastify: regex scan app.get(), app.post(), router.use()
4. Custom Framework Ingestion: parse qaforge.framework.json if present
5. Monorepo Assembly: aggregate apps from packages/, apps/, services/, libs/
```

- **Path Normalization**: All filesystem paths are converted to POSIX-compliant `/` delimiters regardless of Windows host operating system.
- **Dynamic Parameter Mapping**: Bracketed routes (`app/users/[id]/page.tsx`) are automatically translated into RESTful parameter representations (`/users/:id`).

---

## 2. Git Change Impact & Dependency Graph Traversal

```text
Git Diff -> Reverse Dependency Graph -> Impacted Test Subsets
```

- **Algorithm**:
  1. Executes `git diff --name-only HEAD~1` or scans unstaged working tree diffs.
  2. Builds an AST import map: for each file, parses `import ... from '...'` and `require('...')`.
  3. Reverses the graph to construct dependent edges: `module -> imported_by[]`.
  4. Applies Depth-First Search (DFS) with cycle detection from the modified file set.
  5. Intersects reached nodes with the project test file index (`*.test.ts`, `*.spec.ts`).
  6. Filters execution to precisely the impacted test set, falling back to full suite only if core config files (`package.json`, `tsconfig.json`, `qaforge.config.json`) were touched.

---

## 3. Failure Classification & Evidence Collection Strategy

```text
Test Failure -> Artifact Ingestion -> Deterministic Rule Tree -> Classification
```

The `Classifier` evaluates failure evidence using prioritized heuristic rules:
1. **`TEST_BUG`**:
   - Indicator: `Timeout waiting for locator`, `element not found`, `stale element reference`.
   - Action: Triggers Visual-Aria locator healing (`qa.heal`).
2. **`APPLICATION_BUG`**:
   - Indicator: Status code mismatch (expected 200, got 500), assertion diff in business logic, uncaught server exceptions.
   - Action: Triggers source code fix synthesizer (`qa.suggestFix`, `qa.autoBugFix`).
3. **`FLAKY_TEST`**:
   - Indicator: High execution variance across retries, non-deterministic timers (`setTimeout`), intermittent pass/fail states.
   - Action: Flags for auto-quarantine (`qa.quarantine`) and AST stabilization (`qa.stabilizeFlaky`).
4. **`NETWORK_FAILURE`**:
   - Indicator: `ECONNREFUSED`, `ETIMEDOUT`, DNS resolution failure.

---

## 4. Safe Security Testing & Secret Redaction Strategy

```text
Attack Surface Map -> Risk Plan -> Non-Destructive Payload Execution -> Redaction -> SARIF / Report
```

- **Non-Destructive Constraint**: Safe Mode is hardcoded to prohibit destructive database mutations (`DROP`, `TRUNCATE`, `DELETE WHERE 1=1`), arbitrary file uploads (`.php`, `.sh`), credential brute force storms, or uncontrolled DoS floods.
- **Secret Redaction Pipeline**:
  - `SecretRedactor` scans all string payloads, responses, and log streams against precompiled regex patterns:
    - JWT tokens (`eyJ[a-zA-Z0-9_\-]{10,}\...`) -> `[REDACTED_JWT]`
    - Bearer tokens (`Bearer [a-zA-Z0-9_\-\.]{10,}`) -> `[REDACTED_BEARER_TOKEN]`
    - Passwords, secret keys, API tokens -> `***REDACTED***`
    - Session cookies (`connect.sid`, `sessionId`) -> `[REDACTED_SESSION_COOKIE]`
- **Explainable Scoring Formula**:
  $$\text{SecurityScore} = 100 - (\text{Critical} \times 25) - (\text{High} \times 15) - (\text{Medium} \times 8) - (\text{Low} \times 3)$$
  Clamped strictly between $0$ and $100$.

---

## 5. Visual-Aria Auto-Healing Strategy

```text
Broken Selector -> Failure Snapshot -> Accessibility Tree Walk -> Healed Locator
```

- When Playwright locator fails (e.g. CSS selector `#btn-submit-old` not found):
  1. Inspects DOM tree from failed snapshot.
  2. Extracts element's ARIA role (`button`, `link`, `textbox`), accessible name, test ID (`data-testid`), and text content.
  3. Synthesizes web-first locator recommendation:
     `page.getByRole('button', { name: 'Submit' })`
  4. Computes confidence score based on uniqueness in DOM snapshot.
