#!/usr/bin/env python3
"""Package the teacher-reviewed Word worksheet, its answer copy, and two real PDFs."""
from pathlib import Path
from tempfile import TemporaryDirectory
import argparse, hashlib, json, shutil, subprocess, zipfile
from docx import Document
from docx.shared import Pt, RGBColor
import fitz
from docx.oxml.ns import qn
from staged import create as create_staged
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'paperwork/generated'
TEMPLATE = ROOT / 'paperwork/templates/WS1_reviewed.docx'
SPECS = [('student-pdf', 'WS1_student.pdf', 'application/pdf'),
         ('student-word', 'WS1_student.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
         ('answers-pdf', 'WS1_answers.pdf', 'application/pdf'),
         ('answers-word', 'WS1_answers.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
         ('teacher-guide', 'WS1_D_teacher_guide.pdf', 'application/pdf')]
def specs(language):
    return [(id, name if language=='zh' else Path(name).stem+'_en'+Path(name).suffix,mime) for id,name,mime in SPECS]

INPUTS = ['paperwork/templates/WS1_topic_notes_zh.docx','paperwork/templates/WS1_topic_notes_en.docx','paperwork/staged.py','paperwork/diagrams_en.py','paperwork/render_diagrams.cjs','language-dictionary.js','index.html','paperwork/build.py','paperwork/build.cjs','paperwork/rubric.json','app.js']
sha = lambda b: hashlib.sha256(b).hexdigest()
def fingerprints():
    return {name: sha((ROOT/name).read_bytes()) for name in INPUTS}
def check():
    data=json.loads((OUT/'manifest.json').read_text())
    assert data['format']=='VL1-reviewed-worksheet-v3' and data['version']==3
    assert data['inputs']==fingerprints(), 'Worksheet sources changed; run npm run paper:build'
    assert set(data['languages'])=={'zh','en'}
    expected={name for lang in ['zh','en'] for _,name,_ in specs(lang)}
    assert {p.name for p in OUT.iterdir() if p.suffix in ['.pdf','.docx']}==expected
    for lang in ['zh','en']:
        files=data['languages'][lang]['files']
        assert [f['id'] for f in files]==[s[0] for s in SPECS]
        for f,spec in zip(files,specs(lang)):
            assert f['path']=='paperwork/generated/'+spec[1] and f['mime']==spec[2]
            content=(ROOT/f['path']).read_bytes()
            assert len(content)==f['bytes'] and sha(content)==f['sha256'],f['path']
            if f['path'].endswith('.pdf'):
                assert content.startswith(b'%PDF-')
                with fitz.open(stream=content,filetype='pdf') as pdf:
                    assert len(pdf)==f['pages']
                    assert len(pdf)==4 if f['id']!='teacher-guide' else len(pdf)>=1
            else:
                with zipfile.ZipFile(ROOT/f['path']) as z:assert z.testzip() is None and 'word/document.xml' in z.namelist()
    print('PASS: five downloads per language; real English/Chinese files; checksums; staged sources and files verified.')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    if args.check: check();return
    OUT.mkdir(exist_ok=True)
    with TemporaryDirectory(prefix='vl1-word-') as tmp:
        profile=Path(tmp)/'profile'
        create_staged(OUT,Path(tmp))
        guide=Path(tmp)/'WS1_D_teacher_guide.docx'
        guide_en=Path(tmp)/'WS1_D_teacher_guide_en.docx'
        subprocess.run(['soffice',f'-env:UserInstallation={profile.as_uri()}','--headless','--convert-to','pdf','--outdir',str(OUT),str(OUT/'WS1_student.docx'),str(OUT/'WS1_answers.docx'),str(guide),str(OUT/'WS1_student_en.docx'),str(OUT/'WS1_answers_en.docx'),str(guide_en)],check=True,timeout=120)
    languages={}
    for lang in ['zh','en']:
        files=[]
        for id,name,mime in specs(lang):
            content=(OUT/name).read_bytes()
            with fitz.open(OUT/name.replace('.docx','.pdf')) as pdf:pages=len(pdf)
            files.append(dict(id=id,path='paperwork/generated/'+name,name=name,mime=mime,bytes=len(content),sha256=sha(content),pages=pages))
        languages[lang]=dict(files=files)
    data=dict(format='VL1-reviewed-worksheet-v3',version=3,inputs=fingerprints(),languages=languages)
    (OUT/'manifest.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    expected={name for lang in ['zh','en'] for _,name,_ in specs(lang)}
    for old in OUT.iterdir():
        if old.suffix in ['.pdf','.docx'] and old.name not in expected:old.unlink()
        elif old.name in ['source.json','mapping.md']:old.unlink()
    check()
if __name__=='__main__':main()
