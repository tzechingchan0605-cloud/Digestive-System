// Focused preservation/security tests; no real student data or network dependencies.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.argv[2]||'http://127.0.0.1:8000';
const key='digestiveLab.localRecords.v1';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/cloud-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.VL1_CLOUD_CONFIG={endpoint:''};"}));
 await page.route('https://script.google.com/**',r=>r.abort());await page.route('https://script.googleusercontent.com/**',r=>r.abort());
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());await page.goto(base);
 const legacy={moduleId:'VL_BIO_DIGESTION_OPTION_A',profile:{name:'<img src=x onerror="window.injected=true">',classInfo:'=1+1',email:'legacy@example.com'},savedAt:'2026-01-01T00:00:00Z',phase2:{hypothesis:{liquid:'X',outcome:'clear',reason:'=HYPERLINK("https://example.com")'},variableChoices:{iv:['消化液組合'],dv:['混合物外觀'],cv:['油和水總體積','反應溫度','反應時間']}},phase3:{trials:[]},phase4:{conclusions:{q1:'cloudy'}},telemetry:[]};
 // Current-only migration must archive once, never auto-login or invent initial answers.
 await page.evaluate(r=>{localStorage.setItem('digestiveLab.v4',JSON.stringify(r));localStorage.removeItem('digestiveLab.localRecords.v1');},legacy);await page.reload();
 assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).length,key),1);await page.reload();assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).length,key),1);assert.equal(await page.locator('#profileEmail').inputValue(),'');
 async function login(email,name='測試'){await page.fill('#profileName',name);await page.fill('#profileClass','S4');await page.fill('#profileEmail',email);await page.click('#profileForm button');}
 await login('tzechingchan0605@gmail.com');await page.click('[data-view-record="0"]');assert.equal(await page.evaluate(()=>window.injected),undefined);assert((await page.locator('#teacherReport').innerText()).includes('<img src=x'));
 // Verify Excel raw payload chunks reconstruct exactly, including astral Unicode.
 const payload='😀與脂肪酸'.repeat(10000);
 await page.evaluate(({key,payload})=>{const rows=JSON.parse(localStorage.getItem(key));rows[0].telemetry=[{type:'answer_changed',at:'2026-01-01T00:00:00Z',phase:2,value:payload}];rows[0].initialDesign={at:'2026-01-01T00:00:00Z',form:{hypothesisLiquid:'X',hypothesisOutcome:'clear',reason:payload}};localStorage.setItem(key,JSON.stringify(rows));},{key,payload});
 const dlPromise=page.waitForEvent('download');await page.click('#exportCsv');await(await dlPromise).saveAs('/tmp/vl1-large.xlsx');fs.writeFileSync('/tmp/vl1-large-payload.txt',payload);
 // Unrecognized pre-existing records are preserved when a real record is saved.
 await page.click('#closeTeacher');await page.click('#changeProfile');await page.evaluate(k=>{const rows=JSON.parse(localStorage.getItem(k));rows.push({otherModule:'preserve-me',answer:42});localStorage.setItem(k,JSON.stringify(rows));},key);await login('student@example.com');assert(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).some(r=>r.otherModule==='preserve-me'&&r.answer===42),key));
 // Malformed storage must not be overwritten by a new student's autosave.
 await page.click('#changeProfile');await page.evaluate(k=>localStorage.setItem(k,'{damaged but retained'),key);await login('next@example.com');await page.fill('#initialObservation','新觀察');await page.evaluate(()=>saveRecord());assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),'{damaged but retained');
 await page.setViewportSize({width:320,height:740});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: current-only migration once, blank login, legacy XSS escaping, huge Unicode export chunks, unknown record preservation, malformed storage retention, and 320px layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
