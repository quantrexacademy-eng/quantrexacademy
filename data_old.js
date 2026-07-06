// ============================================================
//  Quantrex App Clone — Data Layer
//  Real JEE/NEET-style questions, formulas, DPPs, chapters
// ============================================================

const EXAMS = {
  Engineering: { name: "JEE Main & Advanced", subjects: ["Physics", "Chemistry", "Mathematics"], color: "#1589EE" },
  Medical: { name: "NEET UG", subjects: ["Physics", "Chemistry", "Biology"], color: "#2bc48a" },
  Foundation: { name: "Class 9 & 10", subjects: ["Science", "Mathematics"], color: "#7c5ce7" }
};

// Chapter structure per subject
const CHAPTERS = {
  Physics: ["Units & Measurements", "Kinematics", "Laws of Motion", "Work Energy Power", "Rotational Motion", "Gravitation", "Thermodynamics", "Oscillations & Waves", "Electrostatics", "Current Electricity", "Magnetism", "Optics", "Modern Physics"],
  Chemistry: ["Some Basic Concepts", "Atomic Structure", "Periodic Table", "Chemical Bonding", "Thermodynamics", "Equilibrium", "Redox Reactions", "Organic Basics", "Hydrocarbons", "Solutions", "Electrochemistry", "Coordination Compounds"],
  Mathematics: ["Sets & Functions", "Trigonometry", "Complex Numbers", "Quadratic Equations", "Sequences & Series", "Limits & Derivatives", "Matrices & Determinants", "Integration", "Differential Equations", "Vectors", "3D Geometry", "Probability"],
  Biology: ["Cell Structure", "Plant Physiology", "Human Physiology", "Genetics", "Evolution", "Ecology", "Morphology of Plants", "Reproduction", "Biotechnology", "Human Health & Disease", "Biodiversity", "Animal Kingdom"],
  Science: ["Matter", "Atoms & Molecules", "Motion", "Force & Laws of Motion", "Light", "Electricity", "Sources of Energy"]
};

