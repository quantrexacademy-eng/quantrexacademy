import urllib.request

base = "https://www.quantrexacademy.com"


def get(p):
    req = urllib.request.Request(
        base + p, headers={"Cache-Control": "no-cache", "User-Agent": "qx-audit"}
    )
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read()


app = get("/app.html").decode("utf-8", "replace")
print("BUILD", "qxmed5" in app)
mf = get("/marks-features.js?v=qxmed5").decode("utf-8", "replace")
print("BIO NAV", "qxEnsureMedicalFormulaNav" in mf)
print("NCERT LOCAL", 'STATE.exam === "Medical"' in mf and "viewNeetModuleBank" in mf)
print("FC BOTANY CHIP", "subject: \"Botany\"" in mf)
print("FC ZOO CHIP", "subject: \"Zoology\"" in mf)
aj = get("/app.js?v=qxmed5").decode("utf-8", "replace")
print("DASH FALLBACK", "renderMedicalMarksHomeExtras" in aj)
print("COVERS")
for p in [
    "/assets/book-covers/organic-chemistry.jpg?v=qxmed5",
    "/assets/book-covers/hc-verma-v1.jpg?v=qxmed5",
    "/assets/book-covers/hc-verma-v2.jpg?v=qxmed5",
    "/assets/book-covers/irodov.jpg?v=qxmed5",
    "/assets/book-covers/biology-360.jpg?v=qxmed5",
    "/assets/book-covers/top500-physics.jpg?v=qxmed5",
    "/assets/book-covers/top500-chemistry.jpg?v=qxmed5",
]:
    req = urllib.request.Request(base + p, headers={"User-Agent": "qx-audit"})
    with urllib.request.urlopen(req, timeout=20) as r:
        print(" ", p.split("/")[-1].split("?")[0], r.status, r.headers.get("content-length"))
