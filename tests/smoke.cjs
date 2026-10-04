// Run against the static server: node tests/smoke.cjs [base URL].
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.argv[2]||'http://127.0.0.1:8000';
const RECORDS='digestiveLab.localRecords.v1';
const errors=[];
async function login(page,email='student@example.com',name='陳小明',classInfo='S4/01') {
  await page.fill('#profileName',name);await page.fill('#profileClass',classInfo);await page.fill('#profileEmail',email);await page.click('#profileForm button');
}
async function design(page,{draw=false,badAssumptions=false}={}) {
  await page.fill('#initialObservation','油和水分成兩層，黃色油層在上方。');await page.click('[data-next="2"]');
  await page.selectOption('#hypothesisLiquid','X');await page.selectOption('#hypothesisOutcome','clear');await page.fill('#reason','我預測 X 會令油水混合物變清澈。');
  for(const [g,values] of [['iv',['消化液組合']],['dv',['混合物外觀']],['cv',['油和水總體積','反應溫度','反應時間','加液總量','搖勻方式']]])for(const value of values)await page.click(`[data-group="${g}"][data-variable="${value}"]`);
  for(const value of ['time','volume','mixing'])await page.check(`#assumptionChoices input[value="${value}"]`);
  if(badAssumptions)await page.check('#assumptionChoices input[value="more"]');
  await page.fill('#controlPlan','油水加2 mL水作對照；與X、Y、XY比較，油水量、加液量、37°C、時間及搖勻方式相同。');
  if(draw){await page.locator('#setupCanvas').scrollIntoViewIfNeeded();const box=await page.locator('#setupCanvas').boundingBox();await page.mouse.move(box.x+30,box.y+30);await page.mouse.down();await page.mouse.move(box.x+120,box.y+120,{steps:6});await page.mouse.up();await page.click('#saveSetup');}
  else {await page.fill('#setupDescription','四個標示裝置：對照加2 mL水、X加2 mL、Y加2 mL、XY各1 mL，保持油水量、溫度、時間及搖勻方式相同；熱處理後冷卻至37°C。');await page.click('#saveTextSetup');}
  await page.click('#saveHypothesis');await page.waitForSelector('#phase-3.active');
}
async function trial(page,liquid,outcome) {
  await page.click(`[data-liquid="${liquid}"]`);await page.click('#runExperiment');
  assert(await page.locator('#recordData').isDisabled());assert(await page.locator('[data-liquid="X"]').isDisabled());
  await page.waitForFunction(()=>!document.querySelector('[data-observation="clear"]').disabled);
  await page.click(`[data-observation="${outcome}"]`);await page.click('#recordData');
  await page.waitForFunction(()=>window.scrollTargets.at(-1)==='observationTable'&&document.querySelector('#observationTable').getBoundingClientRect().top<innerHeight&&document.querySelector('#observationTable').getBoundingClientRect().bottom>0);
}
async function finish(page,{revision=false}={}) {
  if(revision){await trial(page,'X','clear');await trial(page,'X','cloudy');await page.click('[data-back="2"]');await page.selectOption('#hypothesisLiquid','XY');await page.selectOption('#hypothesisOutcome','clear');await page.fill('#reason','實驗後修改：XY 共同作用。');await page.click('#saveHypothesis');}
  for(const [liquid,outcome] of [['none','separated'],['X','cloudy'],['Y','thin-oil'],['XY','clear']])await trial(page,liquid,outcome);
  await page.click('#analyseButton');await page.waitForSelector('#phase-4.active');
  await page.click('#revealConcept');assert.equal(await page.locator('#conceptReveal').evaluate(el=>el.classList.contains('show')),false);
  for(const [heat,outcome] of [['X','clear'],['Y','cloudy']]){await page.click(`[data-extension-heat="${heat}"]`);await page.click('#runExtension');assert(await page.locator('#recordExtension').isDisabled());await page.waitForFunction(()=>!document.querySelector('[data-extension-observation="clear"]').disabled);await page.click(`[data-extension-observation="${outcome}"]`);await page.click('#recordExtension');}
  for(const [id,value] of Object.entries({q1:'cloudy',q2:'Y',q3:'increase',limitations:'indirect'}))await page.selectOption('#'+id,value);
  await page.click('#revealConcept');await page.waitForSelector('#conceptReveal.show');
  assert(await page.locator('#q1').isDisabled());assert(await page.locator('#controlPlan').isDisabled());assert(await page.locator('#saveHypothesis').isDisabled());assert(await page.locator('#downloadRecord').isDisabled());assert.equal(await page.locator('#reflection').isDisabled(),false);
  await page.click('#saveReflection');assert.equal(await page.evaluate(()=>state.reflectionSubmittedAt),null);
  await page.fill('#reflection','原始X清澈假說不獲支持，X混濁而對照分層。膽汁沒有消化酶，乳化使小油滴總表面積增加；脂肪酶催化化學消化形成甘油和脂肪酸。煮沸Y後XY仍混濁，符合酶蛋白質變性。XY清澈只是模擬線索，須化學檢測證實產物。我修訂為X促進Y作用。');
  await page.click('#saveReflection');assert(await page.locator('#reflection').isDisabled());assert.equal(await page.locator('#downloadRecord').isDisabled(),false);
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 await page.goto(base);await page.evaluate(()=>{const original=Element.prototype.scrollIntoView;window.scrollTargets=[];Element.prototype.scrollIntoView=function(options){window.scrollTargets.push(this.id);return original.call(this,options);};});page.on('dialog',async d=>{if(d.type()!=='beforeunload')await d.accept();});
 await page.evaluate(()=>{window.print=()=>{window.printCalls=(window.printCalls||[]).concat({title:document.title,text:document.querySelector('#printReport').innerText});window.dispatchEvent(new Event('afterprint'));};});
 assert.equal(await page.locator('#profileName').inputValue(),'');
 await login(page);await page.click('[data-next="2"]');assert(await page.locator('#phase-1').evaluate(e=>e.classList.contains('active')));
 await design(page,{draw:true,badAssumptions:true});await finish(page,{revision:true});
 await page.click('#downloadRecord');await page.waitForFunction(()=>window.printCalls?.length===1);
 const printed=await page.evaluate(()=>window.printCalls[0]);assert.equal(printed.title,'VL1_未知消化液X與Y_S4_01_陳小明');assert(printed.text.includes('原始X清澈假說不獲支持'));assert(!printed.text.includes('最後保存的假說及理由'));assert(!printed.text.includes('若加入加入'));assert(!printed.text.includes('具體比較與證據說明'));assert(!/SPS|總分|新知識總分|整體分數/.test(printed.text));
 const first=await page.evaluate(k=>JSON.parse(localStorage.getItem(k))[0],RECORDS);
 assert.equal(first.initialDesign.form.hypothesisLiquid,'X');assert.equal(first.phase2.hypothesis.liquid,'XY');assert.equal(first.firstObservations['X-none'].studentObservation,'clear');assert.equal(first.phase3.trials.find(t=>t.key==='X-none').studentObservation,'cloudy');assert(first.finalAnswers&&first.reflectionSubmittedAt);assert(first.optionOrder);assert.equal(await page.locator('#printReport .digestion-diagram').count(),2);assert(first.telemetry.some(e=>e.type==='investigation_submitted'));assert(first.telemetry.some(e=>e.type==='reflection_submitted'));
 await page.evaluate(()=>document.body.classList.add('print-record'));await page.pdf({path:'/tmp/vl1-student.pdf',format:'A4',printBackground:true});await page.evaluate(()=>document.body.classList.remove('print-record'));
 await page.click('#changeProfile');await login(page);assert.equal(await page.locator('#reason').inputValue(),'');assert.equal(await page.locator('#reflection').inputValue(),'');assert.equal(await page.evaluate(()=>state.setupImage),'');assert.equal(await page.evaluate(()=>state.records.length),0);assert.notEqual(await page.evaluate(()=>state.id),first.id);
 await page.fill('#initialObservation','第二次探究');await page.evaluate(()=>saveRecord());assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).length,RECORDS),2);
 // Pause/reset an animation by switching accounts; stale callbacks cannot mutate the new state.
 await design(page);await page.click('#runExperiment');await page.click('#changeProfile');await login(page,'other@example.com','另一位學生');await page.waitForTimeout(3200);assert.equal(await page.evaluate(()=>state.experimentHasRun),false);assert.equal(await page.evaluate(()=>state.records.length),0);assert.equal(await page.locator('#resultTitle').innerText(),'等待進行實驗');
 // Time accounting: synthetic visibility events check the same handler as real browser changes.
 const timing=await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});timingVisible=true;activeSince=Date.now()-3000;accountTime();const start=state.phaseDurations[1];Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));activeSince=Date.now()-90000;saveRecord();const end=state.phaseDurations[1];Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));return {start,end};});assert(timing.start>=3);assert(timing.end-timing.start<.2);
 // Native beforeunload: cancellation keeps the state; acceptance returns to empty login.
 let pending=page.waitForEvent('dialog');const reload=page.reload().catch(()=>{});let dialog=await pending;assert.equal(dialog.type(),'beforeunload');await dialog.dismiss();await reload;assert.equal(await page.locator('#studentName').innerText(),'另一位學生');
 pending=page.waitForEvent('dialog');const accepted=page.reload();dialog=await pending;await dialog.accept();await accepted;assert.equal(await page.locator('#profileName').inputValue(),'');assert.equal(await page.locator('#profileEmail').inputValue(),'');assert(await page.locator('#profileModal').evaluate(el=>el.classList.contains('show')));
 const countBefore=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).length,RECORDS);assert.equal(countBefore,3);
 // Legacy data: existing answers stay intact; missing fields remain unavailable.
 await page.evaluate(k=>{const rows=JSON.parse(localStorage.getItem(k));rows.push({moduleId:'VL_BIO_DIGESTION_OPTION_A',profile:{name:'舊版學生',classInfo:'S4-old',email:'legacy@example.com'},savedAt:'2026-09-01T01:00:00Z',durationSeconds:10,phase2:{hypothesis:{liquid:'X',outcome:'cloudy',reason:'舊版理由'},variableChoices:{iv:['消化液組合'],dv:['混合物外觀'],cv:['油和水總體積','反應溫度','反應時間']}},phase3:{trials:[]},phase4:{conclusions:{q1:'cloudy',q2:'Y',q3:'increase'}}});localStorage.setItem(k,JSON.stringify(rows));},RECORDS);
 await login(page,'tzechingchan0605@gmail.com','教師','教師');await page.waitForSelector('#teacherDialog[open]');
 const storedBefore=await page.evaluate(k=>localStorage.getItem(k),RECORDS);const currentBefore=await page.evaluate(()=>localStorage.getItem('digestiveLab.v4'));
 await page.click('[data-view-record="3"]');assert((await page.locator('#teacherReport').innerText()).includes('未提供（舊版未保存原始假說）'));
 await page.click('[data-view-record="0"]');assert((await page.locator('#teacherReport').innerText()).includes('原始X清澈假說不獲支持'));
 await page.evaluate(()=>{window.print=()=>{window.printCalls=(window.printCalls||[]).concat(document.title);window.dispatchEvent(new Event('afterprint'));};});await page.click('#teacherPDF');await page.waitForFunction(()=>window.printCalls?.length>0);
 let dlPromise=page.waitForEvent('download');await page.click('#exportCsv');let dl=await dlPromise;await dl.saveAs('/tmp/vl1-records.xlsx');
 await page.click('#teacherDemo');await page.evaluate(()=>{const original=Element.prototype.scrollIntoView;window.scrollTargets=[];Element.prototype.scrollIntoView=function(options){window.scrollTargets.push(this.id);return original.call(this,options);};});await design(page);await finish(page);await page.click('#downloadRecord');
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),RECORDS),storedBefore);assert.equal(await page.evaluate(()=>localStorage.getItem('digestiveLab.v4')),currentBefore);assert.equal(await page.evaluate(()=>state.events.length),0);
 await page.click('#teacherButton');dlPromise=page.waitForEvent('download');await page.click('#exportCsv');dl=await dlPromise;await dl.saveAs('/tmp/vl1-after-demo.xlsx');assert.deepEqual(fs.readFileSync('/tmp/vl1-records.xlsx'),fs.readFileSync('/tmp/vl1-after-demo.xlsx'));
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: student full workflow, frozen hypothesis, first/final observations, reflection/PDF gates, account switching, same-email IDs, stale animations, native reload cancel/accept, active timing, legacy data, teacher preview/PDF/demo, byte-identical Excel and unchanged storage.');
 // One confirmation for explicit restart; no second unload dialog.
 let confirmations=0;const counter=d=>{if(d.type()==='confirm')confirmations++;};page.on('dialog',counter);await page.click('#closeTeacher');await page.click('#resetLab');await page.waitForSelector('#profileModal.show');assert.equal(confirmations,1);assert.equal(await page.locator('#profileName').inputValue(),'');
 await page.setViewportSize({width:390,height:844});await login(page,'mobile@example.com','手機測試','S4');await design(page);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/vl1-mobile.png',fullPage:true});
 // Photo upload is another supported design path; hidden input is enabled before submission.
 await page.click('[data-back="2"]');await page.setInputFiles('#setupPhoto',{name:'design.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});await page.waitForFunction(()=>state.setupMethod==='photo');assert.equal(await page.evaluate(()=>state.setupSaved),false);await page.click('#saveSetup');assert.equal(await page.evaluate(()=>state.setupSaved),true);
 console.log('PASS: one-confirmation restart, mobile layout, and photo design alternative.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
