const fs = require("fs");
const banks = ["jee_advanced", "jee_main", "neet"];
for (const b of banks) {
  const path = `data/banks/${b}.json`;
  if (!fs.existsSync(path)) { console.log(b, "missing"); continue; }
  const data = JSON.parse(fs.readFileSync(path, "utf8"));
  const qs = Array.isArray(data) ? data : (data.questions || []);
  const types = {};
  qs.forEach(q => {
    const t = q.questionType || q.type || "unknown";
    types[t] = (types[t] || 0) + 1;
  });
  console.log("\n" + b, "count", qs.length);
  console.log(types);
  const sample = qs.find(q => /column|match|multi|matrix/i.test(JSON.stringify(q)));
  if (sample) console.log("sample special:", sample.id, sample.questionType, (sample.q || "").slice(0, 120));
}