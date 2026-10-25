#!/usr/bin/env node
'use strict';
// node paperwork/build.cjs [--check]. Requires Playwright + Chromium + CJK fonts.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const {generate}=require('./render.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'generated');
const MATERIAL_VERSION=8;
const inputs=['package.json','package-lock.json','index.html','app.js','language.js','language-dictionary.js','styles.css','paperwork/fonts/NotoSansHK-paper.otf','paperwork/source.js','paperwork/print.css','paperwork/curriculum.js','paperwork/render.cjs','paperwork/build.cjs',...fs.readdirSync(path.join(root,'assets')).filter(n=>/\.(svg|png)$/.test(n)).map(n=>'assets/'+n)].sort();
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const fingerprints=()=>Object.fromEntries(inputs.map(name=>[name,sha(fs.readFileSync(path.join(root,name)))]));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function documentHTML(parts,generated,lang,base,model){
  let number=0,total=parts.reduce((n,part)=>n+generated.pages[part].length,0);
  const body=parts.flatMap(part=>generated.pages[part].map((body,i)=>`<article class="sheet" data-part="${part}" data-page="${i+1}"><header class="page-head"><strong>${lang==='zh'?'課題 1':'Topic 1'} · ${part} · ${esc(generated.title(part))}</strong><span>${lang==='zh'?'繁體中文':'English'}</span></header>${i===0&&['A','C'].includes(part)?`<div class="identity">${generated.s('identity')}</div>`:''}<div class="sheet-body">${body}</div><footer class="page-footer"><span>VL1 · ${model.version} · v${MATERIAL_VERSION}</span><span>${++number} / ${total} · ${part}-${i+1}</span></footer></article>`)).join('');
  return `<!doctype html><html lang="${lang==='zh'?'zh-Hant-HK':'en-HK'}"><head><meta charset="utf-8"><base href="${base}/"><title>VL1 paper materials</title><link rel="stylesheet" href="paperwork/print.css"></head><body>${body}</body></html>`;
}
async function main(){
  if(process.argv.includes('--check')){
    const manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8'));
    if(JSON.stringify(manifest.inputs)!==JSON.stringify(fingerprints()))throw new Error('Paper PDFs are stale. Run node paperwork/build.cjs and commit updated materials.');
    for(const lang of ['zh','en'])for(const file of Object.values(manifest.languages[lang].files))if(sha(fs.readFileSync(path.join(root,file.path)))!==file.sha256)throw new Error('Missing/changed PDF: '+file.path);
    console.log('PASS: source fingerprints and all ten generated PDF checksums.');return;
  }
  fs.mkdirSync(out,{recursive:true});
  const server=http.createServer((req,res)=>{
    let name;try{name=decodeURIComponent(req.url.split('?')[0]);}catch{res.writeHead(400);res.end();return;}
    const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    try{const data=fs.readFileSync(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage();
    await page.route('**/cloud-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.VL1_CLOUD_CONFIG={endpoint:''};"}));
    await page.route('https://**/*',r=>r.abort());
    await page.goto(base);await page.waitForFunction(()=>window.getVL1PaperSource&&window.VL1InquiryContent);
    const sources=await page.evaluate(()=>({zh:getVL1PaperSource('zh'),en:getVL1PaperSource('en')}));
    const supported=['initialObservation','hypothesisLiquid','hypothesisOutcome','reason','controlPlan','setupDescription','q1','q2','q3','limitations','reflection'];
    if(JSON.stringify(sources.zh.vl.questionIds)!==JSON.stringify(supported))throw new Error('Question fields changed: update paper layout and mapping before building.');
    const manifest={module:'VL1',version:sources.zh.version,materialVersion:MATERIAL_VERSION,vlVersion:sources.zh.vlVersion,approach:sources.zh.approach,optionOrder:{assumptions:['time','more','volume','mixing'],conclusions:Object.fromEntries([...sources.zh.vl.conclusions.questions,sources.zh.vl.extension.conclusion].map(q=>[q.id,q.options.map(o=>o.id)]))},sourceDigest:sha(JSON.stringify(sources)),inputs:fingerprints(),languages:{}};
    fs.writeFileSync(path.join(out,'source.json'),JSON.stringify(sources,null,2)+'\n');
    for(const lang of ['zh','en']){
      const model=sources[lang],generated=generate(model,lang),files={};
      for(const part of ['A','B','C','D','all']){
        const parts=part==='all'?['A','B','C','D']:[part];
        const html=documentHTML(parts,generated,lang,base,model);
        await page.setContent(html);await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
        const overflow=await page.locator('.sheet-body').evaluateAll(els=>els.map((el,i)=>({page:i+1,height:el.scrollHeight,limit:el.clientHeight,width:el.scrollWidth,allowedWidth:el.clientWidth,
          bottom:Math.max(...[...el.querySelectorAll('*')].map(child=>child.getBoundingClientRect().bottom)),footer:el.closest('.sheet').querySelector('.page-footer').getBoundingClientRect().top
        })).filter(p=>p.height>p.limit+2||p.width>p.allowedWidth+2||p.bottom>p.footer-4));
        if(overflow.length)throw new Error(`${lang}/${part} page overflow: ${JSON.stringify(overflow)}`);
        const reactionMisalignment=await page.locator('.reaction-step').evaluateAll(steps=>steps.some(el=>{
          const enzyme=el.querySelector('strong').getBoundingClientRect(),arrow=el.querySelector('.reaction-arrow').getBoundingClientRect(),label=el.lastElementChild.getBoundingClientRect();
          const centre=rect=>rect.x+rect.width/2;
          return enzyme.bottom>arrow.top+1||arrow.bottom>label.top+1||Math.abs(centre(enzyme)-centre(arrow))>2||Math.abs(centre(label)-centre(arrow))>2;
        }));
        if(reactionMisalignment)throw new Error(`${lang}/${part}: hydrolysis labels overlap or are not centred around the arrow`);
        const badEquations=await page.locator('.word-equation').evaluateAll(els=>els.some(el=>el.scrollWidth>el.clientWidth+1||el.getBoundingClientRect().height>parseFloat(getComputedStyle(el).lineHeight)+2));
        if(badEquations)throw new Error(`${lang}/${part}: word equation must stay on one line without clipping`);
        const diagramAreas=await page.locator('.diagram-picture').evaluateAll(els=>els.map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})));
        if(diagramAreas.length&&diagramAreas.some(r=>Math.abs(r.width-diagramAreas[0].width)>1||Math.abs(r.height-diagramAreas[0].height)>1))throw new Error('Supplementary diagram areas must have matching sizes');
        const layout=await page.locator('.sheet').evaluateAll(sheets=>sheets.map(sheet=>({part:sheet.dataset.part,page:Number(sheet.dataset.page),identity:sheet.querySelectorAll('.identity').length,keywordCount:sheet.querySelectorAll('.keyword').length,infoFor:[...sheet.querySelectorAll('[data-before-question]')].map(el=>el.dataset.beforeQuestion),equations:[...sheet.querySelectorAll('[data-equation]')].map(el=>el.dataset.equation),introLines:(()=>{const tops=[];sheet.querySelectorAll('.intro-line').forEach(line=>{const range=document.createRange();range.selectNodeContents(line);for(const rect of range.getClientRects())if(rect.width>0&&!tops.some(top=>Math.abs(top-rect.top)<3))tops.push(rect.top);});return tops.length;})(),writingLines:[...sheet.querySelectorAll('.ruled')].map(el=>el.querySelectorAll('.writing-line').length),circles:sheet.querySelectorAll('.circle-options').length,questionIds:[...sheet.querySelectorAll('[data-question-id]')].map(el=>el.dataset.questionId),trialKeys:[...sheet.querySelectorAll('[data-trial]')].map(el=>el.dataset.trial),clearSurfaceBorders:[...sheet.querySelectorAll('.test-tube.clear .tube-liquid')].map(el=>parseFloat(getComputedStyle(el).borderTopWidth))})));
        if(layout.some(p=>p.identity!==(p.page===1&&['A','C'].includes(p.part)?1:0)||p.writingLines.some(n=>n!==2)))throw new Error('Identity or two-line layout rule failed');
        if(layout.some(p=>p.part==='A'&&p.page===1&&p.introLines!==4))throw new Error('Opening context must fit exactly four printed lines.');
        if(layout.some(p=>p.clearSurfaceBorders.some(width=>width<1)))throw new Error('Clear test-tube liquid surface is missing');
        const filename=`VL1_${part}_${lang}_v${MATERIAL_VERSION}.pdf`,file=path.join(out,filename);
        await page.pdf({path:file,format:'A4',printBackground:true,preferCSSPageSize:true});
        const pages=parts.reduce((n,p)=>n+generated.pages[p].length,0);
        const downloadName=lang==='zh'?`VL1_紙本比較組_${part==='all'?'完整教師列印套裝':part+'_'+model.names[part]}_繁中_v${MATERIAL_VERSION}.pdf`:`VL1_ComparisonGroup_${part==='all'?'CompleteTeacherPack':part}_EN_v${MATERIAL_VERSION}.pdf`;
        files[part]={path:'paperwork/generated/'+filename,name:downloadName,pages,bytes:fs.statSync(file).size,sha256:sha(fs.readFileSync(file)),layout};
        console.log(`Built ${lang}/${part}: ${pages} A4 pages`);
      }
      let first=1;
      manifest.languages[lang]={files,ranges:Object.fromEntries(['A','B','C','D'].map(part=>{const range=[first,first+files[part].pages-1];first+=files[part].pages;return [part,range];}))};
    }
    fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    const tableCell=value=>String(value).replace(/<[^>]*>/g,'').replace(/\|/g,'\\|').replace(/\s+/g,' ');
    const mapping=['# VL1 紙本比較組逐題配對表',`題目版本：${manifest.version}；材料 v${MATERIAL_VERSION}；VL 來源：${manifest.vlVersion}。`];
    for(const lang of ['zh','en']){
      const model=sources[lang];
      mapping.push('',lang==='zh'?'## 繁體中文':'## English','',
        '| 題號 / Item | VL 原題 / Original | 處理 / Treatment | 新版題目 / Revised | 共同目標 / Goal | 理由 / Reason |',
        '| --- | --- | --- | --- | --- | --- |');
      for(const row of model.mapping)mapping.push('| '+[model.questions.find(q=>q.id===row.id).number,row.original,row.treatment,row.revised,row.goal,row.reason].map(tableCell).join(' | ')+' |');
    }
    fs.writeFileSync(path.join(out,'mapping.md'),mapping.join('\n')+'\n');
    const current=new Set(Object.values(manifest.languages).flatMap(entry=>Object.values(entry.files).map(file=>path.basename(file.path))));
    fs.readdirSync(out).filter(name=>/^VL1_(A|B|C|D|all)_(zh|en)_v\d+\.pdf$/.test(name)&&!current.has(name)).forEach(name=>fs.unlinkSync(path.join(out,name)));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
