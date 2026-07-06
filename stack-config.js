// Quantrex Academy — Production Stack Config
// Account: quantrexacademy@gmail.com
const QUANTREX_STACK = {
  frontend: {
    provider: "Vercel",
    url: "https://quantrexacademy-lemon.vercel.app",
    dashboard: "https://vercel.com/ajay-kumar-saroj-s-projects/quantrexacademy"
  },
  source: {
    provider: "GitHub",
    repo: "https://github.com/quantrexacademy-eng/quantrexacademy",
    account: "quantrexacademy-eng"
  },
  backend: {
    provider: "Firebase",
    projectId: "quantrexacademy-5da32",
    console: "https://console.firebase.google.com/project/quantrexacademy-5da32"
  },
  database: {
    provider: "Firebase Firestore",
    collections: ["users", "users/{uid}/data/progress", "app/meta", "payments", "subscriptions"]
  },
  storage: {
    provider: "Firebase Storage",
    bucket: "quantrexacademy-5da32.firebasestorage.app",
    paths: {
      pdfs: "pdfs/",
      images: "images/",
      profiles: "profiles/",
      books: "books/"
    }
  },
  video: {
    provider: "Bunny.net", // alternative: Cloudflare Stream
    cdn: "", // set after Bunny.net account
    libraryId: ""
  },
  payment: {
    provider: "Cashfree",
    mode: "sandbox", // switch to "production" when live
    appId: "", // set in Firebase env / Vercel env
    plans: {
      monthly: { id: "plan_monthly", amount: 299, label: "Monthly Premium" },
      yearly: { id: "plan_yearly", amount: 2499, label: "Yearly Premium" }
    }
  },
  domain: {
    provider: "Cloudflare",
    target: "quantrexacademy-lemon.vercel.app",
    custom: "" // e.g. quantrexacademy.com
  }
};