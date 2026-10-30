"""Validate user-facing staged worksheets, not just their generation metadata."""
from pathlib import Path
from zipfile import ZipFile
import re,json,fitz
from docx import Document
root=Path(__file__).resolve().parents[1];out=root/'paperwork/generated'
rules=json.loads((root/'paperwork/rubric.json').read_text())
assert rules['worksheetDesignVersion']=='deductive-5'
assert rules['vlMaximum']==32 and rules['worksheetMaximum']==19
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
  assert '主要外觀' not in text and 'Appearance of X after' not in text
  if not lang:
   for approved in ['你認為此實驗需要對照組嗎？如需要，你會如何設計比較裝置？','消化液 X 使溶液變得（混濁 ／ 清澈）。','消化液 X 先把大油滴分散成小油滴，令總表面積 （增加 ／ 減少），有助消化液 Y 作用。','我們只觀察油層、混濁或清澈的外觀，沒有檢測消化產物。以下哪個說法最恰當？','A. 外觀可提供消化液作用的線索，但不能單獨證明已產生甘油和脂肪酸。','B. 只要混合物清澈，就已完全證明脂質分解成甘油和脂肪酸。','被煮沸後失去作用的消化液是（消化液 X ／ 消化液 Y）。']:
    assert approved in text, approved
  assert len(doc.inline_shapes)==6
  for row,correct in zip(doc.tables[0].rows[1:],[1,1,5]):
   choices=row.cells[1].text
   assert choices.count('□')+choices.count('☑')==7
   assert choices.count('☑')==(correct if stem=='answers' else 0)
  reference=Document(root/f'paperwork/templates/WS1_topic_notes_{"en" if lang else "zh"}.docx')
  topic=next(i for i,p in enumerate(doc.paragraphs) if p.text in ['課題需知','Topic notes'])
  expected_text=[p.text for p in reference.paragraphs]
  expected_text=[t.replace('本教學模型設定消化液 X 是膽汁。','').replace('本教學模型設定消化液 Y 是胰液，','胰液').replace('In this model, X is bile. ','').replace('In this model, Y is pancreatic juice','Pancreatic juice') for t in expected_text]
  assert [p.text for p in doc.paragraphs[topic:topic+len(reference.paragraphs)]]==expected_text
  first_page=pdf[0].get_text()
  assert '消化液 X 是' not in first_page and '消化液 Y 是' not in first_page
  assert 'X is bile' not in first_page and 'Y is pancreatic' not in first_page
  for actual,expected in zip(list(doc.inline_shapes)[:1],list(reference.inline_shapes)[:1]):
   embed=lambda shape:shape._inline.xpath('.//a:blip')[0].get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
   assert doc.part.related_parts[embed(actual)].blob==reference.part.related_parts[embed(expected)].blob
  assert doc.core_properties.subject.startswith('deductive-5')
  for p in paragraphs:
   for r in p.runs:
    if r.text.strip():assert (r.font.size or p.style.font.size or doc.styles['Normal'].font.size).pt>=11
  native=[''.join(s['text'] for s in l['spans']) for b in pdf[0].get_text('dict')['blocks'] if 'lines'in b for l in b['lines']]
  assert any(all(label in l for label in (['Name:','Class:','No.:'] if lang else ['姓名：','班別：','學號：'])) for l in native)
  # The deductive paper condition starts with concepts; the VL reveal stays at the end.
  for i,p in enumerate(pdf):
   t=p.get_text();assert len(t.strip())>100,(name,i,'orphan')
   if lang:assert not re.search(r'[\u3400-\u9fff]',t)
   assert abs(p.rect.width-595)<2 and abs(p.rect.height-842)<2
  first=pdf[0].get_text();assert all(w in first for w in (['bile','pancreatic','lipase'] if lang else ['膽汁','胰液','脂肪酶']))
  assert any(str(r.font.color.rgb)=='B7312C' and r.bold for p in doc.paragraphs for r in p.runs)
  if stem=='student':
   assert not any(p.text.startswith('☑') for p in doc.paragraphs)
   borders=[b for p in doc.paragraphs for b in p._p.xpath('./w:pPr/w:pBdr/w:bottom')]
   assert len(borders)==7
   rules=[item for drawing in pdf[-1].get_drawings() for item in drawing['items'] if item[0]=='l' and abs(item[1].y-item[2].y)<1 and abs(item[1].x-item[2].x)>450]
   assert len(rules)>=5, 'Printed response lines must not merge into a single border'
   for b in borders:assert b.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}color')=='333333'
  else:
   assert sum(p.text.startswith('☑') for p in doc.paragraphs)==3 # Premises; other keys use inline/open marking.
   assert any(str(r.font.color.rgb)=='145DA0' for p in doc.paragraphs for r in p.runs)
  print('PASS:',name,'4 A4 pages, 8 tasks, 6 diagrams, >=11pt, same-line identity, concept-first deductive flow, distinct key.')
 for stem in ['D_teacher_guide']:
  pdf=fitz.open(out/f'WS1_{stem}{lang}.pdf');t='\n'.join(p.get_text() for p in pdf)
  assert 'staged-4' in t and '32' in t and '19' in t
  if lang:assert not re.search(r'[\u3400-\u9fff]',t)
print('PASS: bilingual teacher guides, new maxima and dark response lines.')

# Glycerol retains its physical size before and after hydrolysis.
from lxml import etree
for lang,width in [("zh",73),("en",108)]:
 svg=etree.parse(str(root/f"paperwork/figures/02_hydrolysis_equal_{lang}.svg"))
 blocks=[n for n in svg.xpath("//*[local-name()='rect']") if n.get("fill")=="#dcedee"]
 assert len(blocks)==2 and all(float(n.get("width"))==width and float(n.get("height"))==118 for n in blocks)
