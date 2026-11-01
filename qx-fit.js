/* qx-fit (qxmd391): practice/test screen fits the real visible viewport on phones and the Android WebView.
   100dvh can be taller than the visible area (nav bar, WebView), so the bottom of the question and solution
   ended up under the Prev/Check/Next footer. Layout only, no content change. */
(function(){
  function fit(){
    var r=document.querySelector('.eg-test-root');
    if(!r) return;
    var vv=window.visualViewport, h=Math.round(vv?vv.height:window.innerHeight);
    if(h>200){ r.style.setProperty('height',h+'px','important'); r.style.setProperty('max-height',h+'px','important'); }
    var b=r.querySelector('.eg-body,.mtk-body'), f=r.querySelector('.eg-foot,.eg-footer,.mtk-foot,.mtk-footer,footer');
    if(b){ var fh=f?f.getBoundingClientRect().height:0; b.style.setProperty('padding-bottom',Math.max(140,Math.round(fh)+48)+'px','important'); }
  }
  window.addEventListener('resize',fit); if(window.visualViewport) visualViewport.addEventListener('resize',fit);
  window.addEventListener('orientationchange',function(){setTimeout(fit,300);});
  setInterval(fit,700); document.addEventListener('DOMContentLoaded',fit);
})();