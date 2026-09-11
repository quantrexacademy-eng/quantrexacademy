# Quantrex live website (USB source of truth)

This folder is the **latest** live site. Edit, run, and deploy from here only.

- Domain: https://www.quantrexacademy.com
- Build marker: `window.QX_BUILD` in `app.html` (current: qxfix64)
- Deploy: `npx vercel --prod --yes` from this folder
- On the original Windows PC, `C:\Users\Admin\qx-hosting` is a junction here while USB is plugged in

Do not use Desktop\quantrexacademy or dated USB copies.
Native app UI lives in `..\app-design`, not this website.
