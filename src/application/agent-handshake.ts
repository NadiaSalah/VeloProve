import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';
import { getPackageVersion } from '../shared/package-meta.js';
import { catalogCliCommands, catalogMcpTools } from '../shared/tool-catalog.js';

export interface AgentCapabilities {
  agentName?: string;
  supportsMcp?: boolean;
  supportsTerminal?: boolean;
  preferredOutput?: 'json' | 'markdown' | 'compact';
  interactionStyle?: 'autonomous' | 'supervised' | 'chat';
  maxTokenBudget?: number;
  /** Rewrite project-root AGENTS.md even if it already exists */
  forceAgentsMd?: boolean;
  /** Create `.cursor/mcp.json` when missing */
  writeMcpConfig?: boolean;
}

export interface AgentHandshakeResult {
  agentName: string;
  protocolVersion: string;
  instructionPrompt: string;
  supportedTools: Array<{
    name: string;
    description: string;
    signature: Record<string, unknown>;
    exampleInvocation: string;
  }>;
  guidanceRules: string[];
  manifestPath: string;
  agentsMdPath: string;
  mcpConfigPath?: string;
  writtenFiles: string[];
  /** Ready-to-paste briefing for the user's AI chat */
  pasteToAi: string;
  mcpSnippet: string;
}

const MCP_SNIPPET = `{
  "mcpServers": {
    "veloprove": {
      "command": "npx",
      "args": ["-y", "@engnadia/veloprove", "mcp"]
    }
  }
}`;

function buildAgentsMdContent(): string {
  const mcpCount = catalogMcpTools().length;
  const cliCount = catalogCliCommands().length;
  return `# VeloProve Universal Agent Instructions

This project uses **VeloProve** (local autonomous QA). Prefer MCP \`vp.*\` tools or \`npx veloprove <cmd>\`.

## One-prompt loop (preferred)
When the user says **“test this project”** / **“verify my changes”**:
1. \`vp.bootstrap\` / \`npx veloprove teach-ai\` once if AGENTS.md / MCP is missing
2. \`vp.verify\` with \`{ "ci": true }\` / \`npx veloprove verify --json --ci\`
3. On failure: read evidence under \`.veloprove/evidence/\` then \`vp.diagnose\` → \`vp.heal\` (TEST_BUG) or \`vp.suggestFix\` (APPLICATION_BUG)
4. Finish with \`vp.history\`

Use plan/generate/run only when verify reports missing coverage or an empty suite.

## Extended loop (when needed)
1. Discover: \`vp.inspect\` + \`vp.doctor\`
2. Impact: \`vp.changed\` / \`vp.impact\` (optional \`vp.twin\` PARTIAL MVP — local project model; not AI assumptions)
3. Plan → Generate → Run: \`vp.plan\` → \`vp.generate\` → \`vp.run\`
4. Gate: \`vp.releaseCheck\`

Optional Twin helpers (PARTIAL): \`vp.twin\` / \`vp.drift\` / \`npx veloprove test --affected\` (expands when confidence is low).

## Packaged docs (after npm install)
- Playbook + MCP setup: \`node_modules/@engnadia/veloprove/docs/AGENTS.md\`
- MCP catalog (${mcpCount} tools): \`node_modules/@engnadia/veloprove/docs/reference/mcp.md\`
- CLI catalog (${cliCount} commands): \`node_modules/@engnadia/veloprove/docs/reference/cli.md\`
- FAQ: \`node_modules/@engnadia/veloprove/docs/guides/faq.md\`

Or open Docs Chat via \`npx veloprove ui\` / \`npx veloprove ask "…"\`.
`;
}

function buildPasteToAi(agentName: string, agentsMdPath: string): string {
  const mcpCount = catalogMcpTools().length;
  return `This project uses VeloProve for local autonomous QA. Follow AGENTS.md (${agentsMdPath}) and MCP tools (vp.*).

ONE-PROMPT LOOP (preferred when user says "test this project" / "verify changes"):
1. vp.bootstrap (only if not already taught)
2. vp.verify ({ ci: true })  — change-aware inspect → impact → test → diagnose → heal → release
3. If blocked: open .veloprove/evidence/<runId>/ then heal / suggestFix and re-verify
4. vp.history

Rules: never overwrite developer-written tests (overwritePolicy: generated-only). Prefer MCP over ad-hoc shell. Catalog: node_modules/@engnadia/veloprove/docs/reference/mcp.md (${mcpCount} tools).

You are assisting: ${agentName}.`;
}

