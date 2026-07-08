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
    const extraCls = o.cbt ? " qx-num-cbt" : "";
    const wrapCls = o.wrapClass || "qx-prac-numerical";
    const ntaCls = o.cbt ? " qx-num-nta" : "";
    const panelCls = o.cbt ? " qx-num-panel" : "";
    return `<div class="${wrapCls} mtk-numerical">
      <div class="qx-num-entry${extraCls}${ntaCls}${panelCls}">
        <label class="qx-num-label" for="qxNumInput">Enter your answer</label>
        <input type="text" class="qx-num-input" id="qxNumInput" inputmode="decimal" autocomplete="off"
          placeholder="0" value="${valEsc}"${readonly}${disabled} aria-label="Numerical answer">
        <div class="qx-num-keypad" id="qxNumKeypad" role="group" aria-label="Numeric keypad">
          <button type="button" class="qx-num-key qx-num-key-wide qx-num-key-back" data-num-key="back">backspace</button>
          <button type="button" class="qx-num-key" data-num-key="7">7</button>
          <button type="button" class="qx-num-key" data-num-key="8">8</button>
          <button type="button" class="qx-num-key" data-num-key="9">9</button>
          <button type="button" class="qx-num-key" data-num-key="4">4</button>
          <button type="button" class="qx-num-key" data-num-key="5">5</button>
          <button type="button" class="qx-num-key" data-num-key="6">6</button>
          <button type="button" class="qx-num-key" data-num-key="1">1</button>
          <button type="button" class="qx-num-key" data-num-key="2">2</button>
          <button type="button" class="qx-num-key" data-num-key="3">3</button>
          <button type="button" class="qx-num-key qx-num-key-arrow" data-num-key="left" title="Move left">←</button>
          <button type="button" class="qx-num-key" data-num-key="0">0</button>
          <button type="button" class="qx-num-key" data-num-key=".">.</button>
          <button type="button" class="qx-num-key" data-num-key="-">-</button>
          <button type="button" class="qx-num-key qx-num-key-arrow" data-num-key="right" title="Move right">→</button>
          <span class="qx-num-key-spacer" aria-hidden="true"></span>
          <button type="button" class="qx-num-key qx-num-key-wide qx-num-key-clear" data-num-key="clear">ClearAll</button>
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

  function normalizeType(t) {
    const k = String(t || "").trim();
    if (!k || k === "unknown") return "";
    if (/multiple/i.test(k)) return "multipleCorrect";
    if (/numerical|integer/i.test(k)) return "numerical";
    if (/subjective|long|descriptive/i.test(k)) return "subjective";
    if (/single/i.test(k)) return "singleCorrect";
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
    const withImg = opts.filter(o => /<img/i.test(String(o || ""))).length;
    return withImg >= Math.max(2, Math.ceil(opts.length * 0.5));
  }

  function looksNumerical(q) {
    if (!q) return false;
    if (q.correctValue != null && String(q.correctValue) !== "") return true;
    const opts = (q.options || []).map(o => String(o).replace(/<[^>]+>/g, "").trim());
    const lettersOnly = opts.length && opts.every(o => !o || /^[A-D]$/i.test(o));
    const qtext = String(q.q || "").toLowerCase();
    if (lettersOnly && /nearest integer|numerical|fill in|_{3,}|_______/i.test(qtext)) return true;
    if (!opts.length && /numerical|nearest integer|integer\)|fill in/i.test(qtext)) return true;
    return false;
  }

  function getType(q) {
    if (!q) return "singleCorrect";
    if (isMatchColumn(q)) return "columnMatch";
    const fromField = normalizeType(q.questionType || q.type);
    if (fromField) return fromField;
    if (q.correctValue != null && String(q.correctValue) !== "" && !(q.options || []).length) return "numerical";
    if (Array.isArray(q.answers) && q.answers.length > 1) return "multipleCorrect";
    if (looksNumerical(q)) return "numerical";
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
    t = t.replace(/\\mathrm\s*\{([^}]+)\}/g, "$1");
    t = t.replace(/\\text\s*\{([^}]+)\}/g, "$1");
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
      let cls = "qx-prac-numerical";
      if (done && val) {
        const ok = checkNumerical(val, cor);
        cls += ok ? " correct" : " wrong";
      }
      const correctHtml = done && cor
        ? `<p class="qx-num-correct">Correct answer: <strong>${cor.replace(/</g, "&lt;")}</strong></p>`
        : "";
      return renderNumericalEntry(val, { wrapClass: cls, disabled: done, correctHtml });
    }

    const selected = st.selected;
    const selectedSet = Array.isArray(selected)
      ? new Set(selected)
      : (selected != null ? new Set([selected]) : new Set());
    const correct = new Set(correctIndices(q));
    const multi = t === "multipleCorrect";
    const ctrl = optionControlClass(q);

    const match = t === "columnMatch";
    return (q.options || []).map((o, i) => {
      let cls = "qx-prac-opt";
      if (multi) cls += " qx-prac-opt-multi";
      if (match) cls += " qx-prac-opt-match";
      if (!done && selectedSet.has(i)) cls += " selected";
      if (done) {
        if (correct.has(i)) cls += " correct";
        else if (selectedSet.has(i)) cls += " wrong";
        else if (!multi && selectedSet.has(i)) cls += " wrong";
      }
      const optBody = match ? formatMatchCombo(o) : htmlContent(o);
      return `<button type="button" class="${cls}" data-prac-opt="${i}" ${done ? "disabled" : ""}>
        <span class="${ctrl}"></span>
        <span class="qx-prac-letter">${letter(i)}</span>
        <span class="qx-prac-opt-text ${match ? "qx-match-opt" : "qx-content"}">${optBody}</span>
      </button>`;
    }).join("");
  }

  function renderTestOptions(q, selected, htmlFn) {
    const t = getType(q);
    const render = htmlFn || htmlContent;
    if (t === "numerical" || t === "subjective") {
      const val = selected != null ? String(selected) : "";
      return renderNumericalEntry(val, { cbt: true });
    }
    const multi = t === "multipleCorrect";
    const match = t === "columnMatch";
    const selectedSet = Array.isArray(selected)
      ? new Set(selected)
      : (selected != null ? new Set([selected]) : new Set());
    const ctrl = multi ? "qx-prac-check mtk-opt-check" : "mtk-opt-radio";

    return (q.options || []).map((o, i) => {
      const on = selectedSet.has(i);
      const raw = String(o || "").trim();
      const optBody = !raw
        ? `<span class="mtk-opt-empty">Option image loading…</span>`
        : (match ? formatMatchCombo(o) : render(o));
      return `<button type="button" class="mtk-opt ${multi ? "mtk-opt-multi" : ""} ${match ? "mtk-opt-match" : ""} ${on ? "selected" : ""}" data-opt="${i}">
        <span class="${ctrl}"></span>
        <span class="mtk-opt-letter">${letter(i)}</span>
        <span class="mtk-opt-text ${match ? "qx-match-opt qx-content" : "qx-content"}">${optBody}</span>
      </button>`;
    }).join("");
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