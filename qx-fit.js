/* qx-fit (qxmd392): event-driven, no timers. Writes the real visible viewport height to
   --qx-vh (100dvh is taller than the visible area in the Android WebView / with nav bars).
   Layout itself lives in assets/qxmd392-layout.css. No content change. */
(function(){
  var raf=0, de=document.documentElement;
  function fit(){
    raf=0;
    var vv=window.visualViewport, h=Math.round(vv?vv.height:window.innerHeight);
    if(h>200) de.style.setProperty('--qx-vh',h+'px');
  }
  function q(){ if(!raf) raf=requestAnimationFrame(fit); }
  window.addEventListener('resize',q,{passive:true});
  window.addEventListener('orientationchange',function(){ q(); setTimeout(q,300); });
  if(window.visualViewport) visualViewport.addEventListener('resize',q,{passive:true});
  window.addEventListener('pageshow',q);
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) q(); });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',q); else q();
})();
/* qxmd392: Question View Settings panel a11y - aria-expanded, focus into panel on open,
   Escape closes via the panel's own close button, focus returns to the gear. Event-driven only. */
(function(){
  function pop(){ return document.getElementById('egFmtPop'); }
  function open(p){ if(!p||p.hidden) return false; var cs=getComputedStyle(p); return cs.display!=='none'&&cs.visibility!=='hidden'; }
  function sync(focusIn){
    var b=document.getElementById('egFmtBtn'), p=pop(); if(!b) return;
    var o=open(p); b.setAttribute('aria-expanded',o?'true':'false'); if(p) b.setAttribute('aria-controls','egFmtPop');
    if(o&&focusIn&&p&&!p.contains(document.activeElement)){
      var f=p.querySelector('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'); if(f) try{f.focus({preventScroll:true});}catch(_){}
    }
  }
  document.addEventListener('click',function(e){
    var t=e.target&&e.target.closest?e.target.closest('#egFmtBtn,#egFmtClose'):null;
    if(t) setTimeout(function(){ sync(t.id==='egFmtBtn'); if(t.id==='egFmtClose'){ var b=document.getElementById('egFmtBtn'); if(b) try{b.focus({preventScroll:true});}catch(_){} } },0);
  },true);
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape') return; var p=pop(); if(!open(p)) return;
    var c=document.getElementById('egFmtClose'); if(!c) return;
    e.preventDefault(); c.click();
    setTimeout(function(){ sync(false); var b=document.getElementById('egFmtBtn'); if(b) try{b.focus({preventScroll:true});}catch(_){} },0);
  });
})();
/* qxmd392c: practice "Question View Settings" (#pracViewPanel, allen-test-ui.js) - same a11y:
   focus moves into the panel on open, Escape closes it, focus returns to the gear (#pracViewMenuBtn). */
(function(){
  function P(){ return document.getElementById('pracViewPanel'); }
  function B(){ return document.getElementById('pracViewMenuBtn'); }
  function isOpen(p){ return !!p && !p.hasAttribute('hidden'); }
  function focusBtn(){ var b=B(); if(b) try{b.focus({preventScroll:true});}catch(_){} }
  document.addEventListener('click',function(e){
    var t=e.target&&e.target.closest?e.target.closest('#pracViewMenuBtn,#pracViewClose'):null; if(!t) return;
    setTimeout(function(){
      var p=P();
      if(t.id==='pracViewMenuBtn'&&isOpen(p)&&!p.contains(document.activeElement)){
        var f=p.querySelector('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'); if(f) try{f.focus({preventScroll:true});}catch(_){}
      }
      if(t.id==='pracViewClose') focusBtn();
    },0);
  },true);
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape') return; var p=P(); if(!isOpen(p)) return;
    e.preventDefault(); p.setAttribute('hidden','');
    var b=B(); if(b) b.setAttribute('aria-expanded','false');
    focusBtn();
  });
})();
