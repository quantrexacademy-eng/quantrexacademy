/**
 * Jovi — Quantrex Academy AI study assistant (server-side SpaceXAI / xAI)
 * Env: XAI_API_KEY (required for AI replies)
 *
 * POST body: {
 *   messages: [{role, content}],
 *   context?: { page, exam, subject, chapter, questionId, questionText, options, solution },
 *   bankHits?: [{id, text, subject, chapter, source, exam, bank}],
 *   image?: string (data URL or base64),
 *   mode?: "chat"|"solve"|"generate"|"test"
 * }
 */
const JOVI_SYSTEM = `You are "Jovi" — the official AI study assistant for Quantrex Academy (quantrexacademy.com).
Visual identity: friendly orange-headed robot mascot. Students trust you as a senior mentor.

YOUR SUPERPOWERS:
- Search/use Quantrex bank hits when provided (official PYQs / books). Prefer those first.
- If a bank question has NO solution: solve it yourself step-by-step like a board professor. Label clearly: **[Jovi-generated solution]**.
- If content is missing from the bank: say so honestly, then offer to generate practice tagged **[Jovi-generated]**.
- Never present AI content as "official PYQ" or "from Quantrex answer key" unless bankHits prove it.
- Multilingual: reply in the student's language (Hindi / English / Hinglish / regional).
- Tone: warm senior/mentor, exam-focused, never condescending. Prefer simple clear steps over jargon.
- If unsure about a fact, say "please double-check" — never bluff confidently.

QUERY TYPES:
- Filter by exam/year/subject/chapter/difficulty/important/repeated when student asks.
- "More like this" / "harder one" → generate original practice if bank is thin.
- Test creation: build sections, marks, time, mix bank + Jovi-generated items.
- Image questions: read carefully, extract the full question, then solve step-by-step.

OUTPUT FORMAT:
- Lists: numbered, short stem + source/year/subject tags when from bank.
- Solutions: Step 1, Step 2, … Final answer boxed/clear.
- Always separate official bank content vs [Jovi-generated].

BANK HITS (if any) are provided in the user message under <bank_hits>. Treat them as ground truth for those IDs.
CONTEXT about the current page/question is under <context>.

Web / general knowledge: you may use reasoning and general physics/chemistry/math knowledge to teach and solve. For current affairs or live web facts you don't know, say so. Prefer correctness over speed of confident wrong answers.`;

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
  return hits.slice(0, 12).map((h, i) => {
    const stem = String(h.text || h.question || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
    return `${i + 1}. [bank id=${h.id || "?"}] ${h.subject || ""} | ${h.chapter || ""} | ${h.source || h.exam || h.bank || ""}\n${stem}`;
  }).join("\n\n");
}

function packContext(ctx) {
  if (!ctx || typeof ctx !== "object") return "";
  const lines = [];
  if (ctx.page) lines.push(`page: ${ctx.page}`);
  if (ctx.exam) lines.push(`exam: ${ctx.exam}`);
  if (ctx.subject) lines.push(`subject: ${ctx.subject}`);
  if (ctx.chapter) lines.push(`chapter: ${ctx.chapter}`);
  if (ctx.questionId) lines.push(`questionId: ${ctx.questionId}`);
  if (ctx.questionText) lines.push(`question: ${String(ctx.questionText).slice(0, 2500)}`);
  if (ctx.options && ctx.options.length) lines.push(`options: ${JSON.stringify(ctx.options).slice(0, 1500)}`);
  if (ctx.solution) lines.push(`existing_solution: ${String(ctx.solution).slice(0, 2000)}`);
  if (ctx.wrongAnswer != null) lines.push(`student_selected: ${ctx.wrongAnswer}`);
  if (ctx.mode) lines.push(`mode: ${ctx.mode}`);
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
      message: "Set XAI_API_KEY in Vercel env for full professor-mode answers. Local bank search still works in the widget.",
      offline: true
    }));
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const context = body.context || {};
  const bankHits = body.bankHits || [];
  const image = body.image || null;
  const mode = body.mode || "chat";

  const bankBlock = packBankHits(bankHits);
  const ctxBlock = packContext({ ...context, mode });

  const systemExtra = [
    bankBlock ? `<bank_hits>\n${bankBlock}\n</bank_hits>` : "<bank_hits>none</bank_hits>",
    ctxBlock ? `<context>\n${ctxBlock}\n</context>` : ""
  ].filter(Boolean).join("\n\n");

  const apiMessages = [
    { role: "system", content: JOVI_SYSTEM + "\n\n" + systemExtra }
  ];

  // Keep last 12 turns
  messages.slice(-12).forEach((m) => {
    if (!m || !m.role || m.content == null) return;
    if (m.role === "system") return;
    apiMessages.push({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 12000) });
  });

  // Image: attach to last user message as multimodal content if present
  if (image && apiMessages.length) {
    let lastUser = null;
    for (let i = apiMessages.length - 1; i >= 0; i--) {
      if (apiMessages[i].role === "user") { lastUser = apiMessages[i]; break; }
    }
    if (lastUser) {
      const text = typeof lastUser.content === "string" ? lastUser.content : "Solve this question from the image.";
      const url = String(image).startsWith("data:") ? String(image) : `data:image/jpeg;base64,${image}`;
      lastUser.content = [
        { type: "text", text: text + "\n\nRead the question from the image carefully and give a step-by-step solution. Tag as [Jovi-generated]." },
        { type: "image_url", image_url: { url } }
      ];
    }
  }

  if (apiMessages.length < 2) {
    apiMessages.push({ role: "user", content: "Hi Jovi — introduce yourself briefly and how you can help with JEE/NEET prep on Quantrex." });
  }

  try {
    const r = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-4.5",
        messages: apiMessages,
        temperature: 0.35,
        max_tokens: 4096
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
      model: data.model || "grok-4.5",
      usage: data.usage || null
    }));
  } catch (e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "Jovi request failed", message: String(e.message || e) }));
  }
};