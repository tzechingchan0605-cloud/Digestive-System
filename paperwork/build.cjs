#!/usr/bin/env node
'use strict';
// node paperwork/build.cjs [--check]. Requires Playwright + Chromium + CJK fonts.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const {labels,rubricEn}=require('./texts.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'generated');
const MATERIAL_VERSION=4;
const inputs=['package.json','package-lock.json','index.html','app.js','language.js','language-dictionary.js','styles.css','paperwork/fonts/NotoSansHK-paper.otf','paperwork/source.js','paperwork/print.css','paperwork/texts.cjs','paperwork/build.cjs',...fs.readdirSync(path.join(root,'assets')).filter(n=>/\.(svg|png)$/.test(n)).map(n=>'assets/'+n)].sort();
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const fingerprints=()=>Object.fromEntries(inputs.map(name=>[name,sha(fs.readFileSync(path.join(root,name)))]));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function generate(model,lang){
  const s=key=>labels[key][lang==='zh'?0:1],title=part=>labels.names[lang][part];
  const card=(heading,body)=>`<section class="card"><h2>${esc(heading)}</h2>${body}</section>`;
  const hint=text=>`<p class="hint">${esc(text)}</p>`;
  const ruled=()=>'<div class="ruled"><div class="writing-line"></div><div class="writing-line"></div></div>';
  const circleSentence=(sentence,sets)=>{
    let index=0;
    const result=sentence.replace(/__________/g,()=>{
      const items=sets[index++];if(!items)throw new Error('Missing inline choice set');
      return `<span class="circle-options">（${items.map(o=>`<span class="circle-choice${o.text.length>40?' long':''}">${esc(o.text)}</span>`).join(' ／ ')}）</span>`;
    });
    if(index!==sets.length)throw new Error('Inline choice count does not match the shared question');
    return result;
  };
  const choices=(items,multi=false,extra='')=>`${extra==='variable'?'':`<p class="hint">${s(multi?'multi':'single')}</p>`}<div class="choices ${extra}">${items.map(o=>`<span class="choice"><span class="checkbox"></span><span>${esc(o.text)}</span></span>`).join('')}</div>`;
  const question=q=>`<section class="question" data-question="${q.id}">${q.heading?`<h3>${esc(q.heading)}</h3>`:''}<p>${circleSentence(q.sentence,[q.options])}</p>${hint(s('circle'))}</section>`;
  const pages={A:[],B:[],C:[],D:[]},add=(part,body)=>pages[part].push(body);
  add('A',`<h1>${esc(model.title)}</h1><div class="two-cols"><div>${model.context}</div><div class="context-copy"><h3>${lang==='zh'?'研究背景':'Research background'}</h3><p>${esc(model.background)}</p><h3>${esc(model.taskHeading)}</h3><strong>${esc(model.taskQuestion)}</strong><p>${esc(model.taskDescription)}</p>${card(model.initialObservation.heading,`<p>${esc(model.initialObservation.hint)}</p>${ruled()}`)}</div></div>`);
  add('A',card(model.hypothesis.heading,`<h3>${esc(model.hypothesis.instruction)}</h3><p class="circle-sentence">${circleSentence(model.hypothesis.sentence,[model.hypothesis.liquid,model.hypothesis.outcome])}</p>${hint(s('circle'))}<p>${esc(model.hypothesis.reasonLabel)}</p>${ruled()}`)+card(model.variables.heading,hint(s('multi'))+`<div class="variable-groups">${model.variables.groups.map(g=>`<section><h3>${esc(g.label)} <span class="hint">${esc(g.definition)}</span></h3>${choices(model.variables.choices,true,'variable')}</section>`).join('')}</div>`));
  add('A',card(model.assumptions.heading,`<h3>${esc(model.assumptions.question)}</h3>${hint(model.assumptions.reminder)}<p>${esc(model.assumptions.hint)}</p>${choices(['time','more','volume','mixing'].map(id=>model.assumptions.choices.find(o=>o.id===id)),true)}`)+card(model.control.heading,`<h3>${esc(model.control.question)}</h3>${hint(model.control.hint)}${ruled()}`)+hint(s('original')));
  add('A',card(model.design.heading,`<h3>${esc(model.design.question)}</h3><p>${esc(model.design.instruction)}</p>${hint(model.design.hint)}${model.design.materials}${hint(model.design.reminder)}<div class="drawbox"></div><p>${esc(model.design.writtenLabel)}</p>${ruled()}`)+hint(s('original')));
  const results=trials=>`<div class="two-cols">${trials.map(trial=>`<section class="card result-card" data-trial="${trial.key}"><div class="result-label">${esc(trial.label)}</div><div class="test-tube ${trial.outcome}"><div class="tube-liquid"><div class="result-oil"></div></div></div></section>`).join('')}</div>`;
  const table=(trials,options)=>`<table><thead><tr><th>${lang==='zh'?'實驗裝置':'Experiment setup'}</th><th>${s('first')} · ${s('record')}</th></tr></thead><tbody>${trials.map(trial=>`<tr><td>${esc(trial.label)}</td><td class="answer">${options.map(o=>`<span class="choice"><span class="checkbox"></span>${esc(o.text)}</span>`).join('<br>')}</td></tr>`).join('')}</tbody></table>`;
  const basic=model.trials.filter(t=>t.key.endsWith('-none')),heat=model.trials.filter(t=>!t.key.endsWith('-none'));
  add('B',`<h1>${esc(model.basic.heading)}</h1><p>${esc(model.basic.instruction)}</p><p>${esc(model.basic.fair)}</p>${hint(s('data'))}${results(basic)}`);
  add('B',`<h1>${esc(model.basic.observationPrompt)}</h1>${table(basic,model.basic.options)}${hint(s('revision'))}${ruled()}`);
  add('B',`<p class="kicker">${esc(model.conclusions.heading)}</p><h1>${esc(model.conclusions.instruction)}</h1>${model.conclusions.questions.map(question).join('')}${hint(s('revision'))}${ruled()}`);
  add('B',`<p class="kicker">${esc(model.extension.heading)}</p><h1>${esc(model.extension.question)}</h1><p>${esc(model.extension.instruction)}</p>${hint(s('cool'))}${results(heat)}<h3>${esc(model.basic.observationPrompt)}</h3>${table(heat,model.extension.options)}${question(model.extension.conclusion)}${hint(s('revision'))}${ruled()}`);
  add('C',`${hint(s('learning'))}<h1>${esc(model.learning.heading)}</h1><h3>${esc(model.learning.intro)}</h3>${model.learning.points}${model.learning.physical}`);
  add('C',`${hint(s('learning'))}${model.learning.chemical}${card(lang==='zh'?'證據界限':'What the evidence can tell us',`<p>${esc(model.learning.limit)}</p>`)}`);
  add('C',`<h1>${esc(model.reflection.heading)}</h1><p>${esc(model.reflection.question)}</p>${hint(s('reflect'))}${ruled()}`);
  add('D',`<div class="teacher-only">${s('teacher')}</div><h1>${s('guideTitle')}</h1><ol class="guide-list">${labels.steps.map(pair=>`<li>${esc(pair[lang==='zh'?0:1])}</li>`).join('')}</ol><p>${s('admin')}</p>${hint(s('draft'))}${hint(s('pending'))}`);
  const ref=model.reference;
  const variableAnswers=model.variables.groups.map(g=>`<tr><td>${esc(g.label)}</td><td>${ref.variables[g.id].map(id=>esc(model.variables.choices.find(o=>o.id===id).text)).join(' / ')}</td></tr>`).join('');
  const assumptionAnswers=ref.assumptions.map(id=>model.assumptions.choices.find(o=>o.id===id).text);
  const conclusionAnswers=[...model.conclusions.questions,model.extension.conclusion].map(q=>`<tr><td>${esc(q.heading||q.sentence.replace(/<[^>]*>/g,''))}</td><td>${esc(q.options.find(o=>o.id===ref.conclusions[q.id]).text)}</td></tr>`).join('');
  add('D',`<div class="teacher-only">${s('teacher')}</div><h1>${s('key')}</h1><table class="reference"><tbody>${variableAnswers}<tr><td>${esc(model.assumptions.heading)}</td><td>${assumptionAnswers.map(esc).join('<br>')}</td></tr>${conclusionAnswers}</tbody></table><table class="reference"><tbody>${model.trials.map(trial=>`<tr><td>${esc(trial.label)}</td><td>${esc(ref.outcomes[trial.outcome])}</td></tr>`).join('')}</tbody></table>`);
  add('D',`<div class="teacher-only">${s('teacher')}</div><h1>${lang==='zh'?'開放題設計參考':'Reference for written designs'}</h1><h3>${esc(model.control.heading)}</h3><p>${esc(ref.control)}</p><h3>${esc(model.design.heading)}</h3><p>${esc(ref.design)}</p>${hint(ref.limit)}${hint(s('pending'))}`);
  const rubric=lang==='zh'?ref.rubric.slice(1):rubricEn;
  if(rubric.length!==rubricEn.length)throw new Error('Shared rubric changed: update its English translation before building.');
  const columns=lang==='zh'?labels.headingRubric:labels.headingRubricEn;
  for(let i=0;i<rubric.length;i+=5)add('D',`<div class="teacher-only">${s('teacher')}</div><h1>${lang==='zh'?'評分準則':'Scoring guide'}</h1>${hint(s('draft'))}<table class="rubric"><thead><tr>${columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rubric.slice(i,i+5).map(row=>`<tr>${row.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>${hint(s('pending'))}`);
  // Keep every question and option while combining the requested old pages.
  pages.A.splice(0,2,`<div class="merged-intro">${pages.A[0]}${pages.A[1]}</div>`);
  pages.A[2]=`<div class="drawing-page">${pages.A[2]}</div>`;
  pages.B.splice(0,4,`<div class="merged-basic">${pages.B[0]}${pages.B[1]}</div>`,`<div class="merged-analysis">${pages.B[2]}${pages.B[3]}</div>`);
  pages.C.splice(0,2,`<div class="merged-learning">${hint(s('learning'))}<h1>${esc(model.learning.heading)}</h1><h3>${esc(model.learning.intro)}</h3><div class="learning-top">${model.learning.points}${model.learning.physical}</div>${model.learning.chemical}${card(lang==='zh'?'證據界限':'What the evidence can tell us',`<p>${esc(model.learning.limit)}</p>`)}</div>`);
  return {pages,title,s};
}
function documentHTML(parts,generated,lang,base,model){
  let number=0,total=parts.reduce((n,part)=>n+generated.pages[part].length,0);
  const body=parts.flatMap(part=>generated.pages[part].map((body,i)=>`<article class="sheet" data-part="${part}" data-page="${i+1}"><header class="page-head"><strong>VL1 · ${part} · ${esc(generated.title(part))}</strong><span>${lang==='zh'?'繁體中文':'English'}</span></header>${i===0&&['A','C'].includes(part)?`<div class="identity">${generated.s('identity')}</div>`:''}<div class="sheet-body">${body}</div><footer class="page-footer"><span>VL1 · ${model.version} · v${MATERIAL_VERSION}</span><span>${++number} / ${total} · ${part}-${i+1}</span></footer></article>`)).join('');
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
    if(JSON.stringify(sources.zh.questionIds)!==JSON.stringify(supported))throw new Error('Question fields changed: update paper layout and mapping before building.');
    const manifest={module:'VL1',version:sources.zh.version,materialVersion:MATERIAL_VERSION,optionOrder:{assumptions:['time','more','volume','mixing'],conclusions:Object.fromEntries([...sources.zh.conclusions.questions,sources.zh.extension.conclusion].map(q=>[q.id,q.options.map(o=>o.id)]))},sourceDigest:sha(JSON.stringify(sources)),inputs:fingerprints(),languages:{}};
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
        const layout=await page.locator('.sheet').evaluateAll(sheets=>sheets.map(sheet=>({part:sheet.dataset.part,page:Number(sheet.dataset.page),identity:sheet.querySelectorAll('.identity').length,writingLines:[...sheet.querySelectorAll('.ruled')].map(el=>el.querySelectorAll('.writing-line').length),circles:sheet.querySelectorAll('.circle-options').length,clearSurfaceBorders:[...sheet.querySelectorAll('.test-tube.clear .tube-liquid')].map(el=>parseFloat(getComputedStyle(el).borderTopWidth))})));
        if(layout.some(p=>p.identity!==(p.page===1&&['A','C'].includes(p.part)?1:0)||p.writingLines.some(n=>n!==2)))throw new Error('Identity or two-line layout rule failed');
        if(layout.some(p=>p.clearSurfaceBorders.some(width=>width<1)))throw new Error('Clear test-tube liquid surface is missing');
        const filename=`VL1_${part}_${lang}_v${MATERIAL_VERSION}.pdf`,file=path.join(out,filename);
        await page.pdf({path:file,format:'A4',printBackground:true,preferCSSPageSize:true});
        const pages=parts.reduce((n,p)=>n+generated.pages[p].length,0);
        const downloadName=lang==='zh'?`VL1_紙本對照組_${part==='all'?'完整教師列印套裝':part+'_'+labels.names.zh[part]}_繁中_v${MATERIAL_VERSION}.pdf`:`VL1_ControlGroup_${part==='all'?'CompleteTeacherPack':part}_EN_v${MATERIAL_VERSION}.pdf`;
        files[part]={path:'paperwork/generated/'+filename,name:downloadName,pages,bytes:fs.statSync(file).size,sha256:sha(fs.readFileSync(file)),layout};
        console.log(`Built ${lang}/${part}: ${pages} A4 pages`);
      }
      let first=1;
      manifest.languages[lang]={files,ranges:Object.fromEntries(['A','B','C','D'].map(part=>{const range=[first,first+files[part].pages-1];first+=files[part].pages;return [part,range];}))};
    }
    fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    const current=new Set(Object.values(manifest.languages).flatMap(entry=>Object.values(entry.files).map(file=>path.basename(file.path))));
    fs.readdirSync(out).filter(name=>/^VL1_(A|B|C|D|all)_(zh|en)_v\d+\.pdf$/.test(name)&&!current.has(name)).forEach(name=>fs.unlinkSync(path.join(out,name)));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
