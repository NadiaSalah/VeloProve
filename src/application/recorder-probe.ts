/**
 * Shared recorder probe used by the bookmarklet and Chrome extension.
 * Captures clicks/fills into window.__vpSteps and dumps JSON via window.__vpDump().
 */
export function getRecorderProbeSource(dashboardHint = 'VeloProve Dashboard → Recorder'): string {
  return `(function(){
  if(window.__vpRec){alert('VeloProve recorder already active');return;}
  window.__vpRec=true;window.__vpSteps=[];
  function roleOf(el){var r=el.getAttribute&&el.getAttribute('role');if(r)return r;var t=(el.tagName||'').toLowerCase();if(t==='button'||t==='a')return t==='a'?'link':'button';if(t==='input'||t==='textarea')return 'textbox';if(t==='select')return 'combobox';return null;}
  function nameOf(el){return (el.getAttribute&&(el.getAttribute('aria-label')||el.getAttribute('name')||el.getAttribute('placeholder')))||(el.innerText||'').trim().slice(0,80)||null;}
  function push(step){window.__vpSteps.push(step);console.log('[VeloProve]',step);}
  push({type:'navigate',url:location.href,description:'Start URL'});
  document.addEventListener('click',function(e){var el=e.target;if(!el)return;push({type:'click',role:roleOf(el),name:nameOf(el),selector:el.id?('#'+el.id):undefined,description:'click'});},true);
  document.addEventListener('change',function(e){var el=e.target;if(!el)return;var v=el.value;push({type:el.tagName==='SELECT'?'select':'fill',role:roleOf(el),name:nameOf(el),value:v,selector:el.id?('#'+el.id):undefined});},true);
  window.__vpDump=function(){var payload={title:document.title||'Recorded scenario',startUrl:location.href,steps:window.__vpSteps};var text=JSON.stringify(payload,null,2);if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){alert('Copied '+window.__vpSteps.length+' steps. Paste into ${dashboardHint}.');});}else{prompt('Copy recorded JSON',text);};return payload;};
  alert('VeloProve recorder ON. Interact with the page, then run window.__vpDump() or use the extension popup Dump button.');
})();`;
}
