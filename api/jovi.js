/**
 * Jovi — Universal AI Academic Agent (Quantrex Academy)
 * Server: SpaceXAI / xAI (XAI_API_KEY). Client also runs database-first tools.
 *
 * POST body: {
 *   messages: [{role, content}],
 *   context?: object,
 *   bankHits?: array,
 *   image?: data URL,
 *   mode?: string,
 *   language?: string,
 *   agentHint?: string
 * }
 */
const JOVI_SYSTEM = `You are **Jovi** — the Universal AI Academic Agent of Quantrex Academy (quantrexacademy.com).

You are NOT a generic chatbot. You are an **AI Academic Operating System** for students and teachers — comparable in conversation quality, reasoning, multilingual skill, and helpfulness to ChatGPT, Gemini, Grok, and Claude — but **grounded in Quantrex Academy data first**.

Visual identity: friendly orange **robot** teacher mascot (mecha / robotics aesthetic). Warm, premium, exam-focused.

═══════════════════════════════════════
# CORE RULES (NEVER VIOLATE)
═══════════════════════════════════════
1. **DATABASE FIRST** — When bankHits / context provide Quantrex data, treat them as ground truth. Never invent PYQs, marks, ranks, syllabus counts, or student scores.
2. If data is missing, say exactly: **This information is not currently available in the Quantrex Academy database.** Then offer AI-generated practice tagged **[Jovi-generated]** only if useful.
3. Separate **DATABASE FACT** vs **[Jovi-generated]** clearly.
4. **Mathematics**: verify steps; one correct answer for single-correct MCQs; never sacrifice correctness for speed.
5. **Exam-specific**: never apply JEE pattern to NEET/NDA/MHT-CET/TS EAMCET blindly.
6. Multilingual: reply in the student's language (any: Hindi, English, Hinglish, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Arabic, etc.). Match tone + script.
7. Conversational memory: use prior turns + <context> for follow-ups ("isko difficult karo", "aur 5 do").
8. Hallucination control: uncertain → say so. Prefer accuracy > confidence.

═══════════════════════════════════════
# CAPABILITIES (ACT AS MULTI-AGENT, ONE FACE)
═══════════════════════════════════════
Internally you coordinate specialists (user sees one Jovi):
• DATABASE / PYQ AGENT — search & filter bank hits (exam, year, subject, chapter, difficulty)
• EXAM PATTERN AGENT — JEE Main/Adv, BITSAT, NEET, NDA, MHT-CET, TS/AP EAMCET, KCET, WBJEE, COMEDK, VITEEE, IISER IAT, NEST, CBSE classes, Olympiads
• TEST GENERATOR — Easy/Medium/Hard/Mixed; timed or practice; exam-style structure
• MATHEMATICS AGENT — Algebra, Calculus, Coordinate Geo, Vectors, 3D, Probability, Trigonometry, etc. Step-by-step + short method + common traps
• SOLUTION AGENT — official solution if present; else [Jovi-generated solution]
• STUDENT ANALYTICS — if performance context given: weak/strong chapters, accuracy, plan
• DOCUMENT / IMAGE AGENT — read screenshots, reconstruct questions, solve carefully (no fake measurements)
• RESEARCH — general science/math OK; live web facts only if known; else admit limit

═══════════════════════════════════════
# APP ACTIONS (client executes)
═══════════════════════════════════════
When user wants to OPEN exams or CREATE/START tests, append:

\`\`\`jovi-action
{"type":"open_exam","exam":"ts_eamcet"}
\`\`\`

\`\`\`jovi-action
{"type":"create_test","exam":"jee_main","subject":"Mathematics","difficulty":"Hard","count":25,"timed":true}
\`\`\`

\`\`\`jovi-action
{"type":"open_track","track":"Engineering"}
\`\`\`

exam slugs: jee_main, jee_advanced, ts_eamcet, ap_eamcet, mht_cet, bitsat, viteee, comedk, kcet, wbjee, manipal_met, nest_niser, iat_iiser, kvpy, nta_abhyas_jee_main, nta_abhyas_neet, neet, aiims, jipmer, nda, class_11, class_12
difficulty: Easy | Medium | Hard | all
track: Engineering | Medical | Defence | Academic

For pure teaching/doubt/solve: NO action block.

═══════════════════════════════════════
# SIMILAR PRACTICE GENERATOR
═══════════════════════════════════════
When asked to generate similar / trickier practice questions:
• Same chapter and concept as the source question.
• NEW numbers, functions, or setup — never copy the original stem.
• Each item MUST have: stem, 4 options (MCQ) or numerical value, correct answer, complete step-by-step solution with $...$ / $$...$$ LaTeX.
• Tag every generated item **[Jovi-generated]**.
• Do not repeat any stem listed in <avoid_stems>.
• Trickier = extra constraint, nested case, or one more reasoning step. Still one unambiguous correct answer.
• Verify the answer before writing the solution. If unsure, pick a simpler variant that you can prove.

# TEACHING / OUTPUT QUALITY
═══════════════════════════════════════
• Solutions: Step 1… Final answer clear; optional 30s trick; common mistakes. Math in $...$ or $$...$$.
• Tests: title, exam, duration, marks scheme if known, instructions.
• Lists: numbered, short stem + source tags from bank.
• Adaptive advice: if student weak, next set slightly harder on weak topics only after basics.
• Voice-friendly: clear sentences when student uses voice.
• Premium UX tone: ChatGPT + Gemini + Grok + expert JEE faculty + Quantrex DB.
• You can: solve, explain, generate similar/trickier practice, open exams, make tests, read images, analytics.

BANK HITS → <bank_hits>. CONTEXT → <context>. Always prefer Quantrex data when present.`;

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") return resolve(req.body);
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 12e6) reject(new Error("Body too large")); });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function packBankHits(hits) {
  if (!hits || !hits.length) return "";
  return hits.slice(0, 14).map((h, i) => {
    const stem = String(h.text || h.question || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 420);
    return `${i + 1}. [DATABASE FACT id=${h.id || "?"}] ${h.subject || ""} | ${h.chapter || ""} | ${h.source || h.exam || h.bank || ""}${h.hasSolution ? " | has_solution" : ""}\n${stem}`;
  }).join("\n\n");
}

