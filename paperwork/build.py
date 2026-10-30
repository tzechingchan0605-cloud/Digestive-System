#!/usr/bin/env python3
"""Package the teacher-reviewed Word worksheet, its answer copy, and two real PDFs."""
from pathlib import Path
from tempfile import TemporaryDirectory
import argparse, hashlib, json, shutil, subprocess, zipfile
from docx import Document
from docx.shared import Pt, RGBColor
import fitz
from teacher_guide import create as create_guide
from docx.oxml.ns import qn
from english import create as create_english
from teacher_en import create as create_guide_en
from diagrams_en import create as create_diagrams_en
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

INPUTS = ['paperwork/english.py','paperwork/teacher_en.py','paperwork/diagrams_en.py','paperwork/render_diagrams.cjs','language-dictionary.js','assets/digestive-system.png','paperwork/templates/WS1_reviewed.docx', 'paperwork/build.py', 'paperwork/build.cjs', 'paperwork/teacher_guide.py', 'paperwork/rubric.json', 'app.js']
sha = lambda b: hashlib.sha256(b).hexdigest()
def fingerprints():
    return {name: sha((ROOT/name).read_bytes()) for name in INPUTS}
def selected(run):
    run.font.color.rgb = RGBColor.from_string('145DA0')
    run.bold = True
    run.underline = True
    run.font.size = Pt(12)
def highlight(paragraph, value):
    # Split runs while preserving the text and its surrounding reviewed formatting.
    whole = paragraph.text
    assert value in whole, (value, whole)
    paragraph.clear()
    before, after = whole.split(value, 1)
    paragraph.add_run(before).font.size = Pt(12)
    selected(paragraph.add_run(value))
    paragraph.add_run(after).font.size = Pt(12)
def replace_text(paragraph, text, answer=False):
    paragraph.clear()
    run=paragraph.add_run(text); run.font.size=Pt(12)
    if answer:
        run.font.color.rgb=RGBColor.from_string('145DA0')
        run.bold=True

def prepare():
    student = Document(TEMPLATE)
    # Layout-only adjustment: the revised name field caused a diagram-only fifth page
    # under LibreOffice. Preserve all text, images, font sizes and line spacing.
    for paragraph in student.paragraphs:
        if paragraph.text.startswith('部分 1｜'):
            break
        paragraph.paragraph_format.space_after = Pt(2)
        paragraph.paragraph_format.space_before = Pt(0)
    # Dark answer rules remain visible in print and photocopies.
    for paragraph in student.paragraphs:
        for border in paragraph._p.xpath('./w:pPr/w:pBdr/*'):
            border.set(qn('w:color'),'333333');border.set(qn('w:sz'),'8')
    student.save(OUT/'WS1_student.docx')
    answers = Document(OUT/'WS1_student.docx')
    answers.paragraphs[0].add_run('（參考答案）').font.size = Pt(14)
    answers.core_properties.title = '工作紙一：脂質的消化與公平比較（參考答案）'
    table = answers.tables[0]
    for row, correct in zip(table.rows[1:], [ ['消化液組合'], ['混合物外觀'], ['油和水總體積', '反應溫度', '反應時間', '加液總量', '搖勻方式'] ]):
        paragraph = row.cells[1].paragraphs[0]
        text = paragraph.text; paragraph.clear()
        import re
        for part in re.split(r'( ／ |\n)', text):
            run = paragraph.add_run(part); run.font.size=Pt(12)
            if part in correct: selected(run)
    for paragraph in answers.paragraphs:
        text = paragraph.text
        if text.startswith('□ ') and not text.startswith('□ X＋Y'):
            replace_text(paragraph, text.replace('□','☑',1), True)
        elif text.startswith('消化液 X 最主要使脂質變成'):
            highlight(paragraph,'混濁乳狀液')
        elif text.startswith('消化液 X 先把大油滴'):
            highlight(paragraph,'增加')
        elif text.startswith('A. 外觀可提供'):
            replace_text(paragraph,'✓ '+text,True)
        elif text.startswith('被煮沸後失去作用'):
            highlight(paragraph,'消化液 Y')
    # Fill existing answer space; do not add questions or separate answer pages.
    paragraphs = answers.paragraphs
    control = next(i for i,p in enumerate(paragraphs) if p.text.startswith('你認為此實驗需要對照組嗎？'))
    blank = next(p for p in paragraphs[control+1:] if not p.text.strip() and not p._p.xpath('.//w:drawing'))
    replace_text(blank, '需要。油水混合物加 2 mL 水作對照，與 X、Y 及 X＋Y 組比較；各組起始油水量、加液總量、反應溫度、時間及搖勻方式相同。', True)
    blank.paragraph_format.line_spacing = 1.5
    final = next(i for i,p in enumerate(paragraphs) if p.text.startswith('8. '))
    spaces = [p for p in paragraphs[final+1:] if not p.text.strip()]
    assert spaces
    replace_text(spaces[0], '膽汁不含消化酶，透過物理消化把大油滴乳化成小油滴，脂質分子沒有改變。小油滴使同量脂質的總表面積增加，讓脂肪酶接觸更多脂質。胰液中的脂肪酶催化脂質的化學消化，按本課完全水解簡化模型，將脂質分解為甘油與脂肪酸。脂肪酶是蛋白質，煮沸使其變性，失去催化功能，冷卻後也不能恢復原來的作用；本模型中的膽汁則在煮沸後仍保留乳化作用。', True)
    spaces[0].paragraph_format.line_spacing=1.5
    for p in spaces[1:]: p._element.getparent().remove(p._element)
    # Answer-copy-only blank spacers beneath the two completed multiple-choice
    # items are unnecessary; remove them so the full key stays four pages.
    in_basic=False
    for p in list(answers.paragraphs):
        if p.text.startswith('部分 2.1｜'):in_basic=True
        if p.text.startswith('部分 2.2｜'):in_basic=False
        if in_basic and not p.text.strip() and not p._p.xpath('.//w:drawing'):
            p._element.getparent().remove(p._element)
    # The answer copy is clearly marked in its header on every page.
    header=answers.sections[0].header.paragraphs[0]
    header.add_run('｜參考答案').font.size=Pt(11)
    answers.save(OUT/'WS1_answers.docx')

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
                    assert len(pdf)==4 if f['id']!='teacher-guide' else len(pdf)>=4
            else:
                with zipfile.ZipFile(ROOT/f['path']) as z:assert z.testzip() is None and 'word/document.xml' in z.namelist()
    source=Document(TEMPLATE);student=Document(OUT/'WS1_student.docx')
    assert [p.text for p in source.paragraphs]==[p.text for p in student.paragraphs]
    assert [[c.text for row in t.rows for c in row.cells] for t in source.tables]==[[c.text for row in t.rows for c in row.cells] for t in student.tables]
    print('PASS: five downloads per language; real English/Chinese files; checksums; reviewed Chinese text preserved.')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    if args.check: check();return
    OUT.mkdir(exist_ok=True)
    prepare()
    with TemporaryDirectory(prefix='vl1-word-') as tmp:
        profile=Path(tmp)/'profile'
        guide=Path(tmp)/'WS1_D_teacher_guide.docx';create_guide(guide)
        diagrams=Path(tmp)/'diagrams';create_diagrams_en(diagrams)
        subprocess.run(['node',str(ROOT/'paperwork/render_diagrams.cjs'),str(diagrams)],check=True,timeout=120)
        create_english(OUT,diagrams)
        guide_en=Path(tmp)/'WS1_D_teacher_guide_en.docx';create_guide_en(guide_en)
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
