export type { DashboardUiData } from './dashboard-ui/helpers.js';
import {
  type DashboardUiData,
  sparkline,
  esc,
  escAttr,
  coverageClass,
  sevClass
} from './dashboard-ui/helpers.js';
import { navIco, btnIco } from './dashboard-ui/nav-icons.js';
import { dashboardStyles } from './dashboard-ui/styles.js';
import { dashboardClientScript } from './dashboard-ui/client-script.js';
import { resolveAiPresence } from './ai-link.js';

export function renderDashboardHtml(data: DashboardUiData): string {
  const { profile, heatmap, runs, secAudit, perfAudit, quarantined, history } = data;
  const apis = profile.apiEndpoints || [];
  const frameworks = (profile.frameworks || ['Node.js']).join(', ');
  const runners = (profile.testFrameworks || ['none']).join(', ');
  // Cache-bust brand SVGs so dashboard picks up docs/assets updates immediately
  const brandV = '20260917';
  const aiPresence = resolveAiPresence(process.cwd());
  const aiBootstrap = {
    hasAi: aiPresence.hasAi,
    summary: aiPresence.summary,
    editors: aiPresence.editors.map((e) => e.label)
  };

  const heatmapRows = heatmap.items
    .map(
      (item) =>
        `<tr><td><code>${esc(item.id)}</code></td><td>${esc(item.title)}</td><td><span class="pill ${coverageClass(item.coverageLevel)}">${esc(item.coverageLevel)}</span></td><td class="muted">${item.associatedTestsCount ?? 0} tests · ${item.passRate ?? 0}% pass</td></tr>`
    )
    .join('');

  const runRows = runs
    .slice(0, 20)
    .map(
      (r) =>
        `<tr><td><code>${esc(r.runId)}</code></td><td><span class="pill ${r.status === 'passed' ? 'ok' : r.status === 'failed' ? 'bad' : 'warn'}">${esc(r.status)}</span></td><td>${r.summary ? `${r.summary.passed}/${r.summary.total}` : '—'}</td><td class="muted">${r.summary?.durationMs != null ? r.summary.durationMs + 'ms' : '—'}</td></tr>`
    )
    .join('');

  const secRows = (secAudit.findings || [])
    .slice(0, 30)
    .map(
      (f) =>
        `<tr><td><span class="pill ${sevClass(f.severity)}">${esc(f.severity)}</span></td><td>${esc(f.title)}</td><td class="muted">${esc(f.packageName || '—')}</td></tr>`
    )
    .join('');

  const perfRows = (perfAudit.routes || [])
    .slice(0, 30)
    .map(
      (r) =>
        `<tr><td><code>${esc(r.path)}</code></td><td>${r.lcp != null ? r.lcp + 'ms' : '—'}</td><td>${r.cls != null ? r.cls : '—'}</td><td><span class="pill ${r.rating === 'good' ? 'ok' : 'warn'}">${esc(r.rating || 'n/a')}</span></td></tr>`
    )
    .join('');

  const apiRows = apis
    .map(
      (ep) =>
        `<tr><td><span class="method">${esc(ep.method)}</span></td><td><code>${esc(ep.path)}</code></td><td><button class="btn ghost sm" onclick="loadApiIntoClient('${escAttr(ep.method)}','${escAttr(ep.path)}'); selectNav('client')">Open in Client</button></td></tr>`
    )
    .join('');

  const quarantineRows = quarantined
    .map(
      (q) =>
        `<tr><td>${esc(q.testTitle)}</td><td class="muted">${esc(q.reason || 'flaky')}</td><td>${q.flakinessRate != null ? Math.round(q.flakinessRate * 100) + '%' : '—'}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VeloProve — Command Center</title>
  <link rel="icon" type="image/svg+xml" href="/icon.svg?v=${brandV}" />
  <style>${dashboardStyles()}</style>
</head>
<body>
  <div class="app sidebar-collapsed">
    <button type="button" class="sidebar-backdrop" id="sidebarBackdrop" aria-label="Close navigation" onclick="closeMobileNav()"></button>
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark"><img src="/icon.svg?v=${brandV}" alt="VeloProve" width="28" height="28" /></div>
        <div class="brand-text">
          <div class="brand-name">VeloProve</div>
          <div class="brand-sub">Command Center</div>
        </div>
      </div>
      <input class="sidebar-search" id="navSearch" placeholder="Filter tools…" oninput="filterNav(this.value)" aria-label="Filter sidebar tools" />
      <nav class="nav" id="sidebarNav" aria-label="VeloProve tools">
        <div class="nav-group is-open" data-group="start">
          <button type="button" class="nav-label" aria-expanded="true" onclick="toggleNavGroup(this)">Start<span class="nav-chevron" aria-hidden="true"></span></button>
          <div class="nav-group-items">
            <button class="nav-item active" data-view="overview" data-tip="Overview" aria-label="Overview" onclick="selectNav('overview')">${navIco('home', 'blue')}<span class="label">Overview</span></button>
            <button class="nav-item" data-view="doctor" data-tip="Doctor — environment health" aria-label="Doctor" onclick="selectNav('doctor')">${navIco('stethoscope', 'teal')}<span class="label">Doctor</span></button>
            <button class="nav-item" data-view="ensure-dev" data-tip="Ensure Dev — start local app" aria-label="Ensure Dev" onclick="selectNav('ensure-dev')">${navIco('zap', 'amber')}<span class="label">Ensure Dev</span></button>
            <button class="nav-item" data-view="teach-ai" data-tip="Teach AI — AGENTS.md + MCP" aria-label="Teach AI" onclick="selectNav('teach-ai')">${navIco('book', 'sky')}<span class="label">Teach AI</span></button>
          </div>
        </div>
        <div class="nav-group is-open" data-group="verify">
          <button type="button" class="nav-label" aria-expanded="true" onclick="toggleNavGroup(this)">Verify<span class="nav-chevron" aria-hidden="true"></span></button>
          <div class="nav-group-items">
            <button class="nav-item" data-view="verify" data-tip="Verify — change-aware QA" aria-label="Verify" onclick="selectNav('verify')">${navIco('shieldCheck', 'green')}<span class="label">Verify</span></button>
            <button class="nav-item" data-view="explore" data-tip="Explore live routes" aria-label="Explore" onclick="selectNav('explore')">${navIco('compass', 'sky')}<span class="label">Explore</span></button>
            <button class="nav-item" data-view="plan" data-tip="Plan & Generate tests" aria-label="Plan & Generate" onclick="selectNav('plan')">${navIco('listPlus', 'sky')}<span class="label">Plan & Generate</span></button>
            <button class="nav-item" data-view="runner" data-tip="Test Runner" aria-label="Test Runner" onclick="selectNav('runner')">${navIco('play', 'lime')}<span class="label">Test Runner</span></button>
            <button class="nav-item" data-view="release" data-tip="Release confidence gate" aria-label="Release Gate" onclick="selectNav('release')">${navIco('checkCircle', 'green')}<span class="label">Release Gate</span></button>
          </div>
        </div>
        <div class="nav-group" data-group="repair">
          <button type="button" class="nav-label" aria-expanded="false" onclick="toggleNavGroup(this)">Repair<span class="nav-chevron" aria-hidden="true"></span></button>
          <div class="nav-group-items">
            <button class="nav-item" data-view="heal" data-tip="Heal locators & auto-fix" aria-label="Heal & Fix" onclick="selectNav('heal')">${navIco('wrench', 'sky')}<span class="label">Heal & Fix</span></button>
            <button class="nav-item" data-view="quarantine" data-tip="Flaky Quarantine" aria-label="Flaky Quarantine" onclick="selectNav('quarantine')">${navIco('ban', 'amber')}<span class="label">Flaky Quarantine</span><span class="count">${quarantined.length}</span></button>
            <button class="nav-item" data-view="dedup" data-tip="Deduplicate overlapping tests" aria-label="Dedup Tests" onclick="selectNav('dedup')">${navIco('copy', 'blue')}<span class="label">Dedup Tests</span></button>
            <button class="nav-item" data-view="recorder" data-tip="Scenario Recorder" aria-label="Scenario Recorder" onclick="selectNav('recorder')">${navIco('record', 'coral')}<span class="label">Scenario Recorder</span></button>
            <button class="nav-item" data-view="bisect" data-tip="Git Bisect regression hunt" aria-label="Git Bisect" onclick="selectNav('bisect')">${navIco('gitBranch', 'orange')}<span class="label">Git Bisect</span></button>
          </div>
        </div>
        <div class="nav-group" data-group="results">
          <button type="button" class="nav-label" aria-expanded="false" onclick="toggleNavGroup(this)">Results<span class="nav-chevron" aria-hidden="true"></span></button>
          <div class="nav-group-items">
            <button class="nav-item" data-view="heatmap" data-tip="Requirements coverage" aria-label="Coverage Heatmap" onclick="selectNav('heatmap')">${navIco('grid', 'green')}<span class="label">Coverage</span><span class="count">${heatmap.items.length}</span></button>
            <button class="nav-item" data-view="runs" data-tip="Test run history" aria-label="Test Runs" onclick="selectNav('runs')">${navIco('history', 'teal')}<span class="label">Test Runs</span><span class="count">${runs.length}</span></button>
            <button class="nav-item" data-view="report" data-tip="Export executive report" aria-label="Export Report" onclick="selectNav('report')">${navIco('report', 'teal')}<span class="label">Export Report</span></button>
          </div>
        </div>
        <div class="nav-group" data-group="api">
          <button type="button" class="nav-label" aria-expanded="false" onclick="toggleNavGroup(this)">API<span class="nav-chevron" aria-hidden="true"></span></button>
          <div class="nav-group-items">
            <button class="nav-item" data-view="client" data-tip="HTTP Client / API Studio" aria-label="HTTP Client" onclick="selectNav('client')">${navIco('exchange', 'sky')}<span class="label">HTTP Client</span></button>
            <button class="nav-item" data-view="apis" data-tip="Discovered APIs" aria-label="Discovered APIs" onclick="selectNav('apis')">${navIco('api', 'blue')}<span class="label">Discovered APIs</span><span class="count">${apis.length}</span></button>
            <button class="nav-item" data-view="load" data-tip="Load & stress testing" aria-label="Load Testing" onclick="selectNav('load')">${navIco('zap', 'amber')}<span class="label">Load Testing</span></button>
            <button class="nav-item" data-view="mockdata" data-tip="Mock data factory" aria-label="Mock Data" onclick="selectNav('mockdata')">${navIco('layers', 'teal')}<span class="label">Mock Data</span></button>
          </div>
        </div>
        <div class="nav-group" data-group="security">
          <button type="button" class="nav-label" aria-expanded="false" onclick="toggleNavGroup(this)">Security<span class="nav-chevron" aria-hidden="true"></span></button>
          <div class="nav-group-items">
            <button class="nav-item" data-view="security" data-tip="Live non-destructive security suite" aria-label="Security Suite" onclick="selectNav('security')">${navIco('sword', 'rose')}<span class="label">Security Suite</span></button>
            <button class="nav-item" data-view="sec" data-tip="CVE & secrets audit" aria-label="CVE & Secrets" onclick="selectNav('sec')">${navIco('shield', 'coral')}<span class="label">CVE & Secrets</span><span class="count">${secAudit.totalVulnerabilities}</span></button>
            <button class="nav-item" data-view="websec" data-tip="SRI / CSRF / CORS" aria-label="SRI / CSRF / CORS" onclick="selectNav('websec')">${navIco('link', 'orange')}<span class="label">SRI / CSRF / CORS</span></button>
            <button class="nav-item" data-view="owasp" data-tip="OWASP header scan" aria-label="OWASP Scan" onclick="selectNav('owasp')">${navIco('radar', 'amber')}<span class="label">OWASP Scan</span></button>
            <button class="nav-item" data-view="malware" data-tip="Malware & backdoor scan" aria-label="Malware Scan" onclick="selectNav('malware')">${navIco('bug', 'coral')}<span class="label">Malware Scan</span></button>
            <button class="nav-item" data-view="remote" data-tip="Remote companion bridge" aria-label="Remote Bridge" onclick="selectNav('remote')">${navIco('cloud', 'sky')}<span class="label">Remote Bridge</span></button>
          </div>
        </div>
        <div class="nav-group" data-group="experience">
          <button type="button" class="nav-label" aria-expanded="false" onclick="toggleNavGroup(this)">Experience<span class="nav-chevron" aria-hidden="true"></span></button>
          <div class="nav-group-items">
            <button class="nav-item" data-view="a11y" data-tip="Accessibility WCAG" aria-label="Accessibility" onclick="selectNav('a11y')">${navIco('a11y', 'lime')}<span class="label">Accessibility</span></button>
            <button class="nav-item" data-view="screenreader" data-tip="Screen reader simulation" aria-label="Screen Reader" onclick="selectNav('screenreader')">${navIco('volume', 'teal')}<span class="label">Screen Reader</span></button>
            <button class="nav-item" data-view="perf" data-tip="Core Web Vitals" aria-label="Web Vitals" onclick="selectNav('perf')">${navIco('activity', 'lime')}<span class="label">Web Vitals</span></button>
            <button class="nav-item" data-view="throttle" data-tip="Network throttle" aria-label="Network Throttle" onclick="selectNav('throttle')">${navIco('signal', 'amber')}<span class="label">Network Throttle</span></button>
            <button class="nav-item" data-view="arch" data-tip="Architecture graph" aria-label="Architecture" onclick="selectNav('arch')">${navIco('share', 'blue')}<span class="label">Architecture</span></button>
          </div>
        </div>
        <div class="nav-group" data-group="more">
          <button type="button" class="nav-label" aria-expanded="false" onclick="toggleNavGroup(this)">More<span class="nav-chevron" aria-hidden="true"></span></button>
          <div class="nav-group-items">
            <button class="nav-item" data-view="lab" data-tip="Advanced tool lab" aria-label="Tool Lab" onclick="selectNav('lab')">${navIco('layers', 'slate')}<span class="label">Tool Lab</span></button>
            <button class="nav-item" data-view="guide" data-tip="Interactive guide" aria-label="Guide" onclick="selectNav('guide')">${navIco('book', 'sky')}<span class="label">Guide</span></button>
            <button class="nav-item" data-view="about" data-tip="About VeloProve" aria-label="About" onclick="selectNav('about')">${navIco('info', 'slate')}<span class="label">About</span></button>
          </div>
        </div>
      </nav>
      <div class="sidebar-quick" aria-label="Docs Chat">
        <button type="button" class="sq-btn" data-quick="docs-chat" data-tip="Docs Chat — local packaged docs Q&A" aria-label="Docs Chat" onclick="selectNav('docs-chat')">
          ${navIco('message', 'sky')}<span class="sq-label">Docs Chat</span>
        </button>
      </div>
      <div class="sidebar-foot"><span>v1.0.0</span><span>Local-first</span></div>
    </aside>

    <main class="workspace">
      <header class="topbar">
        <div class="crumb"><span class="muted">Workspace</span><span>/</span><strong id="crumbTitle">Overview</strong></div>
        <div class="top-actions">
          <button class="icon-btn" data-tip="Toggle sidebar (Ctrl+[)" aria-label="Toggle sidebar" onclick="toggleSidebar()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg></button>
          <button class="icon-btn" data-tip="Toggle results (Ctrl+])" aria-label="Toggle results" aria-pressed="false" onclick="toggleResults()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h11a1 1 0 0 1 1v14a1 1 0 0 1-1 1H8"/><path d="M5 4v16"/><path d="M11 9h6M11 13h4"/></svg></button>
          <span class="badge desktop-only" data-tip="${escAttr(profile.projectName || 'ActiveProject')}">${esc(profile.projectName || 'ActiveProject')}</span>
          <span class="badge desktop-only" data-tip="${escAttr(frameworks)}">${esc(frameworks)}</span>
        </div>
      </header>

      <div class="split">
        <section class="pane pane-detail">
          <div class="pane-head">
            <div>
              <div class="pane-title" id="detailTitle">Project Overview</div>
              <div class="pane-desc" id="detailDesc">Stack discovery, health summary, and quick actions for this workspace.</div>
            </div>
          </div>
          <div class="pane-body">
            <!-- Overview -->
            <div class="view active" id="view-overview">
              <div class="stats">
                <div class="stat"><div class="k">Coverage</div><div class="v">${heatmap.overallCoverageScore}%</div></div>
                <div class="stat"><div class="k">Security</div><div class="v ${secAudit.score >= 80 ? 'ok' : secAudit.score >= 50 ? 'warn' : 'bad'}">${secAudit.score}/100</div></div>
                <div class="stat"><div class="k">Performance</div><div class="v">${perfAudit.overallScore}/100</div></div>
                <div class="stat"><div class="k">Test Runs</div><div class="v">${runs.length}</div></div>
              </div>
              <div class="card">
                <h3>Detected Stack</h3>
                <div class="stack">
                  <div><span class="muted">Frameworks</span> · ${esc(frameworks)}</div>
                  <div><span class="muted">Runners</span> · ${esc(runners)}</div>
                  <div><span class="muted">Package manager</span> · ${esc(profile.packageManager || 'npm')}</div>
                  <div><span class="muted">Routes / APIs</span> · ${(profile.routes || []).length} / ${apis.length}</div>
                </div>
              </div>
              <div class="card">
                <h3>Quick Actions</h3>
                <div class="row actions wrap">
                  <button type="button" class="btn primary" onclick="selectNav('verify')">Verify</button>
                  <button type="button" class="btn" onclick="selectNav('doctor')">Doctor</button>
                  <button type="button" class="btn" onclick="selectNav('teach-ai')">Teach AI</button>
                  <button type="button" class="btn" onclick="selectNav('docs-chat')">Docs Chat</button>
                  <button type="button" class="btn" onclick="selectNav('ensure-dev')">Ensure Dev</button>
                  <button type="button" class="btn" onclick="runAction('inspect')">Inspect</button>
                  <button type="button" class="btn" onclick="selectNav('plan')">Plan</button>
                  <button type="button" class="btn" onclick="selectNav('runner')">Test Runner</button>
                  <button type="button" class="btn" onclick="selectNav('security')">Security</button>
                  <button type="button" class="btn" onclick="selectNav('report')">Export Report</button>
                </div>
              </div>
            </div>

            <div class="view" id="view-doctor">
              <div class="card"><h3>Environment Doctor</h3><p class="muted">Runs local diagnostics for Node, runners (Vitest / Jest / Playwright / <code>node:test</code>), config, storage, and permissions.</p>
                <div class="row actions"><button class="btn primary" onclick="runAction('doctor')">Run Doctor</button></div></div>
            </div>

            <div class="view" id="view-verify">
              <div class="card"><h3>Autonomous Verify</h3><p class="muted">Change-aware pipeline: inspect → impact → targeted tests → diagnose → heal TEST_BUG → release gate. Returns structured OperationResult evidence.</p>
                <div class="row actions" data-btn-group="verify-mode" role="group" aria-label="Verify mode">
                  <button type="button" class="btn primary" data-btn="default" aria-pressed="true" onclick="runAction('verify')">Run Verify</button>
                  <button type="button" class="btn" data-btn="sandbox" aria-pressed="false" onclick="runAction('verify', '?sandbox=1')">Verify + Sandbox</button>
                  <button type="button" class="btn" data-btn="docker" aria-pressed="false" onclick="runAction('verify', '?dockerEnv=1')">Verify + Docker env</button>
                  <button type="button" class="btn" data-btn="full" aria-pressed="false" onclick="runAction('verify', '?full=1')">Verify full suite</button>
                </div>
                <p class="muted stack-md">First verify? Open <button type="button" class="btn sm" onclick="selectNav('doctor')">Doctor</button> → <button type="button" class="btn sm" onclick="selectNav('teach-ai')">Teach AI</button> → then Run Verify. On failure open <code>.veloprove/evidence/&lt;runId&gt;/</code>.</p>
              </div>
            </div>

            <div class="view" id="view-plan">
              <div class="card"><h3>Risk-Scored Planning</h3><p class="muted">Generate a prioritized plan, then materialize protected test files.</p>
                <div class="row actions" data-btn-group="plan-mode" role="group" aria-label="Plan actions">
                  <button type="button" class="btn primary" data-btn="plan" aria-pressed="true" onclick="runAction('plan')">Generate Plan</button>
                  <button type="button" class="btn" data-btn="generate" aria-pressed="false" onclick="runAction('generate')">Generate Tests</button>
                </div></div>
            </div>

            <div class="view" id="view-runner">
              <div class="card"><h3>Test Execution</h3><p class="muted">Execute full suite or change-impacted tests only. Supports Vitest, Jest, Playwright, and Node <code>node --test</code>.</p>
                <div class="row actions" data-btn-group="runner-mode" role="group" aria-label="Test runner">
                  <button type="button" class="btn primary" data-btn="run" aria-pressed="true" onclick="runAction('run')">Run All</button>
                  <button type="button" class="btn" data-btn="changed" aria-pressed="false" onclick="runAction('run-changed')">Run Changed</button>
                  <button type="button" class="btn" data-btn="diagnose" aria-pressed="false" onclick="runAction('diagnose')">Diagnose Failures</button>
                </div></div>
            </div>

            <div class="view" id="view-heatmap">
              <div class="card"><h3>Requirements Coverage</h3>
                <div class="row actions"><button class="btn" onclick="runAction('coverage')">Refresh Heatmap</button></div>
                <table><thead><tr><th>ID</th><th>Requirement</th><th>Coverage</th><th>Tests</th></tr></thead><tbody>${heatmapRows || '<tr><td colspan="4" class="muted">No requirements discovered yet.</td></tr>'}</tbody></table>
              </div>
            </div>

            <div class="view" id="view-runs">
              <div class="card"><h3>Recent Runs</h3>
                <div class="row actions">
                  <button type="button" class="btn" onclick="runAction('history')">Refresh History</button>
                </div>
                <div class="grid-2 stack">
                  <div>
                    <div class="muted">Pass rate trend</div>
                    ${sparkline(history?.charts.passRate || [], '#3dd68c')}
                    <div class="muted">Avg ${history?.aggregates.avgPassRate ?? 0}% · ${history?.aggregates.runCount ?? 0} runs${history?.aggregates.currentBranch ? ` · ${esc(history.aggregates.currentBranch)}` : ''}</div>
                  </div>
                  <div>
                    <div class="muted">Duration trend</div>
                    ${sparkline(history?.charts.durationMs || [], '#6ea8fe')}
                    <div class="muted">Avg ${history?.aggregates.avgDurationMs ?? 0}ms · flaky ${history?.aggregates.flakyCount ?? 0}${history?.aggregates.currentMttrHours != null ? ` · MTTR ${history.aggregates.currentMttrHours}h` : ''}${history?.aggregates.regressionAlert ? ' · regression alert' : ''}</div>
                  </div>
                </div>
                <table><thead><tr><th>Run</th><th>Status</th><th>Passed</th><th>Duration</th></tr></thead><tbody>${runRows || '<tr><td colspan="4" class="muted">No runs stored yet.</td></tr>'}</tbody></table>
              </div>
            </div>

            <div class="view" id="view-quarantine">
              <div class="card"><h3>Quarantined Tests</h3>
                <div class="row actions"><button class="btn" onclick="runAction('quarantine')">Refresh Quarantine</button></div>
                <table><thead><tr><th>Test</th><th>Reason</th><th>Fail rate</th></tr></thead><tbody>${quarantineRows || '<tr><td colspan="3" class="muted">No quarantined tests.</td></tr>'}</tbody></table>
              </div>
            </div>

            <div class="view" id="view-heal">
              <div class="card"><h3>Self-Heal & Auto-Fix</h3><p class="muted">Repair brittle locators and synthesize reviewable patches.</p>
                <div class="row actions" data-btn-group="heal-mode" role="group" aria-label="Heal and fix">
                  <button type="button" class="btn primary" data-btn="heal" aria-pressed="true" onclick="runAction('heal')">Heal Locators</button>
                  <button type="button" class="btn" data-btn="auto-fix" aria-pressed="false" onclick="runAction('auto-fix')">Auto-Fix Bugs</button>
                  <button type="button" class="btn" data-btn="lint" aria-pressed="false" onclick="runAction('lint')">Lint</button>
                  <button type="button" class="btn" data-btn="lint-fix" aria-pressed="false" onclick="runAction('lint-fix')">Lint --fix</button>
                </div></div>
            </div>

            <div class="view" id="view-recorder">
              <div class="card">
                <h3>Browser Scenario Recorder</h3>
                <p class="muted">Drag the bookmarklet to your bookmarks bar, or load the unpacked Chrome extension from <code>extensions/recorder</code>. Record interactions, dump JSON, then generate an accessibility-first Playwright spec.</p>
                <div class="row actions">
                  <a class="btn primary" id="recorderBookmarklet" href="#">VeloProve Record</a>
                  <button class="btn" onclick="loadRecorderBookmarklet()">Refresh Bookmarklet</button>
                </div>
                <div class="field label-gap"><label>Title</label><input id="recTitle" value="Recorded user journey" /></div>
                <div class="field"><label>Start URL</label><input id="recStartUrl" value="http://localhost:3000" /></div>
                <div class="field"><label>Recorded JSON (paste window.__vpDump() output)</label><textarea id="recPayload" rows="10" placeholder='{"title":"...","startUrl":"...","steps":[...]}'></textarea></div>
                <div class="row actions">
                  <button class="btn primary" onclick="generateRecordedScenario()">Generate Playwright Spec</button>
                </div>
              </div>
            </div>

            <div class="view" id="view-client">
              <div class="card">
                <h3>HTTP Client / API Studio</h3>
                <p class="muted">Local / Staging / Prod environments with secret masking, token chaining, and multi-step flows.</p>
                <div class="grid-2">
                  <div class="field"><label>Environment</label>
                    <select id="apiEnv" onchange="applyApiEnv()">
                      <option value="local">Local</option>
                      <option value="staging">Staging</option>
                      <option value="prod">Production</option>
                    </select>
                  </div>
                  <div class="field"><label>Base URL</label><input id="apiBaseUrl" value="http://localhost:3000" onchange="persistApiEnv()" /></div>
                </div>
                <div class="grid-2">
                  <div class="field"><label>Method</label>
                    <select id="reqMethod"><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select>
                  </div>
                  <div class="field"><label>Path / URL</label><input id="reqUrl" value="/api" /></div>
                </div>
                <div class="field label-gap"><label>Headers (JSON — secrets masked in results)</label><textarea id="reqHeaders">{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer REPLACE_ME"\n}</textarea></div>
                <div class="field"><label>Body</label><textarea id="reqBody">{\n  \n}</textarea></div>
                <div class="field"><label>Assertions (optional JSON array)</label><textarea id="reqAsserts" placeholder='[{"path":"status","equals":200}]'>[]</textarea></div>
                <div class="field"><label>Save JSONPath → var (e.g. <code>$.token → auth</code>)</label><input id="reqExtract" placeholder="$.token → auth" /></div>
                <div class="row actions">
                  <button class="btn primary" onclick="sendPostmanRequest()">Send Request</button>
                  <button class="btn" onclick="addCurrentToFlow()">Add to Flow</button>
                  <button class="btn" onclick="chainLastToken()">Use last token</button>
                  <button class="btn" onclick="runAction('export-postman')">Export Collection</button>
                </div>
              </div>
              <div class="card">
                <h3>Multi-step Flow</h3>
                <p class="muted">Ordered steps with <code>{{var}}</code> substitution. Stored in localStorage.</p>
                <div id="apiFlowList" class="stack muted">No steps yet — send a request and click Add to Flow.</div>
                <div class="row actions">
                  <button class="btn primary" onclick="runApiFlow()">Run Flow</button>
                  <button class="btn" onclick="clearApiFlow()">Clear Flow</button>
                  <button class="btn" onclick="exportApiFlowCollection()">Export Flow as Postman JSON</button>
                </div>
              </div>
            </div>

            <div class="view" id="view-apis">
              <div class="card"><h3>Discovered Endpoints</h3>
                <p class="muted">Generate MSW handlers preferring OpenAPI <code>example</code> / schema samples when available.</p>
                <div class="row actions" style="margin-bottom:12px">
                  <button class="btn primary" onclick="runAction('mock-gen')">Generate MSW from OpenAPI / APIs</button>
                </div>
                <table><thead><tr><th>Method</th><th>Path</th><th></th></tr></thead><tbody>${apiRows || '<tr><td colspan="3" class="muted">No API endpoints discovered.</td></tr>'}</tbody></table>
              </div>
            </div>

            <div class="view" id="view-load">
              <div class="card"><h3>Load & Stress</h3>
                <div class="grid-2">
                  <div class="field"><label>Method</label><select id="loadMethod"><option>GET</option><option>POST</option></select></div>
                  <div class="field"><label>URL</label><input id="loadUrl" value="http://localhost:3000/api" /></div>
                  <div class="field"><label>VUs</label><input id="loadVus" type="number" value="20" /></div>
                  <div class="field"><label>Duration (sec)</label><input id="loadDuration" type="number" value="5" /></div>
                </div>
                <div class="row actions"><button class="btn primary" onclick="runLoadBenchmark()">Run Benchmark</button></div>
              </div>
            </div>

            <div class="view" id="view-mockdata">
              <div class="card"><h3>Mock Data Factory</h3>
                <div class="grid-2">
                  <div class="field"><label>Preset</label>
                    <select id="mockPreset"><option>user</option><option>order</option><option>product</option><option>address</option><option>arabic_user</option></select>
                  </div>
                  <div class="field"><label>Count</label><input id="mockCount" type="number" value="5" /></div>
                </div>
                <div class="row actions"><button class="btn primary" onclick="generateMockData()">Generate</button></div>
              </div>
            </div>

            <div class="view" id="view-sec">
              <div class="card"><h3>CVE & Secret Findings</h3>
                <div class="row actions"><button class="btn" onclick="runAction('audit')">Run Audit</button></div>
                <table><thead><tr><th>Severity</th><th>Finding</th><th>Package</th></tr></thead><tbody>${secRows || '<tr><td colspan="3" class="muted">No findings loaded. Run audit.</td></tr>'}</tbody></table>
              </div>
            </div>

            <div class="view" id="view-owasp">
              <div class="card"><h3>OWASP Header Audit</h3>
                <div class="field"><label>Target URL</label><input id="owaspUrl" value="http://localhost:3000" /></div>
                <div class="row actions"><button class="btn primary" onclick="runOwaspScan()">Scan Endpoint</button></div>
              </div>
            </div>

            <div class="view" id="view-malware">
              <div class="card"><h3>Malware & Backdoor Scanner</h3><p class="muted">AST scan for obfuscated payloads and suspicious lifecycle scripts.</p>
                <div class="row actions" data-btn-group="malware-mode" role="group" aria-label="Malware actions">
                  <button type="button" class="btn primary" data-btn="scan" aria-pressed="true" onclick="runAction('scan-malware')">Scan</button>
                  <button type="button" class="btn danger" data-btn="remediate" aria-pressed="false" onclick="runAction('fix-malware')">Remediate</button>
                </div></div>
            </div>

            <div class="view" id="view-remote">
              <div class="card"><h3>Live Remote Bridge</h3>
                <div class="field"><label>Remote URL</label><input id="remoteUrl" placeholder="https://example.com" /></div>
                <div class="field label-gap"><label>Bridge Secret (optional)</label><input id="remoteSecret" placeholder="optional" /></div>
                <div class="row actions" data-btn-group="remote-mode" role="group" aria-label="Remote bridge">
                  <button type="button" class="btn" data-btn="probe" aria-pressed="false" onclick="generateRemoteProbeCode()">Generate Probe</button>
                  <button type="button" class="btn" data-btn="connect" aria-pressed="false" onclick="connectRemoteLive()">Connect</button>
                  <button type="button" class="btn primary" data-btn="audit" aria-pressed="true" onclick="auditRemoteLive()">Remote Audit</button>
                </div>
              </div>
            </div>

            <div class="view" id="view-perf">
              <div class="card"><h3>Core Web Vitals</h3>
                <div class="row actions"><button class="btn" onclick="runAction('perf')">Profile Routes</button></div>
                <table><thead><tr><th>Route</th><th>LCP</th><th>CLS</th><th>Rating</th></tr></thead><tbody>${perfRows || '<tr><td colspan="4" class="muted">No route profiles yet.</td></tr>'}</tbody></table>
              </div>
            </div>

            <div class="view" id="view-arch">
              <div class="card"><h3>Architecture Graph</h3><p class="muted">Generate topology of UI, APIs, and infrastructure dependencies.</p>
                <div class="row actions" data-btn-group="arch-mode" role="group" aria-label="Architecture tools">
                  <button type="button" class="btn primary" data-btn="graph" aria-pressed="true" onclick="runAction('arch-graph')">Generate Graph</button>
                  <button type="button" class="btn" data-btn="parity" aria-pressed="false" onclick="runAction('feature-parity')">Feature Parity</button>
                  <button type="button" class="btn" data-btn="db" aria-pressed="false" onclick="runAction('db-audit')">DB Audit</button>
                  <button type="button" class="btn" data-btn="env" aria-pressed="false" onclick="runAction('env-drift')">Env Drift</button>
                  <button type="button" class="btn" data-btn="assets" aria-pressed="false" onclick="runAction('dead-assets')">Dead Assets</button>
                  <button type="button" class="btn" data-btn="contracts" aria-pressed="false" onclick="runAction('audit-contracts')">Smart Contracts</button>
                </div></div>
            </div>

            <div class="view" id="view-lab">
              <div class="card">
                <h3>Tool Lab</h3>
                <p class="muted">Extra dashboard actions for advanced engines (same engine as CLI/MCP). Results stream in the Results pane.</p>
                <div class="row actions wrap">
                  <button class="btn" onclick="runAction('learn-framework')">Learn Framework</button>
                  <button class="btn" onclick="runAction('fuzz-api')">Fuzz API</button>
                  <button class="btn" onclick="runAction('mutation')">Mutation Score</button>
                  <button class="btn" onclick="runAction('visual-diff')">Visual Diff</button>
                  <button class="btn" onclick="runAction('contract-drift')">Contract Drift</button>
                  <button class="btn" onclick="runAction('docker-env')">Docker Env</button>
                  <button class="btn" onclick="runAction('browser-matrix')">Browser Matrix</button>
                  <button class="btn" onclick="runAction('bdd')">BDD Features</button>
                  <button class="btn" onclick="runAction('ai-eval')">AI Eval</button>
                  <button class="btn" onclick="runAction('throttle')">Throttle</button>
                  <button class="btn" onclick="runAction('failure-replay')">Failure Replay</button>
                  <button class="btn" onclick="runAction('recorder-bookmarklet')">Recorder Bookmarklet</button>
                </div>
              </div>
            </div>

            <div class="view" id="view-security">
              <div class="card"><h3>Security Suite</h3><p class="muted">Non-destructive auth, authZ, injection, session theft/hijacking, and upload probes.</p>
                <div class="row actions" data-btn-group="security-mode" role="group" aria-label="Security suite">
                  <button type="button" class="btn" data-btn="scan" aria-pressed="false" onclick="runAction('security-scan')">Scan Surface</button>
                  <button type="button" class="btn primary" data-btn="run" aria-pressed="true" onclick="runAction('security-run')">Run Safe Suite</button>
                  <button type="button" class="btn" data-btn="sarif" aria-pressed="false" onclick="runAction('export-sarif')">Export SARIF</button>
                  <button type="button" class="btn" data-btn="policy" aria-pressed="false" onclick="runAction('init-security-policy')">Init Policy</button>
                </div></div>
            </div>

            <div class="view" id="view-websec">
              <div class="card"><h3>SRI / CSRF / CORS</h3><p class="muted">Audit CDN integrity, CSRF tokens on mutating forms, and wildcard CORS.</p>
                <div class="row actions"><button class="btn primary" onclick="runAction('sri-csrf-audit')">Run Web-Sec Audit</button></div></div>
            </div>

            <div class="view" id="view-a11y">
              <div class="card"><h3>Accessibility (WCAG)</h3><p class="muted">Run axe-style WCAG checks across discovered routes.</p>
                <div class="row actions"><button class="btn primary" onclick="runAction('a11y')">Run A11y Audit</button></div></div>
            </div>

            <div class="view" id="view-screenreader">
              <div class="card"><h3>Screen Reader Simulation</h3><p class="muted">Approximate NVDA / VoiceOver reading order for key pages.</p>
                <div class="row actions"><button class="btn primary" onclick="runAction('screen-reader')">Simulate</button></div></div>
            </div>

            <div class="view" id="view-dedup">
              <div class="card"><h3>Test Deduplication</h3><p class="muted">Detect overlapping assertions and redundant specs.</p>
                <div class="row actions"><button class="btn primary" onclick="runAction('dedup-tests')">Dedup Suite</button></div></div>
            </div>

            <div class="view" id="view-bisect">
              <div class="card"><h3>Git Bisect Hunter</h3><p class="muted">Pinpoint the commit that introduced a failing test.</p>
                <div class="row actions"><button class="btn primary" onclick="runAction('bisect')">Hunt Regression</button></div></div>
            </div>

            <div class="view" id="view-throttle">
              <div class="card"><h3>Network Throttle</h3><p class="muted">Simulate slow networks and offline drops against a live URL.</p>
                <div class="grid-2">
                  <div class="field"><label>Target URL</label><input id="throttleUrl" value="http://localhost:3000" /></div>
                  <div class="field"><label>Profile</label>
                    <select id="throttleProfile">
                      <option value="GPRS_SLOW">GPRS</option>
                      <option value="REGULAR_3G" selected>3G</option>
                      <option value="GOOD_4G">4G</option>
                      <option value="OFFLINE_DROP">Offline</option>
                      <option value="PACKET_LOSS">Packet Loss</option>
                    </select>
                  </div>
                </div>
                <div class="row actions"><button class="btn primary" onclick="runThrottleAction()">Run Throttle Probe</button></div>
              </div>
            </div>

            <div class="view" id="view-explore">
              <div class="card"><h3>Live Explore</h3><p class="muted">Crawl routes and build a local site visual map.</p>
                <div class="row actions"><button class="btn primary" onclick="runAction('explore')">Explore App</button></div></div>
            </div>

            <div class="view" id="view-release">
              <div class="card"><h3>Release Gate</h3><p class="muted">Compute release confidence and gate readiness.</p>
                <div class="row actions"><button class="btn primary" onclick="runAction('release')">Run Release Check</button></div></div>
            </div>

            <div class="view" id="view-guide">
              <div class="card">
                <h3>Interactive Guide</h3>
                <p class="muted">Local-first workflow for CLI, MCP (<code>vp.*</code>), and this dashboard — all share the same engine.</p>
                <input class="guide-search" id="guideSearchInput" placeholder="Search guide..." onkeyup="filterGuide()" />
                <div class="guide-item"><h4>1. Daily-10</h4><p class="muted">Most-used CLI: <code>init</code>, <code>teach-ai</code>, <code>ask</code>, <code>inspect</code>, <code>doctor</code>, <code>verify</code>, <code>test</code>, <code>changed</code>, <code>security</code>, <code>history</code>. Root help groups all 75 commands like the sidebar (Start → More).</p><div class="code-line">npx veloprove --help</div></div>
                <div class="guide-item"><h4>2. Inspect & Doctor</h4><p class="muted">Discover stack, routes, APIs, runners (Vitest / Jest / Playwright / <code>node:test</code>), and environment health.</p><div class="code-line">npx veloprove inspect && npx veloprove doctor</div></div>
                <div class="guide-item"><h4>3. Teach AI</h4><p class="muted">Write AGENTS.md + agent-manifest and get a paste-ready briefing so Cursor/Claude/Cline know how to use VeloProve. Use sidebar Quick Actions or Overview.</p><div class="code-line">npx veloprove teach-ai --force --mcp</div></div>
                <div class="guide-item"><h4>4. Docs Chat</h4><p class="muted">Ask questions answered from packaged docs only (no cloud LLM). English-only without an AI agent. CLI: <code>veloprove ask</code> / Dashboard Docs Chat.</p><div class="code-line">npx veloprove ask "how do I link Cursor?"</div></div>
                <div class="guide-item"><h4>5. Verify (change-aware QA)</h4><p class="muted">Impact → targeted tests → diagnose → heal TEST_BUG → release gate. Returns OperationResult evidence.</p><div class="code-line">npx veloprove verify --json --ci</div></div>
                <div class="guide-item"><h4>6. Ensure Dev Server</h4><p class="muted">Probe baseURL and auto-start npm/pnpm/yarn/bun when offline.</p><div class="code-line">npx veloprove ensure-dev -u http://localhost:5173</div></div>
                <div class="guide-item"><h4>7. Plan & Generate</h4><p class="muted">Risk-scored plans and compiling tests without overwriting developer tests.</p><div class="code-line">npx veloprove plan && npx veloprove generate</div></div>
                <div class="guide-item"><h4>8. Run Changed + History</h4><p class="muted">Execute impacted tests, then review pass-rate trends.</p><div class="code-line">npx veloprove test -s changed && npx veloprove history -n 20</div></div>
                <div class="guide-item"><h4>9. Diagnose & Heal</h4><p class="muted">Classify failures, then repair brittle locators safely.</p><div class="code-line">npx veloprove diagnose && npx veloprove heal</div></div>
                <div class="guide-item"><h4>10. Security Suite</h4><p class="muted">Non-destructive auth, injection, session, and upload probes.</p><div class="code-line">npx veloprove security --safe</div></div>
                <div class="guide-item"><h4>11. Web Sec + Dedup</h4><p class="muted">SRI/CSRF/CORS audit and duplicate-test detection.</p><div class="code-line">npx veloprove web-sec && npx veloprove dedup</div></div>
                <div class="guide-item"><h4>12. Load Testing</h4><p class="muted">Benchmark RPS and p95 latency locally. Alias: <code>load</code>. Use <code>-c</code> for VUs (not <code>-u</code>).</p><div class="code-line">npx veloprove load http://localhost:3000/api -c 20 -d 5</div></div>
                <div class="guide-item"><h4>13. Coverage Heatmap</h4><p class="muted">Map PRD requirements to tests.</p><div class="code-line">npx veloprove coverage</div></div>
                <div class="guide-item"><h4>14. Export Reports</h4><p class="muted">HTML, JUnit XML, Allure results, or simple PDF from local state.</p><div class="code-line">npx veloprove export-report -f allure</div></div>
                <div class="guide-item"><h4>15. MCP for Agents</h4><p class="muted">75 <code>vp.*</code> tools over stdio (includes <code>vp.ask</code>). Full catalog: <code>docs/reference/mcp.md</code>. Teach AI first via Quick Actions or <code>teach-ai</code>.</p><div class="code-line">npx -y @engnadia/veloprove mcp</div></div>
                <div class="guide-item"><h4>16. Scenario Recorder</h4><p class="muted">Capture journeys and synthesize Playwright tests locally.</p><div class="code-line">npx veloprove record-scenario</div></div>
                <div class="guide-item"><h4>17. Pre-commit Hook</h4><p class="muted">Install change-impact verification before commits.</p><div class="code-line">npx veloprove hook install</div></div>
              </div>
            </div>

            <div class="view" id="view-docs-chat">
              <div class="docs-chat-shell card">
                <div class="docs-chat-top">
                  <div class="row actions docs-chat-links">
                    <button type="button" class="btn ghost sm" onclick="selectNav('teach-ai')">Teach AI</button>
                    <button type="button" class="btn ghost sm" onclick="selectNav('guide')">Guide</button>
                  </div>
                </div>
                <div class="docs-chat-thread" id="docsChatThread" aria-live="polite">
                  <div class="docs-chat-empty" id="docsChatEmpty">Ask a question — answers appear here.</div>
                  <div id="docsChatAnswer" class="docs-chat-answer muted"></div>
                </div>
                <div class="docs-chat-dock">
                  <div class="docs-composer">
                    <textarea id="docsChatInput" class="docs-composer-input" rows="1"
                      placeholder="e.g. How do I verify my changes?"
                      aria-label="Docs Chat question"
                      oninput="resizeDocsChatInput()"
                      onkeydown="onDocsChatKeydown(event)"></textarea>
                  </div>
                  <div class="docs-composer-actions">
                    <button type="button" class="btn primary" onclick="askDocsChat()">${btnIco('send')} Ask</button>
                    <button type="button" class="btn ghost" onclick="copyDocsChatAnswer()" data-tip="Copy last answer" disabled aria-disabled="true">${btnIco('copy')} Copy Answer</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="view" id="view-teach-ai">
              <div class="card">
                <h3>Teach AI</h3>
                <p class="muted">Writes local <code>AGENTS.md</code> + agent manifest and a paste-ready briefing so Cursor / Claude / Cline know how to use VeloProve. Live output streams in <strong>Results</strong>.</p>
                <div class="row actions">
                  <button class="btn primary" onclick="runAction('teach-ai')">${btnIco('book')} Run Teach AI</button>
                  <button class="btn ghost" onclick="selectNav('docs-chat')">${btnIco('message')} Docs Chat</button>
                  <button class="btn ghost" onclick="selectNav('guide')">Open Guide</button>
                </div>
                <p class="muted stack">CLI: <code>npx veloprove teach-ai --force --mcp</code> · MCP: <code>vp.bootstrap</code></p>
              </div>
            </div>

            <div class="view" id="view-ensure-dev">
              <div class="card">
                <h3>Ensure Dev</h3>
                <p class="muted">Probes the project <code>baseURL</code> and auto-starts <code>npm</code> / <code>pnpm</code> / <code>yarn</code> / <code>bun</code> when the app is offline. Status and logs appear in <strong>Results</strong>.</p>
                <div class="row actions">
                  <button class="btn primary" onclick="runAction('ensure-dev')">${btnIco('zap')} Ensure Dev Server</button>
                  <button class="btn ghost" onclick="selectNav('doctor')">${btnIco('stethoscope')} Open Doctor</button>
                  <button class="btn ghost" onclick="selectNav('explore')">${btnIco('compass')} Explore</button>
                </div>
                <p class="muted stack">CLI: <code>npx veloprove ensure-dev</code> · also <code>--ensure-dev</code> on security / explore</p>
              </div>
            </div>

            <div class="view" id="view-about">
              <div class="card">
                <div class="brand-hero">
                  <img src="/logo.svg?v=${brandV}" alt="VeloProve" />
                </div>
                <h3>About VeloProve</h3>
                <p class="lead"><strong>VeloProve</strong> combines velocity and proof — a local engineering workspace where quality is inspected, tested, and proven before release.</p>
                <div class="stack muted">
                  <div>Package: <code>@engnadia/veloprove</code></div>
                  <div>CLI: <code>veloprove</code> (75 commands) · MCP: <code>vp.*</code> (75 tools)</div>
                  <div>Dashboard: <code>veloprove ui</code> (default port 4173)</div>
                  <div>Catalogs: <code>docs/reference/cli.md</code> · <code>docs/reference/mcp.md</code> · <code>docs/guides/features.md</code></div>
                  <div>Identity: local-first · zero-cloud core · OperationResult evidence</div>
                  <div>Runners: Vitest · Jest · Playwright · <code>node:test</code> (built-in)</div>
                  <div>Safety: WorkspaceGuard · FixSafetyPolicy · secret redaction · protected developer tests</div>
                  <div>Brand: <code>docs/assets/veloprove-logo.svg</code> · <code>docs/assets/veloprove-icon.svg</code></div>
                  <div>License: MIT · Node.js &gt;= 18 · Windows / macOS / Linux · v1.0.0</div>
                  <div>AI agent: optional — core QA runs locally without Cursor/Claude; sensitive steps show a notice + Run without AI</div>
                </div>
                <p class="muted stack">CLI, MCP, and this UI call the same <code>VeloProveEngine</code>. Surface matrix: 75 CLI · 75 MCP · curated Dashboard · see <code>docs/reference/surface-matrix.md</code>. When adding a capability: register CLI + MCP + docs + parity tests, then purge dead code.</p>
              </div>
            </div>

            <div class="view" id="view-report">
              <div class="card">
                <h3>Executive Summary</h3>
                <div class="stack">
                  <div><span class="muted">Project</span> · ${esc(profile.projectName || 'ActiveProject')}</div>
                  <div><span class="muted">Coverage</span> · ${heatmap.overallCoverageScore}% (${heatmap.fullCount} full / ${heatmap.partialCount} partial / ${heatmap.uncoveredCount} gaps)</div>
                  <div><span class="muted">Security</span> · ${secAudit.score}/100 (${secAudit.totalVulnerabilities} findings)</div>
                  <div><span class="muted">Performance</span> · ${perfAudit.overallScore}/100 (${esc(perfAudit.rating)})</div>
                  <div><span class="muted">Stack</span> · ${esc(frameworks)} / ${esc(runners)}</div>
                </div>
                <p class="muted stack">Export opens a <strong>preview</strong> first. Default path is <code>.veloprove/exports</code> (created if missing). Edit the path if you want another location, then <strong>Save</strong> — the final path is shown after write.</p>
                <div class="row actions" data-btn-group="export-format" role="group" aria-label="Export format">
                  <button type="button" class="btn primary" data-btn="html" aria-pressed="true" onclick="previewExportReport('html')">Export HTML</button>
                  <button type="button" class="btn" data-btn="junit" aria-pressed="false" onclick="previewExportReport('junit')">Export JUnit</button>
                  <button type="button" class="btn" data-btn="allure" aria-pressed="false" onclick="previewExportReport('allure')">Export Allure</button>
                  <button type="button" class="btn" data-btn="pdf" aria-pressed="false" onclick="previewExportReport('pdf')">Export PDF</button>
                </div>
                <div class="row actions">
                  <button type="button" class="btn" onclick="window.print()">Print page</button>
                  <button type="button" class="btn ghost" onclick="selectNav('runs')">Open Test Runs</button>
                </div>
                <p class="muted stack-sm">Export uses the latest local run + audits automatically. Trends live under <strong>Results → Test Runs</strong>.</p>
              </div>
              <div class="card" id="exportPreviewCard" hidden>
                <h3>Export preview</h3>
                <p class="muted" id="exportPreviewHint">Review the preview, confirm or edit the path, then Save.</p>
                <p class="muted">Suggested name:</p>
                <div class="code-line" id="exportPreviewPath">—</div>
                <pre class="export-preview-body" id="exportPreviewBody"></pre>
                <div class="field label-gap">
                  <label for="exportSavePath">Save to (path)</label>
                  <input type="text" id="exportSavePath" spellcheck="false" autocomplete="off" placeholder=".veloprove/exports/…" />
                </div>
                <div class="row actions stack">
                  <button type="button" class="btn primary" id="exportConfirmSaveBtn" onclick="confirmExportSave()">Save</button>
                  <button type="button" class="btn ghost" onclick="useProjectExportPath()">Reset to project folder</button>
                  <button type="button" class="btn ghost" onclick="cancelExportPreview()">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="pane pane-results">
          <div class="pane-head">
            <div>
              <div class="pane-title">Results <span class="sse-dot" id="sseDot" title="SSE status"></span></div>
              <div class="pane-desc">Live execution output via SSE · JSON payloads · console feedback.</div>
            </div>
            <div class="results-toolbar">
              <span class="status-pill" id="resultStatus">Idle</span>
              <button class="btn ghost sm" onclick="copyResults()">Copy</button>
              <button class="btn ghost sm" onclick="downloadResults()">Download</button>
              <button class="btn ghost sm" onclick="clearResults()">Clear</button>
            </div>
          </div>
          <div class="pane-body">
            <div class="card">
              <h3>Output</h3>
              <div class="result-box is-empty" id="resultBox">Select a service and run an action. Live logs stream here while actions run.</div>
            </div>
            <div class="card" id="loadResultContainer" hidden>
              <h3>Load Metrics</h3>
              <div class="stats">
                <div class="stat"><div class="k">RPS</div><div class="v" id="metricRps">—</div></div>
                <div class="stat"><div class="k">p95</div><div class="v" id="metricP95">—</div></div>
                <div class="stat"><div class="k">Errors</div><div class="v" id="metricErrRate">—</div></div>
                <div class="stat"><div class="k">Total</div><div class="v" id="metricTotalReqs">—</div></div>
              </div>
            </div>
            <div class="card">
              <h3>Console</h3>
              <div class="console" id="consoleBox">
                <div class="console-entry"><span class="console-time">[ready]</span><span>VeloProve dashboard online · connecting SSE…</span></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>

  <div id="toast-host" aria-live="polite" aria-relevant="additions"></div>

  <script>${dashboardClientScript(aiBootstrap)}</script>
</body>
</html>`;
}

