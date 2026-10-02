import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { collection, doc, getFirestore, onSnapshot, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// Paste the Firebase web-app values from Firebase Console here before publishing.
const FIREBASE_CONFIG = {
  apiKey: '', authDomain: '', projectId: '', storageBucket: '',
  messagingSenderId: '', appId: ''
};
const TEACHER_EMAIL = 'tzechingchan0605@gmail.com';
const COLLECTION = 'digestiveLabRecords';
const STORAGE_KEY = 'digestiveLab.v4';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const firebaseReady = ['apiKey', 'authDomain', 'projectId', 'appId'].every(key => FIREBASE_CONFIG[key]);
const firebaseApp = firebaseReady ? initializeApp(FIREBASE_CONFIG) : null;
const auth = firebaseApp ? getAuth(firebaseApp) : null;
const database = firebaseApp ? getFirestore(firebaseApp) : null;

const variableNames = ['油和水總體積', '反應溫度', '反應時間', '混合物外觀', '消化液組合'];
const variableGroups = [
  ['iv', '獨立變量', '主動改變的因素'],
  ['dv', '因變量', '量度或觀察的結果'],
  ['cv', '控制變量', '保持不變的因素']
];
const experiments = {
  'none-none': ['separated', '油水分層', '黃色油層仍浮在水面，與水層清楚分開。'],
  'X-none': ['cloudy', '變得混濁', '大油滴分散成許多細小油滴，液體呈混濁。'],
  'Y-none': ['thin-oil', '油水分層（油層變薄）', '油層仍在水面，但比對照組薄。'],
  'XY-none': ['clear', '變得清澈', '油滴逐漸消失，混合物變得清澈。'],
  'XY-X': ['clear', '變得清澈', '即使 X 曾被煮沸，混合物仍變得清澈。'],
  'XY-Y': ['cloudy', '變得混濁', '油脂只分散成小油滴，停留在混濁狀態。']
};
const state = {
  phase: 1, liquid: 'XY', heat: 'none', records: [], profile: null, user: null,
  demoMode: false,
  variableChoices: { iv: [], dv: [], cv: [] }, setupMade: false, setupSaved: false,
  setupMethod: '', setupImage: '', selectedObservation: '', experimentHasRun: false,
  events: [], started: Date.now(), phaseStarted: Date.now(),
  phaseDurations: { 1: 0, 2: 0, 3: 0, 4: 0 }
};

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  setTimeout(() => $('#toast').classList.remove('show'), 2500);
}
function queueSave() {
  clearTimeout(queueSave.timer);
  if (!state.profile || !state.user || !database || state.user.email.toLowerCase() === TEACHER_EMAIL) return;
  queueSave.timer = setTimeout(() => saveRecord().catch(console.warn), 700);
}
function logEvent(type, details = {}) {
  state.events.push({ type, at: new Date().toISOString(), atSeconds: Math.round((Date.now() - state.started) / 1000), ...details });
  queueSave();
}
function key() { return `${state.liquid}-${state.heat}`; }
function has(test) { return state.records.some(record => record.key === test); }
function liquidLabel(value) { return ({ none: '不加消化液', X: '只加 X', Y: '只加 Y', XY: 'X + Y' })[value]; }
function setProfile(value) {
  state.profile = value;
  $('#studentName').textContent = value.name;
  $('#avatar').textContent = value.name[0] || '同';
}
function setPhase(phase) {
  const now = Date.now();
  state.phaseDurations[state.phase] += Math.round((now - state.phaseStarted) / 1000);
  state.phaseStarted = now;
  state.phase = phase;
  $$('.phase').forEach(panel => panel.classList.toggle('active', panel.id === `phase-${phase}`));
  $$('.step').forEach(step => {
    const number = Number(step.dataset.phase);
    step.classList.toggle('active', number <= phase);
    step.disabled = number > phase;
  });
  if (phase === 4) renderEvidence();
  logEvent('phase_opened', { phase });
  scrollTo({ top: 0, behavior: 'smooth' });
}

