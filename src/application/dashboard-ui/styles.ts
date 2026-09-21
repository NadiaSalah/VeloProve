export function dashboardStyles(): string {
  return `    :root {
      --bg: #0d0d0f;
      --bg-sidebar: #121214;
      --bg-panel: #161618;
      --bg-elevated: #1c1c1f;
      --bg-hover: #222226;
      --bg-active: #2a2a30;
      --border: #2a2a2e;
      --border-soft: #232326;
      --text: #ececee;
      --text-secondary: #a0a0a8;
      --text-muted: #6f6f78;
      --accent: #4f8cff;
      --accent-soft: rgba(79, 140, 255, 0.14);
      --accent-border: rgba(79, 140, 255, 0.35);
      --success: #3dd68c;
      --warning: #f5a524;
      --danger: #f07178;
      /* Offline-only stacks — never load webfont CDNs (dashboard is local-first) */
      --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      --sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --sidebar-w: 248px;
      --sidebar-rail: 60px;
      --radius: 10px;
      --tap: 44px;
      --safe-bottom: env(safe-area-inset-bottom, 0px);
      --safe-top: env(safe-area-inset-top, 0px);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      font-size: 14px;
      line-height: 1.45;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    button, input, select, textarea { font: inherit; color: inherit; }
    button { -webkit-tap-highlight-color: transparent; }
    code { font-family: var(--mono); font-size: 12px; color: #c7d2fe; }
    :focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }

    .app {
      display: grid;
      grid-template-columns: var(--sidebar-w) 1fr;
      height: 100vh;
      height: 100dvh;
      transition: grid-template-columns .18s ease;
      padding-top: var(--safe-top);
    }
    .app.sidebar-collapsed { grid-template-columns: var(--sidebar-rail) 1fr; }

    .sidebar-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 45;
      background: rgba(0, 0, 0, 0.5);
      border: none;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      padding: 0;
    }
    .sidebar-backdrop.is-open { display: block; }

    /* Sidebar */
    .sidebar {
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column; min-height: 0; min-width: 0;
      overflow: hidden;
      z-index: 50;
    }
    .brand {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 14px 12px; border-bottom: 1px solid var(--border-soft);
      min-height: 56px;
    }
    .brand-mark {
      width: 32px; height: 32px; min-width: 32px; min-height: 32px; border-radius: 8px;
      background: transparent; border: none;
      display: grid; place-items: center; overflow: hidden; flex-shrink: 0;
    }
    .brand-mark img { width: 28px; height: 28px; object-fit: contain; display: block; }
    .brand-hero {
      display: flex; justify-content: center; align-items: center;
      margin: 4px 0 18px; padding: 12px 8px;
      background: transparent; border: none;
    }
    .brand-hero img { width: min(240px, 78%); height: auto; object-fit: contain; }
    .brand-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; overflow: hidden; }
    .brand-name { font-weight: 650; font-size: 14px; letter-spacing: 0.01em; white-space: nowrap; }
    .brand-sub { color: var(--text-muted); font-size: 11px; white-space: nowrap; }
    .sidebar-search {
      margin: 8px 12px 6px; padding: 10px 12px;
      background: var(--bg-elevated); border: 1px solid var(--border);
      border-radius: 8px; color: var(--text-secondary); outline: none; width: calc(100% - 24px);
      flex-shrink: 0; min-height: 40px;
    }
    .sidebar-search:focus { border-color: var(--accent-border); }
    .nav {
      overflow-x: hidden;
      overflow-y: auto;
      padding: 4px 8px calc(8px + var(--safe-bottom));
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
      scrollbar-width: thin;
      scrollbar-color: var(--border) transparent;
      -webkit-overflow-scrolling: touch;
    }
    .nav::-webkit-scrollbar { width: 6px; }
    .nav::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }
    .nav-group {
      margin-top: 0;
      display: flex;
      flex-direction: column;
      flex: 0 0 auto;
    }
    .nav-label {
      color: var(--text-muted); font-size: 10px; font-weight: 650;
      letter-spacing: 0.08em; text-transform: uppercase;
      padding: 10px 10px 6px; white-space: nowrap;
      width: 100%; text-align: left; background: transparent; border: none;
      cursor: pointer; display: flex; align-items: center; justify-content: space-between;
      gap: 8px; border-radius: 8px; flex-shrink: 0;
      min-height: 36px;
    }
    .nav-label:hover { color: var(--text-secondary); background: var(--bg-hover); }
    .nav-chevron {
      width: 0; height: 0;
      border-left: 4px solid transparent; border-right: 4px solid transparent;
      border-top: 5px solid currentColor;
      opacity: 0.7; transition: transform .15s ease;
    }
    .nav-group.is-open > .nav-label .nav-chevron { transform: rotate(180deg); }
    .nav-group-items {
      display: none;
      flex-direction: column;
      gap: 1px;
    }
    .nav-group.is-open > .nav-group-items {
      display: flex;
    }
    .nav-item {
      width: 100%; text-align: left; background: transparent; border: none;
      color: var(--text-secondary); padding: 8px 10px; border-radius: 8px;
      cursor: pointer; display: flex; align-items: center; gap: 10px;
      transition: background .14s ease, color .14s ease;
      position: relative;
      flex-wrap: nowrap;
      min-height: 40px;
      flex: 0 0 auto;
    }
    .nav-item:hover { background: var(--bg-hover); color: var(--text); }
    .nav-item:hover .ico { filter: brightness(1.18); }
    .nav-item.active {
      background: var(--accent-soft); color: #e8efff;
      box-shadow: inset 0 0 0 1px var(--accent-border);
    }
    .nav-item.active .ico { filter: brightness(1.22); }
    .nav-item .ico {
      width: 32px; height: 32px; min-width: 32px; min-height: 32px; border-radius: 9px;
      display: inline-grid; place-items: center; flex-shrink: 0;
      transition: filter .14s ease, box-shadow .14s ease, transform .14s ease;
    }
    .nav-item .ico svg {
      width: 17px; height: 17px; min-width: 17px; min-height: 17px;
      display: block; flex-shrink: 0;
      stroke-width: 2.15;
    }
    .nav-item .ico.tone-sky { background: rgba(56, 189, 248, 0.22); color: #7dd3fc; box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.38); }
    .nav-item .ico.tone-blue { background: rgba(79, 140, 255, 0.24); color: #93c5fd; box-shadow: inset 0 0 0 1px rgba(79, 140, 255, 0.42); }
    .nav-item .ico.tone-teal { background: rgba(45, 212, 191, 0.22); color: #5eead4; box-shadow: inset 0 0 0 1px rgba(45, 212, 191, 0.38); }
    .nav-item .ico.tone-green { background: rgba(61, 214, 140, 0.22); color: #6ee7b7; box-shadow: inset 0 0 0 1px rgba(61, 214, 140, 0.4); }
    .nav-item .ico.tone-lime { background: rgba(163, 230, 53, 0.2); color: #bef264; box-shadow: inset 0 0 0 1px rgba(163, 230, 53, 0.36); }
    .nav-item .ico.tone-amber { background: rgba(245, 165, 36, 0.22); color: #fbbf24; box-shadow: inset 0 0 0 1px rgba(245, 165, 36, 0.4); }
    .nav-item .ico.tone-orange { background: rgba(251, 146, 60, 0.22); color: #fdba74; box-shadow: inset 0 0 0 1px rgba(251, 146, 60, 0.38); }
    .nav-item .ico.tone-coral { background: rgba(240, 113, 120, 0.22); color: #fca5a5; box-shadow: inset 0 0 0 1px rgba(240, 113, 120, 0.4); }
    .nav-item .ico.tone-rose { background: rgba(251, 113, 133, 0.22); color: #fda4af; box-shadow: inset 0 0 0 1px rgba(251, 113, 133, 0.38); }
    .nav-item .ico.tone-slate { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.36); }
    .nav-item .label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; min-width: 0; }
    .nav-item .count {
      font-size: 10.5px; color: var(--text-muted); background: var(--bg-elevated);
      border: 1px solid var(--border); border-radius: 999px; padding: 1px 7px;
      font-variant-numeric: tabular-nums; flex-shrink: 0;
    }
    .nav-item.active .count {
      color: #c7d7ff; border-color: var(--accent-border); background: rgba(79, 140, 255, 0.12);
    }
    .sidebar-foot {
      border-top: 1px solid var(--border-soft); padding: 10px 14px calc(10px + var(--safe-bottom));
      color: var(--text-muted); font-size: 11px; display: flex; justify-content: space-between;
      gap: 8px; white-space: nowrap; overflow: hidden; flex-shrink: 0;
    }
    .sidebar-quick {
      border-top: 1px solid var(--border-soft);
      padding: 8px 10px;
      display: flex; flex-direction: column; gap: 4px;
      flex-shrink: 0;
      max-height: 42%;
      overflow: auto;
    }
    .sq-btn {
      display: flex; align-items: center; gap: 10px;
      width: 100%; min-height: 40px;
      padding: 6px 10px; border-radius: 10px;
      border: 1px solid var(--border); background: var(--bg-elevated);
      color: var(--text); cursor: pointer; font-size: 12.5px; font-weight: 550;
      text-align: left;
    }
    .sq-btn:hover { background: var(--bg-hover); border-color: var(--accent-border); }
    .sq-btn.active {
      background: var(--accent); border-color: transparent; color: #fff; font-weight: 650;
    }
    .sq-btn.active:hover { filter: brightness(1.06); }
    .sq-btn .ico { width: 30px; height: 30px; min-width: 30px; min-height: 30px; display: grid; place-items: center; border-radius: 8px; }
    .sq-btn .ico svg { width: 17px; height: 17px; stroke-width: 2.15; }
    .sq-label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row.actions.wrap { flex-wrap: wrap; gap: 8px; }
    .stack { margin-top: 12px; }
    .stack-sm { margin-top: 8px; }
    .stack-md { margin-top: 10px; }

    #toast-host {
      position: fixed;
      z-index: 2147483645;
      right: max(12px, env(safe-area-inset-right, 0px));
      bottom: calc(12px + var(--safe-bottom));
      display: flex; flex-direction: column; gap: 8px;
      max-width: min(380px, calc(100vw - 24px));
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: start;
      padding: 12px 12px 12px 14px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: color-mix(in srgb, var(--bg-elevated) 92%, #000 8%);
      box-shadow: 0 16px 40px rgba(0,0,0,.45);
      color: var(--text);
      animation: toast-in .22s ease;
    }
    .toast.is-out { animation: toast-out .18s ease forwards; }
    .toast-ico {
      width: 28px; height: 28px; border-radius: 8px;
      display: grid; place-items: center; font-size: 14px; font-weight: 700;
      flex-shrink: 0;
    }
    .toast.ok .toast-ico { background: rgba(61,214,140,.16); color: #3dd68c; }
    .toast.warn .toast-ico { background: rgba(245,176,65,.16); color: #f5b041; }
    .toast.err .toast-ico { background: rgba(240,113,120,.16); color: #f07178; }
    .toast.info .toast-ico { background: rgba(79,140,255,.16); color: #7eb0ff; }
    .toast-body { min-width: 0; }
    .toast-title { font-weight: 650; font-size: 13px; line-height: 1.3; }
    .toast-detail { color: var(--text-muted); font-size: 12px; margin-top: 2px; line-height: 1.35; word-break: break-word; }
    .toast-close {
      border: none; background: transparent; color: var(--text-muted);
      cursor: pointer; font-size: 16px; line-height: 1; padding: 2px 4px; border-radius: 6px;
    }
    .toast-close:hover { color: var(--text); background: var(--bg-hover); }
    .toast.toast-confirm {
      grid-template-columns: auto 1fr;
      pointer-events: auto;
      border-color: rgba(245,176,65,.45);
      max-width: min(420px, calc(100vw - 24px));
    }
    .toast-confirm .toast-actions {
      grid-column: 1 / -1;
      display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;
    }
    .toast-confirm .btn { min-height: 36px; }
    @keyframes toast-in {
      from { opacity: 0; transform: translateY(8px) scale(.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes toast-out {
      to { opacity: 0; transform: translateY(6px) scale(.98); }
    }

    #vp-tooltip {
      position: fixed;
      z-index: 2147483646;
      pointer-events: none;
      background: #111827;
      color: #f9fafb;
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 7px 11px;
      font-size: 12.5px;
      font-weight: 550;
      line-height: 1.3;
      white-space: nowrap;
      max-width: min(280px, calc(100vw - 16px));
      box-shadow: 0 12px 32px rgba(0,0,0,.55);
      opacity: 0;
      visibility: hidden;
      transform: translateY(2px);
      transition: opacity .1s ease, transform .1s ease, visibility .1s;
    }
    #vp-tooltip.is-visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
    #vp-tooltip.is-wrap { white-space: normal; }

    /* Collapsed icon-rail */
    .app.sidebar-collapsed .brand {
      justify-content: center; padding: 12px 6px; min-height: 56px;
    }
    .app.sidebar-collapsed .brand-text,
    .app.sidebar-collapsed .nav-label,
    .app.sidebar-collapsed .nav-item .label,
    .app.sidebar-collapsed .nav-item .count,
    .app.sidebar-collapsed .sidebar-search,
    .app.sidebar-collapsed .sidebar-foot,
    .app.sidebar-collapsed .sq-label {
      display: none !important;
    }
    .app.sidebar-collapsed .sidebar-quick {
      padding: 8px 6px;
      align-items: stretch;
    }
    .app.sidebar-collapsed .sq-btn {
      justify-content: center;
      padding: 6px;
      gap: 0;
    }
    .app.sidebar-collapsed .nav {
      padding: 8px 6px calc(12px + var(--safe-bottom));
      overflow-x: hidden;
      overflow-y: auto;
      gap: 2px;
    }
    .app.sidebar-collapsed .nav-group,
    .app.sidebar-collapsed .nav-group.is-open {
      flex: 0 0 auto;
      margin: 0;
      gap: 2px;
    }
    .app.sidebar-collapsed .nav-group-items,
    .app.sidebar-collapsed .nav-group.is-open > .nav-group-items {
      display: flex !important;
      flex: 0 0 auto;
      gap: 2px;
    }
    .app.sidebar-collapsed .nav-item {
      justify-content: center;
      padding: 6px;
      gap: 0;
      min-height: var(--tap);
      height: var(--tap);
      width: 100%;
      flex: 0 0 auto;
      max-height: none;
    }
    .app.sidebar-collapsed .nav-item .ico {
      width: 32px; height: 32px; min-width: 32px; min-height: 32px;
      border-radius: 9px;
    }
    .app.sidebar-collapsed .nav-item .ico svg {
      width: 17px; height: 17px; min-width: 17px; min-height: 17px;
      stroke-width: 2.15;
    }

    /* Main workspace */
    .workspace { display: grid; grid-template-rows: 52px 1fr; min-width: 0; min-height: 0; }
    .topbar {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 0 16px; border-bottom: 1px solid var(--border); background: var(--bg);
      min-height: 52px; flex-wrap: nowrap; overflow: hidden;
    }
    .crumb {
      display: flex; align-items: center; gap: 8px; color: var(--text-secondary);
      min-width: 0; flex: 1; overflow: hidden; white-space: nowrap;
    }
    .crumb strong { color: var(--text); font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
    .top-actions {
      display: flex; gap: 8px; align-items: center; flex-shrink: 0; flex-wrap: nowrap;
    }
    .badge {
      font-size: 11px; color: var(--text-secondary); border: 1px solid var(--border);
      background: var(--bg-elevated); border-radius: 999px; padding: 3px 8px;
      white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis;
    }
    .split {
      display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
      min-height: 0; height: 100%;
    }
    .pane {
      min-height: 0; overflow: auto; background: var(--bg-panel);
      -webkit-overflow-scrolling: touch;
    }
    .pane-detail {
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .pane-detail > .pane-head { flex-shrink: 0; }
    .pane-detail > .pane-body {
      flex: 1; min-height: 0; overflow: auto;
      display: flex; flex-direction: column;
    }
    .pane-detail:has(#view-docs-chat.active) > .pane-body { overflow: hidden; }
    .pane-head {
      position: sticky; top: 0; z-index: 2;
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
      padding: 16px 18px; background: rgba(22,22,24,0.96);
      border-bottom: 1px solid var(--border-soft);
    }
    .pane-title { font-size: 15px; font-weight: 650; }
    .pane-desc { color: var(--text-secondary); margin-top: 4px; font-size: 13px; max-width: 62ch; }
    .pane-body { padding: 16px 18px calc(20px + var(--safe-bottom)); display: flex; flex-direction: column; gap: 16px; }
    .pane-results .pane-body { padding-bottom: calc(28px + var(--safe-bottom)); }

    .stats {
      display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px;
    }
    .stat {
      background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px;
    }
    .stat .k { color: var(--text-muted); font-size: 11px; margin-bottom: 6px; }
    .stat .v { font-size: 18px; font-weight: 650; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
    .stat .v.ok { color: var(--success); }
    .stat .v.warn { color: var(--warning); }
    .stat .v.bad { color: var(--danger); }

    .card {
      background: var(--bg-elevated); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 16px 18px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .card h3 { font-size: 13px; font-weight: 650; margin-bottom: 12px; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .row.actions { margin-top: 12px; }
    .card > h3 + .row.actions { margin-top: 0; margin-bottom: 12px; }
    .stack { display: flex; flex-direction: column; gap: 12px; }
    .field { margin-top: 0; }
    .field + .field { margin-top: 4px; }
    .field.label-gap { margin-top: 12px; }
    .field label { display: block; color: var(--text-muted); font-size: 11px; margin-bottom: 6px; }
    .field input, .field select, .field textarea {
      width: 100%; background: var(--bg); border: 1px solid var(--border);
      border-radius: 8px; padding: 10px 12px; outline: none; min-height: 40px;
    }
    .field input:focus, .field select:focus, .field textarea:focus { border-color: var(--accent-border); }
    .field textarea { min-height: 90px; font-family: var(--mono); font-size: 12px; resize: vertical; }

    .btn {
      border: 1px solid var(--border); background: var(--bg-hover); color: var(--text);
      border-radius: 8px; padding: 8px 12px; cursor: pointer;
      transition: background .12s ease, border-color .12s ease;
      white-space: nowrap; flex-shrink: 0;
      min-height: 36px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .btn:hover { background: var(--bg-active); }
    .btn.primary, .btn.active { background: var(--accent); border-color: transparent; color: #fff; font-weight: 600; }
    .btn.primary:hover, .btn.active:hover { filter: brightness(1.06); }
    .btn.danger.active {
      background: rgba(240,113,120,0.28); border-color: rgba(240,113,120,0.55); color: #ffd0d3; font-weight: 600;
    }
    .btn.ghost { background: transparent; }
    .btn.sm { padding: 6px 10px; font-size: 12px; min-height: 32px; }
    .btn.danger { background: rgba(240,113,120,0.12); border-color: rgba(240,113,120,0.35); color: #ffb4b8; }
    .btn:disabled, .btn[aria-disabled="true"] {
      opacity: 0.45; cursor: not-allowed; filter: none;
      pointer-events: none;
    }

    table { width: 100%; border-collapse: collapse; font-size: 12.5px; min-width: 480px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border-soft); vertical-align: top; }
    th { color: var(--text-muted); font-weight: 600; font-size: 11px; }
    .muted { color: var(--text-muted); }
    .pill {
      display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 11px;
      border: 1px solid var(--border); background: var(--bg); color: var(--text-secondary);
    }
    .pill.ok { color: var(--success); border-color: rgba(61,214,140,0.35); background: rgba(61,214,140,0.08); }
    .pill.warn { color: var(--warning); border-color: rgba(245,165,36,0.35); background: rgba(245,165,36,0.08); }
    .pill.bad { color: var(--danger); border-color: rgba(240,113,120,0.35); background: rgba(240,113,120,0.08); }
    .method {
      font-family: var(--mono); font-size: 11px; color: var(--accent);
      background: var(--accent-soft); border-radius: 5px; padding: 2px 6px;
    }

    .console {
      background: #0a0a0b; border: 1px solid var(--border); border-radius: var(--radius);
      padding: 14px; min-height: 140px; max-height: 36vh; overflow: auto;
      font-family: var(--mono); font-size: 12px;
      -webkit-overflow-scrolling: touch;
    }
    .console-entry { padding: 5px 0; color: #c6c6ce; border-bottom: 1px solid #17171a; }
    .console-time { color: var(--text-muted); margin-right: 6px; }
    .result-box {
      background: #0a0a0b; border: 1px solid var(--border); border-radius: var(--radius);
      padding: 14px; min-height: 100px; max-height: 42vh; overflow: auto;
      font-family: var(--mono); font-size: 12px; white-space: pre-wrap; color: #d4d4dc;
      -webkit-overflow-scrolling: touch;
      word-break: break-word;
    }
    .result-box.is-loading { opacity: 0.7; border-color: var(--accent-border); }
    .result-box.is-error { border-color: rgba(240,113,120,0.45); color: #ffb4b8; }
    .result-box.is-empty { color: var(--text-muted); }
    .results-toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .status-pill {
      font-size: 11px; border-radius: 999px; padding: 3px 8px;
      border: 1px solid var(--border); color: var(--text-secondary); background: var(--bg-elevated);
      white-space: nowrap;
    }
    .status-pill.loading { color: #9ec1ff; border-color: var(--accent-border); }
    .status-pill.ok { color: var(--success); border-color: rgba(61,214,140,0.35); }
    .status-pill.err { color: var(--danger); border-color: rgba(240,113,120,0.35); }
    .sse-dot {
      width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); display: inline-block;
    }
    .sse-dot.live { background: var(--success); box-shadow: 0 0 0 3px rgba(61,214,140,0.18); }
    .view { display: none; }
    .view.active { display: flex; flex-direction: column; gap: 16px; }
    .guide-item { margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid var(--border-soft); }
    .guide-item:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
    .guide-item h4 { margin-bottom: 6px; }
    .guide-search {
      width: 100%; margin: 0 0 14px; padding: 10px 12px;
      background: var(--bg); border: 1px solid var(--border);
      border-radius: 8px; color: var(--text-secondary); outline: none; min-height: 40px;
    }
    .guide-search:focus { border-color: var(--accent-border); }

    /* Tool Lab — full CLI catalog */
    .lab-card { gap: 12px; }
    .lab-head {
      display: flex; flex-wrap: wrap; gap: 12px 16px;
      align-items: flex-start; justify-content: space-between;
    }
    .lab-head > div { flex: 1 1 240px; min-width: 0; }
    .lab-search { flex: 1 1 220px; max-width: 360px; margin: 0; }
    .lab-legend {
      display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center;
      font-size: 12px; padding-bottom: 4px;
    }
    .lab-catalog { display: flex; flex-direction: column; gap: 18px; }
    .lab-group-title {
      margin: 0 0 8px; font-size: 12px; letter-spacing: 0.04em;
      text-transform: uppercase; color: var(--text-muted); font-weight: 600;
    }
    .lab-list { display: flex; flex-direction: column; gap: 6px; }
    .lab-row {
      display: flex; gap: 12px; align-items: center; justify-content: space-between;
      padding: 10px 12px; border: 1px solid var(--border-soft); border-radius: 10px;
      background: color-mix(in srgb, var(--bg) 70%, transparent);
    }
    .lab-row:hover { border-color: var(--accent-border); }
    .lab-meta { min-width: 0; flex: 1; }
    .lab-title { font-weight: 600; font-size: 13px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .lab-sum { font-size: 12px; margin-top: 2px; }
    .lab-cli { font-size: 11px; margin-top: 4px; word-break: break-word; }
    .lab-cli code { font-size: 11px; }
    .lab-hint { font-size: 11px; margin-top: 6px; line-height: 1.4; }
    .lab-hint code { font-size: 11px; }
    .twin-evidence { margin-top: 12px; }
    .twin-evidence-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .twin-evidence-table th, .twin-evidence-table td {
      text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border-soft);
    }
    .lab-group.lab-hidden, .lab-row.lab-hidden { display: none; }
    .btn.sm { padding: 6px 10px; font-size: 12px; min-height: 32px; }
    .btn.danger { background: rgba(240,113,120,0.12); border-color: rgba(240,113,120,0.35); color: var(--danger); }
    .btn.danger:hover { background: rgba(240,113,120,0.2); }

    /* Docs Chat — Cursor-like: answers scroll above, composer docked below */
    #view-docs-chat.view.active {
      flex: 1; min-height: 0; height: 100%; gap: 0;
    }
    .docs-chat-shell {
      flex: 1; min-height: 0; display: flex; flex-direction: column;
      padding: 0; overflow: hidden;
    }
    .docs-chat-top {
      flex-shrink: 0; padding: 8px 14px;
      border-bottom: 1px solid var(--border-soft);
    }
    .docs-chat-links { margin: 0; }
    .docs-chat-links.row.actions { margin-top: 0; }
    .docs-chat-thread {
      flex: 1; min-height: 0; overflow: auto; padding: 16px 18px;
      -webkit-overflow-scrolling: touch;
    }
    .docs-chat-empty {
      color: var(--text-muted); font-size: 13px; line-height: 1.45;
      padding: 28px 12px; text-align: center;
      border: 1px dashed var(--border); border-radius: 12px;
    }
    .docs-chat-empty[hidden] { display: none !important; }
    .docs-chat-dock {
      flex-shrink: 0; padding: 12px 18px calc(14px + var(--safe-bottom));
      border-top: 1px solid var(--border-soft);
      background: rgba(18, 18, 20, 0.96);
    }
    .docs-composer {
      padding: 4px 2px;
      border: 1px solid var(--border); border-radius: 12px;
      background: var(--bg); box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
    }
    .docs-composer-input {
      width: 100%; min-height: 52px; max-height: 160px;
      padding: 12px 14px; margin: 0; border: none; border-radius: 12px;
      background: transparent; color: var(--text); outline: none; resize: none;
      font: inherit; font-size: 14px; line-height: 1.45;
      overflow-y: hidden; field-sizing: content;
    }
    .docs-composer-input:focus { outline: none; }
    .docs-composer-input::placeholder { color: var(--text-muted); }
    .docs-composer:focus-within {
      border-color: var(--accent-border);
      box-shadow: 0 0 0 1px rgba(59,130,246,0.18);
    }
    .docs-composer-actions {
      display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; align-items: center;
      margin-top: 10px;
    }
    .btn-ico {
      display: inline-grid; place-items: center; width: 16px; height: 16px; flex-shrink: 0;
    }
    .btn-ico svg { width: 16px; height: 16px; display: block; }
    .btn .btn-ico { margin-inline-end: 6px; }
    .docs-chat-answer {
      margin: 0; white-space: pre-wrap; font-size: 13px; line-height: 1.45;
      padding: 14px 16px; border-radius: 12px;
      background: var(--bg); border: 1px solid var(--border-soft);
      color: var(--text-secondary);
    }
    .docs-chat-answer:empty { display: none; }
    .docs-chat-answer.is-empty-match {
      border-color: rgba(245, 165, 36, 0.35);
      background: rgba(245, 165, 36, 0.08);
      color: #f5d08a;
    }
    .export-preview-body {
      margin-top: 12px; max-height: min(42vh, 360px); overflow: auto;
      padding: 12px 14px; border-radius: 10px;
      background: #0a0a0b; border: 1px solid var(--border);
      color: #c6c6ce; font-family: var(--mono); font-size: 12px; line-height: 1.45;
      white-space: pre-wrap; word-break: break-word;
    }
    .lead { margin-bottom: 14px; color: var(--text-secondary); line-height: 1.55; }
    .code-line {
      margin-top: 8px; background: #0a0a0b; border: 1px solid var(--border); border-radius: 8px;
      padding: 10px 12px; font-family: var(--mono); font-size: 12px; color: #9ec1ff; position: relative;
      overflow-x: auto; -webkit-overflow-scrolling: touch; white-space: nowrap;
    }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .icon-btn {
      border: 1px solid var(--border); background: var(--bg-elevated); color: var(--text-secondary);
      border-radius: 8px; width: var(--tap); height: var(--tap); min-width: var(--tap); min-height: var(--tap);
      cursor: pointer; display: inline-grid; place-items: center; flex-shrink: 0; padding: 0;
    }
    .icon-btn:hover { background: var(--bg-hover); color: var(--text); border-color: var(--accent-border); }
    .icon-btn svg { width: 16px; height: 16px; min-width: 16px; min-height: 16px; display: block; }
    .icon-btn[aria-pressed="true"] {
      background: var(--accent-soft); border-color: var(--accent-border); color: #e8efff;
    }
    /* Toggle results: hide output pane and let the detail pane fill the workspace */
    .split.results-collapsed {
      grid-template-columns: 1fr;
      grid-template-rows: minmax(0, 1fr);
    }
    .split.results-collapsed .pane-results { display: none; }
    .split.results-collapsed .pane-detail {
      border-right: none;
      border-bottom: none;
    }

    /* Tablet: stack panes, keep readable sidebar */
    @media (max-width: 1100px) {
      .split { grid-template-columns: 1fr; grid-template-rows: minmax(0, 1fr) minmax(220px, 38vh); }
      .split.results-collapsed { grid-template-rows: minmax(0, 1fr); }
      .pane-detail { border-right: none; border-bottom: 1px solid var(--border); }
      .split.results-collapsed .pane-detail { border-bottom: none; }
      .pane-results { border-top: none; max-height: none; }
      .stats { grid-template-columns: repeat(2, 1fr); }
      .grid-2 { grid-template-columns: 1fr; }
      .topbar { padding: 0 12px; gap: 8px; }
      .top-actions .badge { display: none; }
      .crumb .muted { display: none; }
      .console, .result-box { max-height: 28vh; }
    }

    /* Compact: icon rail (labels via tooltips) */
    @media (max-width: 900px) {
      .app { grid-template-columns: var(--sidebar-rail) 1fr; }
      .brand-text, .nav-label, .nav-item .label, .nav-item .count, .sidebar-foot, .sidebar-search, .sq-label { display: none !important; }
      .brand { justify-content: center; padding: 12px 6px; min-height: 56px; }
      .nav { padding: 8px 6px calc(12px + var(--safe-bottom)); overflow-x: hidden; overflow-y: auto; gap: 2px; }
      .nav-group-items, .nav-group.is-open > .nav-group-items { display: flex !important; gap: 2px; }
      .nav-item {
        justify-content: center; padding: 6px; gap: 0;
        min-height: var(--tap); height: var(--tap); flex: 0 0 auto; max-height: none;
      }
      .nav-item .ico { width: 32px; height: 32px; min-width: 32px; min-height: 32px; }
      .desktop-only { display: none !important; }
      .sidebar-quick { padding: 8px 6px; }
      .sq-btn { justify-content: center; padding: 6px; gap: 0; }
      .pane-body { padding: 12px 14px calc(16px + var(--safe-bottom)); gap: 12px; }
      .pane-head { padding: 12px 14px; }
      .btn { min-height: var(--tap); padding: 10px 14px; }
      .btn.sm { min-height: 36px; }
    }

    /* Phone: drawer sidebar over content */
    @media (max-width: 720px) {
      .app,
      .app.sidebar-collapsed,
      .app:not(.sidebar-collapsed) {
        grid-template-columns: 1fr;
      }
      .sidebar {
        position: fixed;
        top: 0; left: 0; bottom: 0;
        width: min(292px, 88vw);
        transform: translateX(-105%);
        transition: transform .2s ease;
        border-right: 1px solid var(--border);
        box-shadow: none;
        padding-top: var(--safe-top);
      }
      .app:not(.sidebar-collapsed) .sidebar {
        transform: translateX(0);
        box-shadow: 12px 0 40px rgba(0,0,0,.5);
      }
      /* Restore labels inside mobile drawer when open */
      .app:not(.sidebar-collapsed) .brand-text,
      .app:not(.sidebar-collapsed) .nav-label,
      .app:not(.sidebar-collapsed) .nav-item .label,
      .app:not(.sidebar-collapsed) .nav-item .count,
      .app:not(.sidebar-collapsed) .sidebar-search,
      .app:not(.sidebar-collapsed) .sidebar-foot,
      .app:not(.sidebar-collapsed) .sq-label {
        display: flex !important;
      }
      .app:not(.sidebar-collapsed) .sidebar-search { display: block !important; }
      .app:not(.sidebar-collapsed) .nav-item {
        justify-content: flex-start;
        padding: 8px 10px;
        gap: 10px;
        height: auto;
        min-height: var(--tap);
      }
      .app:not(.sidebar-collapsed) .nav-label { display: flex !important; }
      .app:not(.sidebar-collapsed) .nav-group-items {
        display: none;
      }
      .app:not(.sidebar-collapsed) .nav-group.is-open > .nav-group-items {
        display: flex !important;
      }
      .app:not(.sidebar-collapsed) .sidebar-quick {
        padding: 10px 10px 8px;
      }
      .app:not(.sidebar-collapsed) .sq-btn {
        justify-content: flex-start;
        padding: 8px 10px;
        gap: 10px;
      }

      .stats { grid-template-columns: 1fr 1fr; gap: 8px; }
      .stat { padding: 10px 12px; }
      .stat .v { font-size: 16px; }
      .split { grid-template-rows: minmax(0, 1fr) minmax(180px, 34vh); }
      .split.results-collapsed { grid-template-rows: minmax(0, 1fr); }
      .desktop-only { display: none !important; }
      .workspace { grid-template-rows: 48px 1fr; }
      .topbar { min-height: 48px; padding: 0 10px; }
      .code-line { font-size: 11px; }
      table { min-width: 420px; }
      #toast-host { left: 12px; right: 12px; max-width: none; }
    }

    @media (max-width: 420px) {
      .stats { grid-template-columns: 1fr; }
      .badge { max-width: 96px; }
    }

    @media print {
      .sidebar, .sidebar-backdrop, .top-actions, .pane-results,
      #toast-host, .docs-chat-dock, .results-toolbar { display: none !important; }
      .app, .app.sidebar-collapsed { grid-template-columns: 1fr; height: auto; overflow: visible; }
      .workspace { grid-template-rows: auto 1fr; }
      .split { display: block; height: auto; }
      .pane, .pane-detail { overflow: visible; border: none; }
      body { overflow: visible; background: #fff; color: #111; }
      .card, .stat, .docs-chat-answer { break-inside: avoid; }
    }
`;
}
