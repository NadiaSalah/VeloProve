# VeloProve Roadmap

**Current release line: `v1.0.1`** — tree + `release:check` green; **npm / GitHub publish is human-gated**.

Historical backlog: [docs/internal/roadmap.md](docs/internal/roadmap.md).  
Do **not** bump to v2 unless a breaking major rewrite is explicitly approved.

---

## Needs human (P0)

- [x] **Commit 1.0.1 sources** (Twin, Tool Lab, trust docs, fixtures, tests)
- [x] **Push `main` + tag `v1.0.1`** — GitHub Release live with tarball
- [x] **Publish npm `@engnadia/veloprove@1.0.1`** — live on npm (published 2026-09-24 as `codartco` → scope `@engnadia`)
- [ ] **Marketplace upload** — stills in `_local_demo/screenshots/` (gitignored; do not commit)

---

## Done in-tree (1.0.1)

| Area | Notes |
|------|--------|
| Trust Hardening | Secret redaction, deny-network, healable policy, honesty badges |
| Project Twin | PARTIAL MVP — `twin` / evidence / drift / `--affected` (not Ground Truth) |
| Tool Lab | Full CLI catalog in Dashboard with Terminal-only / Partial modes |
| Docs sync | Guide / About / cli / surface-matrix / beginner+AI path |
| Screenshots | README `docs/assets/screenshots/01–03.png` + local marketplace stills refreshed |

---

## Later (post-publish)

- [ ] Twin **VERIFIED** banner only when harness warrants (keep PARTIAL until then)
- [ ] Deeper Twin monorepo / docs↔CLI/MCP/UI edges (no new scanner)
- [ ] Optional full Twin graph explorer
- [ ] Expand BugFixSynthesizer **or** keep permanent PARTIAL (documented)

---

## Explicitly deferred

Multi-LLM matrix, k6 exporters, multi-language engines, plugin marketplace, autonomous PR bot, cloud LLM chat, vendor sandboxes / SaaS dashboards.

---

## Publish inventory (quick)

| Channel | Ready? | Notes |
|---------|--------|--------|
| **npm tarball** | Yes (after `build` / `prepack`) | `files` + `.npmignore`; includes `dist/`, `docs/guides` (incl. `trust.md`), marketplace assets; **excludes** screenshots, fixtures, `docs/internal`, `src/` |
| **GitHub** | Commit `ff59605` local — needs **push** + tag `v1.0.1` | |
| **README gallery** | Yes | `docs/assets/screenshots/` (not in npm) |
| **Marketplace** | Local stills ready | Upload manually from `_local_demo/screenshots/` |

---

*TODO reset 2026-09-21 after screenshot refresh + publish inventory check.*
