const fs = require("fs");
const data = JSON.parse(fs.readFileSync("data/banks/jee_advanced.json", "utf8"));
const qs = Array.isArray(data) ? data : data.questions;
const match = qs.filter(q => /match\s+(the\s+)?list|list-i|list-ii/i.test(q.q || ""));
console.log("match count", match.length);
const q = match[0];
if (q) {
  console.log("id", q.id, "_marksId", q._marksId);
  console.log("options", q.options);
  console.log("answer", q.answer);
  console.log("q snippet", (q.q || "").slice(0, 400));
}
const multi = qs.filter(q => /which of the following|more than one|one or more|multiple/i.test(q.q || ""));
console.log("multi hint count", multi.length);
if (multi[0]) {
  console.log("multi sample options", multi[0].options, "answer", multi[0].answer);
}