# qxhost — preview built from the LIVE Hosting baseline (documented Hosting REST API)

Nothing here has been run against Firebase. Default is read-only / dry-run.

## Setup (done on the bot box, reversible)
- Google Cloud CLI 592.0.0 from the official archive, SHA256 verified against the install page:
  `/home/box/tools/google-cloud-sdk` (no PATH/rc changes; remove the folder to undo).
- Python venv with the official `google-auth` + `requests`: `/home/box/tools/qxhost-venv`.
- ADC: not configured (checked with `google.auth.default()` only; no credential files read).

## Sign-in (owner, when browser QA is done; coordinate via sign-in skill)
    /home/box/tools/google-cloud-sdk/bin/gcloud auth application-default login --no-launch-browser
Default scopes (openid, userinfo.email, cloud-platform). Narrower scopes such as
`firebase.hosting` need your own OAuth client (`--client-id-file`), which we do NOT create.
Least privilege is therefore enforced by IAM on the signing-in account:
`roles/firebasehosting.viewer` for `baseline`; `roles/firebasehosting.admin` for `apply`.
Quota project: `quantrexacademy-app` (passed via google-auth `quota_project_id`).

## Stages
    PY=/home/box/tools/qxhost-venv/bin/python
    $PY qxhost.py baseline --out OUT                         # read-only
    $PY qxhost.py plan --baseline OUT/baseline.json --patch-dir REPO --patched list.txt \
        --exclusions exclusions.txt --preview-isolation --out OUT/plan   [--approved-solutions appr.json]
    $PY qxhost.py apply --plan OUT/plan/plan.json --channel qx-review-YYYYMMDD           # dry run
    ... --execute            clone(unfinalized) + populate + config + verify, then STOP
    ... --execute --finalize --release   release to that EXISTING preview channel only
- `apply` refuses `live`; aborts if live's version changed since `baseline` (concurrent release).
- Untouched files are never re-hashed or re-uploaded: they keep live's hash from the clone and are verified equal.
- Patched files: hash = SHA256 of deterministic gzip (mtime=0); exactly those gz bytes are uploaded.
- Deletions: only `exclusions.txt` matches, removed with the documented clone `exclude` filter; `/data/**` can never be deleted.
- `/data/**` patches only for ids in an approved solution manifest, and only filling a previously EMPTY
  `solution`/`explanation`; ids, order, question, options, answer keys and existing solutions must be identical.
- Preview isolation: function/run rewrites removed; CSP (`connect-src 'self'`, `form-action 'none'`, `worker-src 'none'`,
  scripts only self+gstatic+jsdelivr) + noindex; preview guard injected first in every HTML with a <head>.
  The plan writes the exact config diff vs live (`configDiff`) for review before any write.

## qxmd392f hardening (offline-tested: `python3 scripts/hosting/test_qxhost.py`)
- plan fetches ONLY manifest-known paths from `https://<site>.web.app` with a cache-buster; direct 200 only (redirect/clean-URL = abort, no fallback), 30 MB cap, raw SHA-256 of every fetched body in `plan.json["fetched"]`.
- deletions: `exclusions.txt` globs only PROPOSE `deletionCandidates`; nothing is deleted unless listed exactly in `--approved-deletions` (reviewed against the full baseline manifest). `/data/**` can never be deleted.
- guard: reviewed asset `scripts/hosting/preview/qx-preview-guard.js` (missing = refuse). It blocks Auth/Firestore/Functions/payment network calls and service workers, but does NOT intercept plain link navigation to the live domain or a payment page; CSP `form-action 'none'` covers forms only. Not a full isolation guarantee.
- preview config: all Functions/Cloud Run/Dynamic Links rewrites removed; every prior CSP / CSP-Report-Only / X-Robots-Tag (any case) dropped, other live headers kept; one global CSP + noindex. `script-src` keeps `'unsafe-inline'` because the real app boots from inline scripts/onclick.
- production: `production_config()` = live config unchanged. `apply` refuses non-isolated plans and any live channel form; a production release must be a fresh live-derived version without guard/noindex/CSP, via the normal reviewed release. Never promote a preview version to live.
- apply: exact final manifest (set + hashes), local gz blob re-hashed before upload, server-requested hashes must be in plan, empty uploadUrl = abort, clone deadline 900 s.

## ADC (not yet run; needs the owner's normal Google sign-in)
    /home/box/tools/google-cloud-sdk/bin/gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform
    /home/box/tools/google-cloud-sdk/bin/gcloud auth application-default set-quota-project quantrexacademy-app
    /home/box/tools/qxhost-venv/bin/python scripts/hosting/qxhost.py baseline --out /workspace/qxhost-baseline   # READ-ONLY
