#!/usr/bin/env python3
"""Upload JSONL question docs to Firestore via REST + ADC. No firebase-admin needed."""
from __future__ import annotations

import json
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

PROJECT = "quantrexacademy-app"
ROOT = Path(r"E:\QUANTREX\website")
DEFAULT = ROOT / "data" / "_migration" / "chapter_hydrate_docs.jsonl"
CTX = ssl.create_default_context()
COMMIT = (
    f"https://firestore.googleapis.com/v1/projects/{PROJECT}"
    "/databases/(default)/documents:commit"
)


def adc_token():
    env = __import__("os").environ.get("FIRESTORE_TOKEN") or __import__("os").environ.get("GOOGLE_OAUTH_ACCESS_TOKEN")
    if env and env.startswith("ya29."):
        return env.strip()
    bins = [
        r"C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
        r"C:\Users\Admin\google-cloud-sdk\bin\gcloud.cmd",
        "gcloud.cmd",
        "gcloud",
    ]
    last = ""
    for b in bins:
        try:
            out = subprocess.check_output(
                [b, "auth", "application-default", "print-access-token"],
                text=True,
                stderr=subprocess.STDOUT,
                shell=False,
            )
            tok = out.strip().splitlines()[-1].strip()
            if tok.startswith("ya29."):
                return tok
            last = out[:200]
        except Exception as e:
            last = str(e)
    raise SystemExit("no ADC token: " + last)


def fv(v):
    if v is None:
        return {"nullValue": "NULL_VALUE"}
    if isinstance(v, bool):
        return {"booleanValue": v}
    if isinstance(v, int) and not isinstance(v, bool):
        return {"integerValue": str(v)}
    if isinstance(v, float):
        return {"doubleValue": v}
    if isinstance(v, str):
        return {"stringValue": v}
    if isinstance(v, list):
        return {"arrayValue": {"values": [fv(x) for x in v]}}
    if isinstance(v, dict):
        return {"mapValue": {"fields": {str(k): fv(val) for k, val in v.items() if val is not None}}}
    return {"stringValue": str(v)}


def to_doc(doc):
    payload = {k: v for k, v in doc.items() if k != "file" and v is not None}
    fields = {}
    for k, v in payload.items():
        fields[str(k)] = fv(v)
    return fields


def commit(token, writes):
    body = json.dumps({"writes": writes}).encode("utf-8")
    req = urllib.request.Request(
        COMMIT,
        data=body,
        method="POST",
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90, context=CTX) as r:
            return r.status, r.read()[:200]
    except urllib.error.HTTPError as e:
        return e.code, e.read()[:400]


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    if not path.exists():
        raise SystemExit("missing " + str(path))
    token = adc_token()
    docs = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            if d and d.get("id") is not None:
                docs.append(d)
    print("docs", len(docs), flush=True)
    written = 0
    batch = []

    def flush():
        nonlocal written, batch, token
        if not batch:
            return
        code, raw = commit(token, batch)
        if code in (401, 403):
            token = adc_token()
            code, raw = commit(token, batch)
        if code != 200:
            raise SystemExit(f"commit fail {code} {raw}")
        written += len(batch)
        print("  written", written, flush=True)
        batch = []

    for d in docs:
        did = str(d["id"])
        name = f"projects/{PROJECT}/databases/(default)/documents/questions/{did}"
        batch.append({"update": {"name": name, "fields": to_doc(d)}})
        sid = str(d.get("sourceId") or "")
        if sid and sid != did:
            sname = f"projects/{PROJECT}/databases/(default)/documents/questions/{sid}"
            batch.append({"update": {"name": sname, "fields": to_doc(d)}})
        if len(batch) >= 400:
            flush()
    flush()
    # health doc
    hname = f"projects/{PROJECT}/databases/(default)/documents/content_health/summary"
    health = {
        "lastChapterHydrateAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "chapterDocsWritten": written,
        "studentMarksRuntime": False,
        "projectId": PROJECT,
    }
    code, raw = commit(token, [{"update": {"name": hname, "fields": to_doc(health)}}])
    print("health", code, "total", written, flush=True)


if __name__ == "__main__":
    main()