const SIMILAR_SYSTEM = `You generate NEW exam practice questions for Quantrex Academy.
Return ONLY valid JSON (no markdown) of the form:
{"ok":true,"questions":[{"text":"...","type":"mcq","options":["A text","B text","C text","D text"],"answer":"B","sol":"Step 1: ... Final answer: **B**"}]}
Rules:
- Same concept/chapter as the source. Different numbers and wording. Never copy the source stem.
- type is "mcq" (4 options) or "numerical" (options [] and answer is the numeric string; also set correctValue).
- answer for MCQ is A, B, C or D.
- sol is a complete, correct solution with $...$ or $$...$$ LaTeX. End with the final answer.
- Tag the first line of sol with [Jovi-generated].
- Do not invent official PYQ years. These are practice items only.
- Verify algebra before writing the answer. One unambiguous correct option.
- If trickier=true, add one extra constraint or nested step, still solvable at the exam level.
- Do not repeat any stem in avoid_stems.
- Produce exactly the requested count when possible (minimum 1).`;

function extractJsonObject(text) {
  const s = String(text || "").trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch (_) { /* */ }
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try { return JSON.parse(fence[1].trim()); } catch (_) { /* */ }
  }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch (_) { /* */ }
  }
  return null;
}

function normalizeGenerated(raw, count) {
  const obj = raw && typeof raw === "object" ? raw : {};
  const list = Array.isArray(obj.questions) ? obj.questions : (Array.isArray(obj.items) ? obj.items : []);
  const out = [];
  const want = Math.max(1, Math.min(10, Number(count) || 3));
  list.forEach((q) => {
    if (!q || out.length >= want) return;
    const text = String(q.text || q.q || q.question || "").trim();
    const sol = String(q.sol || q.solution || q.explanation || "").trim();
    if (text.length < 12 || sol.length < 12) return;
    const typeRaw = String(q.type || "").toLowerCase();
    const opts = Array.isArray(q.options) ? q.options.map((o) => String(o == null ? "" : o).trim()) : [];
    const isNum = typeRaw === "numerical" || typeRaw === "nat" || (opts.filter(Boolean).length < 2 && q.correctValue != null);
    let answer = q.answer != null ? String(q.answer).trim() : "";
    if (isNum) {
      const cv = String(q.correctValue != null ? q.correctValue : answer).trim();
      if (!cv) return;
      out.push({
        text,
        type: "numerical",
        options: [],
        answer: cv,
        correctValue: cv,
        sol: /\[Jovi-generated\]/i.test(sol) ? sol : "[Jovi-generated]\n\n" + sol
      });
      return;
    }
    if (opts.filter(Boolean).length < 2) return;
    const four = opts.slice(0, 4);
    while (four.length < 4) four.push("");
    if (!/^[A-Da-d]$/.test(answer)) {
      const idx = parseInt(answer, 10);
      if (Number.isFinite(idx) && idx >= 0 && idx < 4) answer = String.fromCharCode(65 + idx);
      else if (Number.isFinite(idx) && idx >= 1 && idx <= 4) answer = String.fromCharCode(64 + idx);
      else answer = "A";
    } else {
      answer = answer.toUpperCase();
    }
    out.push({
      text,
      type: "mcq",
      options: four,
      answer,
      sol: /\[Jovi-generated\]/i.test(sol) ? sol : "[Jovi-generated]\n\n" + sol
    });
  });
  return out;
}

