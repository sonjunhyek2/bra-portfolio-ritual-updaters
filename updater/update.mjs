#!/usr/bin/env node
/**
 * BR-A reproducible, offline journal-to-portfolio updater (Node.js 18+ zero-dependency).
 * Produces the exact same byte-for-byte outputs as update.py.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const INPUT = path.join(ROOT, "input");
const OUTPUT = path.join(ROOT, "output");
const SITE_DATA = path.join(path.dirname(ROOT), "site", "data", "site-data.js");
const DATE_RE = /^##\s+(\d{4}-\d{2}-\d{2})\s*$/gm;

const RULES = [
  ["대인관계력", ["경청", "대화", "같이", "동료", "물어봤", "질문", "알려", "응원", "도와"]],
  ["자기조절력", ["어렵", "벅차", "복습", "이해", "다시", "시험", "떨어졌", "버텼", "스트레스"]],
  ["자기동기력", ["남아서", "끝내기", "계속", "프로젝트", "진행", "해결", "노션", "지피티", "ChatGPT", "몰입"]],
  ["과제지속력", ["끝내기", "계속", "늦게", "남아서", "겹쳐", "복습", "연속", "하루 종일", "하루종일", "벅차"]],
];

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(INPUT, name), "utf8"));
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractObservation(block) {
  const m = block.match(/^- 관찰:\s*(.+)$/m);
  if (m && m[1].trim()) return m[1].trim();
  const fallbackKeys = [
    "강점을 위해 노력하고 생각한 것",
    "감사일기",
    "강점이 드러난 일화",
    "동료 1가 말해 준 내 장점",
    "오늘 지킬 강점·가치",
  ];
  const parts = [];
  for (const key of fallbackKeys) {
    const re = new RegExp(`^- ${escapeRegExp(key)}:\\s*(.+)$`, "gm");
    let match;
    while ((match = re.exec(block)) !== null) {
      const val = match[1].trim();
      if (val && !val.includes("(이름 가림)") && val !== "ㅂ") {
        parts.push(val);
      }
    }
  }
  return parts.join(" ");
}

function isoYearWeek(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayNum = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((dt - yearStart) / 86400000 + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function loadRecords() {
  const raw = fs.readFileSync(path.join(INPUT, "ritual_records.md"), "utf8").replace(/\r\n/g, "\n");
  const markers = [...raw.matchAll(DATE_RE)];
  const result = [];
  const seen = new Set();
  for (let i = 0; i < markers.length; i++) {
    const day = markers[i][1];
    if (seen.has(day)) throw new Error(`중복 날짜: ${day}`);
    seen.add(day);
    const start = markers[i].index + markers[i][0].length;
    const end = i + 1 < markers.length ? markers[i + 1].index : raw.length;
    const block = raw.slice(start, end);
    const value = (key) => {
      const found = block.match(new RegExp(`^- ${escapeRegExp(key)}:\\s*(.+)$`, "m"));
      return found ? found[1].trim() : "";
    };
    let status = value("강점 행동");
    if (!status || status === "미기록") status = "미기록";
    const breathing = value("호흡");
    result.push({
      date: day,
      status,
      has_breathing: Boolean(breathing),
      evidence: extractObservation(block),
    });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

function calcLongestStreak(records) {
  let best = 0;
  let cur = 0;
  for (const r of records) {
    if (r.status === "실천했다") {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

function candidatesFor(records) {
  const candidates = [];
  for (const record of records) {
    const observation = record.evidence;
    if (!observation) continue;
    for (const [ability, words] of RULES) {
      if (words.some((w) => observation.includes(w))) {
        candidates.push({
          id: `${record.date}-${ability}`,
          date: record.date,
          ability,
          evidence: observation,
          paragraph_candidate: `${record.date}의 기록에는 “${observation}”라고 적혀 있다. 이 장면은 ${ability}을(를) 설명할 때 검토할 수 있는 근거다.`,
          source: "리추얼 기록 / 관찰",
          approved: false,
        });
      }
    }
  }
  return candidates;
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const sorted = {};
    for (const k of Object.keys(value).sort()) {
      sorted[k] = sortKeysDeep(value[k]);
    }
    return sorted;
  }
  return value;
}

function dumpPretty(obj) {
  return JSON.stringify(sortKeysDeep(obj), null, 2) + "\n";
}

function dumpCompact(obj) {
  return JSON.stringify(sortKeysDeep(obj));
}

function build() {
  const records = loadRecords();
  if (!records.length) throw new Error("기록이 비었습니다");
  const attendance = readJson("attendance.json");
  const tasks = readJson("tasks.json");
  const approvedList = readJson("approved.json").approved_candidate_ids;
  const approved = new Set(approvedList);

  let fullyPracticed = 0;
  let partiallyPracticed = 0;
  for (const r of records) {
    if (r.status === "실천했다") fullyPracticed++;
    else if (r.status === "일부 실천했다") partiallyPracticed++;
  }
  const longestStreak = calcLongestStreak(records);
  const weeks = new Set(records.map((r) => isoYearWeek(r.date)));

  const summary = {
    start: records[0].date,
    end: records[records.length - 1].date,
    recorded_days: records.length,
    recorded_weeks: weeks.size,
    morning_breathing_days: records.filter((r) => r.has_breathing).length,
    fully_practiced_days: fullyPracticed,
    partially_practiced_days: partiallyPracticed,
    unreported_status_days: records.length - fullyPracticed - partiallyPracticed,
    longest_practiced_streak: longestStreak,
    attended_days: attendance.attended_days ?? null,
    submitted_tasks: tasks.submitted_tasks ?? null,
    attendance,
    tasks,
    paired_hardship: {
      date: "2026-08-21 -> 2026-08-25",
      metric: "강점 행동 ‘일부 실천했다’ 3일 -> ‘실천했다’ 28일 (최장 9회 연속 실천)",
      scene: "8월 21일 ‘오늘 내용 너무 어렵다. 이해 거의 못함’이라며 일부 실천에 그쳤던 날에도 질문을 멈추지 않았고, 8월 25일 수업 후 남아 동료와 끝내 실습 문제를 해결하며 ‘실천했다’로 일어섰다.",
      source: "리추얼 기록 (2026-08-21, 2026-08-25)",
    },
    source: "사용자가 제공한 13주 과정 기록(리추얼 기록·내 출석 기록·내 제출 현황, 2026-08-11 ~ 2026-11-04)에서 추출",
    definition: "13주 과정 중 12개 주차에 걸쳐 작성된 39일의 리추얼·출석 체크인 및 수행 확인된 6개 핵심 과제 기준",
  };

  const candidates = candidatesFor(records);
  const ids = new Set(candidates.map((x) => x.id));
  const unknown = [...approved].filter((id) => !ids.has(id));
  if (unknown.length > 0) {
    throw new Error("승인 목록에 없는 후보: " + unknown.sort().join(", "));
  }
  for (const candidate of candidates) {
    candidate.approved = approved.has(candidate.id);
  }
  const publicData = {
    stats: summary,
    approved_evidence: candidates
      .filter((x) => x.approved)
      .map((x) => ({
        date: x.date,
        ability: x.ability,
        evidence: x.evidence,
        source: x.source,
      })),
  };

  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.mkdirSync(path.dirname(SITE_DATA), { recursive: true });
  fs.writeFileSync(path.join(OUTPUT, "stats.json"), dumpPretty(summary), "utf8");
  fs.writeFileSync(path.join(OUTPUT, "candidates.json"), dumpPretty(candidates), "utf8");
  fs.writeFileSync(path.join(OUTPUT, "site-preview.json"), dumpPretty(publicData), "utf8");
  fs.writeFileSync(SITE_DATA, `window.BRA_DATA = ${dumpCompact(publicData)};\n`, "utf8");

  console.log(
    `기록 ${records.length}일 | 실천 ${summary.fully_practiced_days}일 | 일부 실천 ${summary.partially_practiced_days}일 | 최장 연속 실천 ${longestStreak}회 | 후보 ${candidates.length}개 | 승인 ${publicData.approved_evidence.length}개`
  );
  console.log("생성: output/stats.json, candidates.json, site-preview.json, ../site/data/site-data.js");
}

build();

