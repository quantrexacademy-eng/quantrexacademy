/**
 * Quantrex-owned figure URLs.
 * Student path never fetches getmarks.app / quizrr — only Firebase Storage or local assets.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof root !== "undefined") root.QxOwnedFigs = api;
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this, function () {
  "use strict";

  const BUCKET = "quantrexacademy-app.firebasestorage.app";
  const BASE = "https://firebasestorage.googleapis.com/v0/b/" + BUCKET + "/o/";
  const FOREIGN = /cdn-question-pool\.getmarks\.app|cdn-assets\.getmarks\.app|(?:cdn\.)?getmarks\.app|(?:cdn\.)?quizrr\.in|examgoal\.net/i;
  const CARD_RX = /formula_cards|revision_flash_cards|another_formula_card/i;
  const IRODOV_AKCR = {"1":"qx-irodov-250e293106820500","2":"qx-irodov-adf16666e1be4976","3":"qx-irodov-e423176745a5a10b","4":"qx-irodov-0e1f5e5d9901fb7e","5":"qx-irodov-986b17bf0f20ad12","6":"qx-irodov-437c4e3077faddbb","7":"qx-irodov-6047e43af66fc555","8":"qx-irodov-0ae8aa20b8095d98","9":"qx-irodov-d00e69df802ce0ad","10":"qx-irodov-eb65822fab145e6c","11":"qx-irodov-1e3b938430cda3e1","12":"qx-irodov-45e6a523e752aae4","13":"qx-irodov-937ba062e44d8da5","14":"qx-irodov-d7ec1aad37531c3f","15":"qx-irodov-fa934d175d46c81a","16":"qx-irodov-aeda0a9d1fe1bc95","17":"qx-irodov-ce44c59c513a6c36","18":"qx-irodov-e838dbb13a6dba68","19":"qx-irodov-f7d02cd9807e5c09","20":"qx-irodov-e527525f7363c370","21":"qx-irodov-ff578d2d50b741de","22":"qx-irodov-e9a3fbfc31a3044f","23":"qx-irodov-eff4c844987ca7f0","24":"qx-irodov-a1a94c520367a68e","25":"qx-irodov-c27de81d0958dc77","26":"qx-irodov-6762256ab69d8427","27":"qx-irodov-6348284915af9552","28":"qx-irodov-dd165a7dfab35564","29":"qx-irodov-b292ceac5a306a0b","30":"qx-irodov-68081d95e11c0126","31":"qx-irodov-d1763c04f1e7a2e5","32":"qx-irodov-5e0549f70e8d8111","33":"qx-irodov-b09233946898e043","34":"qx-irodov-9af538274a96d80b","35":"qx-irodov-aeffcab36f8621e9","36":"qx-irodov-6adeb99041b2ae8b","37":"qx-irodov-b92879d7e327dc11","38":"qx-irodov-6b9de2f932bc5e69","39":"qx-irodov-ad692548e5a5cc9f","40":"qx-irodov-11be8d058761f82e","41":"qx-irodov-355c5917578a9937","42":"qx-irodov-70c52c0b7b052042","43":"qx-irodov-cde1dfc162f773fd","44":"qx-irodov-bdefae24057d5b7a","45":"qx-irodov-401edccbad94bf99","46":"qx-irodov-d19b60a025a6d73a","47":"qx-irodov-08b62a12684c9ce2","48":"qx-irodov-a1844d9cc7c2b253","49":"qx-irodov-69bc1e5db069bc8a","50":"qx-irodov-577814f2c250c5a8","51":"qx-irodov-8e6ebe0a1ee42068","52":"qx-irodov-f95eb45ed0e8336d","53":"qx-irodov-ea36dba28a598bd9","54":"qx-irodov-e2109d7c0ed774e8","55":"qx-irodov-bb07d106095e5895","56":"qx-irodov-9c8d9e4cc6fd3e89","57":"qx-irodov-7e607903a23549e4","58":"qx-irodov-abebd6eabfa5a861","59":"qx-irodov-bad94d7ebf25549b","60":"qx-irodov-119cf8d637ecf4ca","61":"qx-irodov-f2d45f6763579902","62":"qx-irodov-59a1ea0f6219a01d","63":"qx-irodov-bfb18f52e82c2b6e","64":"qx-irodov-af8f321914119863","65":"qx-irodov-cc6860e73ea519f2","66":"qx-irodov-2e5c7695d67842db","67":"qx-irodov-29f55d3206baef55","68":"qx-irodov-1ae923ff25acb913","69":"qx-irodov-a251c0dd8dc8485f","70":"qx-irodov-a0d4427e3114492d","71":"qx-irodov-9d4fa09bde5e8542","72":"qx-irodov-185add460fe18b5e","73":"qx-irodov-ea06ea97809671f2","74":"qx-irodov-ac138371f464489b","75":"qx-irodov-8d50ab2bb312bc7c","76":"qx-irodov-94a21447c8e0e7cb","77":"qx-irodov-ca4efbebec859f8d","78":"qx-irodov-4f22093d2dc8ebf9","79":"qx-irodov-49f72f3db69722f8","80":"qx-irodov-6774eb62b3bf616e","81":"qx-irodov-ffd6abb6d058f348","82":"qx-irodov-8ecbdc0f444aa5b3","83":"qx-irodov-5ce583727e023365","84":"qx-irodov-93d5ee2c1834c01c","85":"qx-irodov-c1cca51992ec71d9","86":"qx-irodov-87e63a76da6a9000","87":"qx-irodov-5828313567bda2ab","88":"qx-irodov-abc811455775af1c","89":"qx-irodov-b1d55dc017ef476f","90":"qx-irodov-177771e0cf5415b6","91":"qx-irodov-0bfe2d6c0f19237b","92":"qx-irodov-f8fabc5896df7917","93":"qx-irodov-953b9a81e0042474","94":"qx-irodov-c177581c2f4f0261","95":"qx-irodov-e57a3d4a71049500","96":"qx-irodov-38dbfac5f03f8f13","97":"qx-irodov-651091e9cb8de9e4","98":"qx-irodov-22439d551e8b3df9","99":"qx-irodov-89e744bbd57ae176","100":"qx-irodov-65a9f62855c3094c","101":"qx-irodov-e01fcd47f2751f16","102":"qx-irodov-c0a55dc3749ca101","103":"qx-irodov-1c470119bc2de3d4","104":"qx-irodov-69a9995e55c01f23","105":"qx-irodov-816057b54c85f424","106":"qx-irodov-a8dbbffe2c4f0c37","107":"qx-irodov-1472940c9a5243c8","108":"qx-irodov-6539a1de9109e36c","109":"qx-irodov-bbda2abd48fc964b","110":"qx-irodov-2a05a042a84f07e7","111":"qx-irodov-71e6a85a8258c283","112":"qx-irodov-334c828eed0e38c1","113":"qx-irodov-b254d1c1b78357f9","114":"qx-irodov-87aa5754897d1642","115":"qx-irodov-5c5cf4180494eed5","116":"qx-irodov-f4bcc283f9360457","117":"qx-irodov-2496344a547363b0","118":"qx-irodov-d649a5da2c8b8edf","119":"qx-irodov-0bf1905df8076d3d","120":"qx-irodov-f9021ae64bc48545","121":"qx-irodov-8e72144f2dd34bbe","122":"qx-irodov-caeec5b486a17765","123":"qx-irodov-e81b42f28259c3f5","124":"qx-irodov-6187c68d2b7506e1","125":"qx-irodov-77f6f60a82d5433c","126":"qx-irodov-5f2edb6dcfd9833c","127":"qx-irodov-45a9396a1fe4c0c3","128":"qx-irodov-d94e61f11eabc9bd","129":"qx-irodov-52a739510e8a81ba","130":"qx-irodov-1d13e8d73344cc24","131":"qx-irodov-9f11d8b34fcd0412","132":"qx-irodov-b0cc45fcb6e33035","133":"qx-irodov-7211731590d35707","134":"qx-irodov-22775d17499b15e5","135":"qx-irodov-1a21332b9f2bfcb1","136":"qx-irodov-3238c51d1457ef6d","137":"qx-irodov-49ae7e88e17f958d","138":"qx-irodov-df62a1c6a3ca103e","139":"qx-irodov-fa166739c0b9931a","140":"qx-irodov-eb2734de95e7b4dd","141":"qx-irodov-84cdeb707812fe55","142":"qx-irodov-752fa898eaf8a20f","143":"qx-irodov-ad6d3fa0bb308a9c","144":"qx-irodov-8176e0148d91341b","145":"qx-irodov-a30991f9b5f7e1e0","146":"qx-irodov-002ffe9ca872915c","147":"qx-irodov-14f3ecf046c71324","148":"qx-irodov-f502421dd2261583","149":"qx-irodov-804d74d3905cb336","150":"qx-irodov-31f85888816a83e1","151":"qx-irodov-772e0a7e4fbfbe65","152":"qx-irodov-e6f2dea69e250b1f","153":"qx-irodov-4dcf84cb58e2694d","154":"qx-irodov-4e8dfff1ad63122d","155":"qx-irodov-7316217d2e9a6afa","156":"qx-irodov-63abbd9210e43a9c","157":"qx-irodov-c4908c303b226b72","158":"qx-irodov-f0b30aa0ddbe16c1"};
  const IRODOV_HASH = (function () {
    const m = Object.create(null);
    Object.keys(IRODOV_AKCR).forEach(function (k) {
      const v = String(IRODOV_AKCR[k] || "");
      const h = v.replace(/^qx-irodov-/i, "").toLowerCase();
      if (h) m[h] = v;
    });
    return m;
  })();
  const UI_KEEP = /ic_content_exam_|cpyqb\/subjects|ncert_toolbox|app_assets\/img\/exams\//i;
  const FIG_VER = "qxmd246";
  const POOL_RX = /cdn-question-pool\.getmarks|cdn\.quizrr|watermarked_images|\/pyq\/|AKCR2_|2026_modules/i;
  let LOCAL_FIG_MAP = {};
  try {
    if (typeof require === "function") {
      const packed = require("./data/qx_local_fig_map.json");
      LOCAL_FIG_MAP = (packed && packed.map) || packed || {};
    }
  } catch (_) { /* */ }
  if (typeof window !== "undefined" && window.QX_LOCAL_FIG_MAP && typeof window.QX_LOCAL_FIG_MAP === "object") {
    LOCAL_FIG_MAP = window.QX_LOCAL_FIG_MAP;
  }

  function localDiagramRemote(raw) {
      const base = String(raw || "").split("?")[0].split("/").pop();
      if (!/^qx-(?:self|book|org)-[a-f0-9]+\.(?:png|webp|jpe?g)$/i.test(base)) return "";
      if (/^qx-org-/i.test(base)) return storageUrlForPath("questions/figs/org/" + base);
      const hit = LOCAL_FIG_MAP[base] || (typeof window !== "undefined" && window.QX_LOCAL_FIG_MAP && window.QX_LOCAL_FIG_MAP[base]);
      if (hit) return String(hit);
      return "";
    }

  function isCardArt(url) {
    return CARD_RX.test(String(url || ""));
  }

  function storageUrlForPath(storagePath) {
    const p = String(storagePath || "").replace(/^\/+/, "");
    if (!p) return "";
    return BASE + encodeURIComponent(p) + "?alt=media";
  }

  function unwrap(url) {
    let s = String(url || "").trim()
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, "\"")
      .replace(/&#39;/g, "'");
    for (let i = 0; i < 4; i++) {
      if (!/proxy-image|restore-image/i.test(s)) break;
      try {
        const u = new URL(s, "https://www.quantrexacademy.com");
        const inner = u.searchParams.get("url");
        if (!inner) break;
        s = inner;
      } catch (_) {
        break;
      }
    }
    return s
      .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
      .replace(/https?:\/\/cdn-question-pool\.app\//gi, "https://cdn-question-pool.getmarks.app/");
  }

  function decodePath(p) {
    let rest = String(p || "");
    try { rest = decodeURIComponent(rest); } catch (_) { /* */ }
    try {
      if (/%[0-9A-Fa-f]{2}/.test(rest)) rest = decodeURIComponent(rest);
    } catch (_) { /* */ }
    return rest;
  }

  function irodovStorageUrl(raw) {
    const s = String(raw || "");
    const file = s.split("?")[0].split("/").pop() || "";
    function iroUrl(name) {
      return storageUrlForPath("questions/figs/irodov/" + name) + "&v=stem2";
    }
    if (/^qx-irodov-[a-f0-9]+\.png$/i.test(file)) {
      return iroUrl(file);
    }
    const bookH = (file.match(/^qx-book-([a-f0-9]+)\.(?:png|webp|jpe?g)$/i) || [])[1];
    if (bookH && IRODOV_HASH[bookH.toLowerCase()]) {
      return iroUrl(IRODOV_HASH[bookH.toLowerCase()] + ".png");
    }
    const n = (s.match(/AKCR2_(\d+)/i) || [])[1];
    if (n && IRODOV_AKCR[n]) {
      return iroUrl(IRODOV_AKCR[n] + ".png");
    }
    const fb = s.match(/questions(?:%2F|\/)figs(?:%2F|\/)irodov(?:%2F|\/)(qx-irodov-[a-f0-9]+\.png)/i);
    if (fb) return iroUrl(fb[1]);
    return "";
  }

  function ownedFigureUrl(src) {
    const raw = unwrap(src);
    if (!raw) return "";
    if (/^data:/i.test(raw)) return raw;
    const irodov = irodovStorageUrl(raw);
    if (irodov) return irodov;
    if (/firebasestorage\.googleapis\.com|quantrexacademy-app\.firebasestorage/i.test(raw)) {
      return raw.split("#")[0];
    }
    if (/^\/?assets\/(?:book-covers|folder-icons|exam-logos)\//i.test(raw) || /^\/images\//i.test(raw)) {
      return raw.split("?")[0] || raw;
    }
    let path = "";
    const m1 = raw.match(/cdn-question-pool\.getmarks\.app\/(.+?)(?:\?|#|$)/i);
    if (m1) path = "questions/figs/" + decodePath(m1[1]);
    const mAssets = !path && raw.match(/cdn-assets\.getmarks\.app\/(.+?)(?:\?|#|$)/i);
    if (mAssets) path = "questions/figs/getmarks-assets/" + decodePath(mAssets[1]);
    const m2 = !path && raw.match(/cdn\.quizrr\.in\/(.+?)(?:\?|#|$)/i);
    if (m2) path = "questions/figs/quizrr/" + decodePath(m2[1]);
    const m3 = !path && raw.match(/examgoal\.net\/(.+?)(?:\?|#|$)/i);
    if (m3) path = "questions/figs/examgoal/" + decodePath(m3[1]);
    const m4 = !path && raw.match(/getmarks\.app\/(.+?)(?:\?|#|$)/i);
    if (m4) path = "questions/figs/" + decodePath(m4[1]);
    return path ? storageUrlForPath(path) : "";
  }

  function isForeignHost(url) {
    const s = String(url || "");
    if (isCardArt(s)) return FOREIGN.test(s);
    if (UI_KEEP.test(s)) return false;
    if (/app_assets\/img\/ui\//i.test(s) && !isCardArt(s)) return false;
    return FOREIGN.test(s);
  }

  function needsWipe(url) {
    const s = String(url || "");
    if (/qx-irodov-|\/irodov\/|qx-org-|qx-book-|\/assets\/diagrams\/qx-(?:book|org|irodov)-|pubchem\.ncbi|cactus\.nci/i.test(s)) {
      return false;
    }
    if (/firebasestorage/i.test(s) && /questions(%2F|\/)figs/i.test(s)) return true;
    if (/\/assets\/diagrams\/qx-self-/i.test(s)) return true;
    if (isForeignHost(s)) return true;
    return false;
  }

  function qxBookLocalSrc(raw) {
    const m = String(raw || "").match(/(qx-(?:book|self|org)-[a-f0-9]+)(?:\.(png|webp|jpe?g|gif))?/i);
    if (!m) return "";
    const ext = m[2] ? m[2].toLowerCase() : "png";
    return "/assets/diagrams/" + m[1] + "." + ext;
  }
  function qxBookStorageSrc(raw) {
    const m = String(raw || "").match(/(qx-(?:book|self|org)-[a-f0-9]+)(?:\.(png|webp|jpe?g|gif))?/i);
    if (!m) return "";
    const ext = m[2] ? m[2].toLowerCase() : "png";
    const name = m[1] + "." + ext;
    if (/^qx-org-/i.test(m[1])) return storageUrlForPath("questions/figs/org/" + name) + "&v=" + FIG_VER;
    return storageUrlForPath("questions/figs/diagrams/" + name) + "&v=" + FIG_VER;
  }
  function displaySrc(src) {
    const raw = unwrap(src);
    if (!raw) return "";
    if (/^data:/i.test(raw)) return raw;
    if (UI_KEEP.test(raw) && !FOREIGN.test(raw) && !isCardArt(raw)) return raw;
    const irodovDisp = irodovStorageUrl(raw);
    if (irodovDisp) return irodovDisp;
    const bookStore = qxBookStorageSrc(raw);
    if (bookStore) return bookStore;
    const mappedLocal = localDiagramRemote(raw);
    if (mappedLocal) {
      if (/firebasestorage/i.test(mappedLocal) && !(needsWipe(mappedLocal) || isCardArt(mappedLocal))) {
        return mappedLocal;
      }
      if (needsWipe(mappedLocal) || isCardArt(mappedLocal)) {
        return "/api/proxy-image?url=" + encodeURIComponent(mappedLocal) + "&clean=1&v=" + FIG_VER;
      }
      if (/firebasestorage/i.test(mappedLocal)) return mappedLocal;
    }
    if (/\/assets\/(book-covers|folder-icons|exam-logos)\//i.test(raw) && !isForeignHost(raw)) {
      return raw.split("?")[0] || raw;
    }
    if (/\/images\/[^?\s]+\.(png|jpe?g|webp|gif)/i.test(raw) && !isForeignHost(raw)) {
      return raw.split("?")[0] || raw;
    }
    if (/\/assets\/(?:diagrams|qx-figures\/perm|clean-diagrams)\//i.test(raw)) {
      const mapped = localDiagramRemote(raw) || ownedFigureUrl(raw) || qxBookStorageSrc(raw);
      if (mapped) return mapped;
    }
    const owned = ownedFigureUrl(raw) || raw;
    const inner = (isForeignHost(owned) ? ownedFigureUrl(owned) : "") || owned;
    const card = isCardArt(raw) || isCardArt(inner);
    const pool = POOL_RX.test(raw) || POOL_RX.test(inner);
    if (/firebasestorage/i.test(inner) && !card) return inner.split("#")[0];
    if (needsWipe(inner) || needsWipe(raw) || card) {
      let fetchUrl = isForeignHost(inner) ? (ownedFigureUrl(inner) || inner) : inner;
      if (isForeignHost(fetchUrl)) {
        const mapped = ownedFigureUrl(fetchUrl);
        if (mapped) fetchUrl = mapped;
        else if (card || pool) fetchUrl = raw;
        else {
          const proxyInner = ownedFigureUrl(raw) || raw;
          return "/api/proxy-image?url=" + encodeURIComponent(proxyInner) + "&clean=1&v=" + FIG_VER;
        }
      }
      if (!fetchUrl) {
        return "/api/proxy-image?url=" + encodeURIComponent(raw) + "&clean=1&v=" + FIG_VER;
      }
      const fc = card || isCardArt(fetchUrl) ? "&fc=1" : "";
      return "/api/proxy-image?url=" + encodeURIComponent(fetchUrl) + "&clean=1" + fc + "&v=" + FIG_VER;
    }
    if (/\/assets\/diagrams\//i.test(inner)) {
      const fb = qxBookStorageSrc(inner) || localDiagramRemote(inner);
      if (fb) return fb;
    }
    return inner;
  }

  function retryOnError(el) {
    if (!el) return;
    try {
      el.style.display = "block";
      el.style.visibility = "visible";
      el.style.opacity = "1";
      el.style.background = "#fff";
      el.style.minHeight = "";
      el.removeAttribute("crossorigin");
    } catch (_) { /* */ }
    const t = parseInt(el.dataset.qxFigTry || "0", 10);
    let o = el.getAttribute("data-qx-storage-src") || el.getAttribute("data-qx-orig-src") || "";
    const cur = el.getAttribute("src") || "";
    try {
      if (/proxy-image|restore-image/i.test(o)) {
        const u = new URL(o, "https://www.quantrexacademy.com");
        const inner = u.searchParams.get("url");
        if (inner) o = inner;
      }
    } catch (_) { /* */ }
    if (/getmarks\.app|quizrr\.in/i.test(o)) {
      const mapped = ownedFigureUrl(o);
      if (mapped) o = mapped;
    }
    const nextTry = String(t + 1);
    el.dataset.qxFigTry = nextTry;
    if (t === 0) {
      const bookFb = qxBookStorageSrc(o || cur) || qxBookStorageSrc(el.getAttribute("data-qx-storage-src") || "");
      if (bookFb && bookFb !== cur) {
        el.src = bookFb;
        return;
      }
      const disp = displaySrc(o || cur);
      if (disp && disp !== cur && !/\/assets\/diagrams\/qx-book-/i.test(disp)) {
        el.src = disp;
        return;
      }
      if (bookFb) { el.src = bookFb; return; }
      if (disp && disp !== cur) { el.src = disp; return; }
      if (o) {
        el.src = "/api/proxy-image?url=" + encodeURIComponent(o) + "&clean=1&v=" + FIG_VER;
        return;
      }
    }
    if (t === 1 && o && /\/api\/proxy-image/i.test(cur) && !/getmarks\.app|quizrr\.in/i.test(o)) {
      el.src = o;
      return;
    }
    if (t === 2) {
      const origHint = unwrap(el.getAttribute("data-qx-orig-src") || o || cur);
      if (origHint && /getmarks\.app|quizrr\.in|watermarked_images|\/pyq\//i.test(origHint)) {
        el.src = "/api/proxy-image?url=" + encodeURIComponent(origHint) + "&clean=1&v=" + FIG_VER + "&r=" + Date.now();
        return;
      }
      if (o) {
        el.src = "/api/proxy-image?url=" + encodeURIComponent(o) + "&clean=1&v=" + FIG_VER + "&r=" + Date.now();
        return;
      }
    }
    if (t >= 3) {
      const origHint = unwrap(el.getAttribute("data-qx-orig-src") || o || "");
      const last = "/api/proxy-image?url=" + encodeURIComponent(origHint || o || cur) + "&clean=1&v=" + FIG_VER + "&r=" + Date.now();
      if (last && last !== cur) el.src = last;
      try {
        el.style.display = "block";
        el.style.visibility = "visible";
        el.style.opacity = "1";
      } catch (_) { /* */ }
    }
  }

  function escAttr(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function rewriteHtml(html) {
    let s = String(html || "");
    if (!s || !/<img\b/i.test(s)) return s;
    s = s.replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
    s = s.replace(/<img\b([^>]*?)\/\s+(data-qx-[^>]*?)>/gi, "<img$1 $2>");
    return s.replace(/<img\b([^>]*)>/gi, (full, attrs) => {
      let a = String(attrs || "").replace(/\/\s*$/, " ");
      if (/qx-marks-icon|qx-exam-logo|qx-book-photo|qx-ui-brand-logo/i.test(a)) return full;
      const srcM = a.match(/\bsrc=(["'])([^"']*)\1/i) || a.match(/\bsrc=([^\s>]+)/i);
      const origM = a.match(/\bdata-qx-orig-src=(["'])([^"']*)\1/i);
      const src = srcM ? (srcM[2] != null ? srcM[2] : srcM[1]) : "";
      if (/^data:/i.test(src)) return full;
      if (UI_KEEP.test(src) && !FOREIGN.test(src)) return full;
      const hint = (origM && origM[2]) || src;
      const disp = displaySrc(hint) || displaySrc(src) || (
        src ? "/api/proxy-image?url=" + encodeURIComponent(src) + "&clean=1&v=" + FIG_VER : ""
      );
      if (!disp) return "<img" + a + ">";
      const stored = qxBookStorageSrc(hint) || qxBookStorageSrc(src) || ownedFigureUrl(hint) || ownedFigureUrl(src) || disp;
      const dispEsc = escAttr(disp);
      const storedEsc = escAttr(stored);
      const hintEsc = escAttr(hint || src);
      if (srcM && srcM[0]) a = a.replace(srcM[0], 'src="' + dispEsc + '"');
      else if (/\bsrc=/i.test(a)) a = a.replace(/\bsrc=(["'])[^"']*\1/i, 'src="' + dispEsc + '"').replace(/\bsrc=([^\s"'>]+)/i, 'src="' + dispEsc + '"');
      else a += ' src="' + dispEsc + '"';
      if (!/\bdata-qx-orig-src=/i.test(a)) a += ' data-qx-orig-src="' + hintEsc + '"';
      if (stored) {
        if (/\bdata-qx-storage-src=/i.test(a)) {
          a = a.replace(/\bdata-qx-storage-src=(["'])[^"']*\1/i, "data-qx-storage-src=$1" + storedEsc + "$1");
        } else {
          a += ' data-qx-storage-src="' + storedEsc + '"';
        }
      }
      a = a.replace(/\s*crossorigin(?:\s*=\s*(["'])[^"']*\1)?/gi, "");
      if (!/\bonerror=/i.test(a)) {
        a += ' onerror="if(window.QxOwnedFigs&&QxOwnedFigs.retryOnError)QxOwnedFigs.retryOnError(this)"';
      }
      if (!/\bclass=/i.test(a)) a += ' class="qx-pool-fig qx-no-wm qx-sol-fig"';
      else if (!/qx-pool-fig|qx-sol-fig|qx-book-photo/i.test(a)) {
        a = a.replace(/\bclass=(["'])([^"']*)\1/i, "class=$1$2 qx-pool-fig qx-no-wm$1");
      }
      if (!/\bdecoding=/i.test(a)) a += ' decoding="async"';
      if (!/\bloading=/i.test(a)) a += ' loading="eager"';
      if (/\bstyle=/i.test(a)) {
        a = a.replace(/\bstyle=(["'])([^"']*)\1/i, (mm, q, st) => {
          let ns = String(st || "").replace(/height\s*:\s*[^;]+;?/gi, "height:auto;");
          if (!/max-width/i.test(ns)) ns += "max-width:100%;";
          if (!/height\s*:/i.test(ns)) ns += "height:auto;";
          if (!/display\s*:/i.test(ns)) ns += "display:block;";
          if (!/background/i.test(ns)) ns += "background:#fff;";
          return "style=" + q + ns + q;
        });
      } else {
        a += ' style="max-width:100%;height:auto;display:block;margin:10px auto;background:#fff;object-fit:contain"';
      }
      return "<img" + a + ">";
    });
  }

  function paintQuestion(q) {
    if (!q) return q;
    try {
      if (q.q && /<img/i.test(String(q.q))) q.q = rewriteHtml(q.q);
      if (q.question && q.question !== q.q && /<img/i.test(String(q.question))) q.question = rewriteHtml(q.question);
      if (q.solution && /<img/i.test(String(q.solution))) q.solution = rewriteHtml(q.solution);
      if (q.explanation && /<img/i.test(String(q.explanation))) q.explanation = rewriteHtml(q.explanation);
      if (Array.isArray(q.options)) {
        q.options = q.options.map((o) =>
          (typeof o === "string" && /<img/i.test(o)) ? rewriteHtml(o) : o
        );
      }
    } catch (_) { /* */ }
    return q;
  }

  function isUiImg(img) {
    if (!img) return true;
    try {
      if (img.closest && img.closest(".eg-top, .qx-book-photo, .qx-book-cover, header, .eg-foot, #egFoot")) return true;
    } catch (_) { /* */ }
    const cls = String(img.className || "");
    if (/qx-marks-icon|qx-exam-logo|qx-book-photo|qx-ui-brand-logo|subj-ic-img|dash-tool-logo/i.test(cls)) return true;
    const src = img.getAttribute("src") || "";
    if (UI_KEEP.test(src) && !FOREIGN.test(src) && !POOL_RX.test(src)) return true;
    return false;
  }

  function paintDom(root) {
    if (!root || !root.querySelectorAll) return 0;
    let n = 0;
    try {
      root.querySelectorAll("img").forEach((img) => {
        if (!img || isUiImg(img)) return;
        try {
          img.removeAttribute("crossorigin");
          img.crossOrigin = null;
        } catch (_) { /* */ }
        let src = img.getAttribute("src") || "";
        const orig = img.getAttribute("data-qx-orig-src") || src;
        const disp = displaySrc(orig) || displaySrc(src);
        if (disp && disp !== src) {
          if (!img.getAttribute("data-qx-orig-src") && orig) img.setAttribute("data-qx-orig-src", orig);
          const stored = qxBookStorageSrc(orig) || ownedFigureUrl(orig) || disp;
          if (stored && !img.getAttribute("data-qx-storage-src")) img.setAttribute("data-qx-storage-src", stored);
          img.setAttribute("src", disp);
          src = disp;
          n++;
        }
        img.classList.add("qx-pool-fig", "qx-no-wm");
        img.classList.remove("qx-img-hidden");
        img.style.display = "block";
        img.style.visibility = "visible";
        img.style.opacity = "1";
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        img.style.background = "#fff";
        img.style.objectFit = "contain";
        if (!img.getAttribute("onerror")) {
          img.setAttribute("onerror", "if(window.QxOwnedFigs&&QxOwnedFigs.retryOnError)QxOwnedFigs.retryOnError(this)");
        }
      });
    } catch (_) { /* */ }
    return n;
  }

  if (typeof document !== "undefined" && document.addEventListener) {
    const paintEvt = function (e) {
      try {
        const d = e && e.detail;
        const root = (d && (d.root || d.el))
          || (typeof document !== "undefined" && (
            document.getElementById("egSolPanel")
            || document.getElementById("egQArea")
            || document.getElementById("app-main")
          ));
        if (root) paintDom(root);
        const sol = typeof document !== "undefined" && document.getElementById("egSolPanel");
        if (sol && sol !== root) paintDom(sol);
      } catch (_) { /* */ }
    };
    document.addEventListener("qx:question-rendered", paintEvt);
    document.addEventListener("qx:practice-ready", paintEvt);
  }

  return {
    unwrap,
    ownedFigureUrl,
    irodovStorageUrl,
    displaySrc,
    rewriteHtml,
    paintQuestion,
    paintDom,
    qxBookStorageSrc,
    retryOnError,
    storageUrlForPath,
    needsWipe,
    isForeignHost,
    isCardArt,
    FIG_VER
  };
});