async function xaiChat(apiKey, payload) {
  const r = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await r.json().catch(() => ({}));
  return { r, data };
}

async function handleSimilarPractice(body, apiKey, res) {
  const context = body.context || {};
  const count = Math.max(1, Math.min(10, Number(body.count || context.count || 3) || 3));
  const trickier = !!(body.trickier || context.trickier);
  const avoid = Array.isArray(body.avoidStems) ? body.avoidStems : (context.avoidStems || []);
  const stem = String(context.questionText || context.text || body.questionText || "").slice(0, 2500);
  const opts = context.options || body.options || [];
  const user = [
    "Generate " + count + " NEW practice question(s).",
    "trickier: " + (trickier ? "true" : "false"),
    "exam: " + (context.exam || body.exam || ""),
    "subject: " + (context.subject || ""),
    "chapter: " + (context.chapter || ""),
    "source_stem:\n" + (stem || "(missing — invent a standard JEE/NEET item on the chapter)"),
    opts && opts.length ? "source_options: " + JSON.stringify(opts).slice(0, 1500) : "",
    avoid && avoid.length ? "<avoid_stems>\n" + avoid.slice(0, 12).map((s, i) => (i + 1) + ". " + String(s).slice(0, 280)).join("\n") + "\n</avoid_stems>" : "",
    "Return JSON only."
  ].filter(Boolean).join("\n\n");

  const model = process.env.XAI_MODEL || "grok-4.7";
  const { r, data } = await xaiChat(apiKey, {
    model,
    messages: [
      { role: "system", content: SIMILAR_SYSTEM },
      { role: "user", content: user }
    ],
    temperature: trickier ? 0.4 : 0.28,
    max_tokens: 8000
  });
  if (!r.ok) {
    res.statusCode = r.status || 502;
    return res.end(JSON.stringify({
      ok: false,
      error: "Upstream AI error",
      detail: data.error || data,
      status: r.status
    }));
  }
  const reply = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : "";
  const parsed = extractJsonObject(reply);
  const questions = normalizeGenerated(parsed, count);
  res.setHeader("Content-Type", "application/json");
  res.statusCode = 200;
  return res.end(JSON.stringify({
    ok: questions.length > 0,
    questions,
    count: questions.length,
    model: data.model || model,
    usage: data.usage || null,
    agent: "similar_practice"
  }));
}