function renderVariableQuiz() {
  $('#variableQuiz').innerHTML = variableGroups.map(([group, title, definition]) => `
    <section class="variable-choice-group"><h4>${title}<span>（${definition}）：</span></h4><div>
      ${variableNames.map(name => `<button type="button" class="variable-option" data-group="${group}" data-variable="${name}">${name}</button>`).join('')}
    </div></section>`).join('');
  $$('.variable-option').forEach(button => button.onclick = () => {
    const { group, variable } = button.dataset;
    const choices = state.variableChoices[group];
    state.variableChoices[group] = choices.includes(variable) ? choices.filter(item => item !== variable) : [...choices, variable];
    button.classList.toggle('selected', state.variableChoices[group].includes(variable));
    logEvent('variable_choice', { group, variable, selected: button.classList.contains('selected') });
    refreshDesignGate();
  });
}
function refreshDesignGate() {
  const variablesAnswered = variableGroups.every(([group]) => state.variableChoices[group].length);
  const ready = $('#reason').value.trim() && variablesAnswered && state.setupSaved;
  $('#variableFeedback').textContent = variablesAnswered ? '已記錄你的選擇；系統不會在探究前判定正誤。' : '請在三類變量中各選擇至少一項。';
  $('#saveHypothesis').disabled = !ready;
  $('#saveHypothesis').textContent = ready ? '開始實驗 →' : '完成三部分後開始實驗 →';
}
function setupCanvas() {
  const canvas = $('#setupCanvas');
  const context = canvas.getContext('2d');
  let drawing = false;
  context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = '#087b78'; context.lineWidth = 4;
  const point = event => { const box = canvas.getBoundingClientRect(); return { x: (event.clientX - box.left) * canvas.width / box.width, y: (event.clientY - box.top) * canvas.height / box.height }; };
  canvas.onpointerdown = event => { drawing = true; canvas.setPointerCapture(event.pointerId); const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); };
  canvas.onpointermove = event => { if (!drawing) return; const p = point(event); context.lineTo(p.x, p.y); context.stroke(); };
  canvas.onpointerup = () => { if (drawing) { state.setupMade = true; state.setupMethod = 'drawing'; logEvent('setup_drawing_updated'); } drawing = false; };
  $$('[data-tool]').forEach(button => button.onclick = () => { const erase = button.dataset.tool === 'eraser'; context.strokeStyle = erase ? '#fff' : '#087b78'; context.lineWidth = erase ? 28 : 4; });
  $('#clearCanvas').onclick = () => { context.clearRect(0, 0, canvas.width, canvas.height); state.setupMade = state.setupSaved = false; state.setupImage = ''; $('#setupFeedback').textContent = '繪圖區已清除。'; logEvent('setup_cleared'); refreshDesignGate(); };
  $('#setupPhoto').onchange = event => {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => { const image = new Image(); image.onload = () => { context.clearRect(0, 0, canvas.width, canvas.height); const scale = Math.min(canvas.width / image.width, canvas.height / image.height); context.drawImage(image, (canvas.width-image.width*scale)/2, (canvas.height-image.height*scale)/2, image.width*scale, image.height*scale); state.setupMade = true; state.setupMethod = 'photo'; $('#setupFeedback').textContent = '相片已加入；請按「儲存」。'; logEvent('setup_photo_uploaded', { filename: file.name }); }; image.src = reader.result; }; reader.readAsDataURL(file);
  };
  $('#saveSetup').onclick = () => { if (!state.setupMade) return $('#setupFeedback').textContent = '請先繪畫裝置或上載相片。'; state.setupSaved = true; state.setupImage = canvas.toDataURL('image/jpeg', .7); $('#setupFeedback').textContent = '已儲存裝置設計。'; logEvent('setup_saved', { method: state.setupMethod }); refreshDesignGate(); };
}

