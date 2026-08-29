import pc from 'picocolors';

/**
 * Renders the official QAForge dual-color ANSI banner
 * Green (#20BF55) for 'QA' and Cyan (#38BDF8) for 'FORGE'
 */
export function renderQAForgeBanner(): string {
  const qa = pc.green;
  const forge = pc.cyan;
  const dim = pc.dim;
  const bold = pc.bold;
  const white = pc.white;

  const logoLines = [
    qa(' ██████   ██████  ') + '  ' + forge('████████  ██████   ████████   ██████   ████████ '),
    qa('██    ██ ██    ██ ') + '  ' + forge('██        ██    ██  ██     ██ ██    ██  ██       '),
    qa('██    ██ ████████ ') + '  ' + forge('██████    ██    ██  ████████  ██        ██████   '),
    qa('██  ████ ██    ██ ') + '  ' + forge('██        ██    ██  ██   ██   ██   ███  ██       '),
    qa(' ███████ ██    ██ ') + '  ' + forge('██         ██████   ██    ██   ██████   ████████ '),
    qa('      ██          ') + '  ' + forge('                                                 '),
  ];

  const badges = `  ${bold(white('QAForge CLI'))} ${dim('v1.0.0')}  ${pc.bgGreen(pc.black(' LOCAL-FIRST '))}  ${pc.bgCyan(pc.black(' 64 MCP TOOLS '))}  ${pc.bgBlue(white(' ZERO-CLOUD '))}`;
  const tagline = `  ${dim('Autonomous QA, Failure Healing, Stress Testing & API Quality Hub')}`;
  const motto = `  ${pc.cyan('⚡')} ${bold(white('Build. Test. Trust.'))} ${dim('•')} ${dim('https://github.com/NadiaSalah/QAForge')}`;

  return `\n${logoLines.join('\n')}\n\n${badges}\n${tagline}\n${motto}\n`;
}

/**
 * Renders a compact header with logo and command subtitle
 */
export function renderCommandHeader(commandName: string, subtitle?: string): void {
  console.log(`\n${pc.bold(pc.green('QA') + pc.cyan('FORGE'))} ${pc.dim('›')} ${pc.bold(pc.white(commandName))}${subtitle ? pc.dim(` — ${subtitle}`) : ''}`);
}

/**
 * Renders a stylized box with border and formatted lines
 */
export function renderBox(title: string, lines: string[], borderColor = pc.cyan): string {
  // Strip ANSI color codes to calculate visible length
  const stripAnsi = (str: string) => str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
  const visibleLengths = lines.map(l => stripAnsi(l).length);
  const contentWidth = Math.max(...visibleLengths, stripAnsi(title).length + 4, 60);

  const topBorder = borderColor(`╭─ ${pc.bold(pc.white(title))} ${'─'.repeat(Math.max(0, contentWidth - stripAnsi(title).length - 3))}╮`);
  const middleLines = lines.map((l) => {
    const pad = Math.max(0, contentWidth - stripAnsi(l).length);
    return `${borderColor('│')} ${l}${' '.repeat(pad)} ${borderColor('│')}`;
  });
  const bottomBorder = borderColor(`╰${'─'.repeat(contentWidth + 2)}╯`);

  return `${topBorder}\n${middleLines.join('\n')}\n${bottomBorder}`;
}
