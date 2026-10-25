// Isolated teacher download checks; no real student cloud uploads.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const base=process.argv[2]||'http://127.0.0.1:8000';
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.addInitScript(()=>{window.setInterval=()=>0;});
  await page.route('**/cloud-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.VL1_CLOUD_CONFIG={endpoint:''};"}));
  for(const pattern of ['https://script.google.com/**','https://script.googleusercontent.com/**','https://fonts.googleapis.com/**','https://fonts.gstatic.com/**'])await page.route(pattern,r=>r.abort());
  await page.goto(base);await page.waitForFunction(()=>window.VL1Paperwork);
  assert.equal(await page.locator('#openPaperwork').isVisible(),false);
  assert.equal(await page.evaluate(()=>VL1Paperwork.open()),false);assert.equal(await page.evaluate(()=>VL1Paperwork.download('A')),false);
  const built=JSON.parse(fs.readFileSync('paperwork/generated/source.json','utf8'));
  assert.deepEqual(await page.evaluate(()=>({zh:getVL1PaperSource('zh'),en:getVL1PaperSource('en')})),built);
  assert.equal(built.zh.vl.variables.choices.length,7);assert.equal(built.zh.vl.variables.groups.length,3);
  assert.equal(built.zh.vl.assumptions.choices.length,4);assert.equal(built.zh.vl.conclusions.questions.length,3);assert.equal(built.zh.vl.trials.length,6);
  assert.equal(built.zh.vl.control.hint,'（提示：對照組主要功能是作為比較的基準，用來確認實驗中的改變是由獨立變量所引起，而非其他外在因素的干擾，因此對照組不包含獨立變量的處理條件）');
  assert.deepEqual(built.zh.vl.extension.options.map(x=>x.id),['cloudy','clear']);
  assert.equal(built.zh.approach,'explanation-example-guided-independent-check');assert.equal(built.zh.version,'VL1-WS-direct-2');assert.equal(built.zh.materialVersion,7);assert.equal(built.zh.introLines.length,4);assert.equal(built.zh.concepts.length,6);assert.equal(built.zh.practiceMaximum,36);assert.equal(built.zh.questions.length,15);assert.equal(built.zh.mapping.length,15);assert(Math.abs(built.zh.timePlan.reduce((sum,s)=>sum+s.fraction,0)-1)<1e-12);
  assert.equal(await page.evaluate(()=>{try{const vl=getVL1PaperSource('zh').vl;vl.trials[4].outcome='cloudy';VL1ComparisonWorksheet.create(vl,'zh');return false;}catch(e){return /model outcomes changed/.test(e.message);}}),true,'Changed model must require curriculum review.');
  assert.equal(await page.evaluate(()=>{try{const vl=getVL1PaperSource('zh').vl;vl.reference.conclusions.q2='X';VL1ComparisonWorksheet.create(vl,'zh');return false;}catch(e){return /reference answers changed/.test(e.message);}}),true);
  // Extracted words/options are compared directly with the live question DOM.
  for(const q of built.zh.vl.conclusions.questions){
   const actual=await page.locator('#'+q.id+' option').evaluateAll(opts=>opts.filter(o=>o.value).map(o=>({id:o.value,text:o.textContent})).sort((a,b)=>a.id.localeCompare(b.id)));
   assert.deepEqual(q.options,actual);
  }
  await page.evaluate(()=>localStorage.setItem('digestiveLab.localRecords.v1',JSON.stringify([{schemaVersion:2,uiVersion:3,moduleId:'VL_BIO_DIGESTION_OPTION_A',id:'saved-student',profile:{name:'保留原文',classInfo:'X1',email:'paper-test@example.com'},phase2:{hypothesis:{liquid:'X',outcome:'clear',reason:'原始理由'},setup:{description:'原始裝置'}},phase3:{trials:[]},phase4:{conclusions:{},reflection:'學生原文'},durationSeconds:30}])));
  await page.fill('#profileName','Teacher');await page.fill('#profileClass','X1');await page.fill('#profileEmail','tzechingchan0605@gmail.com');await page.click('#profileForm button');await page.waitForSelector('#teacherDialog[open]');
  const snapshot=()=>page.evaluate(()=>({storage:{...localStorage},id:state.id,events:state.events,phase:state.phase,phaseDurations:state.phaseDurations,profile:state.profile,form:readForms(),variables:state.variableChoices,records:state.records}));
  const before=await snapshot();
  const excel=async name=>{const wait=page.waitForEvent('download');await page.click('#exportCsv');const dl=await wait;await dl.saveAs('/tmp/'+name);return fs.readFileSync('/tmp/'+name);};
  const excelBefore=await excel('paper-excel-before.xlsx');
  await page.click('#openPaperwork');await page.waitForFunction(()=>!document.querySelector('[data-paper-download="A"]').disabled);
  assert.equal(await page.locator('#paperPanel .paper-row').first().locator('strong').textContent(),'A · 情境、補充資料與實驗圖');assert.equal(await page.locator('#paperLanguage').inputValue(),'zh');assert.equal(await page.locator('#paperContentVersion').textContent(),built.zh.version);assert.equal(await page.locator('#paperVLVersion').textContent(),built.zh.vlVersion);assert.match(await page.locator('.paper-notice').textContent(),/15–20/);assert.match(await page.locator('.paper-notice').textContent(),/A＋B/);assert.match(await page.locator('[data-paper-preview=\"C\"]').locator('..').locator('..').textContent(),/核對答案及修正/);
  const manifest=JSON.parse(fs.readFileSync('paperwork/generated/manifest.json','utf8'));
  for(const lang of ['zh','en']){
   await page.selectOption('#paperLanguage',lang);
   assert.equal(await page.evaluate(()=>VL1Language.current),'zh','Material selection must not change the app language.');
   for(const part of ['A','B','C','D','all']){
    // Separate user clicks rather than an artificial burst of ten downloads.
    await page.waitForTimeout(1100);
    const wait=page.waitForEvent('download',{timeout:8000});await page.click(`[data-paper-download="${part}"]`);const dl=await wait.catch(async e=>{throw new Error(`${lang}/${part}: ${await page.locator('#paperStatus').textContent()} (${e.message})`);}),file=manifest.languages[lang].files[part];
    assert.equal(dl.suggestedFilename(),file.name);const filename=`/tmp/paper-${lang}-${part}.pdf`;await dl.saveAs(filename);
    const bytes=fs.readFileSync(filename);assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert.equal(sha(bytes),file.sha256);
   }
  }
  await page.click('[data-paper-preview="A"]');await page.waitForFunction(()=>document.querySelector('#paperPreview').src.startsWith('blob:'));
  assert(await page.locator('#paperPreview').isVisible());assert.deepEqual(await snapshot(),before);
  assert.deepEqual(await excel('paper-excel-after.xlsx'),excelBefore,'Blank material downloads changed actual exported teacher Excel.');
  await page.click('#teacherLanguageSwitch');assert.equal(await page.evaluate(()=>VL1Language.current),'en');
  await page.click('#closePaperwork');await page.click('#openPaperwork');await page.waitForFunction(()=>!document.querySelector('[data-paper-download="A"]').disabled);assert.equal(await page.locator('#paperLanguage').inputValue(),'en');
  assert.equal(await page.evaluate(()=>JSON.stringify({zh:getVL1PaperSource('zh'),en:getVL1PaperSource('en')})),JSON.stringify(built),'App translation changed the canonical paper source.');
  // Fail closed for stale source versions, then recover without losing records.
  await page.route('**/paperwork/generated/manifest.json',r=>r.fulfill({json:{...manifest,sourceDigest:'0'.repeat(64)}}));
  assert.equal(await page.evaluate(()=>VL1Paperwork.open()),false);assert(await page.locator('[data-paper-download="A"]').isDisabled());assert.equal(await page.evaluate(()=>VL1Paperwork.download('A')),false);
  await page.unroute('**/paperwork/generated/manifest.json');
  await page.route('**/paperwork/generated/manifest.json',r=>r.fulfill({json:{...manifest,materialVersion:6}}));assert.equal(await page.evaluate(()=>VL1Paperwork.open()),false);
  await page.unroute('**/paperwork/generated/manifest.json');assert.equal(await page.evaluate(()=>VL1Paperwork.open()),true);
  await page.route('**/'+manifest.languages.en.files.A.path,r=>r.fulfill({contentType:'application/pdf',body:'broken PDF'}));
  assert.equal(await page.evaluate(()=>VL1Paperwork.download('A')),false);assert.match(await page.locator('#paperStatus').textContent(),/download failed/i);
  await page.unroute('**/'+manifest.languages.en.files.A.path);
  // Teacher demonstration does not have to be completed before material access.
  await page.click('#closePaperwork');await page.click('#teacherDemo');await page.fill('#initialObservation','Oil and water');await page.click('[data-next="2"]');await page.fill('#reason','Demo idea');
  const demoBefore=await snapshot();await page.click('#teacherButton');await page.click('#openPaperwork');await page.waitForFunction(()=>!document.querySelector('[data-paper-download="A"]').disabled);
  const wait=page.waitForEvent('download');await page.click('[data-paper-download="C"]');await wait;
  assert.deepEqual(await snapshot(),demoBefore,'Material generation changed an editable demonstration.');
  for(const width of [390,320]){await page.setViewportSize({width,height:844});assert(await page.locator('.teacher-panel').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Teacher material panel overflows on mobile.');assert(await page.locator('#paperLanguage').isVisible());}
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS: reviewed model, direct self-study curriculum/mapping/time rules, preserved VL questions/options, ten actual PDF downloads/names/checksums, preview, zh/en material selection, unchanged storage/answers/time/events/Excel/demo, teacher-only guard, stale/corrupt failure handling and mobile layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
