const STORAGE_KEY = 'digestiveLab.v3';
const TEACHER_EMAIL = 'tzechingchan0605@gmail.com';
const variableItems = [
  ['油和水總體積', 'cv'], ['反應溫度', 'cv'], ['反應時間', 'cv'], ['混合物外觀', 'dv'], ['消化液組合', 'iv']
];
const experiments = {
  'none-none': ['separated', '油水分層', '黃色油層仍浮在水面，與水層清楚分開。'],
  'X-none': ['cloudy', '變得混濁', '大油滴分散成許多細小油滴，液體呈混濁。'],
  'Y-none': ['thin-oil', '油水分層（油層變薄）', '油層仍浮在水面，但比對照組薄了一點。'],
  'XY-none': ['clear', '變得清澈', '油滴逐漸消失，混合物變得清澈。'],
  'XY-X': ['clear', '變得清澈', '即使 X 曾被煮沸，混合物仍變得清澈。'],
  'XY-Y': ['cloudy', '變得混濁', '油脂只分散成小油滴，停留在混濁狀態。']
};
const state = { phase: 1, liquid: 'XY', heat: 'none', records: [], hypothesis: {}, profile: null, events: [], setupSaved: false, variablesCorrect: false, selectedObservation: '', started: Date.now() };
const $ = s => document.querySelector(s); const $$ = s => [...document.querySelectorAll(s)];

function logEvent(type, details = {}) { state.events.push({ type, atSeconds: Math.round((Date.now() - state.started) / 1000), ...details }); }
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); setTimeout(() => $('#toast').classList.remove('show'), 2500); }
function key() { return `${state.liquid}-${state.heat}`; }
function has(test) { return state.records.some(record => `${record.liquid}-${record.heat}` === test); }
function liquidLabel(value) { return { none: '不加消化液', X: '只加 X', Y: '只加 Y', XY: 'X + Y' }[value]; }
function setPhase(phase) { state.phase = phase; $$('.phase').forEach(panel => panel.classList.toggle('active', panel.id === `phase-${phase}`)); $$('.step').forEach(step => { const value = +step.dataset.phase; step.classList.toggle('active', value <= phase); step.disabled = value > phase; }); if (phase === 4) evidence(); logEvent('phase_opened', { phase }); scrollTo({ top: 0, behavior: 'smooth' }); }
function profile(profile) { state.profile = profile; $('#studentName').textContent = profile.name; $('#avatar').textContent = profile.name[0] || '同'; }
function refreshDesignGate() { const ready = $('#reason').value.trim().length > 0 && state.setupSaved && state.variablesCorrect; $('#saveHypothesis').disabled = !ready; $('#saveHypothesis').textContent = ready ? '開始實驗 →' : '完成三部分後開始實驗 →'; }

function renderVariableQuiz() {
  $('#variableQuiz').innerHTML = variableItems.map(([name]) => `<div class="variable-row"><strong>${name}</strong><select data-variable="${name}"><option value="">選擇類型</option><option value="iv">獨立變量</option><option value="dv">因變量</option><option value="cv">控制變量</option></select></div>`).join('');
  $$('#variableQuiz select').forEach(select => select.addEventListener('change', checkVariables));
}
function checkVariables() {
  const correct = variableItems.every(([name, type]) => $(`[data-variable="${name}"]`).value === type);
  const answered = $$('#variableQuiz select').every(select => select.value);
  state.variablesCorrect = correct;
  $('#variableFeedback').textContent = !answered ? '請為全部五項因素選擇類型。' : correct ? '分類正確：一次只改變消化液組合，並觀察混合物外觀。' : '有些分類需要再想想。請利用上方的提示修訂。';
  $('#variableFeedback').classList.toggle('good', correct); refreshDesignGate();
}
function renderTable() { $('#dataBody').innerHTML = state.records.length ? state.records.map((r, i) => `<tr><td>${i + 1}</td><td>${liquidLabel(r.liquid)}</td><td>${r.heat === 'none' ? '未煮沸' : `煮沸 ${r.heat}`}</td><td>${r.label}</td></tr>`).join('') : '<tr class="empty"><td colspan="4">尚未記錄數據</td></tr>'; }
function updateUnlock() { const baseline = ['none-none', 'X-none', 'Y-none', 'XY-none'].every(has); $$('.heat-buttons button').forEach(button => { if (button.dataset.heat !== 'none') button.disabled = !baseline; }); $('#unlockMessage').textContent = baseline ? '進階探究已解鎖：只比較「煮沸其中一種液體後，再加入 X + Y」；這能判斷哪一種液體的作用受煮沸影響。' : '先完成對照組、X、Y 與 X + Y 的未加熱測試，才可進行熱處理比較。'; if (['XY-X', 'XY-Y'].every(has)) { $('#analyseButton').disabled = false; $('.step[data-phase="4"]').disabled = false; } }
function evidence() { $('#evidenceList').innerHTML = state.records.map(r => `<div class="evidence"><strong>${liquidLabel(r.liquid)}${r.heat === 'none' ? '' : `（煮沸 ${r.heat}）`}</strong> → ${r.label}</div>`).join(''); }
function saveRecord() { const output = { moduleId: 'VL_BIO_DIGESTION_OPTION_A', savedAt: new Date().toISOString(), profile: state.profile, durationSeconds: Math.round((Date.now() - state.started) / 1000), hypothesis: state.hypothesis, trials: state.records, telemetry: state.events }; localStorage.setItem(STORAGE_KEY, JSON.stringify(output)); return output; }

