// Quantrex Academy — Production Stack Config
// Account: quantrexacademy@gmail.com
const QUANTREX_STACK = {
  frontend: {
    provider: "Vercel",
    url: "https://quantrexacademy-lemon.vercel.app",
    dashboard: "https://vercel.com/quantrexacademy-4922/quantrexacademy"
  },
  source: {
    provider: "GitHub",
    repo: "https://github.com/quantrexacademy-eng/quantrexacademy",
    account: "quantrexacademy-eng"
  },
  auth: {
    provider: "Firebase Authentication",
    projectId: "quantrexacademy-live",
    methods: ["email", "google", "phone"],
    console: "https://console.firebase.google.com/project/quantrexacademy-live/authentication"
  },
  database: {
    provider: "Firebase Firestore",
    projectId: "quantrexacademy-live",
    collections: ["users", "users/{uid}/data/progress", "app/meta", "payments", "subscriptions", "leaderboard", "solutions"]
  },
  storage: {
    provider: "Firebase Storage",
    bucket: "quantrexacademy-live.firebasestorage.app",
    console: "https://console.firebase.google.com/project/quantrexacademy-live/storage",
    paths: {
      pdfs: "pdfs/",
      images: "images/",
      profiles: "profiles/",
      books: "books/"
    }
  },
  video: {
    provider: "none",
    note: "Video lectures disabled per product requirement"
  },
  payment: {
    provider: "Cashfree",
    mode: "sandbox",
    sdk: "https://sdk.cashfree.com/js/v3/cashfree.js",
    apiBase: "sandbox", // "production" when live
    console: "https://merchant.cashfree.com/merchants/login",
    plans: {
      monthly: { id: "plan_monthly", amount: 299, label: "Monthly Premium", days: 30 },
      yearly: { id: "plan_yearly", amount: 2499, label: "Yearly Premium", days: 365 }
    }
  },
  domain: {
    provider: "Cloudflare",
    target: "quantrexacademy-lemon.vercel.app",
    custom: ""
  }
};