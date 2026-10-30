"""Four-page bilingual worksheets and teacher guide for staged-1.
Question choices and hints match the VL. The paper condition is deductive:
concepts first, followed by application to the three experiments.
"""
from pathlib import Path
import re,json,subprocess,ast
from copy import deepcopy
from io import BytesIO
from docx import Document
from docx.shared import Cm,Pt,RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from lxml import html
from diagrams_en import rect,text,ROOT,TEAL,RED,LINE,OIL
RULES=json.loads((ROOT/'paperwork/rubric.json').read_text())

def diagrams(out,lang):
 out.mkdir(exist_ok=True)
 zh=lang=='zh';t=lambda z,e:z if zh else e
 def save(name,h,b):
  (out/(name+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="900" height="{h}"><rect width="900" height="{h}" fill="white"/><g font-family="Noto Sans CJK TC,Arial,sans-serif">{b}</g></svg>')
 b=rect(5,5,890,170)+text(200,39,t('未知消化液 X','Unknown juice X'),24,TEAL,'bold')+text(200,89,t('或','or'),23)+text(200,139,t('未知消化液 Y','Unknown juice Y'),24,TEAL,'bold')
 b+='<path d="M370 87 H510 M494 77 L510 87 L494 97" fill="none" stroke="#25666a" stroke-width="4"/>'
 b+=text(442,56,t('加入','Add'),23)+text(590,32,t('油＋水','Oil + water'),23,TEAL,'bold')
 b+=f'<path d="M560 44 V133 Q560 157 590 157 Q620 157 620 133 V44" fill="#eaf3f3" stroke="{LINE}" stroke-width="3"/><path d="M562 60 H618 V82 H562Z" fill="{OIL}"/>'
 b+='<path d="M615 70 H655 M615 116 H655" stroke="#20383c" stroke-width="2"/>'+text(735,77,t('油層','Oil layer'),24)+text(735,124,t('水層','Water layer'),24)
 save('scenario',180,b)
 def tube(cx,y,kind):
  b=f'<path d="M{cx-35} {y+10} H{cx+35} V{y+115} Q{cx+35} {y+140} {cx} {y+140} Q{cx-35} {y+140} {cx-35} {y+115}Z" fill="'+('#ded5a9' if kind=='cloudy' else '#e5ece4')+'"/>'
  if kind=='thin':b+=f'<path d="M{cx-35} {y+10} H{cx+35} V{y+20} H{cx-35}Z" fill="{OIL}"/>'
  if kind=='cloudy':
   for x in [-18,0,18]:
    for yy in range(25,110,18):b+=f'<circle cx="{cx+x}" cy="{y+yy}" r="3" fill="#a28d4a"/>'
  return b+f'<path d="M{cx-35} {y-5} V{y+115} Q{cx-35} {y+140} {cx} {y+140} Q{cx+35} {y+140} {cx+35} {y+115} V{y-5}" fill="none" stroke="{LINE}" stroke-width="4"/>'
 def panel(name,rows,h=240):
  b='';w=900/len(rows)
  for i,(title,sub,kind,lines) in enumerate(rows):
   cx=w*(i+.5);b+=rect(i*w+5,5,w-10,h-10)+text(cx,35,title,23,TEAL,'bold')+text(cx,70,sub,22)+'<g transform="translate(0,25) scale(1,.72)">'+tube(cx,85,kind)+'</g>'
   for j,line in enumerate(lines):b+=text(cx,220+j*29,line,22,RED,'bold')
  save(name,h,b)
 panel('main',[(t('X 組','Set X'),t('加入 2 mL X','Add 2 mL X'),'cloudy',[t('混濁乳狀液','Cloudy emulsion')]),(t('Y 組','Set Y'),t('加入 2 mL Y','Add 2 mL Y'),'thin',[t('油層變薄，仍有分層','Thinner oil layer; two layers remain')])])
 panel('sequence',[(t('先加 X，再加 Y','X first, then Y'),t('X 1 mL → Y 1 mL','1 mL X → 1 mL Y'),'reduced',[t('混濁程度減低','Less cloudy'),t('沒有明顯油層','No obvious oil layer')]),(t('先加水，再加 Y','Water first, then Y'),t('水 1 mL → Y 1 mL','1 mL water → 1 mL Y'),'thin',[t('油層變薄','Thinner oil layer'),t('仍有油水分層','Two layers remain')])],270)
 # Show the actual unboiled baseline alongside both heat treatments.
 b=''
 for i,(top,bottom,kind) in enumerate([(t('未煮沸 X','Unboiled X'),t('＋未煮沸 Y','+ unboiled Y'),'reduced'),(t('煮沸 X','Boiled X'),t('＋未煮沸 Y','+ unboiled Y'),'reduced'),(t('未煮沸 X','Unboiled X'),t('＋煮沸 Y','+ boiled Y'),'cloudy')]):
  cx=150+300*i;b+=rect(i*300+5,5,290,277)+text(cx,34,top,23,TEAL,'bold')+text(cx,64,bottom,23,TEAL,'bold')+text(cx,94,t('各 1 mL，37°C','1 mL each, 37°C'),22)
  b+='<g transform="translate(0,25) scale(1,.72)">'+tube(cx,115,kind)+'</g>'
  b+=text(cx,240,t('混濁乳狀液','Cloudy emulsion') if kind=='cloudy' else t('混濁程度減低','Less cloudy'),22,RED,'bold')
  if kind!='cloudy':b+=text(cx,269,t('沒有明顯油層','No obvious oil layer'),22,RED,'bold')
 save('heat',288,b)
 # Compact conceptual models, only displayed in the final learning points.
 b=rect(5,5,890,170)+text(450,34,t('膽汁：物理乳化','Bile: physical emulsification'),24,RED,'bold')
 b+=f'<circle cx="170" cy="88" r="31" fill="{OIL}"/>'
 for x in [686,718,750]:
  for y in [66,94,122]:b+=f'<circle cx="{x}" cy="{y}" r="11" fill="{OIL}"/>'
 b+='<path d="M300 87 H575 M560 77 L575 87 L560 97" stroke="#25666a" stroke-width="3" fill="none"/>'+text(450,76,t('大油滴 → 小油滴','Large → small oil droplets'),24)+text(450,155,t('脂質分子不變；總表面積增加','Lipid molecules unchanged; total surface area increases'),24,TEAL,'bold')
 save('01_emulsification',180,b)
 b=rect(5,5,890,170)+text(450,35,t('脂肪酶：催化化學消化','Lipase: catalyses chemical digestion'),24,RED,'bold')
 b+=text(170,94,t('脂質＋水','Lipid + water'),24)+text(725,80,t('甘油','Glycerol'),24)+text(725,119,t('脂肪酸','Fatty acids'),24)
 b+='<path d="M310 90 H580 M565 80 L580 90 L565 100" stroke="#25666a" stroke-width="3" fill="none"/>'+text(450,155,t('形成較小分子，有助吸收','Smaller molecules form for absorption'),24,TEAL,'bold')
 save('02_hydrolysis',180,b)
 for stem,source in [('scenario','03_scenario_reference'),('02_hydrolysis','02_hydrolysis_equal')]:
  (out/(stem+'.svg')).write_text((ROOT/f'paperwork/figures/{source}_{lang}.svg').read_text())
 subprocess.run(['node',str(ROOT/'paperwork/render_diagrams.cjs'),str(out)],check=True,timeout=120)
 return out

def create(out,tmp):
 vl=html.fromstring((ROOT/'index.html').read_text())
 command="const fs=require('fs'),vm=require('vm');const c={window:{}};vm.runInNewContext(fs.readFileSync('language-dictionary.js','utf8'),c);process.stdout.write(JSON.stringify(c.window.VL1_TRANSLATIONS.texts))"
 dictionary=json.loads(subprocess.check_output(['node','-e',command],cwd=ROOT,text=True))
 variable_names=ast.literal_eval(re.search(r'const variableNames = (\[.*?\]);',(ROOT/'app.js').read_text()).group(1))
 assumptions=['各組起始油量及水量相同，加入液體的總量也相同。','X 組可加入較多總液量，以便與 Y 組比較。','各組使用相同搖勻方式。','各組在相同反應時間後觀察。']
 hint=vl.xpath('//*[@class="scaffold-hint assumption-reminder"]')[0].text_content()
 question=RULES['worksheetQuestion']
 for lang in ['zh','en']:
  zh=lang=='zh';suffix='' if zh else '_en';t=lambda z,e:z if zh else e
  tr=lambda z:z if zh else re.sub(r'\s*\([\u3400-\u9fff]+\)','',dictionary[z])
  figs=diagrams(tmp/lang,lang)
  for answers in [False,True]:
   d=Document();s=d.sections[0];s.page_width=Cm(21);s.page_height=Cm(29.7);s.top_margin=s.bottom_margin=Cm(1.4);s.left_margin=s.right_margin=Cm(1.5)
   for style_name,size in [('Normal',12),('Heading 1',15),('Heading 2',13)]:
    st=d.styles[style_name];st.font.name='Noto Sans CJK TC' if zh else 'Arial';st.font.size=Pt(size);st._element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'),'Noto Sans CJK TC');st.paragraph_format.line_spacing=Pt(19 if size==12 else size*1.5);st.paragraph_format.space_before=Pt(0 if size==12 else 4);st.paragraph_format.space_after=Pt(4)
   for name in ['Heading 1','Heading 2']:d.styles[name].font.color.rgb=RGBColor.from_string('25666A')
   s.header_distance=s.footer_distance=Cm(.65)
   h=s.header.paragraphs[0];h.text=t('生物科｜脂質消化的概念與應用','Biology | Lipid digestion: concepts and applications')+(t('｜參考答案',' | ANSWERS') if answers else '');h.runs[0].font.size=Pt(11)
   f=s.footer.paragraphs[0];f.alignment=2;r=f.add_run(t('工作紙一｜','Worksheet 1 | '));r.font.size=Pt(11);fld=OxmlElement('w:fldSimple');fld.set(qn('w:instr'),'PAGE');f._p.append(fld)
   def p(text='',style=None,small=False,answer=False):
    para=d.add_paragraph(style=style);r=para.add_run(text);r.font.size=Pt(11 if small else 12) if not style else r.font.size
    if small:r.font.color.rgb=RGBColor.from_string('658087')
    if answer:r.font.color.rgb=RGBColor.from_string('145DA0');r.bold=True
    return para
   def title(text,first=False):
    para=p(text,'Heading 1');para.paragraph_format.page_break_before=not first
   def pic(name,width=18):
    d.add_picture(str(figs/(name+'.png')),width=Cm(width));para=d.paragraphs[-1];para.paragraph_format.line_spacing=1;para.paragraph_format.space_after=Pt(3)
   def choice(id,number):
    label=t({'q1':'X 組一小時後的主要外觀','qY':'Y 組一小時後的主要外觀','q3':'X 如何有助其後 Y 的作用？','limitations':'外觀能告訴我們甚麼？','q2':'煮沸後失去作用的消化液'}[id],{'q1':'Appearance of X after one hour','qY':'Appearance of Y after one hour','q3':'How does X help Y act?','limitations':'What does appearance tell us?','q2':'Which juice loses its action after boiling?'}[id])
    p(f'{number}. '+label,'Heading 2')
    if id=='q3':p(t('X 先把大油滴分散成小油滴，令同量脂質的總表面積：','X disperses large oil droplets into smaller droplets. The total surface area of the same amount of lipid:'))
    select=vl.get_element_by_id(id)
    for opt in select.xpath('./option[@value!=""]'):
     val=opt.get('value');correct=val=={'q1':'cloudy','qY':'thin-oil','q3':'increase','limitations':'indirect','q2':'Y'}[id]
     p(('☑ ' if answers and correct else '□ ')+tr(opt.text_content()),answer=answers and correct)
   title(t('工作紙一：脂質的消化與公平比較','Worksheet 1: Lipid Digestion and Fair Comparisons'),True)
   p(t('姓名：________________　班別：________　學號：________','Name: ________________    Class: ________    No.: ________'))
   p(t('情境：脂質需要消化，才能被吸收。加入消化液 X 或消化液 Y 後會怎樣？','Context: lipids need digestion before absorption. What happens after adding digestive juice X or Y?'))
   pic('scenario',16);p(t('部分 1｜研究情境與公平比較','Part 1 | Context and fair comparisons'),'Heading 2')
   p(t('研究員在相同油水混合物分別加入 2 mL X 或 2 mL Y；在 37°C 同樣搖勻，比較一小時後的外觀。','Researchers added 2 mL X or 2 mL Y to identical oil–water mixtures, shook them identically at 37°C, and compared appearances after one hour.'))
   p(t('1. 辨識實驗變量','1. Identify the variables'),'Heading 2');p(t('在每列剔選適當的因素；每類可選多於一項。','Tick the appropriate factors in each row. You may choose more than one.'))
   table=d.add_table(rows=1,cols=2);table.style='Table Grid';table.autofit=False;table.columns[0].width=Cm(4);table.columns[1].width=Cm(14);table.rows[0].cells[0].text=t('變量類別','Variable type');table.rows[0].cells[1].text=t('可選因素','Factors to choose from')
   for group,correct in [('獨立變量',['消化液組合']),('因變量',['混合物外觀']),('控制變量',variable_names[:5])]:
    cells=table.add_row().cells;cells[0].width=Cm(4);cells[1].width=Cm(14);cells[0].text=tr(group);cells[0].paragraphs[0].runs[0].bold=True;cells[0].paragraphs[0].runs[0].font.color.rgb=RGBColor.from_string('B7312C');definition={'獨立變量':('主動改變的因素','Factor changed'),'因變量':('量度或觀察的結果','Outcome measured'),'控制變量':('保持不變的因素','Kept the same')}[group];cells[0].paragraphs[0].add_run('\n'+t(*definition));para=cells[1].paragraphs[0]
    for i,word in enumerate(variable_names):
     r=para.add_run(('\n' if i and ((zh and i==3) or (not zh and i%2==0)) else '  ' if i else '')+('☑' if answers and word in correct else '□')+'\u00a0'+tr(word));r.font.size=Pt(12)
     if answers and word in correct:r.bold=True;r.underline=True;r.font.color.rgb=RGBColor.from_string('145DA0')
    for cell in cells:
     for para in cell.paragraphs:para.paragraph_format.line_spacing=1.2;para.paragraph_format.space_after=Pt(3)
   p(t('2. 選出公平比較所需的前提（可選多於一項）','2. Select the assumptions for a fair comparison (choose all that apply)'),'Heading 2')
   p('（'+hint+'）' if zh else '('+tr(hint)+')',small=True)
   for i,a in enumerate(assumptions):p(('☑ ' if answers and i!=1 else '□ ')+tr(a),answer=answers and i!=1)
   control=p(t('3. 探究的對照組','3. Design a control group'),'Heading 2');control.paragraph_format.page_break_before=True
   p(t('你認為此實驗需要對照組嗎？如需要，你會如何設計比較裝置？','Does this experiment need a control group? If so, how would you design the comparison setup?'))
   control_hint=vl.get_element_by_id('controlPlan').getprevious().text_content();p(control_hint if zh else tr(control_hint),small=True)
   if answers:p(t('可另設相同油水混合物加2 mL水作比較基準，與X或Y組比較；保持起始油水量、加液量、溫度、時間及搖勻方式相同。','Use an identical oil–water mixture with 2 mL water as a baseline, compared with X or Y; keep initial amounts, volume, temperature, time and shaking equal.'),answer=True)
   else:
    for _ in range(2):p('________________________________________________________________').paragraph_format.line_spacing=Pt(26)
   p(t('部分 2.1｜分析 X、Y 的個別作用','Part 2.1 | Analyse the individual actions of X and Y'),'Heading 2')
   p(t('以下為搖勻後一小時的模擬結果。','Model results one hour after shaking.'));pic('main',16)
   p(t('4. 消化液 X 有甚麼作用？','4. What does digestive juice X do?'),'Heading 2')
   def fill_sentence(z,e,correct):
    para=p();sentence=t(z,e)
    for part in re.split('('+re.escape(correct[0])+'|'+re.escape(correct[1])+')',sentence):
     r=para.add_run(part);r.font.size=Pt(12)
     if answers and part in correct:r.bold=True;r.underline=True;r.font.color.rgb=RGBColor.from_string('145DA0')
   fill_sentence('消化液 X 最主要使脂質變成 （混濁乳狀液 ／ 清澈溶液）。','Digestive juice X mainly causes lipids to form a (cloudy emulsion / clear solution).',('混濁乳狀液','cloudy emulsion'))
   p(t('部分 2.2｜分析 X 如何有助 Y 作用','Part 2.2 | Analyse how X helps Y act'),'Heading 2')
   p(t('研究員用兩支新試管，先加1 mL X或水並同樣搖勻，再各加1 mL Y，比較一小時後外觀。','Two fresh tubes received 1 mL X or water and identical shaking, then 1 mL Y each. Results show one hour later.'));pic('sequence',16)
   p(t('5. 消化液 X 如何有助消化液 Y 作用？','5. How does digestive juice X help Y act?'),'Heading 2')
   fill_sentence('消化液 X 先把大油滴分散成小油滴，令總表面積 （增加 ／ 減少），有助消化液 Y 作用。','X disperses large oil droplets into small droplets. Their total surface area (increases / decreases), helping Y act.',('增加','increases'))
   q=p(t('6. 本實驗能告訴我們甚麼？','6. What can this experiment tell us?'),'Heading 2');q.paragraph_format.page_break_before=True
   p(t('我們只觀察油層、混濁或清澈的外觀，沒有檢測消化產物。以下哪個說法最恰當？','We observed only the oil layer, cloudiness or clarity, without testing digestion products. Which statement is most appropriate?'))
   p(t('A. 外觀可提供消化液作用的線索，但不能單獨證明已產生甘油和脂肪酸。','A. Appearance gives clues about the juices, but alone cannot prove that glycerol and fatty acids have formed.'),answer=answers)
   p(t('B. 只要混合物清澈，就已完全證明脂質分解成甘油和脂肪酸。','B. A clear mixture fully proves that lipids have broken down into glycerol and fatty acids.'))
   p(t('部分 2.3｜加熱對消化液作用的影響','Part 2.3 | Effects of heating the juices'),'Heading 2')
   p(t('以未煮沸X後加Y組為比較基準。每次只煮沸其中一種，冷卻至37°C後按同樣次序各加1 mL X、Y，比較一小時後結果。','Use unboiled X then Y as the baseline. Boil one juice, cool to 37°C, then add 1 mL each of X and Y in the same order. Compare after one hour.'));pic('heat',18);p(t('7. 延伸結論','7. Extension conclusion'),'Heading 2')
   fill_sentence('被煮沸後失去作用的消化液是（消化液 X ／ 消化液 Y）。','The juice that loses its action after boiling is (digestive juice X / digestive juice Y).',('消化液 Y','digestive juice Y'))
   title(t('學習重點｜課題需知','Learning points | Topic notes'))
   for z,e in [
    ('X 是膽汁，由肝臟製造並儲存於膽囊，不含消化酶。它透過物理消化把大油滴乳化成小油滴，脂質分子不變；同量脂質的總表面積增加，有助脂肪酶接觸脂質。','X is bile, made in the liver and stored in the gall bladder, containing no digestive enzymes. It physically emulsifies large oil droplets into smaller droplets without changing lipid molecules. The greater total surface area helps lipase contact lipids.'),
    ('Y 是胰液，含有脂肪酶。脂肪酶催化化學消化，按本課完全水解簡化模型，把脂質分解為甘油和脂肪酸。脂肪酶是蛋白質；煮沸使其變性失去功能，冷卻後不恢復。本模型中，煮沸膽汁仍保留乳化作用。','Y is pancreatic juice containing lipase. Lipase catalyses chemical digestion, forming glycerol and fatty acids in this course’s simplified complete-hydrolysis model. Lipase is a protein: boiling denatures it and stops its action, which cooling does not restore. Bile retains emulsifying action after boiling in this model.')]:
    para=p();whole=t(z,e);terms='膽汁|胰液|脂肪酶|乳化|物理消化|總表面積|化學消化|甘油|脂肪酸|蛋白質|變性' if zh else r'\bbile\b|pancreatic juice|lipase|emulsifies|physical|total surface area|chemical digestion|glycerol|fatty acids|protein|denatures'
    for part in re.split('('+terms+')',whole,flags=re.I):
     r=para.add_run(part);r.font.size=Pt(12)
     if re.fullmatch(terms,part,re.I):r.bold=True;r.font.color.rgb=RGBColor.from_string('B7312C')
   pic('01_emulsification',18);pic('02_hydrolysis',18)
   p(t('部分 3｜整合解釋','Part 3 | Integrated explanation'),'Heading 2')
   p('8. '+t(question,'Using the experimental results and topic notes, explain how bile and lipase in pancreatic juice work together to help digest lipids, and how boiling affects their actions.'))
   if answers:p(t(RULES['answer'],'Bile physically emulsifies large droplets into small droplets without changing lipid molecules. The greater total surface area helps lipase act. Lipase in pancreatic juice catalyses chemical digestion into glycerol and fatty acids in this model. Lipase is a protein; boiling denatures it and stops its catalytic action even after cooling. Bile retains its emulsifying action after boiling.'),answer=True)
   else:
    for _ in range(5):
     para=p();para.paragraph_format.line_spacing=Pt(26);para.paragraph_format.space_after=Pt(0);pr=para._p.get_or_add_pPr();border=OxmlElement('w:pBdr');b=OxmlElement('w:bottom');b.set(qn('w:val'),'single');b.set(qn('w:color'),'333333');b.set(qn('w:sz'),'8');border.append(b);between=OxmlElement('w:between');between.set(qn('w:val'),'single');between.set(qn('w:color'),'333333');between.set(qn('w:sz'),'8');border.append(between);pr.append(border)
   # Paper condition: move the complete concept block before the scenarios.
   # Keep the remaining paper tasks and experimental conditions aligned with the VL.
   ps=list(d.paragraphs)
   start=next(i for i,para in enumerate(ps) if para.text==t('學習重點｜課題需知','Learning points | Topic notes'))
   end=next(i for i in range(start+1,len(ps)) if ps[i].text==t('部分 3｜整合解釋','Part 3 | Integrated explanation'))
   # The uploaded reference is authoritative for this section: copy its
   # complete paragraphs, red runs and original image bytes without rewriting.
   for para in ps[start:end]:para._p.getparent().remove(para._p)
   reference=Document(ROOT/f'paperwork/templates/WS1_topic_notes_{lang}.docx')
   # The supplied Word uses custom numeric style IDs for its teal headings.
   for para in reference.paragraphs:
    if para.style.style_id not in {style.style_id for style in d.styles}:
     style=deepcopy(para.style.element);style.find(qn('w:name')).set(qn('w:val'),'Reference '+para.style.name);d.styles.element.append(style)
   # Explicit latest exception to the reference: teach the substances without
   # identifying the unknown X/Y in the paper introduction.
   for para in reference.paragraphs:
    if para.text.startswith('本教學模型設定消化液 X 是膽汁。'):
     remove='本教學模型設定消化液 X 是膽汁。'
    elif para.text.startswith('本教學模型設定消化液 Y 是胰液'):
     remove='本教學模型設定消化液 Y 是'
    elif para.text.startswith('In this model, X is bile.'):
     remove='In this model, X is bile. '
    elif para.text.startswith('In this model, Y is pancreatic juice'):
     remove='In this model, Y is '
    else:continue
    remaining=len(remove)
    for run in para.runs:
     take=min(remaining,len(run.text));run.text=run.text[take:];remaining-=take
     if not remaining:break
    if zh and para.text.startswith('胰液，'):
     seen=False
     for run in para.runs:
      if run.text=='胰液':seen=True
      elif seen and run.text.startswith('，'):run.text=run.text[1:];break
    if not zh and para.text.startswith('pancreatic'):
     next(run for run in para.runs if run.text).text='Pancreatic juice'
   anchor=ps[1]._p;note_image=0
   for para in reference.paragraphs:
    node=deepcopy(para._p)
    for blip in node.xpath('.//a:blip'):
     oldrid=blip.get(qn('r:embed'))
     note_image+=1
     blob=(figs/'02_hydrolysis.png').read_bytes() if note_image==2 else reference.part.related_parts[oldrid].blob
     rid,_=d.part.get_or_add_image(BytesIO(blob))
     blip.set(qn('r:embed'),rid)
    anchor.addnext(node);anchor=node
   intro=p(t('請先閱讀「課題需知」，再運用概念分析各組結果。','Read the topic notes first, then apply the concepts to analyse the results.'))
   intro._p.getparent().remove(intro._p);ps[1]._p.addnext(intro._p)
   context=next(para for para in d.paragraphs if para.text.startswith(t('情境：','Context:')))
   context.paragraph_format.page_break_before=True
   for para in d.paragraphs:
    if para.text==t('部分 1｜主探究結果及分析','Part 1 | Main results and analysis'):
     para.text=t('部分 1｜運用概念分析 X、Y 的個別作用','Part 1 | Apply concepts to the individual actions of X and Y')
    elif para.text==t('下一步：X 形成乳狀液，會如何影響其後 Y 的作用？','Next: how might the emulsion formed by X affect the later action of Y?'):
     para.text=t('運用乳化與表面積概念，分析 X 如何幫助 Y。','Apply emulsification and surface-area concepts to analyse how X helps Y.')
   d.core_properties.title=t('工作紙一：脂質消化的概念與應用','Worksheet 1: Lipid Digestion — Concepts and Applications')+(' — Answers' if answers else '')
   d.core_properties.subject='deductive-5 | staged-4 experimental data'
   d.save(out/f'WS1_{"answers" if answers else "student"}{suffix}.docx')
  teacher(out,tmp,lang)

def teacher(out,tmp,lang):
 zh=lang=='zh';t=lambda z,e:z if zh else e
 d=Document();s=d.sections[0];s.page_width=Cm(21);s.page_height=Cm(29.7);s.top_margin=s.bottom_margin=Cm(1.6)
 d.styles['Normal'].font.name='Noto Sans CJK TC' if zh else 'Arial';d.styles['Normal'].font.size=Pt(12);d.styles['Normal'].paragraph_format.line_spacing=1.4
 d.add_heading(t('D · 教師指引、配對及評分','D · Teacher guide, mapping and marking'),0)
 d.add_paragraph(t('紙本版本 deductive-5：八題，共19分。保留X作用題及對照組長答，Y主要外觀不另設題；VL的觀察及分析活動保留，滿分32。','Paper version deductive-5: eight tasks, 19 marks. The X-action question and control-design long answer are retained; no separate Y-appearance question is asked; the VL retains observation and analysis, with 32 marks.'))
 blocks=[
 ('派發與時間','Distribution and timing','VL 採三部分探究，最後才揭示 X、Y 身分；紙本組採演繹式自學：先讀課題需知，已知 X 是膽汁、Y 是胰液，再運用乳化、酶作用及變性概念分析相同三部分結果。紙本組不操作VL，不另派預先填好的答案；保存首次答案後才用答案版核對。動畫的一小時為模擬時間。兩組採相同活動總時間，先以 20–25 分鐘試教，再判斷能否完成於 15–20 分鐘。','The VL reveals X/Y identities only after the investigations. The paper group follows a deductive sequence: read the topic notes identifying X as bile and Y as pancreatic juice, then apply emulsification, enzyme and denaturation concepts to the same three experiments without operating the VL. Do not distribute the filled answer key beforehand. Save first responses before checking the answer copy. One hour is simulated, not classroom waiting time. Use equal total time for both groups; pilot 20–25 minutes before claiming 15–20 is sufficient.'),
 ('實驗及科學解釋','Experiments and science','主探究只設 X 2 mL、Y 2 mL 兩組。延伸一重新用兩支油水試管，先加 1 mL X／水並同樣搖勻，再各加 1 mL Y，同樣預處理時間。延伸二沿用未煮沸順序作基準，每次只煮沸一種並冷卻至相同溫度；一小時由加 Y 後起計。','Main: 2 mL X versus 2 mL Y. Extension 1: two fresh tubes; pretreat with 1 mL X/water and identical shaking, then 1 mL Y each. Equal pretreatment times. Extension 2 uses the same unboiled sequence as baseline, boiling only one juice and cooling to the same temperature. Count one hour after Y addition.'),
 ('觀察界限','Evidence limits','X 是膽汁；Y 是含脂肪酶的胰液。乳化不改變脂質分子。混濁減低／油層消失只是預設模型外觀，不單獨證明產物形成或量得速率；機制由最後分子模型解釋。甘油及脂肪酸採完全水解簡化模型。','X is bile; Y is pancreatic juice containing lipase. Emulsification leaves lipid molecules unchanged. Reduced cloudiness / loss of an oil layer are preset appearances, not product tests or measured rates. Explain mechanisms with the final molecular model; glycerol/fatty acids follow the simplified complete-hydrolysis model.'),
 ('新版配分與舊紀錄','Current marks and legacy records','staged-4：SPS 24（觀察4、分類4、設計4、實作4、推論4、溝通4）＋整合8＝32；WS 19。對照組長答題已恢復，VL人工0–1，紙本0–2；是設計方案，不要求額外執行第三組。新五項推論各0.8。舊 staged-1 保留含外觀界限的五項推論各0.8；uiVersion 3／更早紀錄仍用當時組別、六題／四題及原總分32／28，不用新規準重評。','staged-4: SPS 24 (4 observation, 4 classification, 4 planning, 4 conducting, 4 inference, 4 communication) + reflection 8 = 32. WS 19. Control design is restored: VL 0–1, paper 0–2; a plan, not a required third executed setup. Five inference items earn 0.8 each. Historical staged-1 keeps five inference items at 0.8 each. Preserve original trial sets, four/six-item inference and totals 32/28 for legacy records.'),
 ('人工評分及 Excel','Manual scores and Excel','新版人工七欄（含對照設計0–1）：初步觀察0–2、原始假說理由0–2、裝置品質0–2、公平安排0–2、溝通0–4、整合0–8。設計探究包括假說理由0–2、前提自動0–1及對照長答0–1；裝置只要求主探究兩組。合理預測不因猜錯扣分，操作次數和用時不是能力分。','Seven current manual fields (including control design 0–1): initial observation 0–2, original prediction/reason 0–2, setup 0–2, fair arrangements 0–2, communication 0–4 and reflection 0–8. Planning includes prediction/reason 0–2, assumptions 0–1 and control design 0–1. Setup requires only the two main tubes. Do not penalise a reasonable prediction for being unsupported; clicks/time are not ability scores.'),
 ('保存及版本','Saving and versions','空白是待評，0 是已評零分，不適用不需填分；公式同時拒絕超界、負數、非整數及文字。整體分數只在學生完成反思且適用人工欄評妥後顯示。另存已評 Excel，重新匯出不帶回舊人工分。研究 ID、原始／首次／最後答案、圖像及快照保留。WS 與 VL 作答機會不同，不直接換算總分，不宣稱是已驗證量表。','Blank means pending, zero is a marked zero, inactive fields need no mark. Formulas reject out-of-range, negative, fractional and text entries. Overall requires reflection submission and all applicable marks. Save a marked workbook separately; re-export does not retrieve manual marks. Preserve IDs, first/final responses, images and snapshots. WS and VL totals are not interchangeable or validated scales.')]
 for z,e,body,en in blocks:d.add_heading(t(z,e),2);d.add_paragraph(t(body,en))
 d.add_heading(t('逐題配對及紙本評分','Worksheet mapping and marking'),1)
 for q in RULES['worksheet']:d.add_paragraph(f'{q["number"]}. '+(q['title']+'｜'+q['vl']+'｜'+str(q['max'])+'分；'+q['answer']+' '+q['marking'] if zh else q['english']))
 d.add_heading(t('最後整合解釋：每項 1 分','Integrated explanation: one mark per concept'),1)
 for i,point in enumerate(RULES['reflectionPoints']):d.add_paragraph(f'{i+1}. '+(point if zh else RULES['reflectionPointsEn'][i]))
 d.add_paragraph(t('教師教材面板僅五類下載，依介面語言選取完整學生 PDF／Word、完整答案 PDF／Word、D PDF；三類 PDF 有預覽。','The teacher panel has five download categories, selected by interface language: student PDF/Word, complete answers PDF/Word and D PDF. All three PDF types have previews.'))
 d.save(tmp/('WS1_D_teacher_guide'+('' if zh else '_en')+'.docx'))