function renderTable() {
  $('#dataBody').innerHTML = state.records.length ? state.records.map((record, index) => `<tr><td>${index+1}</td><td>${liquidLabel(record.liquid)}</td><td>${record.heat === 'none' ? '未煮沸' : `煮沸 ${record.heat}`}</td><td>${record.studentLabel}</td></tr>`).join('') : '<tr class="empty"><td colspan="4">尚未記錄數據</td></tr>';
  $('#trialPill').textContent = `${state.records.length} / 6 次關鍵測試`;
}
function updateUnlock() {
  const baseline = ['none-none','X-none','Y-none','XY-none'].every(has);
  $$('.heat-buttons button').forEach(button => { if (button.dataset.heat !== 'none') button.disabled = !baseline; });
  $('#unlockMessage').textContent = baseline ? '熱處理已解鎖：以 X + Y 作基準，每次只煮沸其中一種，便能判斷哪一種液體的作用受熱影響；毋須另測煮沸 X 或 Y 單獨作用。' : '先完成對照組、X、Y 與 X + Y 的未加熱測試，才可進行熱處理比較。';
  const complete = ['none-none','X-none','Y-none','XY-none','XY-X','XY-Y'].every(has);
  $('#analyseButton').disabled = !complete; $('.step[data-phase="4"]').disabled = !complete;
}
function resetObservation() {
  state.selectedObservation = ''; state.experimentHasRun = false; $('#recordData').disabled = true;
  $$('#observationChoice button').forEach(button => { button.disabled = true; button.classList.remove('selected'); });
}
function renderEvidence() { $('#evidenceList').innerHTML = state.records.map(record => `<div class="evidence"><strong>${liquidLabel(record.liquid)}${record.heat === 'none' ? '' : `（煮沸 ${record.heat}）`}</strong> → 你記錄：${record.studentLabel}</div>`).join(''); }
function buildRecord() {
  const phaseDurations = {...state.phaseDurations}; phaseDurations[state.phase] += Math.round((Date.now()-state.phaseStarted)/1000);
  const attemptCounts = state.events.reduce((out,event) => { out[event.type]=(out[event.type]||0)+1; return out; },{});
  return { moduleId:'VL_BIO_DIGESTION_OPTION_A', savedAt:new Date().toISOString(), profile:state.profile, durationSeconds:Math.round((Date.now()-state.started)/1000), phaseDurations, attemptCounts,
    phase1:{contextViewed:true}, phase2:{hypothesis:{liquid:$('#hypothesisLiquid').value,outcome:$('#hypothesisOutcome').value,reason:$('#reason').value.trim()},variableChoices:state.variableChoices,setup:{saved:state.setupSaved,method:state.setupMethod,image:state.setupImage}},
    phase3:{trials:state.records}, phase4:{conclusions:{q1:$('#q1').value,q2:$('#q2').value,q3:$('#q3').value}}, telemetry:state.events };
}
async function saveRecord() {
  const record=buildRecord(); localStorage.setItem(STORAGE_KEY,JSON.stringify(record));
  if(database&&state.user&&state.profile&&state.user.email.toLowerCase()!==TEACHER_EMAIL) await setDoc(doc(database,COLLECTION,`${state.user.uid}_digestion`),{...record,uid:state.user.uid,updatedAt:serverTimestamp()});
  return record;
}

