Dev-only test deps (pinned). `npm install --prefix scripts/test-tools` once, then:
  for t in scripts/qxmd392-*.test.js; do node $t; done
  python3 scripts/hosting/test_qxhost.py
Legacy: node scripts/_test_irodov_map.js, _test_local_fig_map.js, _test_qxfix75_wm.js, _test_seo_pages.js; python3 scripts/_peel_overlay_test.py