export class AgentAdaptationService {
  public static handshake(
    guard: WorkspaceGuard,
    capabilities: AgentCapabilities = {}
  ): AgentHandshakeResult {
    const agentName = capabilities.agentName || 'UnknownAIAgent';
    const preferredOutput = capabilities.preferredOutput || 'json';
    const forceAgentsMd = capabilities.forceAgentsMd === true;
    const writeMcpConfig = capabilities.writeMcpConfig === true;
    const writtenFiles: string[] = [];

    const tools = [
      {
        name: 'vp.inspect',
        description: 'Discover project stack, frameworks, routes, APIs, and requirements without editing files.',
        signature: { workspace: 'optional string' },
        exampleInvocation: 'vp.inspect({})'
      },
      {
        name: 'vp.doctor',
        description: 'Validate Node, runners, browsers, and project config before deep loops.',
        signature: {},
        exampleInvocation: 'vp.doctor({})'
      },
      {
        name: 'vp.bootstrap',
        description:
          'Teach AI / self-handshake — writes AGENTS.md + agent-manifest and returns pasteToAi briefing (CLI: veloprove teach-ai).',
        signature: {
          agentName: 'string',
          preferredOutput: "'json' | 'markdown' | 'compact'",
          force: 'boolean',
          writeMcp: 'boolean'
        },
        exampleInvocation: 'vp.bootstrap({ agentName: "CursorAgent", force: true, writeMcp: true })'
      },
      {
        name: 'vp.plan',
        description: 'Generate risk-aware prioritized test plan from PRD and detected routes.',
        signature: { scope: "'all' | 'uncovered' | 'critical' | 'e2e' | 'api' | 'unit'", maxTests: 'number' },
        exampleInvocation: 'vp.plan({ scope: "uncovered", maxTests: 5 })'
      },
      {
        name: 'vp.generate',
        description: 'Create executable test files without overwriting developer written code.',
        signature: { planId: 'string', testCaseIds: 'string[]', overwritePolicy: "'never' | 'generated-only' | 'explicit'" },
        exampleInvocation: 'vp.generate({ overwritePolicy: "generated-only" })'
      },
      {
        name: 'vp.run',
        description: 'Execute test suites and collect structured test verdicts, duration, and failure traces.',
        signature: { scope: "'all' | 'changed' | 'paths'", paths: 'string[]', timeoutMs: 'number' },
        exampleInvocation: 'vp.run({ scope: "changed" })'
      },
      {
        name: 'vp.run.get',
        description: 'Poll status for a long-running vp.run (MCP-only).',
        signature: { runId: 'string' },
        exampleInvocation: 'vp.run.get({ runId: "..." })'
      },
      {
        name: 'vp.changed',
        description: 'Identify tests affected by recent Git changes.',
        signature: {},
        exampleInvocation: 'vp.changed({})'
      },
      {
        name: 'vp.diagnose',
        description: 'Classify failure cause (APPLICATION_BUG vs TEST_BUG) with confidence score and evidence.',
        signature: { runId: 'optional string' },
        exampleInvocation: 'vp.diagnose({})'
      },
      {
        name: 'vp.heal',
        description: 'Safely fix stale test locators/selectors without altering business logic.',
        signature: { runId: 'optional string' },
        exampleInvocation: 'vp.heal({})'
      },
      {
        name: 'vp.suggestFix',
        description: 'MCP-only source-fix recommendations after APPLICATION_BUG diagnosis.',
        signature: { runId: 'optional string' },
        exampleInvocation: 'vp.suggestFix({})'
      },
      {
        name: 'vp.verify',
        description: 'Autonomous change-aware QA: inspect → impact → tests → diagnose → heal → release.',
        signature: { full: 'boolean', security: 'boolean', a11y: 'boolean', intent: 'string' },
        exampleInvocation: 'vp.verify({ full: false })'
      },
      {
        name: 'vp.releaseCheck',
        description: 'Calculate release readiness score (0-100) and blockers.',
        signature: {},
        exampleInvocation: 'vp.releaseCheck({})'
      },
      {
        name: 'vp.history',
        description: 'Local pass-rate / duration trends from .veloprove state.',
        signature: { limit: 'number' },
        exampleInvocation: 'vp.history({ limit: 20 })'
      },
      {
        name: 'vp.securityScan',
        description: 'Discover auth/authZ/injection/session/upload attack surfaces (non-destructive).',
        signature: {},
        exampleInvocation: 'vp.securityScan({})'
      },
      {
        name: 'vp.sendRequest',
        description: 'Ad-hoc HTTP request (Postman-style) for API debugging.',
        signature: { method: 'string', url: 'string', headers: 'object', body: 'unknown' },
        exampleInvocation: 'vp.sendRequest({ method: "GET", url: "http://localhost:3000/api/health" })'
      }
    ];

    const mcpCount = catalogMcpTools().length;
    const cliCount = catalogCliCommands().length;
    const productVersion = getPackageVersion();

    const instructionPrompt = `You are connected to VeloProve v${productVersion} (Local-First Autonomous QA Engine).
Full catalog: ${mcpCount} MCP tools (docs/reference/mcp.md) + ${cliCount} CLI commands (docs/reference/cli.md). User guide: docs/guides/features.md.
Teach / refresh project AI files: npx veloprove teach-ai (alias: agent-handshake) or vp.bootstrap.
Ask docs locally: npx veloprove ask "…" / vp.ask (no cloud LLM).

Always follow the autonomous QA verification cycle:
1. Bootstrap if needed: vp.bootstrap — learn tool usage
2. Inspect project: vp.inspect (+ vp.doctor for environment health)
3. Prefer vp.verify for change-aware end-to-end QA when finishing a task
4. Or stepwise: vp.plan → vp.generate → vp.run (poll with vp.run.get if needed)
5. If tests fail: vp.diagnose
   - TEST_BUG → vp.heal
   - APPLICATION_BUG → vp.suggestFix (MCP-only) then edit source
6. After edits: vp.changed / vp.run({ scope: "changed" })
7. Security when relevant: vp.securityScan → vp.securityPlan → vp.securityRun (safe mode)
8. Gate: vp.releaseCheck + vp.history before concluding`;

    const guidanceRules = [
      'Never execute arbitrary shell scripts when VeloProve tools are available.',
      'Never modify developer written tests; use vp.generate with overwritePolicy: "generated-only".',
      'Trust VeloProve failure classification; use evidence before making source code edits.',
      'Always rerun impacted tests via vp.changed after making bug fixes.',
      `Read docs/reference/mcp.md for the full ${mcpCount}-tool schema catalog when a specialized capability is needed.`,
      'Destructive actions (malware remediate, dead-asset purge, auto-fix --apply) require explicit user opt-in.'
    ];

    const manifest = {
      agentName,
      capabilities: {
        ...capabilities,
        preferredOutput,
        forceAgentsMd,
        writeMcpConfig
      },
      protocolVersion: '1.0.0',
      instructionPrompt,
      guidanceRules,
      tools,
      createdAt: new Date().toISOString()
    };

    const veloproveDir = guard.getVeloProveDirectory();
    if (!fs.existsSync(veloproveDir)) {
      fs.mkdirSync(veloproveDir, { recursive: true });
    }
    const manifestPath = path.join(veloproveDir, 'agent-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    writtenFiles.push(manifestPath);

    const agentsMdPath = path.join(guard.getRoot(), 'AGENTS.md');
    if (forceAgentsMd || !fs.existsSync(agentsMdPath)) {
      fs.writeFileSync(agentsMdPath, buildAgentsMdContent(), 'utf8');
      writtenFiles.push(agentsMdPath);
    }

    let mcpConfigPath: string | undefined;
    if (writeMcpConfig) {
      const cursorDir = path.join(guard.getRoot(), '.cursor');
      mcpConfigPath = path.join(cursorDir, 'mcp.json');
      if (!fs.existsSync(mcpConfigPath)) {
        if (!fs.existsSync(cursorDir)) fs.mkdirSync(cursorDir, { recursive: true });
        const mcpConfig = {
          mcpServers: {
            veloprove: {
              command: 'npx',
              args: ['-y', '@engnadia/veloprove', 'mcp']
            }
          }
        };
        fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2) + '\n', 'utf8');
        writtenFiles.push(mcpConfigPath);
      }
    }

    const pasteToAi = buildPasteToAi(agentName, agentsMdPath);

    return {
      agentName,
      protocolVersion: '1.0.0',
      instructionPrompt,
      supportedTools: tools,
      guidanceRules,
      manifestPath,
      agentsMdPath,
      mcpConfigPath,
      writtenFiles,
      pasteToAi,
      mcpSnippet: MCP_SNIPPET
    };
  }
}
