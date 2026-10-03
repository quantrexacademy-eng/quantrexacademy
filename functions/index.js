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

function load(rel) {
  let handler;
  return function (req, res) {
    if (!handler) handler = require(rel);
    return handler(req, res);
  };
}

exports.proxyImage = wrap(load("../api/proxy-image"), { memory: "1GiB", timeoutSeconds: 120 });
exports.restoreImage = wrap(load("../api/restore-image"), { memory: "1GiB", timeoutSeconds: 120 });
exports.createPayment = wrap(load("../api/create-payment"));
exports.verifyPayment = wrap(load("../api/verify-payment"));
exports.paymentWebhook = wrap(load("../api/payment-webhook"));
exports.jovi = wrap(load("../api/jovi"), { memory: "1GiB", timeoutSeconds: 120 });
exports.seoQ = wrap(load("../api/seo-q"), { memory: "1GiB", timeoutSeconds: 120 });
exports.marksQuestion = wrap(load("../api/marks-question"));
exports.marksNav = wrap(load("../api/marks-nav"));
exports.adminLogin = wrap(load("../api/admin-login"));