// ---- Real JEE/NEET style questions (PYQ pattern) ----
const QUESTIONS = [
  // ===== PHYSICS =====
  {
    id: 1, subject: "Physics", chapter: "Kinematics", exam: "Engineering",
    q: "A body is thrown vertically upward with velocity 20 m/s. How long will it take to reach the maximum height? (g = 10 m/s²)",
    options: ["1 s", "2 s", "3 s", "4 s"], answer: 1,
    solution: "At max height, v = 0. Using v = u − gt: 0 = 20 − 10t ⟹ t = 20/10 = 2 s.",
    difficulty: "Easy", source: "JEE Main 2021"
  },
  {
    id: 2, subject: "Physics", chapter: "Laws of Motion", exam: "Engineering",
    q: "A force of 10 N acts on a body of mass 2 kg. The acceleration produced is:",
    options: ["5 m/s²", "20 m/s²", "0.2 m/s²", "8 m/s²"], answer: 0,
    solution: "By Newton's 2nd Law: F = ma ⟹ a = F/m = 10/2 = 5 m/s².",
    difficulty: "Easy", source: "NEET 2020"
  },
  {
    id: 3, subject: "Physics", chapter: "Current Electricity", exam: "Engineering",
    q: "The resistance of a wire of length 2 m and area of cross-section 1 mm² is 4 Ω. The resistivity of the material is:",
    options: ["2 × 10⁻⁶ Ω·m", "2 × 10⁻⁷ Ω·m", "4 × 10⁻⁶ Ω·m", "1 × 10⁻⁶ Ω·m"], answer: 0,
    solution: "R = ρL/A ⟹ ρ = RA/L = (4)(1×10⁻⁶)/2 = 2 × 10⁻⁶ Ω·m.",
    difficulty: "Medium", source: "JEE Main 2019"
  },
  {
    id: 4, subject: "Physics", chapter: "Thermodynamics", exam: "Engineering",
    q: "In an isothermal process, the change in internal energy of an ideal gas is:",
    options: ["Positive", "Negative", "Zero", "Depends on volume"], answer: 2,
    solution: "For an ideal gas, internal energy depends only on temperature. In an isothermal process ΔT = 0, so ΔU = 0.",
    difficulty: "Medium", source: "NEET 2022"
  },
  {
    id: 5, subject: "Physics", chapter: "Modern Physics", exam: "Engineering",
    q: "The energy equivalent of 1 atomic mass unit (u) is approximately:",
    options: ["931 MeV", "511 keV", "13.6 eV", "1.6 MeV"], answer: 0,
    solution: "Using E = mc²: 1 u = 1.66×10⁻²⁷ kg ⟹ E = (1.66×10⁻²⁷)(3×10⁸)² ≈ 1.49×10⁻¹⁰ J ≈ 931 MeV.",
    difficulty: "Medium", source: "JEE Main 2020"
  },
  {
    id: 6, subject: "Physics", chapter: "Electrostatics", exam: "Engineering",
    q: "Two charges of +2 μC and −2 μC are placed 1 m apart. The dipole moment is:",
    options: ["1 μC·m", "2 μC·m", "4 μC·m", "0.5 μC·m"], answer: 1,
    solution: "Dipole moment p = q × 2a (where 2a is distance). p = (2 μC)(1 m) = 2 μC·m.",
    difficulty: "Easy", source: "JEE Main 2018"
  },

  // ===== CHEMISTRY =====
  {
    id: 7, subject: "Chemistry", chapter: "Atomic Structure", exam: "Engineering",
    q: "The maximum number of electrons in the M shell (n=3) of an atom is:",
    options: ["8", "18", "32", "2"], answer: 1,
    solution: "Max electrons in a shell = 2n². For n=3: 2(3)² = 18 electrons.",
    difficulty: "Easy", source: "NEET 2021"
  },
  {
    id: 8, subject: "Chemistry", chapter: "Chemical Bonding", exam: "Engineering",
    q: "The shape of a methane (CH₄) molecule is:",
    options: ["Tetrahedral", "Trigonal planar", "Linear", "Octahedral"], answer: 0,
    solution: "In CH₄, carbon undergoes sp³ hybridization forming 4 bonds at 109.5° — giving a tetrahedral geometry.",
    difficulty: "Easy", source: "JEE Main 2020"
  },
  {
    id: 9, subject: "Chemistry", chapter: "Equilibrium", exam: "Engineering",
    q: "For the reaction N₂ + 3H₂ ⇌ 2NH₃, adding more N₂ will:",
    options: ["Shift equilibrium left", "Shift equilibrium right (more NH₃)", "No change", "Stop the reaction"], answer: 1,
    solution: "By Le Chatelier's Principle, adding a reactant (N₂) shifts equilibrium to the right, producing more NH₃.",
    difficulty: "Medium", source: "NEET 2019"
  },
  {
    id: 10, subject: "Chemistry", chapter: "Some Basic Concepts", exam: "Engineering",
    q: "The number of moles in 36 g of water (H₂O) is: (Molar mass = 18 g/mol)",
    options: ["1 mol", "2 mol", "0.5 mol", "18 mol"], answer: 1,
    solution: "Moles = mass/molar mass = 36/18 = 2 mol.",
    difficulty: "Easy", source: "JEE Main 2021"
  },
  {
    id: 11, subject: "Chemistry", chapter: "Hydrocarbons", exam: "Engineering",
    q: "The IUPAC name of the compound CH₃-CH=CH-CH₃ is:",
    options: ["But-2-ene", "But-1-ene", "Butane", "But-2-yne"], answer: 0,
    solution: "4 carbons (but), double bond at position 2 (from either end). So it is but-2-ene.",
    difficulty: "Medium", source: "NEET 2020"
  },
  {
    id: 12, subject: "Chemistry", chapter: "Redox Reactions", exam: "Engineering",
    q: "The oxidation number of Mn in KMnO₄ is:",
    options: ["+2", "+4", "+6", "+7"], answer: 3,
    solution: "K = +1, O = −2. Let Mn = x: +1 + x + 4(−2) = 0 ⟹ x = +7.",
    difficulty: "Easy", source: "JEE Main 2019"
  },

  // ===== MATHEMATICS =====
  {
    id: 13, subject: "Mathematics", chapter: "Trigonometry", exam: "Engineering",
    q: "The value of sin(30°) + cos(60°) is:",
    options: ["1", "0.5", "1.5", "2"], answer: 0,
    solution: "sin(30°) = 1/2 and cos(60°) = 1/2. Sum = 1/2 + 1/2 = 1.",
    difficulty: "Easy", source: "JEE Main 2021"
  },
  {
    id: 14, subject: "Mathematics", chapter: "Complex Numbers", exam: "Engineering",
    q: "If i = √−1, then i⁴ equals:",
    options: ["i", "1", "−1", "0"], answer: 1,
    solution: "i² = −1, so i⁴ = (i²)² = (−1)² = 1.",
    difficulty: "Easy", source: "JEE Main 2020"
  },
  {
    id: 15, subject: "Mathematics", chapter: "Quadratic Equations", exam: "Engineering",
    q: "The roots of x² − 5x + 6 = 0 are:",
    options: ["2, 3", "1, 6", "−2, −3", "−1, −6"], answer: 0,
    solution: "Factor: (x−2)(x−3) = 0 ⟹ x = 2 or x = 3. Check: 2+3=5, 2×3=6 ✓.",
    difficulty: "Easy", source: "NEET 2021"
  },
  {
    id: 16, subject: "Mathematics", chapter: "Limits & Derivatives", exam: "Engineering",
    q: "The derivative of f(x) = x³ with respect to x is:",
    options: ["3x²", "x²", "3x", "x³/3"], answer: 0,
    solution: "Using power rule: d/dx(xⁿ) = nxⁿ⁻¹. So d/dx(x³) = 3x².",
    difficulty: "Easy", source: "JEE Main 2019"
  },
  {
    id: 17, subject: "Mathematics", chapter: "Matrices & Determinants", exam: "Engineering",
    q: "If A is a 2×2 matrix with |A| = 3, then |2A| equals:",
    options: ["6", "3", "12", "9"], answer: 2,
    solution: "For n×n matrix, |kA| = kⁿ|A|. Here n=2, so |2A| = 2²|A| = 4 × 3 = 12.",
    difficulty: "Medium", source: "JEE Main 2022"
  },
  {
    id: 18, subject: "Mathematics", chapter: "Probability", exam: "Engineering",
    q: "A die is thrown once. The probability of getting an even number is:",
    options: ["1/6", "1/3", "1/2", "2/3"], answer: 2,
    solution: "Even numbers on a die: {2,4,6} → 3 outcomes out of 6. P = 3/6 = 1/2.",
    difficulty: "Easy", source: "NEET 2020"
  },

  // ===== BIOLOGY =====
  {
    id: 19, subject: "Biology", chapter: "Cell Structure", exam: "Medical",
    q: "The powerhouse of the cell is the:",
    options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi body"], answer: 1,
    solution: "Mitochondria carry out cellular respiration and produce ATP (energy currency), hence called the powerhouse.",
    difficulty: "Easy", source: "NEET 2021"
  },
  {
    id: 20, subject: "Biology", chapter: "Genetics", exam: "Medical",
    q: "In a monohybrid cross between pure tall (TT) and dwarf (tt) pea plants, the F₁ generation is:",
    options: ["All tall", "All dwarf", "3 tall : 1 dwarf", "1 tall : 1 dwarf"], answer: 0,
    solution: "TT × tt → all Tt (heterozygous tall, since tall is dominant). F₁ is all tall.",
    difficulty: "Easy", source: "NEET 2020"
  },
  {
    id: 21, subject: "Biology", chapter: "Human Physiology", exam: "Medical",
    q: "The functional unit of the kidney is the:",
    options: ["Neuron", "Nephron", "Alveolus", "Villi"], answer: 1,
    solution: "The nephron is the structural and functional unit of the kidney, responsible for filtration & urine formation.",
    difficulty: "Easy", source: "NEET 2022"
  },
  {
    id: 22, subject: "Biology", chapter: "Photosynthesis", exam: "Medical",
    q: "Which pigment is most important for photosynthesis?",
    options: ["Carotene", "Chlorophyll a", "Xanthophyll", "Anthocyanin"], answer: 1,
    solution: "Chlorophyll a is the primary photosynthetic pigment that absorbs light energy directly for photosynthesis.",
    difficulty: "Easy", source: "NEET 2019"
  }
];

