#!/usr/bin/env python3
"""Import MARKS data preserving LaTeX math — chunked per exam for fast loading."""
import json
import re
from pathlib import Path

USB = Path(r"E:\quantrexacademy")
MARKS = USB / "marks_data"
BANKS_DIR = USB / "data" / "banks"
OUT_META = USB / "data.js"


BRAND_RE = re.compile(
    r"getmarks\.app|cdn-assets\.getmarks|cdn-question-pool\.getmarks|"
    r"Scoremarks|Mathongo|Get\s*Marks|MARKS\s*App|MARKS\s*Premium|Powered\s+by\s+MARKS",
    re.I,
)


def sanitize_content(text: str) -> str:
    if not text:
        return ""
    out = BRAND_RE.sub("", str(text))
    out = re.sub(r"<[^>]*(?:watermark|getmarks-brand|marks-app)[^>]*>.*?</[^>]+>", "", out, flags=re.I | re.S)
    out = re.sub(r"<img[^>]+(?:watermark|marks-premium|ic_marks)[^>]*>", "", out, flags=re.I)
    return out.strip()


def append_image_html(text: str, image) -> str:
    if not image:
        return text
    if isinstance(image, dict):
        url = image.get("url") or image.get("src") or ""
    else:
        url = str(image).strip()
    if not url or re.search(r"watermark|marks-premium|ic_marks", url, re.I):
        return text
    if re.search(r"getmarks|marks\.app", url, re.I):
        url = sanitize_content(url)
    if not url:
        return text
    img = f'<span class="qx-img-wrap"><img src="{url}" alt="diagram"></span>'
    return f"{text}<br>{img}" if text else img


def text_field(obj, *keys):
    if not isinstance(obj, dict):
        return str(obj) if obj else ""
    for k in keys:
        v = obj.get(k)
        if isinstance(v, dict):
            t = v.get("text") or v.get("html") or ""
            if t:
                return t
        elif v:
            return str(v)
    return ""


def exam_category(title: str) -> str:
    t = title.lower()
    if any(x in t for x in ("neet", "aiims", "jipmer", "medical")):
        return "Medical"
    if any(x in t for x in ("jee", "bitsat", "comedk", "wbjee", "kcet", "eamcet", "viteee", "met", "nest", "iat", "kvpy", "mht cet")):
        return "Engineering"
    return "Foundation"


def slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "_", str(name)).strip("_").lower()
    return s[:80] or "untitled"


def parse_marks_question(item, qid, subject, chapter, exam_title, category, book_mode=False):
    q_obj = item.get("question") or item.get("title") or {}
    qtext = sanitize_content(text_field(item, "question", "title"))
    if isinstance(q_obj, dict):
        qtext = append_image_html(qtext, q_obj.get("image"))
    opts_raw = item.get("options") or []
    options, answer = [], 0
    for i, o in enumerate(opts_raw):
        if isinstance(o, dict):
            opt_text = sanitize_content(text_field(o, "text") or o.get("label") or "")
            if isinstance(o, dict):
                opt_text = append_image_html(opt_text, o.get("image"))
            options.append(opt_text)
            if o.get("isCorrect"):
                answer = i
        else:
            options.append(str(o))
    sol_obj = item.get("solution") or item.get("explanation") or {}
    sol = sanitize_content(text_field(item, "solution", "explanation"))
    if isinstance(sol_obj, dict):
        sol = append_image_html(sol, sol_obj.get("image"))
    paper_source = None
    if item.get("previousYearPapers"):
        paper_source = item["previousYearPapers"][0].get("title") or None
    elif item.get("yearsAppeared"):
        paper_source = item["yearsAppeared"][0].get("title") or None
    source = exam_title if book_mode else (paper_source or exam_title)
    row = {
        "id": qid,
        "_marksId": item.get("_id"),
        "subject": subject,
        "chapter": chapter,
        "exam": category,
        "examName": exam_title,
        "q": qtext,
        "options": options[:4] if options else ["A", "B", "C", "D"],
        "answer": answer,
        "solution": sol,
        "difficulty": {1: "Easy", 2: "Medium", 3: "Hard"}.get(item.get("level"), "Medium"),
        "source": source or "Quantrex PYQ",
    }
    if book_mode and paper_source:
        row["paperSource"] = paper_source
    return row


