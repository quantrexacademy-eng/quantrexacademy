#!/usr/bin/env python3
"""Upload Quantrex PYQ questions to Firestore via gcloud access token."""
from __future__ import annotations

import json
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(r"E:\QUANTREX\website")
DIR = ROOT / "data" / "books" / "chapters" / "6a91185f41ab5aba084f4d30"
PROJECT = "quantrexacademy-app"
URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents:commit"


def tok():
    gcloud = r"C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
    out = subprocess.check_output([gcloud, "auth", "print-access-token"], text=True).strip()
    return out


def sval(s):
    return {"stringValue": str(s if s is not None else "")}


def nval(n):
    if n is None:
        return {"nullValue": None}
    return {"integerValue": str(int(n))}


def to_fields(q):
    opts = q.get("options") or []
    fields = {
        "id": sval(q.get("id")),
        "sourceId": sval(q.get("_marksId") or q.get("id")),
        "bank": sval("qx_pyq_important"),
        "exam": sval(q.get("exam") or "jee_main"),
        "subject": sval(q.get("subject")),
        "chapter": sval(q.get("chapter")),
        "q": sval(q.get("q") or q.get("question")),
        "questionText": sval(q.get("q") or q.get("question")),
        "solution": sval(q.get("solution")),
        "explanation": sval(q.get("solution")),
        "source": sval("quantrex-pyq"),
        "bookId": sval("6a91185f41ab5aba084f4d30"),
        "type": sval(q.get("type")),
        "options": {"arrayValue": {"values": [sval(o) for o in opts]}},
    }
    if q.get("answer") is not None:
        fields["answer"] = nval(q.get("answer"))
        fields["correctAnswer"] = nval(q.get("answer"))
    if q.get("correctValue") is not None:
        fields["correctValue"] = sval(q.get("correctValue"))
    return fields


def commit(token, writes):
    body = json.dumps({"writes": writes}).encode("utf-8")
    req = urllib.request.Request(
        URL,
        data=body,
        method="POST",
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.status, json.loads(r.read().decode("utf-8", "ignore"))


def main():
    token = tok()
    docs = []
    for fp in sorted(DIR.glob("*.json")):
        data = json.loads(fp.read_text(encoding="utf-8"))
        for q in data.get("questions") or []:
            if q and q.get("id"):
                docs.append(q)
    print("docs", len(docs), flush=True)
    ok = 0
    fail = 0
    batch = []
    for q in docs:
        name = f"projects/{PROJECT}/databases/(default)/documents/questions/{q['id']}"
        batch.append({"update": {"name": name, "fields": to_fields(q)}})
        if len(batch) >= 200:
            try:
                st, _ = commit(token, batch)
                ok += len(batch)
                print("commit", st, "ok", ok, flush=True)
            except urllib.error.HTTPError as e:
                fail += len(batch)
                print("FAIL", e.code, e.read()[:200], flush=True)
                token = tok()
            batch = []
            time.sleep(0.15)
    if batch:
        try:
            st, _ = commit(token, batch)
            ok += len(batch)
            print("commit", st, "ok", ok, flush=True)
        except urllib.error.HTTPError as e:
            fail += len(batch)
            print("FAIL", e.code, e.read()[:300], flush=True)
    print("DONE ok", ok, "fail", fail, flush=True)


if __name__ == "__main__":
    main()
