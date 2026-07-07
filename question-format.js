// Quantrex — MARKS-style question type rendering (MCQ, multi-correct, numerical, column match)
const QuantrexQFormat = (() => {
  const TYPE_LABELS = {
    singleCorrect: "Single Correct",
    multipleCorrect: "Multiple Correct",
    numerical: "Numerical",
    subjective: "Subjective"
  };

  function letter(i) {
    return String.fromCharCode(65 + i);
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
    return /match\s+(the\s+)?list|list[\s\-]*i.*list[\s\-]*ii|list[\s\-]*-?\s*i\s+with\s+list/i.test(text);
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
    const fromField = normalizeType(q.questionType || q.type);
    if (fromField) return fromField;
    if (q.correctValue != null && String(q.correctValue) !== "" && !(q.options || []).length) return "numerical";
    if (Array.isArray(q.answers) && q.answers.length > 1) return "multipleCorrect";
    if (looksNumerical(q)) return "numerical";
    return "singleCorrect";
  }

  function typeLabel(q) {
    const t = getType(q);
    if (isMatchColumn(q) && t === "singleCorrect") return "Column Matching";
    return TYPE_LABELS[t] || "Single Correct";
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
    if (isMatchColumn(q)) return "qx-opts-match";
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
      return `<div class="${cls}">
        <label class="qx-num-label" for="qxNumInput">Enter your answer</label>
        <input type="text" class="qx-num-input" id="qxNumInput" inputmode="decimal" autocomplete="off"
          placeholder="Type numerical answer" value="${val.replace(/"/g, "&quot;")}" ${done ? "disabled" : ""}>
        ${done && cor ? `<p class="qx-num-correct">Correct answer: <strong>${cor.replace(/</g, "&lt;")}</strong></p>` : ""}
      </div>`;
    }

    const selected = st.selected;
    const selectedSet = Array.isArray(selected)
      ? new Set(selected)
      : (selected != null ? new Set([selected]) : new Set());
    const correct = new Set(correctIndices(q));
    const multi = t === "multipleCorrect";
    const ctrl = optionControlClass(q);

    return (q.options || []).map((o, i) => {
      let cls = "qx-prac-opt";
      if (multi) cls += " qx-prac-opt-multi";
      if (!done && selectedSet.has(i)) cls += " selected";
      if (done) {
        if (correct.has(i)) cls += " correct";
        else if (selectedSet.has(i)) cls += " wrong";
        else if (!multi && selectedSet.has(i)) cls += " wrong";
      }
      const showLetter = true;
      return `<button type="button" class="${cls}" data-prac-opt="${i}" ${done ? "disabled" : ""}>
        <span class="${ctrl}"></span>
        ${showLetter ? `<span class="qx-prac-letter">${letter(i)}</span>` : ""}
        <span class="qx-prac-opt-text qx-content">${htmlContent(o)}</span>
      </button>`;
    }).join("");
  }

  function renderTestOptions(q, selected, htmlFn) {
    const t = getType(q);
    const render = htmlFn || htmlContent;
    if (t === "numerical" || t === "subjective") {
      const val = selected != null ? String(selected) : "";
      return `<div class="qx-prac-numerical mtk-numerical">
        <label class="qx-num-label" for="qxNumInput">Enter your answer</label>
        <input type="text" class="qx-num-input" id="qxNumInput" inputmode="decimal" autocomplete="off"
          placeholder="Type numerical answer" value="${val.replace(/"/g, "&quot;")}">
      </div>`;
    }
    const multi = t === "multipleCorrect";
    const selectedSet = Array.isArray(selected)
      ? new Set(selected)
      : (selected != null ? new Set([selected]) : new Set());
    const ctrl = multi ? "qx-prac-check mtk-opt-check" : "mtk-opt-radio";

    return (q.options || []).map((o, i) => {
      const on = selectedSet.has(i);
      return `<button type="button" class="mtk-opt ${multi ? "mtk-opt-multi" : ""} ${on ? "selected" : ""}" data-opt="${i}">
        <span class="${ctrl}"></span>
        <span class="mtk-opt-letter">${letter(i)}</span>
        <span class="mtk-opt-text qx-content">${render(o)}</span>
      </button>`;
    }).join("");
  }

  function testOptsContainerClass(q) {
    const t = getType(q);
    if (t === "numerical" || t === "subjective") return "mtk-options mtk-numerical-wrap";
    const extra = optsLayoutClass(q);
    return "mtk-options mtk-options-grid" + (extra ? " " + extra : "");
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
    return `<b>${letter(i)}.</b> <span class="qx-content">${htmlContent(opt || "")}</span>`;
  }

  function bindPractice(scope, ctx, qid, onSubmit) {
    if (!scope || !ctx) return;
    const q = typeof getQ === "function" ? getQ(qid) : null;
    if (!q) return;
    const t = getType(q);

    if (t === "numerical" || t === "subjective") {
      const input = scope.querySelector("#qxNumInput");
      const submit = scope.querySelector("#qxPracSubmit");
      if (input && submit) {
        const sync = () => { submit.disabled = !String(input.value || "").trim(); };
        input.oninput = sync;
        sync();
        submit.onclick = () => onSubmit && onSubmit(qid, input.value.trim());
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
    renderOptions, renderTestOptions, grade, isAnswered, formatCorrectAnswer, formatChosenAnswer,
    bindPractice, applyPracticeResult, isMatchColumn, checkNumerical
  };
})();