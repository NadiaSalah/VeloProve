import pc from 'picocolors';
import readline from 'node:readline';
import { resolveAiPresence } from '../application/ai-link.js';

export type CliMessageLevel = 'ok' | 'warn' | 'err' | 'info';

const glyphs: Record<CliMessageLevel, string> = {
  ok: '✔',
  warn: '⚠',
  err: '✖',
  info: 'ℹ'
};

const colors: Record<CliMessageLevel, (s: string) => string> = {
  ok: pc.green,
  warn: pc.yellow,
  err: pc.red,
  info: pc.cyan
};

/** One-line status message (shared visual language with Dashboard toasts). */
export function cliMsg(level: CliMessageLevel, title: string, detail?: string): void {
  const g = colors[level](glyphs[level]);
  const head = pc.bold(title);
  const tail = detail ? pc.dim(` — ${detail}`) : '';
  console.log(`${g} ${head}${tail}`);
}

function askYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${pc.yellow('?')} ${question} ${pc.dim('[y/N]')} `, (answer) => {
      rl.close();
      const a = String(answer || '').trim().toLowerCase();
      resolve(a === 'y' || a === 'yes');
    });
  });
}

export const AI_REQUIRED_MESSAGE =
  'This step prefers a linked AI coding agent (Cursor, Claude Code, Windsurf, or Cline with VeloProve MCP). Most VeloProve commands run fully locally without AI.';

export const msg = {
  ok: (title: string, detail?: string) => cliMsg('ok', title, detail),
  warn: (title: string, detail?: string) => cliMsg('warn', title, detail),
  err: (title: string, detail?: string) => cliMsg('err', title, detail),
  info: (title: string, detail?: string) => cliMsg('info', title, detail),
  /** Soft boxed notice for multi-line tips (TTY only gets color). */
  notice(title: string, lines: string[] = []): void {
    const width = Math.min(72, Math.max(40, title.length + 8, ...lines.map((l) => l.length + 4)));
    const bar = '─'.repeat(width);
    console.log(pc.dim(`┌${bar}┐`));
    console.log(`${pc.dim('│')} ${pc.bold(title)}${' '.repeat(Math.max(0, width - title.length - 1))}${pc.dim('│')}`);
    for (const line of lines) {
      const pad = Math.max(0, width - line.length - 1);
      console.log(`${pc.dim('│')} ${pc.dim(line)}${' '.repeat(pad)}${pc.dim('│')}`);
    }
    console.log(pc.dim(`└${bar}┘`));
  },
  /** Print the standard “needs AI” block and return false. */
  needsAi(detail?: string): false {
    msg.warn('AI coding agent not linked', detail || AI_REQUIRED_MESSAGE);
    msg.notice('Optional — how to continue', [
      'Core CLI/MCP/Dashboard work without an AI agent',
      'Link later: npx veloprove init --teach  or  teach-ai --mcp',
      'Or re-run this step with --allow-no-ai (-y in CI)'
    ]);
    return false;
  },
  /**
   * Gate for destructive / sensitive CLI operations.
   * - AI present (editor MCP / VELOPROVE_MCP) → execute (auto-confirm)
   * - No AI + interactive TTY → warn and ask to proceed (local-only mode)
   * - No AI + non-interactive → refuse unless --allow-no-ai (then -y / prompt rules)
   */
  async confirmSensitive(options: {
    title: string;
    lines: string[];
    yes?: boolean;
    allowNoAi?: boolean;
    projectRoot?: string;
    prompt?: string;
  }): Promise<boolean> {
    const presence = resolveAiPresence(options.projectRoot || process.cwd());
    msg.warn(options.title);
    msg.notice('Sensitive operation', options.lines);

    if (presence.hasAi) {
      msg.info('AI assistant detected — executing', presence.summary);
      return true;
    }

    const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY && !process.env.CI);
    msg.warn('No AI detected — local-only mode', presence.summary || AI_REQUIRED_MESSAGE);
    msg.notice('Optional AI link', [
      'Most VeloProve commands work without an agent',
      'Link later: npx veloprove init --teach',
      'CI / scripts: pass --allow-no-ai -y'
    ]);

    if (!options.allowNoAi && !interactive) {
      return msg.needsAi('Non-interactive session — add --allow-no-ai -y to continue without an agent');
    }

    if (options.yes || options.allowNoAi) {
      if (options.yes) {
        msg.info('Confirmed via --yes / -y');
        return true;
      }
    }

    if (!interactive) {
      msg.err('Refused sensitive operation', 'Re-run with -y / --yes in non-interactive mode');
      return false;
    }

    const ok = await askYesNo(options.prompt || 'Proceed without AI?');
    if (!ok) {
      msg.info('Cancelled — no changes applied');
      return false;
    }
    msg.info('Confirmed — continuing without AI');
    return true;
  }
};
