// Quantrex Theme — light/dark mode with system preference fallback
const QuantrexTheme = (() => {
  const KEY = "quantrex_theme";

  function get() {
    return localStorage.getItem(KEY) || "dark";
  }

  function updateButtons(m) {
    const top = document.getElementById("themeToggle");
    if (top) top.textContent = m === "dark" ? "☀️" : "🌙";
    const side = document.getElementById("sidebarThemeToggle");
    if (side) {
      const ic = side.querySelector(".ic");
      const label = side.querySelector(".st-label");
      if (ic) ic.textContent = m === "dark" ? "☀️" : "🌙";
      if (label) label.textContent = m === "dark" ? "Turn on light mode" : "Turn on dark mode";
    }
  }

  function apply(mode) {
    const m = mode === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", m);
    localStorage.setItem(KEY, m);
    updateButtons(m);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = m === "dark" ? "#0B1120" : "#0D9488";
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