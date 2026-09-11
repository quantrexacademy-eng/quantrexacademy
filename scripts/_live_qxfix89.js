fetch("https://www.quantrexacademy.com/app.html?cb=" + Date.now())
  .then((r) => r.text())
  .then((t) => {
    const build = (t.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1] || "";
    console.log(JSON.stringify({
      build,
      drills: /> Drills</.test(t),
      marks89: /marks-features\.js\?v=qxfix89/.test(t)
    }));
    if (build !== "qxfix89") process.exit(1);
  });
