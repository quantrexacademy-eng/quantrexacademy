/**
 * Quantrex — filled topic icons + green/red progress bars for chapter & exam cards.
 * Theme-aware (light/dark). Subject palettes: Math blue, Physics purple, Chem green.
 */
(function (global) {
  "use strict";

  const SUBJECT_KEY = {
    mathematics: "Mathematics",
    maths: "Mathematics",
    math: "Mathematics",
    physics: "Physics",
    chemistry: "Chemistry",
    biology: "Biology",
    botany: "Botany",
    zoology: "Zoology",
    english: "English",
    "logical reasoning": "Reasoning",
    reasoning: "Reasoning",
    lr: "Reasoning"
  };

  function normSubject(subj) {
    if (!subj) return "Default";
    const k = String(subj).trim().toLowerCase();
    return SUBJECT_KEY[k] || String(subj).trim();
  }

  /** Filled Lucide-style paths (viewBox 0 0 24 24) */
  const PATHS = {
    book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20v2H6.5A2.5 2.5 0 0 0 4 21.5v-2zm0-5A2.5 2.5 0 0 1 6.5 12H20v2H6.5A2.5 2.5 0 0 0 4 16.5v-2zm0-5A2.5 2.5 0 0 1 6.5 7H20v2H6.5A2.5 2.5 0 0 0 4 11.5v-2zM6.5 2H20v2H6.5A2.5 2.5 0 0 0 4 6.5V4.5A2.5 2.5 0 0 1 6.5 2z",
    folder: "M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z",
    circle: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
    circleFill: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
    matrix: "M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z",
    dice: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM8 14a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm4-3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm4 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
    chart: "M3 3v18h18v-2H5V3H3zm4 10h2v6H7v-6zm4-4h2v10h-2V9zm4-4h2v14h-2V5z",
    function: "M4 6c0-1.1.9-2 2-2h3v2H6v3H4V6zm0 12v-3h2v3h3v2H6a2 2 0 0 1-2-2zm16-6h-2v-3h-3V7h3a2 2 0 0 1 2 2v3zm0 6a2 2 0 0 1-2 2h-3v-2h3v-3h2v3zM9.5 8.5l1.5 3 1.5-3h2L12.5 12l2 4h-2l-1.5-3-1.5 3h-2l2-4-2-3.5h2z",
    triangle: "M12 2L1 21h22L12 2zm0 4.5L19.5 19h-15L12 6.5z",
    wave: "M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0 4 4 6 0v2c-2 4-4 4-6 0s-4-4-6 0-4 4-6 0-4-4-6 0-4 4-6 0v-2z",
    atom: "M12 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM12 2c-1.5 3.5-5.5 5.5-9 4.5 1 3.5 0 7.5-3 10.5 3.5-1 7.5 0 10.5 3 1-3.5 5-5.5 8.5-4.5-1-3.5 0-7.5 3-10.5-3.5 1-7.5 0-10.5-3 1 1.5 1 3 .5 4.5C14 4 13 3 12 2zm0 4c.8 1.2 1.8 2.1 3 2.6-.5 1.5-.5 3.1 0 4.6-1.2.5-2.2 1.4-3 2.6-.8-1.2-1.8-2.1-3-2.6.5-1.5.5-3.1 0-4.6 1.2-.5 2.2-1.4 3-2.6z",
    flask: "M9 3h6v2h-1v4.4l5.2 9.1A2 2 0 0 1 17.4 22H6.6a2 2 0 0 1-1.8-3.5L10 9.4V5H9V3zm2 2v4.8L6.6 20h10.8L13 9.8V5h-2z",
    bolt: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
    magnet: "M6 3h4v8a2 2 0 1 0 4 0V3h4v8a6 6 0 0 1-12 0V3zm0 14h4v4H6v-4zm8 0h4v4h-4v-4z",
    lightbulb: "M9 21h6v-1.5H9V21zm3-19a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z",
    thermometer: "M14 14.76V4a2 2 0 1 0-4 0v10.76a4 4 0 1 0 4 0zM12 18a2 2 0 1 1 0-4 2 2 0 0 1 0 4z",
    eye: "M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    heart: "M12 21s-7-4.5-9.5-8.5C.5 9 2 5 6 5c2 0 3.5 1 4.5 2.5C11.5 6 13 5 15 5c4 0 5.5 4 3.5 7.5C19 16.5 12 21 12 21z",
    leaf: "M17 8C8 10 5.9 16.2 3.8 20.5c.7.4 1.5.6 2.2.5C12 20 18 14 20 6c-1 1.5-2 2-3 2z",
    dna: "M8 2v2c0 2 2 3 4 4s4 2 4 4v2h-2v-2c0-1-1.5-2-3-2.8S8 7.2 8 6V4h0V2h2zm6 0v2c0 1.2-1.5 2.2-3 3S8 9 8 10.5V12H6v-1.5c0-2 2-3.2 4-4.2S14 4.2 14 2h0zm-6 12v2c0 1.2 1.5 2.2 3 3s3 1.8 3 3v2h-2v-2c0-1-1.5-2-3-2.8S8 17.2 8 16v-2h0zm6 0v2c0 2-2 3.2-4 4.2S6 21.8 6 24H4c0-2.5 2-3.8 4-4.8s4-2.2 4-4.2V14h2z",
    cell: "M12 2C7 2 4 6 4 12s3 10 8 10 8-4 8-10S17 2 12 2zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",
    infinity: "M18.2 8c-1.8 0-3.3.9-4.2 2.2L12 12.5l-2-2.3C9.1 8.9 7.6 8 5.8 8 3.1 8 1 10.2 1 13s2.1 5 4.8 5c1.8 0 3.3-.9 4.2-2.2l2-2.3 2 2.3c.9 1.3 2.4 2.2 4.2 2.2 2.7 0 4.8-2.2 4.8-5s-2.1-5-4.8-5z",
    sigma: "M6 4h12v2.5l-7 5.5 7 5.5V20H6v-2h8.5L8 13.2 14.5 8H6V4z",
    integral: "M14 3c-1.5 0-2.5 1-2.5 2.5V18.5C11.5 20 10.5 21 9 21H7v-2h1.5c.6 0 1-.4 1-1V5.5C9.5 3.6 11 2 13 2h2v2h-1z",
    percent: "M7.5 6.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm9 6a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM6 18L18 6l1.4 1.4L7.4 19.4 6 18z",
    layers: "M12 2L2 7l10 5 10-5-10-5zm0 9L2 6v2l10 5 10-5V6l-10 5zm0 4L2 10v2l10 5 10-5v-2l-10 5z",
    cube: "M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.2L19.5 8 12 11.8 4.5 8 12 4.2zM4 9.7l7 3.5v7.1l-7-3.5V9.7zm9 10.6v-7.1l7-3.5v7.1l-7 3.5z",
    vector: "M4 4h2v14h14v2H4V4zm4 10l4-6 3 4 5-7 1.5 1.2-6.5 9-3-4-2.5 3.8L8 14z",
    angle: "M4 20V4h2v12.6L18.2 6.4l1.4 1.4L7.4 20H4z",
    pi: "M6 6h12v2h-2.5v10h-2V8H10.5v10h-2V8H6V6z",
    root: "M4 14l2-4h2l3 8h2L18 4h2l-6.5 16h-2.2L8.5 12H7l-1 2H4z",
    log: "M5 4h2v16H5V4zm4 0h6a4 4 0 0 1 0 8H11v8H9V4zm2 2v4h4a2 2 0 0 0 0-4h-4z",
    binary: "M4 6h4v2H4V6zm0 5h4v2H4v-2zm0 5h4v2H4v-2zm6-10h10v2H10V6zm0 5h10v2H10v-2zm0 5h10v2H10v-2z",
    set: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    derivative: "M3 17l6-10 4 6 3-4 5 8h-2.5l-2.5-4-3 4-4-6-4 7H3z",
    // Peak / valley for maxima–minima
    mountain: "M2 20h20L14.5 6.5 11 12 8.5 8.5 2 20zm9.5-6.5L14 9l5 9H5l3.5-5.5L9.5 14.5 11.5 13.5z",
    // Rising/falling for monotonicity
    trend: "M3 17.5 9.5 11l3.5 3.5L21 6.5V4h-2.5l-5.5 5.5L9.5 6.5 3 13v4.5zM14 18h7v-2h-7v2z",
    // Gauge / rate / approximation
    gauge: "M12 3a9 9 0 0 0-9 9h2a7 7 0 0 1 14 0h2a9 9 0 0 0-9-9zm-1 8.5 4.5-4.5 1.4 1.4L12.4 13H11v-1.5zM4 14h16v2H4v-2zm2 3h12v2H6v-2z",
    // Tangent line sketch
    tangent: "M3 18h18v2H3v-2zM5 16l7-10 2 3 5-6 1.5 1.2-6.5 7.8-2-3L6.5 17.5 5 16z",
    // Area / region
    area: "M4 4h16v16H4V4zm2 10.5L9 10l3 4 2.5-3.5L18 16H6v-1.5z",
    pendulum: "M12 2v8m0 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-7 2l2 2m12-2l-2 2M5 20h14",
    spring: "M4 6h16v2H4V6zm2 3h12v2H6V9zm-2 3h16v2H4v-2zm2 3h12v2H6v-2zm-2 3h16v2H4v-2z",
    wave2: "M2 12c1.5-3 3-3 4.5 0S10 15 12 12s3-3 4.5 0S19.5 15 22 12",
    battery: "M16 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm4 3h1a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1V9z",
    sun: "M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0-4v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4",
    molecule: "M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM9.5 9.5l5 0M10 10.5l1.5 5.5M14 10.5l-1.5 5.5",
    beaker: "M6 3h12v2h-1v5.5l4 9A2 2 0 0 1 19.2 22H4.8a2 2 0 0 1-1.8-2.5l4-9V5H6V3zm4 2v5.2L6.4 20h11.2L14 10.2V5h-4z",
    bond: "M4 12h6m4 0h6M7 9l3 3-3 3m10-6l-3 3 3 3",
    crystal: "M12 2l4 6-4 14L8 8l4-6zm0 3.5L10 8h4l-2-2.5z",
    gas: "M8 18a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1.5A4.5 4.5 0 1 1 17 18H8z",
    flame: "M12 2s4 4 4 8a4 4 0 0 1-8 0c0-2 1-4 2-5-1 3 1 5 1 5s-3-1-3-5c0-3 4-8 4-8z",
    drop: "M12 2.7c-3 4-7 7.5-7 12a7 7 0 0 0 14 0c0-4.5-4-8-7-12z",
    scale: "M12 3v18M5 7h14M7 7l-3 6h6L7 7zm10 0l-3 6h6l-3-6z",
    target: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
    clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5v5.2l3.5 2.1-.9 1.5L11 13V7h2z",
    rocket: "M12 2c3 2 5 5 5 9 0 2-.5 4-1.5 5.5L14 18H10l-1.5-1.5C7.5 15 7 13 7 11c0-4 2-7 5-9zm0 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM9 19h6v2H9v-2z",
    brain: "M9.5 4A3.5 3.5 0 0 0 6 7.5V9a3 3 0 0 0-1 5.8V16a3 3 0 0 0 3 3h.5A3.5 3.5 0 0 0 12 22a3.5 3.5 0 0 0 3.5-3H16a3 3 0 0 0 3-3v-1.2A3 3 0 0 0 18 9V7.5A3.5 3.5 0 0 0 14.5 4 3.4 3.4 0 0 0 12 5.1 3.4 3.4 0 0 0 9.5 4z",
    text: "M4 6h16v2H4V6zm0 5h12v2H4v-2zm0 5h16v2H4v-2z",
    puzzle: "M10 4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v3h-1a2 2 0 1 0 0 4h1v3a2 2 0 0 1-2 2h-3v-1a2 2 0 1 0-4 0v1H6a2 2 0 0 1-2-2v-3h1a2 2 0 1 0 0-4H4V7a2 2 0 0 1 2-2h3V4z",
    globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.5 0 3.4 2.7 3.9 6H8.1C8.6 6.7 10.5 4 12 4zm-4.9 8c.2 1.4.7 2.7 1.3 3.7A8 8 0 0 1 4.1 12h3zm1 6.1c.6 1 1.4 1.9 2.4 1.9s1.8-.9 2.4-1.9c-.7-.3-1.5-.6-2.4-.6s-1.7.3-2.4.6zm5.5-2.4c.6-1 1.1-2.3 1.3-3.7h3a8 8 0 0 1-4.3 3.7z"
  };

  // stroke-only icons rendered as filled via stroke for thin metaphors
  const STROKE_ICONS = new Set(["wave", "wave2", "pendulum", "bond", "sun"]);

  // More-specific topic rules FIRST (subtopics beat parent chapter names).
  const RULES = [
    // —— Application of Derivatives / Calculus subtopics ——
    { re: /maxima|minima|max.?min|extreme value|local max|local min|absolute max|absolute min/i, icon: "mountain" },
    { re: /monotonic|increasing|decreasing|non.?decreasing|non.?increasing/i, icon: "trend" },
    { re: /rate.?measur|related.?rate|error.?and.?approx|approximat|differentials?\b|percentage.?error/i, icon: "gauge" },
    { re: /tangent|normal\b|subtangent|subnormal/i, icon: "tangent" },
    { re: /mean value|rolle|lagrange.?mvt|cauchy.?mvt/i, icon: "function" },
    { re: /curve.?sketch|asymptote|concavit|inflection|point of inflexion/i, icon: "derivative" },
    { re: /area.?under|area between|area of region/i, icon: "area" },
    { re: /volume of solid|revolution|surface of revolution/i, icon: "cube" },
    // —— Trigonometry subtopics ——
    { re: /measurement of angle|angle.?measure|degree|radian|sexagesimal/i, icon: "angle" },
    { re: /sum and difference|product.?to.?sum|sum.?to.?product|transformation formula/i, icon: "layers" },
    { re: /basic identit|t.?ratio|trigono.?ratio|compound angle|multiple angle|sub.?multiple/i, icon: "wave" },
    { re: /trigono|height and distance|inverse trigon/i, icon: "wave" },
    // —— Core math chapters ——
    { re: /matrix|matrices|determinant/i, icon: "matrix" },
    { re: /probab|permutation|combination|binomial theorem|random var/i, icon: "dice" },
    { re: /\bcircle\b|conic|ellipse|parabola|hyperbola/i, icon: "circleFill" },
    { re: /function|relation|mapping/i, icon: "function" },
    { re: /derivative|differenti|application of deriv/i, icon: "derivative" },
    { re: /integral|definite|indefinite|anti.?deriv/i, icon: "integral" },
    { re: /limit|continuity|continuity and/i, icon: "infinity" },
    { re: /trigon|inverse tri/i, icon: "wave" },
    { re: /complex number|argand/i, icon: "vector" },
    { re: /vector|3d|three dimensional|direction cosine/i, icon: "vector" },
    { re: /straight line|pair of straight|slope/i, icon: "angle" },
    { re: /\btriangle\b|properties of triangle/i, icon: "triangle" },
    { re: /sequence|series|progressions|ap\b|gp\b|hp\b/i, icon: "layers" },
    { re: /quadratic|equation|inequalit/i, icon: "sigma" },
    { re: /logarithm|exponential/i, icon: "log" },
    { re: /set theory|\bsets\b|relation and function/i, icon: "set" },
    { re: /statistic|mean|variance|deviation/i, icon: "chart" },
    { re: /mathematical induction|reasoning/i, icon: "brain" },
    { re: /linear programming|lpp/i, icon: "chart" },
    { re: /\bmodulo|number system|integer/i, icon: "binary" },
    { re: /permutation|p&c/i, icon: "puzzle" },
    { re: /height and distance/i, icon: "triangle" },
    { re: /coordinate geometry|cartesian/i, icon: "target" },
    { re: /differential equation/i, icon: "function" },
    { re: /\bpi\b|area of|surface area|volume/i, icon: "cube" },
    { re: /root|surd/i, icon: "root" },
    { re: /percent|ratio|proportion/i, icon: "percent" },
    // —— Physics ——
    { re: /kinematics|motion in|projectile|relative motion/i, icon: "rocket" },
    { re: /newton|laws of motion|friction|dynamics/i, icon: "bolt" },
    { re: /work.?energy|power|collision/i, icon: "bolt" },
    { re: /rotational|torque|angular|moment of inertia/i, icon: "circle" },
    { re: /gravitation|satellite|kepler|escape/i, icon: "globe" },
    { re: /fluid|bernoulli|viscosity|surface tension/i, icon: "drop" },
    { re: /thermal|heat|thermodynamic|calorimetry|kinetic theory/i, icon: "thermometer" },
    { re: /oscillation|shm|simple harmonic|wave motion|sound|doppler/i, icon: "wave2" },
    { re: /electrostat|coulomb|gauss|capacitor|electric field|potential/i, icon: "bolt" },
    { re: /current electricity|kirchhoff|resist|ohm/i, icon: "battery" },
    { re: /magnet|biot.?savart|ampere|earth.?magnetic/i, icon: "magnet" },
    { re: /electromagnetic induction|ac\b|alternating|transformer|lc\b/i, icon: "wave" },
    { re: /ray optics|wave optics|lens|mirror|interference|diffraction|polarization/i, icon: "eye" },
    { re: /dual nature|photoelectric|atom|bohr|x.?ray|nuclear|radioactiv|semiconductor|electronic device|communication/i, icon: "atom" },
    { re: /unit|dimension|error|measurement|approximation/i, icon: "scale" },
    { re: /solid|elasticity|young|bulk modulus/i, icon: "cube" },
    { re: /em wave|maxwell|displacement current/i, icon: "wave" },
    // —— Chemistry ——
    { re: /mole|stoichiometr|equivalent|concentration|solution/i, icon: "beaker" },
    { re: /atomic structure|quantum|electronic config|periodic/i, icon: "atom" },
    { re: /chemical bonding|vsepr|hybrid|molecular structure|valence/i, icon: "molecule" },
    { re: /gaseous|ideal gas|real gas|liquid state|solid state|states of matter/i, icon: "gas" },
    { re: /thermodynamics|thermochemistry|enthalpy|entropy|gibbs/i, icon: "flame" },
    { re: /equilibrium|ionic equil|acid.?base|buffer|solubility product|le chatelier/i, icon: "scale" },
    { re: /redox|electrochem|conductance|cell|nernst|battery/i, icon: "battery" },
    { re: /chemical kinetics|rate of reaction|order of reaction|arrhenius/i, icon: "clock" },
    { re: /surface chemistry|adsorption|colloid|catalysis/i, icon: "layers" },
    { re: /p.?block|s.?block|d.?block|f.?block|hydrogen|metallurgy|isolation/i, icon: "crystal" },
    { re: /coordination|ligand|crystal field|isomerism/i, icon: "molecule" },
    { re: /organic|hydrocarbon|alkane|alkene|alkyne|benzene|halo|alcohol|phenol|ether|aldehyde|ketone|carboxylic|amine|biomolecule|polymer|chemistry in everyday|iupac|isomer|goc|general organic|reaction mechanism|named reaction/i, icon: "flask" },
    { re: /environment|pollution|green chemistry/i, icon: "leaf" },
    // —— Biology ——
    { re: /cell|biomolecule|enzyme|photosynthesis|respiration/i, icon: "cell" },
    { re: /genetics|dna|rna|heredity|evolution|reproduction/i, icon: "dna" },
    { re: /human physiology|digestion|circulation|excretion|nervous|endocrine|locomotion/i, icon: "heart" },
    { re: /plant|botany|morphology|anatomy|transport in plant/i, icon: "leaf" },
    { re: /ecology|ecosystem|biodiversity|organism/i, icon: "globe" },
    { re: /diversity|living world|biological classification/i, icon: "layers" },
    { re: /health|disease|immunity|microbe/i, icon: "heart" },
    { re: /biotech|principle of inheritance/i, icon: "dna" },
    { re: /english|grammar|comprehension|vocabulary|reading/i, icon: "text" },
    { re: /reasoning|puzzle|coding|blood relation|syllogism|seating/i, icon: "puzzle" },
    { re: /light|optics/i, icon: "sun" },
    { re: /force|pressure|energy/i, icon: "bolt" },
    { re: /chemical|reaction/i, icon: "flask" }
  ];

  function resolveIconKey(name) {
    const n = String(name || "").trim();
    if (!n) return "book";
    for (let i = 0; i < RULES.length; i++) {
      if (RULES[i].re.test(n)) return RULES[i].icon;
    }
    return "book";
  }

  const SUBJECT_FILL = {
    Mathematics: "#2563eb",
    Physics: "#7c3aed",
    Chemistry: "#16a34a",
    Biology: "#db2777",
    Botany: "#db2777",
    Zoology: "#db2777",
    English: "#ea580c",
    Reasoning: "#4f46e5",
    Default: "#0284c7"
  };

  /** Clean path data — only allow safe SVG path chars (avoids HTML/MathJax corruption). */
  function safePath(d) {
    return String(d || PATHS.book).replace(/[^MmLlHhVvCcSsQqTtAaZz0-9.,\s\-eE]/g, "");
  }

  /**
   * Data-URI background icon — never inject raw <svg> into page HTML.
   * MathJax was mangling inline SVG paths into garbage glyphs (öÿŽ etc.) before every title.
   */
  function iconDataUri(iconKey, fill) {
    const d = safePath(PATHS[iconKey] || PATHS.book);
    const color = fill || "#2563eb";
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">' +
      '<path fill="' + color + '" d="' + d + '"/>' +
      "</svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function chapterIconHtml(chapterName, subject, meta) {
    const name = (meta && (meta.shortName || meta.title || meta.name)) || chapterName || "";
    const subj = normSubject(subject || (meta && meta.subject) || "");
    const key = resolveIconKey(name || chapterName);
    const fill = SUBJECT_FILL[subj] || SUBJECT_FILL.Default;
    const uri = iconDataUri(key, fill);
    const safeSubj = String(subj).replace(/"/g, "");
    const safeKey = String(key).replace(/"/g, "");
    // mathjax_ignore + no child text = no garbage glyphs before chapter names
    return (
      '<span class="qx-ch-icon mathjax_ignore tex2jax_ignore" data-subj="' +
      safeSubj +
      '" data-icon="' +
      safeKey +
      '" role="img" aria-label="' +
      safeKey +
      '" style="background-image:url(\'' +
      uri +
      "')\"></span>"
    );
  }

  /**
   * Green = completed/attempted share; Red = remaining (or out-of-syllabus weight).
   * Optional syllabusCategory: "removed" → all red track with tiny green if any solved;
   * "reduced" → slightly more red weight on unsolved.
   */
  function progressBarHtml(solved, total, opts) {
    opts = opts || {};
    const t = Math.max(0, Number(total) || 0);
    let s = Math.max(0, Number(solved) || 0);
    if (t > 0) s = Math.min(s, t);
    let green = 0;
    let red = 100;
    if (t > 0) {
      green = Math.round((s / t) * 1000) / 10;
      red = Math.round(((t - s) / t) * 1000) / 10;
      if (opts.syllabusCategory === "removed" && s === 0) {
        green = 0;
        red = 100;
      } else if (opts.syllabusCategory === "reduced" && s < t) {
        // push a bit more into red for reduced syllabus remainder
        const boost = Math.min(red * 0.08, 8);
        green = Math.max(0, green - boost);
        red = Math.min(100, red + boost);
      }
    } else if (opts.emptyAsNeutral) {
      green = 0;
      red = 100;
    }
    // Ensure segments sum ~100
    if (green + red !== 100 && t > 0) {
      red = Math.round((100 - green) * 10) / 10;
    }
    const label = t ? `${s}/${t}` : (opts.label || "0/0");
    return `<div class="qx-prog-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${t || 100}" aria-valuenow="${s}" title="${label} done">
      <span class="qx-prog-g" style="width:${green}%"></span>
      <span class="qx-prog-r" style="width:${red}%"></span>
    </div>`;
  }

  function examProgressStats(examSlug) {
    const slug = examSlug || "";
    const solvedSet = new Set(
      ((typeof STATE !== "undefined" && STATE.solved) || []).map(function (x) { return x && x.id; }).filter(Boolean)
    );
    const qs = (typeof QUESTIONS !== "undefined" && Array.isArray(QUESTIONS))
      ? QUESTIONS.filter(function (q) { return q && q._bank === slug; })
      : [];
    if (qs.length) {
      let solved = 0;
      qs.forEach(function (q) { if (solvedSet.has(q.id)) solved++; });
      return { solved: solved, total: qs.length };
    }
    // Bank not loaded — estimate from STATE.solved ids that include slug prefix if any
    let solved = 0;
    solvedSet.forEach(function (id) {
      if (String(id).indexOf(slug) !== -1) solved++;
    });
    return { solved: solved, total: 0 };
  }

  function chapterProgressStats(examSlug, subject, chapterName, totalHint) {
    if (typeof cpyqbChapterStats === "function" && examSlug) {
      return cpyqbChapterStats(examSlug, subject, chapterName, totalHint);
    }
    const solvedSet = new Set(
      ((typeof STATE !== "undefined" && STATE.solved) || []).map(function (x) { return x && x.id; }).filter(Boolean)
    );
    const qs = (typeof QUESTIONS !== "undefined" && Array.isArray(QUESTIONS))
      ? QUESTIONS.filter(function (q) {
          return q && (!examSlug || q._bank === examSlug) && q.subject === subject && q.chapter === chapterName;
        })
      : [];
    let solved = 0;
    qs.forEach(function (q) { if (solvedSet.has(q.id)) solved++; });
    return { solved: solved, total: totalHint || qs.length || 0 };
  }

  const api = {
    normSubject: normSubject,
    resolveIconKey: resolveIconKey,
    chapterIconHtml: chapterIconHtml,
    progressBarHtml: progressBarHtml,
    examProgressStats: examProgressStats,
    chapterProgressStats: chapterProgressStats
  };

  global.QxCardIcons = api;
})(typeof window !== "undefined" ? window : globalThis);
