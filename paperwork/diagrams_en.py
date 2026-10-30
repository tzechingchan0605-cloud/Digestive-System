"""English scientific diagrams, freshly drawn with print-sized labels."""
from pathlib import Path
import base64,html
ROOT=Path(__file__).resolve().parents[1]
INK='#20383c';TEAL='#25666a';RED='#b7312c';OIL='#e6ba49';LINE='#6b858a'
def text(x,y,t,size=22,color=INK,weight='normal'):
 return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="middle">{html.escape(t)}</text>'
def rect(x,y,w,h,fill='#f4f8f8',stroke='#b5c9ca',r=12):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="1.8"/>'
def arrow(x1,y,x2):return f'<path d="M{x1} {y} H{x2}" stroke="{TEAL}" stroke-width="3.5" fill="none" marker-end="url(#arrow)"/>'
def lipid(x,y):return ''.join(f'<path d="M{x} {y+i*6} l4 -3 l4 3 l4 -3 l4 3" stroke="#795b25" stroke-width="1.7" fill="none"/>' for i in range(3))
def create(out):
 out.mkdir(exist_ok=True)
 def save(name,h,b):
  (out/(name+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="900" height="{h}" viewBox="0 0 900 {h}"><defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 Z" fill="{TEAL}"/></marker></defs><rect width="900" height="{h}" fill="white"/><g font-family="Noto Sans, Arial, sans-serif">{b}</g></svg>')
 b=rect(5,5,890,252)+text(166,38,'Before',23,TEAL,'bold')+text(720,38,'After',23,TEAL,'bold')
 b+=f'<circle cx="166" cy="119" r="68" fill="{OIL}" stroke="#9e782b" stroke-width="2"/>'
 for x in [140,164,188]:
  for y in [94,118,142]:b+=lipid(x-8,y-5)
 for x in [665,720,775]:
  for y in [73,119,165]:b+=f'<circle cx="{x}" cy="{y}" r="20" fill="{OIL}" stroke="#9e782b" stroke-width="1.5"/>'+lipid(x-8,y-5)
 b+=arrow(300,115,574)+text(438,86,'Bile: emulsification',24,RED,'bold')+text(438,153,'Lipid molecules unchanged')+text(166,210,'One large oil droplet')+text(720,210,'Many small oil droplets')+text(450,244,'Same amount of lipid: greater total surface area',22,TEAL,'bold')
 save('01_emulsification',265,b)
 b=rect(5,5,890,278)+text(169,35,'Triglyceride',23,TEAL,'bold')+text(730,35,'Hydrolysis products',23,TEAL,'bold')
 b+=rect(15,59,108,118,'#dcedee')+text(69,123,'Glycerol')
 for y in [79,118,157]:b+=f'<path d="M123 {y} H148" stroke="#d88534" stroke-width="4"/>'+rect(148,y-16,147,32,'#fff1c9','#d0a445',6)+text(221,y+6,'Fatty acid')
 b+=text(165,206,'+ 3H₂O (water)')+arrow(330,117,534)+text(432,78,'Lipase',24,RED,'bold')+text(432,156,'Hydrolysis')+rect(581,60,116,116,'#dcedee')+text(639,125,'Glycerol',23,RED,'bold')
 for y in [78,118,158]:b+=rect(744,y-16,129,32,'#fff1c9','#d0a445',6)+text(808,y+6,'Fatty acid',22,RED)
 b+=text(721,124,'+',23)+text(808,206,'3 fatty acids')+text(450,249,'Bonds change; smaller molecules form. Lipase is not used up.',22,TEAL,'bold')
 save('02_hydrolysis',290,b)
 b=rect(5,5,890,205)
 uri='data:image/png;base64,'+base64.b64encode((ROOT/'assets/digestive-system.png').read_bytes()).decode()
 b+=f'<image x="34" y="40" width="64" height="145" xlink:href="{uri}"/>'+text(178,83,'Digestive',23,TEAL,'bold')+text(178,116,'system',23,TEAL,'bold')+arrow(263,107,330)
 b+=rect(360,31,208,65,'#eaf4e5')+text(464,71,'Digestive juice X',22,TEAL,'bold')+rect(360,119,208,65,'#fbecef')+text(464,160,'Digestive juice Y',22,RED,'bold')
 b+=f'<path d="M580 63 L622 107 M580 151 L622 107" stroke="{TEAL}" stroke-width="3" fill="none"/>'+arrow(623,107,668)+text(741,40,'Oil + water',23,TEAL,'bold')
 b+=f'<path d="M710 65 V153 Q710 174 738 174 Q766 174 766 153 V65" fill="#eaf3f3" stroke="{LINE}" stroke-width="3"/><path d="M712 84 H764 V102 H712Z" fill="{OIL}"/>'+text(825,102,'Add')+text(825,133,'and shake')+text(741,200,'Compare appearance',22,TEAL,'bold')
 save('03_scenario',216,b)
 def tube(cx,y,appearance):
  x=cx-34;b=f'<path d="M{x} {y+31} H{x+68} V{y+99} Q{x+68} {y+122} {cx} {y+122} Q{x} {y+122} {x} {y+99}Z" fill="'+('#e7e3cd' if appearance=='cloudy' else '#edf5f5')+'"/>'
  if appearance in ['separated','thin']:
   thick=25 if appearance=='separated' else 10;b+=f'<path d="M{x} {y+31} H{x+68} V{y+31+thick} H{x}Z" fill="{OIL}"/>'
  if appearance=='cloudy':
   for iy in range(5):
    for ix in range(4):b+=f'<circle cx="{x+11+ix*15}" cy="{y+42+iy*14}" r="2.4" fill="#a28d4a"/>'
  b+=f'<path d="M{x} {y+9} V{y+99} Q{x} {y+122} {cx} {y+122} Q{x+68} {y+122} {x+68} {y+99} V{y+9}" fill="none" stroke="{LINE}" stroke-width="4"/><path d="M{x} {y+31} H{x+68}" stroke="{LINE}" stroke-width="1.3"/>';return b
 b=''
 for i,(title,dose,kind,result,detail) in enumerate([('Water control','Add 2 mL water','separated','Two layers','Visible oil layer'),('X','Add 2 mL X','cloudy','Cloudy','An emulsion'),('Y','Add 2 mL Y','thin','Thinner oil layer','Still two layers'),('X + Y','1 mL each','clear','Clear','')]):
  x=i*225;cx=x+112;b+=rect(x+5,5,215,300)+text(cx,40,title,24,TEAL,'bold')+text(cx,75,dose)+tube(cx,91,kind)+text(cx,254,result,22,RED,'bold')+text(cx,285,detail)
 save('04_basic_results',312,b)
 b=''
 for i,(title,sub,kind,result) in enumerate([('Unboiled X + Y','Neither juice boiled','clear','Clear'),('Boiled X + unboiled Y','X cooled to 37°C','clear','Clear'),('Unboiled X + boiled Y','Y cooled to 37°C','cloudy','Cloudy')]):
  x=i*300;cx=x+150;b+=rect(x+5,5,290,300)+text(cx,39,title,22,TEAL,'bold')+text(cx,75,'1 mL each of X and Y')+text(cx,109,sub)+tube(cx,123,kind)+text(cx,286,result,24,RED,'bold')
 save('05_heating_results',312,b)