def load_questions_from_cpyqb():
    banks = {}
    chapters_map = {}
    qid = 1
    cpyqb = MARKS / "cpyqb" / "exams"
    if not cpyqb.exists():
        return banks, chapters_map, 0

    for exam_dir in sorted(cpyqb.iterdir()):
        if not exam_dir.is_dir():
            continue
        exam_title = exam_dir.name.replace("_", " ")
        category = exam_category(exam_title)
        bank_slug = slugify(exam_title)
        bank_questions = []

        subj_root = exam_dir / "subjects"
        if not subj_root.exists():
            continue
        for subj_dir in sorted(subj_root.iterdir()):
            if not subj_dir.is_dir():
                continue
            subject = subj_dir.name.replace("_", " ")
            chapters_map.setdefault(subject, set())
            ch_root = subj_dir / "chapters"
            if not ch_root.exists():
                continue
            for ch_dir in sorted(ch_root.iterdir()):
                if not ch_dir.is_dir():
                    continue
                chapter = ch_dir.name.replace("_", " ")
                chapters_map[subject].add(chapter)
                qfile = ch_dir / "questions_all.json"
                if not qfile.exists():
                    continue
                try:
                    items = json.loads(qfile.read_text(encoding="utf-8"))
                except Exception:
                    continue
                if not isinstance(items, list):
                    continue
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    bank_questions.append(parse_marks_question(item, qid, subject, chapter, exam_title, category))
                    qid += 1

        if bank_questions:
            banks[bank_slug] = {
                "title": exam_title,
                "category": category,
                "file": f"data/banks/{bank_slug}.json",
                "count": len(bank_questions),
                "questions": bank_questions,
            }
    return banks, chapters_map, qid - 1


def load_dpp_questions(start_id):
    dpps = []
    dpp_questions = []
    dpp_root = MARKS / "dpp"
    if not dpp_root.exists():
        return dpps, dpp_questions, start_id
    qid = start_id
    dpp_id = 1
    for subj_dir in sorted(dpp_root.iterdir()):
        if not subj_dir.is_dir() or subj_dir.name in ("landing.json",):
            continue
        subject = subj_dir.name.replace("_", " ")
        for ch_dir in sorted(subj_dir.iterdir()):
            if not ch_dir.is_dir():
                continue
            for set_dir in sorted(ch_dir.iterdir()):
                quiz_file = set_dir / "quiz.json"
                if not quiz_file.exists():
                    continue
                try:
                    quiz = json.loads(quiz_file.read_text(encoding="utf-8"))
                except Exception:
                    continue
                raw_qs = (quiz.get("data") or {}).get("questions") or []
                if not raw_qs:
                    continue
                question_ids = []
                for item in raw_qs:
                    parsed = parse_marks_question(
                        item, qid, subject, ch_dir.name.replace("_", " "),
                        f"DPP · {set_dir.name.replace('_', ' ')}", "Engineering"
                    )
                    dpp_questions.append(parsed)
                    question_ids.append(qid)
                    qid += 1
                dpps.append({
                    "id": f"dpp_{dpp_id}",
                    "title": f"{subject} — {set_dir.name.replace('_', ' ')}",
                    "date": "Today" if dpp_id == 1 else "",
                    "subject": subject,
                    "chapter": ch_dir.name.replace("_", " "),
                    "questions": question_ids,
                })
                dpp_id += 1
    return dpps, dpp_questions, qid


