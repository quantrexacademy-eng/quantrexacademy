// Quantrex Academy — Production Stack Config
// Owner email: quantrexacademy@gmail.com
// Live domain always: quantrexacademy.com (do not switch deploy target)
const QUANTREX_STACK = {
  frontend: {
    provider: "Vercel",
    // Production domain (authoritative)
    url: "https://www.quantrexacademy.com",
    // CLI login user: quantrexacademy-4922
    // Team slug currently shown by Vercel: ajay-kumar-saroj-s-projects
    // (personal team name on that Vercel account — project is still quantrexacademy)
    project: "quantrexacademy",
    team: "ajay-kumar-saroj-s-projects",
    vercelUser: "quantrexacademy-4922",
    dashboard: "https://vercel.com/ajay-kumar-saroj-s-projects/quantrexacademy",
    deployRoot: "C:\\Users\\Admin\\Desktop\\quantrexacademy"
  },
  source: {
    provider: "GitHub",
    repo: "https://github.com/quantrexacademy-eng/quantrexacademy",
    account: "quantrexacademy-eng",
    gitEmail: "quantrexacademy@gmail.com",
    gitName: "Quantrex Academy"
  },
  auth: {
    provider: "Firebase Authentication",
    projectId: "quantrexacademy-app",
    methods: ["email"],
    note: "Phone + Google + Email. Identity is Firebase UID on users/{uid} and students/{uid}. Course bodies stay on the server (chapter_meta + /api/catalog). Large banks are not bundled.",
    console: "https://console.firebase.google.com/project/quantrexacademy-app/authentication"
  },
  database: {
    provider: "Firebase Firestore",
    projectId: "quantrexacademy-app",
    collections: ["users", "users/{uid}/data/progress", "app/meta", "payments", "subscriptions", "leaderboard", "solutions"]
  },
  storage: {
    provider: "Firebase Storage",
    bucket: "quantrexacademy-app.firebasestorage.app",
    console: "https://console.firebase.google.com/project/quantrexacademy-app/storage",
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
    provider: "Razorpay",
    mode: "live",
    sdk: "https://checkout.razorpay.com/v1/checkout.js",
    console: "https://dashboard.razorpay.com/app/dashboard",
    note: "Live keys in Vercel + website/.env. Checkout stays linked; product currently has ALL_COURSES_FREE so students are not charged.",
    webhookUrl: "https://www.quantrexacademy.com/api/payment-webhook",
    plans: {
      trial_7: {
        id: "plan_trial_7",
        key: "trial_7",
        amount: 99,
        offerAmount: 9,
        days: 7,
        label: "7-Day Pass",
        tracks: "Engineering + Medical"
      }
    }
  },
  domain: {
    provider: "Cloudflare / Vercel",
    primary: "https://www.quantrexacademy.com",
    alwaysDeployTo: "quantrexacademy.com",
    target: "quantrexacademy.vercel.app"
  }
};