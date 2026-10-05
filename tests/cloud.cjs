// Exercise the actual Apps Script collector with in-memory Google service adapters,
// plus independent browser contexts and the real frontend/exporter.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const http=require('node:http');
const path=require('node:path');
const rows=[['headers']];
const properties={SPREADSHEET_ID:'test-sheet',TEACHER_PASSWORD_HASH:crypto.createHash('sha256').update('test-teacher-password').digest('hex')};
const sheet={getLastRow:()=>rows.length,getRange(start,col,count,width){return {getValues:()=>Array.from({length:count},(_,i)=>Array.from({length:width},(_,j)=>rows[start+i-1]?.[col+j-1]??'')),setNumberFormat(){},setValues(values){values.forEach((value,i)=>{rows[start+i-1]=value;});}};}};
const sandbox={PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties[k]})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,value)=>[...crypto.createHash('sha256').update(value).digest()]},LockService:{getScriptLock:()=>({waitLock(){},hasLock:()=>true,releaseLock(){}})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,getContent(){return text;},setMimeType(){return this;}})}};
sandbox.HtmlService={XFrameOptionsMode:{ALLOWALL:'all'},createHtmlOutput:html=>({html,setXFrameOptionsMode(){return this;}})};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('cloud/Code.gs','utf8'),sandbox);
const call=data=>JSON.parse(sandbox.doPost({postData:{contents:JSON.stringify(data)}}).text);
const record={moduleId:'VL_BIO_DIGESTION_OPTION_A',id:crypto.randomUUID(),profile:{name:'測試',email:'backend@example.com'},savedAt:'2026-10-05T01:00:00.000Z',phase2:{setup:{image:'data:image/jpeg;base64,'+'A'.repeat(120000)}},telemetry:[{type:'answer_changed',value:'=IMPORTXML("test")'}]};
const token='a'.repeat(72);
assert(call({action:'save',record,token}).ok);
assert.equal(rows.length,2);assert.equal(rows[1][3],4);
assert(!call({action:'save',record:{...record,savedAt:'2026-10-05T02:00:00Z'},token:'b'.repeat(72)}).ok);
assert(!call({action:'list',teacherEmail:'tzechingchan0605@gmail.com',password:'wrong'}).ok);
assert(!call({action:'save',record:{...record,id:crypto.randomUUID(),profile:{email:'tzechingchan0605@gmail.com'}},token}).ok);
assert(call({action:'save',record:{...record,savedAt:'2026-10-04T00:00:00Z'},token}).ok);
let list=call({action:'list',teacherEmail:'tzechingchan0605@gmail.com',password:'test-teacher-password'});
assert.deepEqual(list.records[0],record);assert.equal(list.nextCursor,null);
assert.equal(rows.length,2);
for(let i=0;i<6;i++)assert(call({action:'save',record:{...record,id:'legacy-'+i},token}).ok);
list=call({action:'list',teacherEmail:'tzechingchan0605@gmail.com',password:'test-teacher-password',cursor:0});
assert.equal(list.records.length,5);assert.equal(list.nextCursor,5);
assert.equal(call({action:'list',teacherEmail:'tzechingchan0605@gmail.com',password:'test-teacher-password',cursor:5}).records.length,2);
assert(rows.slice(1).every(row=>row.slice(4,4+row[3]).every(chunk=>chunk.startsWith('json:'))));
rows.splice(1);
let unavailable=false;
// No CORS headers: a direct browser fetch must fail. The bridge must still work.
const collector=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:8101');
 if(req.method==='GET' && url.pathname==='/collector' && url.searchParams.get('view')==='bridge') {
  const inner=new URL('/bridge-content','http://127.0.0.1:8101');inner.search=url.search;
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><iframe src="'+inner.href.replaceAll('&','&amp;')+'"></iframe>');return;
 }
 if(req.method==='GET' && url.pathname==='/bridge-content') {
  const output=sandbox.doGet({parameter:Object.fromEntries(url.searchParams)});
  const stub=`<script>window.google={script:{run:{withSuccessHandler(success){return{withFailureHandler(failure){return{collectorBridge(payload){fetch('/rpc',{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload)}).then(r=>{if(!r.ok)throw Error('服務離線');return r.json();}).then(success).catch(failure);}};}};}}}};</script>`;
  res.setHeader('Content-Type','text/html');res.end(output.html.replace('<body>','<body>'+stub));return;
 }
 if(req.method==='POST' && ['/collector','/rpc'].includes(url.pathname)){
  assert(req.headers['content-type'].startsWith('text/plain'));
  if(unavailable){res.writeHead(503);res.end('offline');return;}
  let body='';req.on('data',b=>body+=b);req.on('end',()=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(sandbox.collectorBridge(JSON.parse(body))));});return;
 }
 res.writeHead(404);res.end();
});
const server=http.createServer((req,res)=>{
 if(req.url.split('?')[0]==='/cloud-config.js'){res.setHeader('Content-Type','application/javascript');res.end("window.VL1_CLOUD_CONFIG={endpoint:'http://127.0.0.1:8101/collector',transport:'bridge'};");return;}
 const pageUrl=new URL(req.url,'http://127.0.0.1:8100');
 const target=path.resolve('.','.'+(pageUrl.pathname==='/'?'/index.html':pageUrl.pathname));
 if(!target.startsWith(process.cwd()+path.sep)){res.writeHead(404);res.end();return;}
 try{res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(target)]||'application/octet-stream');let contents=fs.readFileSync(target);if(pageUrl.searchParams.has('cached'))contents=contents.toString().replace(/<script src="cloud-bridge.js[^"]*"><\/script>/g,'');res.end(contents);}catch{res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(8100,'127.0.0.1',resolve));
 await new Promise(resolve=>collector.listen(8101,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const phone=await browser.newContext({viewport:{width:390,height:844}}),desktop=await browser.newContext(),teacher=await browser.newContext();
 const errors=[];const page=await phone.newPage(),other=await desktop.newPage(),teach=await teacher.newPage();
 for(const p of [page,other,teach]){p.on('pageerror',e=>{errors.push(e.message);console.error('Browser test error:',e.message);});await p.route('https://fonts.googleapis.com/**',r=>r.abort());await p.route('https://fonts.gstatic.com/**',r=>r.abort());await p.goto('http://127.0.0.1:8100'+(p===other?'/?cached=1':''));}
 assert((await page.locator('#loginCloudStatus').innerText()).includes('尚未確認'));
 await page.evaluate(()=>cloudSync.flush());
 assert.equal(await page.locator('#loginCloudStatus').getAttribute('data-state'),'configured');
 assert.equal(rows.length,1);
 const wrongLink=await page.evaluate(async()=>{
   const values=new Map(),messages=[];let requests=0;
   const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
   const sync=createCloudSync({endpoint:'https://script.google.com/macros/library/d/example/2',storage,records:()=>[],status:(kind,message)=>messages.push({kind,message}),fetcher:async()=>{requests++;throw Error('Unexpected request');}});
   sync.recover();
   sync.enqueue({id:crypto.randomUUID(),moduleId:'VL_BIO_DIGESTION_OPTION_A',profile:{email:'config-test@example.com'},savedAt:new Date().toISOString()});
   await sync.flush().catch(()=>{});
   return {requests,last:messages.at(-1)};
 });
 assert.equal(wrongLink.requests,0);assert.equal(wrongLink.last.kind,'error');assert(wrongLink.last.message.includes('/exec'));
 assert(await page.evaluate(async()=>{try{await fetch('http://127.0.0.1:8101/collector',{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'noop'})});return false;}catch{return true;}}),'Direct fetch must reproduce the CORS failure');
 async function login(p,name,email){await p.fill('#profileName',name);await p.fill('#profileClass','S4-01');await p.fill('#profileEmail',email);await p.click('#profileForm button');}
 async function saved(p){await p.evaluate(async()=>{saveRecord();await cloudSync.flush();});}
 await login(page,'手機學生','phone@example.com');await page.fill('#initialObservation','手機初步觀察：油水分層');await saved(page);
 await page.evaluate(()=>{state.setupImage=document.querySelector('#setupCanvas').toDataURL('image/png');state.setupMade=true;state.setupSaved=true;state.setupMethod='drawing';});await saved(page);
 assert.equal(await page.locator('#cloudStatus').getAttribute('data-state'),'synced');
 assert.equal(await page.locator('#cloudStatus').innerText(),'本機學生紀錄已同步至全班雲端紀錄。');
 const firstId=await page.evaluate(()=>state.id);
 await login(other,'電腦學生','desktop@example.com');await other.fill('#initialObservation','電腦觀察');await saved(other).catch(async e=>{console.error('Desktop frames:',other.frames().map(f=>f.url()));console.error('Desktop bridge status:',await other.locator('#cloudStatus').innerText());throw e;});
 await login(teach,'教師','tzechingchan0605@gmail.com');
 assert.equal(await teach.evaluate(()=>readLocalRecords().length),0);
 assert.equal(await teach.locator('[data-view-record]').count(),0);
 await teach.fill('#cloudTeacherPassword','wrong');await teach.click('#cloudTeacherForm button');await teach.waitForFunction(()=>document.querySelector('#dashboardStatus').textContent.includes('密碼不正確'));
 await teach.fill('#cloudTeacherPassword','test-teacher-password');await teach.click('#cloudTeacherForm button');await teach.waitForFunction(()=>document.querySelectorAll('[data-view-record]').length===2);
 assert((await teach.locator('#teacherData').innerText()).includes('手機學生'));
 await teach.locator('[data-view-record]').first().click();assert((await teach.locator('#teacherReport').innerText()).includes('手機初步觀察'));
 await page.click('#changeProfile');await login(page,'手機學生','phone@example.com');await saved(page);
 const secondId=await page.evaluate(()=>state.id);assert.notEqual(firstId,secondId);
 unavailable=true;await page.fill('#initialObservation','離線修改保留');await page.evaluate(async()=>{saveRecord();await cloudSync.flush().catch(()=>{});});
 assert((await page.locator('#cloudStatus').innerText()).includes('尚未同步'));
 assert.equal(call({action:'list',teacherEmail:'tzechingchan0605@gmail.com',password:'test-teacher-password'}).records.find(r=>r.id===secondId).phase1.observation,'');
 page.on('dialog',dialog=>dialog.accept());await page.reload();await page.waitForFunction(()=>document.querySelector('#cloudStatus').dataset.state==='error');
 unavailable=false;await page.click('#loginRetryCloud');await page.waitForFunction(()=>document.querySelector('#cloudStatus').dataset.state==='synced');
 await teach.fill('#cloudTeacherPassword','test-teacher-password');await teach.click('#cloudTeacherForm button');await teach.waitForFunction(()=>document.querySelectorAll('[data-view-record]').length===3);
 const [download]=await Promise.all([teach.waitForEvent('download'),teach.click('#exportCsv')]);await download.saveAs('/tmp/vl1-cloud.xlsx');
 const shared=call({action:'list',teacherEmail:'tzechingchan0605@gmail.com',password:'test-teacher-password'}).records;
 assert.equal(shared.find(r=>r.id===secondId).phase1.observation,'離線修改保留');assert(shared.find(r=>r.id===firstId).telemetry.some(e=>e.type==='answer_changed'));
 const before=JSON.stringify(rows);await teach.click('#teacherDemo');await teach.fill('#initialObservation','教師示範');await teach.evaluate(()=>saveRecord());assert.equal(JSON.stringify(rows),before);
 unavailable=true;let unexpected=false;teach.on('download',()=>unexpected=true);await teach.evaluate(()=>exportExcel());assert(!unexpected);assert((await teach.locator('#toast').innerText()).includes('未匯出'));
 assert.deepEqual(errors,[]);
 console.log('PASS: nested Apps Script bridge succeeds while direct fetch fails CORS; truthful idle/pending/confirmed status; actual collector ownership/auth/chunking/stale protection; independent phone/desktop/teacher contexts; same-email separate attempts; offline reload/retry; cloud-only teacher preview and XLSX; demonstration exclusion; export refuses incomplete records.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));await new Promise(resolve=>collector.close(resolve));}
})().catch(e=>{console.error(e);server.close();collector.close();process.exitCode=1;});
