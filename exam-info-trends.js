/**
 * Quantrex — PYQ trend data for Exam Information
 * JEE Main last-5-year topic lists (multi-shift aggregate trends, 2021–2025 style analyses).
 * Percentages from multi-year coaching analyses (PW / public PYQ studies). Not official NTA tables.
 * Counts = approximate total questions across sessions/shifts over ~5 years (order-of-magnitude prioritisation).
 */
window.QX_EXAM_TRENDS = (function () {
  "use strict";

  function t(headers, rows) {
    const th = headers.map((h) => "<th>" + h + "</th>").join("");
    const tr = rows
      .map(function (r) {
        return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>";
      })
      .join("");
    return "<table><thead><tr>" + th + "</tr></thead><tbody>" + tr + "</tbody></table>";
  }

  function note(s) {
    return '<p class="ei-note">' + s + "</p>";
  }

  const DISC =
    note(
      "Based on multi-year PYQ trend analyses (similar to ExamGoal / Marks / major coaching 5-year chapter studies). Multi-shift exams mean absolute question counts vary. NTA does not publish official chapter marks — use for prioritisation only."
    );

  /* —— JEE Main: past ~5 years chapter % (trend) —— */
  const JM_PHY_PCT = [
    ["Current Electricity", "~6.6%"],
    ["Ray Optics & Optical Instruments", "~5.0%"],
    ["Semiconductors / Electronic Devices", "~4.8%"],
    ["Electrostatic Potential & Capacitance", "~4.5%"],
    ["Gravitation", "~4.5%"],
    ["Rotational Motion", "~4.3%"],
    ["Units & Measurements", "~4.2%"],
    ["Dual Nature of Radiation & Matter", "~4.1%"],
    ["Alternating Current", "~3.7%"],
    ["Oscillations", "~3.3%"],
    ["EMI", "~3.3%"],
    ["Electric Charges & Fields", "~3.2%"],
    ["Nuclei", "~3.1%"],
    ["Thermodynamics", "~3.1%"],
    ["Mechanical Properties of Fluids", "~3.0%"],
    ["Electromagnetic Waves", "~3.0%"],
    ["Motion in a Plane", "~2.9%"],
    ["Moving Charges & Magnetism", "~2.9%"],
    ["Kinetic Theory of Gases", "~2.9%"],
    ["Motion in a Straight Line", "~2.6%"],
    ["Centre of Mass & System of Particles", "~2.6%"],
    ["Atoms", "~2.5%"],
    ["Work, Energy & Power", "~2.4%"],
    ["Wave Optics", "~2.3%"],
    ["Mechanical Properties of Solids", "~2.1%"],
    ["Thermal Properties of Matter", "~2.1%"],
    ["Newton’s Laws of Motion", "~2.1%"],
    ["Waves", "~1.9%"],
    ["Magnetism and Matter", "~1.9%"]
  ];

  const JM_CHEM_PCT = [
    ["Aldehydes, Ketones & Carboxylic Acids", "~6.0%"],
    ["Coordination Compounds", "~5.3%"],
    ["d- and f-Block Elements", "~4.7%"],
    ["Solutions", "~4.5%"],
    ["Equilibrium", "~4.4%"],
    ["Amines", "~4.4%"],
    ["s-Block Elements", "~4.2%"],
    ["Biomolecules", "~4.0%"],
    ["p-Block (XII groups 15–18)", "~3.7%"],
    ["Chemical Thermodynamics", "~3.7%"],
    ["Chemical Kinetics", "~3.6%"],
    ["Alcohols, Phenols & Ethers", "~3.5%"],
    ["Atomic Structure", "~3.3%"],
    ["Chemical Bonding", "~3.3%"],
    ["Electrochemistry", "~3.3%"],
    ["Hydrocarbons", "~3.0%"],
    ["Environmental Chemistry / Everyday (if in syllabus)", "~2–3%"],
    ["Some Basic Concepts (Mole)", "~2.8%"],
    ["Haloalkanes & Haloarenes", "~2.7%"],
    ["GOC / Basic Organic principles", "~2–3%"],
    ["Redox", "~1.8%"],
    ["Periodicity", "~1.9%"]
  ];

  const JM_MATH_PCT = [
    ["Three-Dimensional Geometry", "~7.4%"],
    ["Sequences and Series", "~5.7%"],
    ["Limit, Continuity & Differentiability", "~5.5%"],
    ["Definite Integration", "~5.1%"],
    ["Binomial Theorem", "~5.1%"],
    ["Complex Numbers", "~4.8%"],
    ["Application of Derivatives", "~4.8%"],
    ["Vector Algebra", "~4.7%"],
    ["Differential Equations", "~4.2%"],
    ["Determinants", "~4.0%"],
    ["Permutations & Combinations", "~3.6%"],
    ["Matrices", "~3.5%"],
    ["Quadratic Equations", "~3.3%"],
    ["Circles", "~3.2%"],
    ["Probability", "~3.1%"],
    ["Statistics", "~3.0%"],
    ["Application of Integrals", "~3.0%"],
    ["Straight Lines", "~2.7%"],
    ["Parabola", "~2.4%"],
    ["Ellipse", "~2.1%"],
    ["Hyperbola", "~1.7%"],
    ["Indefinite Integration", "~1.7%"],
    ["Inverse Trigonometric Functions", "~1.6%"],
    ["Trigonometric Equations", "~1.4%"],
    ["Sets / Relations / Functions (cluster)", "~2–4%"],
    ["Trigonometric Ratios & Identities", "~1.0%"]
  ];

  /* Full topic list with 5-yr aggregate-style counts (public analyses ~2021–2025) */
  const JM_PHY_5YR = [
    ["Current Electricity", "12", "~200+", "~40"],
    ["Moving Charges & Magnetism", "12", "~140", "~28"],
    ["Rotational Motion", "11", "~130", "~26"],
    ["Kinetic Theory of Gases", "11", "~120", "~24"],
    ["Semiconductors / Devices", "12", "~120", "~24"],
    ["Ray Optics", "12", "~115", "~23"],
    ["Electric Charges & Fields", "12", "~115", "~23"],
    ["Alternating Current", "12", "~110", "~22"],
    ["Dual Nature", "12", "~105", "~21"],
    ["Thermodynamics", "11", "~100", "~20"],
    ["Gravitation", "11", "~100", "~20"],
    ["Atoms", "12", "~95", "~19"],
    ["Oscillations", "11", "~80", "~16"],
    ["Capacitance", "12", "~85", "~17"],
    ["EMI", "12", "~85", "~17"],
    ["Wave Optics", "12", "~80", "~16"],
    ["EM Waves", "12", "~80", "~16"],
    ["Newton’s Laws", "11", "~70", "~14"],
    ["Work Energy Power", "11", "~70", "~14"],
    ["Centre of Mass", "11", "~65", "~13"],
    ["Motion in Straight Line", "11", "~65", "~13"],
    ["Elasticity / Solids", "11", "~65", "~13"],
    ["Error Analysis", "12", "~60", "~13"],
    ["Nuclear Physics", "12", "~55", "~11"],
    ["Projectile / Plane Motion", "11", "~50", "~10"],
    ["Sound / Waves", "11", "~40–45", "~8–9"],
    ["Fluids / Surface Tension", "11", "~40+", "~8"],
    ["Circular Motion", "11", "~35", "~7"],
    ["Magnetism & Matter", "12", "~40", "~8"]
  ];

  const JM_CHEM_5YR = [
    ["Coordination Compounds", "12", "~170", "~34"],
    ["d- and f-Block", "12", "~155", "~31"],
    ["Chemical Bonding", "11", "~145", "~29"],
    ["Amines", "12", "~140", "~28"],
    ["Solutions", "12", "~130", "~26"],
    ["Some Basic Concepts", "11", "~115", "~23"],
    ["Thermodynamics", "11", "~115", "~23"],
    ["Chemical Kinetics", "12", "~110", "~22"],
    ["Biomolecules", "12", "~110", "~22"],
    ["p-Block (XII)", "12", "~110", "~22"],
    ["Structure of Atom", "11", "~105", "~21"],
    ["Electrochemistry", "12", "~100", "~20"],
    ["Aldehydes–Ketones–Acids", "12", "~95", "~19"],
    ["Haloalkanes & Haloarenes", "12", "~85", "~17"],
    ["GOC", "11", "~85", "~17"],
    ["Periodicity", "11", "~75", "~15"],
    ["Practical / Qualitative", "12", "~70", "~14"],
    ["Hydrocarbons", "11", "~65", "~13"],
    ["Ionic / Chemical Equilibrium", "11", "~55–60", "~11"],
    ["Alcohols Phenols Ethers", "12", "~55", "~11"],
    ["Redox", "11", "~50", "~10"],
    ["Polymers / Everyday (if asked)", "12", "~40+", "~8"]
  ];

  const JM_MATH_5YR = [
    ["Three-Dimensional Geometry", "12", "~250", "~50"],
    ["Definite Integration", "12", "~190", "~39"],
    ["Sequences and Series", "11", "~180", "~36"],
    ["Vectors", "12", "~165", "~33"],
    ["Differential Equations", "12", "~165", "~33"],
    ["Binomial Theorem", "11", "~155", "~31"],
    ["Matrices", "12", "~145", "~29"],
    ["Probability", "12", "~140", "~28"],
    ["Application of Derivatives", "12", "~135", "~27"],
    ["Complex Numbers", "11", "~120", "~24"],
    ["P&C", "11", "~120", "~24"],
    ["Area under Curve", "12", "~105", "~21"],
    ["Straight Lines", "11", "~95", "~19"],
    ["Circle", "11", "~100", "~20"],
    ["Functions", "12", "~95", "~19"],
    ["Quadratic Equations", "11", "~90", "~18"],
    ["Determinants", "12", "~85", "~17"],
    ["Continuity & Differentiability", "12", "~85", "~17"],
    ["Parabola", "11", "~75", "~15"],
    ["Statistics", "11", "~75", "~15"],
    ["Inverse Trigonometry", "12", "~75", "~15"],
    ["Limits", "12", "~65", "~13"],
    ["Ellipse", "11", "~65", "~13"],
    ["Hyperbola", "11", "~55", "~11"],
    ["Relations", "11", "~55", "~11"],
    ["Trigonometric Equations", "11", "~40", "~8"],
    ["Trigonometric Ratios", "11", "~35", "~7"],
    ["Indefinite Integration", "12", "~40", "~8"],
    ["Methods of Differentiation", "12", "~40", "~8"]
  ];

  const JM_MARKS_DIST = `
    <h3>Paper 1 (B.E./B.Tech) — marks distribution</h3>
    ${t(["Component", "Details (typical recent pattern)"], [
      ["Subjects", "Physics · Chemistry · Mathematics (equal weight)"],
      ["Marks per subject", "100"],
      ["Total marks", "300"],
      ["Questions per subject", "Usually 25 to attempt (20 MCQ + 5 numerical — verify year bulletin)"],
      ["MCQ marking", "+4 correct · −1 wrong · 0 unattempted"],
      ["Numerical marking", "+4 correct · often 0 negative (confirm bulletin)"],
      ["Duration", "3 hours (180 minutes)"],
      ["Mode", "CBT · multi-language as notified"]
    ])}
    <h3>Subject equal split</h3>
    ${t(["Subject", "Marks", "% of paper"], [
      ["Physics", "100", "33.3%"],
      ["Chemistry", "100", "33.3%"],
      ["Mathematics", "100", "33.3%"]
    ])}
    <h3>Class 11 vs 12 trend (approx., multi-year)</h3>
    ${t(["Subject", "Class 11 share", "Class 12 share"], [
      ["Physics", "~44–48%", "~52–56%"],
      ["Chemistry", "~40–48%", "~52–60%"],
      ["Mathematics", "~45–50%", "~50–55%"]
    ])}`;

  const JM_SYLLABUS_DETAIL = `
    <p>Official syllabus: download <strong>NTA JEE Main Information Bulletin</strong> PDF for the year. Below is the standard unit map used in recent years (topic names follow NCERT/NTA style).</p>
    <h3>Physics — detailed units & topics</h3>
    <h4>Class 11</h4>
    <ul>
      <li><strong>Units & Measurements:</strong> SI units, dimensions, errors, significant figures</li>
      <li><strong>Kinematics:</strong> motion in a straight line & plane, projectile, relative velocity</li>
      <li><strong>Laws of Motion:</strong> Newton’s laws, friction, circular motion</li>
      <li><strong>Work, Energy & Power:</strong> work–energy theorem, collisions, power</li>
      <li><strong>System of Particles & Rotational Motion:</strong> COM, torque, MOI, rolling</li>
      <li><strong>Gravitation:</strong> Kepler, potential, satellites, escape velocity</li>
      <li><strong>Properties of Bulk Matter:</strong> elasticity, viscosity, surface tension, fluid mechanics, thermal expansion, calorimetry, heat transfer</li>
      <li><strong>Thermodynamics & KTG:</strong> laws of thermo, processes, kinetic theory</li>
      <li><strong>Oscillations & Waves:</strong> SHM, waves on string, sound, Doppler</li>
    </ul>
    <h4>Class 12</h4>
    <ul>
      <li><strong>Electrostatics:</strong> Coulomb, field, potential, capacitors, Gauss</li>
      <li><strong>Current Electricity:</strong> Ohm, Kirchhoff, instruments, heating</li>
      <li><strong>Magnetic Effects & Magnetism:</strong> Biot–Savart, Ampere, force on charges/wires, magnetic materials</li>
      <li><strong>EMI & AC:</strong> Faraday, Lenz, inductance, LC/LR/CR, power in AC, transformer</li>
      <li><strong>EM Waves:</strong> spectrum, displacement current</li>
      <li><strong>Optics:</strong> reflection, refraction, lenses, optical instruments, wave optics (interference, diffraction, polarisation)</li>
      <li><strong>Dual Nature, Atoms, Nuclei:</strong> photoelectric, Bohr, radioactivity, nuclear energy</li>
      <li><strong>Electronic Devices:</strong> semiconductors, diode, transistor, logic gates (as per bulletin)</li>
    </ul>
    <h3>Chemistry — detailed units</h3>
    <h4>Physical</h4>
    <ul>
      <li>Some basic concepts of chemistry (mole, stoichiometry)</li>
      <li>Atomic structure; chemical bonding & molecular structure</li>
      <li>Thermodynamics; equilibrium (chemical & ionic)</li>
      <li>Solutions; electrochemistry; chemical kinetics</li>
      <li>Surface chemistry / states of matter — only if listed in that year’s PDF</li>
    </ul>
    <h4>Inorganic</h4>
    <ul>
      <li>Classification & periodicity; hydrogen; s-block; p-block; d- and f-block</li>
      <li>Coordination compounds; environmental chemistry / metallurgy as notified</li>
    </ul>
    <h4>Organic</h4>
    <ul>
      <li>Purification, GOC, hydrocarbons</li>
      <li>Haloalkanes & haloarenes; alcohols, phenols, ethers</li>
      <li>Aldehydes, ketones, carboxylic acids; amines</li>
      <li>Biomolecules; polymers; chemistry in everyday life — as per bulletin</li>
    </ul>
    <h3>Mathematics — detailed units</h3>
    <ul>
      <li><strong>Sets, Relations, Functions</strong> · Complex numbers · Quadratic equations</li>
      <li><strong>Matrices & Determinants</strong> · Permutations & combinations · Binomial theorem</li>
      <li><strong>Sequences & series</strong> · Limits, continuity, differentiability · Applications of derivatives</li>
      <li><strong>Integrals</strong> (indefinite, definite) · Applications of integrals · Differential equations</li>
      <li><strong>Coordinate geometry:</strong> straight lines, circles, conic sections</li>
      <li><strong>3D geometry</strong> · Vector algebra · Statistics & probability · Trigonometry</li>
    </ul>`;

  function fiveYearBlock(title, pctRows, countRows) {
    return (
      DISC +
      "<h3>" +
      title +
      " — approx. % weight (past ~5 years)</h3>" +
      t(["Chapter / topic", "Approx. weightage"], pctRows) +
      "<h3>" +
      title +
      " — topic-wise list (5-year aggregate trend)</h3>" +
      note("“Total Qs (5 yrs)” ≈ sum across many shifts/sessions in public analyses — use ranking order, not exact forecast.") +
      t(["Chapter", "Class", "Total Qs ~5 yrs", "Avg / year (approx.)"], countRows)
    );
  }

  /* JEE Advanced */
  const JA_MARKS = `
    <h3>Marks distribution (structure — exact totals change yearly)</h3>
    ${t(["Item", "Typical"], [
      ["Papers", "Paper 1 + Paper 2 (both compulsory)"],
      ["Duration", "3 hours each (same day)"],
      ["Subjects per paper", "Physics, Chemistry, Mathematics interleaved"],
      ["Question types", "Single correct, multiple correct, numerical, paragraph, matrix match (varies by year)"],
      ["Marking", "Full / partial / negative — only brochure is final"],
      ["Total marks", "Varies (often ~360 combined historically — confirm year)"]
    ])}
    <h3>Subject balance</h3>
    <p>Each paper roughly balances PCM. Rank depends on aggregate of both papers. No fixed chapter marks.</p>`;

  const JA_SYLLABUS = `
    <p>Official: organising IIT publishes <strong>JEE Advanced syllabus PDF</strong> each year (subset/refinement of Class 11–12 PCM). Always download from jeeadv.ac.in.</p>
    <h3>Physics (high-depth map)</h3>
    <ul>
      <li>General physics, units, error analysis</li>
      <li>Mechanics: kinematics, NLM, work–energy, COM, rotation, gravitation, fluids, SHM, waves</li>
      <li>Thermal physics: kinetic theory, thermodynamics, heat transfer</li>
      <li>Electricity & magnetism: electrostatics, current, magnetostatics, EMI, AC, EM waves</li>
      <li>Optics: ray + wave</li>
      <li>Modern physics: dual nature, atoms, nuclei, x-rays; electronics basics as listed</li>
    </ul>
    <h3>Chemistry</h3>
    <ul>
      <li>Physical: mole, atomic structure, bonding, thermodynamics, equilibrium, electrochemistry, kinetics, solutions, surface (as listed)</li>
      <li>Inorganic: periodicity, s/p/d/f, coordination, qualitative analysis, metallurgy (as listed)</li>
      <li>Organic: GOC, reaction mechanisms, named reactions, biomolecules, polymers, practical organic (as listed)</li>
    </ul>
    <h3>Mathematics</h3>
    <ul>
      <li>Algebra: complex, quadratic, sequences, binomial, P&C, matrices, determinants</li>
      <li>Trigonometry; coordinate geometry (2D + 3D); vectors</li>
      <li>Calculus: limits, continuity, differentiation, AOD, integrals, DE, area</li>
      <li>Probability & statistics (as listed)</li>
    </ul>`;

  const JA_5YR = DISC + `
    <h3>High-frequency themes (Advanced PYQ multi-year trend)</h3>
    <p>Advanced does not publish chapter % — below is coaching-style frequency ranking from recent years’ papers.</p>
    <h3>Physics — priority order</h3>
    ${t(["Theme", "Why it matters"], [
      ["Mechanics (rotation, COM, collisions)", "Multi-correct conceptual staples"],
      ["Electrodynamics (electrostatics + current + magnetism)", "Largest combined share historically"],
      ["Modern physics", "High accuracy ROI"],
      ["Optics (ray + wave)", "Regular multi-correct / paragraph"],
      ["Thermodynamics & KTG", "Linked multi-concept sets"],
      ["SHM & Waves", "Moderate but consistent"]
    ])}
    <h3>Chemistry — priority order</h3>
    ${t(["Theme", "Why it matters"], [
      ["GOC + reaction mechanisms", "Multi-correct organic"],
      ["Chemical bonding + coordination", "Inorganic conceptual"],
      ["Equilibrium + thermodynamics + electrochemistry", "Physical numerical depth"],
      ["Named reactions & carbonyl chemistry", "Application heavy"],
      ["p/d/f block + qualitative", "Memory + logic mix"]
    ])}
    <h3>Mathematics — priority order</h3>
    ${t(["Theme", "Why it matters"], [
      ["Calculus (definite, AOD, DE)", "Highest time + marks pressure"],
      ["Algebra (complex, matrices, sequences)", "Multi-correct traps"],
      ["Coordinate geometry + 3D + vectors", "Lengthy but standard patterns"],
      ["Probability & P&C", "Variable yearly"],
      ["Trigonometry", "Support for calculus/coord"]
    ])}
    <h3>Topic checklist (revise all before Advanced)</h3>
    <p><strong>Physics:</strong> NLM, WEP, rotation, gravitation, fluids, SHM, waves, thermo, KTG, electrostatics, capacitors, current, magnetism, EMI, AC, ray optics, wave optics, dual nature, atoms, nuclei, semiconductors.</p>
    <p><strong>Chemistry:</strong> mole, atomic structure, bonding, thermo, equilibrium, solutions, electrochemistry, kinetics, periodicity, p/d/f, coordination, GOC, hydrocarbons, halo, alcohol/phenol/ether, carbonyls, amines, biomolecules.</p>
    <p><strong>Maths:</strong> complex, quadratic, sequences, binomial, P&C, matrices, determinants, limits, continuity, differentiation, AOD, integrals, DE, straight line, circle, conics, 3D, vectors, probability, ITF, functions.</p>`;

  /* NEET */
  const NEET_MARKS = `
    <h3>Marks distribution</h3>
    ${t(["Subject", "Questions", "Marks", "% of paper"], [
      ["Physics", "45", "180", "25%"],
      ["Chemistry", "45", "180", "25%"],
      ["Biology (Botany + Zoology)", "90", "360", "50%"],
      ["Total", "180", "720", "100%"]
    ])}
    ${t(["Marking", "Scheme (typical)"], [
      ["Correct", "+4"],
      ["Wrong", "−1"],
      ["Unattempted", "0"],
      ["Duration", "3 hours 20 minutes"],
      ["Mode", "Pen-paper OMR (confirm year)"]
    ])}`;

  const NEET_SYLLABUS = `
    <h3>Biology — detailed (NCERT Class 11–12)</h3>
    <h4>Class 11</h4>
    <ul>
      <li>Diversity of living organisms; structural organisation in animals & plants</li>
      <li>Cell structure & function; plant physiology; human physiology</li>
    </ul>
    <h4>Class 12</h4>
    <ul>
      <li>Reproduction; genetics & evolution</li>
      <li>Biology in human welfare; biotechnology; ecology</li>
    </ul>
    <h3>Physics — detailed units</h3>
    <ul>
      <li>Physical world & measurement; kinematics; laws of motion; work–energy–power</li>
      <li>Motion of system of particles; gravitation; properties of bulk matter</li>
      <li>Thermodynamics; behaviour of perfect gas & KTG; oscillations & waves</li>
      <li>Electrostatics; current electricity; magnetic effects; EMI & AC; EM waves</li>
      <li>Optics; dual nature; atoms & nuclei; electronic devices</li>
    </ul>
    <h3>Chemistry — detailed units</h3>
    <ul>
      <li>Physical: basic concepts, structure of atom, bonding, thermo, equilibrium, solutions, electrochemistry, kinetics, surface (as listed)</li>
      <li>Inorganic: periodicity, hydrogen, s/p/d/f, coordination, environmental</li>
      <li>Organic: GOC, hydrocarbons, halo, oxygen compounds, nitrogen compounds, biomolecules, polymers, everyday chemistry (as listed)</li>
    </ul>`;

  const NEET_5YR = DISC + `
    <h3>Biology topic weight (approx. multi-year NEET trend)</h3>
    ${t(["Topic area", "Approx. share of Biology"], [
      ["Human Physiology", "~12–15%"],
      ["Genetics & Evolution", "~10–12%"],
      ["Ecology", "~8–10%"],
      ["Cell Structure & Biomolecules", "~8–10%"],
      ["Plant Physiology", "~6–8%"],
      ["Reproduction (plant + human)", "~8–10%"],
      ["Diversity of Living Organisms", "~8–10%"],
      ["Biotechnology", "~4–6%"],
      ["Biology in Human Welfare", "~4–5%"],
      ["Structural Organisation", "~5–7%"]
    ])}
    <h3>Physics high-frequency</h3>
    ${t(["Chapter", "Trend"], [
      ["Modern Physics", "Very high"],
      ["Current Electricity", "High"],
      ["Ray Optics", "High"],
      ["Electrostatics", "High"],
      ["Laws of Motion / WEP", "High"],
      ["Semiconductors", "High"],
      ["Thermodynamics / KTG", "Moderate–high"],
      ["Magnetism & EMI", "Moderate"]
    ])}
    <h3>Chemistry high-frequency</h3>
    ${t(["Chapter", "Trend"], [
      ["Chemical Bonding", "Very high"],
      ["Coordination Compounds", "High"],
      ["Equilibrium", "High"],
      ["Organic GOC + Carbonyls", "High"],
      ["Biomolecules", "High (NCERT)"],
      ["Electrochemistry & Kinetics", "High"],
      ["p/d/f block", "High (NCERT lines)"]
    ])}`;

  /* Generic helpers for state exams */
  function stateMarks(name, rows) {
    return "<h3>" + name + " — marks / paper structure</h3>" + t(["Component", "Typical"], rows) + note("Confirm exact scheme on official brochure each year.");
  }

  function pcmTopicChecklist() {
    return `
      <h3>Full PCM topic checklist (use with board + official PDF)</h3>
      <p><strong>Physics:</strong> Units, Kinematics, NLM, WEP, COM/Rotation, Gravitation, Solids/Fluids, Thermal, Thermo, KTG, SHM, Waves, Electrostatics, Current, Magnetism, EMI, AC, EM Waves, Ray Optics, Wave Optics, Dual Nature, Atoms, Nuclei, Semiconductors.</p>
      <p><strong>Chemistry:</strong> Mole, Atomic Structure, Bonding, Thermo, Equilibrium, Solutions, Electrochemistry, Kinetics, Periodicity, s/p/d/f, Coordination, GOC, Hydrocarbons, Halo, Alcohols–Phenols–Ethers, Carbonyls, Amines, Biomolecules (+ polymers/everyday if listed).</p>
      <p><strong>Maths:</strong> Sets/Relations/Functions, Complex, Quadratic, Sequences, Binomial, P&C, Matrices, Determinants, Limits–Continuity–Differentiability, AOD, Integrals, DE, Straight Lines, Circles, Conics, 3D, Vectors, Probability, Statistics, Trigonometry.</p>`;
  }

  return {
    jee_main: {
      marksDist: JM_MARKS_DIST,
      syllabusDetail: JM_SYLLABUS_DETAIL,
      fiveYear:
        fiveYearBlock("Physics", JM_PHY_PCT, JM_PHY_5YR) +
        fiveYearBlock("Chemistry", JM_CHEM_PCT, JM_CHEM_5YR) +
        fiveYearBlock("Mathematics", JM_MATH_PCT, JM_MATH_5YR)
    },
    jee_advanced: {
      marksDist: JA_MARKS,
      syllabusDetail: JA_SYLLABUS,
      fiveYear: JA_5YR
    },
    neet_ug: {
      marksDist: NEET_MARKS,
      syllabusDetail: NEET_SYLLABUS,
      fiveYear: NEET_5YR
    },
    bitsat: {
      marksDist: stateMarks("BITSAT", [
        ["Physics", "30 Q · 90 marks"],
        ["Chemistry", "30 Q · 90 marks"],
        ["English", "10 Q · 30 marks"],
        ["Logical Reasoning", "20 Q · 60 marks"],
        ["Mathematics", "40 Q · 120 marks"],
        ["Total", "130 Q · 390 marks (+ bonus if rules allow)"],
        ["Marking", "+3 / −1 typical"]
      ]),
      syllabusDetail: JM_SYLLABUS_DETAIL + "<h3>Extra sections</h3><ul><li>English proficiency</li><li>Logical reasoning</li></ul>",
      fiveYear: DISC + fiveYearBlock("Physics (JEE-Main-like frequency applies)", JM_PHY_PCT.slice(0, 15), JM_PHY_5YR.slice(0, 15)) +
        "<p>BITSAT also needs daily English + LR practice — not reflected in PCM % tables.</p>" + pcmTopicChecklist()
    },
    mht_cet: {
      marksDist: stateMarks("MHT CET (PCM)", [
        ["Physics", "~50 Q"],
        ["Chemistry", "~50 Q"],
        ["Mathematics", "~50 Q"],
        ["Total marks", "Often 200 (confirm year)"],
        ["Negative marking", "Usually none"]
      ]),
      syllabusDetail: "<p><strong>Maharashtra HSC Class 11–12</strong> PCM primary source. " + JM_SYLLABUS_DETAIL,
      fiveYear: DISC + pcmTopicChecklist() + "<p>Prioritise HSC textbook exercises; JEE Main high-weight chapters above also score well.</p>"
    },
    kcet: {
      marksDist: stateMarks("KCET", [
        ["Papers", "Separate subject papers (typically 60 Q · 80 min)"],
        ["Negative", "Usually none"],
        ["Syllabus base", "Karnataka II PU"]
      ]),
      syllabusDetail: "<p><strong>Karnataka II PU</strong> Physics, Chemistry, Maths/Biology.</p>" + pcmTopicChecklist(),
      fiveYear: DISC + pcmTopicChecklist()
    },
    wbjee: {
      marksDist: stateMarks("WBJEE", [
        ["Paper I", "Mathematics (Category 1/2/3 marking)"],
        ["Paper II", "Physics + Chemistry"],
        ["Negative", "Category-dependent"]
      ]),
      syllabusDetail: JM_SYLLABUS_DETAIL + "<p>Align with WBCHSE + standard PCM.</p>",
      fiveYear: DISC + fiveYearBlock("Maths (rank-critical)", JM_MATH_PCT.slice(0, 12), JM_MATH_5YR.slice(0, 12)) + pcmTopicChecklist()
    },
    comedk: {
      marksDist: stateMarks("COMEDK UGET", [
        ["Physics", "60 Q · 60 marks"],
        ["Chemistry", "60 Q · 60 marks"],
        ["Mathematics", "60 Q · 60 marks"],
        ["Total", "180 Q · 180 marks"],
        ["Negative", "Usually none"]
      ]),
      syllabusDetail: JM_SYLLABUS_DETAIL,
      fiveYear: DISC + fiveYearBlock("Physics", JM_PHY_PCT.slice(0, 12), JM_PHY_5YR.slice(0, 12)) + pcmTopicChecklist()
    },
    viteee: {
      marksDist: stateMarks("VITEEE", [
        ["Duration", "~2.5 hours"],
        ["Subjects", "PCM + English/Aptitude as per brochure"],
        ["Negative", "Usually none"]
      ]),
      syllabusDetail: JM_SYLLABUS_DETAIL,
      fiveYear: DISC + pcmTopicChecklist()
    },
    srmjeee: {
      marksDist: stateMarks("SRMJEEE", [
        ["Subjects", "PCM + aptitude (confirm brochure)"],
        ["Phases", "Multiple attempts often available"]
      ]),
      syllabusDetail: JM_SYLLABUS_DETAIL,
      fiveYear: DISC + pcmTopicChecklist()
    },
    manipal_met: {
      marksDist: stateMarks("Manipal MET", [
        ["Duration", "~2 hours"],
        ["Subjects", "PCM + English/aptitude as notified"]
      ]),
      syllabusDetail: JM_SYLLABUS_DETAIL,
      fiveYear: DISC + pcmTopicChecklist()
    },
    aeee: {
      marksDist: stateMarks("AEEE", [["Subjects", "Physics, Chemistry, Mathematics"], ["Also", "JEE Main ranks may be accepted"]]),
      syllabusDetail: JM_SYLLABUS_DETAIL,
      fiveYear: DISC + pcmTopicChecklist()
    },
    gujcet: {
      marksDist: stateMarks("GUJCET", [
        ["Total marks", "Often 120"],
        ["Base", "Gujarat Board Class 11–12"]
      ]),
      syllabusDetail: "<p><strong>GSEB Class 11–12</strong> PCM/PCB.</p>" + pcmTopicChecklist(),
      fiveYear: DISC + pcmTopicChecklist()
    },
    nda: {
      marksDist: stateMarks("NDA written", [
        ["Paper I Maths", "300 marks · 2.5 hours"],
        ["Paper II GAT", "600 marks · 2.5 hours"],
        ["Total written", "900 marks"],
        ["Negative", "Typically 1/3 of assigned marks"]
      ]),
      syllabusDetail: `
        <h3>Mathematics (detailed)</h3>
        <ul>
          <li>Algebra: sets, complex numbers, quadratic, progressions, logarithms, matrices & determinants, binomial, P&C</li>
          <li>Trigonometry: ratios, identities, equations, inverse, heights & distances</li>
          <li>Analytical geometry 2D & 3D: lines, circles, conics, planes, lines in space</li>
          <li>Differential calculus: limits, derivatives, applications</li>
          <li>Integral calculus & differential equations</li>
          <li>Vector algebra; statistics & probability</li>
        </ul>
        <h3>GAT — English</h3>
        <ul><li>Grammar, vocabulary, comprehension, cohesion</li></ul>
        <h3>GAT — General Knowledge</h3>
        <ul>
          <li>Physics & Chemistry (class 11–12 level facts + numericals light)</li>
          <li>General Science; History (India & world); Geography</li>
          <li>Indian Polity; Economy basics; Current events</li>
        </ul>`,
      fiveYear: DISC + `
        <h3>High-frequency written areas</h3>
        ${t(["Area", "Trend"], [
          ["Maths: Trigonometry, Algebra, Calculus", "Highest attempt density"],
          ["Maths: Coordinate geometry, Vectors, Probability", "Consistent"],
          ["English grammar & vocab", "Cutoff critical"],
          ["Current affairs (6–12 months)", "Rising"],
          ["Static: Modern history, Geography, Polity", "Stable"],
          ["Science NCERT-level", "Stable"]
        ])}`
    },
    ap_eamcet_pcm: {
      marksDist: stateMarks("AP EAPCET PCM", [
        ["Typical split", "Physics 40 + Chemistry 40 + Maths 80 (confirm)"],
        ["Total", "160 marks · 3 hours"],
        ["Negative", "Usually none"]
      ]),
      syllabusDetail: "<p><strong>AP Intermediate</strong> PCM.</p>" + JM_SYLLABUS_DETAIL,
      fiveYear: DISC + fiveYearBlock("Maths (often double weight)", JM_MATH_PCT.slice(0, 15), JM_MATH_5YR.slice(0, 15)) + pcmTopicChecklist()
    },
    ap_eamcet_pcb: {
      marksDist: stateMarks("AP EAPCET PCB", [
        ["Stream", "PCB for agri/pharmacy etc."],
        ["MBBS", "Via NEET only"]
      ]),
      syllabusDetail: NEET_SYLLABUS,
      fiveYear: NEET_5YR
    },
    ts_eamcet_pcm: {
      marksDist: stateMarks("TS EAMCET PCM", [
        ["Typical", "160 marks · PCM · 3 hours"],
        ["Negative", "Usually none"]
      ]),
      syllabusDetail: "<p><strong>TS Intermediate</strong> PCM.</p>" + JM_SYLLABUS_DETAIL,
      fiveYear: DISC + pcmTopicChecklist()
    },
    ts_eamcet_pcb: {
      marksDist: stateMarks("TS EAMCET PCB", [["Stream", "PCB biostream"], ["MBBS", "NEET only"]]),
      syllabusDetail: NEET_SYLLABUS,
      fiveYear: NEET_5YR
    },
    nest_ug: {
      marksDist: stateMarks("NEST", [
        ["Sections", "Biology, Chemistry, Mathematics, Physics"],
        ["Duration", "~3.5 hours"],
        ["Scoring", "Often best 3 of 4 — confirm year"],
        ["Negative", "Yes"]
      ]),
      syllabusDetail: JM_SYLLABUS_DETAIL + NEET_SYLLABUS,
      fiveYear: DISC + pcmTopicChecklist() + "<p>Equal sectional practice; olympiad-style depth.</p>"
    },
    ugee: {
      marksDist: note("UGEE pattern published only in that year’s BITS brochure — data to be confirmed."),
      syllabusDetail: JA_SYLLABUS,
      fiveYear: JA_5YR
    },
    upeseat: {
      marksDist: stateMarks("UPESEAT", [["Subjects", "PCM + English/GA as notified"], ["Alt route", "JEE Main / Board merit if allowed"]]),
      syllabusDetail: JM_SYLLABUS_DETAIL,
      fiveYear: DISC + pcmTopicChecklist()
    },
    neet_mds: {
      marksDist: stateMarks("NEET MDS", [
        ["Paper", "Single CBT"],
        ["Syllabus base", "BDS curriculum"],
        ["Negative", "Typically yes"]
      ]),
      syllabusDetail: `
        <h3>BDS-based major areas</h3>
        <ul>
          <li>Oral Medicine & Radiology; Oral & Maxillofacial Surgery</li>
          <li>Prosthodontics; Orthodontics; Periodontology</li>
          <li>Conservative Dentistry & Endodontics; Pedodontics</li>
          <li>Oral Pathology; Public Health Dentistry</li>
          <li>Basic medical sciences applied to dentistry</li>
        </ul>`,
      fiveYear: DISC + t(["Clinical area", "Trend"], [
        ["Conservative / Endodontics", "High MCQ density"],
        ["Oral Surgery", "High"],
        ["Prosthodontics", "High"],
        ["Orthodontics", "High"],
        ["Periodontics", "High"],
        ["Oral Pathology / Medicine", "High"],
        ["Pedodontics / PHD", "Moderate–high"]
      ])
    },
    cuet_ug: {
      marksDist: stateMarks("CUET UG", [
        ["Structure", "Language + Domain subjects + General Test (programme-wise)"],
        ["Marking", "MCQ; typically −1 for wrong"],
        ["Cutoffs", "University & programme specific"]
      ]),
      syllabusDetail: `
        <h3>How syllabus works</h3>
        <ul>
          <li><strong>Language:</strong> reading comprehension, vocab, grammar (chosen language)</li>
          <li><strong>Domain:</strong> largely Class 12 NCERT of selected subjects (Physics, Chem, Maths, Bio, Accountancy, History, etc.)</li>
          <li><strong>General Test:</strong> GK, current affairs, general mental ability, numerical ability, logical & analytical reasoning (if required)</li>
        </ul>
        <p>Map subjects to each target university course before studying.</p>`,
      fiveYear: DISC + `
        <h3>What consistently matters</h3>
        ${t(["Component", "Trend"], [
          ["Domain NCERT Class 12", "Highest ROI for most programmes"],
          ["Language RC accuracy", "Stable"],
          ["GT quant + reasoning", "Needed only if programme requires GT"],
          ["University-specific combo", "More important than “all India rank”"]
        ])}`
    },
    keam: {
      marksDist: stateMarks("KEAM", [
        ["Subjects", "Physics, Chemistry, Mathematics papers"],
        ["Base", "Kerala HSE + standard PCM"]
      ]),
      syllabusDetail: "<p><strong>Kerala Higher Secondary</strong> + standard PCM map.</p>" + JM_SYLLABUS_DETAIL,
      fiveYear: DISC + pcmTopicChecklist()
    }
  };
})();
