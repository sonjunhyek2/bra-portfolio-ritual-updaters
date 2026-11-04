from pathlib import Path
from shutil import copyfile

try:
    from docx import Document
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
except ModuleNotFoundError as exc:
    if exc.name == 'docx':
        raise SystemExit('필요한 패키지가 없습니다. 먼저 `python -m pip install python-docx`를 실행하세요.') from exc
    raise

BASE=Path(__file__).resolve().parent
DOCS=BASE/'documents'
SITE=BASE/'site'/'assets'
STORY_PATH=BASE/'story.txt'
if not STORY_PATH.is_file():
    raise SystemExit(f'자기소개서 원문 파일을 찾을 수 없습니다: {STORY_PATH}')
STORY=STORY_PATH.read_text(encoding='utf-8').strip().split('\n\n')
DOCS.mkdir(parents=True, exist_ok=True)
SITE.mkdir(parents=True, exist_ok=True)
EMAIL='jungurdudgh@gmail.com'

C_NAVY=RGBColor(19,34,55); C_MUTED=RGBColor(99,112,133); C_ACCENT=RGBColor(101,104,211)
def set_font(run,size=None,bold=None,color=None):
    run.font.name='Malgun Gothic'
    run._element.rPr.rFonts.set(qn('w:eastAsia'),'Malgun Gothic')
    if size: run.font.size=Pt(size)
    if bold is not None:run.bold=bold
    if color:run.font.color.rgb=color
    return run

def setup(doc,label):
    sec=doc.sections[0]
    sec.page_height=Inches(11.69);sec.page_width=Inches(8.27)
    sec.top_margin=Inches(.75);sec.bottom_margin=Inches(.72)
    sec.left_margin=Inches(.83);sec.right_margin=Inches(.83)
    styles=doc.styles
    normal=styles['Normal'];normal.font.name='Malgun Gothic';normal._element.rPr.rFonts.set(qn('w:eastAsia'),'Malgun Gothic');normal.font.size=Pt(10);normal.font.color.rgb=C_NAVY
    normal.paragraph_format.space_after=Pt(8);normal.paragraph_format.line_spacing=1.35
    for nm,sz in [('Title',23),('Heading 1',13),('Heading 2',11)]:
        st=styles[nm];st.font.name='Malgun Gothic';st._element.rPr.rFonts.set(qn('w:eastAsia'),'Malgun Gothic')
        st.font.size=Pt(sz);st.font.bold=True;st.font.color.rgb=C_NAVY
    head=sec.header.paragraphs[0];head.alignment=WD_ALIGN_PARAGRAPH.RIGHT
    set_font(head.add_run('손준혁  /  '+label),8,color=C_MUTED)
    foot=sec.footer.paragraphs[0]
    set_font(foot.add_run(f'연락처: {EMAIL}   |   2026.11.04   |   실제 기록 기반 포트폴리오 문서'),8,color=C_MUTED)
    doc.core_properties.author='손준혁'
    doc.core_properties.last_modified_by='손준혁'

def title(doc,headline,sub):
    p=doc.add_paragraph(style='Title');p.paragraph_format.space_after=Pt(5);p.add_run(headline)
    p=doc.add_paragraph();set_font(p.add_run(sub),9,color=C_MUTED)
    p.paragraph_format.space_after=Pt(18)

def heading(doc,t):
    p=doc.add_paragraph(style='Heading 1');p.paragraph_format.space_before=Pt(15);p.paragraph_format.space_after=Pt(7);p.add_run(t)

def p(doc,s,small=False):
    par=doc.add_paragraph();run=par.add_run(s)
    if small:set_font(run,9,color=C_MUTED)
    return par

def line(doc,tag,s):
    par=doc.add_paragraph()
    set_font(par.add_run(tag+'  '),10,True,C_ACCENT)
    set_font(par.add_run(s),10)
    return par

