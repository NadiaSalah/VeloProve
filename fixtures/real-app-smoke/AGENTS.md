# VeloProve Universal Agent Instructions

This fixture project uses **VeloProve** for local autonomous QA.

1. **Bootstrap**: `vp.bootstrap` / `npx veloprove teach-ai`
2. **Discover**: `vp.inspect` + `vp.doctor`
3. **Verify (preferred)**: `vp.verify` / `npx veloprove verify --ci`
4. **Plan → Generate → Run**: `vp.plan` → `vp.generate` → `vp.run`
5. **Diagnose**: `vp.diagnose` → `vp.heal` (TEST_BUG) or `vp.suggestFix` (APPLICATION_BUG)
6. **Impact / Release**: `vp.changed` → `vp.releaseCheck`

Packaged playbook after install: `node_modules/@engnadia/veloprove/docs/AGENTS.md`
