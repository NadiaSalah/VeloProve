# QAForge Release & Distribution Guide

This document defines the release, packaging, and distribution architecture for QAForge.

---

## 1. Distribution Philosophy

QAForge follows a clean separation of concerns between development and customer consumption:

- **GitHub Repository (`https://github.com/NadiaSalah/qaforge`)**: Source code, unit/integration test suites, development fixtures, and CI automation.
- **npm Package (`qaforge`)**: The official lightweight runtime artifact. It contains ONLY compiled JavaScript (`dist/`), runtime documentation (`docs/`), `README.md`, `CHANGELOG.md`, and `LICENSE`.
- **GitHub Release Artifacts**: Production `.tgz` npm tarballs attached to version tags for offline and standalone distribution.

### Customer Experience

End users consume QAForge without cloning the repository:

```bash
# Initialize QAForge inside any customer project
npx qaforge init

# Run health diagnostics
npx qaforge doctor

# Launch local dashboard
npx qaforge ui
```

---

## 2. Publishable Package Allowlist

The npm package contains exclusively allowlisted assets declared in `package.json` (`"files"`):

| Path | Purpose |
| :--- | :--- |
| `dist/` | Compiled ES2022 modules, CLI binaries, MCP server, and TypeScript declarations |
| `docs/` | Runtime reference and guide documentation |
| `README.md` | Overview, quickstart, and feature summary |
| `CHANGELOG.md` | Version history and release notes |
| `LICENSE` | MIT License |

### Explicitly Excluded Development Content

The following directories and files are excluded from the npm package:
- `src/` (TypeScript source code)
- `tests/` (Test suites)
- `fixtures/` (Test fixture mock apps)
- `.github/` (Workflows and CI configs)
- `.cursor/` (IDE rules and local configs)
- `coverage/`, `.env*`, `*.tmp`, `*.log`

---

## 3. Pre-Release Verification

Before tagging or publishing a release, run the automated integrity check:

```bash
npm run release:check
```

This command executes:
1. `npm run build`: Compiles TypeScript to `dist/`.
2. `npm run typecheck`: Validates full strict type safety.
3. `npm run test`: Executes the complete test suite.
4. `npm pack --dry-run`: Validates packaged files against the strict allowlist, checks file size (< 5MB), and verifies the CLI shebang.

---

## 4. Release Steps for Maintainers

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
2. Generate the npm distribution tarball (`qaforge-<version>.tgz`).
3. Create a GitHub Release with the tarball attached.
4. Publish the package to npm with provenance.
