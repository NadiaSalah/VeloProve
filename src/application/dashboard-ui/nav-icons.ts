/** Colored sidebar nav icons — stroke SVGs on tinted chips. */

export type NavIconTone = 'sky' | 'blue' | 'teal' | 'green' | 'lime' | 'amber' | 'orange' | 'coral' | 'rose' | 'slate';

const PATHS: Record<string, string> = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z"/>',
  stethoscope:
    '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M6 3h2M12 3h2"/><circle cx="18" cy="16" r="3"/><path d="M10 13v1a6 6 0 0 0 8 5.7"/>',
  shieldCheck:
    '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6L12 3z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  listPlus:
    '<path d="M8 6h12M8 12h8M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/><path d="M19 10v6M16 13h6"/>',
  play: '<path d="M8 5.5v13l11-6.5L8 5.5z"/>',
  grid:
    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  history:
    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/><path d="M4.5 8a9 9 0 0 1 2-2.5"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m6.5 6.5 11 11"/>',
  wrench:
    '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5 2.5-2.5z"/>',
  record: '<circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="9"/>',
  exchange:
    '<path d="M7 7h11l-3-3M17 17H6l3 3"/><path d="M18 7v4M6 17v-4"/>',
  api: '<path d="M4 8h6M4 16h6M14 8h6M14 16h6"/><circle cx="10" cy="8" r="2"/><circle cx="14" cy="16" r="2"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
  layers:
    '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6L12 3z"/>',
  sword: '<path d="m14.5 4 5.5 5.5M12 6.5 4 14.5 5.5 16 13.5 8M9 17l-2 2 1.5 1.5 2-2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/>',
  radar: '<circle cx="12" cy="12" r="9"/><path d="M12 12 17 7"/><circle cx="12" cy="12" r="3"/>',
  bug: '<path d="M9 9V7a3 3 0 0 1 6 0v2"/><rect x="7" y="9" width="10" height="10" rx="3"/><path d="M7 13H4M20 13h-3M9 19l-2 2M15 19l2 2M9 9 6 6M15 9l3-3"/>',
  cloud:
    '<path d="M7 18h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6-1.5A3.5 3.5 0 0 0 7 18z"/>',
  a11y:
    '<circle cx="12" cy="5" r="2"/><path d="M12 8v4M8 10l4 2 4-2M10 14l2 6 2-6"/>',
  volume:
    '<path d="M4 10v4h3l4 3V7L7 10H4z"/><path d="M16 9a3.5 3.5 0 0 1 0 6"/><path d="M18.5 7a6 6 0 0 1 0 10"/>',
  copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  gitBranch:
    '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M8.5 6h5a4 4 0 0 1 4 4"/>',
  signal: '<path d="M4 18h2V12H4v6zM9 18h2V8H9v10zM14 18h2V4h-2v14zM19 18h2v-7h-2v7z"/>',
  compass:
    '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 6-6 2 2-6 6-2z"/>',
  checkCircle:
    '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5L15.5 10"/>',
  activity: '<path d="M3 12h4l2.5-7 4 14L16 12h5"/>',
  share:
    '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 11 7.6-4M8.2 13l7.6 4"/>',
  book: '<path d="M5 4h11a2 2 0 0 1 2 2v13l-3-1.5L12 19l-3-1.5L6 19V6a2 2 0 0 1-1-2z"/><path d="M9 8h6M9 11h6"/>',
  message:
    '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M8 10h8M8 13h5"/>',
  send: '<path d="M5 12h12"/><path d="m13 6 6 6-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7.5h.01"/>',
  report:
    '<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'
};

function svg(inner: string): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

/** Renders a tinted icon chip for sidebar navigation. */
export function navIco(name: keyof typeof PATHS | string, tone: NavIconTone): string {
  const path = PATHS[name] || PATHS.info;
  return `<span class="ico tone-${tone}">${svg(path)}</span>`;
}

/** Compact stroke icon for primary/ghost action buttons. */
export function btnIco(name: keyof typeof PATHS | string): string {
  const path = PATHS[name] || PATHS.info;
  return `<span class="btn-ico" aria-hidden="true">${svg(path)}</span>`;
}
