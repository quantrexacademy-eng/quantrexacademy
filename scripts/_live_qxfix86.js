fetch("https://www.quantrexacademy.com/app.html?cb=" + Date.now())
  .then((r) => r.text())
  .then((t) => {
    const build = (t.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1] || "";
    console.log(JSON.stringify({
      build,
      access86: /qx-access\.js\?v=qxfix86/.test(t),
      feed86: /qx-live-feed\.js\?v=qxfix86/.test(t),
      ts86: /test-series\.js\?v=qxfix86/.test(t)
    }));
    if (build !== "qxfix86") process.exit(1);
  });
