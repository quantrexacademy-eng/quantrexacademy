const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "data", "banks");
const re = /https?:\/\/[^"'\\\s>]+\.(?:png|jpg|jpeg|webp)/gi;
const set = new Set();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  const s = fs.readFileSync(path.join(dir, f), "utf8");
  let m;
  while ((m = re.exec(s))) {
    let u = m[0].replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
    if (/cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(u)) set.add(u);
  }
}
console.log("unique pool urls", set.size);
fs.writeFileSync(path.join(__dirname, "_all_pool_urls.json"), JSON.stringify([...set], null, 2));
const env = fs.existsSync(path.join(__dirname, "..", ".env"))
  ? fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8")
  : "";
console.log("OPENAI_API_KEY", /OPENAI_API_KEY\s*=\s*\S+/.test(env) ? "set" : "missing");
