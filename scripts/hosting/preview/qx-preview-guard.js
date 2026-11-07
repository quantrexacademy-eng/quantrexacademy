/* STAGING-ONLY (preview channel qx-review-20261107). Not part of production. */
(function(){
  var BLOCK=/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebaseio\.com|cloudfunctions\.net|(^|\/\/)storage\.googleapis\.com|apis\.google\.com|www\.googleapis\.com|razorpay|recaptcha|firebaseinstallations|fcmregistrations|(^|\/\/[^\/]+)\/api\//i;
  function bad(u){try{return BLOCK.test(String(u&&u.url||u||""));}catch(e){return false;}}
  window.QX_PREVIEW_GUEST=true;
  /* qa3: no service worker / caches in the preview, so the patched runtime is always fetched fresh */
  try{if(navigator.serviceWorker){navigator.serviceWorker.register=function(){return Promise.reject(new Error("Service worker disabled in QA preview"));};
    if(navigator.serviceWorker.getRegistrations)navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});});}
    if(window.caches&&caches.keys)caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k);});});}catch(e){}
  try{var st=document.createElement("style");st.textContent="#qxUpdateBar,.qx-update-bar{display:none!important}";(document.head||document.documentElement).appendChild(st);}catch(e){}
  var of=window.fetch;
  if(of){window.fetch=function(u,o){if(bad(u)){console.warn("[QA preview] blocked",String(u&&u.url||u));return Promise.reject(new TypeError("Blocked in QA preview (guest mode)"));}return of.apply(this,arguments);};}
  var xo=XMLHttpRequest.prototype.open,xs=XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open=function(m,u){this.__qxb=bad(u);return xo.apply(this,arguments);};
  XMLHttpRequest.prototype.send=function(){if(this.__qxb){var x=this;setTimeout(function(){try{x.dispatchEvent(new Event("error"));}catch(e){}},0);return;}return xs.apply(this,arguments);};
  if(navigator.sendBeacon){var sb=navigator.sendBeacon.bind(navigator);navigator.sendBeacon=function(u,d){return bad(u)?false:sb(u,d);};}
  if(window.WebSocket){var W=window.WebSocket;var GW=function(u,p){if(bad(u))throw new Error("Blocked in QA preview");return p?new W(u,p):new W(u);};GW.prototype=W.prototype;["CONNECTING","OPEN","CLOSING","CLOSED"].forEach(function(k){try{Object.defineProperty(GW,k,{value:W[k]});}catch(e){}});window.WebSocket=GW;}
  /* external navigation: cross-origin links and window.open are disabled with a clear message.
     Cannot stop a script doing location.assign/href=..., so this is NOT full isolation. */
  function qaMsg(u){try{console.warn("[QA preview] external navigation disabled",u);var m=document.getElementById("qxPreviewNav");if(!m){m=document.createElement("div");m.id="qxPreviewNav";m.setAttribute("role","status");m.style.cssText="position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;background:#7a1f00;color:#fff;font:13px system-ui,sans-serif;padding:8px 10px;border-radius:8px";document.body.appendChild(m);}m.textContent="QA preview: external navigation is not allowed here ("+String(u).slice(0,80)+"). Stay in the preview.";}catch(e){}}
  function xo2(u){try{return new URL(u,location.href).origin!==location.origin;}catch(e){return false;}}
  document.addEventListener("click",function(ev){var a=ev.target&&ev.target.closest&&ev.target.closest("a[href]");if(a&&xo2(a.href)){ev.preventDefault();ev.stopPropagation();qaMsg(a.href);}},true);
  var wo=window.open;window.open=function(u){if(u&&xo2(u)){qaMsg(u);return null;}return wo.apply(window,arguments);};
  if(window.EventSource){var ES=window.EventSource;window.EventSource=function(u,o){if(bad(u))throw new Error("Blocked in QA preview");return new ES(u,o);};}
  try{var d=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,"src");Object.defineProperty(HTMLScriptElement.prototype,"src",{get:d.get,set:function(v){if(bad(v)){console.warn("[QA preview] blocked script",v);return;}d.set.call(this,v);},configurable:true});}catch(e){}
  function banner(){if(document.getElementById("qxPreviewBanner"))return;var b=document.createElement("div");b.id="qxPreviewBanner";b.setAttribute("role","note");
    b.style.cssText="position:sticky;top:0;z-index:2147483647;background:#7a1f00;color:#fff;font:12px/1.35 system-ui,sans-serif;padding:6px 10px;";
    b.innerHTML="<b>QA PREVIEW (expires in 2 days) — not the live site.</b> Guest mode: login/OTP, saving, payments, functions and live feed are blocked. External navigation is not allowed — stay in the preview (a script redirect can still leave; not fully isolated). "+
    "Service worker + update bar disabled here. Sampled data only: JEE Main Maths — Trigonometric Ratios &amp; Identities, Trigonometric Equations, Limits; JEE Main Physics — Capacitance; NEET Botany — Anatomy of Flowering Plants; NEET Chemistry — Biomolecules; Board — Reproductive Health; AP EAMCET Maths — Trigonometric Ratios &amp; Identities (10 added solutions are labelled Quantrex Explanation, not official); Test series: Units &amp; Measurement Test-1, Trigonometric Ratio Test-1; Archive catalogue. Other chapters/tests will not load here. "+
    "<button type=button style='margin-left:6px' onclick='this.parentNode.remove()'>Hide</button>";
    document.body.insertBefore(b,document.body.firstChild);}
  if(document.body)banner();else document.addEventListener("DOMContentLoaded",banner);
})();
