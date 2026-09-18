import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export type AiEditorTarget = 'cursor' | 'claude' | 'windsurf' | 'cline';

export interface DetectedAiEditor {
  id: AiEditorTarget;
  label: string;
  projectHint: boolean;
  homeHint: boolean;
}

export interface AiLinkResult {
  detected: DetectedAiEditor[];
  writtenFiles: string[];
  mcpSnippet: string;
  linkedTargets: AiEditorTarget[];
}

const MCP_SERVER = {
  command: 'npx',
  args: ['-y', '@engnadia/veloprove', 'mcp']
};

export const MCP_SNIPPET = JSON.stringify(
  { mcpServers: { veloprove: MCP_SERVER } },
  null,
  2
);

function exists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

/**
 * Detect AI coding editors/agents from project + home config hints.
 */
export function detectAiEditors(projectRoot: string): DetectedAiEditor[] {
  const home = os.homedir();
  const cursorProject = path.join(projectRoot, '.cursor');
  const claudeProject = path.join(projectRoot, '.claude');
  const clineProject =
    exists(path.join(projectRoot, 'cline_mcp_settings.json')) ||
    exists(path.join(projectRoot, '.cline'));

  const detected: DetectedAiEditor[] = [
    {
      id: 'cursor',
      label: 'Cursor',
      projectHint: exists(cursorProject),
      homeHint: exists(path.join(home, '.cursor'))
    },
    {
      id: 'claude',
      label: 'Claude Code / Desktop',
      projectHint: exists(claudeProject),
      homeHint: exists(path.join(home, '.claude.json')) || exists(path.join(home, '.claude'))
    },
    {
      id: 'windsurf',
      label: 'Windsurf',
      projectHint: false,
      homeHint: exists(path.join(home, '.codeium', 'windsurf'))
    },
    {
      id: 'cline',
      label: 'Cline',
      projectHint: clineProject,
      homeHint: false
    }
  ];

  return detected;
}

export function editorsWithHints(detected: DetectedAiEditor[]): DetectedAiEditor[] {
  return detected.filter((d) => d.projectHint || d.homeHint);
}

export interface AiPresence {
  /** True when an AI coding agent/editor is linked or MCP is the caller */
  hasAi: boolean;
  /** Running inside VeloProve MCP stdio server */
  mcpClient: boolean;
  /** Editors with project/home hints */
  editors: DetectedAiEditor[];
  /** Project has .cursor/mcp.json (or similar) for VeloProve */
  mcpConfigPresent: boolean;
  summary: string;
}

/**
 * Resolve whether an AI coding agent is available for agentic operations.
 * MCP process always counts as AI context.
 */
export function resolveAiPresence(projectRoot: string = process.cwd()): AiPresence {
  const mcpClient =
    process.env.VELOPROVE_MCP === '1' ||
    process.env.VELOPROVE_AGENT === '1' ||
    process.env.MCP_SERVER_NAME === 'veloprove';

  const editors = editorsWithHints(detectAiEditors(projectRoot));
  const mcpConfigPresent =
    exists(path.join(projectRoot, '.cursor', 'mcp.json')) ||
    exists(path.join(projectRoot, 'cline_mcp_settings.json')) ||
    exists(path.join(projectRoot, '.veloprove', 'mcp-snippet.json'));

  const hasAi = mcpClient || editors.length > 0 || mcpConfigPresent;
  const names = editors.map((e) => e.label).join(', ');
  let summary: string;
  if (mcpClient) summary = 'AI agent context (MCP)';
  else if (editors.length > 0) summary = `AI editors detected: ${names}`;
  else if (mcpConfigPresent) summary = 'VeloProve MCP config present in project';
  else summary = 'No AI coding agent detected';

  return { hasAi, mcpClient, editors, mcpConfigPresent, summary };
}

