# VeloProve Release & Distribution Guide

This document defines the release, packaging, and distribution architecture for VeloProve.

---

## 1. Distribution Philosophy

VeloProve follows a clean separation of concerns between development and customer consumption:

- **GitHub Repository (`https://github.com/NadiaSalah/VeloProve`)**: Source code, unit/integration test suites, development fixtures, and CI automation.
- **npm Package (`@engnadia/veloprove`)**: The official lightweight runtime artifact. It contains ONLY compiled JavaScript (`dist/`), runtime documentation (`docs/`), `README.md`, `CHANGELOG.md`, and `LICENSE`.
- **GitHub Release Artifacts**: Production `.tgz` npm tarballs attached to version tags for offline and standalone distribution.
- **Marketplace listings** (Cursor / Claude / Windsurf): Copy + badge from `docs/assets/marketplace/`; screenshots captured locally under `_local_demo/screenshots/` (gitignored — upload manually).

### Customer Experience

End users consume VeloProve without cloning the repository:

```bash
# Initialize VeloProve inside any customer project
npx @engnadia/veloprove init -y --teach

# Local docs Q&A (same corpus as Dashboard Docs Chat)
npx @engnadia/veloprove ask "how do I verify changes?"

# Run health diagnostics
npx @engnadia/veloprove doctor

# Launch local dashboard (Docs Chat pin + Teach AI)
npx @engnadia/veloprove ui
```

---

## 2. What MUST ship in the npm package (AI + Docs Chat)

Declared in `package.json` → `"files"`. After install, Docs Chat / `vp.ask` / `veloprove ask` read from:

`node_modules/@engnadia/veloprove/docs/`

| Path | Why it is critical |
| :--- | :--- |
| **`docs/AGENTS.md`** | **Consumer AI playbook** written into the package. Teach AI points agents here. **Not** the root contributor `AGENTS.md`. |
| `docs/README.md` | Docs index pointing agents at AGENTS + guides |
| `docs/guides/*.md` | Docs Chat corpus (getting-started, faq, dashboard, features, ai-integrations, examples, …) |
| `docs/reference/*.md` | CLI / MCP / architecture / surface-matrix (agents + humans) |
| `docs/assets/*.svg` | Dashboard `/icon.svg` `/logo.svg` brand marks |
| `docs/assets/marketplace/*` | Listing badge + marketplace copy (no API key) |
| `dist/` | CLI, MCP server, dashboard, Docs Chat engine |
| `extensions/recorder/` | Optional Chrome recorder |
| `README.md` / `CHANGELOG.md` / `LICENSE` | npm / GitHub landing |

### Explicitly excluded (GitHub-only)

| Path | Reason |
| :--- | :--- |
| Root `AGENTS.md` | Contributor protocol (`src/`, parity) — would confuse consumer agents |
| `src/`, `tests/`, `fixtures/`, `scripts/` | Dev / CI only |
| `.github/`, `.cursor/`, `.agents/` | Repo tooling |
| `docs/internal/`, `docs/generated/` | Roadmap + local audit JSON |
| `_local_demo/` | Marketplace demo + screenshots (gitignored) |
| `TODO.md`, `RELEASING.md`, `CONTRIBUTING.md`, `SECURITY.md` | Maintainer docs |

---

## 3. Publishable Package Allowlist

The npm package contains exclusively allowlisted assets declared in `package.json` (`"files"`):

| Path | Purpose |
| :--- | :--- |
| `dist/` | Compiled ES2022 modules, CLI binaries, MCP server, and TypeScript declarations |
| `docs/README.md`, `docs/AGENTS.md` | Docs index + **consumer AI playbook** (MCP + loop + Docs Chat) |
| `docs/guides/`, `docs/reference/`, `docs/assets/` | Guides, CLI/MCP reference, brand SVGs, marketplace pack |
| `extensions/recorder/` | Optional Chrome MV3 recorder extension |
| `README.md` | Overview, quickstart, and feature summary |
| `CHANGELOG.md` | Version history and release notes |
| `LICENSE` | MIT License |

---

## 4. Pre-Release Verification

Before tagging or publishing a release, run the automated integrity check:

```bash
npm run release:check
```

This command executes:
1. `npm run build`: Compiles TypeScript to `dist/`.
2. `npm run typecheck`: Validates full strict type safety.
3. `npm run test`: Executes the complete test suite.
4. `npm pack --dry-run`: Validates packaged files against the strict allowlist (includes **docs/AGENTS.md**, FAQ, marketplace badge), checks file size (< 5MB), and verifies the CLI shebang.
5. Consumer CLI smoke + **`npm run pack:smoke`**: pack → install on fixture → `init --teach` → **`ask`** → doctor → verify.

Also recommended before publish:

```bash
npm run audit:tools   # CLI × MCP × Dashboard wiring (counts from TOOL_SURFACE)
npm run audit:features  # sequential real-fixture feature pass (when green)
```

**Do not hardcode tool counts** in marketing copy — always derive from `catalogCliCommands()` / `catalogMcpTools()` / `TOOL_SURFACE` (or say “see surface-matrix”).

**Tool Lab honesty:** sidebar is curated; Lab is full CLI. Terminal only (`ui`/`tui`/`mcp`/`watch`/`mock-server`) must not nest in Dashboard — documented in `docs/AGENTS.md`, `docs/guides/faq.md`, `docs/reference/surface-matrix.md`.

---

## 5. Screenshots (two tracks)

### A) GitHub README gallery (committed under `docs/assets/screenshots/`)

Required PNGs for README embeds (excluded from npm via `.npmignore`):

- `01-dashboard-overview.png`
- `02-dashboard-verify.png`
- `03-dashboard-docs-chat.png`

Recapture (Dashboard on the port the script expects — see `docs/assets/screenshots/README.md`):

```bash
node scripts/capture-readme-screenshots.mjs
```

### B) Marketplace listings (manual upload — do **not** commit)

`_local_demo/screenshots/` — Cursor / Claude / Windsurf uploads. Checklist: [`docs/assets/marketplace/README.md`](docs/assets/marketplace/README.md).

## 6. Release Steps for Maintainers

### Step 1: Version Bump
Update `package.json` and `CHANGELOG.md` with the new target version:

```bash
# Explicit target version:
npm version <target-version> --no-git-tag-version

# Or semantic bump:
npm version patch --no-git-tag-version  # 1.0.0 -> 1.0.1
npm version minor --no-git-tag-version  # 1.0.0 -> 1.1.0
npm version major --no-git-tag-version  # 1.0.0 -> 2.0.0
```

### Step 2: Run Release Check
```bash
npm run release:check
```

### Step 3: Commit and Push Version Tag
```bash
git add package.json CHANGELOG.md
git commit -m "chore(release): v<target-version>"
git tag v<target-version>
git push origin main --tags
```

### Step 4: Automated CI/CD Publishing
The GitHub Actions workflow (`.github/workflows/release.yml`) will automatically:
1. Run all tests and builds.
2. Generate the npm distribution tarball (`engnadia-veloprove-<version>.tgz`).
3. Create a GitHub Release with the tarball attached.
4. Publish the package to npm with provenance.

### Step 5: Marketplace (human)
1. Confirm `docs/AGENTS.md` + guides are in the published tarball (`npm pack --dry-run`).
2. Upload `_local_demo/screenshots/*.png` to the MCP marketplace listing.
3. Paste install JSON + blurbs from `docs/assets/marketplace/README.md`.
