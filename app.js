'use strict';
const TEACHER_EMAIL = 'tzechingchan0605@gmail.com';
const STORAGE_KEY = 'digestiveLab.v4';
const RECORDS_KEY = 'digestiveLab.localRecords.v1';
const MODULE_ID = 'VL_BIO_DIGESTION_OPTION_A';
const PAGE_TITLE = document.title;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const uiText = value => window.VL1Language?.text(value) ?? value;
const canonicalHTML = (element,inner=false) => window.VL1Language?.canonicalHTML(element,inner) ?? (inner?element.innerHTML:element.outerHTML);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copy = value => structuredClone(value);
const variableNames = ['油和水總體積','反應溫度','反應時間','加液總量','搖勻方式','混合物外觀','消化液組合'];
const variableGroups = [['iv','獨立變量','主動改變的因素'],['dv','因變量','量度或觀察的結果'],['cv','控制變量','保持不變的因素']];
const expectedVariables = {iv:['消化液組合'],dv:['混合物外觀'],cv:variableNames.slice(0,5)};
const previousAssumptions = [
  ['temperature','各裝置的反應溫度相同（熱處理後先冷卻至相同反應溫度）。',true],
  ['time','各裝置在相同反應時間後觀察。',true],
  ['volume','各裝置起始油水量及加入液體的總量相同。',true],
  ['mixing','各裝置使用相同搖勻方式。',true],
  ['more','X＋Y 組可加入較多總液量，以便與其他組比較。',false],
  ['hot','煮沸組應趁熱觀察，毋須控制反應溫度。',false]
];
const assumptions = previousAssumptions.filter(([id])=>!['temperature','hot'].includes(id));
function assumptionsForRecord(r) {return r.uiVersion===3?assumptions:previousAssumptions;}
function assumptionText(id) {return previousAssumptions.find(a=>a[0]===id)?.[1]||id;}
const CONTROL_REFERENCE = '以油水＋2 mL 水作對照，與油水＋2 mL X、油水＋2 mL Y、油水＋各 1 mL X 和 Y 比較。保持起始油水量、加液總量、反應溫度、反應時間及搖勻方式相同。';
const DESIGN_REFERENCE = '四個標示清楚的基本裝置，分別是對照、X、Y、X＋Y；熱處理另比較煮沸 X 或 Y 後冷卻至 37°C 的組合，每次只改變一項因素。';
const LIMIT_REFERENCE = '油層、混濁或清澈只提供外觀線索，不能單獨證明產生甘油和脂肪酸；需其他化學檢測。此模擬使用預設教學結果，沒有量度反應速度。';
const experiments = {
  'none-none':['separated','油水分層（沒有明顯可觀察變化）'],
  'X-none':['cloudy','變得混濁'], 'Y-none':['thin-oil','油水分層（油層變薄）'],
  'XY-none':['clear','變得清澈'], 'XY-X':['clear','變得清澈'], 'XY-Y':['cloudy','變得混濁']
};
const trialKeys = Object.keys(experiments);
const outcomeLabels = {cloudy:'變得混濁',clear:'變得清澈',separated:'油水分層（沒有明顯變化）','thin-oil':'油水分層（油層變薄）'};
const questionLabels = {q1:'結論 1｜X 組的主要外觀',q3:'結論 2｜小油滴的總表面積',limitations:'結論 3｜本實驗的證據界限',q2:'延伸結論｜煮沸後失去作用的消化液'};
const conclusionAnswers = {q1:'cloudy',q3:'increase',limitations:'indirect',q2:'Y'};
const previousConclusionAnswers = {...conclusionAnswers,comparison:'combined',heatComparison:'yaffected'};
const FIELDS = ['initialObservation','hypothesisLiquid','hypothesisOutcome','reason','controlPlan','setupDescription','q1','q2','q3','limitations','reflection'];
function shuffledChoices(values,random=Math.random) {
  const result=[...values];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
function freshOptionOrder() {
  return {assumptions:shuffledChoices(assumptions.map(([id])=>id)),
    conclusions:Object.fromEntries(Object.keys(conclusionAnswers).map(id=>[id,shuffledChoices([...$('#'+id).options].map(o=>o.value).filter(Boolean))]))};
}
function renderAnswerOrder() {
  for(const [id,values] of Object.entries(state.optionOrder.conclusions)){
    const select=$('#'+id),options=new Map([...select.options].map(o=>[o.value,o]));
    values.forEach(value=>select.append(options.get(value)));
  }
}
function freshState(profile=null) {
  return {schemaVersion:2,uiVersion:3,moduleId:MODULE_ID,id:crypto.randomUUID(),createdAt:new Date().toISOString(),profile,
    phase:1,unlocked:1,liquid:'XY',heat:'none',records:[],firstObservations:{},initialDesign:null,finalAnswers:null,
    optionOrder:freshOptionOrder(),variableChoices:{iv:[],dv:[],cv:[]},assumptions:[],setupMade:false,setupSaved:false,setupMethod:'',setupImage:'',
    selectedObservation:'',experimentHasRun:false,extensionHeat:'',extensionObservation:'',extensionHasRun:false,
    submitted:false,submittedAt:null,reflectionSubmittedAt:null,events:[],phaseDurations:{1:0,2:0,3:0,4:0}};
}
let state = freshState(), activeSince = Date.now(), timingVisible = !document.hidden;
let saveTimer, toastTimer, allowUnload = false, previewRecord = null, sessionGeneration = 0;
const animationTimers = new Set();
function isTeacher(profile=state.profile) { return profile?.email?.toLowerCase() === TEACHER_EMAIL; }
function toast(message) { $('#toast').textContent=message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4500); }
function accountTime() {
  const now=Date.now();
  if(state.profile && timingVisible && !$('#profileModal').classList.contains('show')) state.phaseDurations[state.phase]+=(now-activeSince)/1000;
  activeSince=now;
}
function queueSave() { clearTimeout(saveTimer); if(state.profile&&!isTeacher()) saveTimer=setTimeout(saveRecord,400); }
function logEvent(type,details={}) {
  if(!state.profile||isTeacher()) return;
  state.events.push({type,at:new Date().toISOString(),phase:state.phase,...copy(details)});queueSave();
}
function readForms() { return Object.fromEntries(FIELDS.map(id=>[id,$('#'+id).value.trim()])); }
function designSnapshot() { return {at:new Date().toISOString(),form:readForms(),variableChoices:copy(state.variableChoices),assumptions:[...state.assumptions],setup:{saved:state.setupSaved,method:state.setupMethod,image:state.setupImage,description:$('#setupDescription').value.trim()}}; }
function buildRecord() {
  accountTime(); const form=readForms();
  const attemptCounts=state.events.reduce((out,e)=>{out[e.type]=(out[e.type]||0)+1;return out;},{});
  return {schemaVersion:2,uiVersion:3,moduleId:MODULE_ID,id:state.id,createdAt:state.createdAt,savedAt:new Date().toISOString(),profile:copy(state.profile),
    phase:state.phase,optionOrder:copy(state.optionOrder),submitted:state.submitted,submittedAt:state.submittedAt,reflectionSubmittedAt:state.reflectionSubmittedAt,
    durationSeconds:Math.round(Object.values(state.phaseDurations).reduce((a,b)=>a+b,0)),phaseDurations:copy(state.phaseDurations),attemptCounts,
    initialDesign:copy(state.initialDesign),finalAnswers:copy(state.finalAnswers),firstObservations:copy(state.firstObservations),
    phase1:{contextViewed:state.unlocked>1,observation:form.initialObservation},
    phase2:{hypothesis:{liquid:form.hypothesisLiquid,outcome:form.hypothesisOutcome,reason:form.reason},variableChoices:copy(state.variableChoices),assumptions:[...state.assumptions],controlPlan:form.controlPlan,setup:{saved:state.setupSaved,method:state.setupMethod,image:state.setupImage,description:form.setupDescription}},
    phase3:{trials:copy(state.records)},phase4:{conclusions:Object.fromEntries(Object.keys(conclusionAnswers).map(id=>[id,form[id]])),reflection:form.reflection},telemetry:copy(state.events)};
}
function validRecord(r) { return r && r.moduleId===MODULE_ID && r.profile && typeof r.profile.email==='string'; }
function legacyId(r) { let h=2166136261;for(const c of JSON.stringify(r)){h=Math.imul(h^c.charCodeAt(0),16777619);}return 'legacy-'+(h>>>0).toString(16); }
function rawLocalRecords() {
  const rows=JSON.parse(localStorage.getItem(RECORDS_KEY))||[];
  if(!Array.isArray(rows))throw new Error('Invalid record collection');
  return rows.map(r=>validRecord(r)?{...r,id:r.id||legacyId(r)}:r);
}
function readLocalRecords() {
  try {return rawLocalRecords().filter(validRecord);}
  catch {toast('未能讀取本機紀錄，原儲存內容會保留。請檢查瀏覽器儲存權限。');return [];}
}
function saveRecord() {
  const record=buildRecord();
  // Defense at the persistence boundary: no teacher or anonymous writes.
  if(!state.profile||isTeacher())return record;
  try {
    const records=rawLocalRecords(),index=records.findIndex(r=>r?.id===record.id);
    if(index<0)records.push(record);else records[index]=record;
    localStorage.setItem(RECORDS_KEY,JSON.stringify(records));
    localStorage.setItem(STORAGE_KEY,JSON.stringify(record));
  } catch {toast('未能儲存：瀏覽器空間不足或儲存權限被停用。請勿關閉此頁；完成反思後列印 PDF 保存。');}
  cloudSync.enqueue(record);
  return record;
}
function archiveCurrent() {
  try {
    const previous=JSON.parse(localStorage.getItem(STORAGE_KEY));if(!validRecord(previous)||isTeacher(previous.profile))return;
    const rows=rawLocalRecords();
    const exists=rows.filter(validRecord).some(r=>previous.id?r.id===previous.id:JSON.stringify({...r,id:undefined})===JSON.stringify({...previous,id:undefined}));
    if(!exists){rows.push({...previous,id:previous.id||legacyId(previous)});localStorage.setItem(RECORDS_KEY,JSON.stringify(rows));}
  } catch {toast('舊紀錄備份未能整理；原有儲存內容沒有刪除。');}
}
function liquidLabel(v) { return ({none:'對照：加入 2 mL 水',X:'加入 2 mL 消化液 X',Y:'加入 2 mL 消化液 Y',XY:'加入各 1 mL 消化液 X、Y'})[v]||'未提供'; }
function trialLabel(key) { const [liquid,heat]=key.split('-');return liquidLabel(liquid)+(heat==='none'?'':`（煮沸 ${heat} 後冷卻）`); }
function setPhase(p) {
  if(p>state.unlocked)return;accountTime();state.phase=p;
  $$('.phase').forEach(el=>el.classList.toggle('active',el.id===`phase-${p}`));
  $$('.step').forEach(el=>{el.disabled=+el.dataset.phase>state.unlocked;el.classList.toggle('active',+el.dataset.phase===p);if(+el.dataset.phase===p)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
  if(p===4)renderEvidence();logEvent('phase_opened',{phase:p});scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function renderVariableQuiz() {
  $('#variableQuiz').innerHTML=variableGroups.map(([group,title,definition])=>`<section class="variable-choice-group"><h4>${title}<span>（${definition}）</span></h4><div>${variableNames.map(name=>`<button type="button" class="variable-option" data-group="${group}" data-variable="${name}" aria-pressed="false">${name}</button>`).join('')}</div></section>`).join('');
  $$('.variable-option').forEach(b=>b.onclick=()=>{if(state.submitted)return;const {group,variable}=b.dataset;const choices=state.variableChoices[group];state.variableChoices[group]=choices.includes(variable)?choices.filter(v=>v!==variable):[...choices,variable];b.classList.toggle('selected',state.variableChoices[group].includes(variable));b.setAttribute('aria-pressed',String(state.variableChoices[group].includes(variable)));logEvent('variable_choice',{group,variable,choices:state.variableChoices[group]});refreshDesignGate();});
  $('#assumptionChoices').innerHTML=state.optionOrder.assumptions.map(id=>assumptions.find(a=>a[0]===id)).map(([id,text])=>`<label class="assumption-option"><input type="checkbox" value="${id}"> ${text}</label>`).join('');
  renderAnswerOrder();
  $$('#assumptionChoices input').forEach(input=>input.onchange=()=>{state.assumptions=$$('#assumptionChoices input:checked').map(el=>el.value);logEvent('assumptions_changed',{values:state.assumptions});});
}
function incompleteDesignParts() {
  const missing=[];
  if(!$('#hypothesisLiquid').value||!$('#hypothesisOutcome').value||!$('#reason').value.trim())missing.push('假說、預測及理由');
  if(!variableGroups.every(([g])=>state.variableChoices[g].length))missing.push('三類變量');
  if(!state.assumptions.length)missing.push('實驗前提');
  if(!$('#controlPlan').value.trim())missing.push('探究的對照組設計');
  if(!state.setupSaved)missing.push('已儲存的文字、繪圖或相片裝置設計');return missing;
}
function refreshDesignGate() { $('#variableFeedback').textContent=variableGroups.every(([g])=>state.variableChoices[g].length)?'已記錄你的變量選擇。':'請在三類變量中各選擇至少一項。'; }
function setupCanvas() {
  const canvas = $('#setupCanvas');
  const context = canvas.getContext('2d');
  const drawingControls = $$('.drawing-tools button, .drawing-tools label');
  const selectDrawingControl = control => drawingControls.forEach(item => {
    const selected = item === control;
    item.classList.toggle('selected', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  const uploadLabel=$('[data-drawing-control="upload"]');uploadLabel.onkeydown=e=>{if(!state.submitted&&['Enter',' '].includes(e.key)){e.preventDefault();$('#setupPhoto').click();}};
  let drawing = false;
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = '#111'; context.lineWidth = 4;
  const point = event => { const box = canvas.getBoundingClientRect(); return { x: (event.clientX - box.left) * canvas.width / box.width, y: (event.clientY - box.top) * canvas.height / box.height }; };
  canvas.onpointerdown = event => { if(state.submitted)return; drawing = true; canvas.setPointerCapture(event.pointerId); const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); };
  canvas.onpointermove = event => { if (!drawing) return; const p = point(event); context.lineTo(p.x, p.y); context.stroke(); };
  canvas.onpointerup = () => { if (drawing) { state.setupMade = true; state.setupSaved = false; state.setupMethod = 'drawing'; $('#setupFeedback').textContent='設計已更新，請按「儲存設計」。'; logEvent('setup_drawing_updated'); } drawing = false; };
  $$('[data-tool]').forEach(button => button.onclick = () => { selectDrawingControl(button); const erase = button.dataset.tool === 'eraser'; context.strokeStyle = erase ? '#fff' : '#111'; context.lineWidth = erase ? 28 : 4; });
  $('#clearCanvas').onclick = event => { selectDrawingControl(event.currentTarget); context.clearRect(0, 0, canvas.width, canvas.height); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); state.setupMade = state.setupSaved = false; state.setupImage = ''; $('#setupFeedback').textContent = '繪圖區已清除。'; logEvent('setup_cleared'); refreshDesignGate(); };
  $('#setupPhoto').onchange = event => {
    const file = event.target.files[0]; if (!file || state.submitted) return; const generation=sessionGeneration; if(file.size>8*1024*1024)return toast('請選擇小於 8 MB 的圖片。');
    selectDrawingControl(event.target.closest('label'));  
    const reader = new FileReader(); reader.onload = () => { const image = new Image(); image.onload = () => { if(generation!==sessionGeneration||state.submitted)return; context.clearRect(0, 0, canvas.width, canvas.height); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); const scale = Math.min(canvas.width / image.width, canvas.height / image.height); context.drawImage(image, (canvas.width-image.width*scale)/2, (canvas.height-image.height*scale)/2, image.width*scale, image.height*scale); state.setupMade = true; state.setupSaved = false; state.setupMethod = 'photo'; $('#setupFeedback').textContent = '相片已加入；請按「儲存設計」。'; logEvent('setup_photo_uploaded', { filename: file.name }); }; image.src = reader.result; }; reader.readAsDataURL(file);
  };
  $('#saveSetup').onclick = () => {
    if(state.submitted)return;
    const description=$('#setupDescription').value.trim();
    if(!state.setupMade&&!description)return $('#setupFeedback').textContent='請先繪圖、上載相片或填寫文字設計。';
    state.setupSaved=true;
    state.setupImage=state.setupMade?canvas.toDataURL('image/jpeg',.7):'';
    if(!state.setupMade)state.setupMethod='text';
    $('#setupFeedback').textContent='設計已儲存。';
    logEvent('setup_saved',{method:state.setupMethod,description});saveRecord();refreshDesignGate();
  };
}

function cancelAnimations() { animationTimers.forEach(clearTimeout);animationTimers.clear();state.running=false;state.extensionRunning=false;$$('.experiment-animation').forEach(el=>el.classList.remove('adding')); }
function later(fn,ms) { const generation=sessionGeneration,id=setTimeout(()=>{animationTimers.delete(id);if(generation===sessionGeneration)fn();},ms);animationTimers.add(id); }
function resetObservation() {state.selectedObservation='';state.experimentHasRun=false;$('#recordData').disabled=true;$$('#observationChoice button').forEach(b=>{b.disabled=true;b.classList.remove('selected');});}
function resetExtension() {state.extensionObservation='';state.extensionHasRun=false;$('#recordExtension').disabled=true;$$('[data-extension-observation]').forEach(b=>{b.disabled=true;b.classList.remove('selected');});}
function animateTrial(extension=false) {
  if(state.submitted||state.running||state.extensionRunning)return;
  const trial=extension?`XY-${state.extensionHeat}`:`${state.liquid}-none`;if(!experiments[trial])return;
  const [outcome]=experiments[trial];
  if(extension){resetExtension();state.extensionRunning=true;}else{resetObservation();state.running=true;}
  const tube=$(extension?'#extensionTube':'#testTube'),title=$(extension?'#extensionResultTitle':'#resultTitle'),container=$(extension?'#extensionDropper':'#mainDropper').parentElement;
  const colours=extension||state.liquid==='XY'?['#b9dfc3','#b9dfc3','#efb7b7','#efb7b7']:Array(4).fill(state.liquid==='X'?'#b9dfc3':state.liquid==='Y'?'#efb7b7':'#b9e4f2');
  [...$(extension?'#extensionDrops':'#mainDrops').children].forEach((drop,i)=>drop.style.setProperty('--drop-colour',colours[i]));
  tube.className='test-tube';title.textContent='正在加入試劑…';container.classList.remove('adding');void container.offsetWidth;container.classList.add('adding');
  $$('#liquidButtons button,[data-extension-heat],#runExperiment,#runExtension').forEach(b=>b.disabled=true);
  logEvent(extension?'extension_trial_run':'trial_run',{trial});
  later(()=>{tube.className='test-tube running';title.textContent='正在搖勻試管…';},2100);
  later(()=>{tube.className=`test-tube ${outcome}`;title.textContent='請自行判讀外觀';
    if(extension){state.extensionRunning=false;state.extensionHasRun=true;$$('[data-extension-observation]').forEach(b=>b.disabled=false);}else{state.running=false;state.experimentHasRun=true;$$('#observationChoice button').forEach(b=>b.disabled=false);}
    $$('#liquidButtons button,[data-extension-heat],#runExperiment').forEach(b=>b.disabled=false);$('#runExtension').disabled=!state.extensionHeat;
  },3000);
}
function recordTrial(extension=false) {
  if(state.submitted||state.running||state.extensionRunning)return;
  const key=extension?`XY-${state.extensionHeat}`:`${state.liquid}-none`,answer=extension?state.extensionObservation:state.selectedObservation;
  if(!(extension?state.extensionHasRun:state.experimentHasRun)||!answer)return;
  const record={key,liquid:extension?'XY':state.liquid,heat:extension?state.extensionHeat:'none',studentObservation:answer,studentLabel:outcomeLabels[answer],actual:experiments[key][0],correct:answer===experiments[key][0],at:new Date().toISOString()};
  if(!state.firstObservations[key])state.firstObservations[key]=copy(record);
  const index=state.records.findIndex(r=>r.key===key);if(index<0)state.records.push(record);else state.records[index]=record;
  logEvent('observation_recorded',{...record,first:copy(state.firstObservations[key])});
  if(extension)resetExtension();else resetObservation();renderTable();renderExtensionTable();renderEvidence();updateUnlock();saveRecord();toast('觀察已記錄，保留首次及最後確認的答案。');
  if(!extension)$('#observationTable').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function renderTable() {const rows=state.records.filter(r=>r.heat==='none');$('#dataBody').innerHTML=rows.length?rows.map((r,i)=>`<tr><td>${i+1}</td><td>${liquidLabel(r.liquid)}</td><td>${escapeHtml(r.studentLabel)}</td></tr>`).join(''):'<tr class="empty"><td colspan="3">尚未記錄數據</td></tr>';$('#trialPill').textContent=`${rows.length} / 4 個實驗裝置`;}
function renderExtensionTable() {const rows=state.records.filter(r=>r.heat!=='none');$('#extensionDataBody').innerHTML=rows.length?rows.map((r,i)=>`<tr><td>${i+1}</td><td>${trialLabel(r.key)}</td><td>${escapeHtml(r.studentLabel)}</td></tr>`).join(''):'<tr class="empty"><td colspan="3">尚未記錄延伸探究數據</td></tr>';}
function updateUnlock() {const complete=trialKeys.slice(0,4).every(key=>state.records.some(r=>r.key===key));if(complete)state.unlocked=4;$('#analyseButton').disabled=!complete;$('.step[data-phase="4"]').disabled=!complete;$('#unlockMessage').textContent=complete?'四個裝置已記錄，可以分析數據。':'請完成對照、X、Y、X＋Y 四個裝置的觀察。';}
function renderEvidence() {$('#evidenceList').innerHTML=state.records.map(r=>`<div class="evidence"><strong>${trialLabel(r.key)}</strong> → 你記錄：${escapeHtml(r.studentLabel)}</div>`).join('');}
function reflectionComplete(r) {return !!r.submitted && !!r.reflectionSubmittedAt && !!r.phase4?.reflection?.trim();}
function currentReflectionComplete() {return state.submitted&&!!state.reflectionSubmittedAt&&!!$('#reflection').value.trim();}
function hypothesisText(h) {return h?`若${liquidLabel(h.liquid)}，預測外觀會${outcomeLabels[h.outcome]||'未提供'}。`:'未提供（舊版未保存原始假說）';}
function originalHypothesis(r) {const f=r.initialDesign?.form;return f?{liquid:f.hypothesisLiquid,outcome:f.hypothesisOutcome,reason:f.reason}:null;}
function applyLock() {
  $$('.phase input,.phase select,.phase textarea,.phase button').forEach(el=>{if(el.closest('#reflectionReveal')||el.closest('#completeBar')||el.dataset.back)return;if(state.submitted)el.disabled=true;});
  // Canvas and asynchronous image handlers also enforce this lock.
  $('#setupCanvas').setAttribute('aria-disabled',String(state.submitted));
  $('#conceptReveal').classList.toggle('show',state.submitted);$('#reflectionReveal').classList.toggle('show',state.submitted);$('#completeBar').hidden=!state.submitted;
  const complete=currentReflectionComplete();$('#reflection').disabled=complete;$('#saveReflection').disabled=!state.submitted||complete;$('#downloadRecord').disabled=!complete;
  $('#reflectionStatus').textContent=complete?'學習反思已提交，可以列印／儲存 PDF。':'探究答案已鎖定；請填寫並提交反思，才可列印／儲存 PDF。';
  $('#saveReflection').textContent=complete?'✓ 學習反思已提交':'儲存並提交學習反思';
  $('#completeBar strong').textContent=complete?'模組完成':'探究已遞交，待提交反思';
  $('#completeBar p').textContent=isTeacher()?'教師示範只留在目前頁面，不加入學生紀錄或 Excel。':'原始及最後答案已保存於這部瀏覽器。';
  const h=originalHypothesis({initialDesign:state.initialDesign});$('#originalHypothesis').innerHTML=`<blockquote><strong>你的原始假說</strong><p>${escapeHtml(hypothesisText(h))}</p><p><span>原始理由：</span><span${h?.reason?' data-language-user':''}>${escapeHtml(h?.reason||'未提供')}</span></p></blockquote>`;
}
function submitInvestigation() {
  if(state.submitted)return;
  if(state.running||state.extensionRunning)return toast('請等待實驗完成。');
  const missing=Object.keys(conclusionAnswers).filter(id=>!$('#'+id).value).map(id=>questionLabels[id]);
  if(!trialKeys.every(key=>state.records.some(r=>r.key===key)))missing.push('六組觀察');
  if(missing.length)return toast('請完成：'+missing.join('、'));
  if(!confirm(uiText('遞交後原探究答案不能修改；你仍可填寫學習反思。確定遞交嗎？')))return;
  state.finalAnswers=designSnapshot();state.finalAnswers.trials=copy(state.records);
  state.submitted=true;state.submittedAt=new Date().toISOString();logEvent('investigation_submitted',{answers:state.finalAnswers});saveRecord();applyLock();$('#conceptReveal').scrollIntoView({behavior:'smooth'});
}
function resetSession(profile=null) {
  cancelAnimations();clearTimeout(saveTimer);clearTimeout(toastTimer);sessionGeneration++;
  state=freshState(profile);activeSince=Date.now();timingVisible=!document.hidden;previewRecord=null;
  FIELDS.forEach(id=>{const el=$('#'+id);el.value='';el.disabled=false;});
  $$('.phase button,.phase input,.phase select').forEach(el=>el.disabled=false);
  $('#setupPhoto').value='';$('#teacherDetail').hidden=true;$('#teacherReport').innerHTML='';$('#printReport').innerHTML='';
  $('#studentName').toggleAttribute('data-language-user',!!profile&&!isTeacher());$('#avatar').toggleAttribute('data-language-user',!!profile&&!isTeacher());
  $('#studentName').textContent=isTeacher()?'教師示範':profile?.name||'同學';$('#avatar').textContent=isTeacher()?'師':profile?.name?.[0]||'同';$('#teacherButton').hidden=!isTeacher();
  $('#setupFeedback').textContent='';$('#conclusionFeedback').textContent='';$('#extensionFeedback').textContent='';
  $('#resultTitle').textContent='等待進行實驗';$('#extensionResultTitle').textContent='等待進行延伸測試';$('#testTube').className='test-tube';$('#extensionTube').className='test-tube';
  $$('#liquidButtons button').forEach(b=>b.classList.toggle('selected',b.dataset.liquid==='XY'));$$('[data-extension-heat]').forEach(b=>b.classList.remove('selected'));
  renderVariableQuiz();setupCanvas();renderTable();renderExtensionTable();renderEvidence();resetObservation();resetExtension();$('#runExtension').disabled=true;
  $('#revealConcept').textContent='遞交探究，查看學習重點';$('#toast').classList.remove('show');applyLock();setPhase(1);updateUnlock();
  $('main').inert=!profile;
}
function returnToLogin() {
  if(!confirm(uiText('開始新的探究？本次答案會保留；每次登入均建立新紀錄。')))return;
  saveRecord();allowUnload=true;cancelAnimations();clearTimeout(saveTimer);location.reload();
}
function formatDuration(seconds) {if(!Number.isFinite(seconds))return '未提供';const n=Math.round(seconds);return `${Math.floor(n/60)} 分 ${n%60} 秒`;}
function formatDate(value) {return value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('zh-HK',{timeZone:'Asia/Hong_Kong',dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'未提供';}
// Excel and persisted answers always use the original Chinese choice labels.
function answerText(id,value) {return value?(window.VL1Language?.canonicalOption(id,value) ?? $('#'+id).querySelector(`option[value="${CSS.escape(value)}"]`)?.textContent)||'未提供':'未提供';}
function variablesForRecord(r,g) {return r.schemaVersion!==2&&g==='cv'?expectedVariables.cv.slice(0,3):expectedVariables[g];}
function sameChoices(a,b) {return Array.isArray(a)&&a.length===b.length&&b.every(x=>a.includes(x));}
function answerMark(correct) {return correct===null?'':`<span class="answer-mark ${correct?'correct':'incorrect'}">${correct?'✓':'✕'}</span>`;}
function reportAnswer(title,answer,reference='',correct=null,user=false) {return `<div class="report-answer"><b>${escapeHtml(title)}</b>${answerMark(correct)}<p${user&&answer?' data-language-user':''}>${escapeHtml(answer||'未提供')}</p><small>${correct===null?'參考說明':'參考答案'}：${escapeHtml(reference)}</small></div>`;}
function safeImage(value) {return /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(value||'')?value:'';}
function renderPrint(r) {
  const h=originalHypothesis(r),vars=r.phase2?.variableChoices||{},trials=r.phase3?.trials||[],answers=r.phase4?.conclusions||{};
  const open=(title,value,ref,user=true)=>reportAnswer(title,value,ref,null,user);
  const variables=variableGroups.map(([g,title])=>reportAnswer(title,vars[g]?.join('、'),variablesForRecord(r,g).join('、'),vars[g]?.length?sameChoices(vars[g],variablesForRecord(r,g)):null)).join('');
  const selected=r.phase2?.assumptions,recordAssumptions=assumptionsForRecord(r);
  const image=safeImage(r.phase2?.setup?.image);
  const table=`<table class="report-table"><thead><tr><th>裝置／條件</th><th>首次確認</th><th>最後確認</th><th>回饋</th><th>參考外觀</th></tr></thead><tbody>${trialKeys.map(key=>{const t=trials.find(t=>t.key===key),first=r.firstObservations?.[key];return `<tr><td>${trialLabel(key)}</td><td>${escapeHtml(first?.studentLabel||'未提供')}</td><td>${escapeHtml(t?.studentLabel||'未提供')}</td><td>${answerMark(t? t.studentObservation===experiments[key][0]:null)}</td><td>${experiments[key][1]}</td></tr>`;}).join('')}</tbody></table>`;
  $('#printReport').innerHTML=`<header class="report-cover"><span class="report-logo">✦</span><div><p>IBL 虛擬實驗室 · S4 生物</p><h1>未知消化液 X 與 Y</h1><strong>個人學習紀錄與回饋${isTeacher(r.profile)?'（教師示範）':''}</strong></div></header>
  <section class="report-profile"><div><small>學生</small><b data-language-user>${escapeHtml(r.profile?.name)}</b></div><div><small>班別及學號</small><b data-language-user>${escapeHtml(r.profile?.classInfo)}</b></div><div><small>紀錄時間</small><b>${formatDate(r.savedAt)}</b></div><div><small>有效探究用時${r.schemaVersion===2?'':'（舊版計時）'}</small><b>${formatDuration(r.durationSeconds)}</b></div></section>
  <section class="report-stage"><h2>01 了解情境</h2><div class="report-card context-summary"><img src="assets/oil-water-tube.png" alt="油水試管"><div><h3>研究任務</h3><p>比較 X、Y 及其組合對油水混合物外觀的影響。</p></div></div><div class="report-card">${open('你的初步觀察',r.phase1?.observation,'描述可見的油水層及試管外觀；不要以身分猜測代替觀察。')}</div></section>
  <section class="report-stage"><h2>02 設計探究</h2><div class="report-card">${open('第一次實驗前固定保存的原始假說',hypothesisText(h),'合理且可測試的原始假說不因預測錯誤而判錯。',false)}${open('原始理由',h?.reason,'說明可測試預測的理由；沒有唯一措辭。')}</div><div class="report-card">${variables}${reportAnswer('實驗前提',selected?.map(assumptionText).join('；'),recordAssumptions.filter(a=>a[2]).map(a=>a[1]).join('；'),selected?.length?sameChoices(selected,recordAssumptions.filter(a=>a[2]).map(a=>a[0])):null)}${open('探究的對照組',r.phase2?.controlPlan,CONTROL_REFERENCE)}${open('裝置文字設計',r.phase2?.setup?.description,DESIGN_REFERENCE)}${image?`<img class="setup-image" src="${image}" alt="學生保存的裝置設計">`:''}<p class="feedback-note">裝置圖及開放題由教師判斷，沒有自動對錯標記。</p></div></section>
  <section class="report-stage page-break"><h2>03 六組觀察</h2><div class="report-card">${table}<p>${LIMIT_REFERENCE}</p></div></section>
  <section class="report-stage"><h2>04 分析與結論</h2><div class="report-card">${Object.keys(conclusionAnswers).map(id=>reportAnswer(questionLabels[id],answerText(id,answers[id]),answerText(id,conclusionAnswers[id]),answers[id]?answers[id]===conclusionAnswers[id]:null)).join('')}</div>
  ${r.submitted||r.schemaVersion!==2?`<div class="concept-summary"><h3>學習重點</h3>${canonicalHTML($('#conceptReveal .learning-points'))}${canonicalHTML($('#conceptReveal .learning-diagrams'))}<p>${LIMIT_REFERENCE}</p></div>`:'<p>此份紀錄尚未遞交探究，學習重點尚未開放。</p>'}
  <div class="reflection-summary">${open('實際學習反思',r.phase4?.reflection,'判斷原始假說是否獲支持；引用具體組別比較，運用乳化、表面積、脂肪酶及變性概念修訂解釋。')}<p>反思狀態：${reflectionComplete(r)?'已提交':r.schemaVersion===2?'未提交':'未提供（舊版未記錄）'}</p></div></section><footer class="report-footer">探究實驗室 · 原始答案與參考說明 · 答案及回饋 · 請另存此份 PDF</footer>`;
  window.VL1Language?.refresh($('#printReport'));
}
function reportFilename(r) {const safe=v=>String(v||'未提供').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').trim().replace(/[. ]+$/g,'')||'未提供';return `VL1_未知消化液X與Y_${safe(r.profile?.classInfo)}_${safe(r.profile?.name)}`;}
async function printRecord(r) {
  renderPrint(r);await Promise.all($$('#printReport img').map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;})));
  document.title=reportFilename(r);document.body.classList.add('print-record');
  try{window.print();}catch(e){restorePrint();throw e;}
}
function restorePrint() {document.title=uiText(PAGE_TITLE);document.body.classList.remove('print-record');}
window.addEventListener('afterprint',restorePrint);
let dashboardGeneration=0;
const cloudSync=createCloudSync({endpoint:window.VL1_CLOUD_CONFIG?.endpoint||'',transport:window.VL1_CLOUD_CONFIG?.transport||'auto',storage:localStorage,records:readLocalRecords,
  status:(kind,message)=>{for(const id of ['cloudStatus','loginCloudStatus']){$('#'+id).textContent=message;$('#'+id).dataset.state=kind;}for(const id of ['retryCloud','loginRetryCloud'])$('#'+id).hidden=!cloudSync.enabled||!['error','pending'].includes(kind);}});
function mergeRecords(local,remote) {
  const merged=new Map();
  for(const r of [...local,...remote].filter(validRecord).filter(r=>!isTeacher(r.profile))){
    const previous=merged.get(r.id);
    if(!previous||Date.parse(r.savedAt)>=Date.parse(previous.savedAt)||!previous.savedAt)merged.set(r.id,r);
  }
  return [...merged.values()];
}
async function allTeacherRecords(password) {
  if(!cloudSync.enabled)return readLocalRecords().filter(r=>!isTeacher(r.profile));
  // Export never silently falls back to a partial local-only collection.
  await cloudSync.flush();
  return mergeRecords(readLocalRecords(),await cloudSync.list(password));
}
async function startTeacherDashboard(password) {
  if(!isTeacher())return;
  const generation=++dashboardGeneration;
  $('#cloudTeacherForm').hidden=!cloudSync.enabled;
  let rows;
  try {
    $('#dashboardStatus').textContent=cloudSync.enabled?'正在讀取全班雲端紀錄……':'雲端未設定，以下只包含這部瀏覽器的紀錄。';
    rows=await allTeacherRecords(password);
  } catch(e) {
    if(generation!==dashboardGeneration)return;
    $('#dashboardStatus').textContent=e.message+'；尚未載入全班紀錄，不能匯出。';
    $('#teacherData').innerHTML='';$('#teacherDetail').hidden=true;return;
  }
  if(generation!==dashboardGeneration||!isTeacher())return;
  $('#dashboardStatus').textContent=`${cloudSync.enabled?'全班雲端與本機':'這部瀏覽器'}共有 ${rows.length} 份學生探究紀錄；同一電郵的多次探究會分開保存。${cloudSync.enabled?'匯出時會重新讀取雲端最新資料。':'尚未啟用跨裝置同步。'}`;
  $('#teacherData').innerHTML=rows.length?rows.map((r,i)=>{const trials=r.phase3?.trials||[];return `<tr><td><strong data-language-user>${escapeHtml(r.profile.name)}</strong><small data-language-user>${escapeHtml(r.profile.email)}</small></td><td data-language-user>${escapeHtml(r.profile.classInfo)}</td><td>${reflectionComplete(r)?'已完成':r.submitted?'待提交反思':r.schemaVersion===2?'進行中':'舊版（新欄位未提供）'}</td><td>${trials.filter(t=>t.studentObservation===experiments[t.key]?.[0]).length} / ${trials.length}</td><td>${formatDuration(r.durationSeconds)}</td><td>${formatDate(r.savedAt)}</td><td><button class="secondary" data-view-record="${i}">查看紀錄</button></td></tr>`;}).join(''):'<tr><td colspan="7">暫無學生紀錄</td></tr>';
  $$('[data-view-record]').forEach(b=>b.onclick=()=>{previewRecord=copy(rows[+b.dataset.viewRecord]);renderPrint(previewRecord);$('#teacherReport').innerHTML=canonicalHTML($('#printReport'),true);$('#teacherDetail').hidden=false;});
}
// Activity rubric draft: scores live only in the downloaded teacher workbook.
function scoringWorkbook(records) {
  const columns=[
    ['id','探究識別碼','identity'],['name','姓名','identity'],['class','班別及學號','identity'],['status','完成狀態','identity'],
    ['observation','觀察｜初步觀察（教師 0–2）','observing',2],['trials','觀察｜六組外觀（自動 0–2）','observing'],['observing','SPS 觀察（0–4）','observing'],
    ['iv','分類｜獨立變量（自動 0–1）','classifying'],['dv','分類｜因變量（自動 0–1）','classifying'],['cv','分類｜控制變量（自動 0–2）','classifying'],['classifying','SPS 分類（0–4）','classifying'],
    ['hypothesis','設計｜原始假說與理由（教師 0–2）','designing',2],['assumptions','設計｜前提選擇（自動 0–1）','designing'],['control','設計｜對照組（教師 0–1）','designing',1],['designing','SPS 設計探究（0–4）','designing'],
    ['setup','實作｜裝置品質（教師 0–2）','conducting',2],['fair','實作｜固定條件與實驗安排（教師 0–2）','conducting',2],['conducting','SPS 進行實驗（0–4）','conducting'],
    ['inference','推論｜結論及界限（自動 0–4）','inferring'],['inferring','SPS 推論（0–4）','inferring'],
    ['communication','溝通｜資料與主張（教師 0–4）','communicating',4],['communicating','SPS 溝通（0–4）','communicating'],['sps','SPS 總分（0–24）','score'],
    ['emulsion','新知識｜膽汁乳化與表面積（教師 0–2）','knowledge',2],['enzyme','新知識｜脂肪酶與產物（教師 0–2）','knowledge',2],['heat','新知識｜高溫與變性（教師 0–2）','knowledge',2],['revision','新知識｜修訂解釋並連結數據（教師 0–2）','knowledge',2],['knowledge','新知識總分（0–8）','knowledge'],['overall','整體分數（0–32）','score'],['marking','評分狀態','score']
  ];
  const col=Object.fromEntries(columns.map(([id],i)=>[id,colName(i)]));
  const rows=[columns.map(([,label,group])=>excelCell(label,group))],conditional=[];
  const maxima=Object.fromEntries(columns.filter(c=>c[3]!==undefined).map(c=>[c[0],c[3]]));
  const round=n=>Math.round(n*100)/100;
  records.forEach((r,i)=>{
    const n=i+2,ref=id=>col[id]+n,v=r.phase2?.variableChoices||{},a=r.phase4?.conclusions||{},trials=r.phase3?.trials||[];
    const completeTrialSet=trialKeys.every(key=>trials.some(t=>t.key===key));
    const objective=(g,max)=>Array.isArray(v[g])&&v[g].length?(sameChoices(v[g],expectedVariables[g])?max:0):'未提供';
    const cv=r.schemaVersion===2&&Array.isArray(v.cv)&&v.cv.length?round(expectedVariables.cv.filter(x=>v.cv.includes(x)).length/5*2*(v.cv.some(x=>!expectedVariables.cv.includes(x))?0:1)):'未提供';
    const expectedAnswers=r.uiVersion===3?conclusionAnswers:previousConclusionAnswers;
    const weight=r.uiVersion===3?{q1:1,q3:1,limitations:1,q2:1}:{q1:.5,q2:.5,q3:.5,comparison:.75,heatComparison:.75,limitations:1};
    const values={id:r.id,name:r.profile?.name,class:r.profile?.classInfo,status:reflectionComplete(r)?'已完成':r.schemaVersion!==2?'舊版／未提供':r.submitted?'待提交反思':'進行中',
      trials:completeTrialSet?round(trialKeys.filter(key=>trials.find(t=>t.key===key)?.studentObservation===experiments[key][0]).length/6*2):'未提供',
      iv:objective('iv',1),dv:objective('dv',1),cv,
      assumptions:r.phase2?.assumptions?.length?(sameChoices(r.phase2.assumptions,assumptionsForRecord(r).filter(x=>x[2]).map(x=>x[0]))?1:0):'未提供',
      inference:Object.keys(weight).every(id=>a[id])?Object.entries(weight).reduce((sum,[id,w])=>sum+(a[id]===expectedAnswers[id]?w:0),0):'未提供'};
    // Validate numeric ranges in formulas too: pasted invalid scores cannot create an overall total.
    const valid=ids=>ids.map(id=>maxima[id]!==undefined?`AND(ISNUMBER(${ref(id)}),${ref(id)}>=0,${ref(id)}<=${maxima[id]},IFERROR(MOD(${ref(id)},1)=0,FALSE))`:`ISNUMBER(${ref(id)})`).join(',');
    const sum=ids=>`IF(AND(${valid(ids)}),ROUND(SUM(${ids.map(ref).join(',')}),2),"待評")`;
    const sps=['observing','classifying','designing','conducting','inferring','communicating'],knowledge=['emulsion','enzyme','heat','revision'];
    const formulas={observing:sum(['observation','trials']),classifying:sum(['iv','dv','cv']),designing:sum(['hypothesis','assumptions','control']),conducting:sum(['setup','fair']),inferring:sum(['inference']),communicating:sum(['communication']),sps:sum(sps),knowledge:sum(knowledge),
      overall:`IF(AND(ISNUMBER(${ref('sps')}),ISNUMBER(${ref('knowledge')}),${ref('status')}="已完成"),ROUND(SUM(${ref('sps')},${ref('knowledge')}),2),"待評／未完成")`,
      marking:`IF(AND(${valid(Object.keys(maxima))},ISNUMBER(${ref('sps')}),ISNUMBER(${ref('knowledge')}),${ref('status')}="已完成"),"評分完成","待評／學生未完成／分數不符範圍")`};
    rows.push(columns.map(([id,,group,max])=>formulas[id]?excelFormula(formulas[id],group):excelCell(max!==undefined?'':values[id],group)));
    const allMax={...maxima,trials:2,iv:1,dv:1,cv:2,assumptions:1,inference:4,observing:4,classifying:4,designing:4,conducting:4,inferring:4,communicating:4,sps:24,knowledge:8,overall:32};
    Object.entries(allMax).forEach(([id,max])=>conditional.push(colourRule(ref(id),ref(id),max)));
  });
  const validations=records.length?columns.filter(c=>c[3]!==undefined).map(([id,,,max])=>({range:`${col[id]}2:${col[id]}${records.length+1}`,max})):[];
  const rubric=[['類別／題目','最高分','評分方式','滿分準則','部分得分準則','零分／缺漏處理']];
  const add=(g,title,max,method,full,partial,zero)=>rubric.push([excelCell(title,g),max,method,full,partial,zero]);
  add('reference','活動 rubric 初稿：待研究者校準',32,'研究說明','六項 SPS 各 4 分；新知識四項各 2 分。總分 32。','跨 VL 的題目、難度、機會與評分者一致性需校準。','不是已驗證量表；與 SPSAI／CKT 分開。紙本需提供相同問題與靜態資料。');
  add('observing','初步觀察',2,'人工','2：準確描述可見油水層及圖像細節，區分觀察與猜測。','1：有具體但不完整的描述。','0：無有效觀察；缺少舊版欄位保留待評，不捏造。');
  add('observing','六組外觀',2,'自動','六組均有確認答案；按符合預設外觀的組數／6×2，四捨五入至兩位小數。','部分符合參考外觀按比例得分。','已答但均不符合為 0；缺少組別顯示未提供，不以完成率當能力分數。');
  add('classifying','獨立變量',1,'自動','只選消化液組合。','無部分分數。','有答案但不符為 0；未提供不補 0。');
  add('classifying','因變量',1,'自動','只選混合物外觀。','無部分分數。','有答案但不符為 0；未提供不補 0。');
  add('classifying','控制變量',2,'自動','五項固定條件全選，且無選錯。','選中正確控制變量數／5×2；選錯類別為 0。','舊版只問三項；不能以缺少新選項推斷原能力。跨版比較需另行校準。');
  add('designing','原始可測試假說與理由',2,'人工','2：具可比較條件、可觀察預測及合理理由。','1：可測試但理由或條件不完整。','0：不可測試或沒有合理內容；合理假說不因猜錯而扣分。沒有原始快照時待評。');
  add('designing','實驗前提',1,'自動','現版只選時間、起始油水及加液總量、搖勻方式三項；不選增加總加液量。','無部分分數。','有答案但不符為 0；舊版沒有此題為未提供。');
  add('designing','對照組',1,'人工','1：合理說明需要對照組的比較用途，提出不加消化液的比較裝置並保持條件相同。','此欄只填整數 0 或 1。','0：無有效對照用途說明或理由不合理；沒有此題則待評。');
  add('conducting','裝置品質',2,'人工','2：圖／相片／文字清晰、四組標示、用量合理。','1：方案可操作但標示或用量不完整。','0：無可操作方案；不能因使用文字而扣分。');
  add('conducting','固定條件與實驗安排',2,'人工','2：依設計與操作證據保持公平比較，熱處理冷卻後使用，每次只改變一因素。','1：基本合理但條件或熱處理安排不完整。','0：安排不能有效比較。六組完整性只作證據，不以完成率、點擊或用時直接換分。');
  add('inferring','結論、比較及界限',4,'自動','現版三項推論（外觀、表面積、證據界限）及延伸結論各 1，共 4；歷史版按原六題權重（0.5、0.5、0.5、0.75、0.75、1）。','只按各題明確參考答案得分。','按紀錄版本檢查當時的全部題目；不要求現版回答已刪除題目，歷史缺題不補答案。');
  add('communicating','資料與主張',4,'人工','4：清楚組織資料，引用至少兩組具體觀察，連結主張並說明界限。','3：完整比較但界限稍弱；2：有效比較但連結不足；1：僅單一相關描述。','0：無有效溝通。現版依假說理由、對照說明、裝置標示、數據表及反思的表達評分；歷史版另可用具體比較說明。評溝通清晰度，不重複評新知識。');
  add('knowledge','膽汁乳化與表面積',2,'人工：只看學習後反思','2：膽汁不含消化酶，乳化是物理作用，小油滴增加總表面積。','1：概念部分正確但解釋不完整。','0：沒有運用或概念錯誤；未提交反思不能當作零分。');
  add('knowledge','脂肪酶化學消化及產物',2,'人工：只看學習後反思','2：脂肪酶催化化學消化，形成甘油和脂肪酸。','1：酶作用或產物部分正確。','0：沒有運用或概念錯誤；不是關鍵字計分。');
  add('knowledge','高溫造成酶變性',2,'人工：只看學習後反思','2：把煮沸 Y 的觀察連結酶蛋白質變性及失去功能。','1：知道高溫影響但欠機理解釋。','0：沒有運用或概念錯誤。');
  add('knowledge','修訂原始解釋與數據',2,'人工：只看學習後反思','2：回應原始假說是否受支持，引用具體比較，運用概念修訂／完善並注意外觀界限。','1：有比較或修訂但連結不完整。','0：沒有有效修訂或數據連結。');
  add('score','SPS、新知識及整體分數',32,'公式','六項 SPS=24；四項新知識=8。學生已提交反思且所有必要評分完整才顯示整體。','空白顯示待評；填 0 才是零分。教師欄只接受範圍內整數。','貼上超範圍或非整數也不會得到有效總分；評分欄沒有內容時勿填 0 代替待評。');
  add('reference','色彩、紀錄及人工分數保存',0,'說明','綠字正確／滿分、紅字錯誤／零分、橙字部分分數；底色區分題目與 SPS 類別。','原始、首次觀察、最後答案與完整事件分表；時間是可見頁面有效秒數。','人工分數只在此 Excel；另存檔保留，重新匯出不會帶入。學生 PDF 無分數。');
  return {sheet:{name:'教師評分',rows,validations,conditional},rubric:{name:'評分準則',rows:rubric},col};
}
function colourRule(cell,score,max) {return {cell,formulas:[`AND(ISNUMBER(${score}),${score}=${max})`,`AND(ISNUMBER(${score}),${score}=0)`,`AND(ISNUMBER(${score}),${score}>0,${score}<${max})`]};}
function download(blob,name) {const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function exportExcel() {
  if(!isTeacher())return;
  let records;
  try {records=await allTeacherRecords();}
  catch(e){toast('未匯出：'+e.message+'。請解鎖雲端並重試，避免下載不完整的全班紀錄。');return;}
  if(!isTeacher())return;
  const headings=['探究識別碼','姓名','班別及學號','電郵','狀態','建立時間','探究提交時間','反思提交時間','初步觀察','原始假說','原始理由','最後假說','最後理由','獨立變量','因變量','控制變量','實驗前提','對照組設計','裝置文字設計',...Object.values(questionLabels),'歷史具體比較說明（現版不設此題）','實際學習反思','總有效秒數','階段一秒數','階段二秒數','階段三秒數','階段四秒數','基本實驗次數','延伸實驗次數','確認觀察次數','理由修改次數'];
  const groups=headings.map((_,c)=>c<8?'identity':c===8?'observing':c<13?'designing':c<16?'classifying':c<19?'designing':c<23?'inferring':c===23?'communicating':c===24?'knowledge':'identity');
  const answers=[headings.map((h,c)=>excelCell(h,groups[c]))],observations=[['探究識別碼','姓名','裝置','首次確認外觀','最後確認外觀','參考外觀','最後回饋','首次確認時間','最後確認時間']];
  const events=[['探究識別碼','姓名','事件','時間（香港）','階段','原始時間戳','內容分段','完整事件內容']];
  const snapshots=[['探究識別碼','姓名','快照類別','保存時間','內容分段','原始完整內容（唯讀）']];
  const designs=[['姓名','班別及學號','電郵','文字設計','裝置設計圖']],images=[];
  records.forEach(r=>{
    const h=originalHypothesis(r),last=r.phase2?.hypothesis,v=r.phase2?.variableChoices||{},conclusions=r.phase4?.conclusions||{},selection=r.phase2?.assumptions;
    const row=[r.id,r.profile.name,r.profile.classInfo,r.profile.email,reflectionComplete(r)?'已完成':r.submitted?'待提交反思':r.schemaVersion===2?'進行中':'舊版／未提供',formatDate(r.createdAt),formatDate(r.submittedAt),formatDate(r.reflectionSubmittedAt),r.phase1?.observation||'未提供',hypothesisText(h),h?.reason||'未提供',last?hypothesisText(last):'未提供',last?.reason||'未提供',v.iv?.join('、')||'未提供',v.dv?.join('、')||'未提供',v.cv?.join('、')||'未提供',selection?.map(assumptionText).join('；')||'未提供',r.phase2?.controlPlan||'未提供',r.phase2?.setup?.description||'未提供',...Object.keys(questionLabels).map(id=>answerText(id,conclusions[id])),r.phase4?.evidenceExplanation||'未提供',r.phase4?.reflection||'未提供',r.durationSeconds??'未提供',...[1,2,3,4].map(p=>r.phaseDurations?.[p]===undefined?'未提供':Math.round(r.phaseDurations[p])),...['trial_run','extension_trial_run','observation_recorded','reason_updated'].map(id=>r.attemptCounts?.[id]??'未提供')];
    const checks={13:v.iv?.length?sameChoices(v.iv,expectedVariables.iv):null,14:v.dv?.length?sameChoices(v.dv,expectedVariables.dv):null,15:v.cv?.length?sameChoices(v.cv,variablesForRecord(r,'cv')):null,16:selection?.length?sameChoices(selection,assumptionsForRecord(r).filter(a=>a[2]).map(a=>a[0])):null};
    Object.keys(conclusionAnswers).forEach((id,i)=>checks[19+i]=conclusions[id]?conclusions[id]===conclusionAnswers[id]:null);
    answers.push(row.map((value,c)=>excelCell(value,groups[c],checks[c]??null)));
    trialKeys.forEach(key=>{const first=r.firstObservations?.[key],last=(r.phase3?.trials||[]).find(t=>t.key===key);observations.push([excelCell(r.id),excelCell(r.profile.name),excelCell(trialLabel(key),'conducting'),excelCell(first?.studentLabel||'未提供','observing',first?first.studentObservation===experiments[key][0]:null),excelCell(last?.studentLabel||'未提供','observing',last?last.studentObservation===experiments[key][0]:null),excelCell(experiments[key][1],'reference'),last?(last.studentObservation===experiments[key][0]?'正確':'錯誤'):'未提供',formatDate(first?.at),formatDate(last?.at)]);});
    (r.telemetry||[]).forEach(e=>excelChunks(JSON.stringify(e)).forEach((chunk,i)=>events.push([r.id,r.profile.name,eventLabel(e.type),formatDate(e.at),e.phase??'未提供',e.at,i+1,chunk])));
    [[r.initialDesign,'第一次實驗前固定快照',r.initialDesign?.at],[r.finalAnswers,'遞交時最後答案',r.submittedAt],[r,'本機完整紀錄（含舊版原值）',r.savedAt]].forEach(([snapshot,label,at])=>excelChunks(snapshot?JSON.stringify(snapshot):'未提供').forEach((chunk,i)=>snapshots.push([r.id,r.profile.name,label,formatDate(at),i+1,chunk])));
    designs.push([r.profile.name,r.profile.classInfo,r.profile.email,r.phase2?.setup?.description||'未提供',safeImage(r.phase2?.setup?.image)?'圖像如下':'未提供']);
    const image=safeImage(r.phase2?.setup?.image);if(image)images.push({row:designs.length-1,data:image,ext:image.startsWith('data:image/png')?'png':'jpeg'});
  });
  const scoring=scoringWorkbook(records),conditional=[];
  records.forEach((r,i)=>{const n=i+2;[[8,'observation',2],[9,'hypothesis',2],[10,'hypothesis',2],[17,'control',1],[18,'setup',2],[24,'knowledge',8]].forEach(([c,id,max])=>conditional.push(colourRule(colName(c)+n,`INDIRECT("'教師評分'!${scoring.col[id]}${n}")`,max)));});
  download(workbook([{name:'學生探究答案',rows:answers,conditional},{name:'六組觀察紀錄',rows:observations},scoring.sheet,scoring.rubric,{name:'操作事件紀錄',rows:events},{name:'原始與遞交快照',rows:snapshots},{name:'裝置設計圖',rows:designs}],images),'VL1_未知消化液X與Y_全班學習紀錄.xlsx');
}
// Excel limits cell text to 32,767 UTF-16 units; split raw payloads without losing content.
function excelChunks(text) {
  const out=[];let chunk='';
  for(const character of text){if(chunk.length+character.length>30000){out.push(chunk);chunk='';}chunk+=character;}
  out.push(chunk);return out;
}
function eventLabel(type) {return ({phase_opened:'開啟階段',variable_choice:'選擇變量',assumptions_changed:'修改實驗前提',setup_drawing_updated:'修改繪圖',setup_photo_uploaded:'上載相片',setup_saved:'儲存裝置',setup_cleared:'清除裝置',trial_run:'進行基本實驗',extension_trial_run:'進行熱處理實驗',observation_selected:'選擇觀察',observation_recorded:'確認觀察',answer_changed:'修改答案',reason_updated:'修改理由',design_confirmed:'確認設計',lab_started:'開始探究',investigation_submitted:'提交探究',reflection_submitted:'提交反思',pdf_print_requested:'列印 PDF',liquid_selected:'選擇消化液',extension_selected:'選擇熱處理'})[type]||type;}

FIELDS.forEach(id=>{
  $('#'+id).addEventListener('input',()=>{if(id==='setupDescription'){state.setupSaved=false;$('#setupFeedback').textContent='設計已更新，請按「儲存設計」。';}logEvent(id==='reason'?'reason_updated':'answer_changed',{field:id,value:$('#'+id).value});});
  $('#'+id).addEventListener('change',()=>logEvent('answer_changed',{field:id,value:$('#'+id).value}));
});
$('#profileForm').onsubmit=e=>{
  e.preventDefault();const profile={name:$('#profileName').value.trim(),classInfo:$('#profileClass').value.trim(),email:$('#profileEmail').value.trim().toLowerCase(),mode:'local'};
  if(!profile.name||!profile.classInfo||!profile.email)return;
  saveRecord();resetSession(profile);$('#profileModal').classList.remove('show');logEvent('lab_started',{mode:'local'});saveRecord();
  if(isTeacher()){startTeacherDashboard();$('#teacherDialog').showModal();}
};
$('#changeProfile').onclick=()=>{cloudSync.clearCredential();dashboardGeneration++;$('#teacherDetail').hidden=true;$('#teacherReport').innerHTML='';$('#teacherData').innerHTML='';saveRecord();accountTime();$('#profileForm').reset();$('#profileModal').classList.add('show');$('main').inert=true;};
$$('[data-next]').forEach(b=>b.onclick=()=>{
  const next=+b.dataset.next;if(state.submitted){setPhase(next);return;}
  if(next===2&&!$('#initialObservation').value.trim())return toast('請先記錄你的初步觀察。');
  if(next===3){const missing=incompleteDesignParts();if(missing.length)return toast('請完成：'+missing.join('、'));if(!state.initialDesign)state.initialDesign=designSnapshot();logEvent('design_confirmed',{design:designSnapshot()});}
  state.unlocked=Math.max(state.unlocked,next);setPhase(next);saveRecord();
});
$$('[data-back]').forEach(b=>b.onclick=()=>setPhase(+b.dataset.back));$$('.step').forEach(b=>b.onclick=()=>setPhase(+b.dataset.phase));
$$('#liquidButtons button').forEach(b=>b.onclick=()=>{if(state.submitted||state.running||state.extensionRunning)return;state.liquid=b.dataset.liquid;$$('#liquidButtons button').forEach(el=>el.classList.toggle('selected',el===b));resetObservation();logEvent('liquid_selected',{liquid:state.liquid});});
$$('[data-extension-heat]').forEach(b=>b.onclick=()=>{if(state.submitted||state.running||state.extensionRunning)return;state.extensionHeat=b.dataset.extensionHeat;$$('[data-extension-heat]').forEach(el=>el.classList.toggle('selected',el===b));resetExtension();$('#runExtension').disabled=false;logEvent('extension_selected',{heat:state.extensionHeat});});
$('#runExperiment').onclick=()=>animateTrial();$('#runExtension').onclick=()=>animateTrial(true);
$$('#observationChoice button').forEach(b=>b.onclick=()=>{if(!state.experimentHasRun||state.submitted)return;state.selectedObservation=b.dataset.observation;$$('#observationChoice button').forEach(el=>el.classList.toggle('selected',el===b));$('#recordData').disabled=false;logEvent('observation_selected',{trial:`${state.liquid}-none`,answer:state.selectedObservation});});
$$('[data-extension-observation]').forEach(b=>b.onclick=()=>{if(!state.extensionHasRun||state.submitted)return;state.extensionObservation=b.dataset.extensionObservation;$$('[data-extension-observation]').forEach(el=>el.classList.toggle('selected',el===b));$('#recordExtension').disabled=false;logEvent('observation_selected',{trial:`XY-${state.extensionHeat}`,answer:state.extensionObservation});});
$('#recordData').onclick=()=>recordTrial();$('#recordExtension').onclick=()=>recordTrial(true);$('#revealConcept').onclick=submitInvestigation;
$('#saveReflection').onclick=()=>{if(!state.submitted||state.reflectionSubmittedAt)return;if(!$('#reflection').value.trim())return toast('請先寫下學習反思。');state.reflectionSubmittedAt=new Date().toISOString();logEvent('reflection_submitted',{value:$('#reflection').value.trim()});saveRecord();applyLock();};
$('#downloadRecord').onclick=async()=>{if(!currentReflectionComplete())return toast('請先提交學習反思。');logEvent('pdf_print_requested');await printRecord(saveRecord());};
$('#resetLab').onclick=returnToLogin;$('#restartInvestigation').onclick=returnToLogin;
$('#teacherButton').onclick=()=>{if(!isTeacher())return;startTeacherDashboard();$('#teacherDialog').showModal();};
$('#closeTeacher').onclick=()=>$('#teacherDialog').close();$('#teacherDemo').onclick=()=>{if(!isTeacher())return;const profile=copy(state.profile);resetSession(profile);$('#teacherDialog').close();toast('教師示範：不會寫入學生紀錄、事件或 Excel。');};
$('#refreshRecords').onclick=()=>startTeacherDashboard();
$('#cloudTeacherForm').onsubmit=e=>{e.preventDefault();const password=$('#cloudTeacherPassword').value;$('#cloudTeacherPassword').value='';startTeacherDashboard(password);};
$('#retryCloud').onclick=$('#loginRetryCloud').onclick=()=>{cloudSync.recover();cloudSync.flush().catch(()=>{});};
window.addEventListener('online',()=>{cloudSync.recover();cloudSync.flush().catch(()=>{});});
$('#exportCsv').onclick=exportExcel;$('#teacherPDF').onclick=()=>{if(isTeacher()&&previewRecord)printRecord(previewRecord);};
document.addEventListener('visibilitychange',()=>{accountTime();timingVisible=!document.hidden;activeSince=Date.now();if(document.hidden)saveRecord();});
window.addEventListener('beforeunload',e=>{if(!state.profile||allowUnload)return;saveRecord();e.preventDefault();e.returnValue='';});
window.addEventListener('pagehide',()=>{if(state.profile)saveRecord();try{cloudSync.leave();}catch{}});
setInterval(()=>{if(state.profile&&!document.hidden)saveRecord();},15000);
archiveCurrent();resetSession();$('#profileForm').reset();$('#profileModal').classList.add('show');cloudSync.recover();
setInterval(()=>{if(cloudSync.enabled)cloudSync.flush().catch(()=>{});},30000);
