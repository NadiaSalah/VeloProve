/* Same probe logic as src/application/recorder-probe.ts — keep in sync when changing capture rules. */
(function () {
  if (window.__vpRec) return;
  window.__vpRec = true;
  window.__vpSteps = [];
  function roleOf(el) {
    var r = el.getAttribute && el.getAttribute('role');
    if (r) return r;
    var t = (el.tagName || '').toLowerCase();
    if (t === 'button' || t === 'a') return t === 'a' ? 'link' : 'button';
    if (t === 'input' || t === 'textarea') return 'textbox';
    if (t === 'select') return 'combobox';
    return null;
  }
  function nameOf(el) {
    return (
      (el.getAttribute &&
        (el.getAttribute('aria-label') || el.getAttribute('name') || el.getAttribute('placeholder'))) ||
      (el.innerText || '').trim().slice(0, 80) ||
      null
    );
  }
  function push(step) {
    window.__vpSteps.push(step);
    console.log('[VeloProve]', step);
  }
  push({ type: 'navigate', url: location.href, description: 'Start URL' });
  document.addEventListener(
    'click',
    function (e) {
      var el = e.target;
      if (!el) return;
      push({
        type: 'click',
        role: roleOf(el),
        name: nameOf(el),
        selector: el.id ? '#' + el.id : undefined,
        description: 'click'
      });
    },
    true
  );
  document.addEventListener(
    'change',
    function (e) {
      var el = e.target;
      if (!el) return;
      push({
        type: el.tagName === 'SELECT' ? 'select' : 'fill',
        role: roleOf(el),
        name: nameOf(el),
        value: el.value,
        selector: el.id ? '#' + el.id : undefined
      });
    },
    true
  );
  window.__vpDump = function () {
    var payload = {
      title: document.title || 'Recorded scenario',
      startUrl: location.href,
      steps: window.__vpSteps
    };
    var text = JSON.stringify(payload, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        console.log('[VeloProve] Copied ' + window.__vpSteps.length + ' steps');
      });
    }
    return payload;
  };
})();
