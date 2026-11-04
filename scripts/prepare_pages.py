#!/usr/bin/env python3
"""Build a privacy-filtered GitHub Pages staging directory from site/."""
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "site"
OUTPUT = ROOT / "_site"

if OUTPUT.exists():
    shutil.rmtree(OUTPUT)
shutil.copytree(SOURCE, OUTPUT)

# Remove linked application documents from the public artifact, even if local files exist.
for name in ("resume.docx", "personal-statement.docx", "project-experience.docx"):
    (OUTPUT / "assets" / name).unlink(missing_ok=True)

html_path = OUTPUT / "index.html"
html = html_path.read_text(encoding="utf-8")
html = re.sub(
    r'<a href="assets/(?:resume|personal-statement|project-experience)\.docx"[^>]*>.*?</a>',
    "",
    html,
    flags=re.DOTALL,
)
html = re.sub(
    r'<section class="section documents-section" id="documents">.*?</section>',
    "",
    html,
    flags=re.DOTALL,
)
html = re.sub(r'<a href="#documents">.*?</a>', "", html)
html = re.sub(r'(<div class="navlinks">.*?)(<a href="#documents">.*?</a>)', r"\1", html, flags=re.DOTALL)
html = re.sub(r"\s+", " ", html)
html_path.write_text(html, encoding="utf-8")

print(f"Privacy-filtered Pages artifact prepared at {OUTPUT.relative_to(ROOT)}")
print("Removed personal application DOCX files and their download section/links.")
