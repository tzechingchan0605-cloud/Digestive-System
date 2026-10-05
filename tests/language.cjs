// Presentation-only language changes must preserve canonical research records.
// All cloud traffic is disabled: this suite never uploads test student data.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.argv[2]||'http://127.0.0.1:8000';
const recordsKey='digestiveLab.localRecords.v1';

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const errors=[];
 try{
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  async function openPage(ctx=context){
   const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.route('**/cloud-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.VL1_CLOUD_CONFIG={endpoint:''};"}));
   for(const host of ['https://script.google.com/**','https://script.googleusercontent.com/**','https://fonts.googleapis.com/**','https://fonts.gstatic.com/**'])await page.route(host,r=>r.abort());
   await page.goto(base);await page.waitForFunction(()=>window.VL1Language);return page;
  }
  const page=await openPage();
  async function switchLanguage(code,expected){
   await page.click('#languageSwitch');await page.fill('#languageCode',code);await page.click('#languageConfirm');
   await page.waitForFunction(expected=>window.VL1Language.current===expected,expected);
   await page.waitForFunction(()=>!document.querySelector('#languageDialog').open);
  }
  async function stableSnapshot(){return page.evaluate(()=>({
   id:state.id,profile:state.profile,phase:state.phase,unlocked:state.unlocked,optionOrder:state.optionOrder,
   initialDesign:state.initialDesign,finalAnswers:state.finalAnswers,firstObservations:state.firstObservations,
   trials:state.records,variables:state.variableChoices,assumptions:state.assumptions,events:state.events,
   liquid:state.liquid,selectedObservation:state.selectedObservation,experimentHasRun:state.experimentHasRun,
   extensionHeat:state.extensionHeat,extensionObservation:state.extensionObservation,extensionHasRun:state.extensionHasRun,
   running:state.running,extensionRunning:state.extensionRunning,
   setup:{made:state.setupMade,saved:state.setupSaved,method:state.setupMethod,image:state.setupImage,canvas:document.querySelector('#setupCanvas').toDataURL()},
   submitted:state.submitted,submittedAt:state.submittedAt,reflectionSubmittedAt:state.reflectionSubmittedAt,
   forms:readForms(),optionValues:Object.fromEntries(['hypothesisLiquid','hypothesisOutcome','q1','q2','q3','limitations'].map(id=>[id,[...document.querySelector('#'+id).options].map(o=>o.value)])),
   variableValues:[...document.querySelectorAll('[data-variable]')].map(el=>el.dataset.variable),
   assumptionValues:[...document.querySelectorAll('#assumptionChoices input')].map(el=>el.value),
   locks:[...document.querySelectorAll('.phase input,.phase textarea,.phase select,.phase button')].map(el=>({id:el.id,value:el.value,disabled:el.disabled})),
  }));}
  async function exportFrozen(path){
   const downloadPromise=page.waitForEvent('download');
   await page.evaluate(async key=>{
    clearTimeout(saveTimer);localStorage.setItem(key,JSON.stringify([window.__languageFrozen]));
    const profile=state.profile;state.profile={...profile,email:TEACHER_EMAIL};
    try{await exportExcel();}finally{state.profile=profile;}
   },recordsKey);
   await(await downloadPromise).saveAs(path);return fs.readFileSync(path);
  }

  assert.equal(await page.evaluate(()=>VL1Language.current),'zh');
  assert.equal(await page.locator('#profileTitle').innerText(),'開始你的探究');
  assert((await page.locator('html').getAttribute('lang')).startsWith('zh'));
  assert(await page.locator('#languageSwitch').isVisible());
  await page.click('#languageSwitch');await page.fill('#languageCode','emi');await page.click('#languageConfirm');
  assert.equal(await page.evaluate(()=>VL1Language.current),'zh');assert((await page.locator('#languageError').innerText()).trim());
  await page.click('#languageCancel');assert.equal(await page.locator('#languageDialog').evaluate(el=>el.open),false);
  await page.click('#languageSwitch');await page.fill('#languageCode','EMI');await page.keyboard.press('Escape');
  assert.equal(await page.locator('#languageDialog').evaluate(el=>el.open),false);assert.equal(await page.evaluate(()=>VL1Language.current),'zh');
  await switchLanguage(' EMI ','en');
  assert.match(await page.locator('#profileTitle').innerText(),/start|begin/i);assert((await page.locator('html').getAttribute('lang')).startsWith('en'));
  assert.match(await page.locator('#profileName').getAttribute('placeholder'),/[A-Za-z]/);
  await switchLanguage('CMI','zh');assert.equal(await page.locator('#profileTitle').innerText(),'開始你的探究');

  // Free answers deliberately match UI dictionary entries; they are student text.
  await page.fill('#profileName','同學');await page.fill('#profileClass','S4X1-05');await page.fill('#profileEmail','language@example.com');await page.click('#profileForm button');
  await page.fill('#initialObservation','變得混濁');await page.click('[data-next="2"]');
  await page.selectOption('#hypothesisLiquid','X');await page.selectOption('#hypothesisOutcome','cloudy');await page.fill('#reason','開始實驗');
  for(const [group,names]of Object.entries({iv:['消化液組合'],dv:['混合物外觀'],cv:['油和水總體積','反應溫度','反應時間','加液總量','搖勻方式']}))for(const name of names)await page.click(`[data-group="${group}"][data-variable="${name}"]`);
  for(const value of ['time','volume','mixing'])await page.check(`#assumptionChoices input[value="${value}"]`);
  await page.fill('#controlPlan','探究的對照組');await page.fill('#setupDescription','實驗裝置');
  const canvasBox=await page.locator('#setupCanvas').boundingBox();
  await page.mouse.move(canvasBox.x+40,canvasBox.y+40);await page.mouse.down();await page.mouse.move(canvasBox.x+100,canvasBox.y+70,{steps:8});await page.mouse.up();await page.click('#saveSetup');
  await page.click('[data-next="3"]');
  await page.click('#runExperiment');await page.waitForFunction(()=>state.experimentHasRun);
  await page.click('[data-observation="clear"]');await page.click('#recordData');
  await page.evaluate(()=>{clearTimeout(saveTimer);accountTime();timingVisible=false;window.__languageFrozen=saveRecord();});
  const before=await stableSnapshot();assert(before.initialDesign);assert(/^data:image\/(?:png|jpeg);base64,/.test(before.setup.image));assert.equal(before.trials.length,1);
  const workbookZh=await exportFrozen('/tmp/vl1-language-zh.xlsx');
  await switchLanguage('EMI','en');
  await page.waitForFunction(()=>/[A-Za-z]/.test(document.querySelector('#variableQuiz h4').textContent));
  assert.deepEqual(await stableSnapshot(),before,'Switching language changed answers, original evidence, drawing, ordering, or investigation state.');
  assert.match(await page.locator('#variableQuiz h4').first().innerText(),/independent/i);
  assert.match(await page.locator('#variableQuiz h4').first().innerText(),/獨立變量/);
  assert.match(await page.locator('#assumptionChoices label').first().innerText(),/[A-Za-z]/);
  assert.match(await page.locator('#hypothesisOutcome option[value="cloudy"]').innerText(),/cloudy/i);
  await page.evaluate(()=>{renderTable();renderEvidence();refreshDesignGate();});
  await page.waitForFunction(()=>/add/i.test(document.querySelector('#dataBody td:nth-child(2)').textContent));
  assert.match(await page.locator('#variableFeedback').innerText(),/recorded/i);
  assert.equal(await page.locator('#initialObservation').inputValue(),'變得混濁');assert.equal(await page.locator('#reason').inputValue(),'開始實驗');assert.equal(await page.locator('#studentName').innerText(),'同學');
  assert.equal(await page.evaluate(()=>answerText('q1','cloudy')),'混濁乳狀液','Excel answer text must remain canonical Chinese.');
  const workbookEn=await exportFrozen('/tmp/vl1-language-en.xlsx');assert(workbookZh.equals(workbookEn),'Actual teacher XLSX bytes changed with display language.');
  await switchLanguage('CMI','zh');assert.deepEqual(await stableSnapshot(),before);assert.equal(await page.locator('#hypothesisOutcome option[value="cloudy"]').innerText(),'變得混濁');

  // Prepare the remaining observed trials with the real canonical schema. Run
  // submission/reflection handlers to verify all existing locks survive a switch.
  await page.evaluate(()=>{
   clearTimeout(saveTimer);const at='2026-10-05T04:00:00Z';
   state.records=trialKeys.map(key=>{const [liquid,heat]=key.split('-'),studentObservation=experiments[key][0];return{key,liquid,heat,studentObservation,studentLabel:outcomeLabels[studentObservation],actual:studentObservation,correct:true,at};});
   state.firstObservations=Object.fromEntries(state.records.map(r=>[r.key,structuredClone(r)]));
   state.unlocked=4;renderTable();renderExtensionTable();updateUnlock();setPhase(4);
  });
  for(const [id,value]of Object.entries({q1:'cloudy',q3:'increase',limitations:'indirect',q2:'Y'}))await page.selectOption('#'+id,value);
  await page.click('#revealConcept');assert(await page.locator('#reason').isDisabled());assert.equal(await page.locator('#reflection').isDisabled(),false);assert(await page.locator('#downloadRecord').isDisabled());
  await page.fill('#reflection','學習重點');await page.click('#saveReflection');
  assert(await page.locator('#reflection').isDisabled());assert.equal(await page.locator('#downloadRecord').isDisabled(),false);
  await page.evaluate(()=>{clearTimeout(saveTimer);window.__languageSubmitted=buildRecord();});
  const submitted=await stableSnapshot();
  await switchLanguage('EMI','en');assert.deepEqual(await stableSnapshot(),submitted);assert(await page.locator('#reflection').isDisabled());
  assert.equal(await page.locator('#conceptReveal .physical-diagram picture img').getAttribute('src'),'assets/emulsification-en.svg');
  assert.equal(await page.locator('#conceptReveal .physical-diagram picture source').getAttribute('srcset'),'assets/emulsification-mobile-en.svg');
  assert.deepEqual(await page.locator('#conceptReveal .chemical-diagram img').evaluateAll(imgs=>imgs.map(img=>img.getAttribute('src'))),['assets/triglyceride-structure-en.svg','assets/glycerol-structure-en.svg','assets/fatty-acids-structure-en.svg']);
  await page.evaluate(()=>renderPrint(window.__languageSubmitted));
  assert.match(await page.locator('#printReport h1').innerText(),/digestive|digestion/i);
  assert.match(await page.locator('#printReport .report-stage h2').first().innerText(),/context|scenario/i);
  const englishParagraphs=await page.locator('#printReport .report-answer p').allTextContents();
  for(const answer of ['變得混濁','開始實驗','探究的對照組','實驗裝置','學習重點'])assert(englishParagraphs.includes(answer),`Student answer was translated in English PDF: ${answer}`);
  assert.match(await page.locator('#printReport .concept-summary h3').innerText(),/learning/i);
  assert.equal(await page.locator('#printReport .physical-diagram picture img').getAttribute('src'),'assets/emulsification-en.svg');
  await page.waitForFunction(()=>[...document.querySelectorAll('#printReport img')].every(img=>img.complete&&img.naturalWidth>0));
  await page.evaluate(()=>document.body.classList.add('print-record'));await page.pdf({path:'/tmp/vl1-language-en.pdf',format:'A4',printBackground:true});await page.evaluate(()=>restorePrint());
  assert(fs.statSync('/tmp/vl1-language-en.pdf').size>10000);
  await switchLanguage('CMI','zh');assert.deepEqual(await stableSnapshot(),submitted);
  assert.equal(await page.locator('#conceptReveal .physical-diagram picture img').getAttribute('src'),'assets/emulsification.svg');
  assert.equal(await page.locator('#conceptReveal .physical-diagram picture source').getAttribute('srcset'),'assets/emulsification-mobile.svg');
  assert.deepEqual(await page.locator('#conceptReveal .chemical-diagram img').evaluateAll(imgs=>imgs.map(img=>img.getAttribute('src'))),['assets/triglyceride-structure.svg','assets/glycerol-structure.svg','assets/fatty-acids-structure.svg']);
  await page.evaluate(()=>renderPrint(window.__languageSubmitted));assert.equal(await page.locator('#printReport h1').innerText(),'未知消化液 X 與 Y');
  const chineseParagraphs=await page.locator('#printReport .report-answer p').allTextContents();for(const answer of ['變得混濁','開始實驗','探究的對照組','實驗裝置','學習重點'])assert(chineseParagraphs.includes(answer));
  assert.equal(await page.locator('#printReport .physical-diagram picture img').getAttribute('src'),'assets/emulsification.svg');
  await page.waitForFunction(()=>[...document.querySelectorAll('#printReport img')].every(img=>img.complete&&img.naturalWidth>0));
  await page.evaluate(()=>document.body.classList.add('print-record'));await page.pdf({path:'/tmp/vl1-language-zh.pdf',format:'A4',printBackground:true});await page.evaluate(()=>restorePrint());
  assert(fs.statSync('/tmp/vl1-language-zh.pdf').size>10000);
  await switchLanguage('EMI','en');
  for(const width of [390,320]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`English conclusions/learning diagrams overflow at ${width}px.`);}
  await page.setViewportSize({width:1440,height:1000});
  await page.reload();await page.waitForFunction(()=>window.VL1Language);
  assert.equal(await page.evaluate(()=>VL1Language.current),'zh');assert.equal(await page.locator('#profileEmail').inputValue(),'');
  assert(await page.evaluate(({key,id})=>JSON.parse(localStorage.getItem(key)).some(r=>r.id===id),{key:recordsKey,id:submitted.id}),'Reload removed the previous investigation.');
  await page.fill('#profileName','Teacher');await page.fill('#profileClass','S4');await page.fill('#profileEmail','tzechingchan0605@gmail.com');await page.click('#profileForm button');
  await page.waitForFunction(()=>document.querySelector('#teacherDialog').open);
  const teacherRecordsBefore=await page.evaluate(key=>localStorage.getItem(key),recordsKey);
  await page.click('#teacherLanguageSwitch');await page.fill('#languageCode','EMI');await page.click('#languageConfirm');await page.waitForFunction(()=>VL1Language.current==='en');
  assert.equal(await page.locator('#teacherDialog').evaluate(el=>el.open),true,'Switching language closed the teacher dashboard.');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),recordsKey),teacherRecordsBefore,'Teacher language switch changed stored student data.');
  assert.equal(await page.locator('#teacherData strong').first().innerText(),'同學');

  const freshContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const mobile=await openPage(freshContext);
  assert.equal(await mobile.evaluate(()=>VL1Language.current),'zh');
  await mobile.click('#languageSwitch');await mobile.fill('#languageCode','EMI');await mobile.click('#languageConfirm');await mobile.waitForFunction(()=>VL1Language.current==='en');
  for(const width of [390,320]){
   await mobile.setViewportSize({width,height:844});
   assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`English mobile page overflows at ${width}px.`);
   const b=await mobile.locator('#languageSwitch').boundingBox();assert(b&&b.x>=0&&b.x+b.width<=width+1&&b.y>=0&&b.y<100,'Top-right language button is outside the mobile viewport.');
   await mobile.click('#languageSwitch');assert(await mobile.locator('#languageCode').isVisible());await mobile.click('#languageCancel');
  }
  await mobile.fill('#profileName','Mobile');await mobile.fill('#profileClass','S4');await mobile.fill('#profileEmail','mobile-language@example.com');await mobile.click('#profileForm button');
  await mobile.fill('#initialObservation','Oil floats above the water.');await mobile.click('[data-next="2"]');
  for(const width of [390,320]){await mobile.setViewportSize({width,height:844});assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`English design cards overflow at ${width}px.`);}
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS: CMI/EMI gate, cancel/wrong codes, Chinese defaults, unchanged canonical answers/IDs/order/drawings/trials/locks, byte-identical teacher XLSX, dynamic English UI, loaded bilingual diagrams/PDF with original free answers, teacher-modal and mobile language access.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
