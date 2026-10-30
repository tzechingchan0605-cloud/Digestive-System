"""Validate user-facing staged worksheets, not just their generation metadata."""
from pathlib import Path
from zipfile import ZipFile
import re,json,fitz
from docx import Document
root=Path(__file__).resolve().parents[1];out=root/'paperwork/generated'
rules=json.loads((root/'paperwork/rubric.json').read_text())
assert rules['vlMaximum']==31 and rules['worksheetMaximum']==18
assert len(rules['reflectionPoints'])==8
for lang in ['','_en']:
 for stem in ['student','answers']:
  name=f'WS1_{stem}{lang}';doc=Document(out/(name+'.docx'));pdf=fitz.open(out/(name+'.pdf'))
  assert len(pdf)==4,(name,len(pdf))
  paragraphs=list(doc.paragraphs)
  for table in doc.tables:
   for row in table.rows:
    for cell in row.cells:paragraphs.extend(cell.paragraphs)
  text='\n'.join(p.text for p in paragraphs)
  assert len([p for p in doc.paragraphs if re.match(r'^\d+\. ',p.text)])==8
  assert '對照組' not in text and 'clear solution' not in text and '清澈' not in text
  assert len(doc.inline_shapes)==6
  for p in paragraphs:
   for r in p.runs:
    if r.text.strip():assert (r.font.size or p.style.font.size or doc.styles['Normal'].font.size).pt>=11
  native=[''.join(s['text'] for s in l['spans']) for b in pdf[0].get_text('dict')['blocks'] if 'lines'in b for l in b['lines']]
  assert any(all(label in l for label in (['Name:','Class:','No.:'] if lang else ['姓名：','班別：','學號：'])) for l in native)
  # Identities occur only on the last learning-points page, in both student/key.
  for i,p in enumerate(pdf):
   t=p.get_text();assert len(t.strip())>100,(name,i,'orphan')
   assert not (i<3 and any(w in t for w in (['pancreatic','bile','lipase'] if lang else ['膽汁','胰液','脂肪酶'])))
   if lang:assert not re.search(r'[\u3400-\u9fff]',t)
   assert abs(p.rect.width-595)<2 and abs(p.rect.height-842)<2
  last=pdf[-1].get_text();assert all(w in last for w in (['bile','pancreatic','lipase'] if lang else ['膽汁','胰液','脂肪酶']))
  assert any(str(r.font.color.rgb)=='B7312C' and r.bold for p in doc.paragraphs for r in p.runs)
  if stem=='student':
   assert not any(p.text.startswith('☑') for p in doc.paragraphs)
   borders=[b for p in doc.paragraphs for b in p._p.xpath('./w:pPr/w:pBdr/w:bottom')]
   assert len(borders)==5
   rules=[item for drawing in pdf[-1].get_drawings() for item in drawing['items'] if item[0]=='l' and abs(item[1].y-item[2].y)<1 and abs(item[1].x-item[2].x)>450]
   assert len(rules)>=5, 'Printed response lines must not merge into a single border'
   for b in borders:assert b.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}color')=='333333'
  else:
   assert sum(p.text.startswith('☑') for p in doc.paragraphs)==8 # Three premises + five analyses.
   assert any(str(r.font.color.rgb)=='145DA0' for p in doc.paragraphs for r in p.runs)
  print('PASS:',name,'4 A4 pages, 8 tasks, 6 diagrams, >=11pt, same-line identity, final-only identity reveal, distinct key.')
 for stem in ['D_teacher_guide']:
  pdf=fitz.open(out/f'WS1_{stem}{lang}.pdf');t='\n'.join(p.get_text() for p in pdf)
  assert 'staged-1' in t and '31' in t and '18' in t
  if lang:assert not re.search(r'[\u3400-\u9fff]',t)
print('PASS: bilingual teacher guides, new maxima and dark response lines.')
