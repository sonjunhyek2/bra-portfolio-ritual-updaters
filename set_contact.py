"""Replace contact placeholders with a user-chosen PUBLIC email and copy updated docs to the web assets."""
import re, sys
from pathlib import Path
from shutil import copyfile

try:
    from docx import Document
except ModuleNotFoundError as exc:
    if exc.name == 'docx':
        raise SystemExit('필요한 패키지가 없습니다. 먼저 `python -m pip install python-docx`를 실행하세요.') from exc
    raise

if len(sys.argv)!=2 or not re.fullmatch(r'[A-Za-z0-9.!#$%&\'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+',sys.argv[1]):
    print('사용법: python set_contact.py 공개용이메일@example.com')
    raise SystemExit(2)
email=sys.argv[1]
root=Path(__file__).resolve().parent
site=root/'site'/'index.html'
body=site.read_text(encoding='utf-8')
body=re.sub(r'mailto:[^"\s]+', 'mailto:'+email, body, count=1).replace('aria-disabled="true"','').replace('공개 연락처 등록 전 ↗','이메일로 연락하기 ↗').replace('배포하기 전에 CONTACT_EMAIL_HERE를 본인이 정한 공개 이메일로 교체해 주세요.','이메일로 연락하실 수 있습니다.')
site.write_text(body,encoding='utf-8')
for file,name in [('이력서_손준혁.docx','resume.docx'),('자기소개서_손준혁.docx','personal-statement.docx'),('경력기술서_손준혁.docx','project-experience.docx')]:
    f=root/'documents'/file
    doc=Document(f)
    runs=[]
    for par in doc.paragraphs:runs.extend(par.runs)
    for s in doc.sections:
        for par in s.header.paragraphs:runs.extend(par.runs)
        for par in s.footer.paragraphs:runs.extend(par.runs)
    for run in runs:
        run.text=run.text.replace('[공개용 이메일을 입력해 주세요]',email).replace('[공개용 이메일 입력]',email)
    doc.save(f)
    copyfile(f,root/'site'/'assets'/name)
print('공개 이메일 설정과 DOCX·사이트 반영 완료:',email)
print('주의: 이미 배포한 사이트는 수정된 site 폴더를 다시 배포해야 합니다.')
