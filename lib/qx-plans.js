/** Shared Quantrex plans — server is the source of truth (never trust client amount). */
const OFFER_ENDS_AT = "2027-08-07T23:59:59+05:30";

const PLANS = {
  trial_7: {
    id: "plan_trial_7",
    key: "trial_7",
    amount: 99,
    offerAmount: 9,
    offerEndsAt: OFFER_ENDS_AT,
    currency: "INR",
    days: 7,
    features: ["eng", "med", "jee_ts"],
    label: "7-Day Pass",
    tracks: "Engineering + Medical",
    description: "Full access for 7 days · Quantrex Academy",
    badge: "BEST START"
  },
  jee_ts: {
    id: "plan_jee_ts",
    key: "jee_ts",
    amount: 1199,
    offerAmount: 299,
    offerEndsAt: OFFER_ENDS_AT,
    currency: "INR",
    days: 365,
    features: ["jee_ts"],
    label: "JEE Main Test Series",
    tracks: "Engineering",
    description: "JEE Main 2027 test series · 1 year"
  },
  eng_complete: {
    id: "plan_eng_complete",
    key: "eng_complete",
    amount: 1599,
    offerAmount: 399,
    offerEndsAt: OFFER_ENDS_AT,
    currency: "INR",
    days: 365,
    features: ["eng"],
    label: "Engineering Complete",
    tracks: "Engineering",
    description: "Engineering practice, books, PYQ · no test series · 1 year"
  },
  eng_combo: {
    id: "plan_eng_combo",
    key: "eng_combo",
    amount: 1999,
    offerAmount: 499,
    offerEndsAt: OFFER_ENDS_AT,
    currency: "INR",
    days: 365,
    features: ["eng", "jee_ts"],
    label: "Engineering Combo",
    tracks: "Engineering",
    description: "Engineering Complete + JEE Main Test Series · 1 year"
  },
  med_complete: {
    id: "plan_med_complete",
    key: "med_complete",
    amount: 1199,
    offerAmount: 299,
    offerEndsAt: OFFER_ENDS_AT,
    currency: "INR",
    days: 365,
    features: ["med"],
    label: "Medical Complete",
    tracks: "Medical",
    description: "NEET practice, books, PYQ · 1 year"
  },
  // old checkout links
  complete: {
    id: "plan_eng_combo",
    key: "eng_combo",
    amount: 1999,
    offerAmount: 499,
    offerEndsAt: OFFER_ENDS_AT,
    currency: "INR",
    days: 365,
    features: ["eng", "jee_ts"],
    label: "Engineering Combo",
    tracks: "Engineering",
    description: "Engineering Complete + JEE Main Test Series · 1 year"
  }
};

function isOfferOpen(plan) {
  if (!plan || plan.offerAmount == null || !plan.offerEndsAt) return false;
  const t = Date.parse(plan.offerEndsAt);
  return Number.isFinite(t) && Date.now() < t;
}

function liveAmount(plan) {
  if (!plan) return 0;
  return isOfferOpen(plan) ? Number(plan.offerAmount) : Number(plan.amount);
}

function getPlan(idOrKey) {
  const s = String(idOrKey || "");
  if (PLANS[s]) return PLANS[s];
  return Object.values(PLANS).find((p) => p.id === s || p.key === s) || null;
}

function publicPlans() {
  const out = {};
  Object.keys(PLANS).forEach((key) => {
    if (key === "complete") return;
    const p = PLANS[key];
    const offer = isOfferOpen(p);
    out[key] = {
      ...p,
      liveAmount: liveAmount(p),
      isOffer: offer,
      offerEndsAt: p.offerEndsAt || null
    };
  });
  return out;
}

module.exports = { PLANS, OFFER_ENDS_AT, getPlan, liveAmount, isOfferOpen, publicPlans };