def load_formulas():
    formulas, fid = [], 1
    fc = MARKS / "formula_cards"
    if not fc.exists():
        return formulas
    for subj_dir in sorted(fc.iterdir()):
        if not subj_dir.is_dir():
            continue
        for ch_dir in sorted(subj_dir.iterdir()):
            if not ch_dir.is_dir() or ch_dir.name == "analysis.json":
                continue
            cards_file = ch_dir / "cards_all.json"
            if cards_file.exists():
                try:
                    data = json.loads(cards_file.read_text(encoding="utf-8"))
                    cards = (data.get("data") or {}).get("cards") or []
                    for card in cards:
                        if not isinstance(card, dict):
                            continue
                        url = card.get("imgUrl") or ""
                        title = card.get("title") or ""
                        formula_html = (
                            f'<img src="{url}" alt="{title}" class="fc-img" loading="lazy">'
                            if url else title
                        )
                        formulas.append({
                            "id": fid,
                            "subject": subj_dir.name.replace("_", " "),
                            "chapter": ch_dir.name.replace("_", " "),
                            "topic": title,
                            "formula": formula_html,
                            "meaning": "",
                        })
                        fid += 1
                    continue
                except Exception:
                    pass
            chfile = ch_dir / "chapter.json"
            if not chfile.exists():
                continue
            try:
                data = json.loads(chfile.read_text(encoding="utf-8"))
            except Exception:
                continue
            d = data.get("data") or data
            cards = d.get("cards") or d.get("formulas") or []
            if isinstance(cards, list):
                for card in cards:
                    if isinstance(card, dict):
                        formulas.append({
                            "id": fid,
                            "subject": subj_dir.name.replace("_", " "),
                            "chapter": ch_dir.name.replace("_", " "),
                            "topic": card.get("title") or card.get("name") or "",
                            "formula": text_field(card, "formula", "content", "text"),
                            "meaning": text_field(card, "description", "meaning"),
                        })
                        fid += 1
    return formulas


def write_bank_files(banks):
    BANKS_DIR.mkdir(parents=True, exist_ok=True)
    index = {}
    for slug, bank in banks.items():
        out = BANKS_DIR / f"{slug}.json"
        payload = {"title": bank["title"], "category": bank["category"], "questions": bank["questions"]}
        out.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        index[slug] = {
            "title": bank["title"],
            "category": bank["category"],
            "file": bank["file"],
            "count": bank["count"],
        }
        del bank["questions"]
    return index


def build_cpyqb_nav(bank_index):
    nav = []
    cpyqb = MARKS / "cpyqb" / "exams"
    if not cpyqb.exists():
        return nav
    for exam_dir in sorted(cpyqb.iterdir()):
        if not exam_dir.is_dir():
            continue
        title = exam_dir.name.replace("_", " ")
        slug = slugify(title)
        if slug not in bank_index or bank_index[slug].get("category") == "DPP":
            continue
        subjects = []
        subj_root = exam_dir / "subjects"
        if not subj_root.exists():
            continue
        for subj_dir in sorted(subj_root.iterdir()):
            if not subj_dir.is_dir():
                continue
            subject = subj_dir.name.replace("_", " ")
            chapters = []
            ch_root = subj_dir / "chapters"
            if ch_root.exists():
                for ch_dir in sorted(ch_root.iterdir()):
                    if not ch_dir.is_dir():
                        continue
                    chapter = ch_dir.name.replace("_", " ")
                    qfile = ch_dir / "questions_all.json"
                    count = 0
                    if qfile.exists():
                        try:
                            items = json.loads(qfile.read_text(encoding="utf-8"))
                            count = len(items) if isinstance(items, list) else 0
                        except Exception:
                            pass
                    if count:
                        ch_entry = {"name": chapter, "count": count}
                        meta_path = USB / "data" / "nav" / "chapter_meta" / slug / subject / f"{slugify(chapter)}.json"
                        if meta_path.exists():
                            try:
                                meta = json.loads(meta_path.read_text(encoding="utf-8"))
                                if meta.get("buckets"):
                                    ch_entry["buckets"] = [{"id": b.get("id"), "title": b["title"], "count": b.get("count", 0), "bucketLevel": b.get("bucketLevel")} for b in meta["buckets"]]
                                if meta.get("topics"):
                                    ch_entry["topics"] = [{"id": t.get("id"), "title": t["title"], "count": t.get("count", 0)} for t in meta["topics"]]
                            except Exception:
                                pass
                        chapters.append(ch_entry)
            if chapters:
                subjects.append({
                    "name": subject,
                    "count": sum(c["count"] for c in chapters),
                    "chapters": chapters,
                })
        if subjects:
            nav.append({
                "slug": slug,
                "title": title,
                "category": bank_index[slug]["category"],
                "count": bank_index[slug]["count"],
                "subjects": subjects,
            })
    return sorted(nav, key=lambda x: -x["count"])


