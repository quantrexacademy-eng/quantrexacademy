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
  const FIG_VER = "qxfig111";
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
    let s = String(url || "").trim();
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
    if (/^\/?assets\/(?!diagrams\/qx-irodov)/i.test(raw) || /^\/images\//i.test(raw)) {
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

  function displaySrc(src) {
    const raw = unwrap(src);
    if (!raw) return "";
    if (/^data:/i.test(raw)) return raw;
    if (UI_KEEP.test(raw) && !FOREIGN.test(raw) && !isCardArt(raw)) return raw;
        const baseMatch = raw.match(/(qx-(?:book|org|self|irodov)-[a-f0-9]+)(?:\.(png|webp|jpe?g|gif))?/i);
    if (baseMatch) {
      const ext = baseMatch[2] ? baseMatch[2].toLowerCase() : "png";
      const name = baseMatch[1] + "." + ext;
      return storageUrlForPath("questions/figs/diagrams/" + name) + "&v=stem2";
    }
    const irodovDisp = irodovStorageUrl(raw);
    if (irodovDisp) return irodovDisp;
    if (/\/assets\/(book-covers|folder-icons|qx-figures|exam-logos)\//i.test(raw) && !isForeignHost(raw)) {
      return raw.split("?")[0] || raw;
    }
    if (/\/assets\/diagrams\/qx-(?:book|org|self)-/i.test(raw) && !isForeignHost(raw)) {
      const remote = localDiagramRemote(raw);
      if (remote && remote !== raw) return displaySrc(remote);
      return raw.split("?")[0] || raw;
    }
    if (/\/images\/[^?\s]+\.(png|jpe?g|webp|gif)/i.test(raw) && !isForeignHost(raw)) {
      return raw.split("?")[0] || raw;
    }
    const owned = ownedFigureUrl(raw) || raw;
    const inner = (isForeignHost(owned) ? ownedFigureUrl(owned) : "") || owned;
    const card = isCardArt(raw) || isCardArt(inner);
    const pool = POOL_RX.test(raw) || POOL_RX.test(inner);
    if (needsWipe(inner) || needsWipe(raw) || card) {
      let fetchUrl = isForeignHost(inner) ? (ownedFigureUrl(inner) || inner) : inner;
      if (isForeignHost(fetchUrl)) {
        const mapped = ownedFigureUrl(fetchUrl);
        if (mapped) fetchUrl = mapped;
        else if (card || pool) fetchUrl = raw;
        else return "";
      }
      if (!fetchUrl) return "";
      const fc = card || isCardArt(fetchUrl) ? "&fc=1" : "";
      return "/api/proxy-image?url=" + encodeURIComponent(fetchUrl) + "&clean=1" + fc + "&v=" + FIG_VER;
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
      const disp = displaySrc(o || cur);
      if (disp && disp !== cur) {
        el.src = disp;
        return;
      }
      if (o) {
        el.src = "/api/proxy-image?url=" + encodeURIComponent(o) + "&clean=1&v=" + FIG_VER;
        return;
      }
    }
    if (t === 1 && o && /\/api\/proxy-image/i.test(cur) && !/getmarks\.app|quizrr\.in/i.test(o)) {
      el.src = o;
      return;
    }
    if (t === 2 && o) {
      el.src = "/api/proxy-image?url=" + encodeURIComponent(o) + "&clean=1&v=" + FIG_VER + "&r=" + Date.now();
      return;
    }
  }

  function rewriteHtml(html) {
    const s = String(html || "");
    if (!s || !/<img\b/i.test(s)) return s;
    return s.replace(/\bsrc=(["'])([^"']+)\1/gi, (all, q, url) => {
      if (/^data:/i.test(url)) return all;
      const disp = displaySrc(url);
      if (!disp || disp === url) return all;
      const stored = ownedFigureUrl(url) || disp;
      return "src=" + q + disp + q
        + " data-qx-orig-src=" + q + stored + q
        + " data-qx-storage-src=" + q + stored + q;
    });
  }

  return {
    unwrap,
    ownedFigureUrl,
    irodovStorageUrl,
    displaySrc,
    rewriteHtml,
    retryOnError,
    storageUrlForPath,
    needsWipe,
    isForeignHost,
    isCardArt,
    FIG_VER
  };
});
