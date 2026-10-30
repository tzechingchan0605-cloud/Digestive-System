// Export a real workbook containing all three reflection versions.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();await page.route('**/cloud-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.VL1_CLOUD_CONFIG={endpoint:''};"}));
  await page.route('https://**/*',r=>r.abort());await page.goto(process.argv[2]||'http://127.0.0.1:8000');
  const result=await page.evaluate(async()=>{
   const kinds=[['new',7],['staged3',6],['staged2',5],['staged1',4],['integrated-concept-explanation',3],['integrated-explanation-evidence',3],['enzyme-denaturation',3],[null,3]];
   const records=kinds.map(([id,v],i)=>({id:'rubric-'+i,schemaVersion:2,uiVersion:v,profile:{name:'Version '+i,classInfo:'X1'},submitted:true,reflectionSubmittedAt:'2026-10-30T00:00:00Z',phase2:{variableChoices:copy(expectedVariables),assumptions:assumptionsForRecord({uiVersion:v}).filter(a=>a[2]).map(a=>a[0])},phase3:{trials:(v>=4?trialKeys:Object.keys(legacyExperiments)).map(key=>({key,studentObservation:(v>=4?experiments:legacyExperiments)[key][0]}))},phase4:{...(id?{reflectionQuestionId:v>=4?'integrated-concept-explanation':id}:{}),reflection:'version-specific answer',conclusions:copy(v>=7?conclusionAnswers:v>=5?stageTwoAnswers:v===4?stageOneAnswers:legacyConclusionAnswers)}}));
   const result=scoringWorkbook(records);const bytes=new Uint8Array(await workbook([result.sheet,result.rubric]).arrayBuffer());return {bytes:[...bytes],col:result.col,rows:result.sheet.rows,validations:result.sheet.validations};
  });
  fs.writeFileSync('/tmp/vl1-rubric-versions.xlsx',Buffer.from(result.bytes));
  for(let i=0;i<8;i++){
   const row=result.rows[i+1],cell=id=>row[Object.keys(result.col).indexOf(id)],id='reflectionScore';
   assert.equal(cell('maximum').value,[32,32,31,31,32,32,28,32][i]);
   assert.match(cell('knowledge').formula,i===7?/SUM\(X9,Y9,Z9,AA9\)/:new RegExp(`SUM\\(${result.col[id]}${i+2}\\)`));
   assert.equal(cell(i===7?id:'emulsion').value,'不適用');
  }
  console.log('PASS: exported mixed concept, evidence, denaturation and legacy scoring workbook for formula validation.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
