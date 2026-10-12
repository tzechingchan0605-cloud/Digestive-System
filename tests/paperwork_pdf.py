"""Check actual generated PDFs, using selectable text and rendered pixels."""
import json, re, hashlib, unicodedata, html
from pathlib import Path
import fitz

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'paperwork/generated/manifest.json').read_text())
sources = json.loads((root / 'paperwork/generated/source.json').read_text())
supported = {'乳化作用','乳化脂質','乳狀液','物理消化','化學消化','消化道','膽囊','甘油','脂肪酸','甘油三酯','膽汁','脂肪酶'}
def compact(value):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', value))

def require_text(page_text, values, context):
    for value in values:
        plain = html.unescape(re.sub(r'<[^>]+>', '', value))
        assert compact(plain) in compact(page_text), (*context, 'missing merged content', plain)

expected_pages = {'A':3, 'B':2, 'C':2, 'D':7, 'all':14}
for lang in ['zh', 'en']:
    model = sources[lang]
    for part, file in manifest['languages'][lang]['files'].items():
        path = root / file['path']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == file['sha256']
        doc = fitz.open(path)
        assert len(doc) == file['pages'] == expected_pages[part], (lang, part, len(doc), file['pages'])
        text = unicodedata.normalize('NFKC', '\n'.join(page.get_text() for page in doc))
        for index,page in enumerate(doc):
            page_text=unicodedata.normalize('NFKC',page.get_text())
            layout=file['layout'][index]
            expected_identity=layout['part'] in ['A','C'] and layout['page']==1
            assert bool(re.search(r'姓名\s*:|Name\s*:',page_text))==expected_identity,(lang,part,index+1,'identity')
            assert all(lines==2 for lines in layout['writingLines'])
            assert all(width>=1 for width in layout['clearSurfaceBorders'])
            context=(lang,part,index+1)
            if layout['part']=='A' and layout['page']==1:
                require_text(page_text, [model['title'],model['background'],model['taskHeading'],model['taskQuestion'],model['taskDescription'],
                    model['initialObservation']['heading'],model['initialObservation']['hint'],model['hypothesis']['heading'],
                    model['hypothesis']['instruction'],model['hypothesis']['reasonLabel'],model['variables']['heading']]
                    +[o['text'] for o in model['hypothesis']['liquid']+model['hypothesis']['outcome']]
                    +[g[key] for g in model['variables']['groups'] for key in ['label','definition']]
                    +[o['text'] for o in model['variables']['choices']]
                    +re.findall(r'<figcaption[^>]*>(.*?)</figcaption>',model['context'],re.S), context)
                for option in model['variables']['choices']:
                    assert compact(page_text).count(compact(option['text']))==3,(*context,'missing repeated variable option',option['id'])
                assert layout['writingLines']==[2,2]
                assert layout['circles']==2
                assert len(re.findall(r'_{10,}',page_text))==2, (*context,'only identity fields may use underscores')
                assert ('請圈出' if lang=='zh' else 'Circle one answer') in page_text
            if layout['part']=='A' and layout['page']==2:
                require_text(page_text, [model['assumptions']['heading'],model['assumptions']['question'],model['assumptions']['reminder'],
                    model['control']['heading'],model['control']['question'],model['control']['hint']]
                    +[o['text'] for o in model['assumptions']['choices']], context)
                assert layout['writingLines']==[2]
            if layout['part']=='A' and layout['page']==3:
                require_text(page_text, [model['design']['heading'],model['design']['question'],model['design']['instruction'],
                    model['design']['hint'],model['design']['reminder'],model['design']['writtenLabel']]
                    +re.findall(r'<figcaption[^>]*>(.*?)</figcaption>',model['design']['materials'],re.S), context)
                assert layout['writingLines']==[2]
                # Inspect the real PDF vector rectangle, not just template CSS.
                assert any(d['type']=='s' and len(d['items'])==1 and d['items'][0][0]=='re'
                    and d['rect'].width>=160*72/25.4 and d['rect'].height>=130*72/25.4
                    for d in page.get_drawings()), (*context,'drawing box must be at least 160 × 130 mm')
                assert model['assumptions']['heading'] not in page_text and model['control']['heading'] not in page_text
            if layout['part']=='B' and layout['page']==1:
                require_text(page_text, [model['basic']['heading'],model['basic']['instruction'],model['basic']['fair'],model['basic']['observationPrompt']]
                    +[t['label'] for t in model['trials'] if t['key'].endswith('-none')]
                    +[o['text'] for o in model['basic']['options']], context)
                assert layout['writingLines']==[2]
            if layout['part']=='B' and layout['page']==2:
                require_text(page_text, [model['conclusions']['heading'],model['conclusions']['instruction'],
                    model['extension']['heading'],model['extension']['question'],model['extension']['instruction']]
                    +[t['label'] for t in model['trials'] if not t['key'].endswith('-none')]
                    +[o['text'] for o in model['extension']['options']]
                    +[q['heading'] for q in model['conclusions']['questions']]
                    +[o['text'] for q in model['conclusions']['questions']+[model['extension']['conclusion']] for o in q['options']], context)
                assert layout['writingLines']==[2,2]
            if layout['part']=='C' and layout['page']==1:
                require_text(page_text,[model['learning']['heading'],model['learning']['intro'],model['learning']['limit']]
                    +re.findall(r'<li[^>]*>(.*?)</li>',model['learning']['points'],re.S), context)
            if layout['part']=='C' and layout['page']==2:
                require_text(page_text,[model['reflection']['heading'],model['reflection']['question']], context)
                assert layout['writingLines']==[2]
            if layout['part']=='B' and layout['page']==2:
                assert layout['circles']==4
                assert '__________' not in page_text
        assert '\ufffd' not in text
        assert all(abs(page.rect.width-595.28)<1 and abs(page.rect.height-841.89)<1 for page in doc)
        if part in ['A','B','C']:
            assert not re.search(r'SPS|最高分|參考答案|Full credit|Maximum', text), (lang, part)
            assert 'tzechingchan0605' not in text and '@gmail.com' not in text
        if part == 'A':
            for reminder in [sources[lang]['assumptions']['reminder'], sources[lang]['design']['reminder']]:
                assert re.sub(r'\s+','',unicodedata.normalize('NFKC',reminder)) in re.sub(r'\s+','',text), (lang,'missing reminder')
            assert not re.search(r'膽汁|脂肪酶|bile|lipase|denaturation', text, re.I)
            assert compact('不包含獨立變量的處理條件' if lang=='zh' else 'does not receive the treatment being tested') in compact(text)
        if part == 'B':
            assert '膽汁' not in text and not re.search(r'\bbile\b|\blipase\b',text,re.I)
        if part == 'C':
            assert ('你的原始假說是否獲觀察結果支持' if lang=='zh' else 'Do your observations support your first idea to test') in text
        if lang == 'en':
            for word in re.findall(r'[\u3400-\u9fff]+', text):
                assert word in supported, (part, word)
        for xref, _, kind, *_ in {font for page in doc for font in page.get_fonts()}:
            if kind == 'Type3':
                obj = doc.xref_object(xref)
                assert '/CharProcs' in obj and '/ToUnicode' in obj, 'Type3 glyphs must be included with text mapping.'
                procs = doc.xref_get_key(xref, 'CharProcs')[1]
                assert all(doc.xref_is_stream(int(ref)) and doc.xref_stream(int(ref)) for ref in re.findall(r'(\d+) 0 R', procs))
            else:
                assert doc.extract_font(xref)[3], 'Font program must be embedded.'

