// Quantrex Academy — Premium Question Bank (120781 questions, LaTeX preserved)
const EXAMS = {
  Engineering: { name: "JEE Main & Advanced", subjects: ["Physics", "Chemistry", "Mathematics"], color: "#0D9488", icon: "⚙️", logo: "https://cdn-assets.getmarks.app/app_assets/img/exams/ic_content_exam_jee_main.png" },
  Medical:     { name: "NEET UG", subjects: ["Physics", "Chemistry", "Biology", "Zoology", "Botany"], color: "#2bc48a", icon: "⚕️", logo: "https://cdn-assets.getmarks.app/app_assets/img/exams/ic_content_exam_neet.png" },
  Foundation:  { name: "Class 9 & 10", subjects: ["Science", "Mathematics"], color: "#7c5ce7", icon: "📚", logo: "https://cdn-assets.getmarks.app/app_assets/img/exams/ic_content_exam_nda.png" }
};

const CHAPTERS = {
  "Botany": [
    "Anatomy of Flowering Plants",
    "Animal Kingdom",
    "Biodiversity and its Conservation",
    "Biological Classification",
    "Biomolecules (B)",
    "Cell - The Unit of Life",
    "Cell Cycle and Cell Division",
    "Ecosystem",
    "Environmental Issues",
    "Mineral Nutrition",
    "Morphology of Flowering Plants",
    "Photosynthesis in Higher Plants",
    "Plant - Growth and Development",
    "Plant Kingdom",
    "Reproduction in Organisms",
    "Respiration in Plants",
    "Sexual Reproduction in Flowering Plants",
    "The Living World",
    "Transport in Plants"
  ],
  "Chemistry": [
    "Alcohols Phenols and Ethers",
    "Aldehydes and Ketones",
    "Amines",
    "Biomolecules",
    "Carboxylic Acid Derivatives",
    "Chemical Bonding and Molecular Structure",
    "Chemical Equilibrium",
    "Chemical Kinetics",
    "Chemistry in Everyday Life",
    "Classification of Elements and Periodicity in Properties",
    "Coordination Compounds",
    "Electrochemistry",
    "Environmental Chemistry",
    "General Organic Chemistry",
    "General Principles and Processes of Isolation of Metals",
    "Haloalkanes and Haloarenes",
    "Hydrocarbons",
    "Hydrogen",
    "Ionic Equilibrium",
    "Polymers",
    "Practical Chemistry",
    "Redox Reactions",
    "Solid State",
    "Solutions",
    "Some Basic Concepts of Chemistry",
    "States of Matter",
    "Structure of Atom",
    "Surface Chemistry",
    "Thermodynamics (C)",
    "d and f Block Elements",
    "p Block Elements (Group 13 & 14)",
    "p Block Elements (Group 15, 16, 17 & 18)",
    "s Block Elements"
  ],
  "Physics": [
    "Alternating Current",
    "Atomic Physics",
    "Capacitance",
    "Center of Mass Momentum and Collision",
    "Communication System",
    "Current Electricity",
    "Dual Nature of Matter",
    "Electromagnetic Induction",
    "Electromagnetic Waves",
    "Electrostatics",
    "Experimental Physics",
    "Gravitation",
    "Kinetic Theory of Gases",
    "Laws of Motion",
    "Magnetic Effects of Current",
    "Magnetic Properties of Matter",
    "Mathematics in Physics",
    "Mechanical Properties of Fluids",
    "Mechanical Properties of Solids",
    "Motion In One Dimension",
    "Motion In Two Dimensions",
    "Nuclear Physics",
    "Oscillations",
    "Ray Optics",
    "Rotational Motion",
    "Semiconductors",
    "Thermal Properties of Matter",
    "Thermodynamics",
    "Units and Dimensions",
    "Wave Optics",
    "Waves and Sound",
    "Work Power Energy"
  ],
  "Zoology": [
    "Biotechnology - Principles and Processes",
    "Biotechnology and Its Applications",
    "Body Fluids and Circulation",
    "Breathing and Exchange of Gases",
    "Chemical Coordination and Integration",
    "Digestion and Absorption",
    "Evolution",
    "Excretory Products and their Elimination",
    "Human Health and Diseases",
    "Human Reproduction",
    "Locomotion and Movement",
    "Microbes in Human Welfare",
    "Molecular Basis of Inheritance",
    "Neural Control and Coordination",
    "Organisms and Populations",
    "Principles of Inheritance and Variation",
    "Reproductive Health",
    "Strategies for Enhancement in Food Production",
    "Structural Organisation in Animals"
  ],
  "Mathematics": [
    "Application of Derivatives",
    "Area Under Curves",
    "Basic of Mathematics",
    "Binary Numbers",
    "Binomial Theorem",
    "Circle",
    "Complex Number",
    "Continuity and Differentiability",
    "Definite Integration",
    "Determinants",
    "Differential Equations",
    "Differentiation",
    "Ellipse",
    "Functions",
    "Heights and Distances",
    "Hyperbola",
    "Indefinite Integration",
    "Inverse Trigonometric Functions",
    "Limits",
    "Linear Programming",
    "Mathematical Induction",
    "Mathematical Reasoning",
    "Matrices",
    "Pair of Lines",
    "Parabola",
    "Permutation Combination",
    "Probability",
    "Properties of Triangles",
    "Quadratic Equation",
    "Sequences and Series",
    "Sets and Relations",
    "Statistics",
    "Straight Lines",
    "Three Dimensional Geometry",
    "Trigonometric Equations",
    "Trigonometric Ratios & Identities",
    "Vector Algebra"
  ],
  "Biology": [
    "Anatomy of Flowering Plants",
    "Animal Kingdom",
    "Biodiversity and its Conservation",
    "Biological Classification",
    "Biomolecules (B)",
    "Biotechnology - Principles and Processes",
    "Biotechnology and Its Applications",
    "Body Fluids and Circulation",
    "Breathing and Exchange of Gases",
    "Cell - The Unit of Life",
    "Cell Cycle and Cell Division",
    "Chemical Coordination and Integration",
    "Digestion and Absorption",
    "Ecosystem",
    "Environmental Issues",
    "Evolution",
    "Excretory Products and their Elimination",
    "Human Health and Diseases",
    "Human Reproduction",
    "Locomotion and Movement",
    "Microbes in Human Welfare",
    "Mineral Nutrition",
    "Molecular Basis of Inheritance",
    "Morphology of Flowering Plants",
    "Neural Control and Coordination",
    "Organisms and Populations",
    "Photosynthesis in Higher Plants",
    "Plant - Growth and Development",
    "Plant Kingdom",
    "Principles of Inheritance and Variation",
    "Reproduction in Organisms",
    "Reproductive Health",
    "Respiration in Plants",
    "Sexual Reproduction in Flowering Plants",
    "Strategies for Enhancement in Food Production",
    "Structural Organisation in Animals",
    "The Living World",
    "Transport in Plants"
  ],
  "General Ability": [
    "English",
    "General Science",
    "General Studies"
  ]
};

const BOOKS = [];
const PRIMARY_BANK = { Engineering: "jee_main", Medical: "neet", Foundation: "nda" };

/** MARKS web chapter-wise PYQ order (screenshot 417) */
const CPYQB_EXAM_ORDER = {
  Engineering: [
    "jee_main", "jee_advanced", "nta_abhyas_jee_main", "mht_cet", "comedk", "bitsat", "wbjee",
    "kcet", "ap_eamcet", "ts_eamcet", "viteee", "manipal_met", "iat_iiser", "nest_niser", "kvpy", "nda"
  ],
  Medical: ["neet", "aiims", "nta_abhyas_neet", "jipmer", "mht_cet_medical"]
};

const CPYQB_YEAR_RANGE = {
  jee_main: "2026 - 2012", jee_advanced: "2026 - 2006", nta_abhyas_jee_main: "2020",
  mht_cet: "2026 - 2012", comedk: "2026 - 2012", bitsat: "2024 - 2009", wbjee: "2026 - 2012",
  kcet: "2026 - 2012", ap_eamcet: "2025 - 2012", ts_eamcet: "2025 - 2012", viteee: "2024 - 2006",
  manipal_met: "2024 - 2010", iat_iiser: "2026 - 2012", nest_niser: "2026 - 2012", kvpy: "2020 - 2010",
  nda: "2026 - 2012", neet: "2026 - 2012", aiims: "2019 - 2001", nta_abhyas_neet: "2020",
  jipmer: "2019 - 2004", mht_cet_medical: "2026"
};

function sortCpyqbExams(exams, category) {
  const order = (typeof CPYQB_EXAM_ORDER !== "undefined" && CPYQB_EXAM_ORDER[category]) || [];
  const rank = new Map(order.map((s, i) => [s, i]));
  return [...(exams || [])].sort((a, b) => {
    const ra = rank.has(a.slug) ? rank.get(a.slug) : 999;
    const rb = rank.has(b.slug) ? rank.get(b.slug) : 999;
    if (ra !== rb) return ra - rb;
    return (a.title || "").localeCompare(b.title || "");
  });
}

function cpyqbExamYearLabel(slug) {
  if (typeof CPYQB_YEAR_RANGE !== "undefined" && CPYQB_YEAR_RANGE[slug]) return CPYQB_YEAR_RANGE[slug];
  return "";
}

const ALLQS_BANKS = {
  Medical: CPYQB_EXAM_ORDER.Medical,
  Engineering: CPYQB_EXAM_ORDER.Engineering,
  Foundation: ["nda"]
};

const MODULES = [
  { id:"allqs", icon:"📋", name:"All Question Bank", desc:"Chapter-wise questions by subject", color:"#dbeafe", target:"allqs" },
  { id:"ncert", icon:"📚", name:"NCERT Qs Bank", desc:"Syllabus-aligned NCERT questions", color:"#eaf4fd", target:"ncert" },
  { id:"books", icon:"📖", name:"Digital Books", desc:"Expert PYQ books & curated sets", color:"#fce7f3", target:"books" },
  { id:"cpyqb", icon:"🎯", name:"Chapter-wise PYQ Bank", desc:"Previous year questions by exam", color:"#dbeafe", target:"cpyqb" },
  { id:"dpp", icon:"📝", name:"Solve DPPs", desc:"Daily Practice Problems", color:"#e6f9f0", target:"dpp" },
  { id:"formula", icon:"🧮", name:"Formula Cards", desc:"All formulas in one place", color:"#f3eafe", target:"formula" },
  { id:"tests", icon:"🧪", name:"Assessment Center", desc:"Mocks, chapter tests & custom", color:"#fef9c3", target:"tests" },
  { id:"quickconcepts", icon:"⚡", name:"Quick Concepts", desc:"Fast revision notes", color:"#fff3cd", target:"quickconcepts" },
  { id:"leaderboard", icon:"🏆", name:"Leaderboard", desc:"Live rankings · compete & earn leagues", color:"#fee2e2", target:"leaderboard" },
  { id:"notebook", icon:"📓", name:"Notebook", desc:"Saved notes & bookmarks (cloud sync)", color:"#e0e7ff", target:"notebook" }
];

const LEADERBOARD = [
  { rank: 1, name: "Aarav Sharma", points: 2840, league: "Legend", avatar: "A", color: "#f59e0b" },
  { rank: 2, name: "Priya Patel", points: 2610, league: "Platinum", avatar: "P", color: "#7c5ce7" },
  { rank: 3, name: "Rohan Verma", points: 2495, league: "Platinum", avatar: "R", color: "#0D9488" },
  { rank: 4, name: "Ananya Singh", points: 2200, league: "Gold", avatar: "A", color: "#2bc48a" },
  { rank: 5, name: "Karthik Rao", points: 1980, league: "Gold", avatar: "K", color: "#ef4444" },
  { rank: 6, name: "Sneha Gupta", points: 1750, league: "Gold", avatar: "S", color: "#f59e0b" },
  { rank: 7, name: "Vikram Nair", points: 1540, league: "Silver", avatar: "V", color: "#7c5ce7" },
  { rank: 8, name: "Diya Mehta", points: 1320, league: "Silver", avatar: "D", color: "#6366F1" }
];

const BANK_INDEX = {
  "aiims": {
    "title": "AIIMS",
    "category": "Medical",
    "file": "data/banks/aiims.json",
    "count": 2286
  },
  "ap_eamcet": {
    "title": "AP EAMCET",
    "category": "Engineering",
    "file": "data/banks/ap_eamcet.json",
    "count": 14960
  },
  "bitsat": {
    "title": "BITSAT",
    "category": "Engineering",
    "file": "data/banks/bitsat.json",
    "count": 2225
  },
  "comedk": {
    "title": "COMEDK",
    "category": "Engineering",
    "file": "data/banks/comedk.json",
    "count": 4320
  },
  "iat_iiser": {
    "title": "IAT (IISER)",
    "category": "Engineering",
    "file": "data/banks/iat_iiser.json",
    "count": 600
  },
  "jee_advanced": {
    "title": "JEE Advanced",
    "category": "Engineering",
    "file": "data/banks/jee_advanced.json",
    "count": 2418
  },
  "jee_main": {
    "title": "JEE Main",
    "category": "Engineering",
    "file": "data/banks/jee_main.json",
    "count": 17925
  },
  "jipmer": {
    "title": "JIPMER",
    "category": "Medical",
    "file": "data/banks/jipmer.json",
    "count": 2510
  },
  "kcet": {
    "title": "KCET",
    "category": "Engineering",
    "file": "data/banks/kcet.json",
    "count": 3660
  },
  "kvpy": {
    "title": "KVPY",
    "category": "Engineering",
    "file": "data/banks/kvpy.json",
    "count": 1685
  },
  "manipal_met": {
    "title": "Manipal (MET)",
    "category": "Engineering",
    "file": "data/banks/manipal_met.json",
    "count": 2242
  },
  "mht_cet": {
    "title": "MHT CET",
    "category": "Engineering",
    "file": "data/banks/mht_cet.json",
    "count": 16050
  },
  "mht_cet_medical": {
    "title": "MHT CET - Medical",
    "category": "Medical",
    "file": "data/banks/mht_cet_medical.json",
    "count": 1632
  },
  "nda": {
    "title": "NDA",
    "category": "Foundation",
    "file": "data/banks/nda.json",
    "count": 6821
  },
  "neet": {
    "title": "NEET",
    "category": "Medical",
    "file": "data/banks/neet.json",
    "count": 6232
  },
  "nest_niser": {
    "title": "NEST (NISER)",
    "category": "Engineering",
    "file": "data/banks/nest_niser.json",
    "count": 1434
  },
  "nta_abhyas_jee_main": {
    "title": "NTA Abhyas (JEE Main)",
    "category": "Engineering",
    "file": "data/banks/nta_abhyas_jee_main.json",
    "count": 8175
  },
  "nta_abhyas_neet": {
    "title": "NTA Abhyas (NEET)",
    "category": "Medical",
    "file": "data/banks/nta_abhyas_neet.json",
    "count": 12328
  },
  "ts_eamcet": {
    "title": "TS EAMCET",
    "category": "Engineering",
    "file": "data/banks/ts_eamcet.json",
    "count": 8327
  },
  "viteee": {
    "title": "VITEEE",
    "category": "Engineering",
    "file": "data/banks/viteee.json",
    "count": 2046
  },
  "wbjee": {
    "title": "WBJEE",
    "category": "Engineering",
    "file": "data/banks/wbjee.json",
    "count": 2905
  },
  "dpp": {
    "title": "Daily Practice Problems",
    "category": "DPP",
    "file": "data/banks/dpp.json",
    "count": 7040
  }
};

let QUESTIONS = [];
let _banksLoaded = {};
let _dppLoaded = false;
let _currentBankSlug = localStorage.getItem("quantrex_bank") || null;

function getBanksForExam(category) {
  return Object.entries(BANK_INDEX).filter(([, b]) => b.category === category);
}

async function loadMultipleBanks(slugs) {
  const list = [...new Set((slugs || []).filter(s => BANK_INDEX[s]))];
  for (const slug of list) await loadSingleBank(slug);
  return QUESTIONS.filter(q => list.includes(q._bank));
}

function banksForAllQs() {
  return ALLQS_BANKS[STATE.exam] || ALLQS_BANKS.Engineering;
}

async function loadSingleBank(slug) {
  if (!slug || !BANK_INDEX[slug]) return [];
  if (_banksLoaded[slug]) {
    _currentBankSlug = slug;
    localStorage.setItem("quantrex_bank", slug);
    return QUESTIONS.filter(q => q._bank === slug);
  }
  const meta = BANK_INDEX[slug];
  const res = await fetch(meta.file);
  const data = await res.json();
  const qs = (data.questions || []).map(q => ({ ...q, _bank: slug }));
  QUESTIONS = QUESTIONS.filter(q => q._bank !== slug).concat(qs);
  _banksLoaded[slug] = true;
  _currentBankSlug = slug;
  localStorage.setItem("quantrex_bank", slug);
  return qs;
}

async function loadDppBank() {
  if (_dppLoaded) return QUESTIONS.filter(q => q._bank === "dpp");
  const res = await fetch("data/banks/dpp.json");
  const data = await res.json();
  const qs = (data.questions || []).map(q => ({ ...q, _bank: "dpp" }));
  QUESTIONS = QUESTIONS.filter(q => q._bank !== "dpp").concat(qs);
  _dppLoaded = true;
  return qs;
}

async function ensureQuestionsLoaded(slug) {
  const target = slug || _currentBankSlug;
  if (target) return loadSingleBank(target);
  const banks = getBanksForExam(STATE.exam);
  if (banks.length) return loadSingleBank(banks[0][0]);
  return [];
}

let FORMULAS = [];
let _formulasLoaded = false;
async function loadFormulas() {
  if (_formulasLoaded) return FORMULAS;
  const res = await fetch("data/formulas.json");
  FORMULAS = await res.json();
  _formulasLoaded = true;
  return FORMULAS;
}

