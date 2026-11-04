# BR-A | 포트폴리오 사이트와 기록 갱신 장치

## GitHub 저장소 설정

- 저장소 이름: `bra-portfolio-ritual-updaters`
- 저장소 설명: `Static portfolio site and deterministic ritual-record updater with reproducible SHA-256 verification.`
- Topics 제안: `portfolio`, `static-site`, `python`, `nodejs`, `deterministic`
- 원본 기록과 제출용 자료는 `.gitignore`에 제외 규칙을 두었습니다. 처음 올릴 때 GitHub의 변경 파일 목록에서 개인 자료가 포함되지 않았는지 다시 확인하세요.

## GitHub Pages 배포

저장소의 `.github/workflows/pages.yml`은 `main` 브랜치에 push하거나 Actions에서 수동 실행할 때 `site/`만 GitHub Pages에 배포합니다.

1. GitHub 저장소에서 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다.
2. 이 프로젝트 파일을 저장소의 `main` 브랜치에 커밋·푸시합니다.
3. **Actions** 탭에서 `Deploy GitHub Pages` 실행 결과를 확인합니다.
4. 배포가 성공하면 **Settings → Pages**에 표시되는 URL을 확인합니다.

별도 빌드 명령은 없습니다. GitHub 저장소 생성, 설정 변경, 커밋·푸시와 실제 배포는 GitHub 화면에서 직접 진행해야 합니다.

## 공개 전에 반드시 검토할 내용

GitHub Pages 사이트는 공개 열람됩니다. 현재 `site/`에는 공개 연락처, 개인 소개, 이력서·자기소개서·경력기술서 DOCX 다운로드, 연구 PDF와 승인된 개인 기록 근거가 있습니다. 공개 범위가 의도한 것인지 확인한 뒤 배포하세요. 비공개 저장소를 사용해도 Pages 사이트의 공개 여부와는 별개입니다.

`.gitignore`는 아직 Git이 추적하지 않는 파일에만 적용됩니다. 이미 추적·커밋된 파일을 감추거나 Git 이력에서 지우지는 않습니다. 이 저장소를 공개로 만들 계획이면 GitHub에 올리기 전에 공개 대상 파일을 따로 점검하세요.

## 프로젝트 구성

- `site/`: 정적 사이트 배포 파일
- `updater/`: 로컬 기록으로 통계와 공개 승인 근거를 갱신하는 Python/Node.js 도구
- `updater/input/`, `updater/output/`: `.gitignore`에서 제외됩니다. 따라서 공개 저장소 복제본만으로 개인 원본 기록을 재생성할 수 없습니다.
- `documents/`, 제출 ZIP 및 로컬 검증 로그: `.gitignore`에서 제외됩니다.

갱신 절차와 검증 방법은 `updater/README.md`를 참고하세요.

## 기존 배포에 관한 참고

이 프로젝트의 기존 안내에는 Netlify Drop 절차가 있었지만, GitHub Pages 사용 시에는 위 GitHub Actions 절차를 따르세요.

## 기존 완료 내용

사이트와 문서는 리추얼 기록·날짜 및 제출 자료에 맞춰 작성되어 있습니다. 기존 로컬 검증 로그에는 39일 기록의 결정론적 출력 검증 PASS가 기록되어 있습니다. 다만 공개 저장소에 포함되지 않는 원본 입력을 사용하므로, 공개 저장소 복제본으로 같은 검증을 다시 수행할 수는 없습니다.

- 사이트: `site/index.html`
- 갱신 스크립트: `updater/update.py`, `updater/update.mjs`
- 검증 스크립트: `updater/verify.py`, `updater/verify.mjs`
- 이전 제출 패키지: `BR_A_*.zip` (Git에서 제외됨)

이 문서는 GitHub 저장소 설정과 배포 흐름을 안내합니다. 제출용 ZIP을 다시 만들 때는 로컬 개인 원본이 있는 프로젝트에서 기존 패키징 절차를 수행하세요.
