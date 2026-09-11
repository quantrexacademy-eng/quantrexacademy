import re
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

dark_btn_html = '<li><button id="themeToggleBtn" style="border:1px solid var(--primary); background:transparent; border-radius:999px; height:34px; padding:0 12px; font-size:12px; font-weight:700; cursor:pointer;">Dark</button></li>'
if 'id="themeToggleBtn"' not in html:
    html = html.replace('<li><a href="#leaderboard"', dark_btn_html + '\n                <li><a href="#leaderboard"')

dark_js = '''
<script>
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            let current = document.documentElement.getAttribute('data-theme');
            let next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('qx-theme', next);
            themeBtn.innerText = next === 'dark' ? 'Light' : 'Dark';
        });
        if (localStorage.getItem('qx-theme') === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeBtn.innerText = 'Light';
        }
    }
</script>
</body>
'''
if 'id="themeToggleBtn"' not in html or 'const themeBtn' not in html:
    html = html.replace('</body>', dark_js)

dark_vars = '''
[data-theme="dark"] {
    --white: #101319;
    --dark: #ffffff;
    --light-gray: #1a1a2e;
    --surface: #1a1a2e;
    --text: #ffffff;
    --hub-bg: #101319;
    background: var(--white);
    color: var(--dark);
}
'''
if '[data-theme="dark"]' not in html:
    html = html.replace('</style>', dark_vars + '\n</style>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