// ---- Formula Cards (real) ----
const FORMULAS = [
  { id: 1, subject: "Physics", topic: "Kinematics", formula: "v = u + at", meaning: "Final velocity = initial velocity + acceleration × time" },
  { id: 2, subject: "Physics", topic: "Kinematics", formula: "s = ut + ½at²", meaning: "Displacement in time t with acceleration a" },
  { id: 3, subject: "Physics", topic: "Kinematics", formula: "v² = u² + 2as", meaning: "Velocity-position relation (torricelli's equation)" },
  { id: 4, subject: "Physics", topic: "Laws of Motion", formula: "F = ma", meaning: "Newton's 2nd Law: Force = mass × acceleration" },
  { id: 5, subject: "Physics", topic: "Work Energy Power", formula: "W = F·d·cosθ", meaning: "Work = force × displacement × cos(angle)" },
  { id: 6, subject: "Physics", topic: "Gravitation", formula: "F = G(m₁m₂)/r²", meaning: "Newton's Law of Universal Gravitation" },
  { id: 7, subject: "Physics", topic: "Current Electricity", formula: "V = IR", meaning: "Ohm's Law: Voltage = Current × Resistance" },
  { id: 8, subject: "Physics", topic: "Current Electricity", formula: "R = ρL/A", meaning: "Resistance = resistivity × length / area" },
  { id: 9, subject: "Physics", topic: "Electrostatics", formula: "F = k(q₁q₂)/r²", meaning: "Coulomb's Law between two charges" },
  { id: 10, subject: "Physics", topic: "Modern Physics", formula: "E = mc²", meaning: "Einstein's mass-energy equivalence" },
  { id: 11, subject: "Chemistry", topic: "Mole Concept", formula: "n = m/M", meaning: "Moles = mass / molar mass" },
  { id: 12, subject: "Chemistry", topic: "Gas Laws", formula: "PV = nRT", meaning: "Ideal Gas Equation" },
  { id: 13, subject: "Chemistry", topic: "pH", formula: "pH = −log[H⁺]", meaning: "pH from hydrogen ion concentration" },
  { id: 14, subject: "Chemistry", topic: "Equilibrium", formula: "Kc = [Products]/[Reactants]", meaning: "Equilibrium constant expression" },
  { id: 15, subject: "Chemistry", topic: "Thermochemistry", formula: "q = mcΔT", meaning: "Heat = mass × specific heat × temp change" },
  { id: 16, subject: "Mathematics", topic: "Quadratic", formula: "x = (−b ± √(b²−4ac))/2a", meaning: "Quadratic formula" },
  { id: 17, subject: "Mathematics", topic: "Trigonometry", formula: "sin²θ + cos²θ = 1", meaning: "Fundamental Pythagorean identity" },
  { id: 18, subject: "Mathematics", topic: "Calculus", formula: "d/dx(xⁿ) = nxⁿ⁻¹", meaning: "Power rule of differentiation" },
  { id: 19, subject: "Mathematics", topic: "Calculus", formula: "∫xⁿ dx = xⁿ⁺¹/(n+1) + C", meaning: "Power rule of integration (n ≠ −1)" },
  { id: 20, subject: "Mathematics", topic: "Complex Numbers", formula: "|z| = √(a² + b²)", meaning: "Modulus of complex number z = a + ib" },
  { id: 21, subject: "Mathematics", topic: "Probability", formula: "P(A) = n(A)/n(S)", meaning: "Probability = favourable/total outcomes" },
  { id: 22, subject: "Biology", topic: "Genetics", formula: "p² + 2pq + q² = 1", meaning: "Hardy-Weinberg equilibrium equation" }
];

