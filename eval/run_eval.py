#!/usr/bin/env python3
"""Runs each scenario through FairPlay (/api/assess) and a plain prompt (/api/plain).
Usage: python3 run_eval.py [repeat_count]   (default 1; use 3 for the stability check)
Writes results/<id>_run<n>.json and score_sheet.csv. ~3 API calls per run, uses your credits."""
import json, sys, time, csv, os, urllib.request
BASE = "https://fairplay-risk-advisor.vercel.app/api/"
reps = int(sys.argv[1]) if len(sys.argv) > 1 else 1
def post(path, body):
    req = urllib.request.Request(BASE + path, json.dumps(body).encode(), {"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r: return json.load(r)
os.makedirs("results", exist_ok=True)
sc = json.load(open("scenarios.json"))
rows = []
for s in sc:
    form = {k: s[k] for k in ("idea", "users", "dec", "data", "geo", "model")}
    for n in range(1, reps + 1):
        try:
            a = post("assess", form)["data"]
            p = post("plain", form).get("data") or post("plain", form)
        except Exception as e:
            print(s["id"], "FAILED", e); continue
        json.dump({"scenario": s, "advisor": a, "plain": p}, open(f"results/{s['id']}_run{n}.json", "w"), indent=1)
        if n == 1:
            for ex in s["expected"]:
                rows.append([s["id"], s["name"], ex, "", "", ""])
        print(s["id"], "run", n, "ok:", len(a["risks"]), "risks,", sum(1 for r in a["risks"] if r["needsReview"]), "flagged")
        time.sleep(2)
with open("score_sheet.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["scenario", "name", "expected risk (written BEFORE running)", "FairPlay found? (1/0)", "Plain prompt found? (1/0)", "notes"])
    w.writerows(rows)
print("Done. Fill score_sheet.csv from the results/ files.")