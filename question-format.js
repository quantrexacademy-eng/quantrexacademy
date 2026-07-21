// Quantrex — MARKS-style question type rendering (MCQ, multi-correct, numerical, column match)
const QuantrexQFormat = (() => {
  const TYPE_LABELS = {
    singleCorrect: "Single Correct Type",
    multipleCorrect: "Multiple Correct Type",
    numerical: "Numerical Type",
    columnMatch: "Column Matching Type",
    subjective: "Subjective"
  };

  function letter(i) {
    return String.fromCharCode(65 + i);
  }

  /** Route Marks/Quizrr CDN images through clean proxy; keep orig for fallback if proxy fails */
  function cleanPoolImgHtml(html) {
    return String(html || "").replace(/\bsrc=(["'])(https?:\/\/[^"']+)\1/gi, (m, q, url0) => {
      if (/proxy-image|restore-image|data:|assets\/diagrams/i.test(url0)) return m;
      // Repair bank typo host https://.app/ before proxy (else 403 + dirty fallback)
      let url = String(url0 || "")
        .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
        .replace(/https?:\/\/cdn-question-pool\.app\//gi, "https://cdn-question-pool.getmarks.app/");
      if (/cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\/|getmarks\.app/i.test(url)) {
        const prox = `/api/proxy-image?url=${encodeURIComponent(url)}&clean=1&v=23`;
        // onerror: re-proxy once, never dump raw MARKS CDN into the page
        return `src=${q}${prox}${q} data-qx-orig-src=${q}${url}${q} referrerpolicy=${q}no-referrer${q} class="qx-pool-fig qx-no-wm" onerror=${q}if(!this.dataset.qxPe){this.dataset.qxPe=1;this.src='/api/proxy-image?url='+encodeURIComponent(this.getAttribute('data-qx-orig-src')||'')+'&clean=1&v=23';}${q}`;
      }
      return m;
    });
  }

  function sizeOptionImgs(html) {
    return String(html || "")
      .replace(/<img\b([^>]*)>/gi, (full, attrs) => {
        let a = attrs;
        // Always tag option figures so clean/visibility pipeline picks them up
        if (!/\bclass=/i.test(a)) {
          a += ' class="qx-pool-fig qx-no-wm qx-opt-fig-img"';
        } else if (!/qx-pool-fig|qx-no-wm/i.test(a)) {
          a = a.replace(/\bclass=(["'])([^"']*)\1/i, (m, q, c) => `class=${q}${c} qx-pool-fig qx-no-wm qx-opt-fig-img${q}`);
        }
        if (!/\bstyle=/i.test(a)) {
          a += ' style="max-width:100%;max-height:220px;min-height:72px;width:auto;height:auto;display:block;margin:6px auto;opacity:1;visibility:visible;object-fit:contain;background:#fff"';
        } else {
          a = a.replace(/\bstyle=(["'])([^"']*)\1/i, (sm, q, st) => {
            let s = st
              .replace(/max-height\s*:\s*[^;]+;?/gi, "")
              .replace(/max-width\s*:\s*[^;]+;?/gi, "")
              .replace(/opacity\s*:\s*[^;]+;?/gi, "")
              .replace(/visibility\s*:\s*[^;]+;?/gi, "");
            s += ";max-width:100%;max-height:220px;min-height:72px;width:auto;height:auto;display:block;opacity:1;visibility:visible;object-fit:contain;background:#fff";
            return `style=${q}${s}${q}`;
          });
        }
        if (!/\bloading=/i.test(a)) a += ' loading="eager"';
        if (!/\bdecoding=/i.test(a)) a += ' decoding="async"';
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

  function prepareOptionBody(raw, q, i, htmlFn) {
    const s = String(raw || "").trim();
    if (!s) return "";
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
    if (!hasVisible && /<img\b/i.test(raw)) {
      return sizeOptionImgs(cleanPoolImgHtml(raw));
    }
    if (!hasVisible && raw.trim()) return render(raw);
    return out;
  }

  function sanitizeNumVal(raw) {
    let v = String(raw || "").replace(/[^\d.\-]/g, "");
    const neg = v.startsWith("-");
    v = v.replace(/-/g, "");
    const dot = v.indexOf(".");
    if (dot >= 0) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "");
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
        <div class="qx-num-badge">INTEGER / NUMERICAL</div>
        <label class="qx-num-label" for="qxNumInput">${label}</label>
        <div class="qx-num-box-wrap">
          <input type="text" class="qx-num-input" id="qxNumInput" inputmode="decimal" autocomplete="off"
            placeholder="" value="${valEsc}"${readonly}${disabled}
            aria-label="Integer numerical answer" maxlength="12">
        </div>
        <p class="qx-num-hint">Type the number or use the keypad below</p>
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
        if (v.includes(".")) return;
        v = v.slice(0, pos) + "." + v.slice(pos);
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

  function htmlContent(text) {
    return typeof Mx !== "undefined" ? Mx.html(text) : String(text || "");
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
    const text = String((q && q.q) || "");
    if (!/match\s+(the\s+)?list|list[\s\-]*i.*list[\s\-]*ii|list[\s\-]*-?\s*i\s+with\s+list/i.test(text)) return false;
    const opts = (q && q.options) || [];
    if (hasImageOptions(q)) return false;
    const plain = opts.map(o => String(o || "").replace(/<[^>]+>/g, " ").trim()).filter(Boolean);
    if (!plain.length) return false;
    const comboLike = plain.filter(o =>
      /[A-D]\s*[-–,]\s*[IVX\d]+|\([a-d]\)\s*[-–]|;\s*\([a-d]\)/i.test(o)
    ).length;
    return comboLike >= Math.max(1, Math.ceil(plain.length * 0.2));
  }

  function hasImageOptions(q) {
    const opts = (q && q.options) || [];
    if (!opts.length) return false;
    return opts.some(o => /<img/i.test(String(o || "")));
  }

  function looksNumerical(q) {
    if (!q) return false;
    if (q.correctValue != null && String(q.correctValue) !== "") return true;
    const opts = (q.options || []).map(o => String(o).replace(/<[^>]+>/g, "").trim());
    const lettersOnly = !opts.length || opts.every(o => !o || /^[A-D]$/i.test(o));
    const qtext = String(q.q || "").replace(/<[^>]+>/g, " ").toLowerCase();
    // JEE integer / fill blank style: ends with blank, "is ______", nearest integer, etc.
    const blankStyle = /_{3,}|______|nearest\s*integer|integer\s*type|numerical|fill\s*in|the\s+rate\s*.*\s+is\s*_/i.test(qtext)
      || /\bis\s*_+\s*\.?$/.test(qtext.trim())
      || /\bis\s*_{2,}/.test(qtext);
    if (blankStyle && lettersOnly) return true;
    if (blankStyle && !(opts || []).some(o => /<img\b/i.test(String(o || "")) || (String(o || "").replace(/<[^>]+>/g, "").trim().length > 2 && !/^[A-D]$/i.test(String(o).replace(/<[^>]+>/g, "").trim())))) {
      // blank-style stem with no real MCQ options
      if (!opts.length || lettersOnly) return true;
    }
    return false;
  }

  function getType(q) {
    if (!q) return "singleCorrect";
    if (isMatchColumn(q)) return "columnMatch";
    // Prefer numerical detection before trusting stored singleCorrect/mcq type
    if (looksNumerical(q)) return "numerical";
    const fromField = normalizeType(q.questionType || q.type);
    if (fromField === "numerical" || fromField === "subjective") return fromField;
    if (fromField && fromField !== "singleCorrect") return fromField;
    if (q.correctValue != null && String(q.correctValue) !== "" && !(q.options || []).length) return "numerical";
    if (Array.isArray(q.answers) && q.answers.length > 1) return "multipleCorrect";
    if (fromField) return fromField;
    return "singleCorrect";
  }

  function typeLabel(q) {
    const t = getType(q);
    return TYPE_LABELS[t] || "Single Correct Type";
  }

  function formatMatchCombo(opt) {
    const raw = String(opt || "").trim();
    if (!raw) return "";
    if (/<[a-z][\s\S]*>/i.test(raw)) return htmlContent(raw);
    let t = raw.replace(/^\$+|\$+$/g, "");
    // Only strip \mathrm/\text when NOT \textbf / \textit (word-boundary style)
    t = t.replace(/\\mathrm\s*\{([^}]+)\}/g, "$1");
    t = t.replace(/\\text(?!bf|it|rm|sf|tt)\s*\{([^}]+)\}/g, "$1");
    t = t.replace(/\\,/g, ", ").replace(/~/g, " ").replace(/\\quad/g, "  ");
    t = t.replace(/\s+/g, " ").trim();
    const pairs = t.match(/([A-Z])\s*[-–]\s*(\d+)/g);
    if (pairs && pairs.length) {
      return `<span class="qx-match-pairs">${pairs.map(p => `<span class="qx-match-pair">${p.replace(/\s+/g, "")}</span>`).join("")}</span>`;
    }
    return `<span class="qx-match-combo qx-content">${htmlContent(t)}</span>`;
  }

  function correctIndices(q) {
    if (!q) return [0];
    if (Array.isArray(q.answers) && q.answers.length) return q.answers.slice().sort((a, b) => a - b);
    if (q.answer != null && q.answer >= 0) return [q.answer];
    return [];
  }

  function correctNumerical(q) {
    if (!q) return "";
    if (q.correctValue != null && String(q.correctValue) !== "") return String(q.correctValue).trim();
    const opts = (q.options || [])[q.answer];
    return opts != null ? String(opts).replace(/<[^>]+>/g, "").trim() : "";
  }

  function optsLayoutClass(q) {
    const t = getType(q);
    if (t === "numerical" || t === "subjective") return "";
    if (t === "multipleCorrect") return "qx-opts-multi";
    if (t === "columnMatch" || isMatchColumn(q)) return "qx-opts-match";
    if (hasImageOptions(q)) return "qx-opts-img";
    return "";
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
    const opts = q.options || [];
    // Empty only — letter A–D options are valid (stem structures / divisions labeled A–D)
    const plainOpts = opts.map(o => String(o || "").replace(/<[^>]+>/g, "").trim());
    const hasImgOpt = opts.some(o => /<img\b/i.test(String(o || "")));
    const isEmpty = !opts.length || (!hasImgOpt && plainOpts.every(t => !t));
    if (isEmpty) {
      return `<div class="empty qx-load-opts" style="padding:20px;grid-column:1/-1">Loading options…</div>`;
    }
    return opts.map((o, i) => {
      const raw = String(o || "").trim();
      const plain = raw.replace(/<[^>]+>/g, "").trim();
      const rawHasImg = /<img\b/i.test(raw);
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
      // Image / structure+name options: clean proxy, strip " : name" colon, never drop
      let optBody;
      if (match) {
        optBody = formatMatchCombo(o);
      } else if (/^[ABCD]$/i.test(plain) && !rawHasImg) {
        // Show letter as the option text (not filter out)
        optBody = `<span class="qx-letter-opt">${plain.toUpperCase()}</span>`;
      } else {
        optBody = optionContent(q, o, i);
      }
      if (!String(optBody || "").replace(/<[^>]+>/g, "").trim() && !/<img/i.test(String(optBody || ""))) {
        if (rawHasImg) optBody = sizeOptionImgs(cleanPoolImgHtml(formatStructureNameOption(raw)));
        else if (plain) optBody = plain;
        else return "";
      }
      return `<button type="button" class="${cls}" data-prac-opt="${i}" ${done ? "disabled" : ""}>
        <span class="mtk-opt-letter qx-opt-circle" aria-hidden="true">${letter(i)}</span>
        <span class="qx-prac-opt-text ${match ? "qx-match-opt" : "qx-content"}">${optBody}</span>
      </button>`;
    }).filter(Boolean).join("") || `<div class="empty qx-load-opts" style="padding:20px">Options unavailable</div>`;
  }

  function renderTestOptions(q, selected, htmlFn) {
    const t = getType(q);
    const render = htmlFn || htmlContent;
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
      return `<div class="empty" style="padding:24px;grid-column:1/-1">Loading options…</div>`;
    }

    const buttons = optsList.map((o, i) => {
      const raw = String(o || "").trim();
      const plain = raw.replace(/<[^>]+>/g, "").trim();
      const rawHasImg = /<img\b/i.test(raw);
      if (!raw) return "";
      const on = selectedSet.has(i);
      let optBody;
      if (match) optBody = formatMatchCombo(o);
      else if (/^[ABCD]$/i.test(plain) && !rawHasImg) {
        optBody = `<span class="qx-letter-opt">${plain.toUpperCase()}</span>`;
      } else optBody = optionContent(q, o, i, render);
      if (!String(optBody || "").replace(/<[^>]+>/g, "").trim() && !/<img/i.test(String(optBody || ""))) {
        if (rawHasImg) optBody = sizeOptionImgs(cleanPoolImgHtml(formatStructureNameOption(raw)));
        else if (plain) optBody = render(raw);
        else return "";
      }
      // Last resort: keep original HTML so options never vanish as "Loading…"
      if (!String(optBody || "").trim() && raw) optBody = sizeOptionImgs(cleanPoolImgHtml(raw));
      return `<button type="button" class="mtk-opt ${multi ? "mtk-opt-multi" : ""} ${match ? "mtk-opt-match" : ""} ${rawHasImg ? "mtk-opt-img" : ""} ${on ? "selected" : ""}" data-opt="${i}">
        ${ctrlHtml}
        <span class="mtk-opt-letter" aria-hidden="true">${letter(i)}</span>
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
          ${ctrlHtml}<span class="mtk-opt-letter" aria-hidden="true">${letter(i)}</span>
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
    return "mtk-options mtk-options-grid mtk-options-exam-cols";
  }

  function practiceOptsContainerClass(q) {
    const extra = optsLayoutClass(q);
    return "qx-prac-opts" + (extra ? " " + extra : "");
  }

  function parseNum(s) {
    const n = parseFloat(String(s || "").replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  }

  function checkNumerical(given, expected) {
    const a = parseNum(given);
    const b = parseNum(expected);
    if (a == null || b == null) {
      return String(given || "").trim().toLowerCase() === String(expected || "").trim().toLowerCase();
    }
    return Math.abs(a - b) < 0.01 || Math.abs(a - b) / Math.max(1, Math.abs(b)) < 0.001;
  }

  function sameSet(a, b) {
    const sa = [...new Set(a)].sort((x, y) => x - y);
    const sb = [...new Set(b)].sort((x, y) => x - y);
    return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
  }

  function isAnswered(q, response) {
    const t = getType(q);
    if (t === "numerical" || t === "subjective") return String(response || "").trim().length > 0;
    if (t === "multipleCorrect") return Array.isArray(response) && response.length > 0;
    return response != null;
  }

  function grade(q, response) {
    const t = getType(q);
    if (t === "numerical" || t === "subjective") {
      const cor = checkNumerical(response, correctNumerical(q));
      return { correct: cor, partial: false };
    }
    if (t === "multipleCorrect") {
      const sel = Array.isArray(response) ? response : [];
      const cor = correctIndices(q);
      const full = sameSet(sel, cor);
      const partial = !full && sel.some(i => cor.includes(i)) && sel.every(i => cor.includes(i));
      return { correct: full, partial };
    }
    const ans = Array.isArray(response) ? response[0] : response;
    const cor = correctIndices(q)[0];
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

  return {
    getType, typeLabel, typeBadgeHtml, correctIndices, correctNumerical,
    optsLayoutClass, practiceOptsContainerClass, testOptsContainerClass,
    renderOptions, renderTestOptions, renderNumericalEntry, grade, isAnswered, formatCorrectAnswer, formatChosenAnswer,
    bindPractice, bindNumericalKeypad, sanitizeNumVal, applyPracticeResult, isMatchColumn, checkNumerical
  };
})();