const DPPS = [
  {
    "id": "dpp_1",
    "title": "Chemistry — Easy DPP 1",
    "date": "Today",
    "subject": "Chemistry",
    "chapter": "Alcohols Phenols and Ethers",
    "questions": [
      120782,
      120783,
      120784,
      120785,
      120786,
      120787,
      120788,
      120789,
      120790,
      120791
    ]
  },
  {
    "id": "dpp_2",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Alcohols Phenols and Ethers",
    "questions": [
      120792,
      120793,
      120794,
      120795,
      120796,
      120797,
      120798,
      120799,
      120800,
      120801
    ]
  },
  {
    "id": "dpp_3",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Alcohols Phenols and Ethers",
    "questions": [
      120802,
      120803,
      120804,
      120805,
      120806,
      120807,
      120808,
      120809,
      120810,
      120811
    ]
  },
  {
    "id": "dpp_4",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Alcohols Phenols and Ethers",
    "questions": [
      120812,
      120813,
      120814,
      120815,
      120816,
      120817,
      120818,
      120819,
      120820,
      120821
    ]
  },
  {
    "id": "dpp_5",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Alcohols Phenols and Ethers",
    "questions": [
      120822,
      120823,
      120824,
      120825,
      120826,
      120827,
      120828,
      120829,
      120830,
      120831
    ]
  },
  {
    "id": "dpp_6",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Alcohols Phenols and Ethers",
    "questions": [
      120832,
      120833,
      120834,
      120835,
      120836,
      120837,
      120838,
      120839,
      120840,
      120841
    ]
  },
  {
    "id": "dpp_7",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Alcohols Phenols and Ethers",
    "questions": [
      120842,
      120843,
      120844,
      120845,
      120846,
      120847,
      120848,
      120849,
      120850,
      120851
    ]
  },
  {
    "id": "dpp_8",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Alcohols Phenols and Ethers",
    "questions": [
      120852,
      120853,
      120854,
      120855,
      120856,
      120857,
      120858,
      120859,
      120860,
      120861
    ]
  },
  {
    "id": "dpp_9",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Alcohols Phenols and Ethers",
    "questions": [
      120862,
      120863,
      120864,
      120865,
      120866,
      120867,
      120868,
      120869,
      120870,
      120871
    ]
  },
  {
    "id": "dpp_10",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Aldehydes and Ketones",
    "questions": [
      120872,
      120873,
      120874,
      120875,
      120876,
      120877,
      120878,
      120879,
      120880,
      120881
    ]
  },
  {
    "id": "dpp_11",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Aldehydes and Ketones",
    "questions": [
      120882,
      120883,
      120884,
      120885,
      120886,
      120887,
      120888,
      120889,
      120890,
      120891
    ]
  },
  {
    "id": "dpp_12",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Aldehydes and Ketones",
    "questions": [
      120892,
      120893,
      120894,
      120895,
      120896,
      120897,
      120898,
      120899,
      120900,
      120901
    ]
  },
  {
    "id": "dpp_13",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Aldehydes and Ketones",
    "questions": [
      120902,
      120903,
      120904,
      120905,
      120906,
      120907,
      120908,
      120909,
      120910,
      120911
    ]
  },
  {
    "id": "dpp_14",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Aldehydes and Ketones",
    "questions": [
      120912,
      120913,
      120914,
      120915,
      120916,
      120917,
      120918,
      120919,
      120920,
      120921
    ]
  },
  {
    "id": "dpp_15",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Aldehydes and Ketones",
    "questions": [
      120922,
      120923,
      120924,
      120925,
      120926,
      120927,
      120928,
      120929,
      120930,
      120931
    ]
  },
  {
    "id": "dpp_16",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Aldehydes and Ketones",
    "questions": [
      120932,
      120933,
      120934,
      120935,
      120936,
      120937,
      120938,
      120939,
      120940,
      120941
    ]
  },
  {
    "id": "dpp_17",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Aldehydes and Ketones",
    "questions": [
      120942,
      120943,
      120944,
      120945,
      120946,
      120947,
      120948,
      120949,
      120950,
      120951
    ]
  },
  {
    "id": "dpp_18",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Aldehydes and Ketones",
    "questions": [
      120952,
      120953,
      120954,
      120955,
      120956,
      120957,
      120958,
      120959,
      120960,
      120961
    ]
  },
  {
    "id": "dpp_19",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Amines",
    "questions": [
      120962,
      120963,
      120964,
      120965,
      120966,
      120967,
      120968,
      120969,
      120970,
      120971
    ]
  },
  {
    "id": "dpp_20",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Amines",
    "questions": [
      120972,
      120973,
      120974,
      120975,
      120976,
      120977,
      120978,
      120979,
      120980,
      120981
    ]
  },
  {
    "id": "dpp_21",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Amines",
    "questions": [
      120982,
      120983,
      120984,
      120985,
      120986,
      120987,
      120988,
      120989,
      120990,
      120991
    ]
  },
  {
    "id": "dpp_22",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Amines",
    "questions": [
      120992,
      120993,
      120994,
      120995,
      120996,
      120997,
      120998,
      120999,
      121000,
      121001
    ]
  },
  {
    "id": "dpp_23",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Amines",
    "questions": [
      121002,
      121003,
      121004,
      121005,
      121006,
      121007,
      121008,
      121009,
      121010,
      121011
    ]
  },
  {
    "id": "dpp_24",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Amines",
    "questions": [
      121012,
      121013,
      121014,
      121015,
      121016,
      121017,
      121018,
      121019,
      121020,
      121021
    ]
  },
  {
    "id": "dpp_25",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Amines",
    "questions": [
      121022,
      121023,
      121024,
      121025,
      121026,
      121027,
      121028,
      121029,
      121030,
      121031
    ]
  },
  {
    "id": "dpp_26",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Amines",
    "questions": [
      121032,
      121033,
      121034,
      121035,
      121036,
      121037,
      121038,
      121039,
      121040,
      121041
    ]
  },
  {
    "id": "dpp_27",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Amines",
    "questions": [
      121042,
      121043,
      121044,
      121045,
      121046,
      121047,
      121048,
      121049,
      121050,
      121051
    ]
  },
  {
    "id": "dpp_28",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Biomolecules",
    "questions": [
      121052,
      121053,
      121054,
      121055,
      121056,
      121057,
      121058,
      121059,
      121060,
      121061
    ]
  },
  {
    "id": "dpp_29",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Biomolecules",
    "questions": [
      121062,
      121063,
      121064,
      121065,
      121066,
      121067,
      121068,
      121069,
      121070,
      121071
    ]
  },
  {
    "id": "dpp_30",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Biomolecules",
    "questions": [
      121072,
      121073,
      121074,
      121075,
      121076,
      121077,
      121078,
      121079,
      121080,
      121081
    ]
  },
  {
    "id": "dpp_31",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Biomolecules",
    "questions": [
      121082,
      121083,
      121084,
      121085,
      121086,
      121087,
      121088,
      121089,
      121090,
      121091
    ]
  },
  {
    "id": "dpp_32",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Biomolecules",
    "questions": [
      121092,
      121093,
      121094,
      121095,
      121096,
      121097,
      121098,
      121099,
      121100,
      121101
    ]
  },
  {
    "id": "dpp_33",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Biomolecules",
    "questions": [
      121102,
      121103,
      121104,
      121105,
      121106,
      121107,
      121108,
      121109,
      121110,
      121111
    ]
  },
  {
    "id": "dpp_34",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Biomolecules",
    "questions": [
      121112,
      121113,
      121114,
      121115,
      121116,
      121117,
      121118,
      121119,
      121120,
      121121
    ]
  },
  {
    "id": "dpp_35",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Biomolecules",
    "questions": [
      121122,
      121123,
      121124,
      121125,
      121126,
      121127,
      121128,
      121129,
      121130,
      121131
    ]
  },
  {
    "id": "dpp_36",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Biomolecules",
    "questions": [
      121132,
      121133,
      121134,
      121135,
      121136,
      121137,
      121138,
      121139,
      121140,
      121141
    ]
  },
  {
    "id": "dpp_37",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Carboxylic Acid Derivatives",
    "questions": [
      121142,
      121143,
      121144,
      121145,
      121146,
      121147,
      121148,
      121149,
      121150,
      121151
    ]
  },
  {
    "id": "dpp_38",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Carboxylic Acid Derivatives",
    "questions": [
      121152,
      121153,
      121154,
      121155,
      121156,
      121157,
      121158,
      121159,
      121160,
      121161
    ]
  },
  {
    "id": "dpp_39",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Carboxylic Acid Derivatives",
    "questions": [
      121162,
      121163,
      121164,
      121165,
      121166,
      121167,
      121168,
      121169,
      121170,
      121171
    ]
  },
  {
    "id": "dpp_40",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Carboxylic Acid Derivatives",
    "questions": [
      121172,
      121173,
      121174,
      121175,
      121176,
      121177,
      121178,
      121179,
      121180,
      121181
    ]
  },
  {
    "id": "dpp_41",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Carboxylic Acid Derivatives",
    "questions": [
      121182,
      121183,
      121184,
      121185,
      121186,
      121187,
      121188,
      121189,
      121190,
      121191
    ]
  },
  {
    "id": "dpp_42",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Carboxylic Acid Derivatives",
    "questions": [
      121192,
      121193,
      121194,
      121195,
      121196,
      121197,
      121198,
      121199,
      121200,
      121201
    ]
  },
  {
    "id": "dpp_43",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Carboxylic Acid Derivatives",
    "questions": [
      121202,
      121203,
      121204,
      121205,
      121206,
      121207,
      121208,
      121209,
      121210,
      121211
    ]
  },
  {
    "id": "dpp_44",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Carboxylic Acid Derivatives",
    "questions": [
      121212,
      121213,
      121214,
      121215,
      121216,
      121217,
      121218,
      121219,
      121220,
      121221
    ]
  },
  {
    "id": "dpp_45",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Carboxylic Acid Derivatives",
    "questions": [
      121222,
      121223,
      121224,
      121225,
      121226,
      121227,
      121228,
      121229,
      121230,
      121231
    ]
  },
  {
    "id": "dpp_46",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Bonding and Molecular Structure",
    "questions": [
      121232,
      121233,
      121234,
      121235,
      121236,
      121237,
      121238,
      121239,
      121240,
      121241
    ]
  },
  {
    "id": "dpp_47",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Bonding and Molecular Structure",
    "questions": [
      121242,
      121243,
      121244,
      121245,
      121246,
      121247,
      121248,
      121249,
      121250,
      121251
    ]
  },
  {
    "id": "dpp_48",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Bonding and Molecular Structure",
    "questions": [
      121252,
      121253,
      121254,
      121255,
      121256,
      121257,
      121258,
      121259,
      121260,
      121261
    ]
  },
  {
    "id": "dpp_49",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Bonding and Molecular Structure",
    "questions": [
      121262,
      121263,
      121264,
      121265,
      121266,
      121267,
      121268,
      121269,
      121270,
      121271
    ]
  },
  {
    "id": "dpp_50",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Bonding and Molecular Structure",
    "questions": [
      121272,
      121273,
      121274,
      121275,
      121276,
      121277,
      121278,
      121279,
      121280,
      121281
    ]
  },
  {
    "id": "dpp_51",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Bonding and Molecular Structure",
    "questions": [
      121282,
      121283,
      121284,
      121285,
      121286,
      121287,
      121288,
      121289,
      121290,
      121291
    ]
  },
  {
    "id": "dpp_52",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Bonding and Molecular Structure",
    "questions": [
      121292,
      121293,
      121294,
      121295,
      121296,
      121297,
      121298,
      121299,
      121300,
      121301
    ]
  },
  {
    "id": "dpp_53",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Bonding and Molecular Structure",
    "questions": [
      121302,
      121303,
      121304,
      121305,
      121306,
      121307,
      121308,
      121309,
      121310,
      121311
    ]
  },
  {
    "id": "dpp_54",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Bonding and Molecular Structure",
    "questions": [
      121312,
      121313,
      121314,
      121315,
      121316,
      121317,
      121318,
      121319,
      121320,
      121321
    ]
  },
  {
    "id": "dpp_55",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Equilibrium",
    "questions": [
      121322,
      121323,
      121324,
      121325,
      121326,
      121327,
      121328,
      121329,
      121330,
      121331
    ]
  },
  {
    "id": "dpp_56",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Equilibrium",
    "questions": [
      121332,
      121333,
      121334,
      121335,
      121336,
      121337,
      121338,
      121339,
      121340,
      121341
    ]
  },
  {
    "id": "dpp_57",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Equilibrium",
    "questions": [
      121342,
      121343,
      121344,
      121345,
      121346,
      121347,
      121348,
      121349,
      121350,
      121351
    ]
  },
  {
    "id": "dpp_58",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Equilibrium",
    "questions": [
      121352,
      121353,
      121354,
      121355,
      121356,
      121357,
      121358,
      121359,
      121360,
      121361
    ]
  },
  {
    "id": "dpp_59",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Equilibrium",
    "questions": [
      121362,
      121363,
      121364,
      121365,
      121366,
      121367,
      121368,
      121369,
      121370,
      121371
    ]
  },
  {
    "id": "dpp_60",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Equilibrium",
    "questions": [
      121372,
      121373,
      121374,
      121375,
      121376,
      121377,
      121378,
      121379,
      121380,
      121381
    ]
  },
  {
    "id": "dpp_61",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Equilibrium",
    "questions": [
      121382,
      121383,
      121384,
      121385,
      121386,
      121387,
      121388,
      121389,
      121390,
      121391
    ]
  },
  {
    "id": "dpp_62",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Equilibrium",
    "questions": [
      121392,
      121393,
      121394,
      121395,
      121396,
      121397,
      121398,
      121399,
      121400,
      121401
    ]
  },
  {
    "id": "dpp_63",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Equilibrium",
    "questions": [
      121402,
      121403,
      121404,
      121405,
      121406,
      121407,
      121408,
      121409,
      121410,
      121411
    ]
  },
  {
    "id": "dpp_64",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Kinetics",
    "questions": [
      121412,
      121413,
      121414,
      121415,
      121416,
      121417,
      121418,
      121419,
      121420,
      121421
    ]
  },
  {
    "id": "dpp_65",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Kinetics",
    "questions": [
      121422,
      121423,
      121424,
      121425,
      121426,
      121427,
      121428,
      121429,
      121430,
      121431
    ]
  },
  {
    "id": "dpp_66",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Kinetics",
    "questions": [
      121432,
      121433,
      121434,
      121435,
      121436,
      121437,
      121438,
      121439,
      121440,
      121441
    ]
  },
  {
    "id": "dpp_67",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Kinetics",
    "questions": [
      121442,
      121443,
      121444,
      121445,
      121446,
      121447,
      121448,
      121449,
      121450,
      121451
    ]
  },
  {
    "id": "dpp_68",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Kinetics",
    "questions": [
      121452,
      121453,
      121454,
      121455,
      121456,
      121457,
      121458,
      121459,
      121460,
      121461
    ]
  },
  {
    "id": "dpp_69",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Kinetics",
    "questions": [
      121462,
      121463,
      121464,
      121465,
      121466,
      121467,
      121468,
      121469,
      121470,
      121471
    ]
  },
  {
    "id": "dpp_70",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Kinetics",
    "questions": [
      121472,
      121473,
      121474,
      121475,
      121476,
      121477,
      121478,
      121479,
      121480,
      121481
    ]
  },
  {
    "id": "dpp_71",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Kinetics",
    "questions": [
      121482,
      121483,
      121484,
      121485,
      121486,
      121487,
      121488,
      121489,
      121490,
      121491
    ]
  },
  {
    "id": "dpp_72",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Chemical Kinetics",
    "questions": [
      121492,
      121493,
      121494,
      121495,
      121496,
      121497,
      121498,
      121499,
      121500,
      121501
    ]
  },
  {
    "id": "dpp_73",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Classification of Elements and Periodicity in Properties",
    "questions": [
      121502,
      121503,
      121504,
      121505,
      121506,
      121507,
      121508,
      121509,
      121510,
      121511
    ]
  },
  {
    "id": "dpp_74",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Classification of Elements and Periodicity in Properties",
    "questions": [
      121512,
      121513,
      121514,
      121515,
      121516,
      121517,
      121518,
      121519,
      121520,
      121521
    ]
  },
  {
    "id": "dpp_75",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Classification of Elements and Periodicity in Properties",
    "questions": [
      121522,
      121523,
      121524,
      121525,
      121526,
      121527,
      121528,
      121529,
      121530,
      121531
    ]
  },
  {
    "id": "dpp_76",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Classification of Elements and Periodicity in Properties",
    "questions": [
      121532,
      121533,
      121534,
      121535,
      121536,
      121537,
      121538,
      121539,
      121540,
      121541
    ]
  },
  {
    "id": "dpp_77",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Classification of Elements and Periodicity in Properties",
    "questions": [
      121542,
      121543,
      121544,
      121545,
      121546,
      121547,
      121548,
      121549,
      121550,
      121551
    ]
  },
  {
    "id": "dpp_78",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Classification of Elements and Periodicity in Properties",
    "questions": [
      121552,
      121553,
      121554,
      121555,
      121556,
      121557,
      121558,
      121559,
      121560,
      121561
    ]
  },
  {
    "id": "dpp_79",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Classification of Elements and Periodicity in Properties",
    "questions": [
      121562,
      121563,
      121564,
      121565,
      121566,
      121567,
      121568,
      121569,
      121570,
      121571
    ]
  },
  {
    "id": "dpp_80",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Coordination Compounds",
    "questions": [
      121572,
      121573,
      121574,
      121575,
      121576,
      121577,
      121578,
      121579,
      121580,
      121581
    ]
  },
  {
    "id": "dpp_81",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Coordination Compounds",
    "questions": [
      121582,
      121583,
      121584,
      121585,
      121586,
      121587,
      121588,
      121589,
      121590,
      121591
    ]
  },
  {
    "id": "dpp_82",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Coordination Compounds",
    "questions": [
      121592,
      121593,
      121594,
      121595,
      121596,
      121597,
      121598,
      121599,
      121600,
      121601
    ]
  },
  {
    "id": "dpp_83",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Coordination Compounds",
    "questions": [
      121602,
      121603,
      121604,
      121605,
      121606,
      121607,
      121608,
      121609,
      121610,
      121611
    ]
  },
  {
    "id": "dpp_84",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Coordination Compounds",
    "questions": [
      121612,
      121613,
      121614,
      121615,
      121616,
      121617,
      121618,
      121619,
      121620,
      121621
    ]
  },
  {
    "id": "dpp_85",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Coordination Compounds",
    "questions": [
      121622,
      121623,
      121624,
      121625,
      121626,
      121627,
      121628,
      121629,
      121630,
      121631
    ]
  },
  {
    "id": "dpp_86",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Coordination Compounds",
    "questions": [
      121632,
      121633,
      121634,
      121635,
      121636,
      121637,
      121638,
      121639,
      121640,
      121641
    ]
  },
  {
    "id": "dpp_87",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Coordination Compounds",
    "questions": [
      121642,
      121643,
      121644,
      121645,
      121646,
      121647,
      121648,
      121649,
      121650,
      121651
    ]
  },
  {
    "id": "dpp_88",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Coordination Compounds",
    "questions": [
      121652,
      121653,
      121654,
      121655,
      121656,
      121657,
      121658,
      121659,
      121660,
      121661
    ]
  },
  {
    "id": "dpp_89",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "d and f Block Elements",
    "questions": [
      121662,
      121663,
      121664,
      121665,
      121666,
      121667,
      121668,
      121669,
      121670,
      121671
    ]
  },
  {
    "id": "dpp_90",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "d and f Block Elements",
    "questions": [
      121672,
      121673,
      121674,
      121675,
      121676,
      121677,
      121678,
      121679,
      121680,
      121681
    ]
  },
  {
    "id": "dpp_91",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "d and f Block Elements",
    "questions": [
      121682,
      121683,
      121684,
      121685,
      121686,
      121687,
      121688,
      121689,
      121690,
      121691
    ]
  },
  {
    "id": "dpp_92",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "d and f Block Elements",
    "questions": [
      121692,
      121693,
      121694,
      121695,
      121696,
      121697,
      121698,
      121699,
      121700,
      121701
    ]
  },
  {
    "id": "dpp_93",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "d and f Block Elements",
    "questions": [
      121702,
      121703,
      121704,
      121705,
      121706,
      121707,
      121708,
      121709,
      121710,
      121711
    ]
  },
  {
    "id": "dpp_94",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "d and f Block Elements",
    "questions": [
      121712,
      121713,
      121714,
      121715,
      121716,
      121717,
      121718,
      121719,
      121720,
      121721
    ]
  },
  {
    "id": "dpp_95",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "d and f Block Elements",
    "questions": [
      121722,
      121723,
      121724,
      121725,
      121726,
      121727,
      121728,
      121729,
      121730,
      121731
    ]
  },
  {
    "id": "dpp_96",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "d and f Block Elements",
    "questions": [
      121732,
      121733,
      121734,
      121735,
      121736,
      121737,
      121738,
      121739,
      121740,
      121741
    ]
  },
  {
    "id": "dpp_97",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Electrochemistry",
    "questions": [
      121742,
      121743,
      121744,
      121745,
      121746,
      121747,
      121748,
      121749,
      121750,
      121751
    ]
  },
  {
    "id": "dpp_98",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Electrochemistry",
    "questions": [
      121752,
      121753,
      121754,
      121755,
      121756,
      121757,
      121758,
      121759,
      121760,
      121761
    ]
  },
  {
    "id": "dpp_99",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Electrochemistry",
    "questions": [
      121762,
      121763,
      121764,
      121765,
      121766,
      121767,
      121768,
      121769,
      121770,
      121771
    ]
  },
  {
    "id": "dpp_100",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Electrochemistry",
    "questions": [
      121772,
      121773,
      121774,
      121775,
      121776,
      121777,
      121778,
      121779,
      121780,
      121781
    ]
  },
  {
    "id": "dpp_101",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Electrochemistry",
    "questions": [
      121782,
      121783,
      121784,
      121785,
      121786,
      121787,
      121788,
      121789,
      121790,
      121791
    ]
  },
  {
    "id": "dpp_102",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Electrochemistry",
    "questions": [
      121792,
      121793,
      121794,
      121795,
      121796,
      121797,
      121798,
      121799,
      121800,
      121801
    ]
  },
  {
    "id": "dpp_103",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Electrochemistry",
    "questions": [
      121802,
      121803,
      121804,
      121805,
      121806,
      121807,
      121808,
      121809,
      121810,
      121811
    ]
  },
  {
    "id": "dpp_104",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Electrochemistry",
    "questions": [
      121812,
      121813,
      121814,
      121815,
      121816,
      121817,
      121818,
      121819,
      121820,
      121821
    ]
  },
  {
    "id": "dpp_105",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Electrochemistry",
    "questions": [
      121822,
      121823,
      121824,
      121825,
      121826,
      121827,
      121828,
      121829,
      121830,
      121831
    ]
  },
  {
    "id": "dpp_106",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "General Organic Chemistry",
    "questions": [
      121832,
      121833,
      121834,
      121835,
      121836,
      121837,
      121838,
      121839,
      121840,
      121841
    ]
  },
  {
    "id": "dpp_107",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "General Organic Chemistry",
    "questions": [
      121842,
      121843,
      121844,
      121845,
      121846,
      121847,
      121848,
      121849,
      121850,
      121851
    ]
  },
  {
    "id": "dpp_108",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "General Organic Chemistry",
    "questions": [
      121852,
      121853,
      121854,
      121855,
      121856,
      121857,
      121858,
      121859,
      121860,
      121861
    ]
  },
  {
    "id": "dpp_109",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "General Organic Chemistry",
    "questions": [
      121862,
      121863,
      121864,
      121865,
      121866,
      121867,
      121868,
      121869,
      121870,
      121871
    ]
  },
  {
    "id": "dpp_110",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "General Organic Chemistry",
    "questions": [
      121872,
      121873,
      121874,
      121875,
      121876,
      121877,
      121878,
      121879,
      121880,
      121881
    ]
  },
  {
    "id": "dpp_111",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "General Organic Chemistry",
    "questions": [
      121882,
      121883,
      121884,
      121885,
      121886,
      121887,
      121888,
      121889,
      121890,
      121891
    ]
  },
  {
    "id": "dpp_112",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "General Organic Chemistry",
    "questions": [
      121892,
      121893,
      121894,
      121895,
      121896,
      121897,
      121898,
      121899,
      121900,
      121901
    ]
  },
  {
    "id": "dpp_113",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "General Organic Chemistry",
    "questions": [
      121902,
      121903,
      121904,
      121905,
      121906,
      121907,
      121908,
      121909,
      121910,
      121911
    ]
  },
  {
    "id": "dpp_114",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "General Organic Chemistry",
    "questions": [
      121912,
      121913,
      121914,
      121915,
      121916,
      121917,
      121918,
      121919,
      121920,
      121921
    ]
  },
  {
    "id": "dpp_115",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Haloalkanes and Haloarenes",
    "questions": [
      121922,
      121923,
      121924,
      121925,
      121926,
      121927,
      121928,
      121929,
      121930,
      121931
    ]
  },
  {
    "id": "dpp_116",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Haloalkanes and Haloarenes",
    "questions": [
      121932,
      121933,
      121934,
      121935,
      121936,
      121937,
      121938,
      121939,
      121940,
      121941
    ]
  },
  {
    "id": "dpp_117",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Haloalkanes and Haloarenes",
    "questions": [
      121942,
      121943,
      121944,
      121945,
      121946,
      121947,
      121948,
      121949,
      121950,
      121951
    ]
  },
  {
    "id": "dpp_118",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Haloalkanes and Haloarenes",
    "questions": [
      121952,
      121953,
      121954,
      121955,
      121956,
      121957,
      121958,
      121959,
      121960,
      121961
    ]
  },
  {
    "id": "dpp_119",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Haloalkanes and Haloarenes",
    "questions": [
      121962,
      121963,
      121964,
      121965,
      121966,
      121967,
      121968,
      121969,
      121970,
      121971
    ]
  },
  {
    "id": "dpp_120",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Haloalkanes and Haloarenes",
    "questions": [
      121972,
      121973,
      121974,
      121975,
      121976,
      121977,
      121978,
      121979,
      121980,
      121981
    ]
  },
  {
    "id": "dpp_121",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Haloalkanes and Haloarenes",
    "questions": [
      121982,
      121983,
      121984,
      121985,
      121986,
      121987,
      121988,
      121989,
      121990,
      121991
    ]
  },
  {
    "id": "dpp_122",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Haloalkanes and Haloarenes",
    "questions": [
      121992,
      121993,
      121994,
      121995,
      121996,
      121997,
      121998,
      121999,
      122000,
      122001
    ]
  },
  {
    "id": "dpp_123",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Haloalkanes and Haloarenes",
    "questions": [
      122002,
      122003,
      122004,
      122005,
      122006,
      122007,
      122008,
      122009,
      122010,
      122011
    ]
  },
  {
    "id": "dpp_124",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Hydrocarbons",
    "questions": [
      122012,
      122013,
      122014,
      122015,
      122016,
      122017,
      122018,
      122019,
      122020,
      122021
    ]
  },
  {
    "id": "dpp_125",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Hydrocarbons",
    "questions": [
      122022,
      122023,
      122024,
      122025,
      122026,
      122027,
      122028,
      122029,
      122030,
      122031
    ]
  },
  {
    "id": "dpp_126",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Hydrocarbons",
    "questions": [
      122032,
      122033,
      122034,
      122035,
      122036,
      122037,
      122038,
      122039,
      122040,
      122041
    ]
  },
  {
    "id": "dpp_127",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Hydrocarbons",
    "questions": [
      122042,
      122043,
      122044,
      122045,
      122046,
      122047,
      122048,
      122049,
      122050,
      122051
    ]
  },
  {
    "id": "dpp_128",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Hydrocarbons",
    "questions": [
      122052,
      122053,
      122054,
      122055,
      122056,
      122057,
      122058,
      122059,
      122060,
      122061
    ]
  },
  {
    "id": "dpp_129",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Hydrocarbons",
    "questions": [
      122062,
      122063,
      122064,
      122065,
      122066,
      122067,
      122068,
      122069,
      122070,
      122071
    ]
  },
  {
    "id": "dpp_130",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Hydrocarbons",
    "questions": [
      122072,
      122073,
      122074,
      122075,
      122076,
      122077,
      122078,
      122079,
      122080,
      122081
    ]
  },
  {
    "id": "dpp_131",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Hydrocarbons",
    "questions": [
      122082,
      122083,
      122084,
      122085,
      122086,
      122087,
      122088,
      122089,
      122090,
      122091
    ]
  },
  {
    "id": "dpp_132",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Hydrocarbons",
    "questions": [
      122092,
      122093,
      122094,
      122095,
      122096,
      122097,
      122098,
      122099,
      122100,
      122101
    ]
  },
  {
    "id": "dpp_133",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Ionic Equilibrium",
    "questions": [
      122102,
      122103,
      122104,
      122105,
      122106,
      122107,
      122108,
      122109,
      122110,
      122111
    ]
  },
  {
    "id": "dpp_134",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Ionic Equilibrium",
    "questions": [
      122112,
      122113,
      122114,
      122115,
      122116,
      122117,
      122118,
      122119,
      122120,
      122121
    ]
  },
  {
    "id": "dpp_135",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Ionic Equilibrium",
    "questions": [
      122122,
      122123,
      122124,
      122125,
      122126,
      122127,
      122128,
      122129,
      122130,
      122131
    ]
  },
  {
    "id": "dpp_136",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Ionic Equilibrium",
    "questions": [
      122132,
      122133,
      122134,
      122135,
      122136,
      122137,
      122138,
      122139,
      122140,
      122141
    ]
  },
  {
    "id": "dpp_137",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Ionic Equilibrium",
    "questions": [
      122142,
      122143,
      122144,
      122145,
      122146,
      122147,
      122148,
      122149,
      122150,
      122151
    ]
  },
  {
    "id": "dpp_138",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Ionic Equilibrium",
    "questions": [
      122152,
      122153,
      122154,
      122155,
      122156,
      122157,
      122158,
      122159,
      122160,
      122161
    ]
  },
  {
    "id": "dpp_139",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Ionic Equilibrium",
    "questions": [
      122162,
      122163,
      122164,
      122165,
      122166,
      122167,
      122168,
      122169,
      122170,
      122171
    ]
  },
  {
    "id": "dpp_140",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Ionic Equilibrium",
    "questions": [
      122172,
      122173,
      122174,
      122175,
      122176,
      122177,
      122178,
      122179,
      122180,
      122181
    ]
  },
  {
    "id": "dpp_141",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Ionic Equilibrium",
    "questions": [
      122182,
      122183,
      122184,
      122185,
      122186,
      122187,
      122188,
      122189,
      122190,
      122191
    ]
  },
  {
    "id": "dpp_142",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 13 & 14)",
    "questions": [
      122192,
      122193,
      122194,
      122195,
      122196,
      122197,
      122198,
      122199,
      122200,
      122201
    ]
  },
  {
    "id": "dpp_143",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 13 & 14)",
    "questions": [
      122202,
      122203,
      122204,
      122205,
      122206,
      122207,
      122208,
      122209,
      122210,
      122211
    ]
  },
  {
    "id": "dpp_144",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 13 & 14)",
    "questions": [
      122212,
      122213,
      122214,
      122215,
      122216,
      122217,
      122218,
      122219,
      122220,
      122221
    ]
  },
  {
    "id": "dpp_145",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 13 & 14)",
    "questions": [
      122222,
      122223,
      122224,
      122225,
      122226,
      122227,
      122228,
      122229,
      122230,
      122231
    ]
  },
  {
    "id": "dpp_146",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 13 & 14)",
    "questions": [
      122232,
      122233,
      122234,
      122235,
      122236,
      122237,
      122238,
      122239,
      122240,
      122241
    ]
  },
  {
    "id": "dpp_147",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 13 & 14)",
    "questions": [
      122242,
      122243,
      122244,
      122245,
      122246,
      122247,
      122248,
      122249,
      122250,
      122251
    ]
  },
  {
    "id": "dpp_148",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 13 & 14)",
    "questions": [
      122252,
      122253,
      122254,
      122255,
      122256,
      122257,
      122258,
      122259,
      122260,
      122261
    ]
  },
  {
    "id": "dpp_149",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 13 & 14)",
    "questions": [
      122262,
      122263,
      122264,
      122265,
      122266,
      122267,
      122268,
      122269,
      122270,
      122271
    ]
  },
  {
    "id": "dpp_150",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 15, 16, 17 & 18)",
    "questions": [
      122272,
      122273,
      122274,
      122275,
      122276,
      122277,
      122278,
      122279,
      122280,
      122281
    ]
  },
  {
    "id": "dpp_151",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 15, 16, 17 & 18)",
    "questions": [
      122282,
      122283,
      122284,
      122285,
      122286,
      122287,
      122288,
      122289,
      122290,
      122291
    ]
  },
  {
    "id": "dpp_152",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 15, 16, 17 & 18)",
    "questions": [
      122292,
      122293,
      122294,
      122295,
      122296,
      122297,
      122298,
      122299,
      122300,
      122301
    ]
  },
  {
    "id": "dpp_153",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 15, 16, 17 & 18)",
    "questions": [
      122302,
      122303,
      122304,
      122305,
      122306,
      122307,
      122308,
      122309,
      122310,
      122311
    ]
  },
  {
    "id": "dpp_154",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 15, 16, 17 & 18)",
    "questions": [
      122312,
      122313,
      122314,
      122315,
      122316,
      122317,
      122318,
      122319,
      122320,
      122321
    ]
  },
  {
    "id": "dpp_155",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 15, 16, 17 & 18)",
    "questions": [
      122322,
      122323,
      122324,
      122325,
      122326,
      122327,
      122328,
      122329,
      122330,
      122331
    ]
  },
  {
    "id": "dpp_156",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 15, 16, 17 & 18)",
    "questions": [
      122332,
      122333,
      122334,
      122335,
      122336,
      122337,
      122338,
      122339,
      122340,
      122341
    ]
  },
  {
    "id": "dpp_157",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 15, 16, 17 & 18)",
    "questions": [
      122342,
      122343,
      122344,
      122345,
      122346,
      122347,
      122348,
      122349,
      122350,
      122351
    ]
  },
  {
    "id": "dpp_158",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "p Block Elements (Group 15, 16, 17 & 18)",
    "questions": [
      122352,
      122353,
      122354,
      122355,
      122356,
      122357,
      122358,
      122359,
      122360,
      122361
    ]
  },
  {
    "id": "dpp_159",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Redox Reactions",
    "questions": [
      122362,
      122363,
      122364,
      122365,
      122366,
      122367,
      122368,
      122369,
      122370,
      122371
    ]
  },
  {
    "id": "dpp_160",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Redox Reactions",
    "questions": [
      122372,
      122373,
      122374,
      122375,
      122376,
      122377,
      122378,
      122379,
      122380,
      122381
    ]
  },
  {
    "id": "dpp_161",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Redox Reactions",
    "questions": [
      122382,
      122383,
      122384,
      122385,
      122386,
      122387,
      122388,
      122389,
      122390,
      122391
    ]
  },
  {
    "id": "dpp_162",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Redox Reactions",
    "questions": [
      122392,
      122393,
      122394,
      122395,
      122396,
      122397,
      122398,
      122399,
      122400,
      122401
    ]
  },
  {
    "id": "dpp_163",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Redox Reactions",
    "questions": [
      122402,
      122403,
      122404,
      122405,
      122406,
      122407,
      122408,
      122409,
      122410,
      122411
    ]
  },
  {
    "id": "dpp_164",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Redox Reactions",
    "questions": [
      122412,
      122413,
      122414,
      122415,
      122416,
      122417,
      122418,
      122419,
      122420,
      122421
    ]
  },
  {
    "id": "dpp_165",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Redox Reactions",
    "questions": [
      122422,
      122423,
      122424,
      122425,
      122426,
      122427,
      122428,
      122429,
      122430,
      122431
    ]
  },
  {
    "id": "dpp_166",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Redox Reactions",
    "questions": [
      122432,
      122433,
      122434,
      122435,
      122436,
      122437,
      122438,
      122439,
      122440,
      122441
    ]
  },
  {
    "id": "dpp_167",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Redox Reactions",
    "questions": [
      122442,
      122443,
      122444,
      122445,
      122446,
      122447,
      122448,
      122449,
      122450,
      122451
    ]
  },
  {
    "id": "dpp_168",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Solutions",
    "questions": [
      122452,
      122453,
      122454,
      122455,
      122456,
      122457,
      122458,
      122459,
      122460,
      122461
    ]
  },
  {
    "id": "dpp_169",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Solutions",
    "questions": [
      122462,
      122463,
      122464,
      122465,
      122466,
      122467,
      122468,
      122469,
      122470,
      122471
    ]
  },
  {
    "id": "dpp_170",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Solutions",
    "questions": [
      122472,
      122473,
      122474,
      122475,
      122476,
      122477,
      122478,
      122479,
      122480,
      122481
    ]
  },
  {
    "id": "dpp_171",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Solutions",
    "questions": [
      122482,
      122483,
      122484,
      122485,
      122486,
      122487,
      122488,
      122489,
      122490,
      122491
    ]
  },
  {
    "id": "dpp_172",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Solutions",
    "questions": [
      122492,
      122493,
      122494,
      122495,
      122496,
      122497,
      122498,
      122499,
      122500,
      122501
    ]
  },
  {
    "id": "dpp_173",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Solutions",
    "questions": [
      122502,
      122503,
      122504,
      122505,
      122506,
      122507,
      122508,
      122509,
      122510,
      122511
    ]
  },
  {
    "id": "dpp_174",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Solutions",
    "questions": [
      122512,
      122513,
      122514,
      122515,
      122516,
      122517,
      122518,
      122519,
      122520,
      122521
    ]
  },
  {
    "id": "dpp_175",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Solutions",
    "questions": [
      122522,
      122523,
      122524,
      122525,
      122526,
      122527,
      122528,
      122529,
      122530,
      122531
    ]
  },
  {
    "id": "dpp_176",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Solutions",
    "questions": [
      122532,
      122533,
      122534,
      122535,
      122536,
      122537,
      122538,
      122539,
      122540,
      122541
    ]
  },
  {
    "id": "dpp_177",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Some Basic Concepts of Chemistry",
    "questions": [
      122542,
      122543,
      122544,
      122545,
      122546,
      122547,
      122548,
      122549,
      122550,
      122551
    ]
  },
  {
    "id": "dpp_178",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Some Basic Concepts of Chemistry",
    "questions": [
      122552,
      122553,
      122554,
      122555,
      122556,
      122557,
      122558,
      122559,
      122560,
      122561
    ]
  },
  {
    "id": "dpp_179",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Some Basic Concepts of Chemistry",
    "questions": [
      122562,
      122563,
      122564,
      122565,
      122566,
      122567,
      122568,
      122569,
      122570,
      122571
    ]
  },
  {
    "id": "dpp_180",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Some Basic Concepts of Chemistry",
    "questions": [
      122572,
      122573,
      122574,
      122575,
      122576,
      122577,
      122578,
      122579,
      122580,
      122581
    ]
  },
  {
    "id": "dpp_181",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Some Basic Concepts of Chemistry",
    "questions": [
      122582,
      122583,
      122584,
      122585,
      122586,
      122587,
      122588,
      122589,
      122590,
      122591
    ]
  },
  {
    "id": "dpp_182",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Some Basic Concepts of Chemistry",
    "questions": [
      122592,
      122593,
      122594,
      122595,
      122596,
      122597,
      122598,
      122599,
      122600,
      122601
    ]
  },
  {
    "id": "dpp_183",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Some Basic Concepts of Chemistry",
    "questions": [
      122602,
      122603,
      122604,
      122605,
      122606,
      122607,
      122608,
      122609,
      122610,
      122611
    ]
  },
  {
    "id": "dpp_184",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Some Basic Concepts of Chemistry",
    "questions": [
      122612,
      122613,
      122614,
      122615,
      122616,
      122617,
      122618,
      122619,
      122620,
      122621
    ]
  },
  {
    "id": "dpp_185",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Some Basic Concepts of Chemistry",
    "questions": [
      122622,
      122623,
      122624,
      122625,
      122626,
      122627,
      122628,
      122629,
      122630,
      122631
    ]
  },
  {
    "id": "dpp_186",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Structure of Atom",
    "questions": [
      122632,
      122633,
      122634,
      122635,
      122636,
      122637,
      122638,
      122639,
      122640,
      122641
    ]
  },
  {
    "id": "dpp_187",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Structure of Atom",
    "questions": [
      122642,
      122643,
      122644,
      122645,
      122646,
      122647,
      122648,
      122649,
      122650,
      122651
    ]
  },
  {
    "id": "dpp_188",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Structure of Atom",
    "questions": [
      122652,
      122653,
      122654,
      122655,
      122656,
      122657,
      122658,
      122659,
      122660,
      122661
    ]
  },
  {
    "id": "dpp_189",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Structure of Atom",
    "questions": [
      122662,
      122663,
      122664,
      122665,
      122666,
      122667,
      122668,
      122669,
      122670,
      122671
    ]
  },
  {
    "id": "dpp_190",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Structure of Atom",
    "questions": [
      122672,
      122673,
      122674,
      122675,
      122676,
      122677,
      122678,
      122679,
      122680,
      122681
    ]
  },
  {
    "id": "dpp_191",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Structure of Atom",
    "questions": [
      122682,
      122683,
      122684,
      122685,
      122686,
      122687,
      122688,
      122689,
      122690,
      122691
    ]
  },
  {
    "id": "dpp_192",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Structure of Atom",
    "questions": [
      122692,
      122693,
      122694,
      122695,
      122696,
      122697,
      122698,
      122699,
      122700,
      122701
    ]
  },
  {
    "id": "dpp_193",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Structure of Atom",
    "questions": [
      122702,
      122703,
      122704,
      122705,
      122706,
      122707,
      122708,
      122709,
      122710,
      122711
    ]
  },
  {
    "id": "dpp_194",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Structure of Atom",
    "questions": [
      122712,
      122713,
      122714,
      122715,
      122716,
      122717,
      122718,
      122719,
      122720,
      122721
    ]
  },
  {
    "id": "dpp_195",
    "title": "Chemistry — Easy DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Thermodynamics (C)",
    "questions": [
      122722,
      122723,
      122724,
      122725,
      122726,
      122727,
      122728,
      122729,
      122730,
      122731
    ]
  },
  {
    "id": "dpp_196",
    "title": "Chemistry — Easy DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Thermodynamics (C)",
    "questions": [
      122732,
      122733,
      122734,
      122735,
      122736,
      122737,
      122738,
      122739,
      122740,
      122741
    ]
  },
  {
    "id": "dpp_197",
    "title": "Chemistry — Easy DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Thermodynamics (C)",
    "questions": [
      122742,
      122743,
      122744,
      122745,
      122746,
      122747,
      122748,
      122749,
      122750,
      122751
    ]
  },
  {
    "id": "dpp_198",
    "title": "Chemistry — Moderate DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Thermodynamics (C)",
    "questions": [
      122752,
      122753,
      122754,
      122755,
      122756,
      122757,
      122758,
      122759,
      122760,
      122761
    ]
  },
  {
    "id": "dpp_199",
    "title": "Chemistry — Moderate DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Thermodynamics (C)",
    "questions": [
      122762,
      122763,
      122764,
      122765,
      122766,
      122767,
      122768,
      122769,
      122770,
      122771
    ]
  },
  {
    "id": "dpp_200",
    "title": "Chemistry — Moderate DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Thermodynamics (C)",
    "questions": [
      122772,
      122773,
      122774,
      122775,
      122776,
      122777,
      122778,
      122779,
      122780,
      122781
    ]
  },
  {
    "id": "dpp_201",
    "title": "Chemistry — Tough DPP 1",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Thermodynamics (C)",
    "questions": [
      122782,
      122783,
      122784,
      122785,
      122786,
      122787,
      122788,
      122789,
      122790,
      122791
    ]
  },
  {
    "id": "dpp_202",
    "title": "Chemistry — Tough DPP 2",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Thermodynamics (C)",
    "questions": [
      122792,
      122793,
      122794,
      122795,
      122796,
      122797,
      122798,
      122799,
      122800,
      122801
    ]
  },
  {
    "id": "dpp_203",
    "title": "Chemistry — Tough DPP 3",
    "date": "",
    "subject": "Chemistry",
    "chapter": "Thermodynamics (C)",
    "questions": [
      122802,
      122803,
      122804,
      122805,
      122806,
      122807,
      122808,
      122809,
      122810,
      122811
    ]
  },
  {
    "id": "dpp_204",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Application of Derivatives",
    "questions": [
      122812,
      122813,
      122814,
      122815,
      122816,
      122817,
      122818,
      122819,
      122820,
      122821
    ]
  },
  {
    "id": "dpp_205",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Application of Derivatives",
    "questions": [
      122822,
      122823,
      122824,
      122825,
      122826,
      122827,
      122828,
      122829,
      122830,
      122831
    ]
  },
  {
    "id": "dpp_206",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Application of Derivatives",
    "questions": [
      122832,
      122833,
      122834,
      122835,
      122836,
      122837,
      122838,
      122839,
      122840,
      122841
    ]
  },
  {
    "id": "dpp_207",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Application of Derivatives",
    "questions": [
      122842,
      122843,
      122844,
      122845,
      122846,
      122847,
      122848,
      122849,
      122850,
      122851
    ]
  },
  {
    "id": "dpp_208",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Application of Derivatives",
    "questions": [
      122852,
      122853,
      122854,
      122855,
      122856,
      122857,
      122858,
      122859,
      122860,
      122861
    ]
  },
  {
    "id": "dpp_209",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Application of Derivatives",
    "questions": [
      122862,
      122863,
      122864,
      122865,
      122866,
      122867,
      122868,
      122869,
      122870,
      122871
    ]
  },
  {
    "id": "dpp_210",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Application of Derivatives",
    "questions": [
      122872,
      122873,
      122874,
      122875,
      122876,
      122877,
      122878,
      122879,
      122880,
      122881
    ]
  },
  {
    "id": "dpp_211",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Application of Derivatives",
    "questions": [
      122882,
      122883,
      122884,
      122885,
      122886,
      122887,
      122888,
      122889,
      122890,
      122891
    ]
  },
  {
    "id": "dpp_212",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Application of Derivatives",
    "questions": [
      122892,
      122893,
      122894,
      122895,
      122896,
      122897,
      122898,
      122899,
      122900,
      122901
    ]
  },
  {
    "id": "dpp_213",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Area Under Curves",
    "questions": [
      122902,
      122903,
      122904,
      122905,
      122906,
      122907,
      122908,
      122909,
      122910,
      122911
    ]
  },
  {
    "id": "dpp_214",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Area Under Curves",
    "questions": [
      122912,
      122913,
      122914,
      122915,
      122916,
      122917,
      122918,
      122919,
      122920,
      122921
    ]
  },
  {
    "id": "dpp_215",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Area Under Curves",
    "questions": [
      122922,
      122923,
      122924,
      122925,
      122926,
      122927,
      122928,
      122929,
      122930,
      122931
    ]
  },
  {
    "id": "dpp_216",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Area Under Curves",
    "questions": [
      122932,
      122933,
      122934,
      122935,
      122936,
      122937,
      122938,
      122939,
      122940,
      122941
    ]
  },
  {
    "id": "dpp_217",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Area Under Curves",
    "questions": [
      122942,
      122943,
      122944,
      122945,
      122946,
      122947,
      122948,
      122949,
      122950,
      122951
    ]
  },
  {
    "id": "dpp_218",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Area Under Curves",
    "questions": [
      122952,
      122953,
      122954,
      122955,
      122956,
      122957,
      122958,
      122959,
      122960,
      122961
    ]
  },
  {
    "id": "dpp_219",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Area Under Curves",
    "questions": [
      122962,
      122963,
      122964,
      122965,
      122966,
      122967,
      122968,
      122969,
      122970,
      122971
    ]
  },
  {
    "id": "dpp_220",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Area Under Curves",
    "questions": [
      122972,
      122973,
      122974,
      122975,
      122976,
      122977,
      122978,
      122979,
      122980,
      122981
    ]
  },
  {
    "id": "dpp_221",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Area Under Curves",
    "questions": [
      122982,
      122983,
      122984,
      122985,
      122986,
      122987,
      122988,
      122989,
      122990,
      122991
    ]
  },
  {
    "id": "dpp_222",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Binomial Theorem",
    "questions": [
      122992,
      122993,
      122994,
      122995,
      122996,
      122997,
      122998,
      122999,
      123000,
      123001
    ]
  },
  {
    "id": "dpp_223",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Binomial Theorem",
    "questions": [
      123002,
      123003,
      123004,
      123005,
      123006,
      123007,
      123008,
      123009,
      123010,
      123011
    ]
  },
  {
    "id": "dpp_224",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Binomial Theorem",
    "questions": [
      123012,
      123013,
      123014,
      123015,
      123016,
      123017,
      123018,
      123019,
      123020,
      123021
    ]
  },
  {
    "id": "dpp_225",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Binomial Theorem",
    "questions": [
      123022,
      123023,
      123024,
      123025,
      123026,
      123027,
      123028,
      123029,
      123030,
      123031
    ]
  },
  {
    "id": "dpp_226",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Binomial Theorem",
    "questions": [
      123032,
      123033,
      123034,
      123035,
      123036,
      123037,
      123038,
      123039,
      123040,
      123041
    ]
  },
  {
    "id": "dpp_227",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Binomial Theorem",
    "questions": [
      123042,
      123043,
      123044,
      123045,
      123046,
      123047,
      123048,
      123049,
      123050,
      123051
    ]
  },
  {
    "id": "dpp_228",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Binomial Theorem",
    "questions": [
      123052,
      123053,
      123054,
      123055,
      123056,
      123057,
      123058,
      123059,
      123060,
      123061
    ]
  },
  {
    "id": "dpp_229",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Binomial Theorem",
    "questions": [
      123062,
      123063,
      123064,
      123065,
      123066,
      123067,
      123068,
      123069,
      123070,
      123071
    ]
  },
  {
    "id": "dpp_230",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Binomial Theorem",
    "questions": [
      123072,
      123073,
      123074,
      123075,
      123076,
      123077,
      123078,
      123079,
      123080,
      123081
    ]
  },
  {
    "id": "dpp_231",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Circle",
    "questions": [
      123082,
      123083,
      123084,
      123085,
      123086,
      123087,
      123088,
      123089,
      123090,
      123091
    ]
  },
  {
    "id": "dpp_232",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Circle",
    "questions": [
      123092,
      123093,
      123094,
      123095,
      123096,
      123097,
      123098,
      123099,
      123100,
      123101
    ]
  },
  {
    "id": "dpp_233",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Circle",
    "questions": [
      123102,
      123103,
      123104,
      123105,
      123106,
      123107,
      123108,
      123109,
      123110,
      123111
    ]
  },
  {
    "id": "dpp_234",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Circle",
    "questions": [
      123112,
      123113,
      123114,
      123115,
      123116,
      123117,
      123118,
      123119,
      123120,
      123121
    ]
  },
  {
    "id": "dpp_235",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Circle",
    "questions": [
      123122,
      123123,
      123124,
      123125,
      123126,
      123127,
      123128,
      123129,
      123130,
      123131
    ]
  },
  {
    "id": "dpp_236",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Circle",
    "questions": [
      123132,
      123133,
      123134,
      123135,
      123136,
      123137,
      123138,
      123139,
      123140,
      123141
    ]
  },
  {
    "id": "dpp_237",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Circle",
    "questions": [
      123142,
      123143,
      123144,
      123145,
      123146,
      123147,
      123148,
      123149,
      123150,
      123151
    ]
  },
  {
    "id": "dpp_238",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Circle",
    "questions": [
      123152,
      123153,
      123154,
      123155,
      123156,
      123157,
      123158,
      123159,
      123160,
      123161
    ]
  },
  {
    "id": "dpp_239",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Circle",
    "questions": [
      123162,
      123163,
      123164,
      123165,
      123166,
      123167,
      123168,
      123169,
      123170,
      123171
    ]
  },
  {
    "id": "dpp_240",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Complex Number",
    "questions": [
      123172,
      123173,
      123174,
      123175,
      123176,
      123177,
      123178,
      123179,
      123180,
      123181
    ]
  },
  {
    "id": "dpp_241",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Complex Number",
    "questions": [
      123182,
      123183,
      123184,
      123185,
      123186,
      123187,
      123188,
      123189,
      123190,
      123191
    ]
  },
  {
    "id": "dpp_242",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Complex Number",
    "questions": [
      123192,
      123193,
      123194,
      123195,
      123196,
      123197,
      123198,
      123199,
      123200,
      123201
    ]
  },
  {
    "id": "dpp_243",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Complex Number",
    "questions": [
      123202,
      123203,
      123204,
      123205,
      123206,
      123207,
      123208,
      123209,
      123210,
      123211
    ]
  },
  {
    "id": "dpp_244",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Complex Number",
    "questions": [
      123212,
      123213,
      123214,
      123215,
      123216,
      123217,
      123218,
      123219,
      123220,
      123221
    ]
  },
  {
    "id": "dpp_245",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Complex Number",
    "questions": [
      123222,
      123223,
      123224,
      123225,
      123226,
      123227,
      123228,
      123229,
      123230,
      123231
    ]
  },
  {
    "id": "dpp_246",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Complex Number",
    "questions": [
      123232,
      123233,
      123234,
      123235,
      123236,
      123237,
      123238,
      123239,
      123240,
      123241
    ]
  },
  {
    "id": "dpp_247",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Complex Number",
    "questions": [
      123242,
      123243,
      123244,
      123245,
      123246,
      123247,
      123248,
      123249,
      123250,
      123251
    ]
  },
  {
    "id": "dpp_248",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Complex Number",
    "questions": [
      123252,
      123253,
      123254,
      123255,
      123256,
      123257,
      123258,
      123259,
      123260,
      123261
    ]
  },
  {
    "id": "dpp_249",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Continuity and Differentiability",
    "questions": [
      123262,
      123263,
      123264,
      123265,
      123266,
      123267,
      123268,
      123269,
      123270,
      123271
    ]
  },
  {
    "id": "dpp_250",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Continuity and Differentiability",
    "questions": [
      123272,
      123273,
      123274,
      123275,
      123276,
      123277,
      123278,
      123279,
      123280,
      123281
    ]
  },
  {
    "id": "dpp_251",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Continuity and Differentiability",
    "questions": [
      123282,
      123283,
      123284,
      123285,
      123286,
      123287,
      123288,
      123289,
      123290,
      123291
    ]
  },
  {
    "id": "dpp_252",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Continuity and Differentiability",
    "questions": [
      123292,
      123293,
      123294,
      123295,
      123296,
      123297,
      123298,
      123299,
      123300,
      123301
    ]
  },
  {
    "id": "dpp_253",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Continuity and Differentiability",
    "questions": [
      123302,
      123303,
      123304,
      123305,
      123306,
      123307,
      123308,
      123309,
      123310,
      123311
    ]
  },
  {
    "id": "dpp_254",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Continuity and Differentiability",
    "questions": [
      123312,
      123313,
      123314,
      123315,
      123316,
      123317,
      123318,
      123319,
      123320,
      123321
    ]
  },
  {
    "id": "dpp_255",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Continuity and Differentiability",
    "questions": [
      123322,
      123323,
      123324,
      123325,
      123326,
      123327,
      123328,
      123329,
      123330,
      123331
    ]
  },
  {
    "id": "dpp_256",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Continuity and Differentiability",
    "questions": [
      123332,
      123333,
      123334,
      123335,
      123336,
      123337,
      123338,
      123339,
      123340,
      123341
    ]
  },
  {
    "id": "dpp_257",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Continuity and Differentiability",
    "questions": [
      123342,
      123343,
      123344,
      123345,
      123346,
      123347,
      123348,
      123349,
      123350,
      123351
    ]
  },
  {
    "id": "dpp_258",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Definite Integration",
    "questions": [
      123352,
      123353,
      123354,
      123355,
      123356,
      123357,
      123358,
      123359,
      123360,
      123361
    ]
  },
  {
    "id": "dpp_259",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Definite Integration",
    "questions": [
      123362,
      123363,
      123364,
      123365,
      123366,
      123367,
      123368,
      123369,
      123370,
      123371
    ]
  },
  {
    "id": "dpp_260",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Definite Integration",
    "questions": [
      123372,
      123373,
      123374,
      123375,
      123376,
      123377,
      123378,
      123379,
      123380,
      123381
    ]
  },
  {
    "id": "dpp_261",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Definite Integration",
    "questions": [
      123382,
      123383,
      123384,
      123385,
      123386,
      123387,
      123388,
      123389,
      123390,
      123391
    ]
  },
  {
    "id": "dpp_262",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Definite Integration",
    "questions": [
      123392,
      123393,
      123394,
      123395,
      123396,
      123397,
      123398,
      123399,
      123400,
      123401
    ]
  },
  {
    "id": "dpp_263",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Definite Integration",
    "questions": [
      123402,
      123403,
      123404,
      123405,
      123406,
      123407,
      123408,
      123409,
      123410,
      123411
    ]
  },
  {
    "id": "dpp_264",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Definite Integration",
    "questions": [
      123412,
      123413,
      123414,
      123415,
      123416,
      123417,
      123418,
      123419,
      123420,
      123421
    ]
  },
  {
    "id": "dpp_265",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Definite Integration",
    "questions": [
      123422,
      123423,
      123424,
      123425,
      123426,
      123427,
      123428,
      123429,
      123430,
      123431
    ]
  },
  {
    "id": "dpp_266",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Definite Integration",
    "questions": [
      123432,
      123433,
      123434,
      123435,
      123436,
      123437,
      123438,
      123439,
      123440,
      123441
    ]
  },
  {
    "id": "dpp_267",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Determinants",
    "questions": [
      123442,
      123443,
      123444,
      123445,
      123446,
      123447,
      123448,
      123449,
      123450,
      123451
    ]
  },
  {
    "id": "dpp_268",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Determinants",
    "questions": [
      123452,
      123453,
      123454,
      123455,
      123456,
      123457,
      123458,
      123459,
      123460,
      123461
    ]
  },
  {
    "id": "dpp_269",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Determinants",
    "questions": [
      123462,
      123463,
      123464,
      123465,
      123466,
      123467,
      123468,
      123469,
      123470,
      123471
    ]
  },
  {
    "id": "dpp_270",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Determinants",
    "questions": [
      123472,
      123473,
      123474,
      123475,
      123476,
      123477,
      123478,
      123479,
      123480,
      123481
    ]
  },
  {
    "id": "dpp_271",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Determinants",
    "questions": [
      123482,
      123483,
      123484,
      123485,
      123486,
      123487,
      123488,
      123489,
      123490,
      123491
    ]
  },
  {
    "id": "dpp_272",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Determinants",
    "questions": [
      123492,
      123493,
      123494,
      123495,
      123496,
      123497,
      123498,
      123499,
      123500,
      123501
    ]
  },
  {
    "id": "dpp_273",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Determinants",
    "questions": [
      123502,
      123503,
      123504,
      123505,
      123506,
      123507,
      123508,
      123509,
      123510,
      123511
    ]
  },
  {
    "id": "dpp_274",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Determinants",
    "questions": [
      123512,
      123513,
      123514,
      123515,
      123516,
      123517,
      123518,
      123519,
      123520,
      123521
    ]
  },
  {
    "id": "dpp_275",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Determinants",
    "questions": [
      123522,
      123523,
      123524,
      123525,
      123526,
      123527,
      123528,
      123529,
      123530,
      123531
    ]
  },
  {
    "id": "dpp_276",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differential Equations",
    "questions": [
      123532,
      123533,
      123534,
      123535,
      123536,
      123537,
      123538,
      123539,
      123540,
      123541
    ]
  },
  {
    "id": "dpp_277",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differential Equations",
    "questions": [
      123542,
      123543,
      123544,
      123545,
      123546,
      123547,
      123548,
      123549,
      123550,
      123551
    ]
  },
  {
    "id": "dpp_278",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differential Equations",
    "questions": [
      123552,
      123553,
      123554,
      123555,
      123556,
      123557,
      123558,
      123559,
      123560,
      123561
    ]
  },
  {
    "id": "dpp_279",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differential Equations",
    "questions": [
      123562,
      123563,
      123564,
      123565,
      123566,
      123567,
      123568,
      123569,
      123570,
      123571
    ]
  },
  {
    "id": "dpp_280",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differential Equations",
    "questions": [
      123572,
      123573,
      123574,
      123575,
      123576,
      123577,
      123578,
      123579,
      123580,
      123581
    ]
  },
  {
    "id": "dpp_281",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differential Equations",
    "questions": [
      123582,
      123583,
      123584,
      123585,
      123586,
      123587,
      123588,
      123589,
      123590,
      123591
    ]
  },
  {
    "id": "dpp_282",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differential Equations",
    "questions": [
      123592,
      123593,
      123594,
      123595,
      123596,
      123597,
      123598,
      123599,
      123600,
      123601
    ]
  },
  {
    "id": "dpp_283",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differential Equations",
    "questions": [
      123602,
      123603,
      123604,
      123605,
      123606,
      123607,
      123608,
      123609,
      123610,
      123611
    ]
  },
  {
    "id": "dpp_284",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differential Equations",
    "questions": [
      123612,
      123613,
      123614,
      123615,
      123616,
      123617,
      123618,
      123619,
      123620,
      123621
    ]
  },
  {
    "id": "dpp_285",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differentiation",
    "questions": [
      123622,
      123623,
      123624,
      123625,
      123626,
      123627,
      123628,
      123629,
      123630,
      123631
    ]
  },
  {
    "id": "dpp_286",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differentiation",
    "questions": [
      123632,
      123633,
      123634,
      123635,
      123636,
      123637,
      123638,
      123639,
      123640,
      123641
    ]
  },
  {
    "id": "dpp_287",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differentiation",
    "questions": [
      123642,
      123643,
      123644,
      123645,
      123646,
      123647,
      123648,
      123649,
      123650,
      123651
    ]
  },
  {
    "id": "dpp_288",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differentiation",
    "questions": [
      123652,
      123653,
      123654,
      123655,
      123656,
      123657,
      123658,
      123659,
      123660,
      123661
    ]
  },
  {
    "id": "dpp_289",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differentiation",
    "questions": [
      123662,
      123663,
      123664,
      123665,
      123666,
      123667,
      123668,
      123669,
      123670,
      123671
    ]
  },
  {
    "id": "dpp_290",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differentiation",
    "questions": [
      123672,
      123673,
      123674,
      123675,
      123676,
      123677,
      123678,
      123679,
      123680,
      123681
    ]
  },
  {
    "id": "dpp_291",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differentiation",
    "questions": [
      123682,
      123683,
      123684,
      123685,
      123686,
      123687,
      123688,
      123689,
      123690,
      123691
    ]
  },
  {
    "id": "dpp_292",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differentiation",
    "questions": [
      123692,
      123693,
      123694,
      123695,
      123696,
      123697,
      123698,
      123699,
      123700,
      123701
    ]
  },
  {
    "id": "dpp_293",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Differentiation",
    "questions": [
      123702,
      123703,
      123704,
      123705,
      123706,
      123707,
      123708,
      123709,
      123710,
      123711
    ]
  },
  {
    "id": "dpp_294",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Ellipse",
    "questions": [
      123712,
      123713,
      123714,
      123715,
      123716,
      123717,
      123718,
      123719,
      123720,
      123721
    ]
  },
  {
    "id": "dpp_295",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Ellipse",
    "questions": [
      123722,
      123723,
      123724,
      123725,
      123726,
      123727,
      123728,
      123729,
      123730,
      123731
    ]
  },
  {
    "id": "dpp_296",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Ellipse",
    "questions": [
      123732,
      123733,
      123734,
      123735,
      123736,
      123737,
      123738,
      123739,
      123740,
      123741
    ]
  },
  {
    "id": "dpp_297",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Ellipse",
    "questions": [
      123742,
      123743,
      123744,
      123745,
      123746,
      123747,
      123748,
      123749,
      123750,
      123751
    ]
  },
  {
    "id": "dpp_298",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Ellipse",
    "questions": [
      123752,
      123753,
      123754,
      123755,
      123756,
      123757,
      123758,
      123759,
      123760,
      123761
    ]
  },
  {
    "id": "dpp_299",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Ellipse",
    "questions": [
      123762,
      123763,
      123764,
      123765,
      123766,
      123767,
      123768,
      123769,
      123770,
      123771
    ]
  },
  {
    "id": "dpp_300",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Ellipse",
    "questions": [
      123772,
      123773,
      123774,
      123775,
      123776,
      123777,
      123778,
      123779,
      123780,
      123781
    ]
  },
  {
    "id": "dpp_301",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Ellipse",
    "questions": [
      123782,
      123783,
      123784,
      123785,
      123786,
      123787,
      123788,
      123789,
      123790,
      123791
    ]
  },
  {
    "id": "dpp_302",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Ellipse",
    "questions": [
      123792,
      123793,
      123794,
      123795,
      123796,
      123797,
      123798,
      123799,
      123800,
      123801
    ]
  },
  {
    "id": "dpp_303",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Functions",
    "questions": [
      123802,
      123803,
      123804,
      123805,
      123806,
      123807,
      123808,
      123809,
      123810,
      123811
    ]
  },
  {
    "id": "dpp_304",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Functions",
    "questions": [
      123812,
      123813,
      123814,
      123815,
      123816,
      123817,
      123818,
      123819,
      123820,
      123821
    ]
  },
  {
    "id": "dpp_305",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Functions",
    "questions": [
      123822,
      123823,
      123824,
      123825,
      123826,
      123827,
      123828,
      123829,
      123830,
      123831
    ]
  },
  {
    "id": "dpp_306",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Functions",
    "questions": [
      123832,
      123833,
      123834,
      123835,
      123836,
      123837,
      123838,
      123839,
      123840,
      123841
    ]
  },
  {
    "id": "dpp_307",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Functions",
    "questions": [
      123842,
      123843,
      123844,
      123845,
      123846,
      123847,
      123848,
      123849,
      123850,
      123851
    ]
  },
  {
    "id": "dpp_308",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Functions",
    "questions": [
      123852,
      123853,
      123854,
      123855,
      123856,
      123857,
      123858,
      123859,
      123860,
      123861
    ]
  },
  {
    "id": "dpp_309",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Functions",
    "questions": [
      123862,
      123863,
      123864,
      123865,
      123866,
      123867,
      123868,
      123869,
      123870,
      123871
    ]
  },
  {
    "id": "dpp_310",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Functions",
    "questions": [
      123872,
      123873,
      123874,
      123875,
      123876,
      123877,
      123878,
      123879,
      123880,
      123881
    ]
  },
  {
    "id": "dpp_311",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Functions",
    "questions": [
      123882,
      123883,
      123884,
      123885,
      123886,
      123887,
      123888,
      123889,
      123890,
      123891
    ]
  },
  {
    "id": "dpp_312",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Hyperbola",
    "questions": [
      123892,
      123893,
      123894,
      123895,
      123896,
      123897,
      123898,
      123899,
      123900,
      123901
    ]
  },
  {
    "id": "dpp_313",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Hyperbola",
    "questions": [
      123902,
      123903,
      123904,
      123905,
      123906,
      123907,
      123908,
      123909,
      123910,
      123911
    ]
  },
  {
    "id": "dpp_314",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Hyperbola",
    "questions": [
      123912,
      123913,
      123914,
      123915,
      123916,
      123917,
      123918,
      123919,
      123920,
      123921
    ]
  },
  {
    "id": "dpp_315",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Hyperbola",
    "questions": [
      123922,
      123923,
      123924,
      123925,
      123926,
      123927,
      123928,
      123929,
      123930,
      123931
    ]
  },
  {
    "id": "dpp_316",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Hyperbola",
    "questions": [
      123932,
      123933,
      123934,
      123935,
      123936,
      123937,
      123938,
      123939,
      123940,
      123941
    ]
  },
  {
    "id": "dpp_317",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Hyperbola",
    "questions": [
      123942,
      123943,
      123944,
      123945,
      123946,
      123947,
      123948,
      123949,
      123950,
      123951
    ]
  },
  {
    "id": "dpp_318",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Hyperbola",
    "questions": [
      123952,
      123953,
      123954,
      123955,
      123956,
      123957,
      123958,
      123959,
      123960,
      123961
    ]
  },
  {
    "id": "dpp_319",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Hyperbola",
    "questions": [
      123962,
      123963,
      123964,
      123965,
      123966,
      123967,
      123968,
      123969,
      123970,
      123971
    ]
  },
  {
    "id": "dpp_320",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Hyperbola",
    "questions": [
      123972,
      123973,
      123974,
      123975,
      123976,
      123977,
      123978,
      123979,
      123980,
      123981
    ]
  },
  {
    "id": "dpp_321",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Indefinite Integration",
    "questions": [
      123982,
      123983,
      123984,
      123985,
      123986,
      123987,
      123988,
      123989,
      123990,
      123991
    ]
  },
  {
    "id": "dpp_322",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Indefinite Integration",
    "questions": [
      123992,
      123993,
      123994,
      123995,
      123996,
      123997,
      123998,
      123999,
      124000,
      124001
    ]
  },
  {
    "id": "dpp_323",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Indefinite Integration",
    "questions": [
      124002,
      124003,
      124004,
      124005,
      124006,
      124007,
      124008,
      124009,
      124010,
      124011
    ]
  },
  {
    "id": "dpp_324",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Indefinite Integration",
    "questions": [
      124012,
      124013,
      124014,
      124015,
      124016,
      124017,
      124018,
      124019,
      124020,
      124021
    ]
  },
  {
    "id": "dpp_325",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Indefinite Integration",
    "questions": [
      124022,
      124023,
      124024,
      124025,
      124026,
      124027,
      124028,
      124029,
      124030,
      124031
    ]
  },
  {
    "id": "dpp_326",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Indefinite Integration",
    "questions": [
      124032,
      124033,
      124034,
      124035,
      124036,
      124037,
      124038,
      124039,
      124040,
      124041
    ]
  },
  {
    "id": "dpp_327",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Indefinite Integration",
    "questions": [
      124042,
      124043,
      124044,
      124045,
      124046,
      124047,
      124048,
      124049,
      124050,
      124051
    ]
  },
  {
    "id": "dpp_328",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Indefinite Integration",
    "questions": [
      124052,
      124053,
      124054,
      124055,
      124056,
      124057,
      124058,
      124059,
      124060,
      124061
    ]
  },
  {
    "id": "dpp_329",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Indefinite Integration",
    "questions": [
      124062,
      124063,
      124064,
      124065,
      124066,
      124067,
      124068,
      124069,
      124070,
      124071
    ]
  },
  {
    "id": "dpp_330",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Inverse Trigonometric Functions",
    "questions": [
      124072,
      124073,
      124074,
      124075,
      124076,
      124077,
      124078,
      124079,
      124080,
      124081
    ]
  },
  {
    "id": "dpp_331",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Inverse Trigonometric Functions",
    "questions": [
      124082,
      124083,
      124084,
      124085,
      124086,
      124087,
      124088,
      124089,
      124090,
      124091
    ]
  },
  {
    "id": "dpp_332",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Inverse Trigonometric Functions",
    "questions": [
      124092,
      124093,
      124094,
      124095,
      124096,
      124097,
      124098,
      124099,
      124100,
      124101
    ]
  },
  {
    "id": "dpp_333",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Inverse Trigonometric Functions",
    "questions": [
      124102,
      124103,
      124104,
      124105,
      124106,
      124107,
      124108,
      124109,
      124110,
      124111
    ]
  },
  {
    "id": "dpp_334",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Inverse Trigonometric Functions",
    "questions": [
      124112,
      124113,
      124114,
      124115,
      124116,
      124117,
      124118,
      124119,
      124120,
      124121
    ]
  },
  {
    "id": "dpp_335",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Inverse Trigonometric Functions",
    "questions": [
      124122,
      124123,
      124124,
      124125,
      124126,
      124127,
      124128,
      124129,
      124130,
      124131
    ]
  },
  {
    "id": "dpp_336",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Inverse Trigonometric Functions",
    "questions": [
      124132,
      124133,
      124134,
      124135,
      124136,
      124137,
      124138,
      124139,
      124140,
      124141
    ]
  },
  {
    "id": "dpp_337",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Inverse Trigonometric Functions",
    "questions": [
      124142,
      124143,
      124144,
      124145,
      124146,
      124147,
      124148,
      124149,
      124150,
      124151
    ]
  },
  {
    "id": "dpp_338",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Limits",
    "questions": [
      124152,
      124153,
      124154,
      124155,
      124156,
      124157,
      124158,
      124159,
      124160,
      124161
    ]
  },
  {
    "id": "dpp_339",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Limits",
    "questions": [
      124162,
      124163,
      124164,
      124165,
      124166,
      124167,
      124168,
      124169,
      124170,
      124171
    ]
  },
  {
    "id": "dpp_340",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Limits",
    "questions": [
      124172,
      124173,
      124174,
      124175,
      124176,
      124177,
      124178,
      124179,
      124180,
      124181
    ]
  },
  {
    "id": "dpp_341",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Limits",
    "questions": [
      124182,
      124183,
      124184,
      124185,
      124186,
      124187,
      124188,
      124189,
      124190,
      124191
    ]
  },
  {
    "id": "dpp_342",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Limits",
    "questions": [
      124192,
      124193,
      124194,
      124195,
      124196,
      124197,
      124198,
      124199,
      124200,
      124201
    ]
  },
  {
    "id": "dpp_343",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Limits",
    "questions": [
      124202,
      124203,
      124204,
      124205,
      124206,
      124207,
      124208,
      124209,
      124210,
      124211
    ]
  },
  {
    "id": "dpp_344",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Limits",
    "questions": [
      124212,
      124213,
      124214,
      124215,
      124216,
      124217,
      124218,
      124219,
      124220,
      124221
    ]
  },
  {
    "id": "dpp_345",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Limits",
    "questions": [
      124222,
      124223,
      124224,
      124225,
      124226,
      124227,
      124228,
      124229,
      124230,
      124231
    ]
  },
  {
    "id": "dpp_346",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Limits",
    "questions": [
      124232,
      124233,
      124234,
      124235,
      124236,
      124237,
      124238,
      124239,
      124240,
      124241
    ]
  },
  {
    "id": "dpp_347",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Matrices",
    "questions": [
      124242,
      124243,
      124244,
      124245,
      124246,
      124247,
      124248,
      124249,
      124250,
      124251
    ]
  },
  {
    "id": "dpp_348",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Matrices",
    "questions": [
      124252,
      124253,
      124254,
      124255,
      124256,
      124257,
      124258,
      124259,
      124260,
      124261
    ]
  },
  {
    "id": "dpp_349",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Matrices",
    "questions": [
      124262,
      124263,
      124264,
      124265,
      124266,
      124267,
      124268,
      124269,
      124270,
      124271
    ]
  },
  {
    "id": "dpp_350",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Matrices",
    "questions": [
      124272,
      124273,
      124274,
      124275,
      124276,
      124277,
      124278,
      124279,
      124280,
      124281
    ]
  },
  {
    "id": "dpp_351",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Matrices",
    "questions": [
      124282,
      124283,
      124284,
      124285,
      124286,
      124287,
      124288,
      124289,
      124290,
      124291
    ]
  },
  {
    "id": "dpp_352",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Matrices",
    "questions": [
      124292,
      124293,
      124294,
      124295,
      124296,
      124297,
      124298,
      124299,
      124300,
      124301
    ]
  },
  {
    "id": "dpp_353",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Matrices",
    "questions": [
      124302,
      124303,
      124304,
      124305,
      124306,
      124307,
      124308,
      124309,
      124310,
      124311
    ]
  },
  {
    "id": "dpp_354",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Matrices",
    "questions": [
      124312,
      124313,
      124314,
      124315,
      124316,
      124317,
      124318,
      124319,
      124320,
      124321
    ]
  },
  {
    "id": "dpp_355",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Matrices",
    "questions": [
      124322,
      124323,
      124324,
      124325,
      124326,
      124327,
      124328,
      124329,
      124330,
      124331
    ]
  },
  {
    "id": "dpp_356",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Parabola",
    "questions": [
      124332,
      124333,
      124334,
      124335,
      124336,
      124337,
      124338,
      124339,
      124340,
      124341
    ]
  },
  {
    "id": "dpp_357",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Parabola",
    "questions": [
      124342,
      124343,
      124344,
      124345,
      124346,
      124347,
      124348,
      124349,
      124350,
      124351
    ]
  },
  {
    "id": "dpp_358",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Parabola",
    "questions": [
      124352,
      124353,
      124354,
      124355,
      124356,
      124357,
      124358,
      124359,
      124360,
      124361
    ]
  },
  {
    "id": "dpp_359",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Parabola",
    "questions": [
      124362,
      124363,
      124364,
      124365,
      124366,
      124367,
      124368,
      124369,
      124370,
      124371
    ]
  },
  {
    "id": "dpp_360",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Parabola",
    "questions": [
      124372,
      124373,
      124374,
      124375,
      124376,
      124377,
      124378,
      124379,
      124380,
      124381
    ]
  },
  {
    "id": "dpp_361",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Parabola",
    "questions": [
      124382,
      124383,
      124384,
      124385,
      124386,
      124387,
      124388,
      124389,
      124390,
      124391
    ]
  },
  {
    "id": "dpp_362",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Parabola",
    "questions": [
      124392,
      124393,
      124394,
      124395,
      124396,
      124397,
      124398,
      124399,
      124400,
      124401
    ]
  },
  {
    "id": "dpp_363",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Parabola",
    "questions": [
      124402,
      124403,
      124404,
      124405,
      124406,
      124407,
      124408,
      124409,
      124410,
      124411
    ]
  },
  {
    "id": "dpp_364",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Parabola",
    "questions": [
      124412,
      124413,
      124414,
      124415,
      124416,
      124417,
      124418,
      124419,
      124420,
      124421
    ]
  },
  {
    "id": "dpp_365",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Permutation Combination",
    "questions": [
      124422,
      124423,
      124424,
      124425,
      124426,
      124427,
      124428,
      124429,
      124430,
      124431
    ]
  },
  {
    "id": "dpp_366",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Permutation Combination",
    "questions": [
      124432,
      124433,
      124434,
      124435,
      124436,
      124437,
      124438,
      124439,
      124440,
      124441
    ]
  },
  {
    "id": "dpp_367",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Permutation Combination",
    "questions": [
      124442,
      124443,
      124444,
      124445,
      124446,
      124447,
      124448,
      124449,
      124450,
      124451
    ]
  },
  {
    "id": "dpp_368",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Permutation Combination",
    "questions": [
      124452,
      124453,
      124454,
      124455,
      124456,
      124457,
      124458,
      124459,
      124460,
      124461
    ]
  },
  {
    "id": "dpp_369",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Permutation Combination",
    "questions": [
      124462,
      124463,
      124464,
      124465,
      124466,
      124467,
      124468,
      124469,
      124470,
      124471
    ]
  },
  {
    "id": "dpp_370",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Permutation Combination",
    "questions": [
      124472,
      124473,
      124474,
      124475,
      124476,
      124477,
      124478,
      124479,
      124480,
      124481
    ]
  },
  {
    "id": "dpp_371",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Permutation Combination",
    "questions": [
      124482,
      124483,
      124484,
      124485,
      124486,
      124487,
      124488,
      124489,
      124490,
      124491
    ]
  },
  {
    "id": "dpp_372",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Permutation Combination",
    "questions": [
      124492,
      124493,
      124494,
      124495,
      124496,
      124497,
      124498,
      124499,
      124500,
      124501
    ]
  },
  {
    "id": "dpp_373",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Permutation Combination",
    "questions": [
      124502,
      124503,
      124504,
      124505,
      124506,
      124507,
      124508,
      124509,
      124510,
      124511
    ]
  },
  {
    "id": "dpp_374",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Probability",
    "questions": [
      124512,
      124513,
      124514,
      124515,
      124516,
      124517,
      124518,
      124519,
      124520,
      124521
    ]
  },
  {
    "id": "dpp_375",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Probability",
    "questions": [
      124522,
      124523,
      124524,
      124525,
      124526,
      124527,
      124528,
      124529,
      124530,
      124531
    ]
  },
  {
    "id": "dpp_376",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Probability",
    "questions": [
      124532,
      124533,
      124534,
      124535,
      124536,
      124537,
      124538,
      124539,
      124540,
      124541
    ]
  },
  {
    "id": "dpp_377",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Probability",
    "questions": [
      124542,
      124543,
      124544,
      124545,
      124546,
      124547,
      124548,
      124549,
      124550,
      124551
    ]
  },
  {
    "id": "dpp_378",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Probability",
    "questions": [
      124552,
      124553,
      124554,
      124555,
      124556,
      124557,
      124558,
      124559,
      124560,
      124561
    ]
  },
  {
    "id": "dpp_379",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Probability",
    "questions": [
      124562,
      124563,
      124564,
      124565,
      124566,
      124567,
      124568,
      124569,
      124570,
      124571
    ]
  },
  {
    "id": "dpp_380",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Probability",
    "questions": [
      124572,
      124573,
      124574,
      124575,
      124576,
      124577,
      124578,
      124579,
      124580,
      124581
    ]
  },
  {
    "id": "dpp_381",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Quadratic Equation",
    "questions": [
      124582,
      124583,
      124584,
      124585,
      124586,
      124587,
      124588,
      124589,
      124590,
      124591
    ]
  },
  {
    "id": "dpp_382",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Quadratic Equation",
    "questions": [
      124592,
      124593,
      124594,
      124595,
      124596,
      124597,
      124598,
      124599,
      124600,
      124601
    ]
  },
  {
    "id": "dpp_383",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Quadratic Equation",
    "questions": [
      124602,
      124603,
      124604,
      124605,
      124606,
      124607,
      124608,
      124609,
      124610,
      124611
    ]
  },
  {
    "id": "dpp_384",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Quadratic Equation",
    "questions": [
      124612,
      124613,
      124614,
      124615,
      124616,
      124617,
      124618,
      124619,
      124620,
      124621
    ]
  },
  {
    "id": "dpp_385",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Quadratic Equation",
    "questions": [
      124622,
      124623,
      124624,
      124625,
      124626,
      124627,
      124628,
      124629,
      124630,
      124631
    ]
  },
  {
    "id": "dpp_386",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Quadratic Equation",
    "questions": [
      124632,
      124633,
      124634,
      124635,
      124636,
      124637,
      124638,
      124639,
      124640,
      124641
    ]
  },
  {
    "id": "dpp_387",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Quadratic Equation",
    "questions": [
      124642,
      124643,
      124644,
      124645,
      124646,
      124647,
      124648,
      124649,
      124650,
      124651
    ]
  },
  {
    "id": "dpp_388",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Quadratic Equation",
    "questions": [
      124652,
      124653,
      124654,
      124655,
      124656,
      124657,
      124658,
      124659,
      124660,
      124661
    ]
  },
  {
    "id": "dpp_389",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Quadratic Equation",
    "questions": [
      124662,
      124663,
      124664,
      124665,
      124666,
      124667,
      124668,
      124669,
      124670,
      124671
    ]
  },
  {
    "id": "dpp_390",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Sequences and Series",
    "questions": [
      124672,
      124673,
      124674,
      124675,
      124676,
      124677,
      124678,
      124679,
      124680,
      124681
    ]
  },
  {
    "id": "dpp_391",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Sequences and Series",
    "questions": [
      124682,
      124683,
      124684,
      124685,
      124686,
      124687,
      124688,
      124689,
      124690,
      124691
    ]
  },
  {
    "id": "dpp_392",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Sequences and Series",
    "questions": [
      124692,
      124693,
      124694,
      124695,
      124696,
      124697,
      124698,
      124699,
      124700,
      124701
    ]
  },
  {
    "id": "dpp_393",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Sequences and Series",
    "questions": [
      124702,
      124703,
      124704,
      124705,
      124706,
      124707,
      124708,
      124709,
      124710,
      124711
    ]
  },
  {
    "id": "dpp_394",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Sequences and Series",
    "questions": [
      124712,
      124713,
      124714,
      124715,
      124716,
      124717,
      124718,
      124719,
      124720,
      124721
    ]
  },
  {
    "id": "dpp_395",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Sequences and Series",
    "questions": [
      124722,
      124723,
      124724,
      124725,
      124726,
      124727,
      124728,
      124729,
      124730,
      124731
    ]
  },
  {
    "id": "dpp_396",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Sequences and Series",
    "questions": [
      124732,
      124733,
      124734,
      124735,
      124736,
      124737,
      124738,
      124739,
      124740,
      124741
    ]
  },
  {
    "id": "dpp_397",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Sequences and Series",
    "questions": [
      124742,
      124743,
      124744,
      124745,
      124746,
      124747,
      124748,
      124749,
      124750,
      124751
    ]
  },
  {
    "id": "dpp_398",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Sequences and Series",
    "questions": [
      124752,
      124753,
      124754,
      124755,
      124756,
      124757,
      124758,
      124759,
      124760,
      124761
    ]
  },
  {
    "id": "dpp_399",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Sets and Relations",
    "questions": [
      124762,
      124763,
      124764,
      124765,
      124766,
      124767,
      124768,
      124769,
      124770,
      124771
    ]
  },
  {
    "id": "dpp_400",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Sets and Relations",
    "questions": [
      124772,
      124773,
      124774,
      124775,
      124776,
      124777,
      124778,
      124779,
      124780,
      124781
    ]
  },
  {
    "id": "dpp_401",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Sets and Relations",
    "questions": [
      124782,
      124783,
      124784,
      124785,
      124786,
      124787,
      124788,
      124789,
      124790,
      124791
    ]
  },
  {
    "id": "dpp_402",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Sets and Relations",
    "questions": [
      124792,
      124793,
      124794,
      124795,
      124796,
      124797,
      124798,
      124799,
      124800,
      124801
    ]
  },
  {
    "id": "dpp_403",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Sets and Relations",
    "questions": [
      124802,
      124803,
      124804,
      124805,
      124806,
      124807,
      124808,
      124809,
      124810,
      124811
    ]
  },
  {
    "id": "dpp_404",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Sets and Relations",
    "questions": [
      124812,
      124813,
      124814,
      124815,
      124816,
      124817,
      124818,
      124819,
      124820,
      124821
    ]
  },
  {
    "id": "dpp_405",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Statistics",
    "questions": [
      124822,
      124823,
      124824,
      124825,
      124826,
      124827,
      124828,
      124829,
      124830,
      124831
    ]
  },
  {
    "id": "dpp_406",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Statistics",
    "questions": [
      124832,
      124833,
      124834,
      124835,
      124836,
      124837,
      124838,
      124839,
      124840,
      124841
    ]
  },
  {
    "id": "dpp_407",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Statistics",
    "questions": [
      124842,
      124843,
      124844,
      124845,
      124846,
      124847,
      124848,
      124849,
      124850,
      124851
    ]
  },
  {
    "id": "dpp_408",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Statistics",
    "questions": [
      124852,
      124853,
      124854,
      124855,
      124856,
      124857,
      124858,
      124859,
      124860,
      124861
    ]
  },
  {
    "id": "dpp_409",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Statistics",
    "questions": [
      124862,
      124863,
      124864,
      124865,
      124866,
      124867,
      124868,
      124869,
      124870,
      124871
    ]
  },
  {
    "id": "dpp_410",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Statistics",
    "questions": [
      124872,
      124873,
      124874,
      124875,
      124876,
      124877,
      124878,
      124879,
      124880,
      124881
    ]
  },
  {
    "id": "dpp_411",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Statistics",
    "questions": [
      124882,
      124883,
      124884,
      124885,
      124886,
      124887,
      124888,
      124889,
      124890,
      124891
    ]
  },
  {
    "id": "dpp_412",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Statistics",
    "questions": [
      124892,
      124893,
      124894,
      124895,
      124896,
      124897,
      124898,
      124899,
      124900,
      124901
    ]
  },
  {
    "id": "dpp_413",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Statistics",
    "questions": [
      124902,
      124903,
      124904,
      124905,
      124906,
      124907,
      124908,
      124909,
      124910,
      124911
    ]
  },
  {
    "id": "dpp_414",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Straight Lines",
    "questions": [
      124912,
      124913,
      124914,
      124915,
      124916,
      124917,
      124918,
      124919,
      124920,
      124921
    ]
  },
  {
    "id": "dpp_415",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Straight Lines",
    "questions": [
      124922,
      124923,
      124924,
      124925,
      124926,
      124927,
      124928,
      124929,
      124930,
      124931
    ]
  },
  {
    "id": "dpp_416",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Straight Lines",
    "questions": [
      124932,
      124933,
      124934,
      124935,
      124936,
      124937,
      124938,
      124939,
      124940,
      124941
    ]
  },
  {
    "id": "dpp_417",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Straight Lines",
    "questions": [
      124942,
      124943,
      124944,
      124945,
      124946,
      124947,
      124948,
      124949,
      124950,
      124951
    ]
  },
  {
    "id": "dpp_418",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Straight Lines",
    "questions": [
      124952,
      124953,
      124954,
      124955,
      124956,
      124957,
      124958,
      124959,
      124960,
      124961
    ]
  },
  {
    "id": "dpp_419",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Straight Lines",
    "questions": [
      124962,
      124963,
      124964,
      124965,
      124966,
      124967,
      124968,
      124969,
      124970,
      124971
    ]
  },
  {
    "id": "dpp_420",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Straight Lines",
    "questions": [
      124972,
      124973,
      124974,
      124975,
      124976,
      124977,
      124978,
      124979,
      124980,
      124981
    ]
  },
  {
    "id": "dpp_421",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Straight Lines",
    "questions": [
      124982,
      124983,
      124984,
      124985,
      124986,
      124987,
      124988,
      124989,
      124990,
      124991
    ]
  },
  {
    "id": "dpp_422",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Straight Lines",
    "questions": [
      124992,
      124993,
      124994,
      124995,
      124996,
      124997,
      124998,
      124999,
      125000,
      125001
    ]
  },
  {
    "id": "dpp_423",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Three Dimensional Geometry",
    "questions": [
      125002,
      125003,
      125004,
      125005,
      125006,
      125007,
      125008,
      125009,
      125010,
      125011
    ]
  },
  {
    "id": "dpp_424",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Three Dimensional Geometry",
    "questions": [
      125012,
      125013,
      125014,
      125015,
      125016,
      125017,
      125018,
      125019,
      125020,
      125021
    ]
  },
  {
    "id": "dpp_425",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Three Dimensional Geometry",
    "questions": [
      125022,
      125023,
      125024,
      125025,
      125026,
      125027,
      125028,
      125029,
      125030,
      125031
    ]
  },
  {
    "id": "dpp_426",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Three Dimensional Geometry",
    "questions": [
      125032,
      125033,
      125034,
      125035,
      125036,
      125037,
      125038,
      125039,
      125040,
      125041
    ]
  },
  {
    "id": "dpp_427",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Three Dimensional Geometry",
    "questions": [
      125042,
      125043,
      125044,
      125045,
      125046,
      125047,
      125048,
      125049,
      125050,
      125051
    ]
  },
  {
    "id": "dpp_428",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Three Dimensional Geometry",
    "questions": [
      125052,
      125053,
      125054,
      125055,
      125056,
      125057,
      125058,
      125059,
      125060,
      125061
    ]
  },
  {
    "id": "dpp_429",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Three Dimensional Geometry",
    "questions": [
      125062,
      125063,
      125064,
      125065,
      125066,
      125067,
      125068,
      125069,
      125070,
      125071
    ]
  },
  {
    "id": "dpp_430",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Three Dimensional Geometry",
    "questions": [
      125072,
      125073,
      125074,
      125075,
      125076,
      125077,
      125078,
      125079,
      125080,
      125081
    ]
  },
  {
    "id": "dpp_431",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Three Dimensional Geometry",
    "questions": [
      125082,
      125083,
      125084,
      125085,
      125086,
      125087,
      125088,
      125089,
      125090,
      125091
    ]
  },
  {
    "id": "dpp_432",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Trigonometric Equations",
    "questions": [
      125092,
      125093,
      125094,
      125095,
      125096,
      125097,
      125098,
      125099,
      125100,
      125101
    ]
  },
  {
    "id": "dpp_433",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Trigonometric Equations",
    "questions": [
      125102,
      125103,
      125104,
      125105,
      125106,
      125107,
      125108,
      125109,
      125110,
      125111
    ]
  },
  {
    "id": "dpp_434",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Trigonometric Equations",
    "questions": [
      125112,
      125113,
      125114,
      125115,
      125116,
      125117,
      125118,
      125119,
      125120,
      125121
    ]
  },
  {
    "id": "dpp_435",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Trigonometric Equations",
    "questions": [
      125122,
      125123,
      125124,
      125125,
      125126,
      125127,
      125128,
      125129,
      125130,
      125131
    ]
  },
  {
    "id": "dpp_436",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Trigonometric Equations",
    "questions": [
      125132,
      125133,
      125134,
      125135,
      125136,
      125137,
      125138,
      125139,
      125140,
      125141
    ]
  },
  {
    "id": "dpp_437",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Trigonometric Equations",
    "questions": [
      125142,
      125143,
      125144,
      125145,
      125146,
      125147,
      125148,
      125149,
      125150,
      125151
    ]
  },
  {
    "id": "dpp_438",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Trigonometric Equations",
    "questions": [
      125152,
      125153,
      125154,
      125155,
      125156,
      125157,
      125158,
      125159,
      125160,
      125161
    ]
  },
  {
    "id": "dpp_439",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Trigonometric Equations",
    "questions": [
      125162,
      125163,
      125164,
      125165,
      125166,
      125167,
      125168,
      125169,
      125170,
      125171
    ]
  },
  {
    "id": "dpp_440",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Trigonometric Equations",
    "questions": [
      125172,
      125173,
      125174,
      125175,
      125176,
      125177,
      125178,
      125179,
      125180,
      125181
    ]
  },
  {
    "id": "dpp_441",
    "title": "Mathematics — Easy DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Vector Algebra",
    "questions": [
      125182,
      125183,
      125184,
      125185,
      125186,
      125187,
      125188,
      125189,
      125190,
      125191
    ]
  },
  {
    "id": "dpp_442",
    "title": "Mathematics — Easy DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Vector Algebra",
    "questions": [
      125192,
      125193,
      125194,
      125195,
      125196,
      125197,
      125198,
      125199,
      125200,
      125201
    ]
  },
  {
    "id": "dpp_443",
    "title": "Mathematics — Easy DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Vector Algebra",
    "questions": [
      125202,
      125203,
      125204,
      125205,
      125206,
      125207,
      125208,
      125209,
      125210,
      125211
    ]
  },
  {
    "id": "dpp_444",
    "title": "Mathematics — Moderate DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Vector Algebra",
    "questions": [
      125212,
      125213,
      125214,
      125215,
      125216,
      125217,
      125218,
      125219,
      125220,
      125221
    ]
  },
  {
    "id": "dpp_445",
    "title": "Mathematics — Moderate DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Vector Algebra",
    "questions": [
      125222,
      125223,
      125224,
      125225,
      125226,
      125227,
      125228,
      125229,
      125230,
      125231
    ]
  },
  {
    "id": "dpp_446",
    "title": "Mathematics — Moderate DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Vector Algebra",
    "questions": [
      125232,
      125233,
      125234,
      125235,
      125236,
      125237,
      125238,
      125239,
      125240,
      125241
    ]
  },
  {
    "id": "dpp_447",
    "title": "Mathematics — Tough DPP 1",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Vector Algebra",
    "questions": [
      125242,
      125243,
      125244,
      125245,
      125246,
      125247,
      125248,
      125249,
      125250,
      125251
    ]
  },
  {
    "id": "dpp_448",
    "title": "Mathematics — Tough DPP 2",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Vector Algebra",
    "questions": [
      125252,
      125253,
      125254,
      125255,
      125256,
      125257,
      125258,
      125259,
      125260,
      125261
    ]
  },
  {
    "id": "dpp_449",
    "title": "Mathematics — Tough DPP 3",
    "date": "",
    "subject": "Mathematics",
    "chapter": "Vector Algebra",
    "questions": [
      125262,
      125263,
      125264,
      125265,
      125266,
      125267,
      125268,
      125269,
      125270,
      125271
    ]
  },
  {
    "id": "dpp_450",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Alternating Current",
    "questions": [
      125272,
      125273,
      125274,
      125275,
      125276,
      125277,
      125278,
      125279,
      125280,
      125281
    ]
  },
  {
    "id": "dpp_451",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Alternating Current",
    "questions": [
      125282,
      125283,
      125284,
      125285,
      125286,
      125287,
      125288,
      125289,
      125290,
      125291
    ]
  },
  {
    "id": "dpp_452",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Alternating Current",
    "questions": [
      125292,
      125293,
      125294,
      125295,
      125296,
      125297,
      125298,
      125299,
      125300,
      125301
    ]
  },
  {
    "id": "dpp_453",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Alternating Current",
    "questions": [
      125302,
      125303,
      125304,
      125305,
      125306,
      125307,
      125308,
      125309,
      125310,
      125311
    ]
  },
  {
    "id": "dpp_454",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Alternating Current",
    "questions": [
      125312,
      125313,
      125314,
      125315,
      125316,
      125317,
      125318,
      125319,
      125320,
      125321
    ]
  },
  {
    "id": "dpp_455",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Alternating Current",
    "questions": [
      125322,
      125323,
      125324,
      125325,
      125326,
      125327,
      125328,
      125329,
      125330,
      125331
    ]
  },
  {
    "id": "dpp_456",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Alternating Current",
    "questions": [
      125332,
      125333,
      125334,
      125335,
      125336,
      125337,
      125338,
      125339,
      125340,
      125341
    ]
  },
  {
    "id": "dpp_457",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Alternating Current",
    "questions": [
      125342,
      125343,
      125344,
      125345,
      125346,
      125347,
      125348,
      125349,
      125350,
      125351
    ]
  },
  {
    "id": "dpp_458",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Alternating Current",
    "questions": [
      125352,
      125353,
      125354,
      125355,
      125356,
      125357,
      125358,
      125359,
      125360,
      125361
    ]
  },
  {
    "id": "dpp_459",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Atomic Physics",
    "questions": [
      125362,
      125363,
      125364,
      125365,
      125366,
      125367,
      125368,
      125369,
      125370,
      125371
    ]
  },
  {
    "id": "dpp_460",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Atomic Physics",
    "questions": [
      125372,
      125373,
      125374,
      125375,
      125376,
      125377,
      125378,
      125379,
      125380,
      125381
    ]
  },
  {
    "id": "dpp_461",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Atomic Physics",
    "questions": [
      125382,
      125383,
      125384,
      125385,
      125386,
      125387,
      125388,
      125389,
      125390,
      125391
    ]
  },
  {
    "id": "dpp_462",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Atomic Physics",
    "questions": [
      125392,
      125393,
      125394,
      125395,
      125396,
      125397,
      125398,
      125399,
      125400,
      125401
    ]
  },
  {
    "id": "dpp_463",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Atomic Physics",
    "questions": [
      125402,
      125403,
      125404,
      125405,
      125406,
      125407,
      125408,
      125409,
      125410,
      125411
    ]
  },
  {
    "id": "dpp_464",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Atomic Physics",
    "questions": [
      125412,
      125413,
      125414,
      125415,
      125416,
      125417,
      125418,
      125419,
      125420,
      125421
    ]
  },
  {
    "id": "dpp_465",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Atomic Physics",
    "questions": [
      125422,
      125423,
      125424,
      125425,
      125426,
      125427,
      125428,
      125429,
      125430,
      125431
    ]
  },
  {
    "id": "dpp_466",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Atomic Physics",
    "questions": [
      125432,
      125433,
      125434,
      125435,
      125436,
      125437,
      125438,
      125439,
      125440,
      125441
    ]
  },
  {
    "id": "dpp_467",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Atomic Physics",
    "questions": [
      125442,
      125443,
      125444,
      125445,
      125446,
      125447,
      125448,
      125449,
      125450,
      125451
    ]
  },
  {
    "id": "dpp_468",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Capacitance",
    "questions": [
      125452,
      125453,
      125454,
      125455,
      125456,
      125457,
      125458,
      125459,
      125460,
      125461
    ]
  },
  {
    "id": "dpp_469",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Capacitance",
    "questions": [
      125462,
      125463,
      125464,
      125465,
      125466,
      125467,
      125468,
      125469,
      125470,
      125471
    ]
  },
  {
    "id": "dpp_470",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Capacitance",
    "questions": [
      125472,
      125473,
      125474,
      125475,
      125476,
      125477,
      125478,
      125479,
      125480,
      125481
    ]
  },
  {
    "id": "dpp_471",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Capacitance",
    "questions": [
      125482,
      125483,
      125484,
      125485,
      125486,
      125487,
      125488,
      125489,
      125490,
      125491
    ]
  },
  {
    "id": "dpp_472",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Capacitance",
    "questions": [
      125492,
      125493,
      125494,
      125495,
      125496,
      125497,
      125498,
      125499,
      125500,
      125501
    ]
  },
  {
    "id": "dpp_473",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Capacitance",
    "questions": [
      125502,
      125503,
      125504,
      125505,
      125506,
      125507,
      125508,
      125509,
      125510,
      125511
    ]
  },
  {
    "id": "dpp_474",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Capacitance",
    "questions": [
      125512,
      125513,
      125514,
      125515,
      125516,
      125517,
      125518,
      125519,
      125520,
      125521
    ]
  },
  {
    "id": "dpp_475",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Capacitance",
    "questions": [
      125522,
      125523,
      125524,
      125525,
      125526,
      125527,
      125528,
      125529,
      125530,
      125531
    ]
  },
  {
    "id": "dpp_476",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Capacitance",
    "questions": [
      125532,
      125533,
      125534,
      125535,
      125536,
      125537,
      125538,
      125539,
      125540,
      125541
    ]
  },
  {
    "id": "dpp_477",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Center of Mass Momentum and Collision",
    "questions": [
      125542,
      125543,
      125544,
      125545,
      125546,
      125547,
      125548,
      125549,
      125550,
      125551
    ]
  },
  {
    "id": "dpp_478",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Center of Mass Momentum and Collision",
    "questions": [
      125552,
      125553,
      125554,
      125555,
      125556,
      125557,
      125558,
      125559,
      125560,
      125561
    ]
  },
  {
    "id": "dpp_479",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Center of Mass Momentum and Collision",
    "questions": [
      125562,
      125563,
      125564,
      125565,
      125566,
      125567,
      125568,
      125569,
      125570,
      125571
    ]
  },
  {
    "id": "dpp_480",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Center of Mass Momentum and Collision",
    "questions": [
      125572,
      125573,
      125574,
      125575,
      125576,
      125577,
      125578,
      125579,
      125580,
      125581
    ]
  },
  {
    "id": "dpp_481",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Center of Mass Momentum and Collision",
    "questions": [
      125582,
      125583,
      125584,
      125585,
      125586,
      125587,
      125588,
      125589,
      125590,
      125591
    ]
  },
  {
    "id": "dpp_482",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Center of Mass Momentum and Collision",
    "questions": [
      125592,
      125593,
      125594,
      125595,
      125596,
      125597,
      125598,
      125599,
      125600,
      125601
    ]
  },
  {
    "id": "dpp_483",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Center of Mass Momentum and Collision",
    "questions": [
      125602,
      125603,
      125604,
      125605,
      125606,
      125607,
      125608,
      125609,
      125610,
      125611
    ]
  },
  {
    "id": "dpp_484",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Center of Mass Momentum and Collision",
    "questions": [
      125612,
      125613,
      125614,
      125615,
      125616,
      125617,
      125618,
      125619,
      125620,
      125621
    ]
  },
  {
    "id": "dpp_485",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Center of Mass Momentum and Collision",
    "questions": [
      125622,
      125623,
      125624,
      125625,
      125626,
      125627,
      125628,
      125629,
      125630,
      125631
    ]
  },
  {
    "id": "dpp_486",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Current Electricity",
    "questions": [
      125632,
      125633,
      125634,
      125635,
      125636,
      125637,
      125638,
      125639,
      125640,
      125641
    ]
  },
  {
    "id": "dpp_487",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Current Electricity",
    "questions": [
      125642,
      125643,
      125644,
      125645,
      125646,
      125647,
      125648,
      125649,
      125650,
      125651
    ]
  },
  {
    "id": "dpp_488",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Current Electricity",
    "questions": [
      125652,
      125653,
      125654,
      125655,
      125656,
      125657,
      125658,
      125659,
      125660,
      125661
    ]
  },
  {
    "id": "dpp_489",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Current Electricity",
    "questions": [
      125662,
      125663,
      125664,
      125665,
      125666,
      125667,
      125668,
      125669,
      125670,
      125671
    ]
  },
  {
    "id": "dpp_490",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Current Electricity",
    "questions": [
      125672,
      125673,
      125674,
      125675,
      125676,
      125677,
      125678,
      125679,
      125680,
      125681
    ]
  },
  {
    "id": "dpp_491",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Current Electricity",
    "questions": [
      125682,
      125683,
      125684,
      125685,
      125686,
      125687,
      125688,
      125689,
      125690,
      125691
    ]
  },
  {
    "id": "dpp_492",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Current Electricity",
    "questions": [
      125692,
      125693,
      125694,
      125695,
      125696,
      125697,
      125698,
      125699,
      125700,
      125701
    ]
  },
  {
    "id": "dpp_493",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Current Electricity",
    "questions": [
      125702,
      125703,
      125704,
      125705,
      125706,
      125707,
      125708,
      125709,
      125710,
      125711
    ]
  },
  {
    "id": "dpp_494",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Current Electricity",
    "questions": [
      125712,
      125713,
      125714,
      125715,
      125716,
      125717,
      125718,
      125719,
      125720,
      125721
    ]
  },
  {
    "id": "dpp_495",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Dual Nature of Matter",
    "questions": [
      125722,
      125723,
      125724,
      125725,
      125726,
      125727,
      125728,
      125729,
      125730,
      125731
    ]
  },
  {
    "id": "dpp_496",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Dual Nature of Matter",
    "questions": [
      125732,
      125733,
      125734,
      125735,
      125736,
      125737,
      125738,
      125739,
      125740,
      125741
    ]
  },
  {
    "id": "dpp_497",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Dual Nature of Matter",
    "questions": [
      125742,
      125743,
      125744,
      125745,
      125746,
      125747,
      125748,
      125749,
      125750,
      125751
    ]
  },
  {
    "id": "dpp_498",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Dual Nature of Matter",
    "questions": [
      125752,
      125753,
      125754,
      125755,
      125756,
      125757,
      125758,
      125759,
      125760,
      125761
    ]
  },
  {
    "id": "dpp_499",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Dual Nature of Matter",
    "questions": [
      125762,
      125763,
      125764,
      125765,
      125766,
      125767,
      125768,
      125769,
      125770,
      125771
    ]
  },
  {
    "id": "dpp_500",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Dual Nature of Matter",
    "questions": [
      125772,
      125773,
      125774,
      125775,
      125776,
      125777,
      125778,
      125779,
      125780,
      125781
    ]
  },
  {
    "id": "dpp_501",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Dual Nature of Matter",
    "questions": [
      125782,
      125783,
      125784,
      125785,
      125786,
      125787,
      125788,
      125789,
      125790,
      125791
    ]
  },
  {
    "id": "dpp_502",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Dual Nature of Matter",
    "questions": [
      125792,
      125793,
      125794,
      125795,
      125796,
      125797,
      125798,
      125799,
      125800,
      125801
    ]
  },
  {
    "id": "dpp_503",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Dual Nature of Matter",
    "questions": [
      125802,
      125803,
      125804,
      125805,
      125806,
      125807,
      125808,
      125809,
      125810,
      125811
    ]
  },
  {
    "id": "dpp_504",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Electromagnetic Induction",
    "questions": [
      125812,
      125813,
      125814,
      125815,
      125816,
      125817,
      125818,
      125819,
      125820,
      125821
    ]
  },
  {
    "id": "dpp_505",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Electromagnetic Induction",
    "questions": [
      125822,
      125823,
      125824,
      125825,
      125826,
      125827,
      125828,
      125829,
      125830,
      125831
    ]
  },
  {
    "id": "dpp_506",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Electromagnetic Induction",
    "questions": [
      125832,
      125833,
      125834,
      125835,
      125836,
      125837,
      125838,
      125839,
      125840,
      125841
    ]
  },
  {
    "id": "dpp_507",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Electromagnetic Induction",
    "questions": [
      125842,
      125843,
      125844,
      125845,
      125846,
      125847,
      125848,
      125849,
      125850,
      125851
    ]
  },
  {
    "id": "dpp_508",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Electromagnetic Induction",
    "questions": [
      125852,
      125853,
      125854,
      125855,
      125856,
      125857,
      125858,
      125859,
      125860,
      125861
    ]
  },
  {
    "id": "dpp_509",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Electromagnetic Induction",
    "questions": [
      125862,
      125863,
      125864,
      125865,
      125866,
      125867,
      125868,
      125869,
      125870,
      125871
    ]
  },
  {
    "id": "dpp_510",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Electromagnetic Induction",
    "questions": [
      125872,
      125873,
      125874,
      125875,
      125876,
      125877,
      125878,
      125879,
      125880,
      125881
    ]
  },
  {
    "id": "dpp_511",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Electromagnetic Induction",
    "questions": [
      125882,
      125883,
      125884,
      125885,
      125886,
      125887,
      125888,
      125889,
      125890,
      125891
    ]
  },
  {
    "id": "dpp_512",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Electromagnetic Waves",
    "questions": [
      125892,
      125893,
      125894,
      125895,
      125896,
      125897,
      125898,
      125899,
      125900,
      125901
    ]
  },
  {
    "id": "dpp_513",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Electromagnetic Waves",
    "questions": [
      125902,
      125903,
      125904,
      125905,
      125906,
      125907,
      125908,
      125909,
      125910,
      125911
    ]
  },
  {
    "id": "dpp_514",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Electromagnetic Waves",
    "questions": [
      125912,
      125913,
      125914,
      125915,
      125916,
      125917,
      125918,
      125919,
      125920,
      125921
    ]
  },
  {
    "id": "dpp_515",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Electromagnetic Waves",
    "questions": [
      125922,
      125923,
      125924,
      125925,
      125926,
      125927,
      125928,
      125929,
      125930,
      125931
    ]
  },
  {
    "id": "dpp_516",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Electromagnetic Waves",
    "questions": [
      125932,
      125933,
      125934,
      125935,
      125936,
      125937,
      125938,
      125939,
      125940,
      125941
    ]
  },
  {
    "id": "dpp_517",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Electromagnetic Waves",
    "questions": [
      125942,
      125943,
      125944,
      125945,
      125946,
      125947,
      125948,
      125949,
      125950,
      125951
    ]
  },
  {
    "id": "dpp_518",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Electrostatics",
    "questions": [
      125952,
      125953,
      125954,
      125955,
      125956,
      125957,
      125958,
      125959,
      125960,
      125961
    ]
  },
  {
    "id": "dpp_519",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Electrostatics",
    "questions": [
      125962,
      125963,
      125964,
      125965,
      125966,
      125967,
      125968,
      125969,
      125970,
      125971
    ]
  },
  {
    "id": "dpp_520",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Electrostatics",
    "questions": [
      125972,
      125973,
      125974,
      125975,
      125976,
      125977,
      125978,
      125979,
      125980,
      125981
    ]
  },
  {
    "id": "dpp_521",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Electrostatics",
    "questions": [
      125982,
      125983,
      125984,
      125985,
      125986,
      125987,
      125988,
      125989,
      125990,
      125991
    ]
  },
  {
    "id": "dpp_522",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Electrostatics",
    "questions": [
      125992,
      125993,
      125994,
      125995,
      125996,
      125997,
      125998,
      125999,
      126000,
      126001
    ]
  },
  {
    "id": "dpp_523",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Electrostatics",
    "questions": [
      126002,
      126003,
      126004,
      126005,
      126006,
      126007,
      126008,
      126009,
      126010,
      126011
    ]
  },
  {
    "id": "dpp_524",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Electrostatics",
    "questions": [
      126012,
      126013,
      126014,
      126015,
      126016,
      126017,
      126018,
      126019,
      126020,
      126021
    ]
  },
  {
    "id": "dpp_525",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Electrostatics",
    "questions": [
      126022,
      126023,
      126024,
      126025,
      126026,
      126027,
      126028,
      126029,
      126030,
      126031
    ]
  },
  {
    "id": "dpp_526",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Electrostatics",
    "questions": [
      126032,
      126033,
      126034,
      126035,
      126036,
      126037,
      126038,
      126039,
      126040,
      126041
    ]
  },
  {
    "id": "dpp_527",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Gravitation",
    "questions": [
      126042,
      126043,
      126044,
      126045,
      126046,
      126047,
      126048,
      126049,
      126050,
      126051
    ]
  },
  {
    "id": "dpp_528",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Gravitation",
    "questions": [
      126052,
      126053,
      126054,
      126055,
      126056,
      126057,
      126058,
      126059,
      126060,
      126061
    ]
  },
  {
    "id": "dpp_529",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Gravitation",
    "questions": [
      126062,
      126063,
      126064,
      126065,
      126066,
      126067,
      126068,
      126069,
      126070,
      126071
    ]
  },
  {
    "id": "dpp_530",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Gravitation",
    "questions": [
      126072,
      126073,
      126074,
      126075,
      126076,
      126077,
      126078,
      126079,
      126080,
      126081
    ]
  },
  {
    "id": "dpp_531",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Gravitation",
    "questions": [
      126082,
      126083,
      126084,
      126085,
      126086,
      126087,
      126088,
      126089,
      126090,
      126091
    ]
  },
  {
    "id": "dpp_532",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Gravitation",
    "questions": [
      126092,
      126093,
      126094,
      126095,
      126096,
      126097,
      126098,
      126099,
      126100,
      126101
    ]
  },
  {
    "id": "dpp_533",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Gravitation",
    "questions": [
      126102,
      126103,
      126104,
      126105,
      126106,
      126107,
      126108,
      126109,
      126110,
      126111
    ]
  },
  {
    "id": "dpp_534",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Gravitation",
    "questions": [
      126112,
      126113,
      126114,
      126115,
      126116,
      126117,
      126118,
      126119,
      126120,
      126121
    ]
  },
  {
    "id": "dpp_535",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Gravitation",
    "questions": [
      126122,
      126123,
      126124,
      126125,
      126126,
      126127,
      126128,
      126129,
      126130,
      126131
    ]
  },
  {
    "id": "dpp_536",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Kinetic Theory of Gases",
    "questions": [
      126132,
      126133,
      126134,
      126135,
      126136,
      126137,
      126138,
      126139,
      126140,
      126141
    ]
  },
  {
    "id": "dpp_537",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Kinetic Theory of Gases",
    "questions": [
      126142,
      126143,
      126144,
      126145,
      126146,
      126147,
      126148,
      126149,
      126150,
      126151
    ]
  },
  {
    "id": "dpp_538",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Kinetic Theory of Gases",
    "questions": [
      126152,
      126153,
      126154,
      126155,
      126156,
      126157,
      126158,
      126159,
      126160,
      126161
    ]
  },
  {
    "id": "dpp_539",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Kinetic Theory of Gases",
    "questions": [
      126162,
      126163,
      126164,
      126165,
      126166,
      126167,
      126168,
      126169,
      126170,
      126171
    ]
  },
  {
    "id": "dpp_540",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Kinetic Theory of Gases",
    "questions": [
      126172,
      126173,
      126174,
      126175,
      126176,
      126177,
      126178,
      126179,
      126180,
      126181
    ]
  },
  {
    "id": "dpp_541",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Kinetic Theory of Gases",
    "questions": [
      126182,
      126183,
      126184,
      126185,
      126186,
      126187,
      126188,
      126189,
      126190,
      126191
    ]
  },
  {
    "id": "dpp_542",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Kinetic Theory of Gases",
    "questions": [
      126192,
      126193,
      126194,
      126195,
      126196,
      126197,
      126198,
      126199,
      126200,
      126201
    ]
  },
  {
    "id": "dpp_543",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Kinetic Theory of Gases",
    "questions": [
      126202,
      126203,
      126204,
      126205,
      126206,
      126207,
      126208,
      126209,
      126210,
      126211
    ]
  },
  {
    "id": "dpp_544",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Laws of Motion",
    "questions": [
      126212,
      126213,
      126214,
      126215,
      126216,
      126217,
      126218,
      126219,
      126220,
      126221
    ]
  },
  {
    "id": "dpp_545",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Laws of Motion",
    "questions": [
      126222,
      126223,
      126224,
      126225,
      126226,
      126227,
      126228,
      126229,
      126230,
      126231
    ]
  },
  {
    "id": "dpp_546",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Laws of Motion",
    "questions": [
      126232,
      126233,
      126234,
      126235,
      126236,
      126237,
      126238,
      126239,
      126240,
      126241
    ]
  },
  {
    "id": "dpp_547",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Laws of Motion",
    "questions": [
      126242,
      126243,
      126244,
      126245,
      126246,
      126247,
      126248,
      126249,
      126250,
      126251
    ]
  },
  {
    "id": "dpp_548",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Laws of Motion",
    "questions": [
      126252,
      126253,
      126254,
      126255,
      126256,
      126257,
      126258,
      126259,
      126260,
      126261
    ]
  },
  {
    "id": "dpp_549",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Laws of Motion",
    "questions": [
      126262,
      126263,
      126264,
      126265,
      126266,
      126267,
      126268,
      126269,
      126270,
      126271
    ]
  },
  {
    "id": "dpp_550",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Laws of Motion",
    "questions": [
      126272,
      126273,
      126274,
      126275,
      126276,
      126277,
      126278,
      126279,
      126280,
      126281
    ]
  },
  {
    "id": "dpp_551",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Laws of Motion",
    "questions": [
      126282,
      126283,
      126284,
      126285,
      126286,
      126287,
      126288,
      126289,
      126290,
      126291
    ]
  },
  {
    "id": "dpp_552",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Laws of Motion",
    "questions": [
      126292,
      126293,
      126294,
      126295,
      126296,
      126297,
      126298,
      126299,
      126300,
      126301
    ]
  },
  {
    "id": "dpp_553",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Effects of Current",
    "questions": [
      126302,
      126303,
      126304,
      126305,
      126306,
      126307,
      126308,
      126309,
      126310,
      126311
    ]
  },
  {
    "id": "dpp_554",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Effects of Current",
    "questions": [
      126312,
      126313,
      126314,
      126315,
      126316,
      126317,
      126318,
      126319,
      126320,
      126321
    ]
  },
  {
    "id": "dpp_555",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Effects of Current",
    "questions": [
      126322,
      126323,
      126324,
      126325,
      126326,
      126327,
      126328,
      126329,
      126330,
      126331
    ]
  },
  {
    "id": "dpp_556",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Effects of Current",
    "questions": [
      126332,
      126333,
      126334,
      126335,
      126336,
      126337,
      126338,
      126339,
      126340,
      126341
    ]
  },
  {
    "id": "dpp_557",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Effects of Current",
    "questions": [
      126342,
      126343,
      126344,
      126345,
      126346,
      126347,
      126348,
      126349,
      126350,
      126351
    ]
  },
  {
    "id": "dpp_558",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Effects of Current",
    "questions": [
      126352,
      126353,
      126354,
      126355,
      126356,
      126357,
      126358,
      126359,
      126360,
      126361
    ]
  },
  {
    "id": "dpp_559",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Effects of Current",
    "questions": [
      126362,
      126363,
      126364,
      126365,
      126366,
      126367,
      126368,
      126369,
      126370,
      126371
    ]
  },
  {
    "id": "dpp_560",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Effects of Current",
    "questions": [
      126372,
      126373,
      126374,
      126375,
      126376,
      126377,
      126378,
      126379,
      126380,
      126381
    ]
  },
  {
    "id": "dpp_561",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Effects of Current",
    "questions": [
      126382,
      126383,
      126384,
      126385,
      126386,
      126387,
      126388,
      126389,
      126390,
      126391
    ]
  },
  {
    "id": "dpp_562",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Properties of Matter",
    "questions": [
      126392,
      126393,
      126394,
      126395,
      126396,
      126397,
      126398,
      126399,
      126400,
      126401
    ]
  },
  {
    "id": "dpp_563",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Properties of Matter",
    "questions": [
      126402,
      126403,
      126404,
      126405,
      126406,
      126407,
      126408,
      126409,
      126410,
      126411
    ]
  },
  {
    "id": "dpp_564",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Properties of Matter",
    "questions": [
      126412,
      126413,
      126414,
      126415,
      126416,
      126417,
      126418,
      126419,
      126420,
      126421
    ]
  },
  {
    "id": "dpp_565",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Properties of Matter",
    "questions": [
      126422,
      126423,
      126424,
      126425,
      126426,
      126427,
      126428,
      126429,
      126430,
      126431
    ]
  },
  {
    "id": "dpp_566",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Properties of Matter",
    "questions": [
      126432,
      126433,
      126434,
      126435,
      126436,
      126437,
      126438,
      126439,
      126440,
      126441
    ]
  },
  {
    "id": "dpp_567",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Properties of Matter",
    "questions": [
      126442,
      126443,
      126444,
      126445,
      126446,
      126447,
      126448,
      126449,
      126450,
      126451
    ]
  },
  {
    "id": "dpp_568",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Properties of Matter",
    "questions": [
      126452,
      126453,
      126454,
      126455,
      126456,
      126457,
      126458,
      126459,
      126460,
      126461
    ]
  },
  {
    "id": "dpp_569",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Properties of Matter",
    "questions": [
      126462,
      126463,
      126464,
      126465,
      126466,
      126467,
      126468,
      126469,
      126470,
      126471
    ]
  },
  {
    "id": "dpp_570",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Magnetic Properties of Matter",
    "questions": [
      126472,
      126473,
      126474,
      126475,
      126476,
      126477,
      126478,
      126479,
      126480,
      126481
    ]
  },
  {
    "id": "dpp_571",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Mathematics in Physics",
    "questions": [
      126482,
      126483,
      126484,
      126485,
      126486,
      126487,
      126488,
      126489,
      126490,
      126491
    ]
  },
  {
    "id": "dpp_572",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Mathematics in Physics",
    "questions": [
      126492,
      126493,
      126494,
      126495,
      126496,
      126497,
      126498,
      126499,
      126500,
      126501
    ]
  },
  {
    "id": "dpp_573",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Mathematics in Physics",
    "questions": [
      126502,
      126503,
      126504,
      126505,
      126506,
      126507,
      126508,
      126509,
      126510,
      126511
    ]
  },
  {
    "id": "dpp_574",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Mathematics in Physics",
    "questions": [
      126512,
      126513,
      126514,
      126515,
      126516,
      126517,
      126518,
      126519,
      126520,
      126521
    ]
  },
  {
    "id": "dpp_575",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Mathematics in Physics",
    "questions": [
      126522,
      126523,
      126524,
      126525,
      126526,
      126527,
      126528,
      126529,
      126530,
      126531
    ]
  },
  {
    "id": "dpp_576",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Mathematics in Physics",
    "questions": [
      126532,
      126533,
      126534,
      126535,
      126536,
      126537,
      126538,
      126539,
      126540,
      126541
    ]
  },
  {
    "id": "dpp_577",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Mathematics in Physics",
    "questions": [
      126542,
      126543,
      126544,
      126545,
      126546,
      126547,
      126548,
      126549,
      126550,
      126551
    ]
  },
  {
    "id": "dpp_578",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Mathematics in Physics",
    "questions": [
      126552,
      126553,
      126554,
      126555,
      126556,
      126557,
      126558,
      126559,
      126560,
      126561
    ]
  },
  {
    "id": "dpp_579",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Mathematics in Physics",
    "questions": [
      126562,
      126563,
      126564,
      126565,
      126566,
      126567,
      126568,
      126569,
      126570,
      126571
    ]
  },
  {
    "id": "dpp_580",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Fluids",
    "questions": [
      126572,
      126573,
      126574,
      126575,
      126576,
      126577,
      126578,
      126579,
      126580,
      126581
    ]
  },
  {
    "id": "dpp_581",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Fluids",
    "questions": [
      126582,
      126583,
      126584,
      126585,
      126586,
      126587,
      126588,
      126589,
      126590,
      126591
    ]
  },
  {
    "id": "dpp_582",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Fluids",
    "questions": [
      126592,
      126593,
      126594,
      126595,
      126596,
      126597,
      126598,
      126599,
      126600,
      126601
    ]
  },
  {
    "id": "dpp_583",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Fluids",
    "questions": [
      126602,
      126603,
      126604,
      126605,
      126606,
      126607,
      126608,
      126609,
      126610,
      126611
    ]
  },
  {
    "id": "dpp_584",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Fluids",
    "questions": [
      126612,
      126613,
      126614,
      126615,
      126616,
      126617,
      126618,
      126619,
      126620,
      126621
    ]
  },
  {
    "id": "dpp_585",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Fluids",
    "questions": [
      126622,
      126623,
      126624,
      126625,
      126626,
      126627,
      126628,
      126629,
      126630,
      126631
    ]
  },
  {
    "id": "dpp_586",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Fluids",
    "questions": [
      126632,
      126633,
      126634,
      126635,
      126636,
      126637,
      126638,
      126639,
      126640,
      126641
    ]
  },
  {
    "id": "dpp_587",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Fluids",
    "questions": [
      126642,
      126643,
      126644,
      126645,
      126646,
      126647,
      126648,
      126649,
      126650,
      126651
    ]
  },
  {
    "id": "dpp_588",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Solids",
    "questions": [
      126652,
      126653,
      126654,
      126655,
      126656,
      126657,
      126658,
      126659,
      126660,
      126661
    ]
  },
  {
    "id": "dpp_589",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Solids",
    "questions": [
      126662,
      126663,
      126664,
      126665,
      126666,
      126667,
      126668,
      126669,
      126670,
      126671
    ]
  },
  {
    "id": "dpp_590",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Solids",
    "questions": [
      126672,
      126673,
      126674,
      126675,
      126676,
      126677,
      126678,
      126679,
      126680,
      126681
    ]
  },
  {
    "id": "dpp_591",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Solids",
    "questions": [
      126682,
      126683,
      126684,
      126685,
      126686,
      126687,
      126688,
      126689,
      126690,
      126691
    ]
  },
  {
    "id": "dpp_592",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Solids",
    "questions": [
      126692,
      126693,
      126694,
      126695,
      126696,
      126697,
      126698,
      126699,
      126700,
      126701
    ]
  },
  {
    "id": "dpp_593",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Solids",
    "questions": [
      126702,
      126703,
      126704,
      126705,
      126706,
      126707,
      126708,
      126709,
      126710,
      126711
    ]
  },
  {
    "id": "dpp_594",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Solids",
    "questions": [
      126712,
      126713,
      126714,
      126715,
      126716,
      126717,
      126718,
      126719,
      126720,
      126721
    ]
  },
  {
    "id": "dpp_595",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Solids",
    "questions": [
      126722,
      126723,
      126724,
      126725,
      126726,
      126727,
      126728,
      126729,
      126730,
      126731
    ]
  },
  {
    "id": "dpp_596",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Mechanical Properties of Solids",
    "questions": [
      126732,
      126733,
      126734,
      126735,
      126736,
      126737,
      126738,
      126739,
      126740,
      126741
    ]
  },
  {
    "id": "dpp_597",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In One Dimension",
    "questions": [
      126742,
      126743,
      126744,
      126745,
      126746,
      126747,
      126748,
      126749,
      126750,
      126751
    ]
  },
  {
    "id": "dpp_598",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In One Dimension",
    "questions": [
      126752,
      126753,
      126754,
      126755,
      126756,
      126757,
      126758,
      126759,
      126760,
      126761
    ]
  },
  {
    "id": "dpp_599",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In One Dimension",
    "questions": [
      126762,
      126763,
      126764,
      126765,
      126766,
      126767,
      126768,
      126769,
      126770,
      126771
    ]
  },
  {
    "id": "dpp_600",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In One Dimension",
    "questions": [
      126772,
      126773,
      126774,
      126775,
      126776,
      126777,
      126778,
      126779,
      126780,
      126781
    ]
  },
  {
    "id": "dpp_601",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In One Dimension",
    "questions": [
      126782,
      126783,
      126784,
      126785,
      126786,
      126787,
      126788,
      126789,
      126790,
      126791
    ]
  },
  {
    "id": "dpp_602",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In One Dimension",
    "questions": [
      126792,
      126793,
      126794,
      126795,
      126796,
      126797,
      126798,
      126799,
      126800,
      126801
    ]
  },
  {
    "id": "dpp_603",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In One Dimension",
    "questions": [
      126802,
      126803,
      126804,
      126805,
      126806,
      126807,
      126808,
      126809,
      126810,
      126811
    ]
  },
  {
    "id": "dpp_604",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In One Dimension",
    "questions": [
      126812,
      126813,
      126814,
      126815,
      126816,
      126817,
      126818,
      126819,
      126820,
      126821
    ]
  },
  {
    "id": "dpp_605",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In One Dimension",
    "questions": [
      126822,
      126823,
      126824,
      126825,
      126826,
      126827,
      126828,
      126829,
      126830,
      126831
    ]
  },
  {
    "id": "dpp_606",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In Two Dimensions",
    "questions": [
      126832,
      126833,
      126834,
      126835,
      126836,
      126837,
      126838,
      126839,
      126840,
      126841
    ]
  },
  {
    "id": "dpp_607",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In Two Dimensions",
    "questions": [
      126842,
      126843,
      126844,
      126845,
      126846,
      126847,
      126848,
      126849,
      126850,
      126851
    ]
  },
  {
    "id": "dpp_608",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In Two Dimensions",
    "questions": [
      126852,
      126853,
      126854,
      126855,
      126856,
      126857,
      126858,
      126859,
      126860,
      126861
    ]
  },
  {
    "id": "dpp_609",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In Two Dimensions",
    "questions": [
      126862,
      126863,
      126864,
      126865,
      126866,
      126867,
      126868,
      126869,
      126870,
      126871
    ]
  },
  {
    "id": "dpp_610",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In Two Dimensions",
    "questions": [
      126872,
      126873,
      126874,
      126875,
      126876,
      126877,
      126878,
      126879,
      126880,
      126881
    ]
  },
  {
    "id": "dpp_611",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In Two Dimensions",
    "questions": [
      126882,
      126883,
      126884,
      126885,
      126886,
      126887,
      126888,
      126889,
      126890,
      126891
    ]
  },
  {
    "id": "dpp_612",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In Two Dimensions",
    "questions": [
      126892,
      126893,
      126894,
      126895,
      126896,
      126897,
      126898,
      126899,
      126900,
      126901
    ]
  },
  {
    "id": "dpp_613",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In Two Dimensions",
    "questions": [
      126902,
      126903,
      126904,
      126905,
      126906,
      126907,
      126908,
      126909,
      126910,
      126911
    ]
  },
  {
    "id": "dpp_614",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Motion In Two Dimensions",
    "questions": [
      126912,
      126913,
      126914,
      126915,
      126916,
      126917,
      126918,
      126919,
      126920,
      126921
    ]
  },
  {
    "id": "dpp_615",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Nuclear Physics",
    "questions": [
      126922,
      126923,
      126924,
      126925,
      126926,
      126927,
      126928,
      126929,
      126930,
      126931
    ]
  },
  {
    "id": "dpp_616",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Nuclear Physics",
    "questions": [
      126932,
      126933,
      126934,
      126935,
      126936,
      126937,
      126938,
      126939,
      126940,
      126941
    ]
  },
  {
    "id": "dpp_617",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Nuclear Physics",
    "questions": [
      126942,
      126943,
      126944,
      126945,
      126946,
      126947,
      126948,
      126949,
      126950,
      126951
    ]
  },
  {
    "id": "dpp_618",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Nuclear Physics",
    "questions": [
      126952,
      126953,
      126954,
      126955,
      126956,
      126957,
      126958,
      126959,
      126960,
      126961
    ]
  },
  {
    "id": "dpp_619",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Nuclear Physics",
    "questions": [
      126962,
      126963,
      126964,
      126965,
      126966,
      126967,
      126968,
      126969,
      126970,
      126971
    ]
  },
  {
    "id": "dpp_620",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Nuclear Physics",
    "questions": [
      126972,
      126973,
      126974,
      126975,
      126976,
      126977,
      126978,
      126979,
      126980,
      126981
    ]
  },
  {
    "id": "dpp_621",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Oscillations",
    "questions": [
      126982,
      126983,
      126984,
      126985,
      126986,
      126987,
      126988,
      126989,
      126990,
      126991
    ]
  },
  {
    "id": "dpp_622",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Oscillations",
    "questions": [
      126992,
      126993,
      126994,
      126995,
      126996,
      126997,
      126998,
      126999,
      127000,
      127001
    ]
  },
  {
    "id": "dpp_623",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Oscillations",
    "questions": [
      127002,
      127003,
      127004,
      127005,
      127006,
      127007,
      127008,
      127009,
      127010,
      127011
    ]
  },
  {
    "id": "dpp_624",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Oscillations",
    "questions": [
      127012,
      127013,
      127014,
      127015,
      127016,
      127017,
      127018,
      127019,
      127020,
      127021
    ]
  },
  {
    "id": "dpp_625",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Oscillations",
    "questions": [
      127022,
      127023,
      127024,
      127025,
      127026,
      127027,
      127028,
      127029,
      127030,
      127031
    ]
  },
  {
    "id": "dpp_626",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Oscillations",
    "questions": [
      127032,
      127033,
      127034,
      127035,
      127036,
      127037,
      127038,
      127039,
      127040,
      127041
    ]
  },
  {
    "id": "dpp_627",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Oscillations",
    "questions": [
      127042,
      127043,
      127044,
      127045,
      127046,
      127047,
      127048,
      127049,
      127050,
      127051
    ]
  },
  {
    "id": "dpp_628",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Oscillations",
    "questions": [
      127052,
      127053,
      127054,
      127055,
      127056,
      127057,
      127058,
      127059,
      127060,
      127061
    ]
  },
  {
    "id": "dpp_629",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Oscillations",
    "questions": [
      127062,
      127063,
      127064,
      127065,
      127066,
      127067,
      127068,
      127069,
      127070,
      127071
    ]
  },
  {
    "id": "dpp_630",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Ray Optics",
    "questions": [
      127072,
      127073,
      127074,
      127075,
      127076,
      127077,
      127078,
      127079,
      127080,
      127081
    ]
  },
  {
    "id": "dpp_631",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Ray Optics",
    "questions": [
      127082,
      127083,
      127084,
      127085,
      127086,
      127087,
      127088,
      127089,
      127090,
      127091
    ]
  },
  {
    "id": "dpp_632",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Ray Optics",
    "questions": [
      127092,
      127093,
      127094,
      127095,
      127096,
      127097,
      127098,
      127099,
      127100,
      127101
    ]
  },
  {
    "id": "dpp_633",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Ray Optics",
    "questions": [
      127102,
      127103,
      127104,
      127105,
      127106,
      127107,
      127108,
      127109,
      127110,
      127111
    ]
  },
  {
    "id": "dpp_634",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Ray Optics",
    "questions": [
      127112,
      127113,
      127114,
      127115,
      127116,
      127117,
      127118,
      127119,
      127120,
      127121
    ]
  },
  {
    "id": "dpp_635",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Ray Optics",
    "questions": [
      127122,
      127123,
      127124,
      127125,
      127126,
      127127,
      127128,
      127129,
      127130,
      127131
    ]
  },
  {
    "id": "dpp_636",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Ray Optics",
    "questions": [
      127132,
      127133,
      127134,
      127135,
      127136,
      127137,
      127138,
      127139,
      127140,
      127141
    ]
  },
  {
    "id": "dpp_637",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Ray Optics",
    "questions": [
      127142,
      127143,
      127144,
      127145,
      127146,
      127147,
      127148,
      127149,
      127150,
      127151
    ]
  },
  {
    "id": "dpp_638",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Rotational Motion",
    "questions": [
      127152,
      127153,
      127154,
      127155,
      127156,
      127157,
      127158,
      127159,
      127160,
      127161
    ]
  },
  {
    "id": "dpp_639",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Rotational Motion",
    "questions": [
      127162,
      127163,
      127164,
      127165,
      127166,
      127167,
      127168,
      127169,
      127170,
      127171
    ]
  },
  {
    "id": "dpp_640",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Rotational Motion",
    "questions": [
      127172,
      127173,
      127174,
      127175,
      127176,
      127177,
      127178,
      127179,
      127180,
      127181
    ]
  },
  {
    "id": "dpp_641",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Rotational Motion",
    "questions": [
      127182,
      127183,
      127184,
      127185,
      127186,
      127187,
      127188,
      127189,
      127190,
      127191
    ]
  },
  {
    "id": "dpp_642",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Rotational Motion",
    "questions": [
      127192,
      127193,
      127194,
      127195,
      127196,
      127197,
      127198,
      127199,
      127200,
      127201
    ]
  },
  {
    "id": "dpp_643",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Rotational Motion",
    "questions": [
      127202,
      127203,
      127204,
      127205,
      127206,
      127207,
      127208,
      127209,
      127210,
      127211
    ]
  },
  {
    "id": "dpp_644",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Rotational Motion",
    "questions": [
      127212,
      127213,
      127214,
      127215,
      127216,
      127217,
      127218,
      127219,
      127220,
      127221
    ]
  },
  {
    "id": "dpp_645",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Rotational Motion",
    "questions": [
      127222,
      127223,
      127224,
      127225,
      127226,
      127227,
      127228,
      127229,
      127230,
      127231
    ]
  },
  {
    "id": "dpp_646",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Rotational Motion",
    "questions": [
      127232,
      127233,
      127234,
      127235,
      127236,
      127237,
      127238,
      127239,
      127240,
      127241
    ]
  },
  {
    "id": "dpp_647",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Semiconductors",
    "questions": [
      127242,
      127243,
      127244,
      127245,
      127246,
      127247,
      127248,
      127249,
      127250,
      127251
    ]
  },
  {
    "id": "dpp_648",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Semiconductors",
    "questions": [
      127252,
      127253,
      127254,
      127255,
      127256,
      127257,
      127258,
      127259,
      127260,
      127261
    ]
  },
  {
    "id": "dpp_649",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Semiconductors",
    "questions": [
      127262,
      127263,
      127264,
      127265,
      127266,
      127267,
      127268,
      127269,
      127270,
      127271
    ]
  },
  {
    "id": "dpp_650",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Semiconductors",
    "questions": [
      127272,
      127273,
      127274,
      127275,
      127276,
      127277,
      127278,
      127279,
      127280,
      127281
    ]
  },
  {
    "id": "dpp_651",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Semiconductors",
    "questions": [
      127282,
      127283,
      127284,
      127285,
      127286,
      127287,
      127288,
      127289,
      127290,
      127291
    ]
  },
  {
    "id": "dpp_652",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Semiconductors",
    "questions": [
      127292,
      127293,
      127294,
      127295,
      127296,
      127297,
      127298,
      127299,
      127300,
      127301
    ]
  },
  {
    "id": "dpp_653",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermal Properties of Matter",
    "questions": [
      127302,
      127303,
      127304,
      127305,
      127306,
      127307,
      127308,
      127309,
      127310,
      127311
    ]
  },
  {
    "id": "dpp_654",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermal Properties of Matter",
    "questions": [
      127312,
      127313,
      127314,
      127315,
      127316,
      127317,
      127318,
      127319,
      127320,
      127321
    ]
  },
  {
    "id": "dpp_655",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermal Properties of Matter",
    "questions": [
      127322,
      127323,
      127324,
      127325,
      127326,
      127327,
      127328,
      127329,
      127330,
      127331
    ]
  },
  {
    "id": "dpp_656",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermal Properties of Matter",
    "questions": [
      127332,
      127333,
      127334,
      127335,
      127336,
      127337,
      127338,
      127339,
      127340,
      127341
    ]
  },
  {
    "id": "dpp_657",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermal Properties of Matter",
    "questions": [
      127342,
      127343,
      127344,
      127345,
      127346,
      127347,
      127348,
      127349,
      127350,
      127351
    ]
  },
  {
    "id": "dpp_658",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermal Properties of Matter",
    "questions": [
      127352,
      127353,
      127354,
      127355,
      127356,
      127357,
      127358,
      127359,
      127360,
      127361
    ]
  },
  {
    "id": "dpp_659",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermal Properties of Matter",
    "questions": [
      127362,
      127363,
      127364,
      127365,
      127366,
      127367,
      127368,
      127369,
      127370,
      127371
    ]
  },
  {
    "id": "dpp_660",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermal Properties of Matter",
    "questions": [
      127372,
      127373,
      127374,
      127375,
      127376,
      127377,
      127378,
      127379,
      127380,
      127381
    ]
  },
  {
    "id": "dpp_661",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermodynamics",
    "questions": [
      127382,
      127383,
      127384,
      127385,
      127386,
      127387,
      127388,
      127389,
      127390,
      127391
    ]
  },
  {
    "id": "dpp_662",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermodynamics",
    "questions": [
      127392,
      127393,
      127394,
      127395,
      127396,
      127397,
      127398,
      127399,
      127400,
      127401
    ]
  },
  {
    "id": "dpp_663",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermodynamics",
    "questions": [
      127402,
      127403,
      127404,
      127405,
      127406,
      127407,
      127408,
      127409,
      127410,
      127411
    ]
  },
  {
    "id": "dpp_664",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermodynamics",
    "questions": [
      127412,
      127413,
      127414,
      127415,
      127416,
      127417,
      127418,
      127419,
      127420,
      127421
    ]
  },
  {
    "id": "dpp_665",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermodynamics",
    "questions": [
      127422,
      127423,
      127424,
      127425,
      127426,
      127427,
      127428,
      127429,
      127430,
      127431
    ]
  },
  {
    "id": "dpp_666",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermodynamics",
    "questions": [
      127432,
      127433,
      127434,
      127435,
      127436,
      127437,
      127438,
      127439,
      127440,
      127441
    ]
  },
  {
    "id": "dpp_667",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermodynamics",
    "questions": [
      127442,
      127443,
      127444,
      127445,
      127446,
      127447,
      127448,
      127449,
      127450,
      127451
    ]
  },
  {
    "id": "dpp_668",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermodynamics",
    "questions": [
      127452,
      127453,
      127454,
      127455,
      127456,
      127457,
      127458,
      127459,
      127460,
      127461
    ]
  },
  {
    "id": "dpp_669",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Thermodynamics",
    "questions": [
      127462,
      127463,
      127464,
      127465,
      127466,
      127467,
      127468,
      127469,
      127470,
      127471
    ]
  },
  {
    "id": "dpp_670",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Units and Dimensions",
    "questions": [
      127472,
      127473,
      127474,
      127475,
      127476,
      127477,
      127478,
      127479,
      127480,
      127481
    ]
  },
  {
    "id": "dpp_671",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Units and Dimensions",
    "questions": [
      127482,
      127483,
      127484,
      127485,
      127486,
      127487,
      127488,
      127489,
      127490,
      127491
    ]
  },
  {
    "id": "dpp_672",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Units and Dimensions",
    "questions": [
      127492,
      127493,
      127494,
      127495,
      127496,
      127497,
      127498,
      127499,
      127500,
      127501
    ]
  },
  {
    "id": "dpp_673",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Units and Dimensions",
    "questions": [
      127502,
      127503,
      127504,
      127505,
      127506,
      127507,
      127508,
      127509,
      127510,
      127511
    ]
  },
  {
    "id": "dpp_674",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Units and Dimensions",
    "questions": [
      127512,
      127513,
      127514,
      127515,
      127516,
      127517,
      127518,
      127519,
      127520,
      127521
    ]
  },
  {
    "id": "dpp_675",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Units and Dimensions",
    "questions": [
      127522,
      127523,
      127524,
      127525,
      127526,
      127527,
      127528,
      127529,
      127530,
      127531
    ]
  },
  {
    "id": "dpp_676",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Units and Dimensions",
    "questions": [
      127532,
      127533,
      127534,
      127535,
      127536,
      127537,
      127538,
      127539,
      127540,
      127541
    ]
  },
  {
    "id": "dpp_677",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Units and Dimensions",
    "questions": [
      127542,
      127543,
      127544,
      127545,
      127546,
      127547,
      127548,
      127549,
      127550,
      127551
    ]
  },
  {
    "id": "dpp_678",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Units and Dimensions",
    "questions": [
      127552,
      127553,
      127554,
      127555,
      127556,
      127557,
      127558,
      127559,
      127560,
      127561
    ]
  },
  {
    "id": "dpp_679",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Wave Optics",
    "questions": [
      127562,
      127563,
      127564,
      127565,
      127566,
      127567,
      127568,
      127569,
      127570,
      127571
    ]
  },
  {
    "id": "dpp_680",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Wave Optics",
    "questions": [
      127572,
      127573,
      127574,
      127575,
      127576,
      127577,
      127578,
      127579,
      127580,
      127581
    ]
  },
  {
    "id": "dpp_681",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Wave Optics",
    "questions": [
      127582,
      127583,
      127584,
      127585,
      127586,
      127587,
      127588,
      127589,
      127590,
      127591
    ]
  },
  {
    "id": "dpp_682",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Wave Optics",
    "questions": [
      127592,
      127593,
      127594,
      127595,
      127596,
      127597,
      127598,
      127599,
      127600,
      127601
    ]
  },
  {
    "id": "dpp_683",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Wave Optics",
    "questions": [
      127602,
      127603,
      127604,
      127605,
      127606,
      127607,
      127608,
      127609,
      127610,
      127611
    ]
  },
  {
    "id": "dpp_684",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Wave Optics",
    "questions": [
      127612,
      127613,
      127614,
      127615,
      127616,
      127617,
      127618,
      127619,
      127620,
      127621
    ]
  },
  {
    "id": "dpp_685",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Wave Optics",
    "questions": [
      127622,
      127623,
      127624,
      127625,
      127626,
      127627,
      127628,
      127629,
      127630,
      127631
    ]
  },
  {
    "id": "dpp_686",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Wave Optics",
    "questions": [
      127632,
      127633,
      127634,
      127635,
      127636,
      127637,
      127638,
      127639,
      127640,
      127641
    ]
  },
  {
    "id": "dpp_687",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Waves and Sound",
    "questions": [
      127642,
      127643,
      127644,
      127645,
      127646,
      127647,
      127648,
      127649,
      127650,
      127651
    ]
  },
  {
    "id": "dpp_688",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Waves and Sound",
    "questions": [
      127652,
      127653,
      127654,
      127655,
      127656,
      127657,
      127658,
      127659,
      127660,
      127661
    ]
  },
  {
    "id": "dpp_689",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Waves and Sound",
    "questions": [
      127662,
      127663,
      127664,
      127665,
      127666,
      127667,
      127668,
      127669,
      127670,
      127671
    ]
  },
  {
    "id": "dpp_690",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Waves and Sound",
    "questions": [
      127672,
      127673,
      127674,
      127675,
      127676,
      127677,
      127678,
      127679,
      127680,
      127681
    ]
  },
  {
    "id": "dpp_691",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Waves and Sound",
    "questions": [
      127682,
      127683,
      127684,
      127685,
      127686,
      127687,
      127688,
      127689,
      127690,
      127691
    ]
  },
  {
    "id": "dpp_692",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Waves and Sound",
    "questions": [
      127692,
      127693,
      127694,
      127695,
      127696,
      127697,
      127698,
      127699,
      127700,
      127701
    ]
  },
  {
    "id": "dpp_693",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Waves and Sound",
    "questions": [
      127702,
      127703,
      127704,
      127705,
      127706,
      127707,
      127708,
      127709,
      127710,
      127711
    ]
  },
  {
    "id": "dpp_694",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Waves and Sound",
    "questions": [
      127712,
      127713,
      127714,
      127715,
      127716,
      127717,
      127718,
      127719,
      127720,
      127721
    ]
  },
  {
    "id": "dpp_695",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Waves and Sound",
    "questions": [
      127722,
      127723,
      127724,
      127725,
      127726,
      127727,
      127728,
      127729,
      127730,
      127731
    ]
  },
  {
    "id": "dpp_696",
    "title": "Physics — Easy DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Work Power Energy",
    "questions": [
      127732,
      127733,
      127734,
      127735,
      127736,
      127737,
      127738,
      127739,
      127740,
      127741
    ]
  },
  {
    "id": "dpp_697",
    "title": "Physics — Easy DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Work Power Energy",
    "questions": [
      127742,
      127743,
      127744,
      127745,
      127746,
      127747,
      127748,
      127749,
      127750,
      127751
    ]
  },
  {
    "id": "dpp_698",
    "title": "Physics — Easy DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Work Power Energy",
    "questions": [
      127752,
      127753,
      127754,
      127755,
      127756,
      127757,
      127758,
      127759,
      127760,
      127761
    ]
  },
  {
    "id": "dpp_699",
    "title": "Physics — Moderate DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Work Power Energy",
    "questions": [
      127762,
      127763,
      127764,
      127765,
      127766,
      127767,
      127768,
      127769,
      127770,
      127771
    ]
  },
  {
    "id": "dpp_700",
    "title": "Physics — Moderate DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Work Power Energy",
    "questions": [
      127772,
      127773,
      127774,
      127775,
      127776,
      127777,
      127778,
      127779,
      127780,
      127781
    ]
  },
  {
    "id": "dpp_701",
    "title": "Physics — Moderate DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Work Power Energy",
    "questions": [
      127782,
      127783,
      127784,
      127785,
      127786,
      127787,
      127788,
      127789,
      127790,
      127791
    ]
  },
  {
    "id": "dpp_702",
    "title": "Physics — Tough DPP 1",
    "date": "",
    "subject": "Physics",
    "chapter": "Work Power Energy",
    "questions": [
      127792,
      127793,
      127794,
      127795,
      127796,
      127797,
      127798,
      127799,
      127800,
      127801
    ]
  },
  {
    "id": "dpp_703",
    "title": "Physics — Tough DPP 2",
    "date": "",
    "subject": "Physics",
    "chapter": "Work Power Energy",
    "questions": [
      127802,
      127803,
      127804,
      127805,
      127806,
      127807,
      127808,
      127809,
      127810,
      127811
    ]
  },
  {
    "id": "dpp_704",
    "title": "Physics — Tough DPP 3",
    "date": "",
    "subject": "Physics",
    "chapter": "Work Power Energy",
    "questions": [
      127812,
      127813,
      127814,
      127815,
      127816,
      127817,
      127818,
      127819,
      127820,
      127821
    ]
  }
];

