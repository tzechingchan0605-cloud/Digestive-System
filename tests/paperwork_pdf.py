"""Verify the real PDFs for the direct self-study comparison condition."""
import json, re, hashlib, unicodedata, html
from pathlib import Path
import fitz

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'paperwork/generated/manifest.json').read_text())
sources = json.loads((root / 'paperwork/generated/source.json').read_text())
supported = {'乳化作用','乳化脂質','乳狀液','物理消化','化學消化','消化道','膽囊','甘油','脂肪酸','甘油三酯','膽汁','脂肪酶'}
expected_pages = {'A':2, 'B':4, 'C':1, 'D':8, 'all':15}
def compact(value):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', html.unescape(re.sub(r'<[^>]+>', '', value))))
def require_text(text, values, context):
    for value in values:
        assert compact(value) in compact(text), (*context,'missing content',value)
assert manifest['version']=='VL1-WS-direct-3' and manifest['materialVersion']==8
assert manifest['approach']=='explanation-example-guided-independent-check'
for lang in ['zh','en']:
    model=sources[lang]; vl=model['vl']
    assert model['practiceMaximum']==34 and len(model['questions'])==len(model['mapping'])==14
    assert 'observation' not in {q['id'] for q in model['questions']}
    assert model['questions'][0]['id']=='prediction' and 'given' not in model['questions'][0]
    assert len(model['concepts'])==2 and 'methods' not in model and 'examples' not in model
    assert abs(sum(s['fraction'] for s in model['timePlan'])-1)<1e-12
    for total in [15,20]:
        assert abs(sum(round(s['fraction']*total,2) for s in model['timePlan'])-total)<1e-12
    for part,file in manifest['languages'][lang]['files'].items():
        path=root/file['path']
        assert hashlib.sha256(path.read_bytes()).hexdigest()==file['sha256']
        doc=fitz.open(path)
        assert len(doc)==file['pages']==expected_pages[part], (lang,part,len(doc))
        text=unicodedata.normalize('NFKC','\n'.join(p.get_text() for p in doc))
        for i,page in enumerate(doc):
            layout=file['layout'][i]; page_text=unicodedata.normalize('NFKC',page.get_text()); ctx=(lang,part,i+1)
            assert bool(re.search(r'姓名\s*:|Name\s*:',page_text))==(layout['part'] in ['A','C'] and layout['page']==1), (*ctx,'identity')
            assert all(lines==2 for lines in layout['writingLines'])
            assert all(width>=1 for width in layout['clearSurfaceBorders'])
            assert abs(page.rect.width-595.28)<1 and abs(page.rect.height-841.89)<1
            if layout['part']=='B':
                expected=[q for q in model['questions'] if q['page']==layout['page']]
                assert layout['questionIds']==[q['id'] for q in expected], (*ctx,'question coverage/order')
                require_text(page_text,[q['prompt'] for q in expected]+[q.get('hint','') for q in expected]+[q.get('sentence','').replace('__________','') for q in expected]+[q['info'][key] for q in expected if 'info' in q for key in ['heading','body']],ctx)
                assert layout['infoFor']==[q['id'] for q in expected if 'info' in q], (*ctx,'question-local support')
            if layout['part']=='A' and layout['page']==1:
                assert layout['introLines']==4, (*ctx,'four-line opening')
                require_text(page_text,model['introLines'],ctx)
                assert len(page.get_images())>=4, (*ctx,'original VL context images')
            if layout['part']=='A' and layout['page']==2:
                assert layout['equations']==['physical','chemical']
                require_text(page_text,list(model['wordEquations'].values()),ctx)
                frames=[d['rect'] for d in page.get_drawings() if d.get('color') and all(abs(a-b)<.005 for a,b in zip(d['color'],[184/255,198/255,194/255])) and d['rect'].height>100*72/25.4]
                assert len(frames)==2, (*ctx,'two equal supplement frames')
                assert abs(frames[0].width-frames[1].width)<1 and abs(frames[0].height-frames[1].height)<1
                outlines=[d['rect'] for d in page.get_drawings() if d.get('color') and all(abs(a-b)<.005 for a,b in zip(d['color'],[195/255,212/255,206/255]))]
                assert len(outlines)==3, (*ctx,'three separate fatty acids')
                outlines.sort(key=lambda r:r.x0)
                assert outlines[0].x1<outlines[1].x0 and outlines[1].x1<outlines[2].x0
                assert min(r.width for r in outlines)>20*72/25.4
            if layout['part'] in ['A','B','C']:
                assert layout['keywordCount']>0
                # Chromium may encode coloured bold CJK as Type3 outlines; verify actual rendered ink.
                pixels=page.get_pixmap().samples
                assert sum(r>120 and r>g*1.7 and r>b*1.7 for r,g,b in zip(pixels[0::3],pixels[1::3],pixels[2::3]))>50, (*ctx,'printed red keywords')
        assert '\ufffd' not in text
        assert '比較基準' not in text and not re.search(r'\bbaseline\b',text,re.I)
        if part in ['A','B','C']:
            assert 'tzechingchan0605' not in text and '@gmail.com' not in text
            assert compact(vl['reflection']['question']) not in compact(text), (lang,part,'old original-hypothesis reflection')
            assert compact(vl['control']['hint']) not in compact(text), (lang,part,'overgeneralised control explanation')
            assert not re.search(r'SPSAI|最高分|Maximum|32-point|36-point',text)
        if part=='A':
            require_text(text,[model['title'],model['conditions']]+model['introLines']+list(model['diagramCaptions'].values())
                +[c[k] for c in model['concepts'] for k in ['heading','body']],(lang,part))
            assert [key for page in file['layout'] for key in page['trialKeys']]==[]
            assert '煮沸' not in text and '變性' not in text and not re.search(r'boil|denatur',text,re.I)
            assert '示例' not in text and not re.search(r'example',text,re.I)
            assert compact(model['labels']['studentTiming']) not in compact(text)
            assert compact(next(q for q in model['questions'] if q['id']=='mainObservations')['key']) not in compact(text)
            assert compact(next(q for q in model['questions'] if q['id']=='heatObservations')['key']) not in compact(text)
        if part=='B':
            assert [qid for page in file['layout'] for qid in page['questionIds']]==[q['id'] for q in model['questions']]
            keys=[key for page in file['layout'] for key in page['trialKeys']]
            assert keys==['none-none','X-none','Y-none','XY-none','XY-none','XY-X','XY-Y']
            require_text(text,[t['label'] for t in vl['trials'] if t['key']!='none-none']+[o['text'] for o in vl['basic']['options']],(lang,part))
            assert file['layout'][0]['writingLines']==[2], (lang,'one written prediction/reason')
            for i,page in enumerate(doc):
                if i<3:
                    assert '煮沸' not in page.get_text() and not re.search(r'boil|denatur',page.get_text(),re.I)
            for option in vl['variables']['choices']:
                assert compact(text).count(compact(option['text']))>=3
        if part in ['A','B']:
            assert not re.search(r'X\s*[＝=:：為是]\s*膽汁|Y\s*[＝=:：為是]\s*脂肪酶|X\s*(?:is|=|:)\s*bile|Y\s*(?:is|=|:)\s*lipase',text,re.I), (lang,part,'no explicit X/Y identity assignment before checking')
        if part=='C':
            require_text(text,[model['labels']['check'],model['labels']['limits'],model['modelIdentity']]+[q['key'] for q in model['questions']]+model['corrections'],(lang,part))
            assert file['layout'][0]['writingLines']==[2,2]
        if part=='D':
            require_text(text,[model['labels']['matching'],model['labels']['draft']]+[q[k] for q in model['questions'] for k in ['prompt','key','rule','goal']]
                +[row[k] for row in model['mapping'] for k in ['original','treatment','revised','goal','reason']],(lang,part))
            assert '15' in text and '20' in text and '34' in text and '32' in text
        if lang=='en':
            for word in re.findall(r'[\u3400-\u9fff]+',text):
                assert word in supported,(part,word)
        for xref,_,kind,*_ in {font for page in doc for font in page.get_fonts()}:
            if kind=='Type3':
                assert '/CharProcs' in doc.xref_object(xref) and '/ToUnicode' in doc.xref_object(xref)
                assert all(doc.xref_is_stream(int(ref)) and doc.xref_stream(int(ref)) for ref in re.findall(r'(\d+) 0 R',doc.xref_get_key(xref,'CharProcs')[1]))
            else:
                assert doc.extract_font(xref)[3]
output=Path('/tmp/vl1-paper-review');output.mkdir(exist_ok=True)
for lang in ['zh','en']:
    for part,file in manifest['languages'][lang]['files'].items():
        if part=='all': continue
        doc=fitz.open(root/file['path'])
        for i,page in enumerate(doc):
            page.get_pixmap(matrix=fitz.Matrix(1.4,1.4)).save(output/f'{lang}-{part}-{i+1}.png')
doc=fitz.open(root/manifest['languages']['zh']['files']['B']['path'])
doc[2].get_pixmap(matrix=fitz.Matrix(1.5,1.5),colorspace=fitz.csGRAY).save(output/'zh-B-3-grayscale.png')
print('PASS: ten real A4 PDFs; four-line opening with original VL context, matching concept frames and single-line word equations; printed red keywords and question-local notes; 14 items / 34-point separate feedback guide; all six datasets on B3/B4, heating support only at B4; delayed model-identity check and corrections; bilingual fonts, two-line responses, mapping, timing and downloads ready; all pages rendered.')
