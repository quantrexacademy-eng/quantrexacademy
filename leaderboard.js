// Quantrex — Live Firebase Leaderboard
const QuantrexLeaderboard = (() => {
  const LEAGUES = [
    { name: "Legend", min: 2500, icon: "👑" },
    { name: "Platinum", min: 1500, icon: "💎" },
    { name: "Gold", min: 800, icon: "🥇" },
    { name: "Silver", min: 300, icon: "🥈" },
    { name: "Bronze", min: 0, icon: "🥉" }
  ];

  function leagueFor(points) {
    return LEAGUES.find(l => points >= l.min) || LEAGUES[LEAGUES.length - 1];
  }

  function avatarColor(seed) {
    const colors = ["#1589EE", "#7c5ce7", "#2bc48a", "#f59e0b", "#ef4444"];
    let n = 0;
    const s = String(seed || "Q");
    for (let i = 0; i < s.length; i++) n += s.charCodeAt(i);
    return colors[n % colors.length];
  }

  function currentUser() {
    try { return JSON.parse(localStorage.getItem("quantrex_user") || "null"); } catch (e) { return null; }
  }

  async function recordSolve(correct) {
    const user = currentUser();
    if (!user || !user.uid || typeof QuantrexDB === "undefined" || !QuantrexDB.db) return;
    const exam = localStorage.getItem("quantrex_exam") || "Engineering";
    const ref = QuantrexDB.db.collection("leaderboard").doc(user.uid);
    const pts = correct ? 10 : 2;
    await ref.set({
      uid: user.uid,
      name: user.name || user.email || "Student",
      exam,
      points: firebase.firestore.FieldValue.increment(pts),
      solved: firebase.firestore.FieldValue.increment(1),
      correct: firebase.firestore.FieldValue.increment(correct ? 1 : 0),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  async function fetchTop(exam, limit) {
    if (typeof QuantrexDB === "undefined" || !QuantrexDB.init()) return [];
    const snap = await QuantrexDB.db.collection("leaderboard")
      .where("exam", "==", exam || "Engineering")
      .limit(100)
      .get();
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => (b.points || 0) - (a.points || 0));
    return rows.slice(0, limit || 50).map((r, i) => ({
      rank: i + 1,
      name: r.name || "Student",
      points: r.points || 0,
      league: leagueFor(r.points || 0).name,
      leagueIcon: leagueFor(r.points || 0).icon,
      avatar: (r.name || "S").charAt(0).toUpperCase(),
      color: avatarColor(r.name),
      uid: r.uid
    }));
  }

  async function renderView() {
    const exam = typeof STATE !== "undefined" ? STATE.exam : "Engineering";
    const rows = await fetchTop(exam, 50);
    const user = currentUser();
    let you = null;
    if (user && user.uid) {
      const mine = rows.find(r => r.uid === user.uid);
      if (mine) you = mine;
      else {
        const solved = typeof STATE !== "undefined" ? STATE.solved : [];
        const pts = solved.filter(s => s.correct).length * 10;
        you = { rank: "—", name: user.name || "You", points: pts, league: leagueFor(pts).name, leagueIcon: leagueFor(pts).icon, avatar: "Y", color: "#1589EE" };
      }
    }

    const leagueBar = LEAGUES.map(l =>
      `<div class="lb-lc"><span>${l.icon}</span><strong>${l.name}</strong><small>${l.min}+ pts</small></div>`
    ).join("");

    const list = rows.length ? rows.map(p => `
      <div class="lb-row-app ${p.rank <= 3 ? 'top-' + p.rank : ''}">
        <span class="lb-rank-app">${p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : p.rank}</span>
        <span class="lb-av" style="background:${p.color}">${p.avatar}</span>
        <span class="lb-name-app">${p.name}</span>
        <span class="lb-league">${p.leagueIcon} ${p.league}</span>
        <span class="lb-pts-app">${p.points}</span>
      </div>`).join("") : '<div class="empty">Solve questions to appear on leaderboard!</div>';

    const youRow = you ? `
      <div class="lb-row-app you">
        <span class="lb-rank-app">${you.rank}</span>
        <span class="lb-av" style="background:${you.color}">${you.avatar}</span>
        <span class="lb-name-app">${you.name}</span>
        <span class="lb-league">${you.leagueIcon} ${you.league}</span>
        <span class="lb-pts-app">${you.points}</span>
      </div>` : "";

    return `<div class="lb-leagues">${leagueBar}</div><div class="lb-list-app">${list}${youRow}</div>`;
  }

  return { recordSolve, fetchTop, renderView, leagueFor, LEAGUES };
})();