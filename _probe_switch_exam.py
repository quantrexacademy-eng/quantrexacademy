#!/usr/bin/env python3
import re
import ssl
import urllib.request
from pathlib import Path

API = "https://web.getmarks.app"
CTX = ssl.create_default_context()
t = urllib.request.urlopen(
    urllib.request.Request(API + "/_next/static/chunks/pages/index-8a5337e3c2930583.js", headers={"User-Agent": "Mozilla/5.0"}),
    context=CTX, timeout=40
).read().decode("utf-8", "replace")
print("len", len(t))
for key in ["examCategor", "setExam", "switchExam", "targetExam", "selectedExam", "Medical", "Engineering"]:
    print(key, t.count(key))
idx = 0
n = 0
while n < 15:
    i = t.find("examCategor", idx)
    if i < 0:
        break
    print("---", t[max(0, i - 80): i + 200].replace("\n", " "))
    idx = i + 8
    n += 1
# api paths mentioning exam
for m in sorted(set(re.findall(r"/api/v[0-9]/[A-Za-z0-9_./?-]+", t))):
    if re.search(r"exam|user|dash|categ", m, re.I):
        print("API", m)
