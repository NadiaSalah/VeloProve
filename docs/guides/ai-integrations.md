# VeloProve AI Agent Integration Guide

VeloProve is the autonomous testing, verification, and self-healing engine for AI coding agents.

**Start here after install:** the packaged agent playbook is [`docs/AGENTS.md`](../AGENTS.md) (MCP JSON + 10-step loop). This guide covers editor extras beyond that entrypoint.

---

## The autonomous QA loop (summary)

**One-prompt (preferred):** tell your AI “test this project with VeloProve” after `teach-ai`, or run:

```bash
npx veloprove teach-ai --force --mcp
npx veloprove verify --json --ci
```

Failures land under `.veloprove/evidence/<runId>/` (summary + replay HTML) for the agent to heal/suggestFix.

Extended loop when you need coverage work first:

```text
vp.bootstrap → vp.inspect → vp.changed → vp.plan → vp.generate
→ vp.run → vp.diagnose → vp.heal / vp.suggestFix → vp.run → vp.verify / vp.releaseCheck
```

Safety: never overwrite developer-written tests unless the user asks. Use `overwritePolicy: "generated-only"`.
`vp.generate` live-grounds API GET status when the local app is up (`liveGround: false` / `--no-live-ground` to skip).

Full MCP paste configs (Cursor, Windsurf, Claude, Cline) live in [`docs/AGENTS.md`](../AGENTS.md). **No API key** — local stdio only.

### Marketplace / one-click install

Listing pack (badge + copy + screenshot checklist): [`docs/assets/marketplace/`](../assets/marketplace/README.md).

1. Cursor: Settings → MCP → Add new MCP server → paste the JSON from `docs/AGENTS.md` (or run `npx veloprove init --link-ai`).
2. Claude Code: `claude mcp add veloprove npx -y @engnadia/veloprove mcp`
3. After publish, search editor marketplaces for **VeloProve** (listing is documentation + package metadata; runtime stays local).

### Scheduled / recurring local verify

See full OS recipes: [`guides/scheduled-verify.md`](scheduled-verify.md).

```bash
npx veloprove watch --verify          # verify on each file change
npx veloprove watch -i 300            # also every 5 minutes
npx veloprove hook install --verify   # pre-commit: verify --ci
npx veloprove verify --sandbox        # mock API_BASE_URL for this run
npx veloprove verify --docker-env     # write local docker-compose test env first
```

---

## Cursor rules

Ensure a project `AGENTS.md` exists (created by `vp.bootstrap` / `npx veloprove teach-ai` when missing) so agents invoke VeloProve during implementation turns. Optionally copy patterns from this package’s `docs/AGENTS.md`.

---

## GitHub Copilot Agent Mode

1. **CLI:** In `.github/copilot-instructions.md`, instruct Copilot to run `npx veloprove inspect`, `npx veloprove changed`, and `npx veloprove verify --ci`.
2. **MCP:** Register VeloProve as an MCP endpoint in VS Code / Copilot agent settings when available (same `npx -y @engnadia/veloprove mcp` stdio command).

---

## OpenAI Codex & custom LLM runners

```typescript
import { VeloProveEngine } from '@engnadia/veloprove';

const engine = new VeloProveEngine(process.cwd());

const { profile, requirements } = await engine.inspect();
const impact = await engine.changed();
const run = await engine.run({ scope: 'changed', paths: impact.impactedTestFiles });

if (run.status === 'failed') {
  const diagnoses = await engine.diagnose(run.id);
  console.log('Diagnosed issues:', diagnoses);
}
```

---

## Teach AI (`veloprove teach-ai`)

```bash
npx veloprove teach-ai --agent-name "MyCustomAgent" --force --mcp
# alias: npx veloprove agent-handshake ...
```

Writes `.veloprove/agent-manifest.json`, refreshes project-root `AGENTS.md` (with `--force`), optionally creates `.cursor/mcp.json`, and prints a `pasteToAi` briefing. MCP equivalent: `vp.bootstrap({ force: true, writeMcp: true })`. Dashboard: header **Teach AI**.
