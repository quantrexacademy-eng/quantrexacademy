// Quantrex — MARKS-style question type rendering (MCQ, multi-correct, numerical, column match)
const QuantrexQFormat = (() => {
  const TYPE_LABELS = {
    singleCorrect: "Single Correct Type",
    multipleCorrect: "Multiple Correct Type",
    numerical: "Numerical Type",
    columnMatch: "Column Matching Type",
    assertionReason: "Assertion-Reason Type",
    subjective: "Subjective"
  };

  function letter(i) {
    return String.fromCharCode(65 + i);
  }

  /** Convert broken <smiles>…</smiles> text into clean structure images (PubChem + CACTUS fallback) */
  function smilesImgTag(smi) {
    const enc = encodeURIComponent(smi);
    const pub = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${enc}/PNG`;
    const cactus = `https://cactus.nci.nih.gov/chemical/structure/${enc}/image?width=520&height=400`;
    const safe = smi.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    return `<img class="qx-pool-fig qx-smiles-fig qx-no-wm qx-fig-ready qx-opt-fig-img" src="${pub}" data-qx-smiles="${safe}" data-qx-fallback="${cactus}" alt="Structure" loading="eager" decoding="async" referrerpolicy="no-referrer" onerror="if(this.dataset.qxFallback){const f=this.dataset.qxFallback;delete this.dataset.qxFallback;this.src=f;}else{this.alt='Structure unavailable';this.style.opacity='0.35'}" style="max-width:min(100%,220px);max-height:130px;width:auto;height:auto;display:block;margin:4px auto;padding:2px;background:#fff;border-radius:8px;object-fit:contain">`;
  }

  function expandSmilesHtml(html) {
    let s = String(html || "");
    // Live bank: "< smiles>O=C(...) < /smiles>" and guillemet variants
    s = s.replace(/[‹«＜<\u2039\u3008]\s*\/?\s*smiles\s*[›»＞>\u203a\u3009]/gi, (m) => {
      if (/\//.test(m)) return "</smiles>";
      return "<smiles>";
    });
    s = s.replace(/&lt;\s*\/?\s*smiles\s*&gt;/gi, (m) => (/\//.test(m) ? "</smiles>" : "<smiles>"));
    // Spaced slash form already normalized above; also "< / smiles >"
    s = s.replace(/<\s*\/\s*smiles\s*>/gi, "</smiles>");
    s = s.replace(/<\s*smiles\s*>/gi, "<smiles>");
    s = s.replace(/<\s*smiles\s*>([\s\S]*?)<\s*\/\s*smiles\s*>/gi, (_, raw) => {
      const smi = String(raw || "").replace(/\s+/g, "").trim();
      if (!smi || smi.length < 2) return "";
      return smilesImgTag(smi);
    });
    // Bare SMILES only when it clearly looks chemical — NOT math text (was blanking MCQ options)
    if (!/<img\b/i.test(s) && /smiles/i.test(String(html || ""))) {
      const plain = s.replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim();
      if (plain.length >= 8 && plain.length <= 220
        && /^[A-Za-z0-9@+\-\[\]()=#$/\\.%]+$/.test(plain)
        && /(?:c1|C1|n1|N1|O=C|\[C@|\[N\+)/.test(plain)
        && !/continu|differenti|function|increas|decreas|periodic|bounded|onto|into|inject|surject/i.test(plain)) {
        return smilesImgTag(plain);
      }
    }
    return s;
  }

  /**
   * Pool figures: Marks-native CDN first (reliable). Keep orig for fallback.
   */
  function quoteImgAttr(v) {
    return String(v || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function unwrapProxyUrl(url) {
    let u = String(url || "").trim();
    for (let i = 0; i < 4; i++) {
      if (!/proxy-image|restore-image/i.test(u)) break;
      try {
        const parsed = new URL(u, "https://www.quantrexacademy.com");
        const inner = parsed.searchParams.get("url");
        if (!inner) break;
        u = inner;
      } catch (_) { break; }
    }
    return u
      .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
      .replace(/https?:\/\/cdn-question-pool\.app\//gi, "https://cdn-question-pool.getmarks.app/");
  }

  function cleanPoolImgHtml(html) {
    let out = expandSmilesHtml(html);
    const toDisplay = (rawUrl) => {
      let url = unwrapProxyUrl(rawUrl);
      if (!url) return url;
      if (/data:|assets\/diagrams|assets\/qx-figures|pubchem\.ncbi|cactus\.nci/i.test(url)) return url;
      if (/cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\/|getmarks\.app/i.test(url)) {
        if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc) {
          return QxOwnedFigs.displaySrc(url) || url;
        }
        if (typeof QxImgClean !== "undefined" && QxImgClean.poolDisplaySrc) {
          return QxImgClean.poolDisplaySrc(url) || url;
        }
        return url.split("?")[0] || url;
      }
      return url;
    };
    // Always emit quoted src. Unquoted src=...url=... cuts at "=" and spills the path as text.
    out = out.replace(/<img\b([^>]*?)(\s*\/\s*)?>/gi, (full, attrs) => {
      let a = String(attrs || "").replace(/\/\s*$/, "").trim();
      const qm = a.match(/\bsrc\s*=\s*(["'])([\s\S]*?)\1/i);
      const um = !qm && a.match(/\bsrc\s*=\s*([^\s>]+)/i);
      let src = qm ? qm[2] : (um ? um[1] : "");
      if (!src) return full;
      if (/data:|assets\/diagrams|assets\/qx-figures|pubchem\.ncbi|cactus\.nci/i.test(src)
        && !/proxy-image|restore-image/i.test(src)) {
        return full;
      }
      const raw = unwrapProxyUrl(src);
      const disp = toDisplay(src);
      a = a
        .replace(/\bsrc\s*=\s*(["'])[\s\S]*?\1/i, "")
        .replace(/\bsrc\s*=\s*[^\s>]+/i, "")
        .replace(/\bdata-qx-orig-src\s*=\s*(["'])[\s\S]*?\1/i, "")
        .replace(/\bdata-qx-orig-src\s*=\s*[^\s>]+/i, "")
        .replace(/\balt\s*=\s*(["'])[\s\S]*?\1/i, "")
        .replace(/\balt\s*=\s*[^\s>]+/i, "")
        .replace(/\breferrerpolicy\s*=\s*(["'])[\s\S]*?\1/i, "")
        .replace(/\bdecoding\s*=\s*(["'])[\s\S]*?\1/i, "")
        .replace(/\bloading\s*=\s*(["'])[\s\S]*?\1/i, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!/\bclass\s*=/i.test(a)) {
        a += ' class="qx-pool-fig qx-no-wm qx-opt-fig-img qx-fig-ready"';
      } else if (!/qx-pool-fig|qx-no-wm/i.test(a)) {
        a = a.replace(/\bclass\s*=\s*(["'])([^"']*)\1/i, (m, q, c) =>
          `class=${q}${c} qx-pool-fig qx-no-wm qx-opt-fig-img qx-fig-ready${q}`);
      }
      a += ` src="${quoteImgAttr(disp)}" data-qx-orig-src="${quoteImgAttr(raw)}" alt="Reaction"`
        + ` referrerpolicy="no-referrer" decoding="async" loading="eager"`;
      return `<img ${a.trim()}>`;
    });
    // Strip spilled URLs only OUTSIDE tags — never punch src= of a live <img>
    if (typeof QxImgClean !== "undefined" && QxImgClean.stripSpilledFigUrls) {
      out = QxImgClean.stripSpilledFigUrls(out);
    } else {
      const parked = [];
      out = out.replace(/<[^>]+>/g, (tag) => {
        const k = "\uE210" + parked.length + "\uE211";
        parked.push(tag);
        return k;
      });
      out = out.replace(/(?:https?:\/\/|https?%3A%2F%2F|\/api\/proxy-image)[^\s<]*/gi, "");
      out = out.replace(/\uE210(\d+)\uE211/g, (_, i) => parked[+i] || "");
    }
    // Leftover attribute crumbs after a closed img (ss 912–914)
    out = out.replace(/(<\/(?:img|figure|div|span)>|>)\s*((?:loading|decoding|fetchpriority|referrerpolicy|crossorigin)\s*=\s*["']?[\w-]*["']?\s*)+/gi, "$1");
    return out;
  }

  function sizeOptionImgs(html) {
    return String(html || "")
      .replace(/<img\b([^>]*)>/gi, (full, attrs) => {
        let a = attrs;
        // Always tag option figures so clean/visibility pipeline picks them up
        if (!/\bclass=/i.test(a)) {
          a += ' class="qx-pool-fig qx-no-wm qx-opt-fig-img qx-fig-ready"';
        } else if (!/qx-pool-fig|qx-no-wm/i.test(a)) {
          a = a.replace(/\bclass=(["'])([^"']*)\1/i, (m, q, c) => `class=${q}${c} qx-pool-fig qx-no-wm qx-opt-fig-img qx-fig-ready${q}`);
        }
        // Compact option structures (BNH: keep bonds readable, less vertical scroll)
        const hdStyle = "max-width:min(100%,220px);max-height:130px;width:auto;height:auto;display:block;margin:4px auto;padding:2px;opacity:1;visibility:visible;object-fit:contain;background:#fff;border-radius:8px;image-rendering:high-quality";
        if (!/\bstyle=/i.test(a)) {
          a += ` style="${hdStyle}"`;
        } else {
          a = a.replace(/\bstyle=(["'])([^"']*)\1/i, (sm, q, st) => {
            let s = st
              .replace(/max-height\s*:\s*[^;]+;?/gi, "")
              .replace(/max-width\s*:\s*[^;]+;?/gi, "")
              .replace(/min-height\s*:\s*[^;]+;?/gi, "")
              .replace(/opacity\s*:\s*[^;]+;?/gi, "")
              .replace(/visibility\s*:\s*[^;]+;?/gi, "");
            s += ";" + hdStyle;
            return `style=${q}${s}${q}`;
          });
        }
        if (!/\bloading=/i.test(a)) a += ' loading="eager"';
        if (!/\bdecoding=/i.test(a)) a += ' decoding="async"';
        if (!/\bfetchpriority=/i.test(a)) a += ' fetchpriority="high"';
        if (!/\bonerror=/i.test(a)) {
          a += ' onerror="if(window.QxOwnedFigs&&QxOwnedFigs.retryOnError)QxOwnedFigs.retryOnError(this)"';
        }
        return `<img${a}>`;
      });
  }

  /**
   * Marks organic options often ship as: <img…/> : 3-Methylbutanal
   * or LaTeX formula : Ethyl butanoate — strip colon and stack structure + name.
   */
  function formatStructureNameOption(html) {
    let s = String(html || "").trim();
    if (!s) return s;
    if (/class=["'][^"']*qx-opt-pair/.test(s)) return s;

    // Strip accidental leading colon-only garbage after failed image strip
    s = s.replace(/^(?:&nbsp;|\s|<br\s*\/?>)*[:：]\s*/i, "");

    // Split on last " : " separator between structure and IUPAC-style name
    // Names often start with a digit: "3-Methylbutanal", "2-Methylbutan-3-ol"
    const m = s.match(/^(.*?)\s*[:：]\s+([0-9A-Za-z][A-Za-z0-9\s\-',.()/+]*)\s*$/);
    if (!m) {
      // Trailing " : Name" after img / self-closing tag
      const m2 = s.match(/^(.*(?:\/>|<\/(?:img|figure|span|div|p)>)\s*)\s*[:：]\s+([0-9A-Za-z][^:]{1,100})\s*$/i);
      if (!m2) return s;
      return wrapOptPair(m2[1], m2[2]);
    }
    const left = m[1].trim();
    const right = m[2].trim();
    // Name-like right side; left is structure (img / latex / formula)
    const leftIsStruct = /<img\b|\$|\\mathrm|\\text|CH[₀-₉0-9]|C[₀-₉0-9]|–|—|−/i.test(left)
      || /[A-Z][a-z]?[₀-₉0-9]/.test(left);
    const rightIsName = right.length >= 2 && right.length <= 100
      && !/<img\b/i.test(right)
      && !/^\$/.test(right)
      && /[A-Za-z]/.test(right);
    if (!leftIsStruct || !rightIsName) return s;
    return wrapOptPair(left, right);
  }

  function wrapOptPair(structHtml, nameText) {
    const struct = sizeOptionImgs(cleanPoolImgHtml(String(structHtml || "").trim()));
    const name = String(nameText || "").replace(/^[:：\s]+/, "").trim();
    if (!name) return struct;
    // Escape raw name only when not already HTML
    const nameHtml = /<[a-z][\s\S]*>/i.test(name)
      ? name
      : name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<div class="qx-opt-pair"><div class="qx-opt-pair-struct">${struct}</div>`
      + `<div class="qx-opt-pair-name">${nameHtml}</div></div>`;
  }

  function stripFigureLabel(html) {
    let s = String(html || "");
    if (!s) return s;
    const withoutImg = s.replace(/<img\b[^>]*>/gi, " ").replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, " ");
    const plain = withoutImg.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/\s+/g, " ").trim();
    if (/^(figure|fig\.?|diagram|image|structure|photo)$/i.test(plain)) {
      s = s.replace(/\b(?:figure|fig\.?|diagram|image|structure|photo)\b/gi, "");
      s = s.replace(/(?:<br\s*\/?>\s*){2,}/gi, "<br>");
      return s.trim();
    }
    s = s.replace(/(?:<br\s*\/?>|\s)*\b(?:figure|fig\.?|diagram)\b(?:<br\s*\/?>|\s)*(?=<img\b)/gi, "");
    s = s.replace(/(<img\b[^>]*>)(?:<br\s*\/?>|\s)*\b(?:figure|fig\.?|diagram)\b(?:<br\s*\/?>|\s)*/gi, "$1");
    return s;
  }

  function isFigPlaceholderTag(tag) {
    const t = String(tag || "");
    if (!t) return false;
    if (/\/assets\/diagrams|proxy-image|qx-org-|qx-book-|qx-self-|cdn-question-pool|cdn\.quizrr|firebasestorage/i.test(t)) {
      return false;
    }
    if (/\b(?:alt|title)\s*=\s*["'][^"']*\b(?:figure|fig\.?|diagram|image)\b/i.test(t)) return true;
    if (/\/(?:ic_)?(?:figure|fig)(?:[_-]?(?:placeholder|stub|icon|label|mark))?s?\.(?:png|jpe?g|gif|svg|webp)/i.test(t)) return true;
    const w = t.match(/\bwidth\s*[:=]\s*["']?(\d+)/i) || t.match(/\bwidth\s*:\s*(\d+)px/i);
    const h = t.match(/\bheight\s*[:=]\s*["']?(\d+)/i) || t.match(/\bheight\s*:\s*(\d+)px/i);
    if (w && parseInt(w[1], 10) > 0 && parseInt(w[1], 10) < 140) return true;
    if (h && parseInt(h[1], 10) > 0 && parseInt(h[1], 10) < 48) return true;
    return false;
  }

  function isFigStubHtml(html) {
    const s = String(html || "");
    const t = s.replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const textStub = !t || /^(figure|fig\.?|diagram|image|structure|photo)$/i.test(t);
    const imgs = s.match(/<img\b[^>]*>/gi) || [];
    if (!imgs.length) return textStub;
    if (imgs.every(isFigPlaceholderTag)) return true;
    if (/watermark_improved|28S2_o_|qx-org-|watermarked_images|qx-figures|AKCR2_|2026_modules|modules\/ms\//i.test(s)
      && !imgs.every(isFigPlaceholderTag)) {
      return false;
    }
    // Image-only options (<img/><br/>) are real figures, not stubs (ss938 Rank Booster)
    if (imgs.length && /cdn-question-pool|cdn\.quizrr|\/pyq\/|modules\/ms|proxy-image|assets\/diagrams/i.test(s)
      && !imgs.every(isFigPlaceholderTag)) {
      return false;
    }
    if (/cdn-question-pool|proxy-image|\/pyq\//i.test(s) && !imgs.every(isFigPlaceholderTag) && !textStub) {
      return false;
    }
    return textStub;
  }

  function figHtmlFromIndex(q, i) {
    if (!q) return "";
    try {
      if (window.QxSoftWm && typeof QxSoftWm.optHtmlFor === "function") {
        const filled = QxSoftWm.optHtmlFor(q);
        if (filled && filled[i]) return filled[i];
      }
      const idx = window._qxOptFigIndex;
      if (!idx) return "";
      const rec = idx[String(q.id)] || (q._marksId ? idx[String(q._marksId)] : null);
      const u = rec && rec.o && rec.o[i];
      if (!u) return "";
      const cdn = String(u).split("?")[0];
      const disp = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc)
        ? (QxOwnedFigs.displaySrc(cdn) || cdn)
        : ("/api/proxy-image?url=" + encodeURIComponent(cdn) + "&clean=1&v=qxfig111");
      const orig = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl)
        ? (QxOwnedFigs.ownedFigureUrl(cdn) || cdn)
        : cdn;
      return `<img class="qx-pool-fig qx-no-wm qx-opt-fig-img qx-fig-ready" src="${disp}" data-qx-orig-src="${String(orig).replace(/"/g, "")}" alt="" loading="eager">`;
    } catch (_) {
      return "";
    }
  }

  function prepareOptionBody(raw, q, i, htmlFn) {
    let src = raw;
    if (q && (!src || !String(src).trim())) {
      const fb = (q._qxOrigOptions || q._qxBankOptions || [])[i];
      if (fb) src = fb;
    }
    if (q && Array.isArray(q._qxBankOptions) && q._qxBankOptions[i]
      && /<img\b/i.test(String(q._qxBankOptions[i]))
      && isFigStubHtml(src)) {
      src = q._qxBankOptions[i];
    }
    if (q && isFigStubHtml(src)) {
      const recovered = figHtmlFromIndex(q, i);
      if (recovered) src = recovered;
    }
    let s = stripFigureLabel(expandSmilesHtml(String(src || "").trim()));
    if (!s) return "";
    // Bare numeric / latex answers (3, 11, $2Bau$) — never run figure/spill pipeline
    const plainS = s.replace(/<[^>]+>/g, "").trim();
    if (plainS && !/<img\b/i.test(s)
      && (/^[+\-]?\d+(?:\.\d+)?(?:\s*[/÷]\s*\d+(?:\.\d+)?)?$/.test(plainS)
        || /^\$[\s\S]+\$$/.test(plainS)
        || (/^\d/.test(plainS) && plainS.length <= 24 && !/http|proxy|%2F/i.test(plainS)))) {
      const render = htmlFn || htmlContent;
      return render(s);
    }
    const paired = formatStructureNameOption(s);
    if (paired !== s && /qx-opt-pair/.test(paired)) {
      // Structure half may still need QxImgClean for local assets
      if (q && q.id != null && typeof QxImgClean !== "undefined" && QxImgClean.renderOptionContent
        && /<img\b/i.test(s)) {
        // Re-run only on structure segment via renderOptionContent when possible
        const m = s.match(/^(.*?)\s*[:：]\s+([0-9A-Za-z][\s\S]*)$/);
        if (m) {
          const structOnly = m[1].trim();
          const nameOnly = m[2].trim();
          const structBody = optionContentCore(q, structOnly, i, htmlFn);
          return wrapOptPair(structBody, nameOnly);
        }
      }
      return paired;
    }
    if (/<img\b/i.test(s)) {
      return sizeOptionImgs(cleanPoolImgHtml(
        q && q.id != null ? optionContentCore(q, s, i, htmlFn) : s
      ));
    }
    return optionContentCore(q, s, i, htmlFn);
  }

  function optionContentCore(q, opt, i, htmlFn) {
    const render = htmlFn || htmlContent;
    const raw = String(opt || "");
    let out = "";
    if (q && q.id != null && typeof QxImgClean !== "undefined" && QxImgClean.renderOptionContent) {
      out = QxImgClean.renderOptionContent(q.id, i, opt, render);
    } else {
      out = render(opt);
    }
    const hasVisible = /<img\b/i.test(out) || String(out || "").replace(/<[^>]+>/g, " ").trim().length > 0;
    // Image-only options must never collapse to empty white boxes (screen 630)
    if (/<img\b/i.test(raw) && !/<img\b/i.test(out)) {
      return sizeOptionImgs(cleanPoolImgHtml(raw));
    }
    if (!hasVisible && /<img\b/i.test(raw)) {
      return sizeOptionImgs(cleanPoolImgHtml(raw));
    }
    if (!hasVisible && raw.trim()) return render(raw);
    return out;
  }

  function sanitizeNumVal(raw) {
    // Allow digits, one dot, leading minus, and one slash for simple fractions
    let v = String(raw || "").replace(/[^\d.\-\/]/g, "");
    const neg = v.startsWith("-");
    v = v.replace(/-/g, "");
    // At most one slash (a/b)
    const slash = v.indexOf("/");
    if (slash >= 0) {
      const left = v.slice(0, slash).replace(/\//g, "");
      let right = v.slice(slash + 1).replace(/\//g, "");
      // Single dot per side
      const fixDot = (s) => {
        const d = s.indexOf(".");
        if (d < 0) return s;
        return s.slice(0, d + 1) + s.slice(d + 1).replace(/\./g, "");
      };
      v = fixDot(left) + "/" + fixDot(right);
    } else {
      const dot = v.indexOf(".");
      if (dot >= 0) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "");
    }
    return neg ? "-" + v : v;
  }

  function renderNumericalEntry(val, opts) {
    const o = opts || {};
    const valEsc = String(val != null ? val : "").replace(/"/g, "&quot;");
    const disabled = o.disabled ? " disabled" : "";
    const readonly = o.readonly === true ? " readonly" : "";
    // Always NTA / JEE Main integer-type style: centered answer box + keypad
    const wrapCls = o.wrapClass || "qx-prac-numerical";
    const label = o.label || "Enter integer answer";
    return `<div class="${wrapCls} mtk-numerical mtk-numerical-wrap">
      <div class="qx-num-entry qx-num-cbt qx-num-nta qx-num-panel">
        
        
        <div class="qx-num-box-wrap">
          <input type="text" class="qx-num-input" id="qxNumInput" inputmode="decimal" autocomplete="off"
            placeholder="" value="${valEsc}"${readonly}${disabled}
            aria-label="Integer numerical answer" maxlength="12">
        </div>
        
        <div class="qx-num-keypad" id="qxNumKeypad" role="group" aria-label="Numeric keypad">
          <button type="button" class="qx-num-key qx-num-key-wide qx-num-key-back" data-num-key="back">⌫ Backspace</button>
          <button type="button" class="qx-num-key" data-num-key="7">7</button>
          <button type="button" class="qx-num-key" data-num-key="8">8</button>
          <button type="button" class="qx-num-key" data-num-key="9">9</button>
          <button type="button" class="qx-num-key" data-num-key="4">4</button>
          <button type="button" class="qx-num-key" data-num-key="5">5</button>
          <button type="button" class="qx-num-key" data-num-key="6">6</button>
          <button type="button" class="qx-num-key" data-num-key="1">1</button>
          <button type="button" class="qx-num-key" data-num-key="2">2</button>
          <button type="button" class="qx-num-key" data-num-key="3">3</button>
          <button type="button" class="qx-num-key" data-num-key="-">−</button>
          <button type="button" class="qx-num-key" data-num-key="0">0</button>
          <button type="button" class="qx-num-key" data-num-key=".">.</button>
          <button type="button" class="qx-num-key qx-num-key-wide qx-num-key-clear" data-num-key="clear">Clear All</button>
        </div>
      </div>
      ${o.correctHtml || ""}
    </div>`;
  }

  function bindNumericalKeypad(scope, onChange) {
    const input = scope.querySelector("#qxNumInput");
    const keypad = scope.querySelector("#qxNumKeypad");
    if (!input) return;
    const emit = () => {
      const cleaned = sanitizeNumVal(input.value);
      if (input.value !== cleaned) input.value = cleaned;
      const v = String(cleaned || "").trim();
      if (typeof onChange === "function") onChange(v);
    };
    const applyKey = (key) => {
      if (input.disabled || input.readOnly) return;
      let v = String(input.value || "");
      const pos = input.selectionStart != null ? input.selectionStart : v.length;
      if (key === "back") {
        if (pos > 0) v = v.slice(0, pos - 1) + v.slice(pos);
        input.value = v;
        const np = Math.max(0, pos - 1);
        input.setSelectionRange(np, np);
      } else if (key === "clear") {
        input.value = "";
      } else if (key === "left") {
        const np = Math.max(0, pos - 1);
        input.setSelectionRange(np, np);
      } else if (key === "right") {
        const np = Math.min(v.length, pos + 1);
        input.setSelectionRange(np, np);
      } else if (key === ".") {
        // Dot only on the current fraction side
        const slash = v.indexOf("/");
        const side = slash < 0 || pos <= slash ? v.slice(0, slash < 0 ? v.length : slash) : v.slice(slash + 1);
        if (side.includes(".")) return;
        v = v.slice(0, pos) + "." + v.slice(pos);
        input.value = v;
        input.setSelectionRange(pos + 1, pos + 1);
      } else if (key === "/") {
        if (v.includes("/")) return;
        v = v.slice(0, pos) + "/" + v.slice(pos);
        input.value = v;
        input.setSelectionRange(pos + 1, pos + 1);
      } else if (key === "-") {
        input.value = v.startsWith("-") ? v.slice(1) : "-" + v;
      } else {
        v = v.slice(0, pos) + key + v.slice(pos);
        input.value = v;
        input.setSelectionRange(pos + 1, pos + 1);
      }
      emit();
    };
    if (keypad) {
      keypad.querySelectorAll("[data-num-key]").forEach(btn => {
        btn.onclick = (e) => {
          e.preventDefault();
          applyKey(btn.getAttribute("data-num-key"));
        };
      });
    }
    input.oninput = emit;
    input.onkeydown = (e) => {
      if (input.disabled) return;
      const k = e.key;
      if (k === "Backspace") {
        e.preventDefault();
        applyKey("back");
        return;
      }
      if (k === "Delete") {
        e.preventDefault();
        let v = String(input.value || "");
        const pos = input.selectionStart != null ? input.selectionStart : v.length;
        input.value = v.slice(0, pos) + v.slice(pos + 1);
        emit();
        return;
      }
      if (k === "ArrowLeft") { e.preventDefault(); applyKey("left"); return; }
      if (k === "ArrowRight") { e.preventDefault(); applyKey("right"); return; }
      if (/^\d$/.test(k)) { e.preventDefault(); applyKey(k); return; }
      if (k === "." || k === "Decimal") { e.preventDefault(); applyKey("."); return; }
      if (k === "/" || k === "Divide") {
        e.preventDefault();
        // Simple fraction slash (one only)
        if (!String(input.value || "").includes("/")) applyKey("/");
        return;
      }
      if (k === "-" || k === "Subtract") { e.preventDefault(); applyKey("-"); return; }
      if (k === "Escape") { e.preventDefault(); applyKey("clear"); return; }
    };
    input.onpaste = (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text") || "";
      input.value = sanitizeNumVal(text);
      emit();
    };
    if (!input.disabled) {
      try { input.focus(); input.setSelectionRange(input.value.length, input.value.length); } catch (err) { /* ignore */ }
    }
    emit();
  }

  function normalizeBinomLatex(s) {
    return String(s || "")
      .replace(/\$\{\s*\}\s*\^\{\s*([^}]+)\s*\}\s*C_\{\s*([^}]+)\s*\}\s*\$/g, "$\\binom{$1}{$2}$")
      .replace(/\$\{\s*\^\{\s*([^}]+)\s*\}\s*C_\{\s*([^}]+)\s*\}\s*\$/g, "$\\binom{$1}{$2}$")
      .replace(/\{\s*\}\s*\^\{\s*([^}]+)\s*\}\s*C_\{\s*([^}]+)\s*\}/g, "\\binom{$1}{$2}")
      .replace(/\$\s*\^\{\s*([^}]+)\s*\}\s*C_\{\s*([^}]+)\s*\}\s*\$/g, "$\\binom{$1}{$2}$")
      .replace(/\$\{\s*\^\{\s*([^}]+)\s*\}\s*C_\{\s*([^}]+)\s*\}/g, "$\\binom{$1}{$2}")
      .replace(/(^|[^\\A-Za-z])\^\{\s*([^}]+)\s*\}\s*C_\{\s*([^}]+)\s*\}/g, "$1\\binom{$2}{$3}")
      .replace(/\$\{\s*\}\s*\^\{([^}]+)\}\s*C_\{([^}]+)\}/g, "$\\binom{$1}{$2}$");
  }

  function htmlContent(text) {
    let expanded = String(text || "");
    if (typeof QxProof !== "undefined" && QxProof.proofreadHtml) {
      try { expanded = QxProof.proofreadHtml(expanded); } catch(e) { console.error("Proofread failed", e); }
    }
    expanded = normalizeBinomLatex(expandSmilesHtml(expanded));
    expanded = cleanPoolImgHtml(expanded);
    return typeof Mx !== "undefined" ? Mx.html(expanded) : String(expanded || "");
  }

  function optionContent(q, opt, i, htmlFn) {
    // Structure + " : Name" pairs, local diagrams, and clean proxy
    return prepareOptionBody(opt, q, i, htmlFn);
  }

  function normalizeType(t) {
    const k = String(t || "").trim();
    if (!k || k === "unknown") return "";
    if (/multiple/i.test(k)) return "multipleCorrect";
    if (/numerical|integer/i.test(k)) return "numerical";
    if (/subjective|long|descriptive/i.test(k)) return "subjective";
    if (/single|^mcq$/i.test(k)) return "singleCorrect";
    return k;
  }

  function isMatchColumn(q) {
    if (!q) return false;
    if (q._advSection === "MATCH") return true;
    const text = String(q.q || q.question || "");
    const plainStem = text.replace(/<[^>]+>/g, " ");
    const hasList =
      /match\s+(the\s+)?list|list[\s\-]*i|list[\s\-]*ii|column\s*matching|matrix\s*match|match\s+each\s+entry|column\s*[i1]\b|column\s*[ii2]\b/i.test(plainStem)
      || (/List[\s\-]*I\b/i.test(plainStem) && /List[\s\-]*II\b/i.test(plainStem))
      || (/Column\s*I\b/i.test(plainStem) && /Column\s*II\b/i.test(plainStem))
      || /matching\s+list|codes?\s+[PQRS]\b/i.test(plainStem);
    const opts = q.options || [];
    const imgCount = opts.filter((o) => /<img\b/i.test(String(o || ""))).length;
    // Screenshot 887: Marks typed reaction-figure MCQs as columnMatch — never trust type
    // when options are structures and the stem is not List-I/II.
    if (imgCount >= 2 && !hasList) return false;
    const tField = String(q.questionType || q.type || "").toLowerCase();
    if (hasList && /column|match.?list|matrix.?match/i.test(tField)) return true;
    if (!hasList && /column|match.?list|matrix.?match/i.test(tField) && imgCount >= 1) return false;
    if (/column|match.?list|matrix.?match/i.test(tField) && hasList) return true;
    // Image-only MCQ options are not match codes — but List stem with image options can still be match
    const mapOpts = opts.filter((o) => looksLikeMatchOption(o));
    if (!hasList && imgCount >= 2) return false;
    if (mapOpts.length >= Math.max(2, Math.ceil(opts.length * 0.5))) return true;
    // List-I/II stem + majority mapping options
    if (hasList && mapOpts.length >= 2) return true;
    // List stem + options all look like P/Q/R/S codes after normalize (mathrm banks)
    if (hasList && opts.length >= 2 && mapOpts.length >= 1) return true;
    if (hasList && opts.length >= 3) {
      // Last resort: normalized options each have ≥2 P→n style pairs
      const soft = opts.filter((o) => {
        const t = normalizeMatchOptionText(o);
        return (t.match(/\b[PQRS]\b/gi) || []).length >= 2
          && (t.match(/\d/g) || []).length >= 2;
      });
      if (soft.length >= Math.ceil(opts.length * 0.5)) return true;
    }
    // Pure List stem + 4 short code-like options (even if detection is weak)
    if (hasList && opts.length >= 4) {
      const shortCodes = opts.filter((o) => {
        const t = normalizeMatchOptionText(o);
        return t.length > 0 && t.length < 120 && /[PQRS]/.test(t) && /\d/.test(t);
      });
      if (shortCodes.length >= 3) return true;
    }
    // Do not treat pure image MCQs without list language as match
    if (!hasList && hasImageOptions(q) && mapOpts.length < 2) return false;
    return false;
  }

  function hasImageOptions(q) {
    const opts = (q && q.options) || [];
    if (!opts.length) return false;
    return opts.some(o => /<img/i.test(String(o || "")));
  }

  function hasRealMcqOptions(q) {
    const optsRaw = (q && q.options) || [];
    // Real MCQ content only — bare "A"/"B"/"C"/"D" stubs are NOT real options (Marks NAT placeholders)
    let real = 0;
    for (const o of optsRaw) {
      const s = String(o || "");
      if (/<img\b|smiles|<math[\s>]/i.test(s)) { real++; continue; }
      const t = s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (!t) continue;
      if (/^[A-D]$/i.test(t)) continue;
      real++;
    }
    return real >= 2;
  }

  /** Options are only empty or letter A–D stubs (broken NAT / unhydrated) */
  function hasOnlyLetterOrEmptyOptions(q) {
    const optsRaw = (q && q.options) || [];
    if (!optsRaw.length) return true;
    return optsRaw.every(o => {
      const t = String(o || "").replace(/<[^>]+>/g, " ").trim();
      return !t || /^[A-D]$/i.test(t);
    });
  }

  function stemLooksLikeFillBlank(q) {
    const raw = String((q && q.q) || "");
    const decoded = raw
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&lowbar;|&#95;|&#x5f;/gi, "_")
      .replace(/\\_+/g, "____")
      .replace(/[\u2013\u2014\u2212\uFF3F\u02CD\u0332\u00AF]/g, "_");
    const qtext = decoded.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    // Marks / NTA NAT blanks: ____  $\_\_$  \qquad  "is ____."
    if (/_{3,}|\\qquad|\\\\qquad|\\quad/i.test(decoded)) return true;
    if (/nearest\s*integer|integer\s*type|fill\s*in\s*the\s*blank|numerical\s*value/i.test(qtext)) return true;
    if (/is\s+equal\s+to\s*[._\\\s]*$/i.test(qtext)) return true;
    if (/\bis\s+[_.\-–—]{2,}/i.test(qtext)) return true;
    if (/\bis\s+\.+\s*$/i.test(qtext)) return true;
    if (/\b(the )?(percentage|value|amount|number|mass|molar mass|mole fraction)\b[\s\S]{0,120}\bis\s*[._\s]*\.?$/i.test(qtext)) return true;
    return false;
  }

  /**
   * True for integer/numerical NAT items.
   * Marks often stores NAT with options ["A","B","C","D"] stubs + blank in stem — must be numerical UI.
   */
  function looksNumerical(q) {
    if (!q) return false;
    if (hasRealMcqOptions(q)) return false;

    const fromField = normalizeType(q.questionType || q.type);
    if (fromField === "numerical" || fromField === "subjective") return true;
    if (fromField === "multipleCorrect") return false;
    if (looksCodedSingleCorrect(q)) return false;

    if (q.correctValue != null && String(q.correctValue) !== "" && hasOnlyLetterOrEmptyOptions(q)) return true;

    // Letter-only stubs + fill-blank stem → NAT (screenshot 808 matrix question)
    if (hasOnlyLetterOrEmptyOptions(q) && stemLooksLikeFillBlank(q)) return true;

    // Empty options + explicit numerical bank type already handled; empty + blank stem
    const optsRaw = q.options || [];
    if ((!optsRaw.length || hasOnlyLetterOrEmptyOptions(q)) && stemLooksLikeFillBlank(q)) return true;

    if (hasOnlyLetterOrEmptyOptions(q)) {
      const qtext = String(q.q || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      if (/\bpercentage of\b|\bmolar mass\b|\bthe value of\b|\bnearest integer\b/i.test(qtext)) return true;
    }
    if (fromField === "singleCorrect" || fromField === "mcq") {
      // Still NAT if only letter stubs and blank stem (screenshot 920/921 sulphur %)
      if (hasOnlyLetterOrEmptyOptions(q) && stemLooksLikeFillBlank(q)) return true;
      return false;
    }

    // Do NOT treat answer index 0–3 alone as MCQ when options are letter stubs
    return false;
  }

  /** NDA / JEE Main “1 only / Both / Neither” and “A, C and E only” are radios */
  function looksCodedSingleCorrect(q) {
    const opts = ((q && q.options) || []).map((o) =>
      String(o || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    );
    if (opts.length < 3) return false;
    const coded = opts.filter((t) =>
      /^(1|2|3|4)\s+only\.?$/i.test(t)
      || /^both\b/i.test(t)
      || /^neither\b/i.test(t)
      || /^(1\s+and\s+2|2\s+and\s+3|1\s+and\s+3|1,\s*2\s+and\s+3)\s+only\.?$/i.test(t)
      || /^[a-e](?:\s*,\s*[a-e])*\s+and\s+[a-e]\s+only\.?$/i.test(t)
      || /^[a-e](?:\s*,\s*[a-e])+\s+only\.?$/i.test(t)
      || /^[a-e]\s+and\s+[a-e](\s+only)?\.?$/i.test(t)
      || /^[a-e]\s+only\.?$/i.test(t)
      || /^all of (the )?these\.?$/i.test(t)
      || /^none of (the )?(these|above)\.?$/i.test(t)
    );
    return coded.length >= Math.min(3, opts.length);
  }

  function looksAssertionReason(q) {
    const stem = String((q && (q.q || q.question)) || "").replace(/<[^>]+>/g, " ");
    if (!/\bassertion\b/i.test(stem) || !/\breason\b/i.test(stem)) return false;
    const opts = ((q && q.options) || []).map((o) =>
      String(o || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    );
    const ar = opts.filter((t) =>
      /assertion/i.test(t) || /reason is/i.test(t) || /explanation/i.test(t) || /both.*true/i.test(t)
    );
    return ar.length >= 2;
  }

  /** Official Adv multi-correct wording / section flag */
  function looksMultipleCorrect(q) {
    if (!q) return false;
    if (looksCodedSingleCorrect(q)) return false;
    if (Array.isArray(q.answers) && q.answers.length > 1) return true;
    if (Array.isArray(q.correctAnswers) && q.correctAnswers.length > 1) return true;
    if (Array.isArray(q.correct) && q.correct.length > 1) return true;
    if (q._advSection === "MC") return true;
    const t = normalizeType(q.questionType || q.type);
    if (t === "multipleCorrect") return true;
    // Use "Question:" segment when present (paragraphs often say "one or more than one from S,T")
    let stem = String(q.q || q.question || "").replace(/<[^>]+>/g, " ");
    const qi = stem.search(/Question\s*:/i);
    if (qi >= 0) stem = stem.slice(qi);
    // Official JEE Advanced multi language (one or more correct)
    if (/\bis\s*\(\s*are\s*\)/i.test(stem)) return true; // is(are) only with parens
    if (/\bstatement\s*\(s\)/i.test(stem) && /\bis\s*\(\s*are/i.test(stem)) return true;
    if (/\bwhich of the following statements?\s+is\s*\(are\)\b/i.test(stem)) return true;
    if (/\bwhich of the following\b[\s\S]{0,80}\bis\s*\(are\)/i.test(stem)) return true;
    if (/\bcorrect (?:option|statement)\(s\)\b/i.test(stem)) return true;
    // Official section language only — not "one or more reagents" / "one or more than one from S,T"
    if (/\bone or more than one\s+(?:of\s+the\s+)?(?:correct\s+)?(?:option|answer|statement)/i.test(stem)) return true;
    if (/\bONE OR MORE THAN ONE\s+(?:CORRECT\s+)?(?:OPTION|ANSWER)/i.test(stem)) return true;
    if (/\bwhich of the following\b[\s\S]{0,40}\bone or more\b/i.test(stem)) return true;
    // "is/are" (slash) is NDA/JEE Main coded-single wording — not JEE Adv multi
    if (/\bwhich of the following\b[\s\S]{0,60}\boption\(s\)\b/i.test(stem)) return true;
    if (/\bcorrect option\(s\)\b/i.test(stem)) return true;
    return false;
  }

  function getType(q) {
    if (!q) return "singleCorrect";
    // Coded "1 only / Both / Neither" is always one radio — never checkboxes
    if (q._boardWritten && looksAssertionReason(q)) return "assertionReason";
    if (q._boardWritten) return "subjective";
    if (looksCodedSingleCorrect(q)) return "singleCorrect";
    if (looksAssertionReason(q)) return "assertionReason";
    // True multi-answer key always wins
    if (Array.isArray(q.answers) && q.answers.length > 1) return "multipleCorrect";
    if (Array.isArray(q.correctAnswers) && q.correctAnswers.length > 1) return "multipleCorrect";
    // Match-list / column match: mapping options are single pick among codes
    // (do NOT treat "one or more reagents" stem wording as multi-correct)
    if (isMatchColumn(q)) {
      if (q._advSection === "MC" || (Array.isArray(q.answers) && q.answers.length > 1)) {
        return "multipleCorrect";
      }
      return "columnMatch";
    }
    if (looksCodedSingleCorrect(q)) return "singleCorrect";
    // Multi BEFORE single (real options exist on multi too)
    if (looksMultipleCorrect(q)) return "multipleCorrect";
    const fromField = normalizeType(q.questionType || q.type);
    if (fromField === "multipleCorrect") return "multipleCorrect";
    if (fromField === "columnMatch") {
      if (hasImageOptions(q)) return "singleCorrect";
      return "columnMatch";
    }

    // Explicit Marks numerical
    if (fromField === "numerical" || fromField === "subjective") {
      if (hasRealMcqOptions(q)) return "singleCorrect";
      return "numerical";
    }

    // Real MCQ option text/images → single correct (only if not multi)
    if (hasRealMcqOptions(q)) return "singleCorrect";

    // NAT: blank stem / letter stubs / correctValue
    if (looksNumerical(q)) {
      try {
        q.questionType = "numerical";
        q.type = "numerical";
      } catch (_) { /* */ }
      return "numerical";
    }

    // Only trust answer-index MCQ when options have real content (not A/B/C/D stubs)
    if (typeof q.answer === "number" && q.answer >= 0 && q.answer <= 3
      && (q.options || []).length >= 4 && !hasOnlyLetterOrEmptyOptions(q)) {
      return "singleCorrect";
    }

    if (fromField && fromField !== "singleCorrect") return fromField;
    if (fromField) return fromField;
    return "singleCorrect";
  }

  function typeLabel(q) {
    const t = getType(q);
    return TYPE_LABELS[t] || "Single Correct Type";
  }

  /**
   * Flatten MathML / HTML entities used in match codes to plain text.
   * Prevents blank options when bank stores P→2 as MathML.
   */
  function flattenMatchHtml(html) {
    let t = String(html || "");
    if (!t) return "";
    // Common entities
    t = t
      .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
      .replace(/&#8594;|&#x2192;|&rarr;/gi, "→")
      .replace(/&#8211;|&#x2013;|&ndash;/gi, "-")
      .replace(/&#8212;|&#x2014;|&mdash;/gi, "-")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"');
    // MathML operators → plain
    t = t.replace(/<mo[^>]*>\s*(?:→|&#8594;|&rarr;)\s*<\/mo>/gi, "→");
    t = t.replace(/<mo[^>]*>\s*[-–—]\s*<\/mo>/gi, "-");
    t = t.replace(/<mo[^>]*>\s*,\s*<\/mo>/gi, ",");
    t = t.replace(/<mo[^>]*>\s*;\s*<\/mo>/gi, ";");
    t = t.replace(/<mo[^>]*>\s*[|=:]\s*<\/mo>/gi, "-");
    t = t.replace(/<\/?m(?:text|i|n|row|fenced|math|mrow|mtd|mtr|mtable|semantics|annotation)[^>]*>/gi, " ");
    t = t.replace(/<[^>]+>/g, " ");
    return t;
  }

  /**
   * Normalize bank match options before detection/render.
   * Handles: \mathrm{P}-3, P → 2, a-p;b-r, A-III, (A)-(IV), MathML, mtext.
   */
  function normalizeMatchOptionText(opt) {
    let t = flattenMatchHtml(opt);
    if (!t) return "";
    // \mathrm{P} / \text{P} / \mathbf{P} → P  (incl. \mathrm{~S})
    t = t.replace(/\\(?:mathrm|text|mathbf|textrm|textit|bold|boldsymbol)\s*\{\s*~?([A-Za-z0-9]+)\s*\}/gi, "$1");
    t = t.replace(/\\(?:mathrm|text|mathbf)\s*([A-Za-z])/gi, "$1");
    // All arrow forms → unicode arrow
    t = t.replace(/\$\\(?:long)?rightarrow\$/gi, "→");
    t = t.replace(/\$\\(?:long)?leftarrow\$/gi, "←");
    t = t.replace(/\\(?:long)?rightarrow(?![a-zA-Z])/gi, "→");
    t = t.replace(/\\(?:long)?leftarrow(?![a-zA-Z])/gi, "→");
    t = t.replace(/\$\\to\$/gi, "→");
    t = t.replace(/\\to(?![a-zA-Z])/gi, "→");
    t = t.replace(/⟶|⇒|⟹|-->|->/g, "→");
    t = t.replace(/\$+/g, "");
    // Drop remaining simple latex wrappers
    t = t.replace(/\\([a-zA-Z]+)\s*/g, (m, cmd) => {
      if (/^(mathrm|text|mathbf|textrm|left|right|quad|qquad|hspace|vspace|sim|,|;|!)$/i.test(cmd)) return "";
      return m;
    });
    t = t.replace(/[{}~]/g, " ");
    t = t.replace(/\s*;\s*/g, "; ");
    t = t.replace(/\s*,\s*/g, ", ");
    t = t.replace(/\|+/g, " ");
    t = t.replace(/\s+/g, " ").trim();
    return t;
  }

  function renderMatchPairsHtml(pairs) {
    if (!pairs || pairs.length < 1) return "";
    const ARR = "&#8594;";
    return `<span class="qx-match-pairs mathjax_ignore tex2jax_ignore" role="list">${pairs.map((p, idx) =>
      `<span class="qx-match-pair" role="listitem">`
      + `<b class="qx-match-lab">${p.lab}</b>`
      + `<span class="qx-match-arr" aria-hidden="true">${ARR}</span>`
      + `<b class="qx-match-val">${p.val}</b>`
      + `</span>`
      + (idx < pairs.length - 1 ? `<span class="qx-match-sep" aria-hidden="true">;</span>` : "")
    ).join("")}</span>`;
  }

  /**
   * Extract mapping pairs from any known match-code bank format.
   * Returns [{lab, val}, ...]
   */
  function extractMatchPairs(opt) {
    const raw = String(opt || "").replace(/<img\b[^>]*>/gi, " ").trim();
    if (!raw) return [];
    const pairsEarly = [];
    const seenEarly = new Set();
    const pushEarly = (lab, val) => {
      const L = String(lab || "").toUpperCase();
      const V = String(val || "").trim();
      if (!L || !V || seenEarly.has(L) || L === "LIST") return;
      seenEarly.add(L);
      pairsEarly.push({ lab: L, val: V });
    };
    // Bank form: $\mathrm{P} \rightarrow 1 ; \mathrm{Q} \rightarrow 5$
    let lm;
    const reLatex = /\\mathrm\s*\{\s*([PQRS])\s*\}\s*\\(?:long)?rightarrow\s*(\d{1,2})/gi;
    while ((lm = reLatex.exec(raw)) !== null) pushEarly(lm[1], lm[2]);
    if (pairsEarly.length >= 2) return pairsEarly;
    let t = normalizeMatchOptionText(raw);
    // Keep a second pass on lightly cleaned raw (MathML entities already flattened)
    const t2 = flattenMatchHtml(raw)
      .replace(/\\(?:mathrm|text|mathbf)\{([^}]*)\}/gi, "$1")
      .replace(/\\(?:long)?rightarrow/gi, "→")
      .replace(/\$/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    t = (t + " ; " + t2).replace(/\s+/g, " ").trim();

    const pairs = [];
    const seenLab = new Set();
    const pushPair = (lab, val) => {
      let L = String(lab || "").trim();
      let V = String(val || "").trim();
      if (!L || !V) return;
      // Normalize roman / lower
      L = L.toUpperCase();
      // p-s letter codes as list-II labels stay uppercase
      if (/^[IVX]+$/i.test(V)) V = V.toUpperCase();
      else if (/^[a-z]$/.test(V)) V = V.toUpperCase();
      if (seenLab.has(L)) return;
      // Avoid false pairs like "List-I" → skip if lab is LIST
      if (L === "LIST" || L === "COLUMN") return;
      seenLab.add(L);
      pairs.push({ lab: L, val: V });
    };

    let m;
    // 1) P → 2 | P-3 | P:2 | (P)→(2) | P - iv | A-III | (A)-(IV)
    const re1 = /(?:\(?([PQRS]|[A-Da-d]|[pqrs])\)?)\s*(?:→|->|–|—|-|:|=)\s*\(?(\d{1,2}|[IVXivx]{1,5}|[pqrsPQRS])\)?/g;
    while ((m = re1.exec(t)) !== null) pushPair(m[1], m[2]);

    // 2) P (3), Q (1), R (2), S(4)
    if (pairs.length < 2) {
      const re2 = /\b([PQRS]|[A-D]|[a-d]|[pqrs])\s*[\(\[]\s*(\d{1,2}|[IVXivx]{1,5})\s*[\)\]]/gi;
      while ((m = re2.exec(t)) !== null) pushPair(m[1], m[2]);
    }

    // 3) P-3, Q-5, R-4, S-1  (comma separated, already partially in re1)
    if (pairs.length < 2) {
      const re3 = /\b([PQRS]|[A-D])\s*[-–]\s*(\d{1,2}|[IVX]{1,5})\b/gi;
      while ((m = re3.exec(t)) !== null) pushPair(m[1], m[2]);
    }

    // 4) a-p; b-r; c-q; d-s  (lowercase letter to letter)
    if (pairs.length < 2) {
      const re4 = /\b([a-dA-D])\s*[-–→:]\s*([p-sP-S])\b/g;
      while ((m = re4.exec(t)) !== null) pushPair(m[1], m[2]);
    }

    // 5) A-III, B-I, C-IV, D-II (no spaces, roman)
    if (pairs.length < 2) {
      const re5 = /\b([A-D])\s*[-–]\s*(I{1,3}|IV|V|VI{0,3}|IX|X)\b/gi;
      while ((m = re5.exec(t)) !== null) pushPair(m[1], m[2]);
    }

    // 6) (A)-(IV), (B)-(II) already in re1; also "A-III, B-IV, C-I, D-II"
    if (pairs.length < 2) {
      const re6 = /([A-D])\s*[-–,]\s*(I{1,3}|IV|V)/gi;
      while ((m = re6.exec(t)) !== null) pushPair(m[1], m[2]);
    }

    // 7) P 2 Q 4 (space only)
    if (pairs.length < 2) {
      const re7 = /\b([PQRS])\s+(\d{1,2})\b/gi;
      while ((m = re7.exec(t)) !== null) pushPair(m[1], m[2]);
    }

    // 8) "i and r; ii and t" style (roman/lowercase codes)
    if (pairs.length < 2 && /\band\b/i.test(t)) {
      const re8 = /\b(i{1,3}|iv|v|[1-4])\s+and\s+([a-z]|[pqrstu]|[1-9])/gi;
      while ((m = re8.exec(t)) !== null) pushPair(m[1], m[2]);
    }

    // 9) I → P, Q  |  (I)→(P),(Q)  |  I - P,Q  (JEE Adv MathML banks)
    if (pairs.length < 2) {
      const re9 = /\(?\b(I{1,3}|IV|V|VI{0,3})\b\)?\s*(?:→|->|–|—|-|:|=)\s*\(?([PQRS](?:\s*,\s*[PQRS])*)\)?/gi;
      while ((m = re9.exec(t)) !== null) pushPair(m[1], m[2].replace(/\s+/g, ""));
    }

    return pairs;
  }

  /**
   * Format List-match mapping options as clean chips.
   * Never blank — always show readable mapping text.
   */
  function formatMatchCombo(opt) {
    const raw = String(opt || "").trim();
    if (!raw) return `<span class="qx-match-combo mathjax_ignore">—</span>`;
    // Pure image option (rare for match codes)
    const textOnly = raw.replace(/<img\b[^>]*>/gi, " ");
    if (/<img\b/i.test(raw) && extractMatchPairs(textOnly).length < 2) {
      return htmlContent(raw);
    }

    const pairs = extractMatchPairs(raw);
    if (pairs.length >= 2) return renderMatchPairsHtml(pairs);
    if (pairs.length === 1) return renderMatchPairsHtml(pairs);

    // Fallback: readable plain mapping — never empty / raw \rightarrow / raw MathML
    let safe = normalizeMatchOptionText(raw);
    if (!safe || safe.length < 2) {
      safe = flattenMatchHtml(raw).replace(/\s+/g, " ").trim();
    }
    safe = safe
      .replace(/\\(?:long)?rightarrow/gi, "→")
      .replace(/→/g, "&#8594;")
      .replace(/\\[a-zA-Z]+/g, "")
      .replace(/\$+/g, "")
      .trim();
    if (!safe) safe = "Option mapping";
    return `<span class="qx-match-combo mathjax_ignore tex2jax_ignore">${safe.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>`;
  }

  /**
   * Pure column-match codes — expanded for real JEE Main/Adv bank forms.
   */
  function looksLikeMatchOption(opt) {
    const raw = String(opt || "");
    if (!raw) return false;
    const withoutImg = raw.replace(/<img\b[^>]*>/gi, " ");
    if (/<img\b/i.test(raw) && !/[PQRS]|List|match/i.test(withoutImg)) return false;
    if (/<img\b/i.test(raw) && extractMatchPairs(withoutImg).length < 2) return false;

    // Heavy calculus only (not match) — skip unless clear P/Q labels
    if (/\\frac|\\sqrt|\\int|\\sum|\\begin\{(?!array)/i.test(raw)
      && !/\\mathrm\{[PQRS]\}|[PQRS]\s*[-–→]|List\s*[-–]?\s*I/i.test(raw)
      && !/<mtext/i.test(raw)) {
      return false;
    }

    const pairs = extractMatchPairs(raw);
    if (pairs.length >= 2) return true;

    const plain = normalizeMatchOptionText(raw);
    if (!plain || plain.length > 220) return false;

    // Soft: "P-3, Q-5" style count
    const soft = (plain.match(/\b([PQRS]|[A-D]|[a-d])\s*[-–→:(]\s*(\d|[IVX]|[p-s])/gi) || []).length;
    if (soft >= 2) return true;
    // a-p;b-r
    if ((plain.match(/\b[a-d]\s*[-–]\s*[p-s]\b/gi) || []).length >= 2) return true;
    // A-III, B-I
    if ((plain.match(/\b[A-D]\s*[-–]\s*(I{1,3}|IV|V)\b/gi) || []).length >= 2) return true;
    // I → P, Q
    if ((plain.match(/\b(I{1,3}|IV)\s*(?:→|->|-)\s*[PQRS]/gi) || []).length >= 2) return true;
    return false;
  }

  /**
   * Normalize one answer token → 0-based option index.
   * Accepts: 0, "0", 1, "A"/"a", "option B", 1-based if clearly letter-mapped.
   */
  function parseAnswerIndex(raw, optCount) {
    if (raw == null || raw === "") return null;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      const n = Math.trunc(raw);
      if (n >= 0 && (optCount == null || n < optCount)) return n;
      // 1-based fallback only when n == optCount (e.g. answer 4 with 4 options → index 3)
      if (optCount != null && n === optCount && n >= 1) return n - 1;
      if (n >= 0) return n;
      return null;
    }
    const s = String(raw).trim();
    // Letter A–D (and E–H for rare multi)
    const letM = s.match(/^(?:option\s*)?([A-Ha-h])\.?$/i)
      || s.match(/^\(([A-Ha-h])\)$/i);
    if (letM) return letM[1].toUpperCase().charCodeAt(0) - 65;
    // Pure digit string
    if (/^\d+$/.test(s)) {
      const n = parseInt(s, 10);
      if (Number.isFinite(n) && n >= 0) {
        if (optCount != null && n === optCount && n >= 1) return n - 1;
        return n;
      }
    }
    return null;
  }

  function correctIndices(q) {
    if (!q) return [0];
    const nOpts = (q.options || []).length || null;
    const out = [];
    const push = (v) => {
      const i = parseAnswerIndex(v, nOpts);
      if (i != null && i >= 0 && !out.includes(i)) out.push(i);
    };
    if (Array.isArray(q.answers) && q.answers.length) {
      q.answers.forEach(push);
    } else if (q.answer != null && q.answer !== "") {
      push(q.answer);
    }
    out.sort((a, b) => a - b);
    return out.length ? out : [];
  }

  function correctNumerical(q) {
    if (!q) return "";
    if (q.correctValue != null && String(q.correctValue) !== "") return String(q.correctValue).trim();
    if (q.correctAnswer != null && String(q.correctAnswer) !== "" && !hasRealMcqOptions(q)) {
      return String(q.correctAnswer).trim();
    }
    const idx = correctIndices(q)[0];
    const opts = idx != null ? (q.options || [])[idx] : null;
    return opts != null ? String(opts).replace(/<[^>]+>/g, "").trim() : "";
  }

  function optionsAreShortText(q) {
    const opts = (q && q.options) || [];
    if (opts.length < 2) return false;
    return opts.every((o) => {
      const t = String(o || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return t.length > 0 && t.length <= 36 && !/[.]{2,}/.test(t);
    });
  }

  function optsLayoutClass(q) {
    const t = getType(q);
    if (t === "numerical" || t === "subjective") return "";
    if (t === "multipleCorrect") return "qx-opts-multi";
    if (t === "columnMatch" || isMatchColumn(q)) return "qx-opts-match";
    if (hasImageOptions(q)) return "qx-opts-img";
    if (optionsAreShortText(q)) return "qx-opts-short";
    return "qx-opts-stack";
  }

  function typeBadgeHtml(q) {
    const label = typeLabel(q);
    const t = getType(q);
    const cls = "qx-qtype-badge qx-qtype-" + t.replace(/[^a-z]/gi, "").toLowerCase();
    return `<span class="${cls}">${label}</span>`;
  }

  function optionControlClass(q) {
    const t = getType(q);
    return t === "multipleCorrect" ? "qx-prac-check" : "qx-prac-radio";
  }

  function renderOptions(q, state) {
    const st = state || {};
    const done = !!st.done;
    const t = getType(q);
    if ((t === "numerical" || t === "subjective") && q && q._boardWritten) {
      return `<div class="qx-board-written" style="padding:14px 16px;border:1px dashed #cbd5e1;border-radius:12px;background:#f8fafc;color:#334155;font-size:14px">Write your answer in your notebook, then tap <strong>View Solution</strong>.</div>`;
    }
    if (t === "numerical" || t === "subjective") {
      const val = st.selected != null ? String(st.selected) : "";
      const cor = correctNumerical(q);
      let cls = "qx-prac-numerical mtk-numerical-wrap";
      if (done && val) {
        const ok = checkNumerical(val, cor);
        cls += ok ? " correct" : " wrong";
      }
      const correctHtml = done && cor
        ? `<p class="qx-num-correct">Correct answer: <strong>${cor.replace(/</g, "&lt;")}</strong></p>`
        : "";
      return renderNumericalEntry(val, {
        wrapClass: cls,
        disabled: done,
        correctHtml,
        cbt: true,
        label: "Enter integer answer"
      });
    }

    const selected = st.selected;
    const selectedSet = Array.isArray(selected)
      ? new Set(selected)
      : (selected != null ? new Set([selected]) : new Set());
    const correct = new Set(correctIndices(q));
    const multi = t === "multipleCorrect";
    const ctrl = optionControlClass(q);

    const match = t === "columnMatch";
    if (q && typeof QxImgClean !== "undefined" && QxImgClean.restoreOptionsFromPin) {
      try { QxImgClean.restoreOptionsFromPin(q); } catch (_) { /* */ }
    }
    if (q && (!q.options || !q.options.some((o) => {
      const s = String(o || "");
      if (/<img\b/i.test(s)) return true;
      const t0 = s.replace(/<[^>]+>/g, "").trim();
      return t0 && !/^[A-D]$/i.test(t0);
    })) && (q._qxOrigOptions || q._qxBankOptions)) {
      q.options = (q._qxOrigOptions || q._qxBankOptions).slice();
    }
    const opts = q.options || [];
    // Empty only — letter A–D options are valid (stem structures / divisions labeled A–D)
    const plainOpts = opts.map(o => String(o || "").replace(/<[^>]+>/g, "").trim());
    const hasImgOpt = opts.some(o => /<img\b/i.test(String(o || "")));
    const isEmpty = !opts.length || (!hasImgOpt && plainOpts.every(t => !t));
    if (isEmpty) {
      return `<div class="empty qx-load-opts" style="padding:20px;grid-column:1/-1">Loading options… <button type="button" class="btn-soft sm" onclick="typeof qxRetryPracticeLoad==='function'&&qxRetryPracticeLoad()">Retry</button></div>`;
    }
    // Book pack bug: pure A–D with no stem figure → still loading (Rank Booster)
    const letterOnly = plainOpts.length >= 2 && plainOpts.every(t => /^[A-D]$/i.test(t));
    const stemHasFig = /<img\b/i.test(String((q && q.q) || ""));
    const isBook = !!(q && (q._book || q._bookId));
    // Digital books: letter-only A–D is valid when the figure is in the stem — never stall on Loading

    /**
     * Fix `$C < B < A$` — bare < in LaTeX was parsed as HTML and options vanished.
     * NEVER rewrite real HTML / MathML tags (screenshot 696: "with <math>…" was destroyed).
     */
    function protectMathLtGt(s) {
      let out = String(s || "");
      // Restore ‹math…› pseudo-tags first
      if (typeof Mx !== "undefined" && typeof Mx.restoreAngleQuoteTags === "function") {
        out = Mx.restoreAngleQuoteTags(out);
      } else {
        out = out.replace(/‹\s*(\/?\s*math\b[^›]*)›/gi, "<$1>");
        out = out.replace(/‹\s*(\/?\s*[a-z][a-z0-9]*\b[^›]*)›/gi, "<$1>");
      }
      // Skip global < rewrite when HTML/MathML present
      if (/<(?:math|mi|mo|mn|msup|msub|mrow|mfrac|img|br|sub|sup|span|div|table|td|tr)\b/i.test(out)) {
        return out;
      }
      out = out.replace(/\$([^$]*)\$/g, (_, inner) => {
        const t = String(inner)
          .replace(/&lt;/gi, " \\lt ")
          .replace(/&gt;/gi, " \\gt ")
          .replace(/(^|[^\\])</g, "$1 \\lt ")
          .replace(/(^|[^\\])>/g, "$1 \\gt ");
        return "$" + t + "$";
      });
      // Bare letter-order comparisons only (C < B < A), not "with <math"
      if (!/\$/.test(out) && /\b[A-D]\s*<\s*[A-D]\b/.test(out)) {
        out = out
          .replace(/\b([A-D])\s*<\s*(?=[A-D]\b)/g, "$1 $\\lt$ ")
          .replace(/\b([A-D])\s*>\s*(?=[A-D]\b)/g, "$1 $\\gt$ ");
      }
      return out;
    }

    return opts.map((o, i) => {
      let raw = protectMathLtGt(String(o || "").trim());
      // Never render undefined/null/[object Object]
      if (/^(undefined|null|\[object Object\])$/i.test(raw)) raw = "";
      const plain = raw.replace(/<[^>]+>/g, "").trim();
      const rawHasImg = /<img\b/i.test(raw);
      if (!raw && !rawHasImg) {
        const recovered = figHtmlFromIndex(q, i) || prepareOptionBody("", q, i);
        if (recovered && /<img\b/i.test(recovered)) {
          return `<button type="button" class="qx-prac-opt qx-prac-opt-img" data-prac-opt="${i}">
            <span class="mtk-opt-letter qx-opt-circle">${String.fromCharCode(65 + i)}</span>
            <span class="qx-prac-opt-text qx-content">${recovered}</span>
          </button>`;
        }
        return `<button type="button" class="qx-prac-opt qx-opt-broken" data-prac-opt="${i}" disabled>
          <span class="mtk-opt-letter qx-opt-circle">${String.fromCharCode(65 + i)}</span>
          <span class="qx-prac-opt-text qx-content empty">Option unavailable</span>
        </button>`;
      }
      if (!raw) return "";
      let cls = "qx-prac-opt" + (rawHasImg ? " qx-prac-opt-img" : "");
      if (multi) cls += " qx-prac-opt-multi";
      if (match) cls += " qx-prac-opt-match";
      if (!done && selectedSet.has(i)) cls += " selected";
      if (done) {
        if (correct.has(i)) cls += " correct";
        else if (selectedSet.has(i)) cls += " wrong";
        else if (!multi && selectedSet.has(i)) cls += " wrong";
      }
      let optBody;
      // Column-match question → always chips with arrows (incl. \mathrm{P} → 2 bank form)
      const looksMap = !rawHasImg && (looksLikeMatchOption(raw)
        || /[PQRS]\s*(?:→|\$\\(?:long)?rightarrow\$|\\(?:long)?rightarrow)\s*\d/i.test(raw)
        || /\\mathrm\{[PQRS]\}\s*(?:→|\\rightarrow)/i.test(raw)
        || (normalizeMatchOptionText(raw).match(/\b[PQRS]\s*→\s*\d/gi) || []).length >= 2);
      // mapLike must be defined here — was undefined (ReferenceError → "Options error")
      const mapLike = !!(match || looksMap);
      if (mapLike) {
        optBody = formatMatchCombo(raw);
        if (!/qx-match-pair|qx-match-combo/.test(String(optBody || ""))) {
          optBody = formatMatchCombo(String(raw).replace(/\$/g, " ").replace(/\\/g, " "));
        }
        // Absolute fallback: hand-build from P/Q/R/S + digits
        if (!/qx-match-pair/.test(String(optBody || ""))) {
          const pairs = [];
          const re = /([PQRS])\D{0,12}?(\d)/gi;
          let mm;
          while ((mm = re.exec(String(raw))) !== null) pairs.push({ lab: mm[1].toUpperCase(), val: mm[2] });
          if (pairs.length >= 2) {
            optBody = `<span class="qx-match-pairs mathjax_ignore">${pairs.map((p) =>
              `<span class="qx-match-pair"><b>${p.lab}</b><span class="qx-match-arr">&#8594;</span><b>${p.val}</b></span>`
            ).join("<span class=\"qx-match-sep\">;</span>")}</span>`;
          }
        }
        cls += " qx-prac-opt-match";
      } else if (/^[ABCD]$/i.test(plain) && !rawHasImg && !/[\\$]|C_\{|\^\{|\\binom/.test(raw)) {
        optBody = `<span class="qx-letter-opt">${plain.toUpperCase()}</span>`;
      } else if (isFigStubHtml(raw) && !rawHasImg) {
        optBody = prepareOptionBody((q._qxBankOptions && q._qxBankOptions[i]) || raw, q, i);
        if (isFigStubHtml(optBody) && !/<img\b/i.test(String(optBody || ""))) {
          const recovered = figHtmlFromIndex(q, i);
          optBody = recovered || `<span class="qx-fig-loading" data-qx-fig-wait="${i}"></span>`;
        }
      } else {
        // Chemistry / math / image options — full render (Mx + KaTeX)
        try {
          optBody = optionContent(q, raw, i);
        } catch (oe) {
          console.warn("optionContent failed", i, oe);
          optBody = "";
        }
        if (rawHasImg && !/<img\b/i.test(String(optBody || ""))) {
          optBody = sizeOptionImgs(cleanPoolImgHtml(formatStructureNameOption(raw)));
        }
        if (!String(optBody || "").trim() && raw) {
          try {
            optBody = htmlContent(protectMathLtGt(raw));
          } catch (_) {
            // MathML / raw HTML fallback — never blank the option
            optBody = raw;
          }
        }
      }
      if (!String(optBody || "").replace(/<[^>]+>/g, "").trim() && !/<img/i.test(String(optBody || ""))) {
        if (/qx-fig-loading|data-qx-fig-wait/.test(String(optBody || ""))) {
          /* keep shimmer */
        } else if (rawHasImg) optBody = sizeOptionImgs(cleanPoolImgHtml(formatStructureNameOption(raw)));
        else if (plain && !/^(figure|fig\.?|diagram|image|structure|photo)$/i.test(plain)) {
          optBody = (typeof Mx !== "undefined" && Mx.html) ? Mx.html(protectMathLtGt(plain)) : plain;
        } else if (raw && !isFigStubHtml(raw)) optBody = raw;
        else optBody = `<span class="qx-fig-loading" data-qx-fig-wait="${i}"></span>`;
      }
      // Never skip index i — missing options bug when map returns ""
      if (!String(optBody || "").trim()) optBody = `<span class="qx-opt-plain">${letter(i)}</span>`;
      // Marks-style multi: checkbox + letter
      const multiCtrl = multi
        ? `<span class="qx-prac-check mtk-opt-check" aria-hidden="true"></span>`
        : "";
      return `<button type="button" class="${cls}" data-prac-opt="${i}" ${done ? "disabled" : ""}>
        ${multiCtrl}
        <span class="mtk-opt-letter qx-opt-circle" aria-hidden="true">${letter(i)}</span>
        <span class="qx-prac-opt-text ${mapLike ? "qx-match-opt" : "qx-content"}">${optBody}</span>
      </button>`;
    }).join("") || `<div class="empty qx-load-opts" style="padding:20px">Options unavailable</div>`;
  }

  function renderTestOptions(q, selected, htmlFn) {
    try {
      if (typeof qxRestoreQuestionContent === "function") qxRestoreQuestionContent(q);
    } catch (_) { /* */ }
    const t = getType(q);
    const render = htmlFn || htmlContent;
    if ((t === "numerical" || t === "subjective") && q && q._boardWritten) {
      return `<div class="qx-board-written" style="padding:14px 16px;border:1px dashed #cbd5e1;border-radius:12px;background:#f8fafc;color:#334155;font-size:14px">Write your answer, then open View Solution.</div>`;
    }
    if (t === "numerical" || t === "subjective") {
      const val = selected != null ? String(selected) : "";
      return renderNumericalEntry(val, { cbt: true, label: "Enter integer answer" });
    }
    const multi = t === "multipleCorrect";
    const match = t === "columnMatch";
    const selectedSet = Array.isArray(selected)
      ? new Set(selected)
      : (selected != null ? new Set([selected]) : new Set());
    const ctrlHtml = multi ? '<span class="qx-prac-check mtk-opt-check"></span>' : "";
    const optsList = q.options || [];
    const plainT = optsList.map(o => String(o || "").replace(/<[^>]+>/g, "").trim());
    const hasImgT = optsList.some(o => /<img\b/i.test(String(o || "")));
    if (!optsList.length || (!hasImgT && plainT.every(x => !x))) {
      if (q && !q._optsFillQueued && typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion) {
        q._optsFillQueued = true;
        QuantrexCatalog.fillQuestion(q).then(function () {
          try {
            if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.refresh) QuantrexTestEngine.refresh();
          } catch (_) { /* */ }
        });
      }
      return `<div class="empty" style="padding:24px;grid-column:1/-1">Loading options…</div>`;
    }

    const buttons = optsList.map((o, i) => {
      const raw = String(o || "").trim();
      const plain = raw.replace(/<[^>]+>/g, "").trim();
      const rawHasImg = /<img\b/i.test(raw);
      // Empty option slot — still show letter so card is not blank (Marks always shows A–D body)
      if (!raw && !rawHasImg) {
        const recovered = figHtmlFromIndex(q, i) || prepareOptionBody("", q, i, render);
        if (recovered && /<img\b/i.test(recovered)) {
          return `<button type="button" class="mtk-opt mtk-opt-img ${selectedSet.has(i) ? "selected" : ""}" data-opt="${i}">
            <span class="mtk-opt-radio" aria-hidden="true"></span>
            <span class="mtk-opt-letter qx-opt-circle" aria-hidden="true">${letter(i)}</span>
            <span class="mtk-opt-text qx-content">${recovered}</span>
          </button>`;
        }
        return `<button type="button" class="mtk-opt ${selectedSet.has(i) ? "selected" : ""}" data-opt="${i}">
          <span class="mtk-opt-radio" aria-hidden="true"></span>
          <span class="mtk-opt-letter qx-opt-circle" aria-hidden="true">${letter(i)}</span>
          <span class="mtk-opt-text qx-content"><span class="qx-opt-plain">—</span></span>
        </button>`;
      }
      const on = selectedSet.has(i);
      let optBody;
      const mapLike = looksLikeMatchOption(raw) && !/<img\b/i.test(raw);
      if (/^(figure|fig\.?|diagram|image|structure|photo)$/i.test(plain) || (isFigStubHtml(raw) && !rawHasImg) || (!rawHasImg && isFigPlaceholderTag(raw))) {
        optBody = prepareOptionBody((q._qxBankOptions && q._qxBankOptions[i]) || raw, q, i, render);
        if (isFigStubHtml(optBody) && !/<img\b/i.test(String(optBody || ""))) {
          const recovered = figHtmlFromIndex(q, i);
          optBody = recovered || `<span class="qx-fig-loading" data-qx-fig-wait="${i}"></span>`;
        }
      } else if (mapLike) optBody = formatMatchCombo(o);
      else if (/^[ABCD]$/i.test(plain) && !rawHasImg && !/[\\$]|C_\{|\^\{|\\binom/.test(raw)) {
        // Letter-only stub — never treat ^{n}C_{r} binomial as letter C
        optBody = `<span class="qx-opt-plain qx-letter-opt">${plain.toUpperCase()}</span>`;
      } else if (plain && plain.length <= 40 && !rawHasImg && !/[\\$]/.test(raw) && !/<math/i.test(raw) && !/C_\{|\^\{/.test(raw)) {
        // Short plain answers (0, 1, 2, 3, numbers, short words) — always crystal clear
        optBody = `<span class="qx-opt-plain">${plain.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>`;
      } else {
        optBody = optionContent(q, o, i, render);
        if (rawHasImg && !/<img\b/i.test(String(optBody || ""))) {
          optBody = sizeOptionImgs(cleanPoolImgHtml(formatStructureNameOption(raw)));
        }
        if (!String(optBody || "").trim() && raw) {
          optBody = render ? render(raw) : htmlContent(raw);
        }
      }
      if (!String(optBody || "").replace(/<[^>]+>/g, "").trim() && !/<img/i.test(String(optBody || ""))) {
        if (/qx-fig-loading|data-qx-fig-wait/.test(String(optBody || ""))) {
          /* keep shimmer — never print the word FIGURE */
        } else if (rawHasImg) optBody = sizeOptionImgs(cleanPoolImgHtml(formatStructureNameOption(raw)));
        else if (plain && !/^(figure|fig\.?|diagram|image|structure|photo)$/i.test(plain)) {
          optBody = `<span class="qx-opt-plain">${plain.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span>`;
        } else if (raw && !isFigStubHtml(raw)) optBody = raw;
        else optBody = `<span class="qx-fig-loading" data-qx-fig-wait="${i}"></span>`;
      }
      // Last resort: keep original HTML so options never vanish as "Loading…"
      if (!String(optBody || "").trim() && raw) optBody = sizeOptionImgs(cleanPoolImgHtml(raw));
      if (!String(optBody || "").trim() && /C_\{|\^\{|\\binom|\$/.test(raw)) optBody = htmlContent(raw);
      if (!String(optBody || "").trim() && plain && !/^[A-D]$/i.test(plain)) {
        optBody = `<span class="qx-opt-plain">${plain.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span>`;
      }
      if (!String(optBody || "").trim()) optBody = `<span class="qx-opt-plain">${letter(i)}</span>`;
      // Radio circle for Quizrr/NTA CBT; letter badge for Quantrex style (CSS toggles)
      const radio = multi
        ? ""
        : `<span class="mtk-opt-radio" aria-hidden="true"></span>`;
      return `<button type="button" class="mtk-opt ${multi ? "mtk-opt-multi" : ""} ${match ? "mtk-opt-match" : ""} ${rawHasImg ? "mtk-opt-img" : ""} ${on ? "selected" : ""}" data-opt="${i}">
        ${ctrlHtml}
        ${radio}
        <span class="mtk-opt-letter qx-opt-circle" aria-hidden="true">${letter(i)}</span>
        <span class="mtk-opt-text ${match ? "qx-match-opt qx-content" : "qx-content"}">${optBody}</span>
      </button>`;
    }).filter(Boolean);
    if (buttons.length) return buttons.join("");
    // Offline book packs: never stuck on Loading if we have raw option strings
    if (optsList.length && (q._book || q._bookId || hasImgT)) {
      return optsList.map((o, i) => {
        const raw = String(o || "").trim();
        if (!raw) return "";
        const on = selectedSet.has(i);
        const body = sizeOptionImgs(cleanPoolImgHtml(raw));
        return `<button type="button" class="mtk-opt ${on ? "selected" : ""}" data-opt="${i}">
          ${ctrlHtml}<span class="mtk-opt-letter qx-opt-circle" aria-hidden="true">${letter(i)}</span>
          <span class="mtk-opt-text qx-content">${body}</span></button>`;
      }).filter(Boolean).join("") || `<div class="empty" style="padding:24px;grid-column:1/-1">Options unavailable</div>`;
    }
    return `<div class="empty" style="padding:24px;grid-column:1/-1">Loading options…</div>`;
  }

  function testOptsContainerClass(q) {
    const t = getType(q);
    if (t === "numerical" || t === "subjective") return "mtk-options mtk-numerical-wrap";
    const extra = optsLayoutClass(q);
    if (extra && extra.includes("match")) {
      return "mtk-options mtk-options-exam mtk-options-match-col" + (extra ? " " + extra : "");
    }
    if (extra && extra.includes("img")) {
      return "mtk-options mtk-options-grid qx-opts-img" + (extra ? " " + extra : "");
    }
    if (extra && extra.includes("stack")) {
      return "mtk-options mtk-options-exam qx-opts-stack";
    }
    if (extra && extra.includes("short")) {
      return "mtk-options mtk-options-grid mtk-options-exam-cols qx-opts-short";
    }
    return "mtk-options mtk-options-exam qx-opts-stack";
  }

  function practiceOptsContainerClass(q) {
    const extra = optsLayoutClass(q);
    if (extra && extra.includes("stack")) return "qx-prac-opts qx-opts-stack";
    return "qx-prac-opts" + (extra ? " " + extra : "");
  }

  function parseNum(s) {
    if (s == null) return null;
    let t = String(s).replace(/,/g, "").replace(/\s+/g, "").trim();
    if (!t) return null;
    // Fraction a/b (simple rational)
    const frac = t.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*([+-]?\d+(?:\.\d+)?)$/);
    if (frac) {
      const den = parseFloat(frac[2]);
      if (den !== 0 && Number.isFinite(den)) {
        const n = parseFloat(frac[1]) / den;
        return Number.isFinite(n) ? n : null;
      }
    }
    // Scientific / plain
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }

  /** Parse "1 to 2", "1-2", "[1,2]" range answers used in some banks */
  function parseNumRange(expected) {
    const s = String(expected || "").replace(/,/g, "").trim();
    const m = s.match(/^\[?\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*(?:to|–|-|—|,)\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*\]?$/i);
    if (!m) return null;
    const lo = parseNum(m[1]);
    const hi = parseNum(m[2]);
    if (lo == null || hi == null) return null;
    return { lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
  }

  function checkNumerical(given, expected) {
    const gRaw = String(given || "").trim();
    const eRaw = String(expected || "").trim();
    if (!gRaw && !eRaw) return true;
    if (!gRaw || !eRaw) return false;
    // Exact string (case-insensitive) after normalize spaces
    if (gRaw.replace(/\s+/g, "").toLowerCase() === eRaw.replace(/\s+/g, "").toLowerCase()) return true;

    const range = parseNumRange(eRaw);
    const a = parseNum(gRaw);
    if (range && a != null) {
      // Inclusive range with tiny epsilon for float noise
      return a + 1e-9 >= range.lo && a - 1e-9 <= range.hi;
    }
    const b = parseNum(eRaw);
    if (a == null || b == null) {
      return gRaw.replace(/\s+/g, "").toLowerCase() === eRaw.replace(/\s+/g, "").toLowerCase();
    }
    // Absolute or relative tolerance (JEE-style ~0.01 absolute / 0.1% relative)
    const absTol = Math.abs(a - b) < 0.01 + 1e-9;
    const relTol = Math.abs(a - b) / Math.max(1, Math.abs(b)) < 0.001 + 1e-12;
    return absTol || relTol;
  }

  function sameSet(a, b) {
    const norm = (arr) => [...new Set((arr || []).map((x) => {
      const i = parseAnswerIndex(x);
      return i != null ? i : (typeof x === "number" && Number.isFinite(x) ? Math.trunc(x) : null);
    }).filter((x) => x != null))].sort((x, y) => x - y);
    const sa = norm(a);
    const sb = norm(b);
    return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
  }

  function normalizeResponseIndices(response) {
    if (response == null || response === "") return [];
    if (Array.isArray(response)) {
      return response.map(x => parseAnswerIndex(x)).filter(x => x != null);
    }
    const one = parseAnswerIndex(response);
    return one != null ? [one] : [];
  }

  function isAnswered(q, response) {
    const t = getType(q);
    if (t === "numerical" || t === "subjective") return String(response || "").trim().length > 0;
    if (t === "multipleCorrect") {
      if (Array.isArray(response)) return response.length > 0;
      return response != null && response !== "";
    }
    return response != null && response !== "";
  }

  function grade(q, response) {
    const t = getType(q);
    if (t === "numerical" || t === "subjective") {
      const cor = checkNumerical(response, correctNumerical(q));
      return { correct: cor, partial: false };
    }
    if (t === "multipleCorrect") {
      const sel = normalizeResponseIndices(response);
      const cor = correctIndices(q);
      const full = sameSet(sel, cor);
      // Official Adv partial: only correct options chosen, incomplete set (no wrong pick)
      const partial = !full && sel.length > 0
        && sel.every(i => cor.includes(i))
        && sel.some(i => cor.includes(i));
      // partialMarks count for scoring: +3 if 3 of 4, +2 if 2 correct chosen, +1 if 1
      let partialLevel = 0;
      if (partial) {
        if (cor.length === 4 && sel.length === 3) partialLevel = 3;
        else if (sel.length === 2) partialLevel = 2;
        else if (sel.length === 1) partialLevel = 1;
        else if (sel.length === 3) partialLevel = 2; // 3 of 3+ correct options chosen incompletely
        else partialLevel = 1;
      }
      return { correct: full, partial, partialLevel, selectedCount: sel.length, correctCount: cor.length };
    }
    // Single / column-match MCQ
    const sel = normalizeResponseIndices(response);
    const ans = sel.length ? sel[0] : null;
    const cor = correctIndices(q)[0];
    if (ans == null || cor == null) return { correct: false, partial: false };
    return { correct: ans === cor, partial: false };
  }

  function formatChosenAnswer(q, response) {
    const t = getType(q);
    if (response == null || response === "") return "";
    if (t === "numerical" || t === "subjective") return String(response).replace(/</g, "&lt;");
    if (t === "multipleCorrect") {
      const sel = Array.isArray(response) ? response : [];
      return sel.map(i => {
        const opt = (q.options || [])[i];
        return `<span class="qx-ans-item"><b>${letter(i)}.</b> <span class="qx-content">${htmlContent(opt || "")}</span></span>`;
      }).join(" ");
    }
    const opt = (q.options || [])[response];
    if (getType(q) === "columnMatch") {
      return `<b>${letter(response)}.</b> ${formatMatchCombo(opt || "")}`;
    }
    return `<b>${letter(response)}.</b> <span class="qx-content">${htmlContent(opt || "")}</span>`;
  }

  function formatCorrectAnswer(q) {
    const t = getType(q);
    if (t === "numerical" || t === "subjective") return correctNumerical(q);
    const cor = correctIndices(q);
    if (t === "multipleCorrect") {
      return cor.map(i => {
        const opt = (q.options || [])[i];
        return `<span class="qx-ans-item"><b>${letter(i)}.</b> <span class="qx-content">${htmlContent(opt || "")}</span></span>`;
      }).join("");
    }
    const i = cor[0] != null ? cor[0] : 0;
    const opt = (q.options || [])[i];
    if (getType(q) === "columnMatch") {
      return `<b>${letter(i)}.</b> ${formatMatchCombo(opt || "")}`;
    }
    return `<b>${letter(i)}.</b> <span class="qx-content">${htmlContent(opt || "")}</span>`;
  }

  function bindPractice(scope, ctx, qid, onSubmit) {
    if (!scope || !ctx) return;
    const q = typeof getQ === "function" ? getQ(qid) : null;
    if (!q) return;
    const t = getType(q);

    if (t === "numerical" || t === "subjective") {
      const submit = scope.querySelector("#qxPracSubmit");
      bindNumericalKeypad(scope, (v) => {
        if (submit) submit.disabled = !String(v || "").trim();
      });
      if (submit) {
        submit.onclick = () => {
          const input = scope.querySelector("#qxNumInput");
          onSubmit && onSubmit(qid, input ? input.value.trim() : "");
        };
      }
      return;
    }

    if (t === "multipleCorrect") {
      if (!Array.isArray(ctx.selected[qid])) ctx.selected[qid] = [];
      scope.querySelectorAll("[data-prac-opt]").forEach(btn => {
        btn.onclick = () => {
          if (ctx.done[qid]) return;
          const idx = parseInt(btn.dataset.pracOpt, 10);
          let sel = ctx.selected[qid] || [];
          if (sel.includes(idx)) sel = sel.filter(x => x !== idx);
          else sel = [...sel, idx].sort((a, b) => a - b);
          ctx.selected[qid] = sel;
          scope.querySelectorAll("[data-prac-opt]").forEach(b => {
            const i = parseInt(b.dataset.pracOpt, 10);
            b.classList.toggle("selected", sel.includes(i));
          });
          const sub = scope.querySelector("#qxPracSubmit");
          if (sub) sub.disabled = sel.length === 0;
        };
      });
      const submit = scope.querySelector("#qxPracSubmit");
      if (submit) submit.onclick = () => onSubmit && onSubmit(qid, ctx.selected[qid]);
      return;
    }

    scope.querySelectorAll("[data-prac-opt]").forEach(btn => {
      btn.onclick = () => {
        if (ctx.done[qid]) return;
        const idx = parseInt(btn.dataset.pracOpt, 10);
        ctx.selected[qid] = idx;
        scope.querySelectorAll("[data-prac-opt]").forEach(b => {
          b.classList.toggle("selected", parseInt(b.dataset.pracOpt, 10) === idx);
        });
        const sub = scope.querySelector("#qxPracSubmit");
        if (sub) sub.disabled = false;
      };
    });
    const submit = scope.querySelector("#qxPracSubmit");
    if (submit) submit.onclick = () => onSubmit && onSubmit(qid, ctx.selected[qid]);
  }

  function applyPracticeResult(scope, q, response) {
    if (!scope || !q) return;
    const t = getType(q);
    const { correct, partial } = grade(q, response);

    if (t === "numerical" || t === "subjective") {
      const wrap = scope.querySelector(".qx-prac-numerical");
      if (wrap) wrap.classList.add(correct ? "correct" : "wrong");
      const input = scope.querySelector("#qxNumInput");
      if (input) input.disabled = true;
      return { correct, partial };
    }

    const selectedSet = Array.isArray(response)
      ? new Set(response)
      : (response != null ? new Set([response]) : new Set());
    const corSet = new Set(correctIndices(q));

    scope.querySelectorAll("[data-prac-opt]").forEach(btn => {
      const i = parseInt(btn.dataset.pracOpt, 10);
      btn.disabled = true;
      btn.classList.remove("selected");
      if (corSet.has(i)) btn.classList.add("correct");
      else if (selectedSet.has(i)) btn.classList.add("wrong");
      else if (!correct && selectedSet.has(i)) btn.classList.add("wrong");
      if (correct && selectedSet.has(i)) btn.classList.add("selected", "correct");
    });
    return { correct, partial };
  }

  function revealAnswers(scope, q, selected) {
    if (!scope || !q) return;
    const t = getType(q);
    if (t === "numerical" || t === "subjective") {
      let hint = scope.querySelector(".qx-show-ans-hint");
      if (!hint) {
        hint = document.createElement("p");
        hint.className = "qx-show-ans-hint";
        const wrap = scope.querySelector(".qx-prac-numerical, .mtk-numerical-wrap, .qx-num-entry, #qaOpts, #qxOpts");
        if (wrap) wrap.appendChild(hint);
        else return;
      }
      hint.innerHTML = "Correct answer: <strong>" + formatCorrectAnswer(q) + "</strong>";
      return;
    }
    const corSet = new Set(correctIndices(q));
    const selSet = Array.isArray(selected)
      ? new Set(selected)
      : (selected != null && selected !== "" ? new Set([selected]) : new Set());
    scope.querySelectorAll("[data-prac-opt], [data-opt]").forEach((btn) => {
      const raw = btn.dataset.pracOpt != null ? btn.dataset.pracOpt : btn.dataset.opt;
      const i = parseInt(raw, 10);
      btn.classList.remove("eg-opt-right", "eg-opt-wrong", "correct", "wrong");
      if (corSet.has(i)) btn.classList.add("eg-opt-right", "correct");
      else if (selSet.has(i)) btn.classList.add("eg-opt-wrong", "wrong");
    });
  }

  /** KL.txt §15 — structure check only; never invent content */
  function validateQuestion(q) {
    const issues = [];
    if (!q) return { ok: false, issues: ["NO_QUESTION"] };
    const stem = String(q.q || q.question || "");
    const plain = stem.replace(/<[^>]+>/g, " ").trim();
    const t = getType(q);
    if (plain.length < 4 && !/<img\b/i.test(stem)) issues.push("EMPTY_STEM");
    if (t !== "numerical" && t !== "subjective") {
      const opts = q.options || [];
      if (!opts.length) issues.push("MISSING_OPTIONS");
      opts.forEach((o, i) => {
        const s = String(o || "");
        if (!s.trim() || /^(undefined|null)$/i.test(s.trim())) issues.push("BLANK_OPTION_" + i);
      });
    }
    if (/undefined|null|\[object Object\]/i.test(stem)) issues.push("BAD_STEM_TOKEN");
    return { ok: issues.length === 0, issues, type: t, id: q.id };
  }

  return {
    getType, looksMultipleCorrect, looksCodedSingleCorrect, looksAssertionReason, expandSmilesHtml, typeLabel, typeBadgeHtml, correctIndices, correctNumerical,
    parseAnswerIndex, hasRealMcqOptions, validateQuestion,
    optsLayoutClass, practiceOptsContainerClass, testOptsContainerClass,
    renderOptions, renderTestOptions, renderNumericalEntry, grade, isAnswered, formatCorrectAnswer, formatChosenAnswer,
    bindPractice, bindNumericalKeypad, sanitizeNumVal, applyPracticeResult, revealAnswers, isMatchColumn, checkNumerical
  };
})();
