export function dashboardClientScript(aiPresence?: {
  hasAi?: boolean;
  summary?: string;
  editors?: string[];
}): string {
  const aiJson = JSON.stringify(
    aiPresence || { hasAi: false, summary: 'No AI coding agent detected', editors: [] }
  );
  return `    window.__VP_AI__ = ${aiJson};
    const META = {
      overview: ['Overview', 'Stack discovery, health summary, and quick actions for this workspace.'],
      doctor: ['Doctor', 'Environment diagnostics — Node, runners (Vitest/Jest/Playwright/node:test), config, permissions.'],
      'ensure-dev': ['Ensure Dev', 'Probe baseURL and auto-start the local app when it is offline.'],
      'teach-ai': ['Teach AI', 'Write AGENTS.md + agent-manifest and a paste-ready briefing for Cursor / Claude / Cline.'],
      'docs-chat': ['Docs Chat', 'English-only Q&A from packaged docs (local, no cloud LLM).'],
      verify: ['Verify', 'Autonomous change-aware QA: impact → test → diagnose → heal → release.'],
      explore: ['Explore', 'Crawl routes and build a local site visual map.'],
      plan: ['Plan & Generate', 'Risk-scored planning and protected test materialization.'],
      runner: ['Test Runner', 'Execute Vitest/Jest/Playwright/node:test suites and diagnose failures.'],
      release: ['Release Gate', 'Compute release confidence and readiness.'],
      heal: ['Heal & Fix', 'Locator healing, lint fixes, and bug-fix patches.'],
      quarantine: ['Flaky Quarantine', 'Isolate unstable tests from blocking CI.'],
      dedup: ['Dedup Tests', 'Detect overlapping assertions and redundant specs.'],
      recorder: ['Scenario Recorder', 'Bookmarklet capture → accessibility-first Playwright specs.'],
      bisect: ['Git Bisect', 'Pinpoint the commit that introduced a failing test.'],
      heatmap: ['Coverage', 'PRD requirements mapped to automated coverage.'],
      runs: ['Test Runs', 'Stored execution history from local VeloProve state.'],
      report: ['Export Report', 'Preview and save executive HTML / JUnit / Allure / PDF under .veloprove/exports.'],
      client: ['HTTP Client', 'API Studio with Local/Staging/Prod environments, secret masking, and chained tokens.'],
      apis: ['Discovered APIs', 'Routes extracted from the project AST and specs.'],
      load: ['Load Testing', 'Concurrent VU benchmarking with latency percentiles.'],
      mockdata: ['Mock Data', 'Generate realistic fixtures for local testing.'],
      security: ['Security Suite', 'Non-destructive auth, injection, session, and upload probes.'],
      sec: ['CVE & Secrets', 'Dependency vulnerabilities and leaked credential patterns.'],
      websec: ['SRI / CSRF / CORS', 'CDN integrity, CSRF tokens, and wildcard CORS policies.'],
      owasp: ['OWASP Scan', 'Header and transport hardening checks for a live URL.'],
      malware: ['Malware Scan', 'Detect obfuscated payloads and suspicious scripts.'],
      remote: ['Remote Bridge', 'Companion probe workflow for live websites.'],
      a11y: ['Accessibility', 'WCAG checks across discovered routes.'],
      screenreader: ['Screen Reader', 'Approximate NVDA / VoiceOver reading order.'],
      perf: ['Web Vitals', 'Route-level performance profiling summary.'],
      throttle: ['Network Throttle', 'Simulate slow networks and offline drops.'],
      arch: ['Architecture', 'Topology graph and parity audits.'],
      lab: ['Tool Lab', 'Advanced engines wired to the same VeloProveEngine as CLI/MCP.'],
      guide: ['Guide', 'VeloProve Complete Interactive User & Agent Guide'],
      about: ['About', 'Product identity and local-first philosophy.']
    };

    const QUICK_BY_VIEW = {
      'docs-chat': 'docs-chat'
    };

    function syncQuickActive(viewId) {
      const key = QUICK_BY_VIEW[viewId] || '';
      document.querySelectorAll('.sq-btn[data-quick]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-quick') === key);
      });
    }

    let lastNavId = 'overview';
    let resultsCollapsedBeforeDocsChat = null;

    function selectNav(id) {
      const prev = lastNavId;
      lastNavId = id;
      document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === id));
      document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === 'view-' + id));
      const meta = META[id] || [id, ''];
      document.getElementById('crumbTitle').textContent = meta[0];
      document.getElementById('detailTitle').textContent = meta[0];
      document.getElementById('detailDesc').textContent = meta[1];
      const active = document.querySelector('.nav-item.active');
      const group = active && active.closest('.nav-group');
      if (group && !document.querySelector('.app')?.classList.contains('sidebar-collapsed')) {
        group.classList.add('is-open');
        const lab = group.querySelector('.nav-label');
        if (lab) lab.setAttribute('aria-expanded', 'true');
      }
      if (active && typeof active.scrollIntoView === 'function') {
        try { active.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (_) { /* ignore */ }
      }
      syncQuickActive(id);

      // Hide stale export preview when leaving Report
      if (prev === 'report' && id !== 'report') {
        const card = document.getElementById('exportPreviewCard');
        if (card) card.hidden = true;
      }

      // Give Docs Chat more vertical room by collapsing Results (restore on leave)
      const split = document.querySelector('.split');
      if (split) {
        if (id === 'docs-chat') {
          if (resultsCollapsedBeforeDocsChat == null) {
            resultsCollapsedBeforeDocsChat = split.classList.contains('results-collapsed');
          }
          if (!split.classList.contains('results-collapsed')) {
            split.classList.add('results-collapsed');
            const rb = document.querySelector('.icon-btn[aria-label="Toggle results"]');
            if (rb) rb.setAttribute('aria-pressed', 'true');
          }
        } else if (prev === 'docs-chat' && resultsCollapsedBeforeDocsChat != null) {
          split.classList.toggle('results-collapsed', resultsCollapsedBeforeDocsChat);
          const rb = document.querySelector('.icon-btn[aria-label="Toggle results"]');
          if (rb) rb.setAttribute('aria-pressed', resultsCollapsedBeforeDocsChat ? 'true' : 'false');
          resultsCollapsedBeforeDocsChat = null;
        }
      }

      if (typeof isMobileNav === 'function' && isMobileNav()) {
        closeMobileNav();
      }
    }

    function toggleNavGroup(btn) {
      if (document.querySelector('.app')?.classList.contains('sidebar-collapsed')) return;
      const group = btn.closest('.nav-group');
      if (!group) return;
      const open = !group.classList.contains('is-open');
      group.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function filterNav(q) {
      const query = (q || '').toLowerCase().trim();
      document.querySelectorAll('.nav-item').forEach(item => {
        const label = (item.querySelector('.label')?.textContent || '').toLowerCase();
        const tip = (item.getAttribute('data-tip') || item.getAttribute('aria-label') || '').toLowerCase();
        item.style.display = !query || label.includes(query) || tip.includes(query) ? 'flex' : 'none';
      });
      document.querySelectorAll('.nav-group').forEach(g => {
        const lab = g.querySelector('.nav-label');
        if (query) {
          const hasVisible = Array.from(g.querySelectorAll('.nav-item')).some(i => i.style.display !== 'none');
          g.style.display = hasVisible ? '' : 'none';
          g.classList.toggle('is-open', hasVisible);
          if (lab) lab.setAttribute('aria-expanded', hasVisible ? 'true' : 'false');
        } else {
          g.style.display = '';
          const id = g.getAttribute('data-group');
          const open = id === 'start' || id === 'verify';
          g.classList.toggle('is-open', open);
          if (lab) lab.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
      });
    }

    let latestResultPayload = null;
    let actionInFlight = false;

    function setResultStatus(kind, label) {
      const el = document.getElementById('resultStatus');
      el.className = 'status-pill' + (kind ? ' ' + kind : '');
      el.textContent = label;
    }

    function setResult(data, state) {
      const box = document.getElementById('resultBox');
      latestResultPayload = data;
      box.classList.remove('is-loading', 'is-error', 'is-empty');
      if (state === 'loading') box.classList.add('is-loading');
      if (state === 'error') box.classList.add('is-error');
      if (state === 'empty') box.classList.add('is-empty');
      box.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    }

    function copyResults() {
      const text = document.getElementById('resultBox').textContent || '';
      navigator.clipboard.writeText(text).then(() => logConsole('✔ Copied results')).catch(err => notify('err', 'Copy failed', err.message));
    }

    function downloadResults() {
      const text = typeof latestResultPayload === 'string'
        ? latestResultPayload
        : JSON.stringify(latestResultPayload ?? { empty: true }, null, 2);
      const blob = new Blob([text], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'veloprove-result-' + Date.now() + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      logConsole('✔ Downloaded results JSON');
    }

    function clearResults() {
      setResult('Select a service and run an action. Live logs stream here while actions run.', 'empty');
      setResultStatus('', 'Idle');
      document.getElementById('consoleBox').innerHTML = '';
      logConsole('Results cleared');
    }

    function escHtml(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function logConsole(msg) {
      const box = document.getElementById('consoleBox');
      if (!box) return;
      const entry = document.createElement('div');
      entry.className = 'console-entry';
      const time = document.createElement('span');
      time.className = 'console-time';
      time.textContent = '[' + new Date().toLocaleTimeString() + ']';
      const body = document.createElement('span');
      body.textContent = String(msg == null ? '' : msg);
      entry.appendChild(time);
      entry.appendChild(body);
      box.appendChild(entry);
      box.scrollTop = box.scrollHeight;
    }

    function notify(level, title, detail) {
      // Toast policy: only necessities (errors, blocking AI gate, save path, sensitive warns).
      // Routine success / navigation / preview stay in Results + Console.
      const host = document.getElementById('toast-host');
      if (!host) {
        logConsole((level === 'err' ? '✖ ' : level === 'warn' ? '⚠ ' : level === 'ok' ? '✔ ' : 'ℹ ') + title + (detail ? ' — ' + detail : ''));
        return;
      }
      const icons = { ok: '✔', warn: '⚠', err: '✖', info: 'ℹ' };
      const el = document.createElement('div');
      el.className = 'toast ' + (level || 'info');
      el.setAttribute('role', level === 'err' ? 'alert' : 'status');
      const detailHtml = detail
        ? '<div class="toast-detail">' + escHtml(detail) + '</div>'
        : '';
      el.innerHTML =
        '<div class="toast-ico" aria-hidden="true">' + (icons[level] || icons.info) + '</div>' +
        '<div class="toast-body"><div class="toast-title">' + escHtml(title) + '</div>' + detailHtml + '</div>' +
        '<button type="button" class="toast-close" aria-label="Dismiss">×</button>';
      const dismiss = () => {
        if (!el.parentNode) return;
        el.classList.add('is-out');
        setTimeout(() => el.remove(), 180);
      };
      el.querySelector('.toast-close')?.addEventListener('click', dismiss);
      host.appendChild(el);
      const ttl = level === 'err' ? 7000 : level === 'warn' ? 5500 : 4200;
      setTimeout(dismiss, ttl);
      logConsole((icons[level] || 'ℹ') + ' ' + title + (detail ? ' — ' + detail : ''));
    }

    /** Actions that modify project files or git state — require explicit confirm. */
    const SENSITIVE_ACTIONS = {
      'fix-malware': {
        title: 'Remediate malware?',
        detail: 'Neutralizes detected threats by rewriting project source files.'
      },
      'auto-fix': {
        title: 'Auto-fix application bugs?',
        detail: 'Synthesizes source patches from diagnostics. Review results carefully before trusting changes.'
      },
      heal: {
        title: 'Heal test locators?',
        detail: 'May rewrite selectors in generated test files.'
      },
      'lint-fix': {
        title: 'Apply lint --fix?',
        detail: 'Will modify source files to auto-fix lint issues.'
      },
      generate: {
        title: 'Generate test files?',
        detail: 'Creates new test files (overwritePolicy: generated-only).'
      },
      bisect: {
        title: 'Run git bisect?',
        detail: 'Temporarily checks out commits to hunt regressions. Do not run with dirty critical work uncommitted.'
      },
      'dead-assets': {
        title: 'Scan dead assets?',
        detail: 'Dashboard scan is read-only. Deleting files requires CLI: veloprove dead-assets --purge -y'
      }
    };

    function confirmSensitive(actionName) {
      const meta = SENSITIVE_ACTIONS[actionName];
      if (!meta) return Promise.resolve(true);

      const ai = window.__VP_AI__ || { hasAi: false, summary: 'No AI coding agent detected' };

      // dead-assets dashboard path is scan-only — soft warn toast then proceed
      if (actionName === 'dead-assets') {
        notify('warn', meta.title, meta.detail);
        return Promise.resolve(true);
      }

      // AI present → execute agentic/sensitive ops without human confirm (no toast noise)
      if (ai.hasAi) {
        logConsole('ℹ AI assistant detected — executing ' + (ai.summary || actionName));
        return Promise.resolve(true);
      }

      // No AI → warn + allow continue without agent (core engine is local; AI is optional)
      return new Promise((resolve) => {
        const host = document.getElementById('toast-host');
        if (!host) {
          notify('warn', 'No AI agent linked', String(ai.summary || 'Continuing in local-only mode.'));
          resolve(true);
          return;
        }
        const el = document.createElement('div');
        el.className = 'toast warn toast-confirm';
        el.setAttribute('role', 'alertdialog');
        el.setAttribute('aria-modal', 'true');
        el.innerHTML =
          '<div class="toast-ico" aria-hidden="true">⚠</div>' +
          '<div class="toast-body"><div class="toast-title">' + escHtml(meta.title || 'Confirm') + '</div>' +
          '<div class="toast-detail">No AI coding agent linked. VeloProve still runs locally. ' +
          escHtml(meta.detail || '') + ' ' +
          escHtml(ai.summary || '') + '</div>' +
          '<div class="toast-actions">' +
          '<button type="button" class="btn ghost sm" data-act="cancel">Cancel</button>' +
          '<button type="button" class="btn ghost sm" data-act="teach">Teach AI</button>' +
          '<button type="button" class="btn primary sm" data-act="continue">Run without AI</button>' +
          '</div></div>';
        const finish = (ok) => {
          el.classList.add('is-out');
          setTimeout(() => el.remove(), 180);
          resolve(ok);
        };
        el.querySelector('[data-act="cancel"]')?.addEventListener('click', () => finish(false));
        el.querySelector('[data-act="continue"]')?.addEventListener('click', () => {
          logConsole('⚠ Continuing without AI: ' + actionName);
          finish(true);
        });
        el.querySelector('[data-act="teach"]')?.addEventListener('click', () => {
          finish(false);
          selectNav('teach-ai');
        });
        host.appendChild(el);
        logConsole('⚠ No AI linked — confirm to run: ' + actionName);
      });
    }

    function connectSse() {
      const dot = document.getElementById('sseDot');
      try {
        const es = new EventSource('/api/events');
        es.addEventListener('ready', () => {
          dot.classList.add('live');
          logConsole('✔ SSE connected · live streaming enabled');
        });
        es.addEventListener('log', (evt) => {
          try {
            const payload = JSON.parse(evt.data || '{}');
            if (payload.message) logConsole(payload.message);
          } catch {}
        });
        es.addEventListener('action', (evt) => {
          try {
            const payload = JSON.parse(evt.data || '{}');
            if (payload.phase === 'start') {
              setResultStatus('loading', 'Running ' + payload.action);
            } else if (payload.phase === 'complete') {
              setResultStatus('ok', 'Done · ' + (payload.durationMs || '?') + 'ms');
            } else if (payload.phase === 'error') {
              setResultStatus('err', 'Error');
              notify('err', 'Action failed', payload.action || 'unknown');
            }
          } catch {}
        });
        es.onerror = () => {
          dot.classList.remove('live');
        };
      } catch (err) {
        logConsole('✖ SSE unavailable: ' + err.message);
        notify('warn', 'Live stream unavailable', err.message);
      }
    }

    async function runAction(actionName, query) {
      if (actionInFlight) {
        notify('warn', 'Busy', 'Wait for the current action to finish');
        return;
      }
      const allowed = await confirmSensitive(actionName);
      if (!allowed) {
        logConsole('Cancelled: ' + actionName + ' was not started');
        return;
      }
      const mapped = ACTION_BTN_GROUP[actionName];
      if (mapped) setGroupActive(mapped[0], mapped[1]);
      // Verify mode variants from query string
      if (actionName === 'verify' && query) {
        if (String(query).includes('sandbox')) setGroupActive('verify-mode', 'sandbox');
        else if (String(query).includes('dockerEnv')) setGroupActive('verify-mode', 'docker');
        else if (String(query).includes('full')) setGroupActive('verify-mode', 'full');
      }
      actionInFlight = true;
      setResultStatus('loading', 'Running…');
      setResult({ status: 'running', action: actionName }, 'loading');
      try {
        const res = await fetch('/api/actions/' + actionName + (query || ''));
        const data = await res.json();
        if (data.success) {
          setResult(data);
          setResultStatus('ok', 'Done · ' + (data.durationMs || '?') + 'ms');
          logConsole('✔ ' + actionName + ' complete' + (data.durationMs != null ? ' · ' + data.durationMs + 'ms' : ''));
          // Toasts only for outcomes that need attention (paths / paste briefing)
          if (actionName === 'export-report' && data.data?.filePath && data.data.saved !== false) {
            logConsole('Saved: ' + data.data.filePath);
            notify('ok', 'Report saved', data.data.filePath);
          } else if (actionName === 'export-report' && data.data?.filePath) {
            logConsole('Preview path: ' + data.data.filePath);
          }
          if (actionName === 'export-postman' && data.data?.savedPath) {
            logConsole('Saved: ' + data.data.savedPath);
            notify('ok', 'Collection saved', data.data.savedPath);
          }
          if (actionName === 'teach-ai' && data.data?.pasteToAi) {
            notify('info', 'Paste briefing ready', 'Check the results panel');
          }
          if (actionName === 'verify' && data.data?.data?.evidencePack?.indexPath) {
            logConsole('Evidence pack: ' + data.data.data.evidencePack.indexPath);
          } else if (actionName === 'verify' && data.data?.evidencePack?.indexPath) {
            logConsole('Evidence pack: ' + data.data.evidencePack.indexPath);
          }
        } else {
          setResult(data, 'error');
          setResultStatus('err', 'Failed');
          notify('err', actionName + ' failed', data.error || data.message || 'See results panel');
        }
      } catch (err) {
        setResult({ error: err.message }, 'error');
        setResultStatus('err', 'Failed');
        notify('err', actionName + ' failed', err.message);
      } finally {
        actionInFlight = false;
      }
    }

    async function runThrottleAction() {
      const target = encodeURIComponent(document.getElementById('throttleUrl').value || 'http://localhost:3000');
      const profile = encodeURIComponent(document.getElementById('throttleProfile').value || 'REGULAR_3G');
      return runAction('throttle', '?url=' + target + '&profile=' + profile);
    }

    const ACTION_BTN_GROUP = {
      heal: ['heal-mode', 'heal'],
      'auto-fix': ['heal-mode', 'auto-fix'],
      lint: ['heal-mode', 'lint'],
      'lint-fix': ['heal-mode', 'lint-fix'],
      plan: ['plan-mode', 'plan'],
      generate: ['plan-mode', 'generate'],
      'scan-malware': ['malware-mode', 'scan'],
      'fix-malware': ['malware-mode', 'remediate'],
      verify: ['verify-mode', 'default'],
      run: ['runner-mode', 'run'],
      'run-changed': ['runner-mode', 'changed'],
      diagnose: ['runner-mode', 'diagnose'],
      'security-scan': ['security-mode', 'scan'],
      'security-run': ['security-mode', 'run'],
      'export-sarif': ['security-mode', 'sarif'],
      'init-security-policy': ['security-mode', 'policy']
    };

    // Instant button groups (no confirm gate) — activate on click
    document.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest && e.target.closest('[data-btn-group] > .btn[data-btn]');
      if (!btn) return;
      const group = btn.parentElement && btn.parentElement.getAttribute('data-btn-group');
      const value = btn.getAttribute('data-btn');
      const instant = ['export-format', 'verify-mode', 'runner-mode', 'remote-mode', 'arch-mode', 'security-mode'];
      if (group && value && instant.includes(group)) setGroupActive(group, value);
    });

    function setGroupActive(groupName, value) {
      const group = document.querySelector('[data-btn-group="' + groupName + '"]');
      if (!group) return;
      group.querySelectorAll(':scope > .btn[data-btn]').forEach(btn => {
        const on = btn.getAttribute('data-btn') === value;
        if (btn.classList.contains('danger')) {
          btn.classList.toggle('active', on);
          btn.classList.remove('primary');
        } else {
          btn.classList.toggle('primary', on);
          btn.classList.toggle('active', on);
        }
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    let pendingExportFormat = 'html';
    let pendingExportMeta = { projectFallbackPath: '' };

    async function previewExportReport(format) {
      const fmt = format || 'html';
      pendingExportFormat = fmt;
      setGroupActive('export-format', fmt);
      selectNav('report');
      const card = document.getElementById('exportPreviewCard');
      const pathEl = document.getElementById('exportPreviewPath');
      const bodyEl = document.getElementById('exportPreviewBody');
      const hintEl = document.getElementById('exportPreviewHint');
      const savePathEl = document.getElementById('exportSavePath');
      if (card) card.hidden = false;
      if (pathEl) pathEl.textContent = 'Loading preview…';
      if (bodyEl) bodyEl.textContent = '';
      try {
        const res = await fetch('/api/actions/export-report?format=' + encodeURIComponent(fmt) + '&preview=1');
        const wrap = await res.json();
        if (!wrap.success) {
          notify('err', 'Export preview failed', wrap.error || wrap.message || 'See results');
          setResult(wrap, 'error');
          return;
        }
        const data = wrap.data || {};
        setResult(wrap);
        const projectPath = data.projectFallbackPath || data.defaultSavePath || '';
        const exportsDir = data.exportsDir || '.veloprove/exports';
        pendingExportMeta = { projectFallbackPath: projectPath };
        if (pathEl) pathEl.textContent = data.suggestedName || data.filePath || '—';
        if (bodyEl) bodyEl.textContent = data.previewText || '(no preview text for this format)';
        if (savePathEl) {
          savePathEl.value = projectPath;
          savePathEl.focus();
          savePathEl.select();
        }
        if (hintEl) {
          hintEl.textContent =
            'Default: project folder ' + exportsDir +
            '. Edit the path to save elsewhere, or click Reset to project folder, then Save.';
        }
        logConsole('Export preview · ' + (data.suggestedName || data.filePath || '?') + ' · ' + exportsDir);
      } catch (err) {
        notify('err', 'Export preview failed', err.message);
      }
    }

    function useProjectExportPath() {
      const savePathEl = document.getElementById('exportSavePath');
      const fb = pendingExportMeta.projectFallbackPath || '';
      if (savePathEl && fb) {
        savePathEl.value = fb;
        savePathEl.focus();
        savePathEl.select();
      }
      logConsole('Reset export path to project folder');
    }

    async function confirmExportSave() {
      const fmt = pendingExportFormat || 'html';
      const pathEl = document.getElementById('exportPreviewPath');
      const savePathEl = document.getElementById('exportSavePath');
      const saveBtn = document.getElementById('exportConfirmSaveBtn');
      let target = String((savePathEl && savePathEl.value) || '').trim();
      if (!target) {
        target = String(pendingExportMeta.projectFallbackPath || '').trim();
      }
      if (saveBtn) saveBtn.disabled = true;
      setResultStatus('loading', 'Saving…');
      try {
        const qs = target
          ? ('&absolutePath=' + encodeURIComponent(target))
          : '&projectFallback=1';
        const res = await fetch(
          '/api/actions/export-report?format=' + encodeURIComponent(fmt) + qs
        );
        const wrap = await res.json();
        if (!wrap.success) {
          notify('err', 'Save failed', wrap.error || wrap.message || 'See results');
          setResult(wrap, 'error');
          setResultStatus('err', 'Save failed');
          return;
        }
        const data = wrap.data || {};
        setResult(wrap);
        const label = data.filePath || target || '(unknown path)';
        if (pathEl) pathEl.textContent = label;
        if (savePathEl) savePathEl.value = label;
        const detail = data.message || label;
        if (data.usedFallback) {
          notify('warn', 'Saved to project exports', detail);
        } else {
          notify('ok', 'Report saved', detail);
        }
        logConsole('Saved report: ' + label + (data.usedFallback ? ' (project folder)' : ''));
        setResultStatus('ok', 'Saved');
      } catch (err) {
        notify('err', 'Save failed', err.message);
        setResultStatus('err', 'Save failed');
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    }

    function cancelExportPreview() {
      const card = document.getElementById('exportPreviewCard');
      if (card) card.hidden = true;
      logConsole('Export preview dismissed');
    }

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.getElementById('navSearch');
        input?.focus();
        input?.select();
        return;
      }
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = Array.from(document.querySelectorAll('.nav-item')).filter(el => el.style.display !== 'none');
        const idx = items.findIndex(el => el.classList.contains('active'));
        const next = e.key === 'ArrowDown'
          ? items[Math.min(items.length - 1, Math.max(0, idx) + 1)]
          : items[Math.max(0, (idx < 0 ? 0 : idx) - 1)];
        if (next?.dataset?.view) {
          selectNav(next.dataset.view);
          next.focus();
        }
      }
      if (e.key === '[' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggleSidebar();
      }
      if (e.key === ']' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggleResults();
      }
    });

    function isMobileNav() {
      return window.matchMedia('(max-width: 720px)').matches;
    }

    function syncNavChrome() {
      const app = document.querySelector('.app');
      if (!app) return;
      const collapsed = app.classList.contains('sidebar-collapsed');
      const btn = document.querySelector('.icon-btn[aria-label="Toggle sidebar"]');
      if (btn) btn.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
      const backdrop = document.getElementById('sidebarBackdrop');
      if (backdrop) {
        const show = isMobileNav() && !collapsed;
        backdrop.hidden = !show;
        backdrop.classList.toggle('is-open', show);
      }
      document.body.style.overflow = (isMobileNav() && !collapsed) ? 'hidden' : '';
    }

    function closeMobileNav() {
      // Drawer only — never collapse the desktop tools sidebar.
      if (!isMobileNav()) return;
      const app = document.querySelector('.app');
      if (!app) return;
      app.classList.add('sidebar-collapsed');
      syncNavChrome();
    }

    function toggleSidebar() {
      const app = document.querySelector('.app');
      if (!app) return;
      app.classList.toggle('sidebar-collapsed');
      const collapsed = app.classList.contains('sidebar-collapsed');
      try { localStorage.setItem('vp.sidebarCollapsed', collapsed ? '1' : '0'); } catch {}
      syncNavChrome();
    }
    function toggleResults() {
      const split = document.querySelector('.split');
      if (!split) return;
      split.classList.toggle('results-collapsed');
      const collapsed = split.classList.contains('results-collapsed');
      const btn = document.querySelector('.icon-btn[aria-label="Toggle results"]');
      if (btn) btn.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
      try { localStorage.setItem('vp.resultsCollapsed', collapsed ? '1' : '0'); } catch {}
    }

    (function restoreLayout() {
      try {
        const app = document.querySelector('.app');
        if (!app) return;
        const saved = localStorage.getItem('vp.sidebarCollapsed');
        // Phones: start collapsed (drawer). Desktop: expand unless user saved '1'.
        if (isMobileNav() || saved === '1') app.classList.add('sidebar-collapsed');
        else app.classList.remove('sidebar-collapsed');
        const split = document.querySelector('.split');
        const resultsCollapsed = localStorage.getItem('vp.resultsCollapsed') === '1';
        if (resultsCollapsed && split) {
          split.classList.add('results-collapsed');
        }
        const resultsBtn = document.querySelector('.icon-btn[aria-label="Toggle results"]');
        if (resultsBtn) resultsBtn.setAttribute('aria-pressed', resultsCollapsed ? 'true' : 'false');
        syncNavChrome();
        window.addEventListener('resize', () => {
          if (isMobileNav()) {
            app.classList.add('sidebar-collapsed');
          }
          syncNavChrome();
        });
      } catch {}
    })();

    /* Body-level tooltips — always above panes / overflow:hidden sidebar */
    (function initTooltips() {
      const tip = document.createElement('div');
      tip.id = 'vp-tooltip';
      tip.setAttribute('role', 'tooltip');
      document.body.appendChild(tip);
      let activeEl = null;
      let hideTimer = null;

      function shouldShow(el) {
        return !!(el && el.getAttribute('data-tip'));
      }

      function place(el) {
        const text = el.getAttribute('data-tip') || '';
        if (!text) return;
        tip.textContent = text;
        tip.classList.toggle('is-wrap', text.length > 42);
        tip.classList.add('is-visible');
        const rect = el.getBoundingClientRect();
        const pad = 10;
        const tw = tip.offsetWidth || 120;
        const th = tip.offsetHeight || 28;
        const inSidebar = !!el.closest('.sidebar');
        let left;
        let top;
        if (inSidebar) {
          left = rect.right + pad;
          top = rect.top + rect.height / 2 - th / 2;
          if (left + tw > window.innerWidth - 8) {
            left = Math.max(8, rect.left - tw - pad);
          }
        } else {
          left = rect.left + rect.width / 2 - tw / 2;
          top = rect.bottom + 8;
          if (top + th > window.innerHeight - 8) {
            top = rect.top - th - 8;
          }
          left = Math.min(Math.max(8, left), window.innerWidth - tw - 8);
        }
        top = Math.min(Math.max(8, top), window.innerHeight - th - 8);
        tip.style.left = Math.round(left) + 'px';
        tip.style.top = Math.round(top) + 'px';
      }

      function showFor(el) {
        if (!shouldShow(el)) return;
        clearTimeout(hideTimer);
        activeEl = el;
        place(el);
      }

      function hide() {
        hideTimer = setTimeout(() => {
          activeEl = null;
          tip.classList.remove('is-visible');
        }, 60);
      }

      document.addEventListener('mouseover', (e) => {
        const el = e.target && e.target.closest ? e.target.closest('[data-tip]') : null;
        if (el) showFor(el);
      });
      document.addEventListener('mouseout', (e) => {
        const el = e.target && e.target.closest ? e.target.closest('[data-tip]') : null;
        if (!el) return;
        const to = e.relatedTarget;
        if (to && el.contains(to)) return;
        hide();
      });
      document.addEventListener('focusin', (e) => {
        const el = e.target && e.target.closest ? e.target.closest('[data-tip]') : null;
        if (el) showFor(el);
      });
      document.addEventListener('focusout', () => hide());
      document.addEventListener('scroll', () => {
        if (activeEl) place(activeEl);
      }, true);
      window.addEventListener('resize', () => {
        if (activeEl) place(activeEl);
      });
    })();

    connectSse();

    function loadApiIntoClient(method, path) {
      document.getElementById('reqMethod').value = method.toUpperCase();
      document.getElementById('reqUrl').value = 'http://localhost:3000' + (path.startsWith('/') ? path : '/' + path);
      logConsole('Loaded ' + method + ' ' + path + ' into HTTP Client');
    }

    async function loadRecorderBookmarklet() {
      try {
        const res = await fetch('/api/actions/recorder-bookmarklet');
        const data = await res.json();
        const href = data?.data?.bookmarklet || data?.bookmarklet;
        const a = document.getElementById('recorderBookmarklet');
        if (a && href) {
          a.setAttribute('href', href);
          logConsole('Bookmarklet ready — drag "VeloProve Record" to your bookmarks bar');
        }
      } catch (err) {
        logConsole('✖ Could not load bookmarklet: ' + err.message);
      }
    }

    async function generateRecordedScenario() {
      let payload = {};
      try {
        const raw = document.getElementById('recPayload').value.trim();
        payload = raw ? JSON.parse(raw) : {};
      } catch {
        alert('Invalid recorded JSON');
        return;
      }
      payload.title = document.getElementById('recTitle').value || payload.title || 'Recorded scenario';
      payload.startUrl = document.getElementById('recStartUrl').value || payload.startUrl || 'http://localhost:3000';
      setResultStatus('loading', 'Generating spec…');
      try {
        const res = await fetch('/api/recorder/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        setResult(data, data.success ? undefined : 'error');
        setResultStatus(data.success ? 'ok' : 'err', data.success ? 'Spec generated' : 'Failed');
        if (data.success && data.data?.savedPath) {
          logConsole('Saved: ' + data.data.savedPath);
        }
      } catch (err) {
        setResult({ error: err.message }, 'error');
        setResultStatus('err', 'Failed');
      }
    }

    // Prefetch bookmarklet when UI loads
    loadRecorderBookmarklet();

    async function sendPostmanRequest() {
      const method = document.getElementById('reqMethod').value;
      const rawUrl = document.getElementById('reqUrl').value.trim();
      const base = (document.getElementById('apiBaseUrl')?.value || '').replace(/\\/$/, '');
      const url = /^https?:\\/\\//i.test(rawUrl) ? rawUrl : (base + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl));
      let headers = {};
      let body;
      let asserts = [];
      try {
        const hText = document.getElementById('reqHeaders').value.trim();
        if (hText) headers = JSON.parse(hText);
      } catch { alert('Invalid JSON headers'); return; }
      try {
        const aText = document.getElementById('reqAsserts')?.value?.trim();
        if (aText) asserts = JSON.parse(aText);
      } catch { alert('Invalid assertions JSON'); return; }
      const bText = document.getElementById('reqBody').value.trim();
      if (bText && method !== 'GET' && method !== 'HEAD') {
        try { body = JSON.parse(bText); } catch { body = bText; }
      }
      logConsole('Sending [' + method + '] ' + url + ' (' + (document.getElementById('apiEnv')?.value || 'local') + ')');
      try {
        const res = await fetch('/api/http-client', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method, url, headers, body, assertions: asserts })
        });
        const data = await res.json();
        const safe = maskSecretsDeep(data);
        if (data?.body?.token || data?.json?.token) {
          window.__vpLastToken = data.body?.token || data.json?.token;
        }
        if (data?.headers?.authorization || data?.requestHeaders) {
          /* keep raw out of UI */
        }
        setResult(safe);
        const assertSummary = Array.isArray(data.assertionResults)
          ? (' · asserts ' + data.assertionResults.filter(a => a.ok).length + '/' + data.assertionResults.length)
          : '';
        logConsole('✔ ' + (data.status || '') + ' in ' + (data.durationMs || '?') + 'ms' + assertSummary);
      } catch (err) {
        logConsole('✖ ' + err.message);
        setResult({ error: err.message });
      }
    }

    function maskSecretsDeep(value) {
      const secretKeys = /authorization|api[-_]?key|token|password|secret|cookie/i;
      if (Array.isArray(value)) return value.map(maskSecretsDeep);
      if (value && typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
          if (secretKeys.test(k) && typeof v === 'string') {
            out[k] = v.length > 8 ? v.slice(0, 4) + '***' + v.slice(-2) : '***';
          } else {
            out[k] = maskSecretsDeep(v);
          }
        }
        return out;
      }
      return value;
    }

    function applyApiEnv() {
      const env = document.getElementById('apiEnv').value;
      const saved = JSON.parse(localStorage.getItem('vp.apiEnvs') || '{}');
      const defaults = {
        local: 'http://localhost:3000',
        staging: 'https://staging.example.com',
        prod: 'https://api.example.com'
      };
      document.getElementById('apiBaseUrl').value = saved[env] || defaults[env] || defaults.local;
      persistApiEnv();
    }

    function persistApiEnv() {
      const env = document.getElementById('apiEnv').value;
      const base = document.getElementById('apiBaseUrl').value;
      const saved = JSON.parse(localStorage.getItem('vp.apiEnvs') || '{}');
      saved[env] = base;
      localStorage.setItem('vp.apiEnvs', JSON.stringify(saved));
    }

    function chainLastToken() {
      if (!window.__vpLastToken) {
        alert('No token captured yet. Send an auth request first.');
        return;
      }
      try {
        const headers = JSON.parse(document.getElementById('reqHeaders').value || '{}');
        headers.Authorization = 'Bearer ' + window.__vpLastToken;
        document.getElementById('reqHeaders').value = JSON.stringify(headers, null, 2);
        logConsole('Chained last token into Authorization header');
      } catch {
        alert('Could not update headers JSON');
      }
    }

    async function runLoadBenchmark() {
      const method = document.getElementById('loadMethod').value;
      const url = document.getElementById('loadUrl').value;
      const vus = parseInt(document.getElementById('loadVus').value, 10) || 10;
      const durationSec = parseInt(document.getElementById('loadDuration').value, 10) || 5;
      logConsole('Benchmarking ' + url + ' · ' + vus + ' VUs · ' + durationSec + 's');
      try {
        const res = await fetch('/api/load-test', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method, url, vus, durationSec })
        });
        const data = await res.json();
        setResult(data);
        document.getElementById('loadResultContainer').hidden = false;
        document.getElementById('metricRps').innerText = (data.requestsPerSecond || 0) + ' req/s';
        document.getElementById('metricP95').innerText = (data.latency?.p95 || 0) + ' ms';
        document.getElementById('metricErrRate').innerText = (data.errorRatePercent || 0) + '%';
        document.getElementById('metricTotalReqs').innerText = data.totalRequests || 0;
        logConsole('✔ Load test complete');
      } catch (err) {
        logConsole('✖ ' + err.message);
        setResult({ error: err.message });
      }
    }

    async function generateMockData() {
      const preset = document.getElementById('mockPreset').value;
      const count = document.getElementById('mockCount').value || 5;
      logConsole('Generating mock data: ' + preset + ' × ' + count);
      try {
        const res = await fetch('/api/mock-data?preset=' + encodeURIComponent(preset) + '&count=' + encodeURIComponent(count));
        const data = await res.json();
        setResult(data);
        logConsole('✔ Mock data ready');
      } catch (err) {
        logConsole('✖ ' + err.message);
      }
    }

    async function runOwaspScan() {
      const url = document.getElementById('owaspUrl').value;
      logConsole('OWASP scan: ' + url);
      try {
        const res = await fetch('/api/owasp-scan?url=' + encodeURIComponent(url));
        const data = await res.json();
        setResult(data);
        logConsole('✔ OWASP scan finished');
      } catch (err) {
        logConsole('✖ ' + err.message);
      }
    }

    async function generateRemoteProbeCode() {
      logConsole('Generating remote probe...');
      try {
        const res = await fetch('/api/remote/probe-init?type=standalone_js&name=LiveSite');
        const data = await res.json();
        setResult(data);
        logConsole('✔ Probe generated');
      } catch (err) { logConsole('✖ ' + err.message); }
    }

    async function connectRemoteLive() {
      const remoteUrl = document.getElementById('remoteUrl').value;
      const bridgeSecret = document.getElementById('remoteSecret').value;
      logConsole('Connecting remote: ' + remoteUrl);
      try {
        const res = await fetch('/api/remote/connect', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ remoteUrl, bridgeSecret })
        });
        const data = await res.json();
        setResult(data);
        logConsole('✔ Connect finished');
      } catch (err) { logConsole('✖ ' + err.message); }
    }

    async function auditRemoteLive() {
      const remoteUrl = document.getElementById('remoteUrl').value;
      const bridgeSecret = document.getElementById('remoteSecret').value;
      logConsole('Remote audit: ' + remoteUrl);
      try {
        const res = await fetch('/api/remote/audit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ remoteUrl, bridgeSecret, includeLoadTest: false })
        });
        const data = await res.json();
        setResult(data);
        logConsole('✔ Remote audit finished');
      } catch (err) { logConsole('✖ ' + err.message); }
    }

    let lastDocsChatAnswer = '';
    let docsChatInFlight = false;

    function syncDocsChatEmpty() {
      const out = document.getElementById('docsChatAnswer');
      const empty = document.getElementById('docsChatEmpty');
      if (!empty) return;
      const has = !!(out && String(out.textContent || '').trim());
      empty.hidden = has;
    }

    function scrollDocsChatThread() {
      const thread = document.getElementById('docsChatThread');
      if (thread) thread.scrollTop = thread.scrollHeight;
    }

    function syncDocsChatCopyBtn() {
      const btn = document.querySelector('button[onclick="copyDocsChatAnswer()"]');
      if (!btn) return;
      const has = !!(lastDocsChatAnswer && String(lastDocsChatAnswer).trim());
      btn.disabled = !has;
      btn.setAttribute('aria-disabled', has ? 'false' : 'true');
    }

    function resizeDocsChatInput() {
      const input = document.getElementById('docsChatInput');
      if (!input) return;
      const max = 160;
      input.style.height = 'auto';
      const next = Math.min(input.scrollHeight, max);
      input.style.height = next + 'px';
      input.style.overflowY = input.scrollHeight > max ? 'auto' : 'hidden';
    }

    function onDocsChatKeydown(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        askDocsChat();
      }
    }

    async function askDocsChat() {
      if (docsChatInFlight) {
        notify('warn', 'Busy', 'Wait for the current Docs Chat answer');
        return;
      }
      const input = document.getElementById('docsChatInput');
      const out = document.getElementById('docsChatAnswer');
      const askBtn = document.querySelector('button[onclick="askDocsChat()"]');
      const q = (input && input.value || '').trim();
      if (!q) {
        if (out) {
          out.className = 'docs-chat-answer muted';
          out.textContent = 'Type a question first (English only).';
        }
        syncDocsChatEmpty();
        scrollDocsChatThread();
        return;
      }
      // Docs Chat is English-only (local docs, no LLM translator)
      const letters = Array.from(q).filter(ch => /\\p{L}/u.test(ch));
      if (letters.length >= 2) {
        const latin = letters.filter(ch => /[A-Za-z]/.test(ch)).length;
        if (latin / letters.length < 0.5) {
          const msg = 'Docs Chat is English-only. It cannot understand other languages without an AI agent. Ask in English, or run Teach AI and use Cursor / Claude.';
          if (out) {
            out.className = 'docs-chat-answer is-empty-match';
            out.textContent = msg;
          }
          lastDocsChatAnswer = msg;
          syncDocsChatEmpty();
          syncDocsChatCopyBtn();
          scrollDocsChatThread();
          notify('warn', 'English only', 'Docs Chat has no AI translator — ask in English or use Teach AI + your editor.');
          return;
        }
      }
      docsChatInFlight = true;
      if (askBtn) askBtn.disabled = true;
      if (out) {
        out.className = 'docs-chat-answer muted';
        out.textContent = 'Searching packaged docs…';
      }
      syncDocsChatEmpty();
      try {
        const res = await fetch('/api/actions/ask-docs?q=' + encodeURIComponent(q));
        const wrap = await res.json();
        if (!wrap.success) {
          setResult(wrap, 'error');
          if (out) {
            out.className = 'docs-chat-answer is-empty-match';
            out.textContent = wrap.error || wrap.message || 'Docs Chat request failed.';
          }
          lastDocsChatAnswer = '';
          syncDocsChatEmpty();
          syncDocsChatCopyBtn();
          notify('err', 'Docs Chat failed', wrap.error || wrap.message || 'See results');
          return;
        }
        // Dashboard actions return { success, action, data, durationMs }
        const payload = (wrap && wrap.data && typeof wrap.data === 'object' && 'answer' in wrap.data)
          ? wrap.data
          : wrap;
        setResult(wrap);

        const answer = String(payload.answer || '').trim();
        const confidence = payload.confidence || 'none';
        const sources = Array.isArray(payload.sources) ? payload.sources : [];
        const cmds = Array.isArray(payload.suggestedCommands) ? payload.suggestedCommands : [];
        lastDocsChatAnswer = answer;

        if (out) {
          const lines = [];
          if (answer) lines.push(answer);
          if (sources.length) {
            lines.push('');
            lines.push('Sources:');
            sources.forEach(s => lines.push('• ' + (s.file || '') + (s.title ? ' — ' + s.title : '')));
          }
          if (cmds.length) {
            lines.push('');
            lines.push('Try:');
            cmds.forEach(c => lines.push('• ' + c));
          }
          out.className = 'docs-chat-answer' + (confidence === 'none' || payload.englishOnlyBlocked ? ' is-empty-match' : '');
          out.textContent = lines.join('\\n') || 'No answer returned.';
        }
        syncDocsChatEmpty();
        syncDocsChatCopyBtn();
        scrollDocsChatThread();

        if (payload.englishOnlyBlocked) {
          notify('warn', 'English only', 'Docs Chat cannot understand other languages — ask in English or use Teach AI + your editor.');
        }
        resizeDocsChatInput();
      } catch (err) {
        if (out) {
          out.className = 'docs-chat-answer muted';
          out.textContent = '';
        }
        lastDocsChatAnswer = '';
        syncDocsChatEmpty();
        syncDocsChatCopyBtn();
        notify('err', 'Docs Chat failed', err.message);
      } finally {
        docsChatInFlight = false;
        if (askBtn) askBtn.disabled = false;
      }
    }

    function copyDocsChatAnswer() {
      const text = lastDocsChatAnswer || (document.getElementById('docsChatAnswer')?.textContent || '');
      if (!String(text || '').trim()) {
        notify('warn', 'Nothing to copy', 'Ask a question first.');
        return;
      }
      navigator.clipboard.writeText(text).then(() => logConsole('✔ Copied Docs Chat answer')).catch(err => notify('err', 'Copy failed', err.message));
    }

    // Initial Docs Chat composer height once DOM is ready
    queueMicrotask(() => {
      resizeDocsChatInput();
      syncDocsChatCopyBtn();
    });

    function filterGuide() {
      const input = (document.getElementById('guideSearchInput').value || '').toLowerCase();
      document.querySelectorAll('.guide-item').forEach(sec => {
        sec.style.display = sec.innerText.toLowerCase().includes(input) ? 'block' : 'none';
      });
    }

    const FLOW_KEY = 'vp.apiFlow';
    window.__vpFlowVars = window.__vpFlowVars || {};

    function loadApiFlow() {
      try { return JSON.parse(localStorage.getItem(FLOW_KEY) || '[]'); } catch { return []; }
    }

    function saveApiFlow(steps) {
      localStorage.setItem(FLOW_KEY, JSON.stringify(steps));
      renderApiFlow();
    }

    function renderApiFlow() {
      const el = document.getElementById('apiFlowList');
      if (!el) return;
      const steps = loadApiFlow();
      el.replaceChildren();
      if (!steps.length) {
        el.className = 'stack muted';
        el.textContent = 'No steps yet — send a request and click Add to Flow.';
        return;
      }
      el.className = 'stack';
      steps.forEach((s, i) => {
        const row = document.createElement('div');
        row.className = 'row';
        row.style.cssText = 'justify-content:space-between;border-bottom:1px solid var(--border-soft);padding:8px 0';
        const left = document.createElement('div');
        const num = document.createElement('strong');
        num.textContent = '#' + (i + 1) + ' ';
        const method = document.createElement('span');
        method.className = 'method';
        method.textContent = String(s.method || '');
        const path = document.createElement('code');
        path.textContent = ' ' + String(s.path || '');
        left.appendChild(num);
        left.appendChild(method);
        left.appendChild(path);
        if (s.extract) {
          const ext = document.createElement('span');
          ext.className = 'muted';
          ext.textContent = ' → ' + String(s.extract);
          left.appendChild(ext);
        }
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'btn ghost sm';
        rm.textContent = 'Remove';
        rm.addEventListener('click', () => removeApiFlowStep(i));
        row.appendChild(left);
        row.appendChild(rm);
        el.appendChild(row);
      });
    }

    function addCurrentToFlow() {
      const steps = loadApiFlow();
      steps.push({
        method: document.getElementById('reqMethod').value,
        path: document.getElementById('reqUrl').value.trim(),
        headers: document.getElementById('reqHeaders').value,
        body: document.getElementById('reqBody').value,
        assertions: document.getElementById('reqAsserts').value,
        extract: (document.getElementById('reqExtract')?.value || '').trim()
      });
      saveApiFlow(steps);
      logConsole('Added step #' + steps.length + ' to multi-step flow');
    }

    function removeApiFlowStep(idx) {
      const steps = loadApiFlow();
      steps.splice(idx, 1);
      saveApiFlow(steps);
    }

    function clearApiFlow() {
      saveApiFlow([]);
      window.__vpFlowVars = {};
      logConsole('Cleared multi-step flow');
    }

    function substituteFlowVars(text, vars) {
      return String(text || '').replace(/\\{\\{([a-zA-Z0-9_]+)\\}\\}/g, (_, k) =>
        vars[k] !== undefined ? String(vars[k]) : '{{' + k + '}}'
      );
    }

    function getByJsonPath(obj, pathExpr) {
      if (!pathExpr) return undefined;
      const parts = pathExpr.replace(/^\\$\\.?/, '').split('.').filter(Boolean);
      let cur = obj;
      for (const p of parts) {
        if (cur == null) return undefined;
        cur = cur[p];
      }
      return cur;
    }

    async function runApiFlow() {
      const steps = loadApiFlow();
      if (!steps.length) { alert('Add at least one step to the flow'); return; }
      const vars = { ...(window.__vpFlowVars || {}) };
      if (window.__vpLastToken) vars.auth = window.__vpLastToken;
      const base = (document.getElementById('apiBaseUrl')?.value || '').replace(/\\/$/, '');
      const results = [];
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const rawUrl = substituteFlowVars(s.path, vars).trim();
        const url = /^https?:\\/\\//i.test(rawUrl) ? rawUrl : (base + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl));
        let headers = {};
        let body;
        let asserts = [];
        try { headers = JSON.parse(substituteFlowVars(s.headers || '{}', vars)); } catch { headers = {}; }
        try { asserts = JSON.parse(substituteFlowVars(s.assertions || '[]', vars)); } catch { asserts = []; }
        const bText = substituteFlowVars(s.body || '', vars).trim();
        if (bText && s.method !== 'GET' && s.method !== 'HEAD') {
          try { body = JSON.parse(bText); } catch { body = bText; }
        }
        logConsole('Flow #' + (i + 1) + ' [' + s.method + '] ' + url);
        try {
          const res = await fetch('/api/http-client', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: s.method, url, headers, body, assertions: asserts })
          });
          const data = await res.json();
          if (data?.body?.token || data?.json?.token) {
            window.__vpLastToken = data.body?.token || data.json?.token;
            vars.auth = window.__vpLastToken;
          }
          if (s.extract) {
            const m = s.extract.match(/^(\\$[\\w.]+)\\s*(?:→|->|=)\\s*([a-zA-Z0-9_]+)$/) ||
              s.extract.match(/^([a-zA-Z0-9_]+)\\s*(?:←|from)\\s*(\\$[\\w.]+)$/);
            let pathExpr = null; let varName = null;
            if (m && m[1].startsWith('$')) { pathExpr = m[1]; varName = m[2]; }
            else if (m) { varName = m[1]; pathExpr = m[2]; }
            else if (s.extract.startsWith('$.')) {
              pathExpr = s.extract; varName = s.extract.split('.').pop();
            }
            if (pathExpr && varName) {
              const extracted = getByJsonPath(data.json || data.body || data, pathExpr);
              if (extracted !== undefined) {
                vars[varName] = extracted;
                logConsole('Captured {{' + varName + '}} from ' + pathExpr);
              }
            }
          }
          results.push({ step: i + 1, ok: true, status: data.status, durationMs: data.durationMs });
        } catch (err) {
          results.push({ step: i + 1, ok: false, error: err.message });
          logConsole('✖ Flow step #' + (i + 1) + ' failed: ' + err.message);
          break;
        }
      }
      window.__vpFlowVars = vars;
      setResult({ flowResults: results, vars: maskSecretsDeep(vars) });
      logConsole('Flow finished · ' + results.filter(r => r.ok).length + '/' + steps.length + ' ok');
    }

    function exportApiFlowCollection() {
      const steps = loadApiFlow();
      const base = document.getElementById('apiBaseUrl')?.value || 'http://localhost:3000';
      const collection = {
        info: { name: 'VeloProve API Flow', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
        item: steps.map((s, i) => ({
          name: 'Step ' + (i + 1) + ' ' + s.method + ' ' + s.path,
          request: {
            method: s.method,
            header: [],
            url: /^https?:\\/\\//i.test(s.path) ? s.path : (base.replace(/\\/$/, '') + (s.path.startsWith('/') ? s.path : '/' + s.path)),
            body: s.body ? { mode: 'raw', raw: s.body } : undefined
          }
        }))
      };
      const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'veloprove-api-flow.postman.json';
      a.click();
      URL.revokeObjectURL(a.href);
      logConsole('Exported flow as Postman collection (' + steps.length + ' steps)');
    }

    renderApiFlow();
`;
}
