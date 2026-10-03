const TEACHER_EMAIL = 'tzechingchan0605@gmail.com';
const STORAGE_KEY = 'digestiveLab.v4';
const RECORDS_KEY = 'digestiveLab.localRecords.v1';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

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
  phase: 1, liquid: 'XY', heat: 'none', records: [], profile: null,
  variableChoices: { iv: [], dv: [], cv: [] }, setupMade: false, setupSaved: false,
  setupMethod: '', setupImage: '', selectedObservation: '', experimentHasRun: false, extensionHeat: '', extensionObservation: '', submitted: false,
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
  if (!state.profile || state.profile.email === TEACHER_EMAIL) return;
  queueSave.timer = setTimeout(saveRecord, 700);
}
function logEvent(type, details = {}) {
  state.events.push({ type, at: new Date().toISOString(), atSeconds: Math.round((Date.now() - state.started) / 1000), ...details });
  queueSave();
}
function key() { return `${state.liquid}-${state.heat}`; }
function has(test) { return state.records.some(record => record.key === test); }
function liquidLabel(value) { return ({ none: '對照：加入2mL水（不加消化液）', X: '加入2mL消化液X', Y: '加入2mL消化液Y', XY: '加入各1mL消化液X、Y' })[value]; }
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
function incompleteDesignParts() {
  const missing = [];
  if (!$('#hypothesisLiquid').value || !$('#hypothesisOutcome').value || !$('#reason').value.trim()) missing.push('假設建立器的預測及「我的理由」');
  if (!variableGroups.every(([group]) => state.variableChoices[group].length)) missing.push('公平測試設計的三類變量');
  if (!state.setupSaved) missing.push('請繪畫並儲存實驗裝置設計');
  return missing;
}
function refreshDesignGate() {
  const variablesAnswered = variableGroups.every(([group]) => state.variableChoices[group].length);
  $('#variableFeedback').textContent = variablesAnswered ? '已記錄你的變量選擇。' : '請在三類變量中各選擇至少一項。';
  $('#saveHypothesis').disabled = false;
  $('#saveHypothesis').textContent = '開始實驗 →';
}
function setupCanvas() {
  const canvas = $('#setupCanvas');
  const context = canvas.getContext('2d');
  let drawing = false;
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = '#111'; context.lineWidth = 4;
  const point = event => { const box = canvas.getBoundingClientRect(); return { x: (event.clientX - box.left) * canvas.width / box.width, y: (event.clientY - box.top) * canvas.height / box.height }; };
  canvas.onpointerdown = event => { drawing = true; canvas.setPointerCapture(event.pointerId); const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); };
  canvas.onpointermove = event => { if (!drawing) return; const p = point(event); context.lineTo(p.x, p.y); context.stroke(); };
  canvas.onpointerup = () => { if (drawing) { state.setupMade = true; state.setupMethod = 'drawing'; logEvent('setup_drawing_updated'); } drawing = false; };
  $$('[data-tool]').forEach(button => button.onclick = () => { const erase = button.dataset.tool === 'eraser'; context.strokeStyle = erase ? '#fff' : '#111'; context.lineWidth = erase ? 28 : 4; });
  $('#clearCanvas').onclick = () => { context.clearRect(0, 0, canvas.width, canvas.height); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); state.setupMade = state.setupSaved = false; state.setupImage = ''; $('#setupFeedback').textContent = '繪圖區已清除。'; logEvent('setup_cleared'); refreshDesignGate(); };
  $('#setupPhoto').onchange = event => {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => { const image = new Image(); image.onload = () => { context.clearRect(0, 0, canvas.width, canvas.height); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); const scale = Math.min(canvas.width / image.width, canvas.height / image.height); context.drawImage(image, (canvas.width-image.width*scale)/2, (canvas.height-image.height*scale)/2, image.width*scale, image.height*scale); state.setupMade = true; state.setupMethod = 'photo'; $('#setupFeedback').textContent = '相片已加入；請按「儲存」。'; logEvent('setup_photo_uploaded', { filename: file.name }); }; image.src = reader.result; }; reader.readAsDataURL(file);
  };
  $('#saveSetup').onclick = () => { if (!state.setupMade) return $('#setupFeedback').textContent = '請先繪畫裝置或上載相片。'; state.setupSaved = true; state.setupImage = canvas.toDataURL('image/jpeg', .7); $('#setupFeedback').textContent = '已儲存裝置設計。'; logEvent('setup_saved', { method: state.setupMethod }); refreshDesignGate(); };
}

