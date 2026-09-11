fetch("https://www.quantrexacademy.com/app.html?cb=" + Date.now())
  .then((r) => r.text())
  .then((t) => {
    const build = (t.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1] || "";
    console.log(JSON.stringify({
      build,
      access88: /qx-access\.js\?v=qxfix88/.test(t),
      marks88: /marks-features\.js\?v=qxfix88/.test(t),
      sol88: /qx-solution\.css\?v=qxfix88/.test(t),
      eg88: /examgoal-test-ui\.css\?v=qxfix88/.test(t)
    }));
    if (build !== "qxfix88") process.exit(1);
  });