// ---- DPP (Daily Practice Problems) ----
const DPPS = [
  { id: "dpp1", title: "DPP 1: Kinematics Basics", subject: "Physics", chapter: "Kinematics", questions: [1, 3, 5], date: "Today" },
  { id: "dpp2", title: "DPP 2: Moles & Stoichiometry", subject: "Chemistry", chapter: "Some Basic Concepts", questions: [10, 12], date: "Today" },
  { id: "dpp3", title: "DPP 3: Quadratic Equations", subject: "Mathematics", chapter: "Quadratic Equations", questions: [15, 17], date: "Yesterday" },
  { id: "dpp4", title: "DPP 4: Cell Biology", subject: "Biology", chapter: "Cell Structure", questions: [19], date: "Yesterday" }
];

// ---- Leaderboard mock data ----
const LEADERBOARD = [
  { rank: 1, name: "Aarav Sharma", points: 2840, league: "Legend", avatar: "A", color: "#f59e0b" },
  { rank: 2, name: "Priya Patel", points: 2610, league: "Platinum", avatar: "P", color: "#7c5ce7" },
  { rank: 3, name: "Rohan Verma", points: 2495, league: "Platinum", avatar: "R", color: "#1589EE" },
  { rank: 4, name: "Ananya Singh", points: 2200, league: "Gold", avatar: "A", color: "#2bc48a" },
  { rank: 5, name: "Karthik Rao", points: 1980, league: "Gold", avatar: "K", color: "#ef4444" },
  { rank: 6, name: "Sneha Gupta", points: 1750, league: "Gold", avatar: "S", color: "#f59e0b" },
  { rank: 7, name: "Vikram Nair", points: 1540, league: "Silver", avatar: "V", color: "#7c5ce7" },
  { rank: 8, name: "Diya Mehta", points: 1320, league: "Silver", avatar: "D", color: "#1589EE" }
];

