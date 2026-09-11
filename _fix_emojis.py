# -*- coding: utf-8 -*-
import re
import subprocess
import pathlib

hosting = pathlib.Path(r"C:\Users\Admin\qx-hosting\app.html")
cur = hosting.read_text(encoding="utf-8", errors="replace")

g = subprocess.check_output(
    ["git", "-C", r"E:\quantrexacademy", "show", "HEAD:app.html"]
)
git_html = g.decode("utf-8", errors="replace")

icons = {}
for view, ic in re.findall(
    r'data-view="([^"]+)"[^>]*>\s*<span class="ic">([^<]+)</span>', git_html
):
    if "?" not in ic and "\ufffd" not in ic:
        icons[view] = ic
print("icons from git:", icons)

fallback = {
    "dashboard": "🏠",
    "tests": "📝",
    "books": "📚",
    "notebook": "📒",
    "profile": "👤",
    "assignments": "📋",
    "teacher": "👩‍🏫",
    "cpyqb": "🏦",
    "allqs": "📖",
    "dpp": "⚡",
    "analytics": "📊",
    "premium": "⭐",
    "leaderboard": "🏆",
    "ncert": "📗",
    "board": "🏫",
    "custom": "🧩",
    "pyqmock": "🎯",
    "testseries": "📅",
    "quickconcepts": "💡",
}


def repl_nav(mo):
    view = mo.group(1)
    ic = icons.get(view) or fallback.get(view, "•")
    return f'data-view="{view}"><span class="ic">{ic}</span>'


cur2 = re.sub(
    r'data-view="([^"]+)"[^>]*>\s*<span class="ic">[^<]*</span>',
    repl_nav,
    cur,
)

# More / theme / back / search / streak / menu from git
pairs = [
    (r'id="navMoreToggle"><span class="ic">([^<]+)</span>', "navMoreToggle"),
    (r'id="sidebarThemeToggle"[^>]*>\s*<span class="ic">([^<]+)</span>', "themeSide"),
    (r'class="back-link"><span class="ic">([^<]+)</span>', "back"),
    (r'id="searchBtn"[^>]*>([^<]+)<', "search"),
    (r'id="themeToggle"[^>]*>([^<]+)<', "theme"),
    (r'class="streak">([^<]+)<', "streak"),
    (r'id="logoutBtn"[^>]*>([^<]+)<', "logout"),
    (r'id="navToggle">([^<]+)<', "menu"),
]
git_vals = {}
for pat, key in pairs:
    m = re.search(pat, git_html)
    if m and "?" not in m.group(1) and "\ufffd" not in m.group(1):
        git_vals[key] = m.group(1)

cur2 = re.sub(
    r'(id="navMoreToggle"><span class="ic">)[^<]*(</span>)',
    r"\1" + git_vals.get("navMoreToggle", "⋯") + r"\2",
    cur2,
)
cur2 = re.sub(
    r'(id="sidebarThemeToggle"[^>]*>\s*<span class="ic">)[^<]*(</span>)',
    r"\1" + git_vals.get("themeSide", "🌙") + r"\2",
    cur2,
)
cur2 = re.sub(
    r'(class="back-link"><span class="ic">)[^<]*(</span>)',
    r"\1" + git_vals.get("back", "←") + r"\2",
    cur2,
)
cur2 = re.sub(
    r'(id="searchBtn"[^>]*>)[^<]+',
    r"\1" + git_vals.get("search", "🔍"),
    cur2,
)
cur2 = re.sub(
    r'(id="themeToggle"[^>]*>)[^<]+',
    r"\1" + git_vals.get("theme", "🌙"),
    cur2,
)
cur2 = re.sub(
    r'(class="streak">)[^<]+',
    r"\1" + git_vals.get("streak", "🔥 14 day streak"),
    cur2,
)
cur2 = re.sub(
    r'(id="logoutBtn"[^>]*>)[^<]+',
    r"\1" + git_vals.get("logout", "👤"),
    cur2,
)
cur2 = re.sub(
    r'(id="navToggle">)[^<]+',
    r"\1" + git_vals.get("menu", "☰"),
    cur2,
)
cur2 = re.sub(
    r'\.qx-topic-card strong::before \{ content: "[^"]*"',
    '.qx-topic-card strong::before { content: "🎯 "',
    cur2,
)
cur2 = re.sub(
    r"App build .{0,8} hard refresh",
    "App build — hard refresh",
    cur2,
)
# strip remaining replacement chars in ic spans
cur2 = re.sub(r'<span class="ic">[\?\uFFFD]+</span>', '<span class="ic">•</span>', cur2)

hosting.write_bytes(cur2.encode("utf-8"))
pathlib.Path(r"E:\quantrexacademy\app.html").write_bytes(cur2.encode("utf-8"))  # noqa

t = hosting.read_text(encoding="utf-8")
print("Home:", re.search(r'data-view="dashboard".{0,50}', t).group(0))
print("ics:", re.findall(r'<span class="ic">([^<]+)</span>', t)[:15])
print("bad ic left:", len(re.findall(r'<span class="ic">[\?\uFFFD]+</span>', t)))
print("done")
