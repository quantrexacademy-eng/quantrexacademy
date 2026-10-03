/**
 * Paste-first question search.
 * Long pasted stems must rank the same PYQ; short keyword search stays loose.
 * First-pass compares the query PREFIX to truncated qsearch `t` snippets.
 */
"use strict";

const SEARCH_STOP = {
  the: 1, and: 1, for: 1, with: 1, that: 1, this: 1, from: 1, which: 1, what: 1,
  when: 1, then: 1, each: 1, into: 1, following: 1, given: 1, find: 1, than: 1,
  consider: 1, function: 1, statement: 1, correct: 1, option: 1, options: 1,
  choose: 1, select: 1, among: 1, between: 1, number: 1, value: 1, equal: 1,
  equals: 1, respectively: 1, if: 1, of: 1, is: 1, are: 1, a: 1, an: 1, to: 1,
  in: 1, on: 1, at: 1, by: 1, or: 1, as: 1, be: 1, it: 1, its: 1, was: 1, were: 1,
  has: 1, have: 1, had: 1, not: 1, no: 1, yes: 1, let: 1, so: 1, we: 1, can: 1,
  may: 1, also: 1, such: 1, these: 1, those: 1, there: 1, here: 1, about: 1,
  after: 1, before: 1, only: 1, more: 1, most: 1, some: 1, any: 1, all: 1,
  both: 1, either: 1, neither: 1, one: 1, two: 1, three: 1, four: 1, five: 1,
  six: 1, seven: 1, eight: 1, nine: 1, ten: 1, where: 1, whose: 1, whom: 1,
  how: 1, why: 1, does: 1, did: 1, do: 1, will: 1, would: 1, should: 1,
  could: 1, must: 1, being: 1, been: 1, their: 1, them: 1, they: 1, you: 1,
  your: 1, our: 1, out: 1, over: 1, under: 1, above: 1, below: 1, upon: 1,
  per: 1, via: 1, fig: 1, figure: 1, shown: 1, hence: 1, thus: 1, therefore: 1,
  defined: 1, define: 1, denote: 1, denotes: 1, called: 1, else: 1, case: 1,
  cases: 1, type: 1, types: 1, match: 1, list: 1, column: 1, assertion: 1,
  reason: 1, codes: 1, code: 1, true: 1, false: 1, always: 1, never: 1,
  sometimes: 1, possible: 1, cannot: 1, question: 1, questions: 1, answer: 1,
  answers: 1, marks: 1, mark: 1, jee: 1, neet: 1, main: 1, mains: 1,
  advanced: 1, aiims: 1, nda: 1, bitsat: 1, according: 1, based: 1,
  using: 1, used: 1, use: 1, shown: 1, following: 1, given: 1, find: 1,
  calculate: 1, determine: 1, obtain: 1, obtained: 1, corresponding: 1,
  respect: 1, wrt: 1, same: 1, different: 1, each: 1, every: 1
};

