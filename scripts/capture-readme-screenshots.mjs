/**
 * One-shot README screenshot capture (Playwright).
 * Usage: node scripts/capture-readme-screenshots.mjs
 * Requires Dashboard on http://127.0.0.1:4177
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'docs', 'assets', 'screenshots');
const base = process.env.VP_UI_URL || 'http://127.0.0.1:4177/';

async function prepareLayout(page) {
  await page.evaluate(() => {
    document.querySelector('.app')?.classList.remove('sidebar-collapsed');
    document.querySelector('.split')?.classList.remove('results-collapsed');
    localStorage.setItem('vp.sidebarCollapsed', '0');
    localStorage.setItem('vp.resultsCollapsed', '0');
    document.querySelector('.icon-btn[aria-label="Toggle sidebar"]')?.setAttribute('aria-pressed', 'false');
    document.querySelector('.icon-btn[aria-label="Toggle results"]')?.setAttribute('aria-pressed', 'false');
  });
}

async function fillResults(page, payload, logs) {
  await page.evaluate(
    ({ payload, logs }) => {
      const rb = document.getElementById('resultBox');
      const cb = document.getElementById('consoleBox');
      const status = document.getElementById('resultStatus');
      if (rb) rb.textContent = JSON.stringify(payload, null, 2);
      if (cb) {
        cb.innerHTML = logs.map((l) => `<div class="log-line">${l}</div>`).join('');
      }
      if (status) {
        status.textContent = 'Done';
        status.className = 'status-pill ok';
      }
    },
    { payload, logs }
  );
}

async function shot(page, name) {
  await prepareLayout(page);
  await page.waitForTimeout(200);
  const file = path.join(outDir, name);
  await page.screenshot({
    path: file,
    type: 'png',
    fullPage: false,
    animations: 'disabled'
  });
  const stat = fs.statSync(file);
  console.log(`✔ ${name} (${stat.size} bytes)`);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome' // use installed Google Chrome (no browser download)
  });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.app', { timeout: 15000 });
  await prepareLayout(page);

  // Overview
  await page.evaluate(() => {
    if (typeof selectNav === 'function') selectNav('overview');
  });
  await prepareLayout(page);
  await fillResults(
    page,
    {
      operation: 'doctor',
      verdict: 'HEALTHY',
      passedCount: 6,
      failedCount: 0,
      runners: ['node:test']
    },
    ['✔ Doctor HEALTHY — 6 passed / 0 failed', '✔ Runners: node:test', '▶ Workspace ready for verify']
  );
  await shot(page, '01-dashboard-overview.png');

  // Verify
  await page.evaluate(() => {
    if (typeof selectNav === 'function') selectNav('verify');
  });
  await prepareLayout(page);
  await fillResults(
    page,
    {
      operation: 'verify',
      status: 'SUCCESS',
      verdict: 'READY',
      score: 100,
      passed: 2,
      failed: 0
    },
    ['✔ Verify PASS in 494ms', '✔ 2/2 passed · release READY 100/100']
  );
  await shot(page, '02-dashboard-verify.png');

  // Docs Chat — force Results open (UI may collapse it)
  await page.evaluate(() => {
    if (typeof selectNav === 'function') selectNav('docs-chat');
  });
  await prepareLayout(page);
  await page.waitForTimeout(300);
  const qSel = '[aria-label="Docs Chat question"]';
  await page.waitForSelector(qSel, { timeout: 5000 });
  await page.fill(qSel, 'How do I verify my changes?');
  await page.click('button:has-text("Ask")').catch(async () => {
    await page.evaluate(() => {
      if (typeof askDocsChat === 'function') askDocsChat();
    });
  });
  await page.waitForTimeout(1200);
  await prepareLayout(page);
  await fillResults(
    page,
    {
      ask: 'How do I verify my changes?',
      mode: 'packaged-docs',
      sources: ['docs/AGENTS.md', 'docs/guides/faq.md']
    },
    ['✔ Docs Chat answered from packaged markdown', 'ℹ No cloud LLM']
  );
  await shot(page, '03-dashboard-docs-chat.png');

  await browser.close();
  console.log('Done →', outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
