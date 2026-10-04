/* qxmd309: phone toolbar overflow -> Settings > Tools (unified pattern).
   CSS (qx-layout-lock.css) hides low-priority toolbar buttons at <=440px so the bar fits with no sideways scroll.
   Practice/chapter tools are already proxied in Settings > Tools; this adds the test-only ones
   (Print, Proctor, Instructions, Paper) to the test Settings popover. Each proxy clicks the real button. */
(function () {
  "use strict";
  if (window.__qxToolOverflow309) return;
  window.__qxToolOverflow309 = true;
  var EXTRA = [
    /* qxmd311: Print is owned by qx-print.js (one Print entry in Settings > Tools everywhere) */
    { id: "qzrrProctorBtn", label: "Proctor" },
    { id: "qzrrInstrBtn", label: "Instructions" },
    { id: "qzrrPaperBtn", label: "Paper" }
  ];
  function hidden(el) {
    try { return !el.getClientRects().length || getComputedStyle(el).display === "none"; } catch (_) { return false; }
  }
  function augment(pop) {
    var row = pop.querySelector(".eg-vs-tools");
    if (!row) return;
    EXTRA.forEach(function (it) {
      var tgt = document.getElementById(it.id);
      var have = row.querySelector('[data-qx-ov="' + it.id + '"]');
      var want = !!(tgt && hidden(tgt));
      if (want && !have) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("data-qx-ov", it.id);
        b.textContent = it.label;
        b.addEventListener("click", function (e) {
          e.preventDefault(); e.stopPropagation();
          var t = document.getElementById(it.id);
          var gear = document.getElementById("egFmtBtn");
          if (document.getElementById("egFmtPop") && gear) { try { gear.click(); } catch (_) {} }
          var p = document.getElementById("egFmtPop"); if (p) { try { p.remove(); } catch (_) {} }
          setTimeout(function () { if (t) { try { t.click(); } catch (_) {} } }, 60);
        });
        row.appendChild(b);
      } else if (!want && have) {
        have.remove();
      }
    });
  }
  var queued = false, calls = 0, winStart = 0;
  function run() {
    queued = false;
    var now = Date.now();
    if (now - winStart > 1000) { winStart = now; calls = 0; }
    if (++calls > 30) return; /* loop breaker */
    var pop = document.getElementById("egFmtPop");
    if (pop) augment(pop);
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(run); } }
  function start() {
    try { new MutationObserver(queue).observe(document.body, { childList: true, subtree: true }); } catch (_) {}
    queue();
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
