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
    science: "Science",
    "social science": "Social Science",
    sst: "Social Science",
    history: "History",
    geography: "Geography",
    civics: "Civics",
    polity: "Civics",
    "political science": "Civics",
    economics: "Economics",
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
    book: "M5 3h11a3 3 0 0 1 3 3v13H8a2 2 0 0 0-2 2H5V3zm3 3v2h8V6H8zm0 4v2h6v-2H8z",
    people: "M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm8 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.5 13C5.5 13 3 15 3 17.6V21h11v-3.4C14 15 11.5 13 8.5 13zm8 1.2c-.5 0-1 0-1.5.1 1.4 1.1 2.3 2.6 2.3 4.3V21h5v-2.2c0-2.3-2.3-4.6-5.8-4.6z",
    terrain: "M2 20l6.5-10 3.5 5.2L15 9l7 11H2zm12.2-8.4L16.8 8l2.4 3.6-1.6 1.2-1.4-2z",
    cloud: "M7 19h11a5 5 0 0 0 .8-9.9A6.5 6.5 0 0 0 6.2 11 4.2 4.2 0 0 0 7 19z",
    camp: "M12 3l8 16H4L12 3zm0 5.5L8.2 16h7.6L12 8.5zM3 20h18v2H3v-2z",
    landmark: "M4 21h16v2H4v-2zM5 10h14v2H5v-2zm1.5 3h2v6h-2v-6zm4.5 0h2v6h-2v-6zm4.5 0h2v6h-2v-6zM4 8l8-5 8 5v2H4V8z",
    vote: "M8 2h8l2 4H6l2-4zM5 8h14v13H5V8zm3 3v2h8v-2H8zm0 4v2h6v-2H8z",
    coins: "M12 3c3.3 0 6 1.6 6 3.5S15.3 10 12 10 6 8.4 6 6.5 8.7 3 12 3zm-6 7.2C7.4 11.4 9.6 12 12 12s4.6-.6 6-1.8V13c0 1.9-2.7 3.5-6 3.5s-6-1.6-6-3.5v-2.8zm0 5C7.4 16.4 9.6 17 12 17s4.6-.6 6-1.8V20c0 1.9-2.7 3.5-6 3.5s-6-1.6-6-3.5v-4.8z",
    cart: "M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM3 3h3.2l.6 2H21l-2.2 8.2A3 3 0 0 1 15.9 15H8.6L8 17H21v2H7.2L5 4H3V3z",
    ocean: "M3 16c1.8-2.2 3.4-2.2 5 0s3.2 2.2 4.8 0 3.2-2.2 4.8 0 3.2 2.2 4.4 0v3c-1.2 2.2-2.8 2.2-4.4 0s-3.2-2.2-4.8 0-3.2 2.2-4.8 0-3.2-2.2-5 0v-3zM7 6.5A5 5 0 0 1 17 6a4 4 0 0 1 .5 8H8.2A4.2 4.2 0 0 1 7 6.5z",
    shield: "M12 2l8 3v7c0 5.2-3.4 8.8-8 10-4.6-1.2-8-4.8-8-10V5l8-3zm0 4.2L7 8v4.2c0 3.4 2.1 5.8 5 6.7 2.9-.9 5-3.3 5-6.7V8l-5-1.8z",
    scroll: "M6 3h9a3 3 0 0 1 3 3v12h-2V6a1 1 0 0 0-1-1H8v14a2 2 0 0 1-4 0V5a2 2 0 0 1 2-2zm3 5h6v2H9V8zm0 4h5v2H9v-2z",
    gavel: "M2 20h12v2H2v-2zm9.8-8.6l6.4-6.4 2.8 2.8-6.4 6.4-2.8-2.8zM8.2 8.2l2.8-2.8 2.1 2.1-2.8 2.8-2.1-2.1zM4 16l5.5-5.5 2.1 2.1L6.1 18H4v-2z",
    wallet: "M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2h-2V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2h2v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7zm14 4h5v4h-5a2 2 0 0 1 0-4z",
    quill: "M14 3c4 0 7 3 7 7-3 1-6 4-9 8l-2 2-3-3 2-2c4-3 7-6 8-9-1 0-2 0-3-.2L14 3zM4 18l3 3-4 1 1-4z",
    microscope: "M8 3h3v6H8V3zm-1 7h5v2H7v-2zm1.5 3h2v4.2A5 5 0 1 0 16 20h-2a3 3 0 1 1-3.5-2.95V13zM4 20h10v2H4v-2z",
    tissue: "M5 4h14v4H5V4zm1 5h12v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9zm3 3v2h6v-2H9z",
    mix: "M7 3h10v3l-3 5v8h-4v-8L7 6V3zm2 2v1.2L11.4 10h1.2L15 6.2V5H9z",
    machine: "M10 2h4v3h3l2 5h-3v9H8V10H5l2-5h3V2zm-1 10h6v5H9v-5z",
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
    heart: "M32 54c-1 0-2-.4-3-1C18 44 10 36 10 27 10 20 15 15 22 15c3.5 0 6.5 1.5 8.5 4L32 21l1.5-2C35.5 16.5 38.5 15 42 15c7 0 12 5 12 12 0 9-8 17-19 26-1 .6-2 1-3 1z",

    // Distinct calculus / medical glyphs (v2)
    definite: "M3 19h18v2H3v-2zm2-2V9l4 3 4-6 4 5 2-2v8H5z",
    indefinite: "M13.5 2.5c-1.8 0-3 1.3-3 3.2V18c0 2-1.2 3.5-3 3.5H5.5v-2H7.5c.8 0 1.3-.6 1.3-1.5V5.7c0-3 1.9-5.2 4.7-5.2H16v2h-2.5zM8 11h8v2H8v-2z",
    lungs: "M12 4v16M12 8c-2-4-7-4-7 2v8c0 2 1.5 3 3 3 1.2 0 2-.6 2.5-1.5L12 16l1.5 3.5c.5.9 1.3 1.5 2.5 1.5 1.5 0 3-1 3-3v-8c0-6-5-6-7-2z",
    kidney: "M8 4c-3 0-5 3-5 7 0 5 3 9 6 9 1.2 0 2-.6 2.5-1.5C12 16 13 12 13 9c0-3-1.5-5-5-5zm8 0c-3.5 0-5 2-5 5 0 3 1 7 1.5 9.5.5.9 1.3 1.5 2.5 1.5 3 0 6-4 6-9 0-4-2-7-5-7z",
    brain: "M9.5 4.5C7 4.5 5 6.4 5 9c0 1 .3 1.9.9 2.6C4.7 12.2 4 13.5 4 15c0 2.2 1.8 4 4 4h1.5c.8 1.2 2.1 2 3.5 2s2.7-.8 3.5-2H16c2.2 0 4-1.8 4-4 0-1.5-.7-2.8-1.9-3.4.6-.7.9-1.6.9-2.6 0-2.6-2-4.5-4.5-4.5-1 0-1.9.3-2.6.9-.7-.6-1.6-.9-2.6-.9z",
    bone: "M6.5 5.5a2.5 2.5 0 0 1 3.2.4L12 8.2l2.3-2.3a2.5 2.5 0 1 1 2.9 2.9L14.9 11l2.3 2.3a2.5 2.5 0 1 1-2.9 2.9L12 13.8l-2.3 2.3a2.5 2.5 0 1 1-2.9-2.9L9.1 11 6.8 8.7a2.5 2.5 0 0 1-.3-3.2z",
    stomach: "M8 5c0-1.5 1.5-3 4-3s4 1.5 4 3v2c2 1 3 3 3 5.5C19 16 16.5 20 12 20S5 16 5 12.5C5 10 6 8 8 7V5zm2 2.2V7c0-.6.7-1 2-1s2 .4 2 1v.2c-1.3.3-2.7.3-4 0z",
    hormone: "M12 2v6m0 8v6M8 8l8 8M16 8L8 16M7 12H3m18 0h-4M9.5 5.5a2 2 0 1 1-2.8-2.8 2 2 0 0 1 2.8 2.8zm8.8 0a2 2 0 1 1-2.8-2.8 2 2 0 0 1 2.8 2.8zM9.5 18.5a2 2 0 1 1-2.8 2.8 2 2 0 0 1 2.8-2.8zm8.8 0a2 2 0 1 1-2.8 2.8 2 2 0 0 1 2.8-2.8z",
    ear: "M12 3a7 7 0 0 1 7 7v1a4 4 0 0 1-4 4h-1v2a3 3 0 0 1-6 0v-1h2v1a1 1 0 0 0 2 0v-3h2a2 2 0 0 0 2-2v-1a5 5 0 0 0-10 0v4H6v-4a7 7 0 0 1 6-7z",
    eyeBall: "M12 5c5 0 9 4.5 10 7-1 2.5-5 7-10 7S3 14.5 2 12c1-2.5 5-7 10-7zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6z",
    plantCell: "M12 2c4 0 7 3.5 7 8 0 5-3 10-7 12-4-2-7-7-7-12 0-4.5 3-8 7-8zm0 3c-2.5 0-4.5 2.2-4.5 5.5 0 3.2 1.8 6.5 4.5 8.2 2.7-1.7 4.5-5 4.5-8.2C16.5 7.2 14.5 5 12 5zm0 3a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z",
    bacteria: "M7 8a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm10 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM5 7l2 2M4 12h3M5 17l2-2M19 7l-2 2M20 12h-3M19 17l-2-2M10 5v3M14 5v3M10 16v3M14 16v3",
    tooth: "M9 3h6c1.5 0 2.5 1 2.5 2.5V10c0 2-.5 4-1.5 6.5L15 21h-2l-.5-3h-1L11 21H9l-1-4.5C7 14 6.5 12 6.5 10V5.5C6.5 4 7.5 3 9 3z",
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
    globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.5 0 3.4 2.7 3.9 6H8.1C8.6 6.7 10.5 4 12 4zm-4.9 8c.2 1.4.7 2.7 1.3 3.7A8 8 0 0 1 4.1 12h3zm1 6.1c.6 1 1.4 1.9 2.4 1.9s1.8-.9 2.4-1.9c-.7-.3-1.5-.6-2.4-.6s-1.7.3-2.4.6zm5.5-2.4c.6-1 1.1-2.3 1.3-3.7h3a8 8 0 0 1-4.3 3.7z",
    video: "M4 6h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm14 3 4-2v10l-4-2V9zM9 9.5v5l5-2.5-5-2.5z"
  };

  // stroke-only icons rendered as filled via stroke for thin metaphors
  const STROKE_ICONS = new Set(["wave", "wave2", "pendulum", "bond", "sun"]);

  const SUBJECT_ICON = {
    Mathematics: "sigma",
    Physics: "atom",
    Chemistry: "flask",
    Biology: "cell",
    Botany: "leaf",
    Zoology: "brain",
    English: "quill",
    Science: "microscope",
    "Social Science": "globe",
    History: "scroll",
    Geography: "globe",
    Civics: "gavel",
    Economics: "coins",
    Reasoning: "puzzle",
    Default: "folder"
  };

  // More-specific topic rules FIRST (subtopics beat parent chapter names).
  const RULES = [

    // —— Quantrex v2: ultra-specific chapter icons (must stay FIRST) ——
    { re: /chemical bonding|molecular structure|vsepr|hybridi[sz]ation/i, icon: "molecule" },
    { re: /current electricity|kirchhoff|ohm/i, icon: "battery" },
    { re: /ray optics|wave optics|optical instrument/i, icon: "eye" },
    { re: /electrostat|coulomb|gauss|capacitor/i, icon: "bolt" },
    { re: /\bthermodynamics\b/i, icon: "flame" },
    { re: /organic chemistry|hydrocarbons|general organic|goc\b/i, icon: "flask" },
    { re: /\bindefinite\b/i, icon: "indefinite" },
    { re: /(?:^|[^a-z])definite\s*integr|\bapplication of integr|area under the curve/i, icon: "definite" },
    { re: /limits? and derivatives|limits?,\s*continuity/i, icon: "infinity" },
    { re: /continuity and differentiability/i, icon: "derivative" },
    { re: /application of derivatives/i, icon: "mountain" },
    { re: /differential equations?/i, icon: "function" },
    { re: /\bmatrices\b|\bmatrix\b/i, icon: "matrix" },
    { re: /\bdeterminants?\b/i, icon: "matrix" },
    { re: /vector algebra/i, icon: "vector" },
    { re: /three dimensional geometry|3[- ]?d geometry/i, icon: "cube" },
    { re: /linear programming/i, icon: "chart" },
    { re: /mathematical reasoning/i, icon: "brain" },
    { re: /statistics\b/i, icon: "chart" },
    { re: /probability\b/i, icon: "dice" },
    { re: /binomial theorem/i, icon: "sigma" },
    { re: /permutations? and combinations?/i, icon: "puzzle" },
    { re: /complex numbers?/i, icon: "vector" },
    { re: /relations? and functions?/i, icon: "function" },
    { re: /inverse trigonometric/i, icon: "wave" },
    { re: /chemical coordination|endocrine|hormone|pituitary|thyroid/i, icon: "hormone" },
    { re: /body fluids? and circulation|circulat|blood|cardiac|heart beat/i, icon: "heart" },
    { re: /breathing and exchange|respiratory|lungs?\b|gaseous exchange/i, icon: "lungs" },
    { re: /excretory products|excretion|kidney|osmoregul/i, icon: "kidney" },
    { re: /neural control|nervous system|neuron|\bbrain\b/i, icon: "brain" },
    { re: /locomotion and movement|skeletal|muscular|bones?\b/i, icon: "bone" },
    { re: /digestion and absorption|digestive|alimentary|stomach|nutrition in/i, icon: "stomach" },
    { re: /liver|hepatic|bilirubin/i, icon: "liver" },
    { re: /intestin|absorption of food|gut\b/i, icon: "intestine" },
    
    { re: /human reproduction|reproductive health|reproduction in organism/i, icon: "heart" },
    { re: /photosynthesis/i, icon: "leaf" },
    { re: /respiration in plants|plant respiration/i, icon: "plantCell" },
    { re: /cell cycle|cell division|mitosis|meiosis/i, icon: "cell" },
    { re: /biomolecules?/i, icon: "molecule" },
    { re: /structural organisation|animal tissues?|plant tissues?/i, icon: "tissue" },
    { re: /morphology of flowering|anatomy of flowering/i, icon: "leaf" },
    { re: /transport in plants|mineral nutrition/i, icon: "leaf" },
    { re: /plant growth|plant hormone|photoperiod/i, icon: "leaf" },
    { re: /human health and disease|immunity|pathogen/i, icon: "bacteria" },
    { re: /microbes in human welfare/i, icon: "bacteria" },
    { re: /biotechnology/i, icon: "dna" },
    { re: /organisms? and populations?|ecosystem|biodiversity|environmental issues/i, icon: "globe" },
    { re: /evolution\b|origin of life/i, icon: "dna" },
    { re: /molecular basis of inheritance|principles? of inheritance|mendel/i, icon: "dna" },
    { re: /strategies for enhancement|food production/i, icon: "leaf" },
    { re: /the living world|biological classification|plant kingdom|animal kingdom/i, icon: "layers" },
    { re: /cell\s*:?\s*the unit|cell the unit of life/i, icon: "cell" },
    { re: /sense organ|ear\b|hearing/i, icon: "ear" },
    { re: /\beye\b|vision|optics of eye/i, icon: "eyeBall" },

    // —— Module / exam folders ——
    { re: /concept video|\bvideos?\b/i, icon: "video" },
    { re: /notes \(pdf\)|notes pdf|downloadable chapter notes/i, icon: "text" },
    { re: /formula sheet/i, icon: "sigma" },
    { re: /practice questions?/i, icon: "target" },
    { re: /revision notes|quick revision|quick concepts?/i, icon: "bolt" },
    { re: /topic.?wise/i, icon: "layers" },
    { re: /all previous year/i, icon: "folder" },
    { re: /previous year questions?|\bpyqs?\b/i, icon: "clock" },
    { re: /^beginner\b/i, icon: "lightbulb" },
    { re: /target mains|target neet/i, icon: "target" },
    { re: /advance climb|advanced climb/i, icon: "rocket" },
    { re: /must do|last 5 year/i, icon: "clock" },
    { re: /top numerical|numericals?\b/i, icon: "sigma" },
    { re: /^jee main|^jee advanced|^jee\b|iit jee/i, icon: "rocket" },
    { re: /cbse board|^cbse\b/i, icon: "book" },
    { re: /olympiad/i, icon: "target" },
    { re: /iit foundation|foundation building/i, icon: "microscope" },
    { re: /coming soon/i, icon: "clock" },
    // —— Academic Social Science / SST (before Physics "resist") ——
    { re: /understanding social|social science/i, icon: "people" },
    { re: /earth.?s surface|shaping of the earth|landform|relief/i, icon: "terrain" },
    { re: /atmosphere|climate|weather|monsoon/i, icon: "cloud" },
    { re: /early human|civilisation|civilization|beginning of/i, icon: "camp" },
    { re: /state and society|society/i, icon: "people" },
    { re: /democracy|democratic/i, icon: "landmark" },
    { re: /election|electoral|voting|ballot/i, icon: "vote" },
    { re: /building blocks in economic|economics?\b|economic/i, icon: "coins" },
    { re: /price puzzle|market|drives the market/i, icon: "cart" },
    { re: /ocean/i, icon: "ocean" },
    { re: /life on earth/i, icon: "globe" },
    { re: /resilience|resistance &|1000.?1700/i, icon: "shield" },
    { re: /india and the world|1900 bce|bce/i, icon: "scroll" },
    { re: /\bauthority\b|constitution|civics|political/i, icon: "gavel" },
    { re: /startup|ideas to start/i, icon: "rocket" },
    { re: /financ|money|budget|saving/i, icon: "wallet" },
    { re: /history|empire|kingdom|medieval|ancient|modern india|nationalism|french revolution|russian revolution|industrial revolution/i, icon: "scroll" },
    { re: /geography|drainage|natural vegetation|agriculture|manufacturing industries|population of india/i, icon: "globe" },
    { re: /gender|caste|religion|federal|parliament|judiciary|rights/i, icon: "landmark" },
    // —— Academic Science / Class 7–10 ——
    { re: /entering the world of secondary|exploration:/i, icon: "microscope" },
    { re: /tissues in action|\btissues?\b/i, icon: "tissue" },
    { re: /mixtures? and their separation|separation/i, icon: "mix" },
    { re: /describing motion|motion around/i, icon: "rocket" },
    { re: /how forces affect|forces affect motion/i, icon: "bolt" },
    { re: /simple machines/i, icon: "machine" },
    { re: /journey inside the atom|atomic foundations/i, icon: "atom" },
    { re: /sound waves/i, icon: "wave" },
    { re: /how life continues|reproduction/i, icon: "heart" },
    { re: /patterns in life|diversity and classification/i, icon: "layers" },
    { re: /earth as a system/i, icon: "globe" },
    { re: /building block of life|\bcell\b/i, icon: "cell" },
    // —— Academic English / Math extras ——
    { re: /reading skill|writing skill|grammar|comprehension|vocabulary/i, icon: "quill" },
    { re: /grandmother to read|bharat our land|pot maker|gifts of grace|winds of change|canvas of soil|vitamin|remember my mother|limitless possibilit|gold medals|twin melod|friend found in music|carrier of words|\bwords\b|follow that dream|believe in yourself/i, icon: "book" },
    { re: /use of coordinates|orienting yourself/i, icon: "target" },
    { re: /linear polynomial|algebraic identit|world of numbers/i, icon: "sigma" },
    { re: /up and down|round and round/i, icon: "trend" },
    { re: /perimeter and area|measuring space/i, icon: "area" },
    { re: /mathematics of maybe|what comes next|progressions/i, icon: "dice" },
    // —— Application of Derivatives / Calculus subtopics ——
    { re: /maxima|minima|max.?min|extreme value|local max|local min|absolute max|absolute min/i, icon: "mountain" },
    { re: /monotonic|increasing|decreasing|non.?decreasing|non.?increasing/i, icon: "trend" },
    { re: /rate.?measur|related.?rate|error.?and.?approx|approximat|differentials?\b|percentage.?error/i, icon: "gauge" },
    { re: /tangent|normal\b|subtangent|subnormal/i, icon: "tangent" },
    { re: /mean value|rolle|lagrange.?mvt|cauchy.?mvt/i, icon: "function" },
    { re: /curve.?sketch|asymptote|concavit|inflection|point of inflexion/i, icon: "derivative" },
    { re: /area.?under|area between|area of region/i, icon: "area" },
    { re: /volume of solid|solid of revolution|surface of revolution/i, icon: "cube" },
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
    { re: /indefinite\s*integr|anti.?deriv/i, icon: "indefinite" },
    { re: /\bintegrals?\b/i, icon: "integral" },
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
    { re: /newton|laws of motion|friction|\bdynamics\b/i, icon: "bolt" },
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

  const FALLBACK_ICONS = ["globe", "lightbulb", "rocket", "target", "layers", "cube", "crystal", "flame", "leaf", "heart", "atom", "chart", "shield", "landmark", "coins"];

  function resolveIconKey(name, subject) {
    const n = String(name || "").trim();
    if (!n) {
      const subj0 = normSubject(subject);
      return SUBJECT_ICON[subj0] || "book";
    }
    const asSubj = SUBJECT_KEY[n.toLowerCase()];
    if (asSubj && SUBJECT_ICON[asSubj]) return SUBJECT_ICON[asSubj];
    for (let i = 0; i < RULES.length; i++) {
      if (RULES[i].re.test(n)) return RULES[i].icon;
    }
    const subj = normSubject(subject);
    return SUBJECT_ICON[subj] || "book";
  }

  const SUBJECT_FILL = {
    Mathematics: "#2563eb",
    Physics: "#7c3aed",
    Chemistry: "#16a34a",
    Biology: "#db2777",
    Botany: "#db2777",
    Zoology: "#db2777",
    English: "#ea580c",
    Science: "#0284c7",
    "Social Science": "#0f766e",
    History: "#b45309",
    Geography: "#0d9488",
    Civics: "#7c3aed",
    Economics: "#ca8a04",
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
  
  const ORGAN_ICON_FILES = {
    "angle": "assets/chapter-icons/angle.svg",
    "area": "assets/chapter-icons/area.svg",
    "atom": "assets/chapter-icons/atom.svg",
    "bacteria": "assets/chapter-icons/bacteria.svg",
    "battery": "assets/chapter-icons/battery.svg",
    "beaker": "assets/chapter-icons/beaker.svg",
    "binary": "assets/chapter-icons/binary.svg",
    "bolt": "assets/chapter-icons/bolt.svg",
    "bond": "assets/chapter-icons/bond.svg",
    "bone": "assets/chapter-icons/bone.svg",
    "brain": "assets/chapter-icons/brain.svg",
    "cell": "assets/chapter-icons/cell.svg",
    "chart": "assets/chapter-icons/chart.svg",
    "circle": "assets/chapter-icons/circle.svg",
    "circleFill": "assets/chapter-icons/circleFill.svg",
    "clock": "assets/chapter-icons/clock.svg",
    "crystal": "assets/chapter-icons/crystal.svg",
    "cube": "assets/chapter-icons/cube.svg",
    "definite": "assets/chapter-icons/definite.svg",
    "derivative": "assets/chapter-icons/derivative.svg",
    "dice": "assets/chapter-icons/dice.svg",
    "dna": "assets/chapter-icons/dna.svg",
    "drop": "assets/chapter-icons/drop.svg",
    "ear": "assets/chapter-icons/ear.svg",
    "eye": "assets/chapter-icons/eye.svg",
    "eyeBall": "assets/chapter-icons/eyeBall.svg",
    "flame": "assets/chapter-icons/flame.svg",
    "flask": "assets/chapter-icons/flask.svg",
    "function": "assets/chapter-icons/function.svg",
    "gas": "assets/chapter-icons/gas.svg",
    "gauge": "assets/chapter-icons/gauge.svg",
    "globe": "assets/chapter-icons/globe.svg",
    "heart": "assets/chapter-icons/heart.svg",
    "hormone": "assets/chapter-icons/hormone.svg",
    "indefinite": "assets/chapter-icons/indefinite.svg",
    "infinity": "assets/chapter-icons/infinity.svg",
    "integral": "assets/chapter-icons/integral.svg",
    "intestine": "assets/chapter-icons/intestine.svg",
    "kidney": "assets/chapter-icons/kidney.svg",
    "layers": "assets/chapter-icons/layers.svg",
    "leaf": "assets/chapter-icons/leaf.svg",
    "lightbulb": "assets/chapter-icons/lightbulb.svg",
    "liver": "assets/chapter-icons/liver.svg",
    "log": "assets/chapter-icons/log.svg",
    "lungs": "assets/chapter-icons/lungs.svg",
    "magnet": "assets/chapter-icons/magnet.svg",
    "matrix": "assets/chapter-icons/matrix.svg",
    "mix": "assets/chapter-icons/mix.svg",
    "molecule": "assets/chapter-icons/molecule.svg",
    "mountain": "assets/chapter-icons/mountain.svg",
    "pendulum": "assets/chapter-icons/pendulum.svg",
    "percent": "assets/chapter-icons/percent.svg",
    "pi": "assets/chapter-icons/pi.svg",
    "puzzle": "assets/chapter-icons/puzzle.svg",
    "rocket": "assets/chapter-icons/rocket.svg",
    "root": "assets/chapter-icons/root.svg",
    "scale": "assets/chapter-icons/scale.svg",
    "set": "assets/chapter-icons/set.svg",
    "sigma": "assets/chapter-icons/sigma.svg",
    "spring": "assets/chapter-icons/spring.svg",
    "stomach": "assets/chapter-icons/stomach.svg",
    "sun": "assets/chapter-icons/sun.svg",
    "tangent": "assets/chapter-icons/tangent.svg",
    "target": "assets/chapter-icons/target.svg",
    "thermometer": "assets/chapter-icons/thermometer.svg",
    "trend": "assets/chapter-icons/trend.svg",
    "triangle": "assets/chapter-icons/triangle.svg",
    "vector": "assets/chapter-icons/vector.svg",
    "wave": "assets/chapter-icons/wave.svg",
    "wave2": "assets/chapter-icons/wave2.svg"
  };

  function iconDataUri(iconKey, fill) {
    const d = safePath(PATHS[iconKey] || PATHS.book);
    const color = fill || "#2563eb";
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">' +
      '<path fill="' + color + '" d="' + d + '"/>' +
      "</svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  const ICON_3D = {
    function: "function", sigma: "sigma", integral: "integral", definite: "area", indefinite: "integral", lungs: "heart", kidney: "cell", brain: "brain", bone: "cube", stomach: "beaker", hormone: "molecule", ear: "wave", eyeBall: "eye", plantCell: "leaf", bacteria: "cell", tooth: "cube", pi: "math", percent: "percent",
    log: "function", matrix: "matrix", dice: "dice", chart: "chart", binary: "binary",
    set: "set", derivative: "function", mountain: "mountain", trend: "trend", gauge: "gauge",
    tangent: "angle", area: "area", triangle: "triangle", angle: "angle", infinity: "infinity",
    root: "root",
    atom: "physics", magnet: "magnet", wave: "wave", wave2: "wave",
    rocket: "rocket", pendulum: "pendulum", spring: "spring", thermometer: "thermometer",
    sun: "sun", cube: "cube", vector: "vector", circle: "circle", circleFill: "circle",
    bolt: "energy", battery: "battery", lightbulb: "lightbulb",
    flask: "chem", beaker: "beaker", mix: "mix", molecule: "molecule", flame: "flame",
    crystal: "crystal", gas: "gas", scale: "scale", drop: "drop", bond: "molecule",
    dna: "dna", cell: "cell", heart: "heart", tissue: "tissue",
    microscope: "scope",
    leaf: "leaf", globe: "globe", ocean: "ocean", terrain: "terrain", camp: "camp",
    book: "folder", folder: "folder", scroll: "scroll", quill: "quill", text: "text",
    people: "people", landmark: "landmark", vote: "vote", coins: "coins", cart: "cart",
    shield: "shield", gavel: "gavel", wallet: "wallet", puzzle: "puzzle", brain: "brain",
    eye: "eye", target: "target", clock: "clock", layers: "layers", machine: "machine",
    video: "video", cloud: "cloud"
  };

  const SUBJECT_PLATE = {
    Mathematics: { a: "#dbeafe", b: "#93c5fd", ring: "#2563eb" },
    Physics: { a: "#ede9fe", b: "#c4b5fd", ring: "#7c3aed" },
    Chemistry: { a: "#dcfce7", b: "#86efac", ring: "#16a34a" },
    Biology: { a: "#fce7f3", b: "#f9a8d4", ring: "#db2777" },
    Botany: { a: "#dcfce7", b: "#bbf7d0", ring: "#15803d" },
    Zoology: { a: "#ffedd5", b: "#fdba74", ring: "#ea580c" },
    English: { a: "#ffedd5", b: "#fdba74", ring: "#ea580c" },
    Science: { a: "#e0f2fe", b: "#7dd3fc", ring: "#0284c7" },
    "Social Science": { a: "#ccfbf1", b: "#5eead4", ring: "#0f766e" },
    History: { a: "#fef3c7", b: "#fcd34d", ring: "#b45309" },
    Geography: { a: "#ccfbf1", b: "#5eead4", ring: "#0d9488" },
    Civics: { a: "#ede9fe", b: "#c4b5fd", ring: "#7c3aed" },
    Economics: { a: "#fef9c3", b: "#fde047", ring: "#ca8a04" },
    Reasoning: { a: "#e0e7ff", b: "#a5b4fc", ring: "#4f46e5" },
    Default: { a: "#e2e8f0", b: "#cbd5e1", ring: "#0284c7" }
  };

  function plateStyle(subj) {
    const p = SUBJECT_PLATE[subj] || SUBJECT_PLATE.Default;
    return "--qx-plate-a:" + p.a + ";--qx-plate-b:" + p.b + ";--qx-plate-ring:" + p.ring;
  }

  function chapterIconHtml(chapterName, subject, meta) {
    const name = (meta && (meta.shortName || meta.title || meta.name)) || chapterName || "";
    const subj = normSubject(subject || (meta && meta.subject) || "");
    const key = resolveIconKey(name || chapterName, subj);
    const fill = SUBJECT_FILL[subj] || SUBJECT_FILL.Default;
    const organFile = ORGAN_ICON_FILES[key];
    const uri = organFile
      ? (organFile + "?v=qxmd98")
      : iconDataUri(key, fill);
    const safeSubj = String(subj).replace(/"/g, "");
    const safeKey = String(key).replace(/"/g, "");
    const plate = plateStyle(subj);
    const label = String(name || safeKey).replace(/"/g, "").slice(0, 80);
    return (
      '<span class="qx-ch-icon qx-ch-live mathjax_ignore tex2jax_ignore" data-subj="' +
      safeSubj +
      '" data-icon="' +
      safeKey +
      '" data-anim="' +
      safeKey +
      '" style="' +
      plate +
      '" role="img" aria-label="' +
      label +
      '">' +
      '<span class="qx-ch-orbit" aria-hidden="true"></span>' +
      '<span class="qx-ch-orbit qx-ch-orbit-2" aria-hidden="true"></span>' +
      '<img class="qx-ch-glyph-img" src="' +
      uri +
      '" alt="" width="28" height="28" decoding="async">' +
      "</span>"
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
    plateStyle: plateStyle,
    progressBarHtml: progressBarHtml,
    examProgressStats: examProgressStats,
    chapterProgressStats: chapterProgressStats
  };

  global.QxCardIcons = api;
})(typeof window !== "undefined" ? window : globalThis);
