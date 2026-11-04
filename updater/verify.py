#!/usr/bin/env python3
"""Test repeatability of the updater in an isolated newly copied directory."""
from pathlib import Path
import hashlib, shutil, subprocess, sys, tempfile

HERE=Path(__file__).resolve().parent
FILES=['output/stats.json','output/candidates.json','output/site-preview.json']
def digest(base):
    files=[base/f for f in FILES]+[base.parent/'site'/'data'/'site-data.js']
    return {str(f.relative_to(base.parent)):hashlib.sha256(f.read_bytes()).hexdigest() for f in files}

def run(base):
    result=subprocess.run([sys.executable,str(base/'update.py')],cwd=base,capture_output=True,text=True,check=True)
    return result.stdout.strip()

with tempfile.TemporaryDirectory(prefix='br-a-verify-') as root:
    tmp=Path(root)
    copy=tmp/'updater'
    shutil.copytree(HERE,copy,ignore=shutil.ignore_patterns('__pycache__'))
    print('독립 임시 폴더:',tmp)
    print('1차:',run(copy)); first=digest(copy)
    print('2차:',run(copy)); second=digest(copy)
    assert first==second, '같은 폴더에서 두 실행 결과가 다름'
    copy2=tmp/'new-copy'/'updater'
    copy2.parent.mkdir();shutil.copytree(HERE,copy2,ignore=shutil.ignore_patterns('__pycache__'))
    print('새 폴더:',run(copy2)); third=digest(copy2)
    assert first==third, '새 폴더에서 실행 결과가 다름'
    print('PASS: 동일 입력 2회 + 새 폴더에서 결과 SHA256 일치')
    for name, sha in first.items(): print(sha[:20],name)
