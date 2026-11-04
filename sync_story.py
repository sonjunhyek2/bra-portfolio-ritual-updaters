"""Regenerate portfolio web body and downloadable documents from story.txt.

No external packages beyond python-docx (already used by make_documents.py).
"""
from html import escape
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
site_html = ROOT / 'site' / 'index.html'
previous = site_html.read_text(encoding='utf-8') if site_html.exists() else ''
email_match = re.search(r'mailto:([^"\s]+@[^"\s]+)', previous)
email = email_match.group(1) if email_match and 'CONTACT_EMAIL_HERE' not in email_match.group(1) else None
story = (ROOT / 'story.txt').read_text(encoding='utf-8').strip()
paragraphs = [paragraph.strip() for paragraph in story.split('\n\n') if paragraph.strip()]
assert paragraphs and all('<' not in p for p in paragraphs), 'Invalid story paragraph'
markup = '\n'.join('<p>' + escape(paragraph, quote=True) + '</p>' for paragraph in paragraphs)
html = (ROOT / 'index.template.html').read_text(encoding='utf-8')
assert html.count('{{STORY_PARAGRAPHS}}') == 1, 'Template placeholder not found'
site_html.write_text(html.replace('{{STORY_PARAGRAPHS}}', markup), encoding='utf-8')
subprocess.run([sys.executable, str(ROOT / 'make_documents.py')], check=True)
if email:
    subprocess.run([sys.executable, str(ROOT / 'set_contact.py'), email], check=True)
print(f'웹 본편 {len(paragraphs)}문단 / {len(story):,}자 및 문서 3종 동기화 완료')
