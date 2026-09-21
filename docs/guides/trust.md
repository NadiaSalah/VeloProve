# Trust & privacy (VeloProve)

How VeloProve treats **local work**, **network**, **disk writes**, and **git**.

## Telemetry

Repo scan (product `src/`, packaged docs): **no PostHog, Segment, Mixpanel, Amplitude, or similar analytics SDKs**. Mentions of “telemetry” elsewhere are either privacy claims or malware-scanner vocabulary (detecting hostile exfil), not outbound product analytics.

**No telemetry by default.** Core CLI / MCP / Dashboard analysis stays on-machine unless you opt into a network-facing feature.

## Local-first surfaces (no network required)

These work offline against the workspace + packaged docs:

| Surface | Notes |
|---------|--------|
| `inspect` | Reads project files only |
| `doctor` | Node/env + local project checks |
| `ask` / `vp.ask` | Packaged markdown search; **no cloud LLM** |
| `plan` / `generate` / `test` (local runners) | Local FS + process spawn |
| `diagnose` / `heal` / `suggestFix` | From stored run results |
| `twin` / `impact` / `drift` | Local Twin JSON + wraps existing engines (PARTIAL MVP) |

## Network (explicit only)

Network I/O happens when you invoke tools that need a URL or remote service, for example:

- Live explore / ensure-dev / perf / load-test / owasp against a target URL
- Remote probe / companion bridge
- Alert webhooks
- Registry fetches you trigger (e.g. optional CVE data paths)

Deny-network unit tests stub `fetch` and assert doctor/inspect/ask still succeed.

## Writes

| Area | Behavior |
|------|----------|
| `.veloprove/` | State, runs, plans, evidence packs |
| Generated tests | Honors overwrite policy (`never` / `generated-only` / `explicit`) |
| Heal | Locators in `@veloprove-generated` / `// @veloprove-healable` only |
| Auto-fix (app) | Default **REVIEW_REQUIRED**; Dashboard runs proposal-only (`apply=false`). Most arithmetic/auth/validation APPLICATION_BUG patterns remain **PARTIAL** in 1.0.x (no silent synthesizer expansion) |
| Suggest-fix | Prose guidance only (`diffOrPatch` PARTIAL) |
| A11y / screen-reader | Static / approximate heuristics — **not** certified WCAG or live NVDA/VoiceOver |

Dashboard Results attach an `honesty` object (badge + summary) for `heal`, `auto-fix`, `a11y`, and `screen-reader` so the UI cannot be mistaken for full autonomous repair.

## Git

- `changed` / impact analysis read `git diff` / history locally
- `bisect` walks commits when you run it
- Disposable helper: `fixtures/git-disposable/` (temp repo with two commits; under VeloProve-core)

## Process safety

`SafeProcessRunner` defaults to `shell: false`. On Windows, bare npm-ecosystem shims (and `.cmd`/`.bat`) may enable shell with **quoted args** to avoid split-on-spaces. Stdout/stderr pass through secret redaction helpers.
