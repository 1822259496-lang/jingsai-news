#!/usr/bin/env python3
"""每日存档：python3 tools/archive.py YYYY-MM-DD

把当天的 data/contests.json、data/news.json、posts/data/articles.json
完整复制到 archive/YYYY-MM-DD/，并在 archive/index.json 记录当天的变化
（新增通知、新增推文、赛事变动）。同一天重复运行会覆盖当天的记录。
"""
import json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = {"contests": "data/contests.json", "news": "data/news.json", "articles": "posts/data/articles.json"}


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def dump(obj, p):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def contest_key(c):
    return json.dumps({k: c.get(k) for k in ("status", "statusNote", "dates", "name")}, ensure_ascii=False, sort_keys=True)


def main():
    if len(sys.argv) != 2 or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", sys.argv[1]):
        sys.exit("用法：python3 tools/archive.py YYYY-MM-DD")
    day = sys.argv[1]
    arc = os.path.join(ROOT, "archive")
    idx_path = os.path.join(arc, "index.json")
    idx = load(idx_path) if os.path.exists(idx_path) else {"days": []}
    days = [d for d in idx.get("days", []) if d.get("date") != day]

    cur = {k: load(os.path.join(ROOT, v)) for k, v in FILES.items()}
    prev_days = sorted([d["date"] for d in days if d["date"] < day])
    prev = None
    if prev_days:
        pdir = os.path.join(arc, prev_days[-1])
        try:
            prev = {k: load(os.path.join(pdir, k + ".json")) for k in FILES}
        except FileNotFoundError:
            prev = None

    def ids(obj):
        return {x.get("id") for x in obj.get("items", [])}

    if prev:
        new_news = [x for x in cur["news"]["items"] if x.get("id") not in ids(prev["news"])]
        new_arts = [x for x in cur["articles"]["items"] if x.get("id") not in ids(prev["articles"])]
        pc = {c.get("id"): contest_key(c) for c in prev["contests"]["items"]}
        changed = []
        for c in cur["contests"]["items"]:
            if c.get("id") not in pc:
                changed.append({"id": c.get("id"), "name": c.get("name"), "change": "新增"})
            elif pc[c.get("id")] != contest_key(c):
                changed.append({"id": c.get("id"), "name": c.get("name"), "change": "更新", "status": c.get("status")})
    else:  # 第一份存档：记录全部现有内容
        new_news = cur["news"]["items"]
        new_arts = cur["articles"]["items"]
        changed = [{"id": c.get("id"), "name": c.get("name"), "change": "收录", "status": c.get("status")} for c in cur["contests"]["items"]]

    ddir = os.path.join(arc, day)
    for k, v in FILES.items():
        os.makedirs(ddir, exist_ok=True)
        shutil.copyfile(os.path.join(ROOT, v), os.path.join(ddir, k + ".json"))

    days.append({
        "date": day,
        "news": [{"id": x.get("id"), "date": x.get("date"), "type": x.get("type"), "title": x.get("title"), "url": (x.get("source") or {}).get("url", "")} for x in new_news],
        "articles": [{"id": x.get("id"), "date": x.get("date"), "kicker": x.get("kicker"), "title": x.get("title")} for x in new_arts],
        "contests": changed,
        "counts": {"contests": len(cur["contests"]["items"]), "news": len(cur["news"]["items"]), "articles": len(cur["articles"]["items"])},
    })
    days.sort(key=lambda d: d["date"], reverse=True)
    dump({"updated": day, "days": days}, idx_path)
    print(f"已存档 {day}：新增通知 {len(new_news)} 条，新增推文 {len(new_arts)} 篇，赛事变动 {len(changed)} 项")


if __name__ == "__main__":
    main()
