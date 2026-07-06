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
  auth: {
    provider: "Firebase Authentication",
    projectId: "quantrexacademy-5da32",
    methods: ["email", "google", "phone"],
    console: "https://console.firebase.google.com/project/quantrexacademy-5da32/authentication"
  },
  database: {
    provider: "Firebase Firestore",
    projectId: "quantrexacademy-5da32",
    collections: ["users", "users/{uid}/data/progress", "app/meta", "payments", "subscriptions", "videos"]
  },
  storage: {
    provider: "Firebase Storage",
    bucket: "quantrexacademy-5da32.firebasestorage.app",
    console: "https://console.firebase.google.com/project/quantrexacademy-5da32/storage",
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