function _syncDb() {
  try {
    const user = JSON.parse(localStorage.getItem("quantrex_user") || "null");
    if (user && user.uid && typeof QuantrexDB !== "undefined") QuantrexDB.persist(user.uid);
  } catch (e) {}
}
const STATE = {
  get exam() { return localStorage.getItem("quantrex_exam") || "Engineering"; },
  set exam(v) { localStorage.setItem("quantrex_exam", v); _banksLoaded = {}; _currentBankSlug = null; localStorage.removeItem("quantrex_bank"); QUESTIONS = []; _syncDb(); },
  get bookmarks() {
    if (typeof QuantrexBookmarks !== "undefined") return QuantrexBookmarks.load().items.map(x => x.id);
    return JSON.parse(localStorage.getItem("quantrex_bookmarks") || "[]");
  },
  toggleBookmark(id, meta) {
    if (typeof QuantrexBookmarks !== "undefined") { QuantrexBookmarks.toggle(id, meta); _syncDb(); return; }
    const b = JSON.parse(localStorage.getItem("quantrex_bookmarks") || "[]");
    const i = b.indexOf(id);
    if (i >= 0) b.splice(i, 1); else b.push(id);
    localStorage.setItem("quantrex_bookmarks", JSON.stringify(b));
    _syncDb();
  },
  get solved() { return JSON.parse(localStorage.getItem("quantrex_solved") || "[]"); },
  markSolved(id,correct) { const s=JSON.parse(localStorage.getItem("quantrex_solved")||"[]"); if(!s.find(x=>x.id===id))s.push({id,correct,date:Date.now()}); localStorage.setItem("quantrex_solved",JSON.stringify(s)); _syncDb(); if(typeof QuantrexLeaderboard!=="undefined")QuantrexLeaderboard.recordSolve(correct); },
  get notes() { return JSON.parse(localStorage.getItem("quantrex_notes") || "[]"); },
  addNote(text) { const n=this.notes; n.unshift({id:Date.now(),text,date:new Date().toLocaleString()}); localStorage.setItem("quantrex_notes",JSON.stringify(n)); _syncDb(); },
  deleteNote(id) { localStorage.setItem("quantrex_notes",JSON.stringify(this.notes.filter(x=>x.id!==id))); _syncDb(); }
};
let _bookNavCache = {};
let _bookChaptersLoaded = {};

