/**
 * Quantrex fast question open — Marks-like snappiness
 * - IndexedDB cache for chapter banks (data/banks/chapters/…)
 * - Prefetch next N question bodies + first figure priority
 * - Timing logs: [qx-q-fast]
 * Additive. No payment / bank deletes. Wraps loadChapterBank when present.
 */
(function (global) {
  "use strict";

  var VERSION = "qxfst1";
  var IDB_NAME = "qx_chapter_banks_v1";
  var IDB_STORE = "chapters";
  var IDB_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  var _dbp = null;
  var _wrapDone = false;
  var _prefetchBusy = Object.create(null);

  function mark(label, t0) {
    try {
      var ms = t0 != null ? (performance.now() - t0).toFixed(1) : "";
      console.log("[qx-q-fast]", label, ms ? ms + "ms" : "");
    } catch (_) { /* */ }
  }

  function openDb() {
    if (_dbp) return _dbp;
    if (!global.indexedDB) {
      _dbp = Promise.resolve(null);
      return _dbp;
    }
    _dbp = new Promise(function (resolve) {
      try {
        var req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE, { keyPath: "key" });
          }
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { resolve(null); };
      } catch (_) {
        resolve(null);
      }
    });
    return _dbp;
  }

  function idbGet(key) {
    return openDb().then(function (db) {
      if (!db) return null;
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(IDB_STORE, "readonly");
          var req = tx.objectStore(IDB_STORE).get(key);
          req.onsuccess = function () {
            var row = req.result;
            if (!row || !row.t || Date.now() - row.t > IDB_TTL_MS) return resolve(null);
            resolve(row.data || null);
          };
          req.onerror = function () { resolve(null); };
        } catch (_) {
          resolve(null);
        }
      });
    });
  }

  function idbSet(key, data) {
    return openDb().then(function (db) {
      if (!db || !data) return;
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(IDB_STORE, "readwrite");
          tx.objectStore(IDB_STORE).put({ key: key, t: Date.now(), data: data });
          tx.oncomplete = function () { resolve(); };
          tx.onerror = function () { resolve(); };
        } catch (_) {
          resolve();
        }
      });
    });
  }

  function chapterKey(slug, subject, chapter) {
    return [slug, subject, chapter].map(function (x) {
      return String(x || "").toLowerCase().trim();
    }).join("\0");
  }

  function wrapLoadChapterBank() {
    if (_wrapDone) return;
    if (typeof global.loadChapterBank !== "function") return;
    if (global.loadChapterBank.__qxFastWrapped) {
      _wrapDone = true;
      return;
    }
    var orig = global.loadChapterBank;
    async function wrapped(slug, subject, chapter) {
      var t0 = performance.now();
      var key = chapterKey(slug, subject, chapter);
      // Memory first (orig already checks getChapterQuestions)
      try {
        if (typeof global.getChapterQuestions === "function") {
          var mem = global.getChapterQuestions(slug, subject, chapter);
          if (mem && mem.length) {
            mark("chapter-mem " + slug, t0);
            return mem;
          }
        }
      } catch (_) { /* */ }
      // IndexedDB
      try {
        var cached = await idbGet(key);
        if (cached && cached.questions && cached.questions.length) {
          mark("chapter-idb-hit " + slug, t0);
          // Merge into QUESTIONS like loadChapterBank would
          try {
            var raw = cached.questions;
            var have = Object.create(null);
            if (typeof QUESTIONS !== "undefined") {
              for (var i = 0; i < QUESTIONS.length; i++) {
                var ex = QUESTIONS[i];
                if (ex && ex._bank === slug && ex.id != null) have[String(ex.id)] = true;
              }
              var add = [];
              for (var j = 0; j < raw.length; j++) {
                var q = raw[j];
                if (!q || (q.id != null && have[String(q.id)])) continue;
                q._bank = slug;
                add.push(q);
              }
              if (add.length) {
                QUESTIONS = QUESTIONS.concat(add);
                for (var k = 0; k < add.length; k++) {
                  if (typeof global._qxIndexQuestion === "function") global._qxIndexQuestion(add[k]);
                }
              }
              if (typeof global.getChapterQuestions === "function") {
                var sliced = global.getChapterQuestions(slug, subject, chapter);
                if (sliced && sliced.length) return sliced;
              }
            }
            return raw;
          } catch (e) {
            console.warn("[qx-q-fast] idb merge fail", e);
          }
        }
      } catch (_) { /* */ }

      var result = await orig.apply(this, arguments);
      mark("chapter-net " + slug, t0);
      try {
        if (result && result.length) {
          idbSet(key, { questions: result, subject: subject, chapter: chapter, slug: slug });
        }
      } catch (_) { /* */ }
      return result;
    }
    wrapped.__qxFastWrapped = true;
    global.loadChapterBank = wrapped;
    _wrapDone = true;
    mark("wrapped loadChapterBank");
  }

  function prioritizeFirstFigure(root) {
    var scope = root || document.getElementById("app-main") || document;
    try {
      var imgs = scope.querySelectorAll(
        ".mtk-q-text img, .qx-prac-q img, #qxDiagramSlot img, .qx-diagram-slot img, .eg-q-card img, .qx-pool-fig"
      );
      var first = true;
      imgs.forEach(function (img) {
        if (!img) return;
        img.decoding = "async";
        if (first) {
          first = false;
          img.loading = "eager";
          try { img.fetchPriority = "high"; } catch (_) { /* */ }
        } else {
          if (!img.getAttribute("loading")) img.loading = "lazy";
          try { if (!img.fetchPriority) img.fetchPriority = "low"; } catch (_) { /* */ }
        }
      });
    } catch (_) { /* */ }
  }

  function prefetchNextQuestions() {
    try {
      var ids = null;
      var idx = 0;
      if (global._qxPracticeCtx && global._qxPracticeCtx.ids) {
        ids = global._qxPracticeCtx.ids;
        idx = global._qxPracticeCtx.idx || 0;
      } else if (global.session && global.session.ids) {
        ids = global.session.ids;
        idx = global.session.idx || 0;
      }
      if (!ids || !ids.length) return;
      var near = [];
      for (var d = 1; d <= 3; d++) {
        if (idx + d < ids.length) near.push(ids[idx + d]);
        if (idx - d >= 0 && d === 1) near.push(ids[idx - d]);
      }
      near = near.filter(function (id) {
        var k = String(id);
        if (_prefetchBusy[k]) return false;
        _prefetchBusy[k] = true;
        return true;
      }).slice(0, 4);
      if (!near.length) return;
      var t0 = performance.now();
      var jobs = [];
      if (typeof global.MarksLive !== "undefined" && global.MarksLive.prefetchQuestions) {
        jobs.push(global.MarksLive.prefetchQuestions(near));
      }
      if (typeof global.QxQuestionCache !== "undefined" && global.QxQuestionCache.loadQuestionFast) {
        near.forEach(function (id) {
          jobs.push(global.QxQuestionCache.loadQuestionFast(id).catch(function () { return null; }));
        });
      }
      Promise.all(jobs).then(function () {
        mark("prefetch-next n=" + near.length, t0);
      }).catch(function () {});
      if (typeof global.QxTestEnginePerf !== "undefined" && global.QxTestEnginePerf.prefetchWindow) {
        try {
          global.QxTestEnginePerf.prefetchWindow(ids, idx, typeof global.getQ === "function" ? global.getQ : null);
        } catch (_) { /* */ }
      }
    } catch (_) { /* */ }
  }

  function onQuestionPaint() {
    var t0 = performance.now();
    prioritizeFirstFigure();
    if (typeof global.QxPerf !== "undefined" && global.QxPerf.lazyImages) {
      try { global.QxPerf.lazyImages(document.getElementById("app-main")); } catch (_) { /* */ }
    }
    // Defer neighbor prefetch so current paint wins
    var run = function () { prefetchNextQuestions(); };
    if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 900 });
    else setTimeout(run, 60);
    mark("question-paint", t0);
  }

  function hookRenders() {
    document.addEventListener("qx:question-rendered", onQuestionPaint);
    // Observe practice/CBT roots appearing
    try {
      var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var nodes = muts[i].addedNodes || [];
          for (var j = 0; j < nodes.length; j++) {
            var n = nodes[j];
            if (!n || n.nodeType !== 1) continue;
            if (
              (n.matches && n.matches(".qx-practice-page, .mtk-test-root, .eg-test-root, .qzrr-cbt")) ||
              (n.querySelector && n.querySelector(".qx-practice-page, .mtk-q-text, .eg-q-card"))
            ) {
              onQuestionPaint();
              return;
            }
          }
        }
      });
      mo.observe(document.getElementById("app-main") || document.body, { childList: true, subtree: true });
    } catch (_) { /* */ }
  }

  function enhanceSwChapterCache() {
    // Hint: SW already caches images; chapter JSON relies on HTTP cache + IDB
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        /* no-op message — keep SW simple */
      }
    } catch (_) { /* */ }
  }

  function init() {
    var tries = 0;
    (function attempt() {
      tries++;
      wrapLoadChapterBank();
      if (!_wrapDone && tries < 80) setTimeout(attempt, 40);
    })();
    hookRenders();
    enhanceSwChapterCache();
    mark("init " + VERSION);
  }

  wrapLoadChapterBank();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.QxQFast = {
    version: VERSION,
    wrapLoadChapterBank: wrapLoadChapterBank,
    prefetchNextQuestions: prefetchNextQuestions,
    prioritizeFirstFigure: prioritizeFirstFigure,
    idbGet: idbGet,
    idbSet: idbSet,
    mark: mark
  };
})(typeof window !== "undefined" ? window : this);