def build_dpp_nav(dpps):
    tree = {}
    for d in dpps:
        subj = d["subject"]
        ch = d["chapter"]
        title = d.get("title", "")
        if "Easy" in title:
            level = "Easy"
        elif "Moderate" in title:
            level = "Moderate"
        elif "Tough" in title:
            level = "Tough"
        else:
            level = "Other"
        tree.setdefault(subj, {}).setdefault(ch, {"Easy": [], "Moderate": [], "Tough": [], "Other": []})
        short = title.split("—")[-1].strip() if "—" in title else title
        tree[subj][ch][level].append({
            "id": d["id"],
            "title": short,
            "fullTitle": title,
            "count": len(d.get("questions") or []),
        })
    result = []
    for subj, chapters in sorted(tree.items()):
        ch_list = []
        for ch, levels in sorted(chapters.items()):
            sets = []
            for level in ("Easy", "Moderate", "Tough", "Other"):
                for s in levels.get(level, []):
                    sets.append({**s, "level": level})
            if sets:
                ch_list.append({"name": ch, "sets": sets, "count": len(sets)})
        if ch_list:
            result.append({
                "name": subj,
                "chapters": ch_list,
                "count": sum(c["count"] for c in ch_list),
            })
    return result


def build_formula_nav():
    fc = MARKS / "formula_cards"
    if not fc.exists():
        return []
    subjects = []
    for subj_dir in sorted(fc.iterdir()):
        if not subj_dir.is_dir():
            continue
        analysis_file = subj_dir / "analysis.json"
        if not analysis_file.exists():
            continue
        try:
            data = json.loads(analysis_file.read_text(encoding="utf-8"))
        except Exception:
            continue
        subj_obj = (data.get("data") or {}).get("subject") or {}
        chapters = []
        for ch in subj_obj.get("chapters") or []:
            if ch.get("title"):
                chapters.append({
                    "name": ch["title"],
                    "count": ch.get("cardsCount", 0),
                    "color": ch.get("color", "#1589EE"),
                })
        if chapters:
            subjects.append({
                "name": subj_dir.name.replace("_", " "),
                "count": subj_obj.get("cardsCount", 0),
                "chapters": chapters,
            })
    return subjects


