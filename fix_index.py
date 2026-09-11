import re
with open('index_original.html', 'r', encoding='utf-8') as f:
    html = f.read()
style_block = '''
        /* RESULTS GALLERY */
        .results-section { padding: 80px 20px; background: var(--light-gray); }
        .section-title { font-family: 'Kanit', sans-serif; font-size: 36px; text-align: center; margin-bottom: 40px; font-weight: 700; color: var(--dark); }
        .result-gallery { display: flex; gap: 24px; overflow-x: auto; padding-bottom: 30px; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }
        .result-gallery::-webkit-scrollbar { height: 8px; }
        .result-gallery::-webkit-scrollbar-track { background: var(--border); border-radius: 10px; }
        .result-gallery::-webkit-scrollbar-thumb { background: var(--primary); border-radius: 10px; }
        .result-slide { flex: 0 0 85%; max-width: 600px; scroll-snap-align: center; }
        @media(min-width: 768px) { .result-slide { flex: 0 0 50%; max-width: 500px; } }
        .result-slide img { width: 100%; height: auto; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid var(--border); transition: 0.3s; }
        .result-slide img:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0,0,0,0.15); border-color: var(--primary); }
'''
html = html.replace('/* HEADER */', style_block + '\n        /* HEADER */')
results_section = '''
    <!-- RESULTS SECTION -->
    <section class="results-section" id="results">
        <h2 class="section-title">Quantrex <span style="color:var(--primary)">Outstanding Results</span></h2>
        <div class="result-gallery">
            <div class="result-slide"><img src="assets/images/results/dibyanshu_jee_adv.jpg" alt="Dibyanshu Sahoo JEE Advanced"></div>
            <div class="result-slide"><img src="assets/images/results/dibyanshu_jee_main.jpg" alt="Dibyanshu Sahoo JEE Main"></div>
            <div class="result-slide"><img src="assets/images/results/rakshit_jee_adv.jpg" alt="Rakshit Aryan JEE Advanced"></div>
            <div class="result-slide"><img src="assets/images/results/arkadeep_jee_main.jpg" alt="Arkadeep Jana JEE Main"></div>
            <div class="result-slide"><img src="assets/images/results/yash_pant_jee_main.jpg" alt="Yash Pant JEE Main"></div>
        </div>
    </section>
'''
hero_end = html.find('</section>', html.find('<section class="hero"')) + len('</section>')
html = html[:hero_end] + '\n' + results_section + '\n' + html[hero_end:]
sections_to_remove = ['trusted', 'stats', 'leaderboard', 'social', 'testimonials', 'premium', 'faq', 'how', 'notebook']
for sec in sections_to_remove:
    pattern = r'(<section class="' + sec + r'".*?>.*?</section>)'
    html = re.sub(pattern, '', html, flags=re.DOTALL)
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Done')
