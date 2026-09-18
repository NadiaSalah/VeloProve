async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

document.getElementById('btnDump').addEventListener('click', async () => {
  const tab = await activeTab();
  if (!tab?.id) return;
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => (typeof window.__vpDump === 'function' ? window.__vpDump() : null)
  });
  const status = document.getElementById('status');
  if (!result) {
    status.textContent = 'Recorder not active on this page — reload and try again.';
    return;
  }
  status.textContent = `Copied ${result.steps?.length || 0} steps. Paste into VeloProve Dashboard → Recorder.`;
});

document.getElementById('btnCount').addEventListener('click', async () => {
  const tab = await activeTab();
  if (!tab?.id) return;
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => (Array.isArray(window.__vpSteps) ? window.__vpSteps.length : 0)
  });
  document.getElementById('status').textContent = `Steps captured: ${result}`;
});