function normalizeStem(s) {
  return String(s || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\$+/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(q) {
  const raw = normalizeStem(q).split(/\s+/).filter(Boolean);
  const words = raw.filter((w) => w.length >= 2 && !SEARCH_STOP[w]);
  return words.length ? words : raw.filter((w) => w.length >= 2);
}

function distinctive(words) {
  const scored = (words || []).map((w) => ({
    w,
    s: w.length + (/\d/.test(w) ? 5 : 0) + (w.length >= 8 ? 3 : 0)
  }));
  scored.sort((a, b) => b.s - a.s || a.w.localeCompare(b.w));
  const out = [];
  const seen = Object.create(null);
  scored.forEach((x) => {
    if (!x.w || seen[x.w]) return;
    seen[x.w] = 1;
    out.push(x.w);
  });
  return out;
}

function isPaste(raw, words) {
  const s = String(raw || "");
  return s.length >= 70 || ((words || []).length >= 8);
}

function searchKey(word) {
  const t = String(word || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (t.length < 2) return "zz";
  return t.slice(0, 2);
}

function shardKeys(words, distinctiveWords) {
  const keys = [];
  const push = (w) => {
    const k = searchKey(w);
    if (k && k !== "zz" && keys.indexOf(k) < 0) keys.push(k);
  };
  (distinctiveWords || []).slice(0, 10).forEach(push);
  (words || []).slice(0, 6).forEach(push);
  return keys.slice(0, 12);
}

function phraseKey(norm, n) {
  const s = String(norm || "").trim();
  const cap = n == null ? 72 : n;
  return s.slice(0, cap);
}

function scoreHay(hayNorm, words, distinctiveWords, pKey) {
  const hay = String(hayNorm || "");
  if (!hay) {
    return { score: 0, hits: 0, distHits: 0, phrase: false, overlap: 0, distOverlap: 0 };
  }
  const w = words || [];
  const d = distinctiveWords || [];
  const hits = w.length ? w.filter((x) => hay.indexOf(x) >= 0).length : 0;
  const distHits = d.length ? d.filter((x) => hay.indexOf(x) >= 0).length : 0;
  const p = String(pKey || "");
  const phrase = p.length >= 18 && hay.indexOf(p) >= 0;
  const overlap = w.length ? hits / w.length : 0;
  const distOverlap = d.length ? distHits / d.length : 0;
  let score = hits * 2 + distHits * 10 + overlap * 90 + distOverlap * 140;
  if (phrase) score += 90;
  if (p.length >= 24 && hay.slice(0, p.length + 12).indexOf(p.slice(0, 24)) >= 0) score += 45;
  return { score, hits, distHits, phrase, overlap, distOverlap };
}

function firstPassNeed(paste, words, distinctiveWords) {
  if (!paste) {
    if (!words || words.length <= 1) return { hits: 1, dist: 0 };
    if (words.length >= 8) return { hits: Math.min(3, words.length), dist: 1 };
    return { hits: Math.min(2, words.length), dist: 0 };
  }
  const dlen = (distinctiveWords || []).length;
  return {
    hits: Math.min(4, Math.max(2, Math.ceil((words || []).length * 0.28))),
    dist: Math.min(4, Math.max(2, Math.ceil(dlen * 0.32)))
  };
}

function passesFirst(stats, need, paste) {
  if (!stats) return false;
  if (stats.phrase) return true;
  if (paste) {
    return (stats.distHits >= need.dist && stats.hits >= need.hits)
      || stats.overlap >= 0.42
      || stats.distOverlap >= 0.45;
  }
  return stats.hits >= need.hits;
}

function passesHydrated(stats, paste) {
  if (!stats) return false;
  if (stats.phrase) return true;
  if (!paste) return stats.hits >= 1;
  return stats.overlap >= 0.28 || stats.distOverlap >= 0.32 || stats.distHits >= 3;
}

function shouldRedirect(scored, paste) {
  if (!paste || !scored || !scored.length) return false;
  const a = scored[0];
  if (!a) return false;
  const ov = a._overlap || 0;
  const dov = a._distOverlap || 0;
  if (a._phrase && (ov >= 0.55 || dov >= 0.6)) return true;
  if (ov < 0.88 && dov < 0.9) return false;
  const b = scored[1];
  if (!b) return true;
  return (ov - (b._overlap || 0) >= 0.08) || (dov - (b._distOverlap || 0) >= 0.1);
}

function noCloseMatch(scored, paste) {
  if (!paste) return false;
  if (!scored || !scored.length) return true;
  const a = scored[0];
  return !a._phrase && (a._overlap || 0) < 0.28 && (a._distOverlap || 0) < 0.32;
}

module.exports = {
  SEARCH_STOP,
  normalizeStem,
  tokens,
  distinctive,
  isPaste,
  searchKey,
  shardKeys,
  phraseKey,
  scoreHay,
  firstPassNeed,
  passesFirst,
  passesHydrated,
  shouldRedirect,
  noCloseMatch
};