# 1. Resume
D=Document();setup(D,'이력서')
title(D,'손준혁','인프라·네트워크·보안 분야 학습/프로젝트 포트폴리오')
line(D,'연락처',EMAIL)
line(D,'한 줄 소개','모르는 것은 묻고, 막힌 문제는 끝까지 다시 풀어 보는 사람')
heading(D,'교육 및 전공')
line(D,'2019','전남대학교 전자상거래전공 (Python·SQL·데이터 분석 및 전공 과정 이수)')
line(D,'2026.08—11','SKT ALEPH 보안 인프라 교육 과정 (네트워크·서버·보안 인프라 실습 및 팀 프로젝트 수행)')
heading(D,'학습 기술')
p(D,'네트워크/인프라: VLAN, L2/L3 스위칭, 라우팅, DHCP, DNS, 방화벽·이중화 개념 및 GNS3 기반 토폴로지 설계·구현')
p(D,'프로그래밍/데이터 분석: Python, SQL 기초, 미국 CDC NHANES 복합표본 공개자료 통계 분석 및 재현 문서화')
p(D,'협업/학습 기록: Notion과 ChatGPT를 연계한 체계적 복습, 39일간의 리추얼 기록 및 동료 협업을 통한 문제 해결')
heading(D,'주요 과제 및 산출물 (기간 포함)')
line(D,'2026.08—11','13주 리추얼 및 출석·실습 기록 — 12개 주차 39일 기록, 강점 행동 실천 28일, 일부 실천 3일, 최장 9회 연속 실천')
line(D,'2026.10—11','네트워크 DHCP 할당 및 복습 체계 구축 — Notion·ChatGPT 연계 복습 및 방과 후 야간 실습 수행')
line(D,'2026.11.04','10번 논문 「사람의 하루 적정 수면시간은 얼마인가?」 — NHANES 성인 5,800명 공개자료 가중 분석 완료')
line(D,'2026.11','심평원(HIRA) 가상 네트워크 인프라 설계 — GNS3 기반 사용자·서버망·방화벽·라우터 이중화 토폴로지 구현 진행 중')
line(D,'2026.11','BR-A 자기소개 공개 사이트 및 결정론적 기록 갱신 장치(Node.js/Python) 개발 완료')
heading(D,'일하는 방식')
p(D,'모르는 부분을 숨기지 않고 질문하며, 동료의 설명을 경청한 뒤 직접 실습으로 끝까지 확인합니다. 2026년 8월 21일 이해가 막혔던 내용을 8월 25일 수업 후 남아 동료와 함께 해결했고, 9월 14일 시험 탈락 이후에도 흔들리지 않고 9회 연속 리추얼 실천을 이어 갔습니다.')
D.save(DOCS/'이력서_손준혁.docx')

# 2. Personal statement
D=Document();setup(D,'자기소개서')
D.sections[0].top_margin=Inches(.64)
D.sections[0].bottom_margin=Inches(.60)
D.styles['Normal'].font.size=Pt(9.3)
D.styles['Normal'].paragraph_format.line_spacing=1.22
D.styles['Normal'].paragraph_format.space_after=Pt(5)
title(D,'자기소개서','모르는 것은 묻고, 막힌 문제는 끝까지 다시 풀어 보는 사람')
for para in STORY:
    p(D,para)
heading(D,'지원 직무와 연결되는 태도')
p(D,'네트워크·보안 인프라 분야에서도 설정 하나가 왜 작동하고 왜 막히는지 끝까지 확인하는 태도가 중요하다고 생각합니다. 모르는 개념을 어설프게 넘기기보다 기록하고 질문하며 실습으로 검증하고, 동료와 정보를 나누며 함께 성장하겠습니다.')
D.save(DOCS/'자기소개서_손준혁.docx')

