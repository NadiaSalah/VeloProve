# Broken-app fixture

Deterministic **failure-path** project for VeloProve diagnostics.

- `src/math.js` intentionally returns `a - b` from `add`
- `tests/math.test.js` expects correct addition → fails

Used by integration tests for diagnose / evidence pack / verify failure handling.
Do not "fix" the bug unless updating those tests.
