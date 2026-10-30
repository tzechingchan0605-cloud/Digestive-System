"""Validate the reviewed worksheet and answer copy as real PDFs and Word files."""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree
import json, re
import fitz
from docx import Document
root=Path(__file__).resolve().parents[1];out=root/'paperwork/generated'
manifest=json.loads((out/'manifest.json').read_text())
assert all(len(manifest['languages'][lang]['files'])==5 for lang in ['zh','en'])
student=Document(out/'WS1_student.docx');answers=Document(out/'WS1_answers.docx');template=Document(root/'paperwork/templates/WS1_reviewed.docx')
assert [p.text for p in student.paragraphs]==[p.text for p in template.paragraphs]
ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
def images(file):
 with ZipFile(file) as z:return sorted(z.read(n) for n in z.namelist() if n.startswith('word/media/'))
assert images(out/'WS1_student.docx')==images(out/'WS1_answers.docx')==images(root/'paperwork/templates/WS1_reviewed.docx')
assert len(student.inline_shapes)==len(answers.inline_shapes)==5
text=lambda d:'\n'.join(p.text for p in d.paragraphs)
source=text(student);key=text(answers)
assert '紅色粗體為重點詞彙' not in source+key and '本工作紙毋須操作虛擬實驗室' not in source+key
questions=[p.text for p in student.paragraphs if re.match(r'^\d+\. ',p.text)]
assert len(questions)==8
assert '清澈' not in source+key and '油層消失' in source
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

# English material is a genuine translation, including all five figures.
for stem in ['student','answers']:
 en=Document(out/f'WS1_{stem}_en.docx')
 all_paragraphs=list(en.paragraphs)
 for table in en.tables:
  for row in table.rows:
   for cell in row.cells:all_paragraphs.extend(cell.paragraphs)
 en_text='\n'.join(p.text for p in all_paragraphs)
 assert 'Red bold terms' not in en_text and 'You do not need to operate' not in en_text
 assert 'clear solution' not in en_text and 'oil layer disappears' in en_text
 assert not re.search(r'[\u3400-\u9fff]',en_text), 'Untranslated Chinese in English worksheet'
 assert 'Part 3 | Integrated explanation' in en_text and '8. Using the experimental results and topic notes' in en_text
 assert len(en.inline_shapes)==5
 assert images(out/f'WS1_{stem}_en.docx')!=images(out/f'WS1_{stem}.docx')
 for p in all_paragraphs:
  for r in p.runs:
   if r.text.strip():assert (r.font.size or p.style.font.size or en.styles['Normal'].font.size).pt>=11
 # Translation must retain the reviewed conceptual emphasis, alongside the
 # separate blue answer marks. In particular, both MC options get equal emphasis.
 red=lambda p:[r.text.lower() for r in p.runs if str(r.font.color.rgb)=='B7312C' and r.bold]
 notes=[p for p in en.paragraphs if p.text.startswith('In this model,')]
 assert red(notes[0])==['bile','bile','emulsifies','small droplets','total surface area','lipase','physical digestion']
 assert red(notes[1])==['pancreatic juice','lipase','lipase','chemical digestion','triglycerides','glycerol','fatty-acid','lipase','protein','denature']
 control=next(p for p in en.paragraphs if p.text.startswith('Does this experiment'))
 assert red(control)==['control group']
 area=next(p for p in en.paragraphs if p.text.startswith('X disperses'))
 assert red(area)==['small droplets','total surface area']
 if stem=='student':
  for label in ['A. Appearance','B. Disappearance']:
   assert red(next(p for p in en.paragraphs if p.text.startswith(label)))==['glycerol','fatty acids']
 en_pdf=fitz.open(out/f'WS1_{stem}_en.pdf');assert len(en_pdf)==4
 red_spans=[s for b in en_pdf[0].get_text('dict')['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans'] if s['color']==0xB7312C]
 assert red_spans and all(s['flags'] & 16 for s in red_spans), 'English PDF lost red bold concepts'
 assert all(any(term in s['text'].lower() for s in red_spans) for term in ['bile','lipase','protein','denature'])
 first_lines=[''.join(s['text'] for s in line['spans']) for b in en_pdf[0].get_text('dict')['blocks'] if 'lines' in b for line in b['lines']]
 assert any(all(x in t for x in ['Name:','Class:','No.:']) for t in first_lines)
 for page in en_pdf:
  assert len(page.get_text().strip())>80 and page.get_images()
  assert not re.search(r'[\u3400-\u9fff]',page.get_text())
 for n in range(1,9):assert any(f'{n}.' in page.get_text() for page in en_pdf)
 en_pdf.close()
key_en=Document(out/'WS1_answers_en.docx')
for row in key_en.tables[0].rows[1:]:assert any(r.underline for p in row.cells[1].paragraphs for r in p.runs), 'Missing English answer markings'
guide_en=fitz.open(out/'WS1_D_teacher_guide_en.pdf');en_guide_text='\n'.join(p.get_text() for p in guide_en)
assert 'Teacher guide, mapping and marking' in en_guide_text and 'Integrated explanation: 8 marks' in en_guide_text
assert not re.search(r'[\u3400-\u9fff]',en_guide_text)
print('PASS: English PDF/Word versions have English text and diagram labels, translated answer markings, 4-page worksheets and one-line identity fields.')
print('PASS: English student and answer PDFs/Word retain red bold conceptual keywords and distinct blue answer marks.')

# The first oil-water figure has readable leader-line layer labels in both languages.
for file,labels in [("paperwork/figures/03_scenario_zh.svg",["油層","水層"]),("paperwork/diagrams_en.py",["Oil layer","Water layer"])]:
 assert all(label in (root/file).read_text() for label in labels)
