/**
 * Student content source: Firestore questions + Storage figures.
 * Never calls Marks. Catalog (/api/catalog) is the only fallback.
 */
const QxFirebaseBank = (() => {
  const mem = Object.create(null);
  const pending = Object.create(null);
  const PROJECT = (typeof firebaseConfig !== "undefined" && firebaseConfig.projectId)
    ? firebaseConfig.projectId
    : "quantrexacademy-app";
  const BUCKET = (typeof firebaseConfig !== "undefined" && firebaseConfig.storageBucket)
    ? firebaseConfig.storageBucket
    : "quantrexacademy-app.firebasestorage.app";
  const STORAGE_BASE = "https://firebasestorage.googleapis.com/v0/b/" + BUCKET + "/o/";

  function db() {
    try {
      if (typeof firebase === "undefined" || !firebase.firestore) return null;
      if (!firebase.apps || !firebase.apps.length) {
        if (typeof firebaseConfig === "undefined") return null;
        firebase.initializeApp(firebaseConfig);
      }
      return firebase.firestore();
    } catch (_) {
      return null;
    }
  }

  function enabled() {
    return !!db();
  }

  function storageUrlForPath(storagePath) {
    const p = String(storagePath || "").replace(/^\/+/, "");
    if (!p) return "";
    return STORAGE_BASE + encodeURIComponent(p) + "?alt=media";
  }

  function ownedFigureUrl(src) {
    const raw = String(src || "").trim();
    if (!raw) return "";
    if (/firebasestorage\.googleapis\.com|quantrexacademy-app\.firebasestorage/i.test(raw)) return raw;
    if (/^\/?assets\//i.test(raw) || /^data:/i.test(raw)) return raw;
    let path = "";
    const fixed = raw.replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
    const m1 = fixed.match(/cdn-question-pool\.getmarks\.app\/(.+?)(?:\?|#|$)/i);
    if (m1) path = "questions/figs/" + decodeURIComponent(m1[1]);
    const m2 = !path && raw.match(/cdn\.quizrr\.in\/(.+?)(?:\?|#|$)/i);
    if (m2) path = "questions/figs/quizrr/" + decodeURIComponent(m2[1]);
    const m3 = !path && raw.match(/examgoal\.net\/(.+?)(?:\?|#|$)/i);
    if (m3) path = "questions/figs/examgoal/" + decodeURIComponent(m3[1]);
    const m4 = !path && raw.match(/cdn-assets\.getmarks\.app\/(.+?)(?:\?|#|$)/i);
    if (m4) path = "questions/figs/getmarks-assets/" + decodeURIComponent(m4[1]);
    return path ? storageUrlForPath(path) : "";
  }

  function rewriteOwnedFigures(html) {
    if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.rewriteHtml) {
      return QxOwnedFigs.rewriteHtml(html);
    }
    const s = String(html || "");
    if (!s || !/<img\b/i.test(s)) return s;
    return s.replace(/\bsrc=(["'])([^"']+)\1/gi, (all, q, url) => {
      if (/data:|qx-org-|qx-book-/i.test(url)) return all;
      const mapped = ownedFigureUrl(url);
      if (!mapped) return all;
      if (/\/assets\//i.test(mapped) && !/qx-self-/i.test(mapped)) {
        if (mapped !== url) {
          return `src=${q}${mapped}${q} data-qx-orig-src=${q}${url}${q} data-qx-storage-src=${q}${mapped}${q}`;
        }
        return all;
      }
      const fc = /formula_cards|revision_flash_cards|another_formula_card/i.test(mapped + " " + url) ? "&fc=1" : "";
      const prox = "/api/proxy-image?url=" + encodeURIComponent(mapped) + "&clean=1" + fc + "&v=qxfig110";
      return `src=${q}${prox}${q} data-qx-orig-src=${q}${url}${q} data-qx-storage-src=${q}${mapped}${q}`;
    });
  }

  function normalizeOptions(opts) {
    if (!Array.isArray(opts)) return [];
    return opts.map((o, i) => {
      if (o == null) return "";
      if (typeof o === "string") return rewriteOwnedFigures(o);
      const letter = o.id || o.key || String.fromCharCode(65 + i);
      let text = o.text || o.html || o.value || "";
      let img = o.image || o.img;
      if (img && typeof img === "object") {
        img = img.url || img.src || img.storageUrl || storageUrlForPath(img.storagePath);
      }
      if (!img && o.figure) {
        const f = o.figure;
        img = f.url || f.src || f.storageUrl || storageUrlForPath(f.storagePath);
      }
      if (img && !/<img\b/i.test(String(text))) {
        const safe = String(img).replace(/"/g, "&quot;");
        text = (text ? text + "<br>" : "") +
          '<img class="qx-pool-fig qx-no-wm qx-opt-fig-img" src="' + safe +
          '" alt="Option ' + letter + '" loading="eager" decoding="async">';
      }
      return rewriteOwnedFigures(String(text || ""));
    });
  }

  function recFromDoc(id, data) {
    if (!data || typeof data !== "object") return null;
    const stem = data.q || data.questionText || data.question || "";
    const opts = normalizeOptions(data.options);
    let figureHtml = "";
    if (data.figure) {
      const f = data.figure;
      const url = f.url || f.src || f.storageUrl || storageUrlForPath(f.storagePath);
      if (url && !/<img\b/i.test(String(stem))) {
        const safe = String(url).replace(/"/g, "&quot;");
        figureHtml = '<img class="qx-pool-fig qx-no-wm" src="' + safe + '" alt="Figure" loading="eager">';
      }
    }
    const qHtml = rewriteOwnedFigures(figureHtml ? String(stem) + figureHtml : String(stem));
    return {
      id: data.id != null ? data.id : id,
      _marksId: data.sourceId || data._marksId || "",
      q: qHtml,
      options: opts,
      answer: data.answer != null ? data.answer : data.correctAnswer,
      answers: data.answers || null,
      questionType: data.questionType || data.type || "singleCorrect",
      solution: rewriteOwnedFigures(data.solution || data.explanation || ""),
      explanation: rewriteOwnedFigures(data.explanation || ""),
      subject: data.subject || "",
      chapter: data.chapter || "",
      chapterId: data.chapterId || "",
      source: data.source || "",
      difficulty: data.difficulty || "",
      exam: data.exam || "",
      year: data.year || "",
      _bank: data.bank || data._bank || "",
      _fromFirebase: true,
      migrationStatus: data.migrationStatus || ""
    };
  }

  async function readDoc(fs, docId) {
    const snap = await fs.collection("questions").doc(String(docId)).get();
    if (snap.exists) return recFromDoc(snap.id, snap.data());
    return null;
  }

  async function getQuestion(id) {
    const sid = String(id || "").trim();
    if (!sid) return null;
    if (mem[sid]) return mem[sid];
    if (pending[sid]) return pending[sid];
    const fs = db();
    if (!fs) return null;
    pending[sid] = (async () => {
      try {
        let rec = await readDoc(fs, sid);
        if (!rec && sid.indexOf("m_") === 0) rec = await readDoc(fs, sid.slice(2));
        if (!rec) {
          try {
            const q = await fs.collection("questions").where("sourceId", "==", sid).limit(1).get();
            if (!q.empty) rec = recFromDoc(q.docs[0].id, q.docs[0].data());
          } catch (_) { /* missing index is fine */ }
        }
        if (rec && (rec.q || (rec.options && rec.options.length))) {
          mem[sid] = rec;
          if (rec.id != null) mem[String(rec.id)] = rec;
          if (rec._marksId) mem[String(rec._marksId)] = rec;
        }
        return rec;
      } catch (e) {
        console.warn("QxFirebaseBank.getQuestion", sid, e && e.message);
        return null;
      } finally {
        delete pending[sid];
      }
    })();
    return pending[sid];
  }

  async function getQuestions(ids) {
    const list = (ids || []).map(String).filter(Boolean).slice(0, 90);
    const out = [];
    for (let i = 0; i < list.length; i += 8) {
      const chunk = list.slice(i, i + 8);
      const recs = await Promise.all(chunk.map((id) => getQuestion(id)));
      recs.forEach((rec) => { if (rec) out.push(rec); });
    }
    return out;
  }

  async function health() {
    try {
      const fs = db();
      if (!fs) return null;
      const snap = await fs.collection("content_health").doc("summary").get();
      return snap.exists ? snap.data() : null;
    } catch (_) {
      return null;
    }
  }

  return {
    enabled,
    getQuestion,
    getQuestions,
    recFromDoc,
    rewriteOwnedFigures,
    ownedFigureUrl,
    storageUrlForPath,
    normalizeOptions,
    health,
    PROJECT,
    BUCKET
  };
})();
