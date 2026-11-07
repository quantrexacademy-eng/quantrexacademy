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
