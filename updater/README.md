# BR-A 기록 갱신 장치

**별도 외부 패키지 설치·로그인·AI API 키 필요 없음.** 로컬 컴퓨터에서 즉시 실행하는 결정론적(Deterministic) 스크립트입니다. 환경에 따라 **Node.js 18 이상(`node update.mjs`)** 또는 **Python 3.9 이상(`python update.py`)** 중 어느 쪽으로 실행해도 **100% 동일한 SHA256 결과 파일**을 생성합니다. 입력으로 받은 사실을 날짜와 원문에 연결한 **후보**로 만들어 줄 뿐, 존재하지 않는 성과를 만들어내거나 미승인 후보를 임의 공개하지 않습니다.

## 실행 방법 세 단계

1. ZIP을 풀고 `updater/input/ritual_records.md`에 새로운 `## YYYY-MM-DD` 날짜 블록과 `- 강점 행동: 실천했다`(또는 `일부 실천했다`), `- 관찰: ...`(또는 `[아침]`/`[마무리]` 원본 항목)를 추가합니다. 타인의 실명·연락처·비밀번호는 입력하지 마세요. 출석 및 과제 제출 수치는 `attendance.json`과 `tasks.json`에서 갱신할 수 있습니다.
2. `updater` 폴더에서 `node update.mjs`(또는 `python update.py`)를 실행합니다. `output/stats.json`과 `output/candidates.json`을 확인하고, **직접 공개하기로 판단한 후보 ID만** `input/approved.json`에 적습니다. 필요하면 스크립트를 한 번 더 실행합니다.
3. 생성된 `../site/data/site-data.js`를 공개 사이트의 같은 경로에 덮어쓴 후 사이트를 다시 배포합니다. 본문 이야기(`index.html`)는 자동으로 덮어쓰지 않습니다.

## 일치 검증 (동일 입력 2회 + 새 폴더 재현)

`updater` 폴더에서 `node verify.mjs`(또는 `python verify.py`)를 실행하면 독립된 임시 폴더를 새로 만들고, 같은 데이터로 2회 연속 실행 + 별도의 새 폴더에서 1회 실행하여 생성된 4개 파일(`output/stats.json`, `output/candidates.json`, `output/site-preview.json`, `../site/data/site-data.js`)의 SHA256 해시값을 비교합니다. 결과 끝에 `PASS: 동일 입력 2회 + 새 폴더에서 결과 SHA256 일치`가 출력됩니다. 생성되는 파일에는 실행 시각, 난수, 외부 AI 응답이 일절 포함되지 않습니다.

## 입출력과 근거

- `input/ritual_records.md`: 2026-08-11 ~ 2026-11-04 기간 작성된 39일간의 리추얼 기록(아침 호흡·강점 일화·마무리 강점 행동·감사일기·관찰 요약). 타인의 실명은 모두 비공개(익명) 처리되어 있습니다.
- `input/attendance.json`: `내 출석 기록` 출처 수치(13주 과정 중 12개 주차, 아침 호흡 체크인으로 확인된 39일 출석 및 방과 후 잔류 실습 3회).
- `input/tasks.json`: `내 제출 현황` 출처 수치(과정 핵심 과제 6건 수행 완료 및 13번 앱 예정 안내).
- `input/approved.json`: 사이트에 실제 공개할 승인 후보 ID 목록(6개 장면 승인).
- `output/stats.json`: 집계된 리추얼 작성일(39일), '실천했다'(28일), '일부 실천했다'(3일), 최장 연속 실천(9회), 출석 확인(39일), 제출 과제(6건), 고난 장면 짝짓기 정보 및 출처.
- `output/candidates.json`: 날짜, 능력(자기조절력·대인관계력·자기동기력·과제지속력), 근거 원문, 기계가 만든 문단 후보와 승인 여부(총 38개 후보). **승인되지 않은 후보는 공개 사이트 데이터에 올라가지 않습니다.**
- `output/site-preview.json`, `../site/data/site-data.js`: 승인된 6개 근거 장면과 통계만 포함하는 공개용 데이터.