function renderTable() {
  const baselineRecords = state.records.filter(record => record.heat === 'none'); $('#dataBody').innerHTML = baselineRecords.length ? baselineRecords.map((record, index) => `<tr><td>${index+1}</td><td>${liquidLabel(record.liquid)}</td><td>${record.studentLabel}</td></tr>`).join('') : '<tr class="empty"><td colspan="3">尚未記錄數據</td></tr>';
  const baselineCount = state.records.filter(record => record.heat === 'none').length; $('#trialPill').textContent = `${baselineCount} / 4 個實驗裝置`;
}
function updateUnlock() {
  const baseline = ['none-none','X-none','Y-none','XY-none'].every(has);
  $('#unlockMessage').textContent = baseline ? '四個實驗裝置的觀察已記錄，可以分析數據。' : '請完成對照、消化液 X、消化液 Y 與消化液 X + 消化液 Y 四個實驗裝置的觀察。';
  $('#analyseButton').disabled = !baseline;
  $('.step[data-phase="4"]').disabled = !baseline;
}
function resetObservation() {
  state.selectedObservation = ''; state.experimentHasRun = false; $('#recordData').disabled = true;
  $$('#observationChoice button').forEach(button => { button.disabled = true; button.classList.remove('selected'); });
}
function renderEvidence() { $('#evidenceList').innerHTML = state.records.map(record => `<div class="evidence"><strong>${liquidLabel(record.liquid)}${record.heat === 'none' ? '' : `（煮沸消化液 ${record.heat}）`}</strong> → 你記錄：${record.studentLabel}</div>`).join(''); }
function buildRecord() {
  const phaseDurations = {...state.phaseDurations}; phaseDurations[state.phase] += Math.round((Date.now()-state.phaseStarted)/1000);
  const attemptCounts = state.events.reduce((out,event) => { out[event.type]=(out[event.type]||0)+1; return out; },{});
  return { moduleId:'VL_BIO_DIGESTION_OPTION_A', savedAt:new Date().toISOString(), profile:state.profile, durationSeconds:Math.round((Date.now()-state.started)/1000), phaseDurations, attemptCounts,
    phase1:{contextViewed:true}, phase2:{hypothesis:{liquid:$('#hypothesisLiquid').value,outcome:$('#hypothesisOutcome').value,reason:$('#reason').value.trim()},variableChoices:state.variableChoices,setup:{saved:state.setupSaved,method:state.setupMethod,image:state.setupImage}},
    phase3:{trials:state.records}, phase4:{conclusions:{q1:$('#q1').value,q2:$('#q2').value,q3:$('#q3').value}}, telemetry:state.events };
}
function readLocalRecords() {
  try { return JSON.parse(localStorage.getItem(RECORDS_KEY)) || []; }
  catch { return []; }
}
function saveRecord() {
  const record = buildRecord();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  const records = readLocalRecords();
  const identity = `${record.profile.email}|${record.moduleId}`;
  const index = records.findIndex(item => `${item.profile?.email}|${item.moduleId}` === identity);
  if (index >= 0) records[index] = record; else records.push(record);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  if (!$('#teacherDialog').open) return record;
  startTeacherDashboard();
  return record;
}
function startTeacherDashboard() {
  const records = readLocalRecords().filter(record => record.profile?.email !== TEACHER_EMAIL);
  window.teacherRecords = records;
  $('#dashboardStatus').textContent = `這部瀏覽器現有 ${records.length} 份學生紀錄。資料不會跨裝置同步。`;
  $('#teacherData').innerHTML = records.map(record => {
    const trials = record.phase3?.trials || [];
    const correct = trials.filter(trial => trial.correct).length;
    const complete = trials.length === 6 && Object.values(record.phase4?.conclusions || {}).every(Boolean);
    return `<tr><td><strong>${escapeHtml(record.profile?.name || '—')}</strong><small>${escapeHtml(record.profile?.email || '—')}</small></td><td>${escapeHtml(record.profile?.classInfo || '—')}</td><td><span class="report-status ${complete ? 'complete' : ''}">${complete ? '已完成' : '進行中'}</span></td><td>${correct} / ${trials.length}</td><td>${formatDuration(record.durationSeconds)}</td><td>${formatDate(record.savedAt)}</td></tr>`;
  }).join('') || '<tr><td colspan="6">這部瀏覽器暫無學生紀錄</td></tr>';
}

