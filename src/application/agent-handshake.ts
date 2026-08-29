import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceGuard } from '../execution/workspace-guard.js';

export interface AgentCapabilities {
  agentName?: string;
  supportsMcp?: boolean;
  supportsTerminal?: boolean;
  preferredOutput?: 'json' | 'markdown' | 'compact';
  interactionStyle?: 'autonomous' | 'supervised' | 'chat';
  maxTokenBudget?: number;
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
}

export class AgentAdaptationService {
  public static handshake(
    guard: WorkspaceGuard,
    capabilities: AgentCapabilities = {}
  ): AgentHandshakeResult {
    const agentName = capabilities.agentName || 'UnknownAIAgent';
    const preferredOutput = capabilities.preferredOutput || 'json';

    const tools = [
      {
        name: 'qa.inspect',
        description: 'Discover project stack, frameworks, routes, APIs, and requirements without editing files.',
        signature: { workspace: 'optional string' },
        exampleInvocation: 'qa.inspect({})'
      },
      {
        name: 'qa.plan',
        description: 'Generate risk-aware prioritized test plan from PRD and detected routes.',
        signature: { scope: "'all' | 'uncovered' | 'critical' | 'e2e' | 'api' | 'unit'", maxTests: 'number' },
        exampleInvocation: 'qa.plan({ scope: "uncovered", maxTests: 5 })'
      },
      {
        name: 'qa.generate',
        description: 'Create executable test files without overwriting developer written code.',
        signature: { planId: 'string', testCaseIds: 'string[]', overwritePolicy: "'never' | 'generated-only' | 'explicit'" },
        exampleInvocation: 'qa.generate({ overwritePolicy: "generated-only" })'
      },
      {
        name: 'qa.run',
        description: 'Execute test suites and collect structured test verdicts, duration, and failure traces.',
        signature: { scope: "'all' | 'changed' | 'paths'", paths: 'string[]', timeoutMs: 'number' },
        exampleInvocation: 'qa.run({ scope: "changed" })'
      },
      {
        name: 'qa.changed',
        description: 'Identify tests affected by recent Git changes.',
        signature: {},
        exampleInvocation: 'qa.changed({})'
      },
      {
        name: 'qa.diagnose',
        description: 'Classify failure cause (APPLICATION_BUG vs TEST_BUG) with confidence score and evidence.',
        signature: { runId: 'optional string' },
        exampleInvocation: 'qa.diagnose({})'
      },
      {
        name: 'qa.heal',
        description: 'Safely fix stale test locators/selectors without altering business logic.',
        signature: { runId: 'optional string' },
        exampleInvocation: 'qa.heal({})'
      },
      {
        name: 'qa.releaseCheck',
        description: 'Calculate release readiness score (0-100) and blockers.',
        signature: {},
        exampleInvocation: 'qa.releaseCheck({})'
      }
    ];

    const instructionPrompt = `You are connected to QAForge v1.0.0 (Local-First Autonomous QA Engine).
Always follow the autonomous QA verification cycle:
1. Inspect project: call qa.inspect
2. Plan tests: call qa.plan
3. Run tests: call qa.run
4. If tests fail: call qa.diagnose
   - If TEST_BUG: call qa.heal
   - If APPLICATION_BUG: use qa.suggestFix to fix the source code in the application
5. When modifying code: call qa.changed to re-run only impacted tests
6. Calculate confidence: call qa.releaseCheck before concluding your task.`;

    const guidanceRules = [
      'Never execute arbitrary shell scripts when QAForge tools are available.',
      'Never modify developer written tests; use qa.generate with overwritePolicy: "generated-only".',
      'Trust QAForge failure classification; use evidence before making source code edits.',
      'Always rerun impacted tests via qa.changed after making bug fixes.'
    ];

    const manifest = {
      agentName,
      capabilities,
      protocolVersion: '1.0.0',
      instructionPrompt,
      guidanceRules,
      tools,
      createdAt: new Date().toISOString()
    };

    const manifestPath = path.join(guard.getQAForgeDirectory(), 'agent-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    // Also write universal AGENTS.md in project root if not present
    const agentsMdPath = path.join(guard.getRoot(), 'AGENTS.md');
    if (!fs.existsSync(agentsMdPath)) {
      const agentsMdContent = `# QAForge Universal Agent Instructions

This repository is equipped with **QAForge** (Local Autonomous QA Engine).

## How to Test and Verify Code Changes
1. **Discover**: Call \`qa.inspect\` or run \`npx qaforge inspect\`
2. **Plan**: Call \`qa.plan\` or run \`npx qaforge plan\`
3. **Execute**: Call \`qa.run\` or run \`npx qaforge test\`
4. **Diagnose**: Call \`qa.diagnose\` or run \`npx qaforge diagnose\`
5. **Change Impact**: Call \`qa.changed\` or run \`npx qaforge changed\`
6. **Release Check**: Call \`qa.releaseCheck\` or run \`npx qaforge release\`
`;
      fs.writeFileSync(agentsMdPath, agentsMdContent, 'utf8');
    }

    return {
      agentName,
      protocolVersion: '1.0.0',
      instructionPrompt,
      supportedTools: tools,
      guidanceRules,
      manifestPath
    };
  }
}