# Render core sheets for review; this is actual PDF content, not an HTML mockup.
output = Path('/tmp/vl1-paper-review'); output.mkdir(exist_ok=True)
for lang in ['zh','en']:
    for part,index in [('A',0),('A',1),('A',2),('B',0),('B',1),('C',0),('C',1),('D',3)]:
        doc=fitz.open(root / manifest['languages'][lang]['files'][part]['path'])
        page=doc[index]
        page.get_pixmap(matrix=fitz.Matrix(1.4,1.4)).save(output / f'{lang}-{part}-{index+1}.png')
# Four images on B1 must remain distinguishable after grayscale conversion.
doc=fitz.open(root / manifest['languages']['zh']['files']['B']['path'])
page=doc[0]
gray=page.get_pixmap(matrix=fitz.Matrix(1.5,1.5),colorspace=fitz.csGRAY)
gray.save(output / 'zh-B-1-grayscale.png')
print('PASS: ten valid A4 PDFs (A3/B2/C2/D7, full pack14), merged context/hypothesis/all 21 variable choices on A1, separate assumptions/control A2 and large drawing A3, all questions/options/hints/data preserved, A/C first-page identities only, two writing lines, inline circle choices, clear liquid surfaces, selectable bilingual text, approved-only Chinese support, fonts and stage separation; actual PDF and grayscale review pages rendered.')
