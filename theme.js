// Quantrex Theme — light/dark mode with system preference fallback
const QuantrexTheme = (() => {
  const KEY = "quantrex_theme";

  function get() {
    return localStorage.getItem(KEY) || "dark";
  }

  const SUN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function updateButtons(m) {
    const top = document.getElementById("themeToggle");
    if (top) top.innerHTML = m === "dark" ? SUN : MOON;
    const side = document.getElementById("sidebarThemeToggle");
    if (side) {
      const ic = side.querySelector(".ic");
      const label = side.querySelector(".st-label");
      if (ic) ic.innerHTML = m === "dark" ? SUN : MOON;
      if (label) label.textContent = m === "dark" ? "Turn on light mode" : "Turn on dark mode";
    }
  }

  function apply(mode) {
    const m = mode === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", m);
    localStorage.setItem(KEY, m);
    updateButtons(m);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = m === "dark" ? "#2a2a2c" : "#f0f4f9";
    /* qxmd352: site toggle and paper theme stay in lockstep so dark ink
       cannot sit on a dark paper (or pale ink on white paper). */
    try { localStorage.setItem("quantrex_test_theme", m); } catch (_) { /* */ }
    try { document.documentElement.setAttribute("data-test-theme", m); } catch (_) { /* */ }
    document.querySelectorAll(".mtk-test-root, .eg-test-root, .qzrr-cbt, .allen-practice").forEach(el => {
      el.setAttribute("data-test-theme", m);
      el.classList.toggle("qzrr-dark", m === "dark");
      el.classList.toggle("qx-theme-dark", m === "dark");
      el.classList.toggle("qx-theme-light", m === "light");
    });
    if (typeof AllenTestUI !== "undefined" && AllenTestUI.syncPracticeTheme) {
      AllenTestUI.syncPracticeTheme(document.getElementById("app-main"), m);
    }
  }

  function toggle() {
    apply(get() === "dark" ? "light" : "dark");
  }

  function init() {
    const saved = localStorage.getItem(KEY);
    if (saved) apply(saved);
    else apply("dark");
    const btn = document.getElementById("themeToggle");
    if (btn) btn.onclick = toggle;
    const side = document.getElementById("sidebarThemeToggle");
    if (side) side.onclick = toggle;
    updateButtons(get());
  }

  return { init, toggle, apply, get };
})();