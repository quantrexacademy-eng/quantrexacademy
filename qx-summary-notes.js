/**
 * Concise Summary Notes — JEE Main only (Physics · Chemistry · Mathematics)
 * Loads complete bank-mapped notes from data/summary-notes/jee_main_complete.json
 * (JEE Main PCM · Quantrex multicolor UI · clickable examples · KaTeX).
 */
const QxSummaryNotes = (() => {
  "use strict";

  const DATA_URL = "data/summary-notes/jee_main_complete.json";
  const CHAPTER_TOPICS_URL = "data/summary-notes/chapter_topics_pcm.json";
  let _bank = null;
  let _bankPromise = null;
  let _chapterTopics = null;
  let _chapterTopicsPromise = null;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function subjKey(subject) {
    const s = String(subject || "").toLowerCase();
    if (s.includes("phys")) return "phy";
    if (s.includes("chem")) return "chem";
    if (s.includes("math")) return "math";
    return "math";
  }

  function subjBankName(subject) {
    const s = String(subject || "").toLowerCase();
    if (s.includes("phys")) return "Physics";
    if (s.includes("chem")) return "Chemistry";
    if (s.includes("math")) return "Mathematics";
    return "Mathematics";
  }

  function subjEmoji(k) {
    return k === "phy" ? "⚛️" : k === "chem" ? "🧪" : "📐";
  }

  function loadBank() {
    if (_bank) return Promise.resolve(_bank);
    if (_bankPromise) return _bankPromise;
    _bankPromise = fetch(DATA_URL + "?v=qxpcm4")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        _bank = j && typeof j === "object" ? j : {};
        return _bank;
      })
      .catch(() => {
        _bank = {};
        return _bank;
      });
    return _bankPromise;
  }

  function loadChapterTopics() {
    if (_chapterTopics) return Promise.resolve(_chapterTopics);
    if (_chapterTopicsPromise) return _chapterTopicsPromise;
    _chapterTopicsPromise = fetch(CHAPTER_TOPICS_URL + "?v=qxpcm4")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        _chapterTopics = j && typeof j === "object" ? j : {};
        return _chapterTopics;
      })
      .catch(() => {
        _chapterTopics = {};
        return _chapterTopics;
      });
    return _chapterTopicsPromise;
  }

  function findChapterPack(subject, chapter) {
    if (!_chapterTopics) return null;
    const subj = subjBankName(subject);
    // Try exact subject keys used in JSON
    const block =
      _chapterTopics[subj]
      || _chapterTopics[subject]
      || _chapterTopics.Physics
      || _chapterTopics.Chemistry
      || _chapterTopics.Mathematics
      || null;
    // Prefer subject-matched block only
    const candidates = [];
    if (_chapterTopics[subj]) candidates.push(_chapterTopics[subj]);
    if (subject && _chapterTopics[subject] && _chapterTopics[subject] !== _chapterTopics[subj]) {
      candidates.push(_chapterTopics[subject]);
    }
    // Also search all subjects if needed (chapter names unique enough)
    for (const key of ["Physics", "Chemistry", "Mathematics"]) {
      if (_chapterTopics[key] && !candidates.includes(_chapterTopics[key])) {
        candidates.push(_chapterTopics[key]);
      }
    }
    const want = normKey(chapter);
    for (const blk of candidates) {
      if (!blk || typeof blk !== "object") continue;
      if (blk[chapter]) return blk[chapter];
      for (const [name, pack] of Object.entries(blk)) {
        const nk = normKey(name);
        if (!nk || !want) continue;
        if (nk === want || want.includes(nk) || nk.includes(want)) return pack;
        // token overlap (e.g. "Work, Power and Energy" vs "Work, Energy & Power")
        const wt = want.split(" ").filter((t) => t.length > 2);
        const nt = nk.split(" ").filter((t) => t.length > 2);
        if (wt.length >= 2 && wt.every((t) => nk.includes(t))) return pack;
        if (nt.length >= 2 && nt.filter((t) => want.includes(t)).length >= Math.min(2, nt.length)) return pack;
      }
    }
    return null;
  }

  // Warm cache early
  try {
    if (typeof fetch === "function") {
      loadBank();
      loadChapterTopics();
    }
  } catch (_) { /* */ }

  /** Keyword → curated high-quality notes (fallback when JSON missing) */
  const CURATED = {
    // —— MATHEMATICS ——
    "basic of mathematics": {
      core: [
        "Interval & domain language is half the battle: open/closed, union, intersection.",
        "Absolute value |x| = x if x ≥ 0, −x if x < 0 — always split cases.",
        "Inequalities reverse when multiplied/divided by a negative number.",
        "log_b a is defined only for a > 0, b > 0, b ≠ 1.",
        "For quadratic inequalities, sign chart of (x − α)(x − β) is the fastest method."
      ],
      formulas: [
        { label: "Absolute value", eq: "|x| = √(x²)  (real x)" },
        { label: "Log change base", eq: "log_b a = log_k a / log_k b" },
        { label: "Product rule", eq: "log_b (xy) = log_b x + log_b y" },
        { label: "Power rule", eq: "log_b (xⁿ) = n log_b x" },
        { label: "Identity", eq: "b^{log_b a} = a  (a > 0)" },
        { label: "Inequality", eq: "x² ≥ a²  ⇒  x ≤ −|a| or x ≥ |a|" }
      ],
      examples: [
        {
          q: "Number of real solutions of |x − 2| + |x + 1| = 5 ?",
          a: "For x ≥ 2: (x−2)+(x+1)=5 ⇒ 2x=6 ⇒ x=3 (valid). For −1 ≤ x < 2: (2−x)+(x+1)=3 ≠ 5 (impossible). For x < −1: (2−x)+(−x−1)=5 ⇒ 1−2x=5 ⇒ x=−2 (valid). → 2 solutions."
        },
        {
          q: "If log₃(x − 1) = 2, find x.",
          a: "x − 1 = 3² = 9 ⇒ x = 10. Domain check: x − 1 > 0 ✓."
        }
      ],
      traps: [
        "Forgetting domain of log / square root → extra invalid roots.",
        "Writing √(x²) = x instead of |x|.",
        "Not reversing inequality when dividing by negative."
      ],
      memory: ["Domain first, algebra second", "Case-split |·| always", "Sign chart for quadratics"]
    },
    "sets and relations": {
      core: [
        "n(A ∪ B) = n(A) + n(B) − n(A ∩ B).",
        "Relation R on A is a subset of A × A.",
        "Reflexive: (a,a) ∈ R ∀a; Symmetric: (a,b)⇒(b,a); Transitive: (a,b),(b,c)⇒(a,c).",
        "Equivalence relation = reflexive + symmetric + transitive.",
        "Number of relations on a set with n elements = 2^{n²}."
      ],
      formulas: [
        { label: "Power set", eq: "n(P(A)) = 2^{n(A)}" },
        { label: "Cartesian", eq: "n(A × B) = n(A)·n(B)" },
        { label: "Relations", eq: "# relations on A = 2^{n²}" },
        { label: "Reflexive", eq: "Must include all (a,a)" },
        { label: "Symmetric only", eq: "Pairs come in (a,b),(b,a)" },
        { label: "De Morgan", eq: "(A ∪ B)′ = A′ ∩ B′" }
      ],
      examples: [
        {
          q: "A = {1,2,3}. How many reflexive relations on A?",
          a: "Diagonal 3 pairs fixed. Off-diagonal: 6 pairs free → 2⁶ = 64 reflexive relations."
        },
        {
          q: "Is R = {(a,b): a ≤ b} on ℝ an equivalence?",
          a: "Reflexive ✓, transitive ✓, but not symmetric (1 ≤ 2 but not 2 ≤ 1) → not equivalence."
        }
      ],
      traps: [
        "Counting relations: don’t forget diagonal is forced for reflexive.",
        "Confusing function with relation (function is special relation)."
      ],
      memory: ["2^{n²} total relations", "RST ⇒ equivalence", "n(A∪B) formula"]
    },
    // —— PHYSICS ——
    "units and measurements": {
      core: [
        "SI base: m, kg, s, A, K, mol, cd.",
        "% error of product xy: add % errors; of xⁿ: n times % error of x.",
        "Least count error dominates in single-scale instruments.",
        "Dimensional formula [M^a L^b T^c] — check homogeneity before solving.",
        "Significant figures: result of ×/÷ has least number of sig figs among factors."
      ],
      formulas: [
        { label: "Relative error", eq: "Δx / x" },
        { label: "% error", eq: "(Δx / x) × 100%" },
        { label: "Product", eq: "Δ(xy)/|xy| ≈ Δx/|x| + Δy/|y|" },
        { label: "Power", eq: "Δ(xⁿ)/|xⁿ| = |n| Δx/|x|" },
        { label: "Vernier LC", eq: "LC = 1 MSD − 1 VSD" },
        { label: "Screw gauge", eq: "LC = pitch / divisions" }
      ],
      examples: [
        {
          q: "x = (2.0 ± 0.1) cm, y = (3.0 ± 0.1) cm. % error in xy?",
          a: "%err(x)=5%, %err(y)≈3.33% → %err(xy)≈8.33%."
        },
        {
          q: "Check if v = √(2gh) is dimensionally correct.",
          a: "[v]=LT⁻¹; √(2gh)=√(L·LT⁻²)=√(L²T⁻²)=LT⁻¹ ✓."
        }
      ],
      traps: [
        "Adding absolute errors for product (should add relative).",
        "Ignoring that constants like 2, π are dimensionless."
      ],
      memory: ["Add % errors for × ÷", "n× for powers", "Homogeneity first"]
    },
    "physics and measurement": {
      core: [
        "Same as Units & Measurement: SI base units + dimensional analysis.",
        "Order of magnitude: nearest power of 10.",
        "Accuracy vs precision: systematic vs random errors."
      ],
      formulas: [
        { label: "Dimension of force", eq: "[F] = MLT⁻²" },
        { label: "Energy", eq: "[E] = ML²T⁻²" },
        { label: "Pressure", eq: "[P] = ML⁻¹T⁻²" },
        { label: "% error power", eq: "n · (Δx/x)·100%" }
      ],
      examples: [
        {
          q: "If g is measured with 1% error and t with 2%, % error in h = ½gt²?",
          a: "%err(h) = %err(g) + 2%err(t) = 1% + 4% = 5%."
        }
      ],
      traps: ["Dropping the factor 2 in % error of t²."],
      memory: ["Force MLT⁻²", "Energy ML²T⁻²"]
    },
    // —— CHEMISTRY ——
    "some basic concepts of chemistry": {
      core: [
        "Mole = 6.022×10²³ entities; n = m/M = N/N_A = V_m/22.4 (STP gas ideal).",
        "Empirical formula from % composition; molecular = n × empirical.",
        "Limiting reagent: compare actual mole ratio with stoichiometric ratio.",
        "Molarity M = moles solute / L solution; molality m = moles / kg solvent.",
        "For dilution: M₁V₁ = M₂V₂."
      ],
      formulas: [
        { label: "Moles", eq: "n = given mass / molar mass" },
        { label: "Molarity", eq: "M = n / V(L)" },
        { label: "Molality", eq: "m = n / mass solvent (kg)" },
        { label: "Mole fraction", eq: "x_A = n_A / (n_A + n_B)" },
        { label: "Dilution", eq: "M₁V₁ = M₂V₂" },
        { label: "% yield", eq: "(actual/theoretical)×100%" }
      ],
      examples: [
        {
          q: "2.0 g H₂ reacts with 16 g O₂. Limiting reagent for 2H₂+O₂→2H₂O?",
          a: "n(H₂)=1 mol, n(O₂)=0.5 mol. Need 2:1 → exact stoich. Both finish; water = 1 mol = 18 g."
        },
        {
          q: "50 mL of 0.2 M HCl diluted to 200 mL. Final M?",
          a: "M₂ = (0.2×50)/200 = 0.05 M."
        }
      ],
      traps: [
        "Using molarity formula with mL without converting to L.",
        "Forgetting limiting reagent and using excess reactant for product mass."
      ],
      memory: ["n = m/M", "M₁V₁=M₂V₂", "Limiting reagent decides"]
    },
    "atomic structure": {
      core: [
        "E_n = −13.6 Z²/n² eV (H-like); ΔE = 13.6 Z²(1/n₁² − 1/n₂²).",
        "de Broglie: λ = h/p = h/√(2mK).",
        "Heisenberg: Δx · Δp ≥ h/4π.",
        "Quantum numbers: n, ℓ (0…n−1), m_ℓ (−ℓ…ℓ), m_s (±½).",
        "Orbitals in shell n: n²; max electrons in shell: 2n²."
      ],
      formulas: [
        { label: "Bohr energy", eq: "E_n = −13.6 Z²/n² eV" },
        { label: "Radius", eq: "r_n = 0.529 n²/Z Å" },
        { label: "Photon", eq: "E = hc/λ = hν" },
        { label: "de Broglie", eq: "λ = h/mv" },
        { label: "Rydberg", eq: "1/λ = R Z²(1/n₁² − 1/n₂²)" },
        { label: "Uncertainty", eq: "Δx Δp ≥ h/4π" }
      ],
      examples: [
        {
          q: "Wavelength of photon for H atom n=2→1?",
          a: "1/λ = R(1/1² − 1/4) = (3/4)R ⇒ λ = 4/(3R) ≈ 121.6 nm (Lyman)."
        }
      ],
      traps: [
        "Using E positive for bound electron in H-atom (bound E is negative).",
        "ℓ max is n−1, not n."
      ],
      memory: ["−13.6/n²", "λ=h/p", "2n² electrons"]
    }
  };

  function normKey(ch) {
    return String(ch || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findCurated(chapter) {
    const k = normKey(chapter);
    if (CURATED[k]) return CURATED[k];
    // fuzzy includes
    for (const [key, val] of Object.entries(CURATED)) {
      if (k.includes(key) || key.includes(k)) return val;
      // partial token match
      const kt = key.split(" ");
      if (kt.length >= 2 && kt.every(t => k.includes(t))) return val;
    }
    return null;
  }

  function genericFor(subject, chapter) {
    const sk = subjKey(subject);
    const ch = chapter || "This Chapter";
    if (sk === "phy") {
      return {
        core: [
          `${ch}: start from definitions + SI units, then governing laws.`,
          "Draw free-body / field / circuit diagram before algebra.",
          "Check limiting cases (v→0, r→∞, t→0) to validate formula.",
          "Energy & momentum conservation beat force equations when possible.",
          "JEE Main loves graph-based and assertion–reason style conceptual checks."
        ],
        formulas: [
          { label: "Core law", eq: "Write the main law of " + ch },
          { label: "Derived 1", eq: "Standard result #1 (revise class notes)" },
          { label: "Derived 2", eq: "Standard result #2 + units" },
          { label: "Energy form", eq: "Work–energy / power form if applicable" },
          { label: "Vector form", eq: "Vector version (direction matters)" },
          { label: "Special case", eq: "Often-tested special case" }
        ],
        examples: [
          {
            q: `Typical JEE Main style: A numerical on ${ch} with one unknown. Approach?`,
            a: "List knowns with units → pick governing equation → substitute → check order of magnitude and sign/direction."
          },
          {
            q: `If two quantities in ${ch} are proportional, what graph is expected?`,
            a: "Straight line through origin (or affine if intercept exists). Slope = constant of proportionality."
          }
        ],
        traps: [
          "Mixing scalar and vector forms.",
          "Wrong sign convention (work, potential, current).",
          "Using formula outside its assumptions (ideal string, no friction, etc.)."
        ],
        memory: ["Diagram first", "Units check", "Limit case test"]
      };
    }
    if (sk === "chem") {
      return {
        core: [
          `${ch}: master definitions, then standard reactions / trends.`,
          "Balance atoms + charge; identify oxidizing/reducing agents when redox.",
          "Periodic trends & hybridisation appear every year in JEE Main.",
          "For equilibrium / kinetics: write rate law only from experimental data / elementary steps.",
          "Organic: reaction intermediate + reagent conditions decide product."
        ],
        formulas: [
          { label: "Key relation", eq: "Primary equation of " + ch },
          { label: "Constant", eq: "Important constant / unit" },
          { label: "pH / K form", eq: "If acid–base / equilibrium chapter" },
          { label: "Rate", eq: "Rate = k [A]^m [B]^n (order)" },
          { label: "Gas", eq: "PV = nRT (if gas laws apply)" },
          { label: "Nernst / ΔG", eq: "Link free energy & equilibrium if relevant" }
        ],
        examples: [
          {
            q: `JEE Main style: Calculate a numerical value in ${ch}.`,
            a: "Convert all units to SI/consistent set → plug into key formula → report with correct significant figures."
          },
          {
            q: "Why do many MCQs hinge on exceptions?",
            a: "Because trends (radius, IE, acidic strength) have famous exceptions — revise those tables."
          }
        ],
        traps: [
          "Confusing molality and molarity.",
          "Wrong oxidation number arithmetic.",
          "Ignoring catalyst / condition (heat, light, peroxide)."
        ],
        memory: ["Balance first", "Trend + exception", "Conditions matter"]
      };
    }
    // math default
    return {
      core: [
        `${ch}: definitions → standard results → standard methods.`,
        "Always write domain / conditions (log, inverse trig, √, division by zero).",
        "JEE Main rewards pattern recognition: complete square, AM–GM, factor, substitute.",
        "For calculus: derivative for slope/rate; integral for area/accumulation.",
        "Check options by differentiation / plug-in when algebra is heavy."
      ],
      formulas: [
        { label: "Definition", eq: "Core definition of " + ch },
        { label: "Identity 1", eq: "Most used identity / theorem" },
        { label: "Identity 2", eq: "Second high-frequency result" },
        { label: "Derivative / Δ", eq: "Rate / difference form" },
        { label: "Integral / Σ", eq: "Accumulation / series form" },
        { label: "Special value", eq: "Standard limit / value to remember" }
      ],
      examples: [
        {
          q: `Realistic JEE Main: A short numerical/MCQ on ${ch}.`,
          a: "Simplify expression → apply one standard identity → finish in ≤ 3 steps. If stuck, test options."
        },
        {
          q: "How to avoid silly mistakes?",
          a: "Box the final answer, re-check domain, and verify with a special value (x=0 or x=1)."
        }
      ],
      traps: [
        "Missing ± after square roots.",
        "Using identity outside domain.",
        "Arithmetic errors in last step after correct method."
      ],
      memory: ["Domain first", "Identity bank", "Verify by plug-in"]
    };
  }

  function findBankNotes(subject, chapter) {
    if (!_bank) return null;
    const subj = subjBankName(subject);
    const block = _bank[subj] || _bank[subject];
    if (!block || typeof block !== "object") return null;
    if (block[chapter]) return block[chapter];
    const want = normKey(chapter);
    for (const [name, val] of Object.entries(block)) {
      const nk = normKey(name);
      if (nk === want) return val;
      if (want.includes(nk) || nk.includes(want)) return val;
      const wt = want.split(" ").filter(Boolean);
      const nt = nk.split(" ").filter(Boolean);
      if (wt.length >= 2 && wt.every((t) => nk.includes(t))) return val;
      if (nt.length >= 2 && nt.every((t) => want.includes(t))) return val;
    }
    return null;
  }

  function normalizeNotes(raw, subject, chapter) {
    if (!raw || typeof raw !== "object") return null;
    const formulas = (raw.formulas || []).map((f) => {
      if (f && typeof f === "object") return { label: f.label || "Formula", eq: f.eq || "" };
      return { label: "Formula", eq: String(f || "") };
    }).filter((f) => f.eq);
    const core = (raw.core || []).map(String).filter((t) => t.length > 4);
    // Reject junk scrapes
    if (core.length && /IIT JEE Main\s+Physics IIT/i.test(core[0])) return null;
    if (formulas.length < 2 && core.length < 4) return null;
    return {
      core: core.length ? core : null,
      formulas: formulas.length ? formulas : null,
      examples: Array.isArray(raw.examples) ? raw.examples : null,
      traps: Array.isArray(raw.traps) ? raw.traps : null,
      memory: Array.isArray(raw.memory) ? raw.memory : null,
      sections: Array.isArray(raw.sections) ? raw.sections : null,
      keyConcepts: Array.isArray(raw.keyConcepts) ? raw.keyConcepts : null,
      syllabus: raw.syllabus || "",
      style: raw.style || "",
      title: raw.title || chapter
    };
  }

  function getNotes(subject, chapter) {
    const fromBank = normalizeNotes(findBankNotes(subject, chapter), subject, chapter);
    if (fromBank && (fromBank.sections || (fromBank.core && fromBank.formulas))) {
      const gen = genericFor(subject, chapter);
      return {
        core: fromBank.core || gen.core,
        formulas: fromBank.formulas || gen.formulas,
        examples: fromBank.examples || gen.examples,
        traps: fromBank.traps || gen.traps,
        memory: fromBank.memory || gen.memory,
        sections: fromBank.sections || null,
        keyConcepts: fromBank.keyConcepts || null,
        syllabus: fromBank.syllabus || "",
        style: fromBank.style || "",
        title: fromBank.title || chapter
      };
    }
    const fb = findCurated(chapter) || genericFor(subject, chapter);
    return fb;
  }

  async function ensureNotes(subject, chapter) {
    await loadBank();
    return getNotes(subject, chapter);
  }

  /** Ensure math is wrapped for KaTeX ($...$ or $$...$$). */
  function mathWrap(s, display) {
    let t = String(s == null ? "" : s).trim();
    if (!t) return "";
    // Already delimited
    if (/^\$\$[\s\S]+\$\$$/.test(t) || /^\\\[[\s\S]+\\\]$/.test(t)) return t;
    if (/^\$[^$]+\$/.test(t) || /^\\\([\s\S]+\\\)$/.test(t)) {
      // If multiple inline chunks mixed with text, leave as-is
      return t;
    }
    // Bare TeX-like content (has \command or math ops without $)
    if (/\\[a-zA-Z]+|[_^]|\\{|\\}|\\in|\\cup|\\cap|\\subset|\\mathbb|\\varnothing|\\dbinom|\\le|\\ge|\\ne/.test(t)
        || /[∀∃∈∉⊆⊂∪∩∅ℕℤℚℝ]/.test(t)) {
      return display ? `$$${t}$$` : `$${t}$`;
    }
    return t;
  }

  function formulaCards(formulas) {
    return (formulas || []).map((f, i) => {
      const cls = "f" + ((i % 6) + 1);
      let eq = String(f.eq || "").trim();
      // Formula cards always use display math for crisp symbols
      if (/^\$\$[\s\S]+\$\$$/.test(eq)) {
        /* already display */
      } else if (/^\$[^$]+\$/.test(eq)) {
        eq = "$$" + eq.slice(1, -1) + "$$";
      } else {
        eq = mathWrap(eq, true);
      }
      return `<div class="qx-sum-formula ${cls}">
        <div class="label">${esc(f.label || "Formula")}</div>
        <div class="eq">${esc(eq)}</div>
      </div>`;
    }).join("");
  }

  function renderTable(tbl) {
    if (!tbl || !tbl.headers || !tbl.rows) return "";
    const head = (tbl.headers || []).map((h) => `<th>${esc(h)}</th>`).join("");
    const body = (tbl.rows || []).map((row, ri) => {
      const cells = (row || []).map((c) => `<td>${esc(c)}</td>`).join("");
      return `<tr class="r${(ri % 3) + 1}">${cells}</tr>`;
    }).join("");
    return `<div class="qx-sum-table-wrap"><table class="qx-sum-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function renderExample(ex, idx) {
    const steps = (ex.steps || []).map((s, i) =>
      `<li><span class="step-n">Step ${i + 1}</span><span>${esc(s)}</span></li>`
    ).join("");
    const uid = `qx-ex-${idx}-${Math.random().toString(36).slice(2, 8)}`;
    return `<div class="qx-sum-example is-collapsed" data-qx-ex>
      <button type="button" class="qx-sum-ex-q" data-qx-ex-toggle aria-expanded="false" aria-controls="${uid}">
        <span class="badge">EXAMPLE ${idx + 1}</span>
        <span class="qx-sum-ex-q-text">${esc(ex.q || "")}</span>
        <span class="qx-sum-ex-chev" aria-hidden="true">▶ Click for solution</span>
      </button>
      <div class="qx-sum-ex-a" id="${uid}" hidden>
        <div class="qx-sum-ex-a-label">▶ Answer / Explanation</div>
        ${steps ? `<ul class="qx-sum-steps">${steps}</ul>` : ""}
        ${ex.a ? `<div class="qx-sum-ans"><strong>Final:</strong> ${esc(ex.a)}</div>` : ""}
      </div>
    </div>`;
  }

  function bindExampleToggles(root) {
    const scope = root || (typeof document !== "undefined" ? document : null);
    if (!scope || !scope.querySelectorAll) return;
    scope.querySelectorAll("[data-qx-ex-toggle]").forEach((btn) => {
      if (btn.dataset.qxBound === "1") return;
      btn.dataset.qxBound = "1";
      btn.addEventListener("click", () => {
        const card = btn.closest("[data-qx-ex]");
        if (!card) return;
        const panel = card.querySelector(".qx-sum-ex-a");
        const open = card.classList.toggle("is-open");
        card.classList.toggle("is-collapsed", !open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        if (panel) panel.hidden = !open;
        const chev = btn.querySelector(".qx-sum-ex-chev");
        if (chev) chev.textContent = open ? "▼ Hide solution" : "▶ Click for solution";
        // Typeset math when solution is revealed
        if (open && typeof Mx !== "undefined") {
          try {
            if (Mx.afterRenderLight) Mx.afterRenderLight(card);
            else if (Mx.afterRender) Mx.afterRender(card);
          } catch (_) { /* */ }
        }
      });
    });
  }

  function renderVisual(v) {
    if (!v || v.type !== "setDemo") return "";
    const items = (v.items || []).map((it) =>
      `<div class="qx-sum-fruit">
        <span class="qx-sum-fruit-n">${esc(it.n)}</span>
        <span class="qx-sum-fruit-ic" title="${esc(it.name || "")}">${esc(it.icon || "●")}</span>
      </div>`
    ).join("");
    return `<div class="qx-sum-visual">
      ${v.title ? `<div class="qx-sum-visual-title">${esc(v.title)}</div>` : ""}
      <div class="qx-sum-set-brace">
        <span class="brace">{</span>
        <div class="qx-sum-fruit-row">${items}</div>
        <span class="brace">}</span>
      </div>
      ${v.setEq ? `<div class="qx-sum-set-eq">${esc(v.setEq)}</div>` : ""}
      ${v.caption ? `<div class="qx-sum-set-cap">${esc(v.caption)}</div>` : ""}
    </div>`;
  }

  /** Original Quantrex SVG diagrams (not third-party assets) */
  function svgDiagram(name) {
    const common = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200" class="qx-sum-svg"';
    if (name === "vennBasic") {
      return `<svg ${common}>
        <rect x="12" y="12" width="336" height="176" rx="12" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
        <text x="28" y="36" font-size="14" font-weight="700" fill="#334155">U</text>
        <circle cx="145" cy="110" r="58" fill="rgba(37,99,235,0.18)" stroke="#2563eb" stroke-width="2.5"/>
        <circle cx="215" cy="110" r="58" fill="rgba(16,185,129,0.18)" stroke="#059669" stroke-width="2.5"/>
        <text x="118" y="115" font-size="16" font-weight="800" fill="#1e40af">A</text>
        <text x="228" y="115" font-size="16" font-weight="800" fill="#065f46">B</text>
        <text x="168" y="118" font-size="11" font-weight="700" fill="#7c3aed">A∩B</text>
      </svg>`;
    }
    if (name === "vennOps") {
      return `<svg ${common} viewBox="0 0 360 220">
        <g transform="translate(0,0)">
          <rect x="8" y="8" width="168" height="96" rx="10" fill="#eff6ff" stroke="#93c5fd"/>
          <circle cx="70" cy="56" r="28" fill="rgba(37,99,235,0.35)" stroke="#2563eb"/>
          <circle cx="105" cy="56" r="28" fill="rgba(37,99,235,0.35)" stroke="#2563eb"/>
          <text x="16" y="28" font-size="11" font-weight="800" fill="#1e40af">A ∪ B</text>
        </g>
        <g transform="translate(184,0)">
          <rect x="8" y="8" width="168" height="96" rx="10" fill="#ecfdf5" stroke="#6ee7b7"/>
          <circle cx="70" cy="56" r="28" fill="none" stroke="#059669" stroke-width="2"/>
          <circle cx="105" cy="56" r="28" fill="none" stroke="#059669" stroke-width="2"/>
          <circle cx="87" cy="56" r="14" fill="rgba(16,185,129,0.55)"/>
          <text x="16" y="28" font-size="11" font-weight="800" fill="#065f46">A ∩ B</text>
        </g>
        <g transform="translate(0,112)">
          <rect x="8" y="8" width="168" height="96" rx="10" fill="#fff7ed" stroke="#fdba74"/>
          <circle cx="70" cy="56" r="28" fill="rgba(234,88,12,0.4)" stroke="#ea580c"/>
          <circle cx="105" cy="56" r="28" fill="none" stroke="#ea580c" stroke-width="2"/>
          <text x="16" y="28" font-size="11" font-weight="800" fill="#9a3412">A − B</text>
        </g>
        <g transform="translate(184,112)">
          <rect x="8" y="8" width="168" height="96" rx="10" fill="#faf5ff" stroke="#d8b4fe"/>
          <rect x="20" y="28" width="144" height="64" rx="6" fill="rgba(124,58,237,0.12)" stroke="#7c3aed"/>
          <circle cx="90" cy="60" r="26" fill="#fff" stroke="#7c3aed" stroke-width="2"/>
          <text x="16" y="28" font-size="11" font-weight="800" fill="#6b21a8">A′ in U</text>
          <text x="84" y="64" font-size="12" font-weight="800" fill="#6b21a8">A</text>
        </g>
      </svg>`;
    }
    if (name === "powerSetHint") {
      return `<svg ${common} viewBox="0 0 360 160">
        <rect x="10" y="20" width="100" height="44" rx="10" fill="#dbeafe" stroke="#3b82f6"/>
        <text x="60" y="48" text-anchor="middle" font-size="13" font-weight="800" fill="#1e40af">n elements</text>
        <path d="M120 42 H150" stroke="#64748b" stroke-width="2" marker-end="url(#arr)"/>
        <rect x="155" y="12" width="90" height="36" rx="8" fill="#d1fae5" stroke="#10b981"/>
        <text x="200" y="35" text-anchor="middle" font-size="12" font-weight="700" fill="#065f46">include</text>
        <rect x="155" y="58" width="90" height="36" rx="8" fill="#fee2e2" stroke="#f87171"/>
        <text x="200" y="81" text-anchor="middle" font-size="12" font-weight="700" fill="#991b1b">exclude</text>
        <path d="M255 42 H285" stroke="#64748b" stroke-width="2"/>
        <rect x="290" y="20" width="60" height="44" rx="10" fill="#ede9fe" stroke="#8b5cf6"/>
        <text x="320" y="48" text-anchor="middle" font-size="16" font-weight="800" fill="#5b21b6">2ⁿ</text>
        <text x="180" y="130" text-anchor="middle" font-size="13" font-weight="700" fill="#334155">n(P(A)) = 2^{n(A)}</text>
      </svg>`;
    }
    if (name === "inclusion") {
      return `<svg ${common} viewBox="0 0 360 180">
        <circle cx="140" cy="90" r="60" fill="rgba(37,99,235,0.2)" stroke="#2563eb" stroke-width="2"/>
        <circle cx="220" cy="90" r="60" fill="rgba(16,185,129,0.2)" stroke="#059669" stroke-width="2"/>
        <text x="105" y="95" font-size="15" font-weight="800" fill="#1e40af">A</text>
        <text x="245" y="95" font-size="15" font-weight="800" fill="#065f46">B</text>
        <text x="165" y="95" font-size="12" font-weight="800" fill="#7c3aed">∩</text>
        <text x="180" y="168" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a">n(A∪B)=n(A)+n(B)−n(A∩B)</text>
      </svg>`;
    }
    if (name === "relationGrid") {
      return `<svg ${common} viewBox="0 0 360 200">
        <text x="180" y="24" text-anchor="middle" font-size="12" font-weight="800" fill="#475569">A×A for A={1,2,3} — ordered pairs</text>
        ${[0,1,2].map((r) => [0,1,2].map((c) => {
          const x = 95 + c * 55;
          const y = 45 + r * 45;
          const a = r + 1, b = c + 1;
          const diag = a === b;
          return `<rect x="${x}" y="${y}" width="48" height="38" rx="8" fill="${diag ? "#fce7f3" : "#eff6ff"}" stroke="${diag ? "#db2777" : "#3b82f6"}"/>
            <text x="${x + 24}" y="${y + 24}" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a">(${a},${b})</text>`;
        }).join("")).join("")}
        <text x="180" y="192" text-anchor="middle" font-size="11" font-weight="700" fill="#6b21a8">Pink = diagonal (needed for reflexive)</text>
      </svg>`;
    }
    return "";
  }

  function renderDiagram(d) {
    if (!d || d.type !== "svg") return "";
    const svg = svgDiagram(d.name);
    if (!svg) return "";
    return `<div class="qx-sum-diagram">
      ${svg}
      ${d.caption ? `<div class="qx-sum-diagram-cap">${esc(d.caption)}</div>` : ""}
      <div class="qx-sum-diagram-brand">Quantrex Academy</div>
    </div>`;
  }

  function renderMethods(methods) {
    if (!methods || !methods.length) return "";
    return `<div class="qx-sum-methods">
      <div class="qx-sum-methods-h">Methods of representing sets</div>
      ${methods.map((m) => `
        <div class="qx-sum-method">
          <div class="qx-sum-method-num">${esc(m.num || "")}</div>
          <div class="qx-sum-method-body">
            <div class="qx-sum-method-title">${esc(m.title || "")}</div>
            <p>${esc(m.body || "")}</p>
            ${m.example ? `<div class="qx-sum-method-ex"><span>Example</span>${esc(m.example)}</div>` : ""}
          </div>
        </div>`).join("")}
    </div>`;
  }

  function renderCompare(cards) {
    if (!cards || !cards.length) return "";
    return `<div class="qx-sum-compare">
      ${cards.map((c, i) => `
        <div class="qx-sum-compare-card c${(i % 4) + 1}">
          <div class="qx-sum-compare-title">${esc(c.title || "")}</div>
          <div class="qx-sum-compare-eq">${esc(c.eq || "")}</div>
          ${c.note ? `<div class="qx-sum-compare-note">${esc(c.note)}</div>` : ""}
        </div>`).join("")}
    </div>`;
  }

  function renderAnnotate(ann) {
    if (!ann) return "";
    const labs = (ann.labels || []).map((l) =>
      `<span class="qx-sum-ann-lab ${esc(l.side || "")}">${esc(l.text || "")}</span>`
    ).join("");
    return `<div class="qx-sum-annotate">
      ${ann.title ? `<div class="qx-sum-annotate-h">${esc(ann.title)}</div>` : ""}
      <div class="qx-sum-annotate-eq">${esc(ann.eq || "")}</div>
      <div class="qx-sum-annotate-labs">${labs}</div>
      ${ann.result ? `<div class="qx-sum-annotate-res"><strong>Roster form:</strong> ${esc(ann.result)}</div>` : ""}
    </div>`;
  }

  function renderSection(sec, si) {
    const def = sec.definition
      ? `<div class="qx-sum-def"><span class="qx-sum-def-tag">Definition</span><p>${esc(sec.definition)}</p></div>`
      : "";
    const paras = (sec.paras || []).map((p) => `<p class="qx-sum-para">${esc(p)}</p>`).join("");
    const bullets = (sec.bullets || []).length
      ? `<ul class="qx-sum-bullets">${(sec.bullets || []).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`
      : "";
    const points = (sec.points || []).length
      ? `<ul class="qx-sum-points">${(sec.points || []).map((t) =>
          `<li><span class="dot"></span><span>${esc(t)}</span></li>`
        ).join("")}</ul>`
      : "";
    const eqs = (sec.equations || []).length
      ? `<div class="qx-sum-formula-grid">${formulaCards(sec.equations)}</div>`
      : "";
    const exs = (sec.examples || []).map((ex, i) => renderExample(ex, i)).join("");
    return `<section class="qx-sum-section topic t${(si % 6) + 1}" id="qx-sum-sec-${si}">
      <h2><span class="ic">${si + 1}</span> ${esc(sec.title || "Topic")}</h2>
      ${def}
      ${renderVisual(sec.visual)}
      ${renderDiagram(sec.diagram)}
      ${paras}
      ${renderMethods(sec.methods)}
      ${renderCompare(sec.compare)}
      ${renderAnnotate(sec.annotate)}
      ${bullets}${points}${eqs}${renderTable(sec.table)}
      ${exs ? `<div class="qx-sum-sec-examples">${exs}</div>` : ""}
    </section>`;
  }

  function renderPage(opts) {
    const subject = opts.subject || "Mathematics";
    const chapter = opts.chapter || "Chapter";
    const sk = subjKey(subject);
    const notes = opts.notes || getNotes(subject, chapter);
    const pyqClick = opts.pyqPayload || "";
    const backClick = opts.backPayload || "";
    const hasSections = Array.isArray(notes.sections) && notes.sections.length > 0;

    const keyBlock = (notes.keyConcepts || []).length
      ? `<section class="qx-sum-section keys">
          <h2><span class="ic">🗂</span> Key Concepts</h2>
          <div class="qx-sum-keygrid">
            ${(notes.keyConcepts || []).map((k, i) =>
              `<a class="qx-sum-key k${(i % 6) + 1}" href="#qx-sum-sec-${Math.min(i, (notes.sections || []).length - 1)}">${esc(k)}</a>`
            ).join("")}
          </div>
        </section>`
      : "";

    const syllabus = notes.syllabus
      ? `<div class="qx-sum-syllabus"><strong>JEE Main syllabus</strong><span>${esc(notes.syllabus)}</span></div>`
      : "";

    const topicsHtml = hasSections
      ? notes.sections.map((s, i) => renderSection(s, i)).join("")
      : "";

    const legacyCore = !hasSections
      ? `<section class="qx-sum-section core">
          <h2><span class="ic">📌</span> Must-know concepts</h2>
          <ul class="qx-sum-points">
            ${(notes.core || []).map(t => `<li><span class="dot"></span><span>${esc(t)}</span></li>`).join("")}
          </ul>
        </section>`
      : "";

    // Always surface a clickable-examples bank (section examples + chapter examples)
    const allExamples = [];
    const seenQ = new Set();
    function pushEx(ex) {
      if (!ex || !ex.q || seenQ.has(ex.q)) return;
      seenQ.add(ex.q);
      allExamples.push(ex);
    }
    (notes.examples || []).forEach(pushEx);
    (notes.sections || []).forEach((sec) => (sec.examples || []).forEach(pushEx));
    const examplesBlock = allExamples.length
      ? `<section class="qx-sum-section examples">
          <h2><span class="ic">💡</span> Worked examples <span style="font-weight:600;font-size:12px;color:#6d28d9">(click for solution)</span></h2>
          <p class="qx-sum-para" style="margin-top:-4px;margin-bottom:12px;opacity:0.9">Tap an example to open step-by-step solution. Math is rendered with KaTeX.</p>
          ${allExamples.map((ex, i) => renderExample(ex, i)).join("")}
        </section>`
      : "";

    return `<div class="qx-sum-page">
      <div class="qx-sum-hero ${sk}">
        <div class="qx-sum-hero-badge">Concise Summary Notes</div>
        <h1>${esc(chapter)}</h1>
        <p>JEE Main · ${esc(subject)} · Full study notes</p>
        <div class="qx-sum-pills">
          <span class="qx-sum-pill">Definitions</span>
          <span class="qx-sum-pill">Visuals</span>
          <span class="qx-sum-pill">Formulas</span>
          <span class="qx-sum-pill">Step examples</span>
          <span class="qx-sum-pill">Exam traps</span>
        </div>
      </div>
      ${syllabus}
      ${keyBlock}
      ${legacyCore}
      ${(notes.formulas || []).length ? `<section class="qx-sum-section formulas">
        <h2><span class="ic">∑</span> Formula flash cards</h2>
        <div class="qx-sum-formula-grid">${formulaCards(notes.formulas)}</div>
      </section>` : ""}
      ${topicsHtml}
      ${examplesBlock}
      ${(notes.traps || []).length ? `<section class="qx-sum-section traps">
        <h2><span class="ic">⚠️</span> Common mistakes & traps</h2>
        <div class="qx-sum-traps">
          ${(notes.traps || []).map(t => `<div class="qx-sum-trap"><span class="warn">⚠️</span><span>${esc(t)}</span></div>`).join("")}
        </div>
      </section>` : ""}
      ${(notes.memory || []).length ? `<section class="qx-sum-section memory">
        <h2><span class="ic">🧠</span> Memory hooks</h2>
        <div class="qx-sum-memory">
          ${(notes.memory || []).map(m => `<span class="qx-sum-mem">${esc(m)}</span>`).join("")}
        </div>
      </section>` : ""}
      <div class="qx-sum-cta">
        ${pyqClick ? `<button type="button" class="btn-primary" ${pyqClick}>🎯 Practise PYQs of this chapter</button>` : ""}
        ${backClick ? `<button type="button" class="btn-soft" ${backClick}>${opts.backLabel || "← Back"}</button>` : ""}
      </div>
    </div>`;
  }

  function chapterMatchesUnit(chapter, unit) {
    const ch = normKey(chapter);
    if (!ch) return false;
    const banks = unit.bankChapters || [];
    for (const b of banks) {
      const nb = normKey(b);
      if (nb === ch || ch.includes(nb) || nb.includes(ch)) return true;
    }
    // topic title overlap
    for (const t of unit.topics || []) {
      const nt = normKey(t.title);
      if (nt && (ch.includes(nt) || nt.includes(ch))) return true;
    }
    return false;
  }

  function renderChapterTopicIndex(opts) {
    const data = opts.chapterPack;
    if (!data || !data.topics) return "";
    const sk = subjKey(opts.subject);
    const makeTopic = opts.makeTopicPayload;
    const chName = data.chapter || opts.chapter || "Chapter";
    const list = (data.topics || []).map((t, i) => {
      const click = typeof makeTopic === "function" ? makeTopic(t.id, t.title) : "";
      return `<button type="button" class="qx-mu-topic qx-sr-topic" ${click}>
        <span class="qx-sr-num">${i + 1}</span>
        <span class="qx-mu-topic-t">${esc(t.title)}</span>
        <span class="qx-mu-open">Open →</span>
      </button>`;
    }).join("");

    return `<div class="qx-sum-page qx-mu-page">
      <div class="qx-sum-hero ${sk}">
        <div class="qx-sum-hero-badge">Quantrex Academy · Concise Summary Notes</div>
        <h1>${esc(data.heading || chName)}</h1>
        <p>${esc(data.subheading || "Click a subtopic to open full notes")}</p>
        <div class="qx-sum-pills">
          <span class="qx-sum-pill">${(data.topics || []).length} subtopics</span>
          <span class="qx-sum-pill">Click → open notes</span>
          <span class="qx-sum-pill">KaTeX math</span>
          <span class="qx-sum-pill">${esc(opts.subject || "")}</span>
        </div>
      </div>
      <div class="qx-mu-banner">
        <strong>${esc(chName)}</strong> — detailed theory, full formulas, diagrams. Har subtopic open karo; examples pe click karke step solution dekho.
      </div>
      <article class="qx-mu-card u1 is-hot qx-sr-only-card">
        <div class="qx-mu-card-h">
          <span class="qx-mu-num">CHAPTER</span>
          <h3>${esc(chName)} — all subtopics</h3>
        </div>
        <div class="qx-mu-topics">${list}</div>
      </article>
      <div class="qx-sum-cta">
        ${opts.backPayload ? `<button type="button" class="btn-soft" ${opts.backPayload}>← Back to chapter hub</button>` : ""}
      </div>
    </div>`;
  }

  async function renderPageAsync(opts) {
    const topicId = opts.topicId || "";
    const chapter = opts.chapter || "";
    const subject = opts.subject || "";

    await loadChapterTopics();
    const pack = findChapterPack(subject, chapter);

    if (pack && (pack.topics || []).length) {
      if (!topicId) {
        return renderChapterTopicIndex(Object.assign({}, opts, { chapterPack: pack }));
      }
      const notes = pack.byId && pack.byId[topicId];
      if (notes) {
        const indexPayload = opts.makeIndexPayload
          ? opts.makeIndexPayload()
          : opts.backPayload;
        return renderPage(Object.assign({}, opts, {
          notes,
          chapter: notes.title || opts.topicTitle || chapter,
          backPayload: indexPayload,
          backLabel: `← All ${pack.chapter || chapter} topics`,
          pyqPayload: opts.pyqPayload
        }));
      }
    }

    // Fallback: single chapter notes page
    await loadBank();
    const notes = await ensureNotes(subject, chapter);
    return renderPage(Object.assign({}, opts, {
      notes,
      backLabel: "← Back to chapter hub"
    }));
  }

  return {
    getNotes,
    ensureNotes,
    loadBank,
    loadChapterTopics,
    findChapterPack,
    renderPage,
    renderPageAsync,
    renderChapterTopicIndex,
    bindExampleToggles,
    subjKey,
    findCurated
  };
})();

// Expose after IIFE fully completes (never assign inside the factory)
try {
  if (typeof window !== "undefined") window.QxSummaryNotes = QxSummaryNotes;
} catch (err) {
  try {
    console.error("[QxSummaryNotes] init failed:", err);
  } catch (_) { /* */ }
}
