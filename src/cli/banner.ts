import pc from 'picocolors';

/**
 * Official CLI brand colors matching docs/assets/veloprove-icon.svg
 * Gradient navy #002B5B→#36C2FF · Gradient green #007A3D→#8AF33F
 */
const brand = {
  mark: pc.blue, // navy V
  accent: pc.green, // green proof mark
  dim: pc.dim,
  bold: pc.bold,
  white: pc.white,
};

function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Clean solid-block V (true chevron tip) + outlined P — equal row widths.
 * Avoids FIGlet ╗/╝ jags that made the V arms look uneven.
 */
function renderIconMark(): string[] {
  const v = brand.mark;
  const g = brand.accent;
  // V: 10 cols · P: 9 cols · gap: 2
  return [
    v('██      ██') + '  ' + g(' ██████╗ '),
    v(' ██    ██ ') + '  ' + g('██╔══██╗'),
    v('  ██  ██  ') + '  ' + g('██████╔╝'),
    v('   ████   ') + '  ' + g('██╔═══╝ '),
    v('    ██    ') + '  ' + g('██║     '),
    v('          ') + '  ' + g('╚═╝     '),
  ];
}

/** Dual-tone rule: === … --- blend for a clean header frame */
function frameRules(contentWidth: number): { top: string; mid: string; bottom: string } {
  const w = Math.max(40, Math.min(contentWidth + 4, 72));
  const top = brand.dim('═'.repeat(w));
  const mid = brand.dim('─'.repeat(w));
  const bottom = brand.dim('═'.repeat(w));
  return { top, mid, bottom };
}

/**
 * Full startup / help banner: VP mark left + wordmark right, framed rules
 */
export function renderVeloProveBanner(): string {
  const icon = renderIconMark();
  const text = [
    `${brand.bold(brand.white('VeloProve'))} ${brand.dim('CLI')} ${brand.dim('v1.0.0')}`,
    brand.bold(brand.white('Build. Test. Trust.')),
    brand.dim('Autonomous QA · Failure Healing · API Quality Hub'),
    `${pc.bgGreen(pc.black(' LOCAL-FIRST '))} ${pc.bgBlue(pc.white(' 75 MCP '))} ${brand.accent(brand.bold(' ZERO-CLOUD '))}`,
    brand.dim('https://github.com/NadiaSalah/VeloProve'),
  ];

  const rows = icon.map((line, i) => {
    const label = text[i] ? `   ${text[i]}` : '';
    return `  ${line}${label}`;
  });

  const contentWidth = Math.max(...rows.map((r) => stripAnsi(r).length));
  const { top, mid } = frameRules(contentWidth);

  return ['', `  ${top}`, ...rows, `  ${mid}`, ''].join('\n');
}

/**
 * Compact command header using the icon glyph
 */
export function renderCommandHeader(commandName: string, subtitle?: string): void {
  const glyph = brand.mark('V') + brand.accent('▸');
  console.log(
    `\n${brand.bold(glyph)} ${brand.bold(brand.white('VeloProve'))} ${brand.dim('›')} ${brand.bold(brand.white(commandName))}${
      subtitle ? brand.dim(` — ${subtitle}`) : ''
    }`
  );
}

/**
 * Renders a stylized box with border and formatted lines
 */
export function renderBox(title: string, lines: string[], borderColor = pc.green): string {
  const visibleLengths = lines.map((l) => stripAnsi(l).length);
  const contentWidth = Math.max(...visibleLengths, stripAnsi(title).length + 4, 60);

  const topBorder = borderColor(
    `╭─ ${pc.bold(pc.white(title))} ${'─'.repeat(Math.max(0, contentWidth - stripAnsi(title).length - 3))}╮`
  );
  const middleLines = lines.map((l) => {
    const pad = Math.max(0, contentWidth - stripAnsi(l).length);
    return `${borderColor('│')} ${l}${' '.repeat(pad)} ${borderColor('│')}`;
  });
  const bottomBorder = borderColor(`╰${'─'.repeat(contentWidth + 2)}╯`);

  return `${topBorder}\n${middleLines.join('\n')}\n${bottomBorder}`;
}