async function fetchBookNav(bookId) {
  if (_bookNavCache[bookId]) return _bookNavCache[bookId];
  try {
    const res = await fetch(`data/nav/books/${bookId}.json`);
    if (!res.ok) throw new Error(res.status);
    _bookNavCache[bookId] = await res.json();
  } catch (e) {
    _bookNavCache[bookId] = null;
  }
  return _bookNavCache[bookId];
}

async function loadBookChapter(bookId, chapterKey) {
  const cacheKey = bookId + "::" + chapterKey;
  if (_bookChaptersLoaded[cacheKey]) {
    return QUESTIONS.filter(q => q._book === bookId && q._chapterKey === chapterKey);
  }
  const res = await fetch(`data/books/chapters/${bookId}/${chapterKey}.json`);
  if (!res.ok) return [];
  const data = await res.json();
  const qs = (data.questions || []).map(q => ({ ...q, _book: bookId, _bookId: bookId, _chapterKey: chapterKey }));
  QUESTIONS = QUESTIONS.filter(q => !(q._book === bookId && q._chapterKey === chapterKey)).concat(qs);
  _bookChaptersLoaded[cacheKey] = true;
  return qs;
}

function getBookQuestions(bookId, chapterKey) {
  return QUESTIONS.filter(q => q._book === bookId && q._chapterKey === chapterKey);
}

function getQ(id) {
  if (id == null || id === "") return null;
  let q = QUESTIONS.find(x => x.id === id);
  if (q) return q;
  if (typeof id === "string" && /^\d+$/.test(id)) q = QUESTIONS.find(x => x.id === Number(id));
  if (q) return q;
  if (typeof id === "number") q = QUESTIONS.find(x => Number(x.id) === id);
  if (q) return q;
  return QUESTIONS.find(x => String(x.id) === String(id)) || null;
}
