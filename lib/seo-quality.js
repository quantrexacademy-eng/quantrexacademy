/**
 * SEO quality labels for public /q/ pages (read-only; never edits question data).
 * Google may index every question that has a readable stem (or figure).
 * Formula cards / revision notes are blocked elsewhere — not here.
 */
function isIndexable(r) {
  if (!r) return false;
  const t = String(r.text || "");
  const hasImg = /<img/i.test(t) || (Array.isArray(r.imgs) && r.imgs.length > 0);
  if (plain(t).length >= 8 || hasImg) return true;
  return false;
}
const TAG = /<[^>]+>/g;
const MATH = /\$\$[\s\S]*?\$\$|\$[^$]*\$/g;
const BARE = /[\^_](?=\s|$|\))|(?:^|(?<=\s))[\^_]|\(\s*_|\baligned\b\s*&|\barray\s+[clr]{2,}|\bcases\b\s*&|(?<![\w.])d [xytθ](?=\s|=|$|\))|~[A-Za-z]|\bmathrm\b|\bfrac\b|\bsqrt\b|\barray\s*[|clr]|(?:\s&\s[^&]{0,40}){3,}|\bhline\b/;
const RUN = /(?:(?<!\S)[A-Za-z0-9+\-=/×∫∑](?!\S)\s+){7,}/;
const RAWCMD = /\\(?:frac|sqrt|alpha|beta|theta|int|sum|left|right|times|mathrm|vec|pi|cdot|lambda|mu|omega|Delta|text|begin|end)\b/;
const BAD = /\bundefined\b|\[object|\bNaN\b|\bnull\b/;
const NOSOL = /^\s*(?:no\s*solution|solution\s*not\s*available|n\/?a|-)\.?\s*$/i;

function opts(r) {
  let o = r && r.options;
  if (typeof o === "string") {
    try { o = JSON.parse(o); } catch (_) { o = [o]; }
  }
  return Array.isArray(o) ? o.map((x) => (x == null ? "" : String(x))) : [];
}
function plain(s) {
  return String(s == null ? "" : s).replace(MATH, " M ").replace(TAG, " ").replace(/\s+/g, " ").trim();
}
function garbled(s) {
  const raw = String(s == null ? "" : s);
  const p = plain(raw);
  return BARE.test(p) || RUN.test(p + " ") || RAWCMD.test(raw.replace(MATH, " ").replace(TAG, " ")) || BAD.test(p) || (raw.split("$").length - 1) % 2 === 1;
}
function classify(r) {
  if (!r) return "missing";
  const t = String(r.text || "");
  const s = String(r.sol || "");
  const o = opts(r);
  const a = r.answer;
  const hasImg = /<img/i.test(t) || (Array.isArray(r.imgs) ? r.imgs.length > 0 : !!r.imgs);
  if (plain(t).length < 25 && !hasImg) return "short-stem";
  if (a == null || String(a).trim() === "") return "no-answer";
  if (o.length && o.some((x) => x.trim())) {
    const sa = String(a).trim();
    if (!/^-?\d+$/.test(sa)) return "bad-answer";
    const ai = parseInt(sa, 10);
    if (ai < 0 || ai >= o.length || !o[ai].trim()) return "bad-answer";
  }
  if (!s.trim() || NOSOL.test(plain(s)) || plain(s).length < 40) return "no-solution";
  if (garbled(t) || garbled(s) || o.some(garbled)) return "garbled";
  if (o.some((x) => /^\s*[/^_]|^\s*-\s*\//.test(plain(x)))) return "garbled";
  return "good";
}
module.exports = { classify, isGood: (r) => classify(r) === "good", isIndexable, plain, opts };
