#!/usr/bin/env node
/**
 * Synchronize story.txt -> site/index.html and regenerate all 3 DOCX files
 * (documents/*.docx and site/assets/*.docx) with zero external packages.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const EMAIL = "jungurdudgh@gmail.com";

// 1. Clean up any stray lock file
const lockFile = path.join(ROOT, "documents", ".~lock.자기소개서_손준혁.docx#");
if (fs.existsSync(lockFile)) {
  fs.unlinkSync(lockFile);
}

// 2. Sync site/index.html from index.template.html and story.txt
const storyRaw = fs.readFileSync(path.join(ROOT, "story.txt"), "utf8").replace(/\r\n/g, "\n").trim();
const paragraphs = storyRaw
  .split(/\n{2,}/)
  .map((p) => p.trim())
  .filter(Boolean);

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const markup = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n");
const template = fs.readFileSync(path.join(ROOT, "index.template.html"), "utf8").replace(/\r\n/g, "\n");
if (!template.includes("{{STORY_PARAGRAPHS}}")) {
  throw new Error("Template placeholder {{STORY_PARAGRAPHS}} not found");
}
fs.writeFileSync(path.join(ROOT, "site", "index.html"), template.replace("{{STORY_PARAGRAPHS}}", markup), "utf8");
console.log(`웹 본편 ${paragraphs.length}문단 / ${storyRaw.length.toLocaleString()}자 동기화 완료`);

// 3. Minimal ZIP reader/writer (using built-in node:zlib) to update XML inside .docx
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readZipEntries(zipBuf) {
  let eocdOffset = -1;
  for (let i = zipBuf.length - 22; i >= 0; i--) {
    if (zipBuf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("Invalid ZIP file");
  const totalEntries = zipBuf.readUInt16LE(eocdOffset + 10);
  const cdOffset = zipBuf.readUInt32LE(eocdOffset + 16);

  const entries = [];
  let ptr = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (zipBuf.readUInt32LE(ptr) !== 0x02014b50) throw new Error("Invalid Central Directory entry");
    const method = zipBuf.readUInt16LE(ptr + 10);
    const compSize = zipBuf.readUInt32LE(ptr + 20);
    const nameLen = zipBuf.readUInt16LE(ptr + 28);
    const extraLen = zipBuf.readUInt16LE(ptr + 30);
    const commentLen = zipBuf.readUInt16LE(ptr + 32);
    const localHeaderOffset = zipBuf.readUInt32LE(ptr + 42);
    const name = zipBuf.subarray(ptr + 46, ptr + 46 + nameLen).toString("utf8");

    const lNameLen = zipBuf.readUInt16LE(localHeaderOffset + 26);
    const lExtraLen = zipBuf.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + lNameLen + lExtraLen;
    const compData = zipBuf.subarray(dataStart, dataStart + compSize);
    const rawData = method === 0 ? Buffer.from(compData) : zlib.inflateRawSync(compData);
    entries.push({ name, data: rawData });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function writeZipEntries(entries) {
  const localParts = [];
  const cdParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const rawData = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, "utf8");
    const compData = zlib.deflateRawSync(rawData, { level: 9 });
    const crc = crc32(rawData);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(8, 8); // deflate
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0x5764, 12); // mod date (2026-11-04)
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compData.length, 18);
    localHeader.writeUInt32LE(rawData.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, compData);

    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0);
    cdHeader.writeUInt16LE(20, 4);
    cdHeader.writeUInt16LE(20, 6);
    cdHeader.writeUInt16LE(0, 8);
    cdHeader.writeUInt16LE(8, 10);
    cdHeader.writeUInt16LE(0, 12);
    cdHeader.writeUInt16LE(0x5764, 14);
    cdHeader.writeUInt32LE(crc, 16);
    cdHeader.writeUInt32LE(compData.length, 20);
    cdHeader.writeUInt32LE(rawData.length, 24);
    cdHeader.writeUInt16LE(nameBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30);
    cdHeader.writeUInt16LE(0, 32);
    cdHeader.writeUInt16LE(0, 34);
    cdHeader.writeUInt16LE(0, 36);
    cdHeader.writeUInt32LE(0, 38);
    cdHeader.writeUInt32LE(offset, 42);
    cdParts.push(cdHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + compData.length;
  }

  const cdBuf = Buffer.concat(cdParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, cdBuf, eocd]);
}

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wTitle(headline, sub) {
  return (
    `<w:p><w:pPr><w:pStyle w:val="Title"/><w:spacing w:after="100"/></w:pPr><w:r><w:t>${escapeXml(headline)}</w:t></w:r></w:p>` +
    `<w:p><w:pPr><w:spacing w:after="360"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic"/><w:color w:val="637085"/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(sub)}</w:t></w:r></w:p>`
  );
}

function wHeading(t) {
  return `<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:spacing w:before="300" w:after="140"/></w:pPr><w:r><w:t>${escapeXml(t)}</w:t></w:r></w:p>`;
}

function wP(t, small = false) {
  if (small) {
    return `<w:p><w:r><w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic"/><w:color w:val="637085"/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(t)}</w:t></w:r></w:p>`;
  }
  return `<w:p><w:r><w:t>${escapeXml(t)}</w:t></w:r></w:p>`;
}

function wLine(tag, val) {
  return (
    `<w:p><w:r><w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic"/><w:b/><w:color w:val="6568D3"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXml(tag + "  ")}</w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic"/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(val)}</w:t></w:r></w:p>`
  );
}

function wrapDocXml(bodyInner, topMar = "1080", bottomMar = "1037") {
  return (
    `<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n` +
    `<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mo="http://schemas.microsoft.com/office/mac/office/2008/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:mv="urn:schemas-microsoft-com:mac:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="http://schemas.microsoft.com/office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14"><w:body>` +
    bodyInner +
    `<w:sectPr w:rsidR="00FC693F" w:rsidRPr="0006063C" w:rsidSect="00034616"><w:headerReference w:type="default" r:id="rId9"/><w:footerReference w:type="default" r:id="rId10"/><w:pgSz w:w="11909" w:h="16834"/><w:pgMar w:top="${topMar}" w:right="1195" w:bottom="${bottomMar}" w:left="1195" w:header="720" w:footer="720" w:gutter="0"/><w:cols w:space="720"/><w:docGrid w:linePitch="360"/></w:sectPr></w:body></w:document>`
  );
}

const footerXml =
  `<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n` +
  `<w:ftr xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:mo="http://schemas.microsoft.com/office/mac/office/2008/main" xmlns:mv="urn:schemas-microsoft-com:mac:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w10="http://schemas.microsoft.com/office:word" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14"><w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic"/><w:color w:val="637085"/><w:sz w:val="16"/></w:rPr><w:t>연락처: ${EMAIL}   |   2026.11.04   |   실제 기록 기반 포트폴리오 문서</w:t></w:r></w:p></w:ftr>`;

function updateDocx(docxPath, docXml, ftrXml) {
  const entries = readZipEntries(fs.readFileSync(docxPath));
  for (const entry of entries) {
    if (entry.name === "word/document.xml") entry.data = Buffer.from(docXml, "utf8");
    if (entry.name === "word/footer1.xml") entry.data = Buffer.from(ftrXml, "utf8");
  }
  fs.writeFileSync(docxPath, writeZipEntries(entries));
}

// 1) 이력서_손준혁.docx
const resumeXml = wrapDocXml(
  [
    wTitle("손준혁", "인프라·네트워크·보안 분야 학습/프로젝트 포트폴리오"),
    wLine("연락처", EMAIL),
    wLine("한 줄 소개", "모르는 것은 묻고, 막힌 문제는 끝까지 다시 풀어 보는 사람"),
    wHeading("교육 및 전공"),
    wLine("2019", "전남대학교 전자상거래전공 (Python·SQL·데이터 분석 및 전공 과정 이수)"),
    wLine("2026.08—11", "SKT ALEPH 보안 인프라 교육 과정 (네트워크·서버·보안 인프라 실습 및 팀 프로젝트 수행)"),
    wHeading("학습 기술"),
    wP("네트워크/인프라: VLAN, L2/L3 스위칭, 라우팅, DHCP, DNS, 방화벽·이중화 개념 및 GNS3 기반 토폴로지 설계·구현"),
    wP("프로그래밍/데이터 분석: Python, SQL 기초, 미국 CDC NHANES 복합표본 공개자료 통계 분석 및 재현 문서화"),
    wP("협업/학습 기록: Notion과 ChatGPT를 연계한 체계적 복습, 39일간의 리추얼 기록 및 동료 협업을 통한 문제 해결"),
    wHeading("주요 과제 및 산출물 (기간 포함)"),
    wLine("2026.08—11", "13주 리추얼 및 출석·실습 기록 — 12개 주차 39일 기록, 강점 행동 실천 28일, 일부 실천 3일, 최장 9회 연속 실천"),
    wLine("2026.10—11", "네트워크 DHCP 할당 및 복습 체계 구축 — Notion·ChatGPT 연계 복습 및 방과 후 야간 실습 수행"),
    wLine("2026.11.04", "10번 논문 「사람의 하루 적정 수면시간은 얼마인가?」 — NHANES 성인 5,800명 공개자료 가중 분석 완료"),
    wLine("2026.11", "심평원(HIRA) 가상 네트워크 인프라 설계 — GNS3 기반 사용자·서버망·방화벽·라우터 이중화 토폴로지 구현 진행 중"),
    wLine("2026.11", "BR-A 자기소개 공개 사이트 및 결정론적 기록 갱신 장치(Node.js/Python) 개발 완료"),
    wHeading("일하는 방식"),
    wP(
      "모르는 부분을 숨기지 않고 질문하며, 동료의 설명을 경청한 뒤 직접 실습으로 끝까지 확인합니다. 2026년 8월 21일 이해가 막혔던 내용을 8월 25일 수업 후 남아 동료와 함께 해결했고, 9월 14일 시험 탈락 이후에도 흔들리지 않고 9회 연속 리추얼 실천을 이어 갔습니다."
    ),
  ].join("")
);

// 2) 자기소개서_손준혁.docx
const psXml = wrapDocXml(
  [
    wTitle("자기소개서", "모르는 것은 묻고, 막힌 문제는 끝까지 다시 풀어 보는 사람"),
    ...paragraphs.map((p) => wP(p)),
    wHeading("지원 직무와 연결되는 태도"),
    wP(
      "네트워크·보안 인프라 분야에서도 설정 하나가 왜 작동하고 왜 막히는지 끝까지 확인하는 태도가 중요하다고 생각합니다. 모르는 개념을 어설프게 넘기기보다 기록하고 질문하며 실습으로 검증하고, 동료와 정보를 나누며 함께 성장하겠습니다."
    ),
  ].join(""),
  "922",
  "864"
);

// 3) 경력기술서_손준혁.docx
const entries = [
  [
    "01 · 네트워크 기초 실습 및 방과 후 문제 해결 (2026.08.11—08.25)",
    "대인관계력 · 자기동기력 (보조: 과제지속력)",
    "[대인관계력·자기동기력] 8월 21일 실습 내용을 거의 이해하지 못했던 고난 속에서도 질문을 멈추지 않고, 8월 25일 방과 후 남아 동료와 끝내 실습 문제를 해결함.",
    "네트워크·서버 초기 진도에서 이해가 어려운 부분이 많았고, 8월 21일 리추얼 기록에 “오늘 내용 너무 어렵다. 이해 거의 못함”이라고 적을 만큼 고비를 겪었습니다.",
    "8월 12~13일 동료의 의견을 경청하며 질문하기 편한 분위기를 만들었고, 8월 20~21일 막히는 부분을 동료에게 반복해 질문한 뒤 8월 25일 수업이 끝난 후에도 강의실에 남아 동료와 함께 실습을 재수행했습니다.",
    "당일 미해결 상태였던 실습 문제를 최종 해결했으며, 질문과 협업을 통해 막힌 문제를 풀어내는 학습 루틴을 확립했습니다.",
  ],
  [
    "02 · 시험 탈락 극복 및 Notion·ChatGPT 연계 복습·DHCP 실습 (2026.09.14—11.03)",
    "자기조절력 · 자기동기력 (보조: 회복탄력성 · 과제지속력)",
    "[자기조절력·자기동기력] 9월 14일 시험 탈락 후 9회 연속 리추얼 실천으로 페이스를 회복하고, 10월 30일 노션·ChatGPT 복습 체계 구축 및 11월 3일 야간 DHCP 실습을 완수함.",
    "9월 14일 시험 탈락과 10월 7일 “따라가기 벅차다”는 기록처럼 학습 피로와 프로젝트·과제 중복(10월 29일 밤 9시 37분까지 과제 수행)으로 부담이 누적되었습니다.",
    "시험 탈락 당일에도 감정에 매몰되지 않고 리추얼을 실천해 10월 2일까지 9회 연속 실천을 달성했고, 10월 1일 동료에게 정보처리기사 학습 사이트를 공유했습니다. 10월 30일에는 새벽 아르바이트와 병행하며 Notion과 ChatGPT를 연결해 누적 학습 내용을 재정리했고, 11월 3일 가장 늦게까지 남아 DHCP 할당 과정을 질문하며 확인했습니다.",
    "막연한 버티기에서 벗어나 스스로 막힌 지점을 찾고 검증하는 복습 체계를 마련했으며, 네트워크 프로젝트의 기본 구성을 설계할 수 있는 기반을 확보했습니다.",
  ],
  [
    "03 · 과제 10 · 적정 수면시간과 낮 졸음의 관계 분석 논문 (2026.11.04)",
    "자기조절력 · 자기동기력",
    "[자기조절력·자기동기력] 미국 CDC NHANES 성인 5,800명 공개자료를 복합표본 가중 분석하여 7~9시간 수면 집단의 낮 졸음 경험률(25.7%)과 통계적 한계를 엄밀히 규명함.",
    "모든 사람의 적정 수면시간을 단일 숫자로 단정하기 어려운 문제를 실증 데이터로 검증하기 위해 10개 후보 질문 중 연구 주제를 선정하고 사전 반증 기준을 수립했습니다.",
    "미국 NHANES 2017–2018 공개자료(6,161명 중 적격 성인 5,800명)에 면접 가중치와 Taylor 선형화 분산을 적용해 평일·근무일 수면시간 구간별 월 5회 이상 낮 졸음 경험률을 비교하고 연령 표준화·민감도 분석을 수행했습니다.",
    "7~9시간 수면 집단의 가중 졸음 경험률(25.7%)이 7시간 미만 집단(32.8%, p=0.0027)보다 유의하게 낮음을 확인하고, 9시간 초과 집단(29.8%, p=0.1600)과의 비유의성 및 횡단면 관찰연구의 한계를 투명하게 보고한 6쪽 분량의 논문과 재현 패키지를 완성했습니다.",
  ],
  [
    "04 · 심평원(HIRA) 가상 네트워크 설계 및 BR-A 기록 갱신 장치 구현 (2026.11)",
    "대인관계력 · 자기동기력 · 자기조절력",
    "[대인관계력·자기동기력·자기조절력] 팀 기반 심평원 가상 네트워크(GNS3) 설계를 수행함과 동시에, 39일간의 리추얼 기록을 SHA256 일치 검증으로 재생성하는 포트폴리오 사이트와 갱신 장치를 구축함.",
    "기관 내부 사용자·서버망·경계 보안·이중화를 고려한 팀 네트워크 설계 과제와, 13주간의 성장 기록을 검증 가능한 형태로 공개하는 BR-A 과제를 동시에 수행해야 했습니다.",
    "팀원들과 심평원 서비스 흐름 및 GNS3 기반 코어·백본·엣지 라우터·서버망 연결 구조를 검토하고, 39일간의 리추얼·출석·제출 기록에서 통계와 능력별 문단 후보를 결정론적으로 추출하는 스크립트(update.py / update.mjs / verify.mjs)와 공개 사이트를 제작했습니다.",
    "동일 입력 2회 실행 및 새 임시 폴더 실행에서 출력 파일 4종의 SHA256 해시가 100% 일치(PASS)하는 갱신 장치와 공개 포트폴리오 및 지원 문서 3종을 완성했습니다.",
  ],
];

const expParts = [
  wTitle("프로젝트 기반 경력기술서", "과제별 발휘 역량(자기조절력·대인관계력·자기동기력) 및 상황·행동·결과"),
  wP("※ 각 과제를 한 줄 요약과 함께 세 가지 핵심 능력(자기조절력·대인관계력·자기동기력) 및 상황·행동·결과로 정리했습니다.", true),
];
entries.forEach(([name, power, summaryLine, sit, act, res], idx) => {
  if (idx === 2) expParts.push(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`);
  expParts.push(
    wHeading(name),
    wLine("해당 능력", power),
    wLine("한 줄 요약", summaryLine),
    wLine("상황", sit),
    wLine("행동", act),
    wLine("결과", res)
  );
});
expParts.push(
  wHeading("자료 및 출처 확인"),
  wP(
    "근거: 2026.08.11—11.04 리추얼 기록(39일 작성, 실천 28일, 일부 실천 3일, 최장 9회 연속 실천), 내 출석 기록(12주 39일 체크인), 내 제출 현황(핵심 과제 6건), 2026.11.04 작성 10번 수면 논문(NHANES n=5,800), GNS3 네트워크 팀 프로젝트 기록."
  ),
  wP(`연락처: ${EMAIL}`, true)
);
const expXml = wrapDocXml(expParts.join(""));

const docTargets = [
  ["이력서_손준혁.docx", "resume.docx", resumeXml],
  ["자기소개서_손준혁.docx", "personal-statement.docx", psXml],
  ["경력기술서_손준혁.docx", "project-experience.docx", expXml],
];

for (const [docName, assetName, xml] of docTargets) {
  const docPath = path.join(ROOT, "documents", docName);
  const assetPath = path.join(ROOT, "site", "assets", assetName);
  updateDocx(docPath, xml, footerXml);
  fs.copyFileSync(docPath, assetPath);
  console.log(`DOCX 갱신 및 복사 완료: ${docName} -> site/assets/${assetName} (${fs.statSync(docPath).size.toLocaleString()} bytes)`);
}

function walkDir(dir, prefix = "") {
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name.startsWith(".")) continue;
    const full = path.join(dir, item.name);
    const rel = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) out.push(...walkDir(full, rel));
    else out.push({ name: rel, data: fs.readFileSync(full) });
  }
  return out;
}

function writeUtf8Zip(entries, outPath) {
  const localParts = [];
  const cdParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name.replace(/\\/g, "/"), "utf8");
    const rawData = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, "utf8");
    const compData = zlib.deflateRawSync(rawData, { level: 9 });
    const crc = crc32(rawData);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0x5764, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(compData.length, 18);
    lh.writeUInt32LE(rawData.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    localParts.push(lh, nameBuf, compData);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x5764, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(compData.length, 20);
    cd.writeUInt32LE(rawData.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    cdParts.push(cd, nameBuf);

    offset += lh.length + nameBuf.length + compData.length;
  }

  const cdBuf = Buffer.concat(cdParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  fs.writeFileSync(outPath, Buffer.concat([...localParts, cdBuf, eocd]));
}

const updaterZipPath = path.join(ROOT, "BR_A_기록갱신장치_손준혁.zip");
const updaterEntries = [
  ...walkDir(path.join(ROOT, "updater"), "updater"),
  { name: "site/data/site-data.js", data: fs.readFileSync(path.join(ROOT, "site", "data", "site-data.js")) },
];
writeUtf8Zip(updaterEntries, updaterZipPath);
console.log(`ZIP 생성 완료: BR_A_기록갱신장치_손준혁.zip (${fs.statSync(updaterZipPath).size.toLocaleString()} bytes)`);

const bundleZipPath = path.join(ROOT, "BR_A_제출묶음_손준혁.zip");
const bundleEntries = [
  ...walkDir(path.join(ROOT, "documents"), "documents"),
  { name: "BR_A_기록갱신장치_손준혁.zip", data: fs.readFileSync(updaterZipPath) },
  ...walkDir(path.join(ROOT, "updater"), "updater"),
  ...walkDir(path.join(ROOT, "site"), "site"),
  { name: "제출문_초안.txt", data: fs.readFileSync(path.join(ROOT, "제출문_초안.txt")) },
  { name: "README_시작.md", data: fs.readFileSync(path.join(ROOT, "README_시작.md")) },
];
writeUtf8Zip(bundleEntries, bundleZipPath);
console.log(`ZIP 생성 완료: BR_A_제출묶음_손준혁.zip (${fs.statSync(bundleZipPath).size.toLocaleString()} bytes)`);
