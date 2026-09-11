fetch("https://www.quantrexacademy.com/app.html?cb=" + Date.now())
  .then((r) => r.text())
  .then((t) => {
    const build = (t.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1] || "";
    console.log(JSON.stringify({
      build,
      navDpp: /> DPP</.test(t),
      fb90: /firebase-db\.js\?v=qxfix90/.test(t)
    }));
    if (build !== "qxfix90") process.exit(1);
  });
