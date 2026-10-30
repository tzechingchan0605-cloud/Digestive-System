"""Validate the reviewed worksheet and answer copy as real PDFs and Word files."""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree
import json, re
import fitz
from docx import Document
root=Path(__file__).resolve().parents[1];out=root/'paperwork/generated'
manifest=json.loads((out/'manifest.json').read_text())
assert len(manifest['files'])==5
student=Document(out/'WS1_student.docx');answers=Document(out/'WS1_answers.docx');template=Document(root/'paperwork/templates/WS1_reviewed.docx')
assert [p.text for p in student.paragraphs]==[p.text for p in template.paragraphs]
ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
def images(file):
 with ZipFile(file) as z:return sorted(z.read(n) for n in z.namelist() if n.startswith('word/media/'))
assert images(out/'WS1_student.docx')==images(out/'WS1_answers.docx')==images(root/'paperwork/templates/WS1_reviewed.docx')
assert len(student.inline_shapes)==len(answers.inline_shapes)==5
text=lambda d:'\n'.join(p.text for p in d.paragraphs)
source=text(student);key=text(answers)
questions=[p.text for p in student.paragraphs if re.match(r'^\d+\. ',p.text)]
assert len(questions)==8
assert all(q in key for q in questions)
# The actual source and the answer copy use precisely the same choice lists.
for sr,ar in zip(student.tables[0].rows,answers.tables[0].rows):assert [c.text for c in sr.cells]==[c.text for c in ar.cells]
for row,correct in zip(answers.tables[0].rows[1:],[['消化液組合'],['混合物外觀'],['油和水總體積','反應溫度','反應時間','加液總量','搖勻方式']]):
 selected=[r.text for p in row.cells[1].paragraphs for r in p.runs if r.underline]
 assert selected==correct,(selected,correct)
assert sum(p.text.startswith('☑ ') for p in answers.paragraphs)==3
assert '□ X＋Y 組可加入較多總液量' in key
for chosen in ['混濁乳狀液','增加','消化液 Y']:
 assert any(r.text==chosen and r.underline for p in answers.paragraphs for r in p.runs)
assert '✓ A. 外觀可提供' in key
assert '需要。油水混合物加 2 mL 水作對照' in key
assert '煮沸使其變性' in key and '膽汁則在煮沸後仍保留乳化作用' in key
assert not any(p.text.startswith('需要。') or p.text.startswith('✓ A.') for p in student.paragraphs)
for name in ['WS1_student.pdf','WS1_answers.pdf']:
 pdf=fitz.open(out/name);assert len(pdf)==4
 full='\n'.join(p.get_text() for p in pdf)
 for i,p in enumerate(pdf):
  assert abs(p.rect.width-595.3)<2 and abs(p.rect.height-841.9)<2
  assert len(p.get_text().strip())>80, (name,i,'orphan or empty page')
  # Ensure no text collides with the footer or falls outside the page.
  for block in p.get_text('dict')['blocks']:
   if 'lines' not in block:continue
   for line in block['lines']:
    for span in line['spans']:
     assert 0<=span['bbox'][0]<span['bbox'][2]<=p.rect.width+1
     assert 0<=span['bbox'][1]<span['bbox'][3]<=p.rect.height+1
  assert len(p.get_images())>=1,(name,i,'missing worksheet diagram')
 assert all(f'{n}.' in full for n in range(1,9)),name
 assert '部分3' in full.replace(' ','')
 if 'answers' in name:assert '煮沸使其變性' in full and '參考答案' in full
 print(f'PASS: {name}: 4 real A4 pages, all 8 questions, all diagrams, no orphan page.')
print('PASS: reviewed text/images preserved; correct keyed answers for all eight questions; student/answer documents remain separate.')

# Answer lines must survive printing as dark, substantial rules.
nsw={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
for p in student.paragraphs:
 for border in p._p.xpath('./w:pPr/w:pBdr/*'):
  assert border.get('{'+nsw['w']+'}color')=='333333'
  assert border.get('{'+nsw['w']+'}sz')=='8'
guide=fitz.open(out/'WS1_D_teacher_guide.pdf')
text='\n'.join(p.get_text() for p in guide)
assert '教師指引' in text and 'Excel' in text
assert all(len(p.get_text())>80 for p in guide)
print('PASS: dark answer rules and revised teacher guide PDF.')

rules=json.loads((root/'paperwork/rubric.json').read_text())
assert rules['reflectionMaximum']==8 and len(rules['reflectionPoints'])==8
assert sum(q['max'] for q in rules['worksheet'])==rules['worksheetMaximum']==19
assert rules['vlMaximum']==rules['spsMaximum']+rules['reflectionMaximum']==32
assert '8. '+rules['worksheetQuestion'] in source
assert rules['answer'] in key
assert '19 分' in text and '綜合解釋' in text
print('PASS: selected comprehensive question, model answer and teacher guide use the same 8-point rubric.')

from lxml import html
vl=html.fromstring((root/'index.html').read_text())
assert vl.xpath('//*[@id="reflectionReveal"]//p')[1].text_content()==rules['question']
assert '請引用實驗觀察' not in rules['question'] and '一項限制' not in rules['worksheetQuestion']
assert '不另要求引用組別觀察、外觀限制' in re.sub(r'\s+','',text)

# Identity fields must remain on one printed line in both downloadable versions.
for name in ['WS1_student.pdf','WS1_answers.pdf']:
 pdf=fitz.open(out/name)
 lines=[''.join(span['text'] for span in line['spans']) for block in pdf[0].get_text('dict')['blocks'] if 'lines' in block for line in block['lines']]
 assert any(all(label in line for label in ['姓名：','班別：','學號：']) for line in lines), (name,'identity fields wrapped')
print('PASS: name, class and student number print on the same line in both versions.')
