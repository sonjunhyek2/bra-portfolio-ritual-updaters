#!/usr/bin/env python3
"""BR-A reproducible, offline journal-to-portfolio updater. Python 3.9+."""
from __future__ import annotations
from collections import Counter
from datetime import date
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "input"
OUTPUT = ROOT / "output"
SITE_DATA = ROOT.parent / "site" / "data" / "site-data.js"
DATE = re.compile(r"^##\s+(\d{4}-\d{2}-\d{2})\s*$", re.M)

# 입력 문장 자체에 근거한 결정적 분류. AI 생성/외부 API를 호출하지 않는다.
RULES = [
    ("대인관계력", ("경청", "대화", "같이", "동료", "물어봤", "질문", "알려", "응원", "도와")),
    ("자기조절력", ("어렵", "벅차", "복습", "이해", "다시", "시험", "떨어졌", "버텼", "스트레스")),
    ("자기동기력", ("남아서", "끝내기", "계속", "프로젝트", "진행", "해결", "노션", "지피티", "ChatGPT", "몰입")),
    ("과제지속력", ("끝내기", "계속", "늦게", "남아서", "겹쳐", "복습", "연속", "하루 종일", "하루종일", "벅차")),
]


def read_json(name: str):
    return json.loads((INPUT / name).read_text(encoding="utf-8"))


def extract_observation(block: str) -> str:
    found = re.search(r"^- 관찰:\s*(.+)$", block, re.M)
    if found and found.group(1).strip():
        return found.group(1).strip()
    fallback_keys = (
        "강점을 위해 노력하고 생각한 것",
        "감사일기",
        "강점이 드러난 일화",
        "동료 1가 말해 준 내 장점",
        "오늘 지킬 강점·가치",
    )
    parts = []
    for key in fallback_keys:
        for m in re.finditer(r"^- " + re.escape(key) + r":\s*(.+)$", block, re.M):
            val = m.group(1).strip()
            if val and "(이름 가림)" not in val and val != "ㅂ":
                parts.append(val)
    return " ".join(parts)


def load_records():
    raw = (INPUT / "ritual_records.md").read_text(encoding="utf-8")
    markers = list(DATE.finditer(raw))
    result = []
    seen = set()
    for i, m in enumerate(markers):
        day = m.group(1)
        date.fromisoformat(day)
        if day in seen:
            raise ValueError(f"중복 날짜: {day}")
        seen.add(day)
        block = raw[m.end():markers[i + 1].start() if i + 1 < len(markers) else len(raw)]

        def value(key: str) -> str:
            found = re.search(r"^- " + re.escape(key) + r":\s*(.+)$", block, re.M)
            return found.group(1).strip() if found else ""

        status = value("강점 행동")
        if not status or status == "미기록":
            status = "미기록"
        breathing = value("호흡")
        result.append({
            "date": day,
            "status": status,
            "has_breathing": bool(breathing),
            "evidence": extract_observation(block),
        })
    return sorted(result, key=lambda x: x["date"])


def calc_longest_streak(records) -> int:
    best = 0
    cur = 0
    for r in records:
        if r["status"] == "실천했다":
            cur += 1
            if cur > best:
                best = cur
        else:
            cur = 0
    return best


def candidates_for(records):
    candidates = []
    for record in records:
        observation = record["evidence"]
        if not observation:
            continue
        for ability, words in RULES:
            if any(w in observation for w in words):
                candidates.append({
                    "id": f'{record["date"]}-{ability}',
                    "date": record["date"],
                    "ability": ability,
                    "evidence": observation,
                    "paragraph_candidate": f'{record["date"]}의 기록에는 “{observation}”라고 적혀 있다. 이 장면은 {ability}을(를) 설명할 때 검토할 수 있는 근거다.',
                    "source": "리추얼 기록 / 관찰",
                    "approved": False,
                })
    return candidates


def dump_pretty(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def build():
    records = load_records()
    if not records:
        raise ValueError("기록이 비었습니다")
    attendance = read_json("attendance.json")
    tasks = read_json("tasks.json")
    approved = set(read_json("approved.json")["approved_candidate_ids"])
    counts = Counter(x["status"] for x in records)
    longest_streak = calc_longest_streak(records)
    summary = {
        "start": records[0]["date"],
        "end": records[-1]["date"],
        "recorded_days": len(records),
        "recorded_weeks": len({date.fromisoformat(x["date"]).isocalendar()[:2] for x in records}),
        "morning_breathing_days": sum(1 for x in records if x["has_breathing"]),
        "fully_practiced_days": counts["실천했다"],
        "partially_practiced_days": counts["일부 실천했다"],
        "unreported_status_days": len(records) - counts["실천했다"] - counts["일부 실천했다"],
        "longest_practiced_streak": longest_streak,
        "attended_days": attendance.get("attended_days"),
        "submitted_tasks": tasks.get("submitted_tasks"),
        "attendance": attendance,
        "tasks": tasks,
        "paired_hardship": {
            "date": "2026-08-21 -> 2026-08-25",
            "metric": "강점 행동 ‘일부 실천했다’ 3일 -> ‘실천했다’ 28일 (최장 9회 연속 실천)",
            "scene": "8월 21일 ‘오늘 내용 너무 어렵다. 이해 거의 못함’이라며 일부 실천에 그쳤던 날에도 질문을 멈추지 않았고, 8월 25일 수업 후 남아 동료와 끝내 실습 문제를 해결하며 ‘실천했다’로 일어섰다.",
            "source": "리추얼 기록 (2026-08-21, 2026-08-25)"
        },
        "source": "사용자가 제공한 13주 과정 기록(리추얼 기록·내 출석 기록·내 제출 현황, 2026-08-11 ~ 2026-11-04)에서 추출",
        "definition": "13주 과정 중 12개 주차에 걸쳐 작성된 39일의 리추얼·출석 체크인 및 수행 확인된 6개 핵심 과제 기준",
    }
    candidates = candidates_for(records)
    ids = {x["id"] for x in candidates}
    unknown = approved - ids
    if unknown:
        raise ValueError("승인 목록에 없는 후보: " + ", ".join(sorted(unknown)))
    for candidate in candidates:
        candidate["approved"] = candidate["id"] in approved
    public = {
        "stats": summary,
        "approved_evidence": [
            {
                "date": x["date"],
                "ability": x["ability"],
                "evidence": x["evidence"],
                "source": x["source"],
            }
            for x in candidates
            if x["approved"]
        ],
    }
    OUTPUT.mkdir(parents=True, exist_ok=True)
    SITE_DATA.parent.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "stats.json").write_text(dump_pretty(summary), encoding="utf-8", newline="\n")
    (OUTPUT / "candidates.json").write_text(dump_pretty(candidates), encoding="utf-8", newline="\n")
    (OUTPUT / "site-preview.json").write_text(dump_pretty(public), encoding="utf-8", newline="\n")
    SITE_DATA.write_text(
        "window.BRA_DATA = " + json.dumps(public, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(
        f'기록 {len(records)}일 | 실천 {summary["fully_practiced_days"]}일 | 일부 실천 {summary["partially_practiced_days"]}일 | 최장 연속 실천 {longest_streak}회 | 후보 {len(candidates)}개 | 승인 {len(public["approved_evidence"])}개'
    )
    print("생성: output/stats.json, candidates.json, site-preview.json, ../site/data/site-data.js")


if __name__ == "__main__":
    build()