// ---- Dashboard modules ----
const MODULES = [
  { id: "ncert", icon: "📚", name: "NCERT Qs Bank", desc: "Chapter-wise NCERT questions", color: "#eaf4fd" },
  { id: "dpp", icon: "📝", name: "DPP", desc: "Daily Practice Problems", color: "#e6f9f0" },
  { id: "practice", icon: "🎯", name: "Question Bank (PYQ)", desc: "Previous Year Questions", color: "#dbeafe" },
  { id: "formula", icon: "🧮", name: "Formula Cards", desc: "All formulas in one place", color: "#f3eafe" },
  { id: "custom", icon: "🧪", name: "Custom Test", desc: "Build your own test", color: "#fef9c3" },
  { id: "leaderboard", icon: "🏆", name: "Leaderboard", desc: "Compete & earn leagues", color: "#fee2e2" },
  { id: "notebook", icon: "📓", name: "Notebook", desc: "Your saved notes", color: "#e0e7ff" },
  { id: "profile", icon: "👤", name: "Profile", desc: "Your stats & settings", color: "#fce7f3" }
];

// Global app state (persisted)
const STATE = {
  get exam() { return localStorage.getItem("quantrex_exam") || "Engineering"; },
  set exam(v) { localStorage.setItem("quantrex_exam", v); },
  get bookmarks() { return JSON.parse(localStorage.getItem("quantrex_bookmarks") || "[]"); },
  toggleBookmark(id) {
    const b = this.bookmarks;
    const i = b.indexOf(id);
    if (i >= 0) b.splice(i, 1); else b.push(id);
    localStorage.setItem("quantrex_bookmarks", JSON.stringify(b));
  },
  get solved() { return JSON.parse(localStorage.getItem("quantrex_solved") || "[]"); },
  markSolved(id, correct) {
    const s = JSON.parse(localStorage.getItem("quantrex_solved") || "[]");
    if (!s.find(x => x.id === id)) s.push({ id, correct, date: Date.now() });
    localStorage.setItem("quantrex_solved", JSON.stringify(s));
  },
  get notes() { return JSON.parse(localStorage.getItem("quantrex_notes") || "[]"); },
  addNote(text) {
    const n = this.notes;
    n.unshift({ id: Date.now(), text, date: new Date().toLocaleString() });
    localStorage.setItem("quantrex_notes", JSON.stringify(n));
  },
  deleteNote(id) {
    const n = this.notes.filter(x => x.id !== id);
    localStorage.setItem("quantrex_notes", JSON.stringify(n));
  }
};

// Utility: get question by id
function getQ(id) { return QUESTIONS.find(q => q.id === id); }
