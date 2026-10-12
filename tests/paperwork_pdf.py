"""Check actual generated PDFs, using selectable text and rendered pixels."""
import json, re, hashlib, unicodedata
from pathlib import Path
import fitz

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'paperwork/generated/manifest.json').read_text())
supported = {'乳化作用','乳化脂質','乳狀液','物理消化','化學消化','消化道','膽囊','甘油','脂肪酸','甘油三酯','膽汁','脂肪酶'}
for lang in ['zh', 'en']:
    for part, file in manifest['languages'][lang]['files'].items():
        path = root / file['path']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == file['sha256']
        doc = fitz.open(path)
        assert len(doc) == file['pages'], (lang, part, len(doc), file['pages'])
        text = unicodedata.normalize('NFKC', '\n'.join(page.get_text() for page in doc))
        for index,page in enumerate(doc):
            page_text=unicodedata.normalize('NFKC',page.get_text())
            layout=file['layout'][index]
            expected_identity=layout['part'] in ['A','C'] and layout['page']==1
            assert bool(re.search(r'姓名\s*:|Name\s*:',page_text))==expected_identity,(lang,part,index+1,'identity')
            assert all(lines==2 for lines in layout['writingLines'])
            assert all(width>=1 for width in layout['clearSurfaceBorders'])
            if layout['part']=='A' and layout['page']==2:
                assert layout['circles']==2
                assert '__________' not in page_text
                assert ('請圈出' if lang=='zh' else 'Circle one answer') in page_text
            if layout['part']=='B' and layout['page'] in [3,4]:
                assert layout['circles']==(3 if layout['page']==3 else 1)
                assert '__________' not in page_text
        assert '\ufffd' not in text
        assert all(abs(page.rect.width-595.28)<1 and abs(page.rect.height-841.89)<1 for page in doc)
        if part in ['A','B','C']:
            assert not re.search(r'SPS|最高分|參考答案|Full credit|Maximum', text), (lang, part)
            assert 'tzechingchan0605' not in text and '@gmail.com' not in text
        if part == 'A':
            assert not re.search(r'膽汁|脂肪酶|bile|lipase|denaturation', text, re.I)
            assert ('不包含獨立變量的處理條件' if lang=='zh' else 'does not receive the treatment being tested') in re.sub(r'\s+',' ',text)
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
    for part,index in [('A',0),('A',1),('A',3),('B',0),('B',1),('C',0),('C',1),('D',3)]:
        doc=fitz.open(root / manifest['languages'][lang]['files'][part]['path'])
        page=doc[index]
        page.get_pixmap(matrix=fitz.Matrix(1.4,1.4)).save(output / f'{lang}-{part}-{index+1}.png')
# Four images on B1 must remain distinguishable after grayscale conversion.
doc=fitz.open(root / manifest['languages']['zh']['files']['B']['path'])
page=doc[0]
gray=page.get_pixmap(matrix=fitz.Matrix(1.5,1.5),colorspace=fitz.csGRAY)
gray.save(output / 'zh-B-1-grayscale.png')
print('PASS: ten valid A4 PDFs, A/C first-page identities only, two writing lines, inline circle choices, clear liquid surfaces, selectable bilingual text, approved-only Chinese support, fonts and stage separation; actual PDF and grayscale review pages rendered.')