function setupAuth() {
  $('#authNote').textContent=firebaseReady
    ? 'Google 登入後，正式學習紀錄會同步至教師儀表板。'
    : 'Firebase 尚未設定，因此 Google 登入及教師雲端紀錄暫不可用；你仍可用本機模式完整試用實驗。';
  $('#googleLogin').disabled=!firebaseReady;
  $('#demoLogin').onclick=()=>{
    state.demoMode=true;
    $('#googleLogin').hidden=true;
    $('#demoLogin').hidden=true;
    $('#profileForm').hidden=false;
    $('#emailField').hidden=false;
    $('#profileEmail').required=true;
    $('#authNote').textContent='本機試用模式：紀錄只保存在這部裝置，不會傳送給教師。';
  };
  $('#googleLogin').onclick=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(error){toast(`登入失敗：${error.message}`);}};
  if(!auth)return; onAuthStateChanged(auth,user=>{state.user=user;if(!user)return;const email=user.email.toLowerCase();if(email===TEACHER_EMAIL){setProfile({name:user.displayName||'教師',classInfo:'教師',email});$('#profileModal').classList.remove('show');$('#teacherButton').hidden=false;startTeacherDashboard();}else{$('#googleLogin').hidden=true;$('#demoLogin').hidden=true;$('#emailField').hidden=true;$('#profileEmail').required=false;$('#profileForm').hidden=false;$('#profileName').value=user.displayName||'';}});
}
function startTeacherDashboard(){if(!database)return;onSnapshot(collection(database,COLLECTION),snapshot=>{const records=snapshot.docs.map(item=>item.data());window.teacherRecords=records;$('#dashboardStatus').textContent=`現有 ${records.length} 份紀錄，資料會即時更新。`;$('#teacherData').innerHTML=records.map(record=>`<tr><td>${record.profile?.name||'—'}</td><td>${record.profile?.classInfo||'—'}</td><td>${record.savedAt||'—'}</td><td>${record.phase3?.trials?.length||0}</td><td>${record.telemetry?.length||0}</td></tr>`).join('')||'<tr><td colspan="5">暫無紀錄</td></tr>';});}
function exportCsv(){const rows=[['姓名','班別','電郵','完成時間','總秒數','各階段秒數','假設','理由','獨立變量','因變量','控制變量','裝置方式','試驗與觀察','結論','嘗試次數']];(window.teacherRecords||[]).forEach(r=>rows.push([r.profile?.name,r.profile?.classInfo,r.profile?.email,r.savedAt,r.durationSeconds,JSON.stringify(r.phaseDurations),`${r.phase2?.hypothesis?.liquid}/${r.phase2?.hypothesis?.outcome}`,r.phase2?.hypothesis?.reason,r.phase2?.variableChoices?.iv?.join('；'),r.phase2?.variableChoices?.dv?.join('；'),r.phase2?.variableChoices?.cv?.join('；'),r.phase2?.setup?.method,JSON.stringify(r.phase3?.trials),JSON.stringify(r.phase4?.conclusions),JSON.stringify(r.attemptCounts)]));const csv='\ufeff'+rows.map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(',')).join('\n');const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.download='digestive-lab-records.csv';link.click();URL.revokeObjectURL(link.href);}
function renderPrint(record){const esc=value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]);$('#printReport').innerHTML=`<h1>神秘消化液 X 與 Y｜學習紀錄</h1><p>${esc(record.profile?.name)}｜${esc(record.profile?.classInfo)}｜${esc(record.profile?.email)}</p><h2>01 了解情境</h2><p>已閱讀研究情境。</p><h2>02 設計探究</h2><p>假設：${esc(JSON.stringify(record.phase2.hypothesis))}</p><p>變量：${esc(JSON.stringify(record.phase2.variableChoices))}</p>${record.phase2.setup.image?`<img src="${record.phase2.setup.image}">`:''}<h2>03 進行探究</h2><p>${esc(JSON.stringify(record.phase3.trials))}</p><h2>04 分析與結論</h2><p>${esc(JSON.stringify(record.phase4.conclusions))}</p><p>總用時：${record.durationSeconds} 秒</p>`;}

