// Learning diagrams, quiet hints and position-independent answer grading.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/cloud-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.VL1_CLOUD_CONFIG={endpoint:''};"}));
 await page.route('https://script.google.com/**',r=>r.abort());await page.route('https://script.googleusercontent.com/**',r=>r.abort());
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());await page.goto(process.argv[2]||'http://127.0.0.1:8000');
 await page.fill('#profileName','圖解測試');await page.fill('#profileClass','S4');await page.fill('#profileEmail','learning@example.com');await page.click('#profileForm button');
 await page.fill('#initialObservation','油水分層。');await page.click('[data-next="2"]');
 const hint=await page.locator('#controlPlan').locator('..').locator('.scaffold-hint').evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),colour:getComputedStyle(el).color,strong:getComputedStyle(el.querySelector('strong')).color}));
 assert.equal(hint.size,12);assert.equal(hint.colour,'rgb(101, 128, 135)');assert.equal(hint.strong,hint.colour);
 assert((await page.locator('#controlPlan').locator('..').innerText()).includes('你認為此實驗需要對照組嗎？如需要，你會如何設計比較裝置？'));
 await page.locator('#controlPlan').locator('..').screenshot({path:'/tmp/vl1-control-hint.png'});
 const order=await page.evaluate(()=>({saved:state.optionOrder,actual:[...document.querySelectorAll('#assumptionChoices input')].map(el=>el.value),all: Object.fromEntries(Object.keys(conclusionAnswers).map(id=>[id,[...document.querySelector('#'+id).options].map(o=>o.value).filter(Boolean)]))}));
 assert.deepEqual(order.actual,order.saved.assumptions);assert.deepEqual(order.all,order.saved.conclusions);assert.deepEqual([...order.actual].sort(),['mixing','more','time','volume']);
 const samples=await page.evaluate(()=>[0,.3,.6,.999].map(value=>shuffledChoices(['time','volume','mixing','more'],()=>value)));
 assert(new Set(samples.map(v=>v.indexOf('more'))).size>1);samples.forEach(values=>assert.deepEqual([...values].sort(),['mixing','more','time','volume']));
 await page.evaluate(()=>renderVariableQuiz());assert.deepEqual(await page.locator('#assumptionChoices input').evaluateAll(els=>els.map(e=>e.value)),order.actual);
 const marks=await page.evaluate(()=>{const r={schemaVersion:2,uiVersion:3,phase2:{assumptions:['mixing','time','volume']},phase4:{conclusions:{q1:'cloudy',q2:'Y',q3:'increase',limitations:'indirect'}}};const w=scoringWorkbook([r]);return ['assumptions','inference'].map(id=>w.sheet.rows[1][Object.keys(w.col).indexOf(id)].value);});assert.deepEqual(marks,[1,4]);
 const stored=await page.evaluate(()=>saveRecord());assert.deepEqual(stored.optionOrder,order.saved);
 assert.equal(await page.locator('#conceptReveal').isVisible(),false);
 await page.evaluate(()=>{state.unlocked=4;setPhase(4);state.submitted=true;applyLock();});
 assert.equal(await page.locator('#conceptReveal figure.digestion-diagram').count(),2);assert.equal(await page.locator('#conceptReveal .reactant .reaction-water').innerText(),'＋ 3H₂O（水）');assert.equal(await page.locator('#conceptReveal .equation-arrow svg').count(),1);assert.equal(await page.locator('#conceptReveal .reaction-arrow svg').count(),1);
 await page.waitForFunction(()=>[...document.querySelectorAll('#conceptReveal .learning-diagrams img')].every(img=>img.complete&&img.naturalWidth>0));
 await page.locator('#conceptReveal').screenshot({path:'/tmp/vl1-learning-desktop.png'});
 await page.evaluate(()=>renderPrint(buildRecord()));assert.equal(await page.locator('#printReport figure.digestion-diagram').count(),2);
 await page.waitForFunction(()=>[...document.querySelectorAll('#printReport .learning-diagrams img')].every(img=>img.complete&&img.naturalWidth>0));
 await page.evaluate(()=>document.body.classList.add('print-record'));await page.pdf({path:'/tmp/vl1-learning.pdf',format:'A4',printBackground:true});await page.evaluate(()=>document.body.classList.remove('print-record'));
 for(const width of [390,320]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const boxes=await page.locator('#conceptReveal .molecule-card img').evaluateAll(imgs=>imgs.map(img=>img.getBoundingClientRect().width));assert(boxes.every(width=>width>=145));}
 await page.locator('#conceptReveal').screenshot({path:'/tmp/vl1-learning-mobile.png'});
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: small grey hints, revised control prompt, varied/stable option positions, saved order, value-based grading, gated diagrams, desktop/mobile legibility and PDF diagrams.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