function ensureDir(dir: string): void {
  if (!exists(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeMcpJsonIfMissing(filePath: string, written: string[]): void {
  if (exists(filePath)) return;
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, MCP_SNIPPET + '\n', 'utf8');
  written.push(filePath);
}

/**
 * Write MCP configs for selected targets inside the project (idempotent).
 * Home-global Claude/Windsurf files are not overwritten; we only write project-local Cursor/Cline
 * and a drop-in `.veloprove/mcp-snippet.json` for manual paste into global editors.
 */
export function linkAiEditors(
  projectRoot: string,
  targets: AiEditorTarget[]
): AiLinkResult {
  const detected = detectAiEditors(projectRoot);
  const writtenFiles: string[] = [];
  const linkedTargets: AiEditorTarget[] = [];

  for (const target of targets) {
    if (target === 'cursor') {
      writeMcpJsonIfMissing(path.join(projectRoot, '.cursor', 'mcp.json'), writtenFiles);
      linkedTargets.push('cursor');
    }
    if (target === 'cline') {
      writeMcpJsonIfMissing(path.join(projectRoot, 'cline_mcp_settings.json'), writtenFiles);
      linkedTargets.push('cline');
    }
    if (target === 'claude' || target === 'windsurf') {
      // Project-local reference snippet for global editors
      const snippetPath = path.join(projectRoot, '.veloprove', 'mcp-snippet.json');
      ensureDir(path.dirname(snippetPath));
      if (!exists(snippetPath)) {
        fs.writeFileSync(snippetPath, MCP_SNIPPET + '\n', 'utf8');
        writtenFiles.push(snippetPath);
      }
      if (!linkedTargets.includes(target)) linkedTargets.push(target);
    }
  }

  return { detected, writtenFiles, mcpSnippet: MCP_SNIPPET, linkedTargets };
}

/**
 * Resolve link+teach policy for init flags.
 */
export function resolveAiLinkPolicy(opts: {
  yes?: boolean;
  teach?: boolean;
  linkAi?: boolean;
  noLinkAi?: boolean;
  configureMcpFromPrompt?: boolean;
  mcpTargetsFromPrompt?: AiEditorTarget[];
  projectRoot: string;
}): {
  shouldLink: boolean;
  shouldTeach: boolean;
  targets: AiEditorTarget[];
  detected: DetectedAiEditor[];
  autoReason: string;
} {
  const detected = detectAiEditors(opts.projectRoot);
  const hinted = editorsWithHints(detected);

  if (opts.noLinkAi) {
    return {
      shouldLink: false,
      shouldTeach: Boolean(opts.teach),
      targets: [],
      detected,
      autoReason: 'User skipped AI link (--no-link-ai)'
    };
  }

  if (opts.linkAi || opts.configureMcpFromPrompt) {
    const targets =
      opts.mcpTargetsFromPrompt && opts.mcpTargetsFromPrompt.length > 0
        ? opts.mcpTargetsFromPrompt
        : hinted.length > 0
          ? hinted.map((h) => h.id)
          : (['cursor'] as AiEditorTarget[]);
    return {
      shouldLink: true,
      shouldTeach: opts.teach !== false,
      targets: [...new Set(targets)],
      detected,
      autoReason: 'Explicit link requested'
    };
  }

  if (opts.yes) {
    if (hinted.length > 0) {
      return {
        shouldLink: true,
        shouldTeach: true,
        targets: hinted.map((h) => h.id),
        detected,
        autoReason: `Auto-detected: ${hinted.map((h) => h.label).join(', ')}`
      };
    }
    return {
      shouldLink: false,
      shouldTeach: Boolean(opts.teach),
      targets: [],
      detected,
      autoReason: 'No AI editor detected; skipped auto-link (use --link-ai or paste MCP snippet)'
    };
  }

  // Interactive path handled by prompts; default teach when linking
  if (opts.teach) {
    return {
      shouldLink: true,
      shouldTeach: true,
      targets: hinted.length > 0 ? hinted.map((h) => h.id) : ['cursor'],
      detected,
      autoReason: '--teach with default Cursor target'
    };
  }

  return {
    shouldLink: false,
    shouldTeach: false,
    targets: [],
    detected,
    autoReason: 'No AI link flags; interactive prompt decides'
  };
}