$('#profileForm').onsubmit=event=>{event.preventDefault();const email=state.user?.email?.toLowerCase()||$('#profileEmail').value.trim().toLowerCase();setProfile({name:$('#profileName').value.trim(),classInfo:$('#profileClass').value.trim(),email,mode:state.demoMode?'local-demo':'google'});$('#profileModal').classList.remove('show');logEvent('lab_started',{mode:state.demoMode?'local-demo':'google'});};
$('#changeProfile').onclick=()=>{if(state.user?.email.toLowerCase()!==TEACHER_EMAIL){$('#profileModal').classList.add('show');if(state.demoMode){$('#googleLogin').hidden=true;$('#demoLogin').hidden=true;$('#profileForm').hidden=false;$('#emailField').hidden=false;}}};
$$('[data-next]').forEach(button=>button.onclick=()=>{const next=+button.dataset.next;if(next===2)$('.step[data-phase="2"]').disabled=false;if(next===3)$('.step[data-phase="3"]').disabled=false;setPhase(next);});
$$('[data-back]').forEach(button=>button.onclick=()=>setPhase(+button.dataset.back));$$('.step').forEach(button=>button.onclick=()=>!button.disabled&&setPhase(+button.dataset.phase));
$('#reason').oninput=()=>{logEvent('reason_updated');refreshDesignGate();};$('#hypothesisLiquid').onchange=e=>logEvent('hypothesis_liquid',{value:e.target.value});$('#hypothesisOutcome').onchange=e=>logEvent('hypothesis_outcome',{value:e.target.value});
$$('#liquidButtons button').forEach(button=>button.onclick=()=>{state.liquid=button.dataset.liquid;state.heat='none';$$('#liquidButtons button').forEach(item=>item.classList.toggle('selected',item===button));$$('.heat-buttons button').forEach(item=>item.classList.toggle('selected',item.dataset.heat==='none'));resetObservation();logEvent('liquid_selected',{liquid:state.liquid});});
$$('.heat-buttons button').forEach(button=>button.onclick=()=>{if(button.disabled)return;state.liquid='XY';state.heat=button.dataset.heat;$$('.heat-buttons button').forEach(item=>item.classList.toggle('selected',item===button));$$('#liquidButtons button').forEach(item=>item.classList.toggle('selected',item.dataset.liquid==='XY'));resetObservation();logEvent('heat_selected',{heat:state.heat});});
$('#runExperiment').onclick=()=>{const [outcome,,description]=experiments[key()];$('#testTube').className='test-tube running';$('#resultTitle').textContent='實驗進行中…';logEvent('trial_run',{trial:key()});setTimeout(()=>{$('#testTube').className=`test-tube ${outcome}`;$('#resultTitle').textContent='請自行判讀外觀';$('#resultDescription').textContent=description;state.experimentHasRun=true;$$('#observationChoice button').forEach(button=>button.disabled=false);},850);};
$$('#observationChoice button').forEach(button=>button.onclick=()=>{state.selectedObservation=button.dataset.observation;$$('#observationChoice button').forEach(item=>item.classList.toggle('selected',item===button));$('#recordData').disabled=false;logEvent('observation_selected',{trial:key(),answer:state.selectedObservation});});
$('#recordData').onclick=()=>{if(!state.experimentHasRun||!state.selectedObservation)return;const [actual,label]=experiments[key()];const studentLabel=$(`[data-observation="${state.selectedObservation}"]`).textContent;const record={key:key(),liquid:state.liquid,heat:state.heat,studentObservation:state.selectedObservation,studentLabel,actual,correct:state.selectedObservation===actual};const index=state.records.findIndex(item=>item.key===record.key);if(index>=0)state.records[index]=record;else state.records.push(record);logEvent('observation_recorded',record);renderTable();updateUnlock();resetObservation();toast('答案已記錄；毋須答對也可繼續。');};
$('#revealConcept').onclick=async()=>{if(!$('#q1').value||!$('#q2').value||!$('#q3').value)return $('#conclusionFeedback').textContent='請回答三題；答案毋須正確。';logEvent('conclusions_saved',{q1:$('#q1').value,q2:$('#q2').value,q3:$('#q3').value});$('#conceptReveal').classList.add('show');$('#conclusionFeedback').textContent='已保留你的原始推論，現在可與概念揭示比較。';await saveRecord();};
$('#downloadRecord').onclick=async()=>{const record=await saveRecord();renderPrint(record);document.body.classList.add('print-record');print();setTimeout(()=>document.body.classList.remove('print-record'),500);};
$('#resetLab').onclick=()=>confirm('要清除目前紀錄並重新開始嗎？')&&(localStorage.removeItem(STORAGE_KEY),location.reload());$('#teacherButton').onclick=()=>$('#teacherDialog').showModal();$('#closeTeacher').onclick=()=>$('#teacherDialog').close();$('#exportCsv').onclick=exportCsv;
renderVariableQuiz();setupCanvas();setupAuth();$('#profileModal').classList.add('show');
