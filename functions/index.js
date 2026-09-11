/**
 * Quantrex Cloud Functions — same /api/* paths as the Vercel handlers.
 * Website + Android TWA both call https://www.quantrexacademy.com/api/...
 */
"use strict";

const path = require("path");
process.env.QX_SITE_ROOT = path.resolve(__dirname, "..");

const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");

setGlobalOptions({
  region: "us-central1",
  maxInstances: 40
});

function wrap(handler, extra) {
  return onRequest(
    Object.assign(
      {
        cors: true,
        invoker: "public",
        memory: "512MiB",
        timeoutSeconds: 60
      },
      extra || {}
    ),
    handler
  );
}

exports.proxyImage = wrap(require("../api/proxy-image"), { memory: "1GiB", timeoutSeconds: 120 });
exports.restoreImage = wrap(require("../api/restore-image"), { memory: "1GiB", timeoutSeconds: 120 });
exports.createPayment = wrap(require("../api/create-payment"));
exports.verifyPayment = wrap(require("../api/verify-payment"));
exports.paymentWebhook = wrap(require("../api/payment-webhook"));
exports.jovi = wrap(require("../api/jovi"), { memory: "1GiB", timeoutSeconds: 120 });
exports.seoQ = wrap(require("../api/seo-q"), { memory: "1GiB", timeoutSeconds: 120 });
exports.marksQuestion = wrap(require("../api/marks-question"));
exports.marksNav = wrap(require("../api/marks-nav"));
exports.adminLogin = wrap(require("../api/admin-login"));
