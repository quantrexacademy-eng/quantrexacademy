"use strict";
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "data/tests/jee_main_examgoal_2027/questions");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
let n = 0, hits = 0;
for (const f of files) {
  const s = fs.readFileSync(path.join(dir, f), "utf8");
  const c = (s.match(/qx-self-/g) || []).length;
  if (c) { hits++; n += c; }
}
console.log({ files: files.length, filesWithSelf: hits, mentions: n });
const one = path.join(dir, "tst-19g61mnpzm42d.json");
const qs = JSON.parse(fs.readFileSync(one, "utf8"));
const q = qs.find((x) => x.id === 3530653911);
console.log("parsed has self", /qx-self-/.test(JSON.stringify(q)));
console.log("q slice", String(q && q.q).slice(0, 180));