const outcomeLabels = { cloudy: '變得混濁', clear: '變得清澈', separated: '油水分層', 'thin-oil': '油水分層（油層變薄）' };
const conclusionAnswers = { q1: { answer: 'cloudy', label: '混濁乳狀液' }, q2: { answer: 'Y', label: '消化液 Y' }, q3: { answer: 'increase', label: '增加' } };
const conclusionLabels = { q1: { cloudy: '混濁乳狀液', clear: '清澈溶液' }, q2: { X: '消化液 X', Y: '消化液 Y' }, q3: { increase: '增加', decrease: '減少' } };
const questionLabels = { q1: '消化液 X 對油脂的主要作用結果', q2: '煮沸後失去作用的消化液', q3: '消化液 X 使油滴分散後的總表面積' };
function formatDuration(seconds = 0) { const minutes = Math.floor(seconds / 60); return minutes ? `${minutes} 分 ${seconds % 60} 秒` : `${seconds} 秒`; }
function formatDate(value) { return value ? new Intl.DateTimeFormat('zh-HK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'; }
function answerMark(correct) { return `<span class="answer-mark ${correct ? 'correct' : 'incorrect'}">${correct ? '✓ 正確' : '✕ 可再思考'}</span>`; }

function exportExcel() {
  const trialKeys = ['none-none', 'X-none', 'Y-none', 'XY-none', 'XY-X', 'XY-Y'];
  const headings = ['姓名','班別及學號','電郵','更新時間','總用時','階段一用時','階段二用時','階段三用時','階段四用時','假設－消化液','假設－預測外觀','假設－理由','獨立變量選擇','因變量選擇','控制變量選擇','裝置設計方式','裝置設計圖'];
  trialKeys.forEach((_, index) => headings.push(`測試 ${index + 1}－學生觀察`, `測試 ${index + 1}－正確觀察`, `測試 ${index + 1}－結果`));
  headings.push('結論 1－學生答案','結論 1－正確答案','結論 2－學生答案','結論 2－正確答案','結論 3－學生答案','結論 3－正確答案','進行實驗次數','選擇觀察答案次數','記錄觀察次數','更新理由次數');
  const rows = (window.teacherRecords || []).map(record => {
    const hypothesis = record.phase2?.hypothesis || {}, choices = record.phase2?.variableChoices || {};
    const row = [record.profile?.name,record.profile?.classInfo,record.profile?.email,formatDate(record.savedAt),formatDuration(record.durationSeconds),...[1,2,3,4].map(phase => formatDuration(record.phaseDurations?.[phase])),liquidLabel(hypothesis.liquid),outcomeLabels[hypothesis.outcome],hypothesis.reason,choices.iv?.join('；'),choices.dv?.join('；'),choices.cv?.join('；'),record.phase2?.setup?.method === 'photo' ? '上載相片' : '繪圖',record.phase2?.setup?.image || '未提供'];
    trialKeys.forEach(trialKey => { const trial = (record.phase3?.trials || []).find(item => item.key === trialKey); row.push(trial?.studentLabel || '未回答', experiments[trialKey]?.[1] || '—', trial ? (trial.correct ? '正確' : '錯誤') : '未回答'); });
    const conclusions = record.phase4?.conclusions || {};
    ['q1','q2','q3'].forEach(q => row.push(conclusionLabels[q][conclusions[q]] || '未回答', conclusionAnswers[q].label));
    row.push(record.attemptCounts?.trial_run || 0,record.attemptCounts?.observation_selected || 0,record.attemptCounts?.observation_recorded || 0,record.attemptCounts?.reason_updated || 0);
    return row;
  });
  const embeddedImages = [];
  const cell = value => {
    const text = String(value ?? '—');
    if (text.startsWith('data:image/')) {
      const [metadata, base64] = text.split(',');
      const mime = metadata.match(/^data:([^;]+)/)?.[1] || 'image/jpeg';
      const contentId = `setup-${embeddedImages.length}@digestive-lab`;
      embeddedImages.push({ contentId, mime, base64 });
      return `<td><img src="cid:${contentId}" width="320" style="background:#fff;border:1px solid #aaa"></td>`;
    }
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `<td>${escapeHtml(safe)}</td>`;
  };
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:11pt}caption{font-size:18pt;font-weight:bold;color:#086f6b;padding:14px}th{background:#087b78;color:white;padding:9px;border:1px solid #bddbd6}td{padding:7px;border:1px solid #d5e5e2;vertical-align:top}tr:nth-child(even) td{background:#eef8f5}</style></head><body><table><caption>未知消化液 X 與 Y｜全班學習紀錄</caption><thead><tr>${headings.map(heading => `<th>${heading}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell).join('')}</tr>`).join('')}</tbody></table></body></html>`;
  const boundary = '----=_DigestiveLab_Report';
  const imageParts = embeddedImages.map(image => `--${boundary}\r\nContent-Type: ${image.mime}\r\nContent-Transfer-Encoding: base64\r\nContent-Location: ${image.contentId}\r\nContent-ID: <${image.contentId}>\r\n\r\n${image.base64}\r\n`).join('');
  const workbook = `MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="${boundary}"\r\n\r\n--${boundary}\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Location: workbook.html\r\n\r\n${html}\r\n${imageParts}--${boundary}--`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([workbook], { type: 'application/vnd.ms-excel' }));
  link.download = '消化液虛擬實驗_全班學習紀錄.xls';
  link.click();
  URL.revokeObjectURL(link.href);
}

