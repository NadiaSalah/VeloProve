# VeloProve FAQ (packaged)

Answers used by `veloprove ask` / Docs Chat and by humans after `npm install -D @engnadia/veloprove`.

## Requirements

**Q: Which operating systems are supported?**  
A: **Windows, macOS, and Linux** — any OS that can run **Node.js >= 18**. There is no Windows-only or macOS-only build. Optional browser Save As dialogs in the Dashboard work best in Chromium-based browsers (Chrome / Edge); otherwise the browser download fallback is used.

**Q: Do I need an AI coding agent or an OpenAI/Anthropic API key?**  
A: **No.** VeloProve’s engine, CLI, Dashboard, and MCP server are **local-first** and do **not** call a cloud LLM for core QA. Linking Cursor / Claude / Windsurf / Cline is optional and improves agent-driven workflows (`vp.verify`, heal suggestions, etc.).

**Q: What happens if I run without AI?**  
A: Normal commands (`inspect`, `doctor`, `test`, `verify`, `ask`, `security`, `ui`, …) run as usual. For a few **sensitive** file-changing steps (heal, auto-fix, generate, bisect, malware remediate, …) you get a clear warning:

- Dashboard → toast with **Run without AI** / **Teach AI** / Cancel  
- CLI (interactive) → warn + confirm prompt  
- CLI (CI / non-interactive) → use `--allow-no-ai -y`

Nothing crashes just because an agent is missing.

## After download / install

**Q: I installed the package. What do I run first?**  
A: From your app project:

```bash
npx veloprove init -y --teach
npx veloprove doctor
npx veloprove ask "how do I verify my changes?"
```

`init -y --teach` scaffolds `.veloprove/`, links AI when editors are detected, writes `AGENTS.md`, and prints a paste-ready briefing.

**Q: Where is documentation after npm install?**  
A: Inside the package:

- `node_modules/@engnadia/veloprove/docs/AGENTS.md` — agent playbook + MCP JSON  
- `node_modules/@engnadia/veloprove/docs/guides/` — getting started, features, FAQ  
- `node_modules/@engnadia/veloprove/docs/reference/cli.md` — CLI commands (catalog SSOT)  
- `node_modules/@engnadia/veloprove/docs/reference/mcp.md` — MCP `vp.*` tools (catalog SSOT)

Or ask locally: `npx veloprove ask "…"`.

## Linking AI editors

**Q: How do I connect Cursor / Claude / Windsurf / Cline?**  
A: Prefer:

```bash
npx veloprove init --link-ai --teach
# or later:
npx veloprove teach-ai --force --mcp
```

MCP stdio command (canonical):

```json
{
  "mcpServers": {
    "veloprove": {
      "command": "npx",
      "args": ["-y", "@engnadia/veloprove", "mcp"]
    }
  }
}
```

`init` auto-detects `.cursor/`, Claude/Windsurf home hints, and Cline settings when present. Use `--no-link-ai` to skip. Interactive init offers: Auto / Cursor only / multi-editor / Skip.

**Q: What does Teach AI do?**  
A: Writes project `AGENTS.md`, `.veloprove/agent-manifest.json`, optional `.cursor/mcp.json`, and returns `pasteToAi` text for your chat. Same as MCP `vp.bootstrap` and Dashboard **Teach AI**.

**Q: What is the one-prompt loop?**  
A: After Teach AI, tell your agent “test this project with VeloProve” — it should call `vp.verify` (`npx veloprove verify --json --ci`). On failure, open `.veloprove/evidence/<runId>/` then heal or suggestFix.

**Q: How do I install MCP without an API key?**  
A: VeloProve is local stdio only. Paste the JSON from `docs/AGENTS.md` into Cursor Settings → MCP, or run `npx veloprove init --link-ai --teach`. No cloud key is required.

**Q: Can I schedule verify locally?**  
A: Yes — `watch --verify`, `watch -i <sec>`, or `hook install --verify`. There is no cloud monitoring SaaS.

## Daily usage

**Q: verify vs release vs test?**  
A:

- `veloprove test` — run suites (`vp.run` in MCP); `test --affected` uses Twin+graph (expands when confidence is low)  
- `veloprove changed` — list impacted tests only  
- `veloprove impact` / `veloprove twin` / `veloprove drift` — Twin enrichment / aggregator (**PARTIAL MVP**)  
- `veloprove verify --ci` — full change-aware loop (inspect → impact → test → diagnose → heal → release)  
- `veloprove release` — confidence score gate only  

**Q: How do I ask the tool questions without an external LLM?**  
A: Packaged docs chat:

```bash
npx veloprove ask "how do I run security tests?"
npx veloprove ask --repl
```

Dashboard → **Docs Chat**. MCP: `vp.ask({ question: "..." })`. Answers are built from shipped markdown only (no cloud API).

**Q: Can every CLI command run from the Dashboard?**  
A: Almost — open **Tool Lab**. Exceptions:

- **Terminal only** (cannot nest): `ui`, `tui`, `mcp`, `watch`, `mock-server` — run in a separate terminal  
- **Partial**: `alert`, `db-snapshot`, `db-restore`, `refine`, `run-collection`, `dead-assets` — limited Dashboard path; prefer CLI for full options  

Details: `docs/reference/surface-matrix.md` and Dashboard Guide **9b. Tool Lab**.

**Q: audit vs security vs owasp vs web-sec?**  
A:

- `audit` — dependency CVEs + secret scan  
- `security` — live non-destructive suite  
- `owasp` / `owasp-scan` — headers/CSP/CORS on a URL  
- `web-sec` — static SRI/CSRF/CORS  

## Short CLI aliases

Examples: `load`=`load-test`, `vdiff`=`visual-diff`, `postman`=`export-postman`, `dev`=`ensure-dev`, `chat`=`ask`. Full list: `docs/reference/cli.md`.
