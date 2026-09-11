import re
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('login.html', 'r', encoding='utf-8') as f:
    login_html = f.read()

start_css = login_html.find('/* Stage')
if start_css == -1: start_css = login_html.find('.stage {')
end_css = login_html.find('</style>')
stage_css = login_html[start_css:end_css] if start_css != -1 else ""

start_stage = login_html.find('<div class="stage"')
end_stage = login_html.find('</div>\n    <section class="login-bar"')
if end_stage == -1: end_stage = login_html.find('</section>', start_stage)
stage_html = login_html[start_stage:end_stage] + '</div>' if start_stage != -1 else ""
stage_html = re.sub(r'<p class="hint".*?</p>', '', stage_html, flags=re.DOTALL)

if stage_css:
    html = html.replace('/* HEADER */', stage_css + '\n/* HEADER */')

# Some CSS variables from login.html for the stage
stage_vars = '''
    :root {
        --ring: rgba(56,189,248,0.25);
        --hub-bg: #071526;
        --surface: #ffffff;
    }
'''
html = html.replace('/* HEADER */', stage_vars + '\n/* HEADER */')

phone_wrap_pattern = r'<a href="app.html" class="phone-wrap".*?</a>'
html = re.sub(phone_wrap_pattern, stage_html, html, flags=re.DOTALL)

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
html = html.replace('</body>', dark_js)

dark_vars = '''
[data-theme="dark"] {
    --white: #101319;
    --dark: #ffffff;
    --light-gray: #1a1a2e;
    --surface: #1a1a2e;
    --text: #ffffff;
    --hub-bg: #101319;
}
'''
html = html.replace('</style>', dark_vars + '\n</style>')

mail_svg = '<svg style="width:16px;height:16px;vertical-align:middle;margin-right:8px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>'
phone_svg = '<svg style="width:16px;height:16px;vertical-align:middle;margin-right:8px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'

html = html.replace('support@quantrexacademy.com', mail_svg + 'support@quantrexacademy.com')
html = html.replace('9876543210', phone_svg + '9876543210')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
