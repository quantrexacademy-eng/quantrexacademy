fetch("https://www.quantrexacademy.com/app.html?cb=" + Date.now())
  .then((r) => r.text())
  .then((t) => {
    const build = (t.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1] || "";
    console.log(JSON.stringify({
      build,
      access87: /qx-access\.js\?v=qxfix87/.test(t),
      marks87: /marks-features\.js\?v=qxfix87/.test(t),
      guest87: /qx-guest-trial\.js\?v=qxfix87/.test(t)
    }));
    if (build !== "qxfix87") process.exit(1);
  });
