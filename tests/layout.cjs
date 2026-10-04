// Verify the requested VL2-style layout without completing another experiment.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());await page.goto(process.argv[2]||'http://127.0.0.1:8000');
 await page.fill('#profileName','版面測試');await page.fill('#profileClass','S4');await page.fill('#profileEmail','layout@example.com');await page.click('#profileForm button');
 assert.equal(await page.locator('#initialObservation').locator('..').locator('p').innerText(),'只描述圖中油+水試管的可見現象（暫不猜測 X、Y 的身分或實驗結果）。');
 await page.fill('#initialObservation','油水分層。');await page.click('[data-next="2"]');
 assert.deepEqual(await page.locator('#phase-2 .card-kicker').allTextContents(),['01 · 假說建立器','02 · 公平測試設計','03 · 實驗前提','04 · 探究的對照組','05 · 實驗裝置設計']);
 assert.equal(await page.locator('#assumptionChoices input').count(),4);assert.equal(await page.locator('#assumptionChoices input[value="temperature"],#assumptionChoices input[value="hot"]').count(),0);
 assert((await page.locator('#assumptionChoices').locator('..').innerText()).includes('此探究的假設是什麼？'));
 assert((await page.locator('#assumptionChoices').locator('..').innerText()).includes('請選出所有適用的假設，可選多於一項。'));
 assert((await page.locator('#controlPlan').locator('..').innerText()).includes('你認為此實驗需要對照組嗎？'));
 assert((await page.locator('#controlPlan').locator('..').innerText()).includes('而不是其他外在因素的干擾。'));
 assert(await page.evaluate(()=>!!(document.querySelector('#setupCanvas').compareDocumentPosition(document.querySelector('#setupDescription'))&Node.DOCUMENT_POSITION_FOLLOWING)));
 await page.locator('#assumptionChoices').locator('..').screenshot({path:'/tmp/vl1-assumptions.png'});
 await page.locator('#setupCanvas').locator('..').screenshot({path:'/tmp/vl1-design.png'});
 await page.evaluate(()=>{state.unlocked=4;setPhase(4);});
 assert.deepEqual(await page.locator('.conclusion-question h4').allTextContents(),['1. 消化液 X 有甚麼作用？','2. 消化液 X 如何有助消化液 Y 作用？','3. 本實驗能告訴我們甚麼？']);
 assert.equal(await page.locator('#comparison,#heatComparison,#evidenceExplanation,#designReferences').count(),0);
 assert(!(await page.locator('.conclusions-card').innerText()).includes('此模擬沒有量度反應速度'));
 assert((await page.locator('#limitations').locator('..').innerText()).includes('沒有檢測消化產物。以下哪個說法最恰當？'));
 await page.locator('.conclusions-card').screenshot({path:'/tmp/vl1-conclusions.png'});
 for(const width of [390,320]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.locator('.conclusions-card').screenshot({path:'/tmp/vl1-conclusions-mobile.png'});
 // Historical records keep their original premise set and six-question weights.
 const historical=await page.evaluate(()=>{
   const r={schemaVersion:2,profile:{name:'舊版',classInfo:'S4'},phase2:{assumptions:['temperature','time','volume','mixing']},phase4:{conclusions:{q1:'cloudy',q2:'Y',q3:'increase',comparison:'combined',heatComparison:'yaffected',limitations:'indirect'}}};
   const scores=scoringWorkbook([r]);const value=id=>scores.sheet.rows[1][Object.keys(scores.col).indexOf(id)].value;
   return {premises:value('assumptions'),inference:value('inference')};
 });assert.deepEqual(historical,{premises:1,inference:4});
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: exact requested copy, five numbered cards, four premise options, drawing before text, three VL2-style conclusions, removed controls, responsive layout, and historical scoring.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