function packContext(ctx) {
  if (!ctx || typeof ctx !== "object") return "";
  const lines = [];
  const keys = [
    "page", "exam", "bank", "subject", "chapter", "questionId", "mode",
    "language", "agentHint", "track", "difficulty", "weakChapters", "accuracy",
    "solvedCount", "wrongAnswer"
  ];
  keys.forEach((k) => {
    if (ctx[k] != null && ctx[k] !== "") lines.push(`${k}: ${typeof ctx[k] === "object" ? JSON.stringify(ctx[k]).slice(0, 800) : String(ctx[k]).slice(0, 500)}`);
  });
  if (ctx.questionText) lines.push(`question: ${String(ctx.questionText).slice(0, 2500)}`);
  if (ctx.options && ctx.options.length) lines.push(`options: ${JSON.stringify(ctx.options).slice(0, 1500)}`);
  if (ctx.solution) lines.push(`existing_solution: ${String(ctx.solution).slice(0, 2000)}`);
  if (ctx.performanceSummary) lines.push(`performance: ${String(ctx.performanceSummary).slice(0, 1500)}`);
  return lines.join("\n");
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "POST only" }));
  }

  let body;
  try { body = await readBody(req); }
  catch (e) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: "Invalid JSON body" }));
  }

  const apiKey = process.env.XAI_API_KEY || process.env.xai_api_key || "";
  if (!apiKey) {
    res.statusCode = 503;
    return res.end(JSON.stringify({
      error: "Jovi AI not configured",
      message: "Set XAI_API_KEY in Vercel env for full Universal Academic Agent replies. Database tools (open exam, create test, bank search) still work in the widget.",
      offline: true
    }));
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const context = body.context || {};
  const bankHits = body.bankHits || [];
  const image = body.image || null;
  const mode = body.mode || "chat";
  const language = body.language || context.language || "auto";

  if (mode === "similar_practice") {
    try {
      return await handleSimilarPractice(body, apiKey, res);
    } catch (e) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ ok: false, error: "Jovi similar practice failed", message: String(e.message || e) }));
    }
  }

  const bankBlock = packBankHits(bankHits);
  const ctxBlock = packContext({ ...context, mode, language, agentHint: body.agentHint || context.agentHint });

  const systemExtra = [
    bankBlock ? `<bank_hits>\n${bankBlock}\n</bank_hits>` : "<bank_hits>none — do not invent Quantrex PYQs</bank_hits>",
    ctxBlock ? `<context>\n${ctxBlock}\n</context>` : "",
    language && language !== "auto" ? `<reply_language>${language}</reply_language>` : "<reply_language>match the student</reply_language>"
  ].filter(Boolean).join("\n\n");

  const apiMessages = [
    { role: "system", content: JOVI_SYSTEM + "\n\n" + systemExtra }
  ];

  messages.slice(-16).forEach((m) => {
    if (!m || !m.role || m.content == null) return;
    if (m.role === "system") return;
    apiMessages.push({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content).slice(0, 14000)
    });
  });

  if (image && apiMessages.length) {
    let lastUser = null;
    for (let i = apiMessages.length - 1; i >= 0; i--) {
      if (apiMessages[i].role === "user") { lastUser = apiMessages[i]; break; }
    }
    if (lastUser) {
      const text = typeof lastUser.content === "string" ? lastUser.content : "Solve this question from the image.";
      const url = String(image).startsWith("data:") ? String(image) : `data:image/jpeg;base64,${image}`;
      lastUser.content = [
        {
          type: "text",
          text: text + "\n\n[IMAGE AGENT] Read the full question (and diagram if any). Reconstruct carefully. Solve step-by-step. Verify. Tag [Jovi-generated] if not from bank. Do not invent lengths from pure visual estimate."
        },
        { type: "image_url", image_url: { url } }
      ];
    }
  }

  if (apiMessages.length < 2) {
    apiMessages.push({
      role: "user",
      content: "Hi Jovi — introduce yourself as Quantrex Universal Academic Agent (robot teacher). Mention: any language talk, open exams, make Easy/Medium/Hard tests, solve doubts/photos, database-first PYQs."
    });
  }

  // Task-based model preference (still xAI; env can override)
  const model = process.env.XAI_MODEL || "grok-4.7";
  const isMathHeavy = /integral|differentiate|prove|matrix|determinant|limit|trigonometry|vector|coordinate|calculus|solve|solution|math/i.test(
    JSON.stringify(messages.slice(-2))
  );
  const temperature = isMathHeavy || mode === "solve" || mode === "image" ? 0.2 : 0.35;

  try {
    const r = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        temperature,
        max_tokens: 5000
      })
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      res.statusCode = r.status || 502;
      return res.end(JSON.stringify({
        error: "Upstream AI error",
        detail: data.error || data,
        status: r.status
      }));
    }

    const reply = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "";

    res.setHeader("Content-Type", "application/json");
    res.statusCode = 200;
    return res.end(JSON.stringify({
      ok: true,
      reply: reply || "(empty reply)",
      model: data.model || model,
      usage: data.usage || null,
      agent: "universal_academic"
    }));
  } catch (e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "Jovi request failed", message: String(e.message || e) }));
  }
};
