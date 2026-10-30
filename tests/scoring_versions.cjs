// Export a real workbook containing all three reflection versions.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();await page.route('**/cloud-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.VL1_CLOUD_CONFIG={endpoint:''};"}));
  await page.route('https://**/*',r=>r.abort());await page.goto(process.argv[2]||'http://127.0.0.1:8000');
  const result=await page.evaluate(async()=>{
   const records=['integrated-concept-explanation','integrated-explanation-evidence','enzyme-denaturation',null].map((id,i)=>({id:'rubric-'+i,schemaVersion:2,uiVersion:3,profile:{name:'Version '+i,classInfo:'X1'},submitted:true,reflectionSubmittedAt:'2026-10-30T00:00:00Z',phase2:{variableChoices:copy(expectedVariables),assumptions:assumptions.filter(a=>a[2]).map(a=>a[0])},phase3:{trials:trialKeys.map(key=>({key,studentObservation:experiments[key][0]}))},phase4:{...(id?{reflectionQuestionId:id}:{}),reflection:'version-specific answer',conclusions:copy(conclusionAnswers)}}));
   const result=scoringWorkbook(records);const bytes=new Uint8Array(await workbook([result.sheet,result.rubric]).arrayBuffer());return {bytes:[...bytes],col:result.col,rows:result.sheet.rows,validations:result.sheet.validations};
  });
  fs.writeFileSync('/tmp/vl1-rubric-versions.xlsx',Buffer.from(result.bytes));
  for(let i=0;i<4;i++){
   const row=result.rows[i+1],cell=id=>row[Object.keys(result.col).indexOf(id)],id='reflectionScore';
   assert.equal(cell('maximum').value,[32,32,28,32][i]);
   assert.match(cell('knowledge').formula,i===3?/SUM\(X5,Y5,Z5,AA5\)/:new RegExp(`SUM\\(${result.col[id]}${i+2}\\)`));
   assert.equal(cell(i===3?id:'emulsion').value,'不適用');
  }
  console.log('PASS: exported mixed concept, evidence, denaturation and legacy scoring workbook for formula validation.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
