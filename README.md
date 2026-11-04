# bra-portfolio-ritual-updaters

손준혁의 정적 포트폴리오 사이트와 로컬 기록 갱신 도구입니다.

> **저장소 설명(Repository description):** Static portfolio site and deterministic ritual-record updater with reproducible SHA-256 verification.
>
> **추천 Topics:** `portfolio`, `static-site`, `python`, `nodejs`, `deterministic`

## GitHub Pages 배포

`.github/workflows/pages.yml`은 `main` 브랜치 push 시 실행됩니다. 워크플로는 `scripts/prepare_pages.py`로 공개 artifact를 만들며, 웹사이트에 연결된 개인 DOCX 지원 문서와 해당 다운로드 섹션을 게시 artifact에서 제외합니다. 연구 PDF 및 나머지 사이트 내용은 포함됩니다.

1. GitHub 저장소에서 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다.
2. 파일을 `main` 브랜치에 push하거나 Actions 탭에서 `Deploy GitHub Pages`를 수동 실행합니다.
3. Actions 실행이 성공한 뒤 Settings → Pages의 URL을 확인합니다.

별도 빌드 명령이나 외부 패키지 설치는 필요하지 않습니다. 사이트를 공개하기 전에 이메일, 개인 소개, 연구 PDF와 승인된 근거 문구가 공개되어도 되는지 검토하세요. 저장소의 비공개 설정과 게시 사이트의 공개 범위는 별개입니다.

## 저장소 공개 범위와 ignore 설정

`.gitignore`는 `documents/`, `updater/input/`, `updater/output/`, 검증 로그, 제출용 ZIP, `site/assets/*.docx` 등을 Git 추적에서 제외하도록 설정합니다. `.gitignore`는 이미 추적·커밋된 파일을 Git 이력에서 제거하지 않습니다. 저장소 최초 업로드 전 변경 파일 목록을 확인하고, 이미 커밋한 민감 자료가 있다면 파일 삭제만으로 이력이 지워지지 않는 점에 유의하세요.

업로더가 게시하는 것은 `site/` 전체가 아니라 개인정보 문서를 제거한 `_site/` staging artifact입니다. `_site/`는 매번 워크플로에서 다시 생성됩니다. PDF, 개인 소개, 이메일 및 사이트의 승인 근거는 여전히 공개 대상이므로 배포 전에 따로 확인하세요.

## 기록 갱신 도구

개인 원본 데이터를 보유한 로컬 프로젝트에서 `updater/README.md`의 절차를 따르세요. 원본 기록 `updater/input/`은 저장소에 포함되지 않도록 무시됩니다. 따라서 GitHub 저장소 복제본만으로 원본 전체를 다시 생성할 수 없습니다. 공개용 변경을 저장소에 반영하기 전에 결과물을 검토하세요.

## 권장 저장소 설정

- **Repository name:** `bra-portfolio-ritual-updaters`
- **Description:** `Static portfolio site and deterministic ritual-record updater with reproducible SHA-256 verification.`
- **Topics:** `portfolio`, `static-site`, `python`, `nodejs`, `deterministic`
- **License:** 재사용 허용 범위를 결정하기 전까지 선택하지 않아도 됩니다.

GitHub 저장소 생성, 웹 설정, 커밋·푸시 및 실제 배포는 GitHub 화면에서 직접 진행해야 합니다. 이 작업은 저장소 파일만 준비하며 GitHub 계정에서 실행하지 않습니다.