function renderPrint(record) {
  const hypothesis = record.phase2?.hypothesis || {}, choices = record.phase2?.variableChoices || {}, trials = record.phase3?.trials || [], conclusions = record.phase4?.conclusions || {};
  const choiceLine = (title, values, expectedValues) => { const selected = values || []; const correct = selected.length === expectedValues.length && selected.every(value => expectedValues.includes(value)); return `<div class="report-answer"><b>${title}</b><span>${escapeHtml(selected.join('、') || '未回答')}</span>${answerMark(correct)}<small>正確答案：${expectedValues.join('、')}</small></div>`; };
  $('#printReport').innerHTML = `<header class="report-cover"><span class="report-logo">✦</span><div><p>IBL 虛擬實驗室 · S4 生物</p><h1>未知消化液 X 與 Y</h1><strong>個人學習紀錄與回饋</strong></div></header>
  <section class="report-profile"><div><small>學生</small><b>${escapeHtml(record.profile?.name)}</b></div><div><small>班別及學號</small><b>${escapeHtml(record.profile?.classInfo)}</b></div><div><small>完成時間</small><b>${formatDate(record.savedAt)}</b></div><div><small>總用時</small><b>${formatDuration(record.durationSeconds)}</b></div></section>
  <section class="report-stage"><h2><span>01</span> 了解情境</h2><div class="report-card context-summary"><img src="assets/digestive-system.png" alt="人體消化系統"><div><h3>研究任務</h3><p>探究消化液 X 和消化液 Y 如何分解油脂，使其可被人體吸收。</p><span class="completed-chip">✓ 已閱讀情境</span></div></div></section>
  <section class="report-stage"><h2><span>02</span> 設計探究</h2><div class="report-card"><p class="report-kicker">我的假設</p><p class="hypothesis-sentence">若加入 <b>${escapeHtml(liquidLabel(hypothesis.liquid))}</b>，溶液外觀將會 <b>${escapeHtml(outcomeLabels[hypothesis.outcome] || '未回答')}</b>。</p><blockquote>${escapeHtml(hypothesis.reason || '未填寫理由')}</blockquote><p class="feedback-note">此題沒有固定答案；以上保留你在實驗前的原始想法。</p></div><div class="report-card"><p class="report-kicker">我的公平測試設計</p>${choiceLine('獨立變量',choices.iv,['消化液組合'])}${choiceLine('因變量',choices.dv,['混合物外觀'])}${choiceLine('控制變量',choices.cv,['油和水總體積','反應溫度','反應時間'])}</div>${record.phase2?.setup?.image ? `<div class="report-card"><p class="report-kicker">我的實驗裝置設計</p><img class="setup-image" src="${record.phase2.setup.image}" alt="學生的實驗裝置設計"></div>` : ''}</section>
  <section class="report-stage page-break"><h2><span>03</span> 進行探究</h2><div class="report-card"><table class="report-table"><thead><tr><th>實驗裝置</th><th>你的觀察</th><th>回饋</th><th>正確觀察</th></tr></thead><tbody>${trials.filter(trial => trial.heat === 'none').map(trial => `<tr><td>${escapeHtml(liquidLabel(trial.liquid))}</td><td>${escapeHtml(trial.studentLabel)}</td><td>${answerMark(trial.correct)}</td><td>${escapeHtml(experiments[trial.key]?.[1])}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="report-stage"><h2><span>04</span> 分析與結論</h2><div class="report-card conclusion-list">${['q1','q3'].map(q => { const selected = conclusions[q], correct = selected === conclusionAnswers[q].answer; return `<div><p>${questionLabels[q]}</p><strong>你的答案：${escapeHtml(conclusionLabels[q][selected] || '未回答')}</strong>${answerMark(correct)}<small>正確答案：${conclusionAnswers[q].label}</small></div>`; }).join('')}</div><div class="report-card"><p class="report-kicker">延伸探究：加熱對消化液的影響</p><table class="report-table"><thead><tr><th>熱處理</th><th>你的觀察</th><th>回饋</th><th>正確觀察</th></tr></thead><tbody>${trials.filter(trial => trial.heat !== 'none').map(trial => `<tr><td>煮沸消化液 ${trial.heat}</td><td>${escapeHtml(trial.studentLabel)}</td><td>${answerMark(trial.correct)}</td><td>${escapeHtml(experiments[trial.key]?.[1])}</td></tr>`).join('')}</tbody></table><div class="conclusion-list"><div><p>${questionLabels.q2}</p><strong>你的答案：${escapeHtml(conclusionLabels.q2[conclusions.q2] || '未回答')}</strong>${answerMark(conclusions.q2 === conclusionAnswers.q2.answer)}<small>正確答案：${conclusionAnswers.q2.label}</small></div></div></div><div class="concept-summary"><h3>概念總結</h3><p><b>消化液 X 是膽汁：</b>把油脂乳化成細小油滴，增加表面積。</p><p><b>消化液 Y 是脂肪酶：</b>負責化學消化脂肪；高溫會令它變性失活。</p></div></section><footer class="report-footer">探究實驗室 · 這份報告保留你的原始答案，並以 ✓／✕ 和參考答案協助反思。</footer>`;
}

$('#profileForm').onsubmit=event=>{event.preventDefault();const email=$('#profileEmail').value.trim().toLowerCase();const teacher=email===TEACHER_EMAIL;setProfile({name:teacher?'教師':$('#profileName').value.trim(),classInfo:teacher?'教師帳戶':$('#profileClass').value.trim(),email,mode:'local'});$('#profileModal').classList.remove('show');$('#teacherButton').hidden=!teacher;if(teacher){startTeacherDashboard();$('#teacherDialog').showModal();}else{logEvent('lab_started',{mode:'local'});}};
$('#changeProfile').onclick=()=>{$('#profileModal').classList.add('show');};
$$('[data-next]').forEach(button=>button.onclick=()=>{const next=+button.dataset.next;if(next===3){const missing=incompleteDesignParts();if(missing.length){alert(`尚未完成以下部分：\n\n• ${missing.join('\n• ')}\n\n請完成後再開始實驗。`);return;}}if(next===2)$('.step[data-phase="2"]').disabled=false;if(next===3)$('.step[data-phase="3"]').disabled=false;setPhase(next);});
$$('[data-back]').forEach(button=>button.onclick=()=>setPhase(+button.dataset.back));$$('.step').forEach(button=>button.onclick=()=>!button.disabled&&setPhase(+button.dataset.phase));
$('#reason').oninput=()=>{logEvent('reason_updated');refreshDesignGate();};$('#hypothesisLiquid').onchange=e=>logEvent('hypothesis_liquid',{value:e.target.value});$('#hypothesisOutcome').onchange=e=>logEvent('hypothesis_outcome',{value:e.target.value});
$$('#liquidButtons button').forEach(button=>button.onclick=()=>{state.liquid=button.dataset.liquid;state.heat='none';$$('#liquidButtons button').forEach(item=>item.classList.toggle('selected',item===button));resetObservation();logEvent('liquid_selected',{liquid:state.liquid});});
$('#runExperiment').onclick=()=>{const [outcome]=experiments[key()];const animation=$('#mainDropper').parentElement;animation.classList.remove('adding');void animation.offsetWidth;animation.classList.add('adding');$('#testTube').className='test-tube';$('#resultTitle').textContent='正在加入試劑…';$('#resultDescription').textContent='';logEvent('trial_run',{trial:key()});setTimeout(()=>{$('#testTube').className='test-tube running';$('#resultTitle').textContent='正在搖勻試管…';},900);setTimeout(()=>{$('#testTube').className=`test-tube ${outcome}`;$('#resultTitle').textContent='請自行判讀外觀';state.experimentHasRun=true;$$('#observationChoice button').forEach(button=>button.disabled=false);},1650);};
$$('#observationChoice button').forEach(button=>button.onclick=()=>{state.selectedObservation=button.dataset.observation;$$('#observationChoice button').forEach(item=>item.classList.toggle('selected',item===button));$('#recordData').disabled=false;logEvent('observation_selected',{trial:key(),answer:state.selectedObservation});});
$('#recordData').onclick=()=>{if(!state.experimentHasRun||!state.selectedObservation)return;const [actual,label]=experiments[key()];const studentLabel=$(`[data-observation="${state.selectedObservation}"]`).textContent;const record={key:key(),liquid:state.liquid,heat:state.heat,studentObservation:state.selectedObservation,studentLabel,actual,correct:state.selectedObservation===actual};const index=state.records.findIndex(item=>item.key===record.key);if(index>=0)state.records[index]=record;else state.records.push(record);logEvent('observation_recorded',record);renderTable();updateUnlock();resetObservation();toast('實驗結果已記錄。');};
function renderExtensionTable(){const records=state.records.filter(record=>record.heat!=='none');$('#extensionDataBody').innerHTML=records.length?records.map((record,index)=>`<tr><td>${index+1}</td><td>${record.heat==='X'?'煮沸消化液 X ＋ 未煮沸消化液 Y':'未煮沸消化液 X ＋ 煮沸消化液 Y'}</td><td>${record.studentLabel}</td></tr>`).join(''):'<tr class="empty"><td colspan="3">尚未記錄延伸探究數據</td></tr>';}
$$('[data-extension-heat]').forEach(button=>button.onclick=()=>{state.extensionHeat=button.dataset.extensionHeat;state.extensionObservation='';$$('[data-extension-heat]').forEach(item=>item.classList.toggle('selected',item===button));$('#runExtension').disabled=false;$('#recordExtension').disabled=true;$('#extensionTube').className='test-tube';$('#extensionResultTitle').textContent='等待進行延伸測試';$$('[data-extension-observation]').forEach(item=>{item.disabled=true;item.classList.remove('selected');});});
$('#runExtension').onclick=()=>{const trialKey=`XY-${state.extensionHeat}`;const [outcome]=experiments[trialKey];const animation=$('#extensionDropper').parentElement;animation.classList.remove('adding');void animation.offsetWidth;animation.classList.add('adding');$('#extensionTube').className='test-tube';$('#extensionResultTitle').textContent='正在加入試劑…';setTimeout(()=>{$('#extensionTube').className='test-tube running';$('#extensionResultTitle').textContent='正在搖勻試管…';},900);setTimeout(()=>{$('#extensionTube').className=`test-tube ${outcome}`;$('#extensionResultTitle').textContent='請自行判讀外觀';$$('[data-extension-observation]').forEach(item=>item.disabled=false);},1650);logEvent('extension_trial_run',{trial:trialKey,outcome});};
$$('[data-extension-observation]').forEach(button=>button.onclick=()=>{state.extensionObservation=button.dataset.extensionObservation;$$('[data-extension-observation]').forEach(item=>item.classList.toggle('selected',item===button));$('#recordExtension').disabled=false;});
$('#recordExtension').onclick=()=>{const trialKey=`XY-${state.extensionHeat}`;const [actual]=experiments[trialKey];const studentLabel=$(`[data-extension-observation="${state.extensionObservation}"]`).textContent;const record={key:trialKey,liquid:'XY',heat:state.extensionHeat,studentObservation:state.extensionObservation,studentLabel,actual,correct:state.extensionObservation===actual};const index=state.records.findIndex(item=>item.key===trialKey);if(index>=0)state.records[index]=record;else state.records.push(record);logEvent('observation_recorded',record);renderEvidence();renderExtensionTable();$('#extensionFeedback').textContent=`已記錄：${state.extensionHeat==='X'?'煮沸消化液 X':'煮沸消化液 Y'}。`;toast('延伸探究結果已記錄。');};
$('#revealConcept').onclick=async()=>{const missing=[];if(!$('#q1').value||!$('#q3').value)missing.push('第 1 及第 3 題結論');if(!has('XY-X')||!has('XY-Y'))missing.push('兩項延伸熱處理測試');if(!$('#q2').value)missing.push('延伸探究第 2 題');if(missing.length){alert(`尚未完成以下部分：\n\n• ${missing.join('\n• ')}`);return;}if(!confirm('遞交後不能修改本次答案。你仍可按「重新開始」進行新的探究。\n\n確定遞交嗎？'))return;state.submitted=true;logEvent('conclusions_saved',{q1:$('#q1').value,q2:$('#q2').value,q3:$('#q3').value});$('#conceptReveal').classList.add('show');$('#completeBar').hidden=false;$('#revealConcept').disabled=true;$('#conclusionFeedback').textContent='答案已遞交，不能修改。';$$('.phase input,.phase select,.phase textarea,.phase button').forEach(el=>{if(!['downloadRecord','restartInvestigation'].includes(el.id))el.disabled=true;});await saveRecord();};
async function waitForReportImages(){const images=$$('#printReport img');await Promise.all(images.map(image=>image.complete&&image.naturalWidth?Promise.resolve():new Promise(resolve=>{image.onload=resolve;image.onerror=resolve;})));}
$('#downloadRecord').onclick=async()=>{const record=await saveRecord();renderPrint(record);await waitForReportImages();document.body.classList.add('print-record');requestAnimationFrame(()=>{print();setTimeout(()=>document.body.classList.remove('print-record'),500);});};
$('#restartInvestigation').onclick=()=>confirm('要開始新的探究嗎？目前作答會從此裝置清除。')&&(localStorage.removeItem(STORAGE_KEY),location.reload());
$('#resetLab').onclick=()=>confirm('要清除目前紀錄並重新開始嗎？')&&(localStorage.removeItem(STORAGE_KEY),location.reload());$('#teacherButton').onclick=()=>{startTeacherDashboard();$('#teacherDialog').showModal();};$('#closeTeacher').onclick=()=>$('#teacherDialog').close();$('#exportCsv').onclick=exportExcel;
renderVariableQuiz();setupCanvas();$('#profileModal').classList.add('show');