# 3. Project-based experience
D=Document();setup(D,'경력기술서')
title(D,'프로젝트 기반 경력기술서','과제별 발휘 역량(자기조절력·대인관계력·자기동기력) 및 상황·행동·결과')
p(D,'※ 각 과제를 한 줄 요약과 함께 세 가지 핵심 능력(자기조절력·대인관계력·자기동기력) 및 상황·행동·결과로 정리했습니다.',True)
entries=[
 ('01 · 네트워크 기초 실습 및 방과 후 문제 해결 (2026.08.11—08.25)',
  '대인관계력 · 자기동기력 (보조: 과제지속력)',
  '[대인관계력·자기동기력] 8월 21일 실습 내용을 거의 이해하지 못했던 고난 속에서도 질문을 멈추지 않고, 8월 25일 방과 후 남아 동료와 끝내 실습 문제를 해결함.',
  '네트워크·서버 초기 진도에서 이해가 어려운 부분이 많았고, 8월 21일 리추얼 기록에 “오늘 내용 너무 어렵다. 이해 거의 못함”이라고 적을 만큼 고비를 겪었습니다.',
  '8월 12~13일 동료의 의견을 경청하며 질문하기 편한 분위기를 만들었고, 8월 20~21일 막히는 부분을 동료에게 반복해 질문한 뒤 8월 25일 수업이 끝난 후에도 강의실에 남아 동료와 함께 실습을 재수행했습니다.',
  '당일 미해결 상태였던 실습 문제를 최종 해결했으며, 질문과 협업을 통해 막힌 문제를 풀어내는 학습 루틴을 확립했습니다.'),
 ('02 · 시험 탈락 극복 및 Notion·ChatGPT 연계 복습·DHCP 실습 (2026.09.14—11.03)',
  '자기조절력 · 자기동기력 (보조: 회복탄력성 · 과제지속력)',
  '[자기조절력·자기동기력] 9월 14일 시험 탈락 후 9회 연속 리추얼 실천으로 페이스를 회복하고, 10월 30일 노션·ChatGPT 복습 체계 구축 및 11월 3일 야간 DHCP 실습을 완수함.',
  '9월 14일 시험 탈락과 10월 7일 “따라가기 벅차다”는 기록처럼 학습 피로와 프로젝트·과제 중복(10월 29일 밤 9시 37분까지 과제 수행)으로 부담이 누적되었습니다.',
  '시험 탈락 당일에도 감정에 매몰되지 않고 리추얼을 실천해 10월 2일까지 9회 연속 실천을 달성했고, 10월 1일 동료에게 정보처리기사 학습 사이트를 공유했습니다. 10월 30일에는 새벽 아르바이트와 병행하며 Notion과 ChatGPT를 연결해 누적 학습 내용을 재정리했고, 11월 3일 가장 늦게까지 남아 DHCP 할당 과정을 질문하며 확인했습니다.',
  '막연한 버티기에서 벗어나 스스로 막힌 지점을 찾고 검증하는 복습 체계를 마련했으며, 네트워크 프로젝트의 기본 구성을 설계할 수 있는 기반을 확보했습니다.'),
 ('03 · 과제 10 · 적정 수면시간과 낮 졸음의 관계 분석 논문 (2026.11.04)',
  '자기조절력 · 자기동기력',
  '[자기조절력·자기동기력] 미국 CDC NHANES 성인 5,800명 공개자료를 복합표본 가중 분석하여 7~9시간 수면 집단의 낮 졸음 경험률(25.7%)과 통계적 한계를 엄밀히 규명함.',
  '모든 사람의 적정 수면시간을 단일 숫자로 단정하기 어려운 문제를 실증 데이터로 검증하기 위해 10개 후보 질문 중 연구 주제를 선정하고 사전 반증 기준을 수립했습니다.',
  '미국 NHANES 2017–2018 공개자료(6,161명 중 적격 성인 5,800명)에 면접 가중치와 Taylor 선형화 분산을 적용해 평일·근무일 수면시간 구간별 월 5회 이상 낮 졸음 경험률을 비교하고 연령 표준화·민감도 분석을 수행했습니다.',
  '7~9시간 수면 집단의 가중 졸음 경험률(25.7%)이 7시간 미만 집단(32.8%, p=0.0027)보다 유의하게 낮음을 확인하고, 9시간 초과 집단(29.8%, p=0.1600)과의 비유의성 및 횡단면 관찰연구의 한계를 투명하게 보고한 6쪽 분량의 논문과 재현 패키지를 완성했습니다.'),
 ('04 · 심평원(HIRA) 가상 네트워크 설계 및 BR-A 기록 갱신 장치 구현 (2026.11)',
  '대인관계력 · 자기동기력 · 자기조절력',
  '[대인관계력·자기동기력·자기조절력] 팀 기반 심평원 가상 네트워크(GNS3) 설계를 수행함과 동시에, 39일간의 리추얼 기록을 SHA256 일치 검증으로 재생성하는 포트폴리오 사이트와 갱신 장치를 구축함.',
  '기관 내부 사용자·서버망·경계 보안·이중화를 고려한 팀 네트워크 설계 과제와, 13주간의 성장 기록을 검증 가능한 형태로 공개하는 BR-A 과제를 동시에 수행해야 했습니다.',
  '팀원들과 심평원 서비스 흐름 및 GNS3 기반 코어·백본·엣지 라우터·서버망 연결 구조를 검토하고, 39일간의 리추얼·출석·제출 기록에서 통계와 능력별 문단 후보를 결정론적으로 추출하는 스크립트(update.py / update.mjs / verify.mjs)와 공개 사이트를 제작했습니다.',
  '동일 입력 2회 실행 및 새 임시 폴더 실행에서 출력 파일 4종의 SHA256 해시가 100% 일치(PASS)하는 갱신 장치와 공개 포트폴리오 및 지원 문서 3종을 완성했습니다.')
]
for i,e in enumerate(entries):
    if i==2:
        D.add_page_break()
    name, power, summary_line, sit, act, res = e
    heading(D,name)
    line(D,'해당 능력',power)
    line(D,'한 줄 요약',summary_line)
    line(D,'상황',sit)
    line(D,'행동',act)
    line(D,'결과',res)
heading(D,'자료 및 출처 확인')
p(D,'근거: 2026.08.11—11.04 리추얼 기록(39일 작성, 실천 28일, 일부 실천 3일, 최장 9회 연속 실천), 내 출석 기록(12주 39일 체크인), 내 제출 현황(핵심 과제 6건), 2026.11.04 작성 10번 수면 논문(NHANES n=5,800), GNS3 네트워크 팀 프로젝트 기록.')
p(D,f'연락처: {EMAIL}',True)
D.save(DOCS/'경력기술서_손준혁.docx')

for f,target in [('이력서_손준혁.docx','resume.docx'),('자기소개서_손준혁.docx','personal-statement.docx'),('경력기술서_손준혁.docx','project-experience.docx')]:
    copyfile(DOCS/f,SITE/target)
    print(f,(DOCS/f).stat().st_size)
