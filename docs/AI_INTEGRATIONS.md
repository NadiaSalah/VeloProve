# QAForge AI Agent Integration Guide

QAForge is designed specifically to act as the autonomous testing, verification, and self-healing engine for AI coding agents.

---

## 🔄 The Autonomous Coding Agent QA Loop

All AI agents should adhere to the following autonomous execution loop when modifying code or developing features:

```text
1. qa.bootstrap       → Discover capabilities and active project protocol
2. qa.inspect         → Scan tech stack, framework routes, APIs, and PRD requirements
3. qa.changed         → Analyze git diff to identify impacted source and test files
4. qa.plan            → Generate risk-prioritized test cases
5. qa.generate        → Materialize compiling test files (with protected developer tests)
6. qa.run             → Execute affected/full test suites
7. qa.diagnose        → Classify failures (APPLICATION_BUG vs TEST_BUG vs FLAKY_TEST)
8. qa.heal / qa.suggestFix → Safely repair brittle locators or inspect code fix patches
9. qa.run             → Rerun tests to verify resolution
10. qa.releaseCheck   → Calculate quantitative Release Confidence Score (0-100)
```

> **Safety Rule for AI Agents**: Agents must never overwrite or delete developer-written tests unless explicitly instructed by the user. Use `overwritePolicy: "generated-only"`.

---

## 1. Cursor IDE Integration

Create or update `.cursor/mcp.json` in your project or global settings:

```json
{
  "mcpServers": {
    "qaforge": {
      "command": "npx",
      "args": ["qaforge", "mcp"]
    }
  }
}
```

### Cursor Rules Integration
Ensure `.cursor/rules/qaforge.mdc` or `AGENTS.md` is present in your repository so Cursor agents automatically invoke QAForge tools during implementation turns.

---

## 2. Windsurf Integration

In `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "qaforge": {
      "command": "npx",
      "args": ["qaforge", "mcp"]
    }
  }
}
```

---

## 3. Claude Code & Claude Desktop Integration

In your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "qaforge": {
      "command": "npx",
      "args": ["qaforge", "mcp"]
    }
  }
}
```

---

## 4. Cline (VS Code Extension) Integration

In `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "qaforge": {
      "command": "npx",
      "args": ["qaforge", "mcp"],
      "disabled": false,
      "autoApprove": [
        "qa.inspect",
        "qa.plan",
        "qa.run",
        "qa.diagnose",
        "qa.heal",
        "qa.changed",
        "qa.releaseCheck"
      ]
    }
  }
}
```

---

## 5. GitHub Copilot Agent Mode Integration

GitHub Copilot in VS Code / CLI can interact directly with QAForge via terminal executions or tool dispatch:

1. **CLI Execution**: Instruct Copilot in workspace instructions (`.github/copilot-instructions.md`) to run `npx qaforge inspect`, `npx qaforge changed`, and `npx qaforge release`.
2. **MCP stdio**: In `.vscode/settings.json`, register QAForge as an MCP agent endpoint if using Copilot Agent Extensions.

---

## 6. OpenAI Codex & Custom LLM Runners

For OpenAI Codex scripts, CI bots, or custom agents running LLM tool-calling APIs:

```typescript
import { QAForgeEngine } from 'qaforge';

const engine = new QAForgeEngine(process.cwd());

// 1. Inspect
const { profile, requirements } = await engine.inspect();

// 2. Identify changed impact
const impact = await engine.changed();

// 3. Run impacted tests
const run = await engine.run({ scope: 'changed', paths: impact.impactedTestFiles });

// 4. Diagnose if failed
if (run.status === 'failed') {
  const diagnoses = await engine.diagnose(run.id);
  console.log('Diagnosed issues:', diagnoses);
}
```

---

## 7. Universal Agent Handshake (`qa.bootstrap` / `qaforge agent-handshake`)

For any custom AI agent or editor outside standard environments, call the self-teaching protocol:

```bash
npx qaforge agent-handshake --agent-name "MyCustomAgent" --output json
```

This generates `.qaforge/agent-manifest.json` with machine-readable operational rules and prompt instructions tailored for the agent.
