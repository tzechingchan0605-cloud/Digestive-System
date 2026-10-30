// Real downloads of the four worksheets and teacher guide; isolated from real cloud/student data.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const base=process.argv[2]||'http://127.0.0.1:8000';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.addInitScript(()=>{window.setInterval=()=>0;});
  await page.route('**/cloud-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.VL1_CLOUD_CONFIG={endpoint:''};"}));
  for(const host of ['https://script.google.com/**','https://script.googleusercontent.com/**','https://fonts.googleapis.com/**','https://fonts.gstatic.com/**'])await page.route(host,r=>r.abort());
  await page.goto(base);await page.waitForFunction(()=>window.VL1Paperwork);
  assert.equal(await page.locator('#openPaperwork').isVisible(),false);
  assert.equal(await page.evaluate(()=>VL1Paperwork.open()),false);
  assert.equal(await page.evaluate(()=>VL1Paperwork.download('answers-word')),false);
  await page.evaluate(()=>localStorage.setItem('digestiveLab.localRecords.v1',JSON.stringify([{schemaVersion:2,uiVersion:3,moduleId:'VL_BIO_DIGESTION_OPTION_A',id:'saved-student',profile:{name:'保留原文',classInfo:'X1',email:'paper-test@example.com'},phase2:{hypothesis:{liquid:'X',outcome:'clear',reason:'原始理由'},setup:{description:'原始裝置'}},phase3:{trials:[]},phase4:{conclusions:{},reflection:'學生原文'},durationSeconds:30}])));
  await page.fill('#profileName','Teacher');await page.fill('#profileClass','X1');await page.fill('#profileEmail','tzechingchan0605@gmail.com');await page.click('#profileForm button');await page.waitForSelector('#teacherDialog[open]');
  const snapshot=()=>page.evaluate(()=>({storage:{...localStorage},id:state.id,events:state.events,phase:state.phase,phaseDurations:state.phaseDurations,profile:state.profile,form:readForms(),variables:state.variableChoices,records:state.records}));
  const before=await snapshot();
  const excel=async name=>{const wait=page.waitForEvent('download');await page.click('#exportCsv');const dl=await wait;await dl.saveAs('/tmp/'+name);return fs.readFileSync('/tmp/'+name);};
  const excelBefore=await excel('ws-excel-before.xlsx');
  await page.click('#openPaperwork');await page.waitForFunction(()=>!document.querySelector('[data-paper-download]').disabled);
  const manifest=JSON.parse(fs.readFileSync('paperwork/generated/manifest.json','utf8'));
  assert.deepEqual(await page.locator('[data-paper-download]').evaluateAll(bs=>bs.map(b=>b.dataset.paperDownload)),manifest.languages.zh.files.map(f=>f.id));
  assert.equal(await page.locator('#paperPanel .paper-row').count(),5);
  assert.equal(await page.locator('#paperLanguage,[data-paper-preview]').count(),0);
  for(const lang of ['zh','en']){
   if(await page.evaluate(()=>VL1Language.current)!==lang)await page.click('#teacherLanguageSwitch');
  for(const file of manifest.languages[lang].files){
   await page.waitForTimeout(1100);
   const wait=page.waitForEvent('download',{timeout:10000});await page.click(`[data-paper-download="${file.id}"]`);const dl=await wait;
   assert.equal(dl.suggestedFilename(),file.name);await dl.saveAs('/tmp/'+file.name);
   const bytes=fs.readFileSync('/tmp/'+file.name);assert.equal(sha(bytes),file.sha256);assert.equal(bytes.length,file.bytes);
   assert(file.name.endsWith('.pdf')?bytes.subarray(0,5).toString()==='%PDF-':bytes[0]===0x50&&bytes[1]===0x4b);
  }
  }
  assert.deepEqual(await snapshot(),before);
  assert.deepEqual(await excel('ws-excel-after.xlsx'),excelBefore);
  assert.equal(await page.evaluate(()=>VL1Language.current),'en');
  assert.equal(await page.locator('#paperPanel h3').innerText(),'Worksheets and answers');
  assert.equal(await page.locator('#paperPanel .paper-row').count(),5);
  assert.equal(await page.locator('[data-paper-download="answers-word"]').innerText(),'Download Word');
  // Invalid manifests must disable every download, not retain an older manifest.
  for(const data of [{...manifest,version:0},{...manifest,languages:{...manifest.languages,en:{files:manifest.languages.en.files.slice(0,3)}}},{...manifest,languages:{...manifest.languages,en:{files:manifest.languages.en.files.map((f,i)=>i?f:{...f,path:'https://example.com/stolen.docx'})}}}]){
   await page.route('**/paperwork/generated/manifest.json',r=>r.fulfill({json:data}));
   assert.equal(await page.evaluate(()=>VL1Paperwork.open()),false);
   assert.equal(await page.locator('[data-paper-download]:enabled').count(),0);
   assert.equal(await page.evaluate(()=>VL1Paperwork.download('student-pdf')),false);
   await page.unroute('**/paperwork/generated/manifest.json');
  }
  assert.equal(await page.evaluate(()=>VL1Paperwork.open()),true);
  // Both formats reject corrupt bytes and failed HTTP responses.
  for(const file of [manifest.languages.en.files[0],manifest.languages.en.files[3]]){
   await page.route('**/'+file.path,r=>r.fulfill({contentType:file.mime,body:'broken file'}));
   assert.equal(await page.evaluate(id=>VL1Paperwork.download(id),file.id),false);
   assert.match(await page.locator('#paperStatus').innerText(),/Download failed/);
   await page.unroute('**/'+file.path);
   await page.route('**/'+file.path,r=>r.fulfill({status:404,body:'missing'}));
   assert.equal(await page.evaluate(id=>VL1Paperwork.download(id),file.id),false);
   await page.unroute('**/'+file.path);
  }
  assert.equal(await page.evaluate(()=>VL1Paperwork.download('A')),false);
  for(const width of [390,320]){
   await page.setViewportSize({width,height:844});
   assert(await page.locator('.teacher-panel').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   assert.equal(await page.locator('[data-paper-download]:visible').count(),5);
  }
  await page.click('#closePaperwork');assert.equal(await page.evaluate(()=>VL1Paperwork.download('student-word')),false);
  await page.click('#teacherDemo');await page.fill('#initialObservation','Oil and water');const demoBefore=await snapshot();
  await page.click('#teacherButton');await page.click('#openPaperwork');await page.waitForFunction(()=>!document.querySelector('[data-paper-download]').disabled);
  const wait=page.waitForEvent('download');await page.click('[data-paper-download="answers-word"]');await wait;
  assert.deepEqual(await snapshot(),demoBefore);
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS: five downloads in each language (10 genuine files), correct bytes/names, bilingual UI, teacher guard, corrupt/missing-file rejection, mobile layout, and unchanged records/demo/Excel.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
