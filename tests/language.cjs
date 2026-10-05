// Presentation-only language changes must preserve canonical research records.
// All cloud traffic is disabled: this suite never uploads test student data.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.argv[2]||'http://127.0.0.1:8000';
const recordsKey='digestiveLab.localRecords.v1';
const approvedChinese=new Set(['乳化作用','乳化脂質','乳狀液','物理消化','化學消化','甘油','脂肪酸','變性','甘油三酯','催化劑','膽汁','脂肪酶']);
const englishSVGs=['emulsification-en.svg','emulsification-mobile-en.svg','triglyceride-structure-en.svg','glycerol-structure-en.svg','fatty-acids-structure-en.svg'];
function assertApprovedChinese(entries,label){
 for(const {source,text}of entries){
  const qualifiers=[...text.matchAll(/[（(]([^（）()]*)[）)]/g)];
  const outside=text.replace(/[（(]([^（）()]*)[）)]/g,'');
  assert(!/[\u3400-\u9fff]/.test(outside),`${label}: Chinese support outside parentheses in ${source}: ${text}`);
  for(const [,qualifier]of qualifiers)for(const word of qualifier.match(/[\u3400-\u9fff]+/g)||[])assert(approvedChinese.has(word),`${label}: unapproved Chinese support ${word} in ${source}: ${text}`);
 }
}

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
  const chinesePlaceholders=await page.locator('input,textarea').evaluateAll(els=>els.map(el=>({id:el.id,tag:el.tagName,placeholder:el.getAttribute('placeholder')})));
  async function assertPlaceholders(language){
   const current=await page.locator('input,textarea').evaluateAll(els=>els.map(el=>({id:el.id,tag:el.tagName,placeholder:el.getAttribute('placeholder')})));
   assert.equal(current.length,chinesePlaceholders.length);
   current.forEach((item,i)=>{
    const original=chinesePlaceholders[i];assert.equal(item.id,original.id);assert.equal(item.tag,original.tag);
    if(language==='zh'||!original.placeholder)assert.equal(item.placeholder,original.placeholder,`${item.id} placeholder did not restore its Chinese source.`);
    else{assert.match(item.placeholder,/[A-Za-z]/,`${item.id} placeholder is not English.`);assert(!/[\u3400-\u9fff]/.test(item.placeholder),`${item.id} placeholder still contains Chinese.`);if(/[\u3400-\u9fff]/.test(original.placeholder))assert.notEqual(item.placeholder,original.placeholder);}
   });
   assert.equal(await page.locator('#initialObservation').getAttribute('placeholder'),language==='en'?'I observe that…':'我觀察到……');
   // Reflection has no placeholder; its label and student's value are separate.
   assert.equal(await page.locator('#reflection').getAttribute('placeholder'),null);
  }
  async function assertEnglishSystemText(){
   const entries=await page.evaluate(()=>{
    const results=[],skip='script,style,[data-language-user]',walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())){if(node.parentElement.closest(skip+',textarea'))continue;const text=node.textContent.trim();if(text)results.push({source:`${node.parentElement.tagName}#${node.parentElement.id}`,text});}
    for(const el of document.querySelectorAll('*')){if(el.closest(skip))continue;for(const name of ['alt','title','aria-label','placeholder']){const text=el.getAttribute(name);if(text)results.push({source:`${el.tagName}#${el.id}[${name}]`,text});}}
    results.push({source:'document.title',text:document.title});return results;
   });
   assertApprovedChinese(entries,'English UI/report/accessibility');
  }
  async function assertEnglishSVGText(){
   const assets=englishSVGs.map(name=>({name,xml:fs.readFileSync(path.join(__dirname,'..','assets',name),'utf8')}));
   const entries=await page.evaluate(assets=>assets.flatMap(({name,xml})=>{
    const doc=new DOMParser().parseFromString(xml,'image/svg+xml');if(doc.querySelector('parsererror'))throw new Error(`Invalid SVG XML: ${name}`);
    const results=[],walker=doc.createTreeWalker(doc,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())){const text=node.textContent.trim();if(text)results.push({source:`${name}:${node.parentElement.tagName}`,text});}
    for(const el of doc.querySelectorAll('*'))for(const attribute of ['title','aria-label']){const text=el.getAttribute(attribute);if(text)results.push({source:`${name}:${attribute}`,text});}return results;
   }),assets);
   assertApprovedChinese(entries,'English SVG');
  }
  async function switchLanguage(expected,target=page,button='#languageSwitch'){
   await target.click(button);
   assert.equal(await target.evaluate(()=>window.VL1Language.current),expected,'One click must switch the language immediately.');
   const expectedLabel=expected==='en'?'Switch to Chinese':'切換至英文';
   for(const label of await target.locator('[data-language-switch]').allTextContents())assert.equal(label,expectedLabel,'The language button must name its target language.');
   const references=await target.locator('[data-language-switch]').evaluateAll(buttons=>buttons.map(button=>({popup:button.getAttribute('aria-haspopup'),controls:button.getAttribute('aria-controls')})));
   assert(references.every(({popup,controls})=>popup!=='dialog'&&controls!=='languageDialog'),'Language buttons must not advertise a removed dialog.');
   assert.equal(await target.locator('#languageDialog,#languageCode,#languageForm,#languageConfirm,#languageCancel').count(),0,'Language switching must not contain a code field or confirmation dialog.');
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
   forms:readForms(),textareaDefaults:Object.fromEntries([...document.querySelectorAll('textarea')].map(el=>[el.id,el.defaultValue])),optionValues:Object.fromEntries(['hypothesisLiquid','hypothesisOutcome','q1','q2','q3','limitations'].map(id=>[id,[...document.querySelector('#'+id).options].map(o=>o.value)])),
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
  await assertPlaceholders('zh');
  assert.equal(await page.locator('#profileTitle').innerText(),'開始你的探究');
  assert((await page.locator('html').getAttribute('lang')).startsWith('zh'));
  assert(await page.locator('#languageSwitch').isVisible());
  assert.equal(await page.locator('#languageSwitch').innerText(),'切換至英文');
  assert.equal(await page.locator('#languageDialog,#languageCode').count(),0);
  const blankState=await stableSnapshot();
  for(const expected of ['en','zh','en','zh']){await switchLanguage(expected);assert.deepEqual(await stableSnapshot(),blankState,'Repeated one-click toggles changed the blank investigation.');}
  await switchLanguage('en');
  assert.match(await page.locator('#profileTitle').innerText(),/start|begin/i);assert((await page.locator('html').getAttribute('lang')).startsWith('en'));
  assert.match(await page.locator('#profileName').getAttribute('placeholder'),/[A-Za-z]/);
  await assertPlaceholders('en');await assertEnglishSystemText();await assertEnglishSVGText();
  await switchLanguage('zh');assert.equal(await page.locator('#profileTitle').innerText(),'開始你的探究');
  await assertPlaceholders('zh');

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
  await page.evaluate(()=>{document.querySelector('#initialObservation').defaultValue='變得混濁';document.querySelector('#reason').defaultValue='開始實驗';});
  await page.evaluate(()=>{clearTimeout(saveTimer);accountTime();timingVisible=false;window.__languageFrozen=saveRecord();});
  const before=await stableSnapshot();assert(before.initialDesign);assert(/^data:image\/(?:png|jpeg);base64,/.test(before.setup.image));assert.equal(before.trials.length,1);
  const workbookZh=await exportFrozen('/tmp/vl1-language-zh.xlsx');
  await switchLanguage('en');
  await page.waitForFunction(()=>/[A-Za-z]/.test(document.querySelector('#variableQuiz h4').textContent));
  assert.deepEqual(await stableSnapshot(),before,'Switching language changed answers, original evidence, drawing, ordering, or investigation state.');
  assert.match(await page.locator('#variableQuiz h4').first().innerText(),/independent/i);
  assert.match(await page.locator('#variableQuiz h4').first().innerText(),/the factor changed on purpose/i);
  for(const text of await page.locator('#variableQuiz h4').allTextContents())assert(!/[\u3400-\u9fff]/.test(text),'Variable labels/definitions must not have Chinese support.');
  await assertPlaceholders('en');await assertEnglishSystemText();
  assert.match(await page.locator('#assumptionChoices label').first().innerText(),/[A-Za-z]/);
  assert.match(await page.locator('#hypothesisOutcome option[value="cloudy"]').innerText(),/cloudy/i);
  await page.evaluate(()=>{renderTable();renderEvidence();refreshDesignGate();});
  await page.waitForFunction(()=>/add/i.test(document.querySelector('#dataBody td:nth-child(2)').textContent));
  assert.match(await page.locator('#variableFeedback').innerText(),/recorded|saved/i);
  assert.equal(await page.locator('#initialObservation').inputValue(),'變得混濁');assert.equal(await page.locator('#reason').inputValue(),'開始實驗');assert.equal(await page.locator('#studentName').innerText(),'同學');
  assert.equal(await page.evaluate(()=>answerText('q1','cloudy')),'混濁乳狀液','Excel answer text must remain canonical Chinese.');
  const workbookEn=await exportFrozen('/tmp/vl1-language-en.xlsx');assert(workbookZh.equals(workbookEn),'Actual teacher XLSX bytes changed with display language.');
  await switchLanguage('zh');assert.deepEqual(await stableSnapshot(),before);assert.equal(await page.locator('#hypothesisOutcome option[value="cloudy"]').innerText(),'變得混濁');
  await assertPlaceholders('zh');
  await page.evaluate(()=>{for(let i=0;i<6;i++)document.querySelector('#languageSwitch').click();});
  assert.equal(await page.evaluate(()=>VL1Language.current),'zh');assert.equal(await page.locator('#languageSwitch').innerText(),'切換至英文');
  assert.deepEqual(await stableSnapshot(),before,'Rapid repeated toggles changed a populated investigation.');
  await assertPlaceholders('zh');

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
  await switchLanguage('en');assert.deepEqual(await stableSnapshot(),submitted);assert(await page.locator('#reflection').isDisabled());
  await assertPlaceholders('en');await assertEnglishSystemText();
  assert.equal(await page.locator('#conceptReveal .physical-diagram picture img').getAttribute('src'),'assets/emulsification-en.svg?v=3');
  assert.equal(await page.locator('#conceptReveal .physical-diagram picture source').getAttribute('srcset'),'assets/emulsification-mobile-en.svg?v=3');
  assert.deepEqual(await page.locator('#conceptReveal .chemical-diagram img').evaluateAll(imgs=>imgs.map(img=>img.getAttribute('src'))),['assets/triglyceride-structure-en.svg?v=3','assets/glycerol-structure-en.svg?v=3','assets/fatty-acids-structure-en.svg?v=3']);
  await page.evaluate(()=>renderPrint(window.__languageSubmitted));
  assert.match(await page.locator('#printReport h1').innerText(),/digestive|digestion/i);
  assert.match(await page.locator('#printReport .report-stage h2').first().innerText(),/context|scenario|task|background/i);
  const englishParagraphs=await page.locator('#printReport .report-answer p').allTextContents();
  for(const answer of ['變得混濁','開始實驗','探究的對照組','實驗裝置','學習重點'])assert(englishParagraphs.includes(answer),`Student answer was translated in English PDF: ${answer}`);
  assert.match(await page.locator('#printReport .concept-summary h3').innerText(),/learning/i);
  await assertEnglishSystemText();
  assert.equal(await page.locator('#printReport .physical-diagram picture img').getAttribute('src'),'assets/emulsification-en.svg?v=3');
  await page.waitForFunction(()=>[...document.querySelectorAll('#printReport img')].every(img=>img.complete&&img.naturalWidth>0));
  await page.evaluate(()=>document.body.classList.add('print-record'));await page.pdf({path:'/tmp/vl1-language-en.pdf',format:'A4',printBackground:true});await page.evaluate(()=>restorePrint());
  assert(fs.statSync('/tmp/vl1-language-en.pdf').size>10000);
  await switchLanguage('zh');assert.deepEqual(await stableSnapshot(),submitted);
  await assertPlaceholders('zh');
  assert.equal(await page.locator('#conceptReveal .physical-diagram picture img').getAttribute('src'),'assets/emulsification.svg');
  assert.equal(await page.locator('#conceptReveal .physical-diagram picture source').getAttribute('srcset'),'assets/emulsification-mobile.svg');
  assert.deepEqual(await page.locator('#conceptReveal .chemical-diagram img').evaluateAll(imgs=>imgs.map(img=>img.getAttribute('src'))),['assets/triglyceride-structure.svg','assets/glycerol-structure.svg','assets/fatty-acids-structure.svg']);
  await page.evaluate(()=>renderPrint(window.__languageSubmitted));assert.equal(await page.locator('#printReport h1').innerText(),'未知消化液 X 與 Y');
  const chineseParagraphs=await page.locator('#printReport .report-answer p').allTextContents();for(const answer of ['變得混濁','開始實驗','探究的對照組','實驗裝置','學習重點'])assert(chineseParagraphs.includes(answer));
  assert.equal(await page.locator('#printReport .physical-diagram picture img').getAttribute('src'),'assets/emulsification.svg');
  await page.waitForFunction(()=>[...document.querySelectorAll('#printReport img')].every(img=>img.complete&&img.naturalWidth>0));
  await page.evaluate(()=>document.body.classList.add('print-record'));await page.pdf({path:'/tmp/vl1-language-zh.pdf',format:'A4',printBackground:true});await page.evaluate(()=>restorePrint());
  assert(fs.statSync('/tmp/vl1-language-zh.pdf').size>10000);
  await switchLanguage('en');
  for(const width of [390,320]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`English conclusions/learning diagrams overflow at ${width}px.`);}
  await page.setViewportSize({width:1440,height:1000});
  await page.reload();await page.waitForFunction(()=>window.VL1Language);
  assert.equal(await page.evaluate(()=>VL1Language.current),'zh');assert.equal(await page.locator('#profileEmail').inputValue(),'');
  assert(await page.evaluate(({key,id})=>JSON.parse(localStorage.getItem(key)).some(r=>r.id===id),{key:recordsKey,id:submitted.id}),'Reload removed the previous investigation.');
  await page.fill('#profileName','Teacher');await page.fill('#profileClass','S4');await page.fill('#profileEmail','tzechingchan0605@gmail.com');await page.click('#profileForm button');
  await page.waitForFunction(()=>document.querySelector('#teacherDialog').open);
  const teacherRecordsBefore=await page.evaluate(key=>localStorage.getItem(key),recordsKey);
  await switchLanguage('en',page,'#teacherLanguageSwitch');
  assert.equal(await page.locator('#teacherDialog').evaluate(el=>el.open),true,'Switching language closed the teacher dashboard.');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),recordsKey),teacherRecordsBefore,'Teacher language switch changed stored student data.');
  assert.equal(await page.locator('#teacherData strong').first().innerText(),'同學');
  await assertEnglishSystemText();

  const freshContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const mobile=await openPage(freshContext);
  assert.equal(await mobile.evaluate(()=>VL1Language.current),'zh');
  assert.equal(await mobile.locator('#languageSwitch').innerText(),'切換至英文');
  await switchLanguage('en',mobile);
  for(const width of [390,320]){
   await mobile.setViewportSize({width,height:844});
   assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`English mobile page overflows at ${width}px.`);
   const b=await mobile.locator('#languageSwitch').boundingBox();assert(b&&b.x>=0&&b.x+b.width<=width+1&&b.y>=0&&b.y<100,'Top-right language button is outside the mobile viewport.');
   await switchLanguage('zh',mobile);await switchLanguage('en',mobile);
  }
  await mobile.fill('#profileName','Mobile');await mobile.fill('#profileClass','S4');await mobile.fill('#profileEmail','mobile-language@example.com');await mobile.click('#profileForm button');
  await mobile.fill('#initialObservation','Oil floats above the water.');await mobile.click('[data-next="2"]');
  for(const width of [390,320]){await mobile.setViewportSize({width,height:844});assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`English design cards overflow at ${width}px.`);}
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS: immediate one-click language switching/target labels/Chinese defaults, no code dialog, translated/restored input and textarea placeholders, original user values/defaults and research records/locks, byte-identical teacher XLSX, approved-only Chinese support in English UI/accessibility/SVGs, v3 diagrams/PDF, teacher-modal and mobile language access.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