$('#profileForm').addEventListener('submit', event => { event.preventDefault(); profile({ name: $('#profileName').value.trim(), classInfo: $('#profileClass').value.trim(), email: $('#profileEmail').value.trim().toLowerCase() }); $('#profileModal').classList.remove('show'); logEvent('lab_started'); });
$('#changeProfile').onclick = () => { $('#profileName').value = state.profile?.name || ''; $('#profileClass').value = state.profile?.classInfo || ''; $('#profileEmail').value = state.profile?.email || ''; $('#profileModal').classList.add('show'); };
$$('[data-next]').forEach(button => button.onclick = () => { const next = +button.dataset.next; if (next === 2) $('.step[data-phase="2"]').disabled = false; if (next === 3) { state.hypothesis = { liquid: $('#hypothesisLiquid').value, outcome: $('#hypothesisOutcome').value, reason: $('#reason').value.trim() }; $('.step[data-phase="3"]').disabled = false; logEvent('design_saved', state.hypothesis); } setPhase(next); });
$$('[data-back]').forEach(button => button.onclick = () => setPhase(+button.dataset.back));
$$('.step').forEach(button => button.onclick = () => !button.disabled && setPhase(+button.dataset.phase));
$('#reason').addEventListener('input', refreshDesignGate);

let dragged = null;
$$('#materials button').forEach(item => { item.addEventListener('dragstart', () => { dragged = item; }); item.addEventListener('click', () => { const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'placed-item'; chip.textContent = item.dataset.item; chip.onclick = () => chip.remove(); $('#dropZone').append(chip); }); });
$('#dropZone').addEventListener('dragover', event => event.preventDefault());
$('#dropZone').addEventListener('drop', event => { event.preventDefault(); if (!dragged) return; const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'placed-item'; chip.textContent = dragged.dataset.item; chip.style.left = `${Math.max(5, event.offsetX - 35)}px`; chip.style.top = `${Math.max(5, event.offsetY - 15)}px`; chip.onclick = () => chip.remove(); $('#dropZone').append(chip); });
$('#saveSetup').onclick = () => { const count = $$('#dropZone .placed-item').length; state.setupSaved = count >= 3; $('#setupFeedback').textContent = state.setupSaved ? `已儲存裝置設計（${count} 項材料）。` : '請先放入至少三項材料再儲存。'; $('#setupFeedback').classList.toggle('good', state.setupSaved); refreshDesignGate(); };

$$('#liquidButtons button').forEach(button => button.onclick = () => { state.liquid = button.dataset.liquid; state.heat = 'none'; $$('#liquidButtons button').forEach(item => item.classList.toggle('selected', item === button)); $$('.heat-buttons button').forEach(item => item.classList.toggle('selected', item.dataset.heat === 'none')); resetObservation(); });
$$('.heat-buttons button').forEach(button => button.onclick = () => { if (button.disabled) return; state.liquid = 'XY'; state.heat = button.dataset.heat; $$('.heat-buttons button').forEach(item => item.classList.toggle('selected', item === button)); $$('#liquidButtons button').forEach(item => item.classList.toggle('selected', item.dataset.liquid === 'XY')); resetObservation(); });
function resetObservation() { state.selectedObservation = ''; $('#recordData').disabled = true; $$('#observationChoice button').forEach(button => { button.disabled = true; button.classList.remove('selected'); }); }
$('#runExperiment').onclick = () => { const [outcome, label, text] = experiments[key()]; const tube = $('#testTube'); tube.className = 'test-tube running'; $('#resultTitle').textContent = '實驗進行中…'; $('#resultStatus').textContent = '觀察中'; $('#resultDescription').textContent = '請留意試管內油脂的變化。'; logEvent('trial_run', { liquid: state.liquid, heat: state.heat }); setTimeout(() => { tube.className = `test-tube ${outcome}`; $('#resultTitle').textContent = '請自行判讀外觀'; $('#resultStatus').textContent = '請作答'; $('#resultDescription').textContent = text; $$('#observationChoice button').forEach(button => button.disabled = false); }, 850); };
$$('#observationChoice button').forEach(button => button.onclick = () => { state.selectedObservation = button.dataset.observation; $$('#observationChoice button').forEach(item => item.classList.toggle('selected', item === button)); $('#recordData').disabled = false; });
$('#recordData').onclick = () => { const [outcome, label] = experiments[key()]; if (!state.selectedObservation) return; if (state.selectedObservation !== outcome) { toast('請再觀察試管內油脂的變化，然後修訂你的記錄。'); logEvent('observation_incorrect', { selected: state.selectedObservation }); return; } if (has(key())) return toast('這個條件已經記錄。'); state.records.push({ liquid: state.liquid, heat: state.heat, outcome, label }); renderTable(); updateUnlock(); resetObservation(); $('#trialPill').textContent = `${state.records.length} / 6 次關鍵測試`; logEvent('trial_recorded', { outcome }); toast('你的觀察已記錄。'); };
$('#revealConcept').onclick = () => { const ok = $('#q1').value === 'cloudy' && $('#q2').value === 'Y' && $('#q3').value === 'increase'; $('#conclusionFeedback').textContent = ok ? '你的推論與實驗證據一致。請閱讀下方的概念揭示。' : '請回看你的數據表，再用證據修訂推論。'; $('#conclusionFeedback').classList.toggle('good', ok); if (ok) { $('#conceptReveal').classList.add('show'); saveRecord(); } };
$('#downloadRecord').onclick = () => { saveRecord(); document.body.classList.add('print-record'); print(); document.body.classList.remove('print-record'); };
$('#resetLab').onclick = () => { if (confirm('要重新開始這個模組嗎？目前的實驗紀錄會清除。')) { localStorage.removeItem(STORAGE_KEY); location.reload(); } };
renderVariableQuiz();
$('#profileModal').classList.add('show');