def write_nav_files(bank_index, dpps):
    nav_dir = USB / "data" / "nav"
    nav_dir.mkdir(parents=True, exist_ok=True)
    cpyqb_nav = build_cpyqb_nav(bank_index)
    (nav_dir / "cpyqb.json").write_text(json.dumps(cpyqb_nav, ensure_ascii=False), encoding="utf-8")
    dpp_nav = build_dpp_nav(dpps)
    (nav_dir / "dpp.json").write_text(json.dumps(dpp_nav, ensure_ascii=False), encoding="utf-8")
    formula_nav = build_formula_nav()
    (nav_dir / "formulas.json").write_text(json.dumps(formula_nav, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote nav: {len(cpyqb_nav)} exams, {len(dpp_nav)} DPP subjects, {len(formula_nav)} formula subjects")


def write_dpp_bank(dpp_questions):
    if not dpp_questions:
        return None
    BANKS_DIR.mkdir(parents=True, exist_ok=True)
    out = BANKS_DIR / "dpp.json"
    payload = {"title": "Daily Practice Problems", "category": "DPP", "questions": dpp_questions}
    out.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return {
        "title": "Daily Practice Problems",
        "category": "DPP",
        "file": "data/banks/dpp.json",
        "count": len(dpp_questions),
    }


def build_data_js(bank_index, chapters_map, formulas, dpps, total_q):
    chapters_js = {subj: sorted(list(chs)) for subj, chs in chapters_map.items()}
    if not chapters_js:
        chapters_js = {
            "Physics": ["Units & Measurements", "Kinematics", "Laws of Motion"],
            "Chemistry": ["Atomic Structure", "Chemical Bonding", "Equilibrium"],
            "Mathematics": ["Algebra", "Trigonometry", "Calculus"],
            "Biology": ["Cell Biology", "Genetics", "Human Physiology"],
        }

    header = f"""// Quantrex Academy — Premium Question Bank ({total_q} questions, LaTeX preserved)
const EXAMS = {{
  Engineering: {{ name: "JEE Main & Advanced", subjects: ["Physics", "Chemistry", "Mathematics"], color: "#1589EE", icon: "⚙️" }},
  Medical:     {{ name: "NEET UG", subjects: ["Physics", "Chemistry", "Biology", "Zoology", "Botany"], color: "#2bc48a", icon: "⚕️" }},
  Foundation:  {{ name: "Class 9 & 10", subjects: ["Science", "Mathematics"], color: "#7c5ce7", icon: "📚" }}
}};

const CHAPTERS = {json.dumps(chapters_js, ensure_ascii=False, indent=2)};

const BOOKS = [];
const PRIMARY_BANK = {{ Engineering: "jee_main", Medical: "neet", Foundation: "nda" }};

const MODULES = [
  {{ id:"allqs", icon:"📋", name:"All Question Bank", desc:"Chapter-wise questions by subject", color:"#dbeafe", target:"allqs" }},
  {{ id:"ncert", icon:"📚", name:"NCERT Qs Bank", desc:"Syllabus-aligned NCERT questions", color:"#eaf4fd", target:"ncert" }},
  {{ id:"cpyqb", icon:"🎯", name:"Chapter-wise PYQ Bank", desc:"Previous year questions by exam", color:"#dbeafe", target:"cpyqb" }},
  {{ id:"dpp", icon:"📝", name:"Solve DPPs", desc:"Daily Practice Problems", color:"#e6f9f0", target:"dpp" }},
  {{ id:"formula", icon:"🧮", name:"Formula Cards", desc:"All formulas in one place", color:"#f3eafe", target:"formula" }},
  {{ id:"tests", icon:"🧪", name:"MARKS Tests", desc:"Mock tests & custom tests", color:"#fef9c3", target:"tests" }},
  {{ id:"quickconcepts", icon:"⚡", name:"Quick Concepts", desc:"Fast revision notes", color:"#fff3cd", target:"quickconcepts" }},
  {{ id:"leaderboard", icon:"🏆", name:"Leaderboard", desc:"Compete & earn leagues", color:"#fee2e2", target:"leaderboard" }},
  {{ id:"notebook", icon:"📓", name:"Notebook", desc:"Saved notes & bookmarks", color:"#e0e7ff", target:"notebook" }}
];

const LEADERBOARD = [
  {{ rank: 1, name: "Aarav Sharma", points: 2840, league: "Legend", avatar: "A", color: "#f59e0b" }},
  {{ rank: 2, name: "Priya Patel", points: 2610, league: "Platinum", avatar: "P", color: "#7c5ce7" }},
  {{ rank: 3, name: "Rohan Verma", points: 2495, league: "Platinum", avatar: "R", color: "#1589EE" }},
  {{ rank: 4, name: "Ananya Singh", points: 2200, league: "Gold", avatar: "A", color: "#2bc48a" }},
  {{ rank: 5, name: "Karthik Rao", points: 1980, league: "Gold", avatar: "K", color: "#ef4444" }},
  {{ rank: 6, name: "Sneha Gupta", points: 1750, league: "Gold", avatar: "S", color: "#f59e0b" }},
  {{ rank: 7, name: "Vikram Nair", points: 1540, league: "Silver", avatar: "V", color: "#7c5ce7" }},
  {{ rank: 8, name: "Diya Mehta", points: 1320, league: "Silver", avatar: "D", color: "#1589EE" }}
];

const BANK_INDEX = {json.dumps(bank_index, ensure_ascii=False, indent=2)};

let QUESTIONS = [];
let _banksLoaded = {{}};
let _dppLoaded = false;
let _currentBankSlug = localStorage.getItem("quantrex_bank") || null;

function getBanksForExam(category) {{
  return Object.entries(BANK_INDEX).filter(([, b]) => b.category === category);
}}

async function loadSingleBank(slug) {{
  if (!slug || !BANK_INDEX[slug]) return [];
  if (_banksLoaded[slug]) {{
    _currentBankSlug = slug;
    localStorage.setItem("quantrex_bank", slug);
    return QUESTIONS.filter(q => q._bank === slug);
  }}
  const meta = BANK_INDEX[slug];
  const res = await fetch(meta.file);
  const data = await res.json();
  const qs = (data.questions || []).map(q => ({{ ...q, _bank: slug }}));
  QUESTIONS = QUESTIONS.filter(q => q._bank !== slug).concat(qs);
  _banksLoaded[slug] = true;
  _currentBankSlug = slug;
  localStorage.setItem("quantrex_bank", slug);
  return qs;
}}

async function loadDppBank() {{
  if (_dppLoaded) return QUESTIONS.filter(q => q._bank === "dpp");
  const res = await fetch("data/banks/dpp.json");
  const data = await res.json();
  const qs = (data.questions || []).map(q => ({{ ...q, _bank: "dpp" }}));
  QUESTIONS = QUESTIONS.filter(q => q._bank !== "dpp").concat(qs);
  _dppLoaded = true;
  return qs;
}}

async function ensureQuestionsLoaded(slug) {{
  const target = slug || _currentBankSlug;
  if (target) return loadSingleBank(target);
  const banks = getBanksForExam(STATE.exam);
  if (banks.length) return loadSingleBank(banks[0][0]);
  return [];
}}

let FORMULAS = [];
let _formulasLoaded = false;
async function loadFormulas() {{
  if (_formulasLoaded) return FORMULAS;
  const res = await fetch("data/formulas.json");
  FORMULAS = await res.json();
  _formulasLoaded = true;
  return FORMULAS;
}}

const DPPS = {json.dumps(dpps, ensure_ascii=False, indent=2)};
"""
    state = """
function _syncDb() {
  try {
    const user = JSON.parse(localStorage.getItem("quantrex_user") || "null");
    if (user && user.uid && typeof QuantrexDB !== "undefined") QuantrexDB.persist(user.uid);
  } catch (e) {}
}
const STATE = {
  get exam() { return localStorage.getItem("quantrex_exam") || "Engineering"; },
  set exam(v) { localStorage.setItem("quantrex_exam", v); _banksLoaded = {}; _currentBankSlug = null; localStorage.removeItem("quantrex_bank"); QUESTIONS = []; _syncDb(); },
  get bookmarks() { return JSON.parse(localStorage.getItem("quantrex_bookmarks") || "[]"); },
  toggleBookmark(id) { const b=this.bookmarks,i=b.indexOf(id); if(i>=0)b.splice(i,1);else b.push(id); localStorage.setItem("quantrex_bookmarks",JSON.stringify(b)); _syncDb(); },
  get solved() { return JSON.parse(localStorage.getItem("quantrex_solved") || "[]"); },
  markSolved(id,correct) { const s=JSON.parse(localStorage.getItem("quantrex_solved")||"[]"); if(!s.find(x=>x.id===id))s.push({id,correct,date:Date.now()}); localStorage.setItem("quantrex_solved",JSON.stringify(s)); _syncDb(); },
  get notes() { return JSON.parse(localStorage.getItem("quantrex_notes") || "[]"); },
  addNote(text) { const n=this.notes; n.unshift({id:Date.now(),text,date:new Date().toLocaleString()}); localStorage.setItem("quantrex_notes",JSON.stringify(n)); _syncDb(); },
  deleteNote(id) { localStorage.setItem("quantrex_notes",JSON.stringify(this.notes.filter(x=>x.id!==id))); _syncDb(); }
};
function getQ(id) { return QUESTIONS.find(q => q.id === id) || null; }
"""
    OUT_META.write_text(header + state, encoding="utf-8")
    print(f"Wrote {OUT_META} + {len(bank_index)} bank files ({total_q} questions)")


def main():
    banks, chapters_map, total = load_questions_from_cpyqb()
    bank_index = write_bank_files(banks) if banks else {}
    formulas = load_formulas()
    dpps, dpp_questions, _ = load_dpp_questions(total + 1)
    dpp_meta = write_dpp_bank(dpp_questions)
    if dpp_meta:
        bank_index["dpp"] = dpp_meta
    if not bank_index and not formulas:
        print("No data yet. Run EXTRACT_MARKS.bat first (takes 1-3 hours).")
        return 1
    write_nav_files(bank_index, dpps)
    build_data_js(bank_index, chapters_map, formulas, dpps, total)
    if formulas:
        (USB / "data" / "formulas.json").write_text(
            json.dumps(formulas, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"Wrote data/formulas.json ({len(formulas)} cards)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())