const qpage = require("../api/seo-q.js");
const hub = qpage;
const fs = require("fs");
const path = require("path");

function resBox() {
  return {
    headers: {},
    statusCode: 0,
    body: "",
    setHeader(k, v) {
      this.headers[k] = v;
    },
    end(s) {
      this.body = String(s || "");
    }
  };
}

(async () => {
  const tree = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/seo/tree.json"), "utf8"));
  const feat = tree.jee.subjects.physics.featured[0];
  const tests = [
    { name: "hub-jee", fn: hub, req: { url: "/api/seo-hub?hub=jee", query: { hub: "jee" }, headers: { host: "www.quantrexacademy.com" } } },
    { name: "hub-neet", fn: hub, req: { url: "/api/seo-hub?hub=neet", query: { hub: "neet" }, headers: { host: "www.quantrexacademy.com" } } },
    {
      name: "q",
      fn: qpage,
      req: { url: "/q/" + feat.id + "/" + feat.slug, query: { id: String(feat.id) }, headers: { host: "www.quantrexacademy.com" } }
    }
  ];
  for (const t of tests) {
    const res = resBox();
    await t.fn(t.req, res);
    const ok = res.statusCode === 200 && res.body.includes("Quantrex") && res.body.includes("<h1");
    console.log(t.name, res.statusCode, "len", res.body.length, ok ? "OK" : "FAIL", res.body.includes("Question not found") ? "NOTFOUND" : "");
    if (!ok) console.log(res.body.slice(0, 400));
  }
  console.log("sample", feat.id, feat.slug);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
