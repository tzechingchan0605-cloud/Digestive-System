const STORAGE_KEY = 'digestiveLab.v2';

const state = {
  phase: 1,
  liquid: 'XY',
  heat: 'none',
  records: [],
  hypothesis: {},
  profile: null,
  events: [],
  started: Date.now(),
  completed: false
};

const experiments = {
  'none-none': { outcome: 'separated', label: '油水分層', text: '黃色油層仍浮在水面，與水層清楚分開。' },
  'X-none': { outcome: 'cloudy', label: '混濁乳狀液', text: '大油滴分散成許多細小油滴，液體呈混濁乳狀。' },
  'Y-none': { outcome: 'separated', label: '油水分層', text: '油層仍浮在水面，未見明顯快速變化。' },
  'XY-none': { outcome: 'clear', label: '清澈溶液', text: '油滴逐漸消失，混合物變得清澈。' },
  'XY-X': { outcome: 'clear', label: '清澈溶液', text: '即使 X 曾被煮沸，混合物仍變得清澈。' },
  'XY-Y': { outcome: 'cloudy', label: '混濁乳狀液', text: '油脂只分散成小油滴，停留在混濁乳狀。' }
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function logEvent(type, details = {}) {
  state.events.push({ type, atSeconds: Math.round((Date.now() - state.started) / 1000), ...details });
}

function showToast(text) {
  const toast = $('#toast');
  toast.textContent = text;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function showProfile() {
  $('#profileModal').classList.add('show');
  $('#profileName').focus();
}

function applyProfile(profile) {
  state.profile = profile;
  $('#studentName').textContent = profile.name;
  $('#avatar').textContent = profile.name.trim().charAt(0) || '同';
}

function setPhase(phase) {
  state.phase = phase;
  $$('.phase').forEach(panel => panel.classList.toggle('active', panel.id === `phase-${phase}`));
  $$('.step').forEach(step => {
    const stepPhase = Number(step.dataset.phase);
    step.classList.toggle('active', stepPhase <= phase);
    step.disabled = stepPhase > phase;
  });
  if (phase === 4) renderEvidence();
  logEvent('phase_opened', { phase });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function currentKey() {
  return `${state.liquid}-${state.heat}`;
}

function hasTrial(key) {
  return state.records.some(record => `${record.liquid}-${record.heat}` === key);
}

function labelForLiquid(liquid) {
  return { none: '不加消化液', X: '只加 X', Y: '只加 Y', XY: 'X + Y' }[liquid];
}

function updateHeatUnlock() {
  const basicsComplete = ['none-none', 'X-none', 'Y-none', 'XY-none'].every(hasTrial);
  $$('.heat-buttons button').forEach(button => {
    if (button.dataset.heat !== 'none') button.disabled = !basicsComplete;
  });
  $('#unlockMessage').textContent = basicsComplete
    ? '進階探究已解鎖：分別煮沸 X 或 Y，再與另一種液體測試。'
    : '先完成對照組、X、Y 與 X + Y 的未加熱測試，才可進行熱處理比較。';
  if (['XY-X', 'XY-Y'].every(hasTrial)) {
    $('#analyseButton').disabled = false;
    $('.step[data-phase="4"]').disabled = false;
  }
}

function renderTable() {
  const body = $('#dataBody');
  if (!state.records.length) {
    body.innerHTML = '<tr class="empty"><td colspan="4">尚未記錄數據</td></tr>';
    return;
  }
  body.innerHTML = state.records.map((record, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${labelForLiquid(record.liquid)}</td>
      <td>${record.heat === 'none' ? '未煮沸' : `煮沸 ${record.heat}`}</td>
      <td>${record.label}</td>
    </tr>`).join('');
}

function renderEvidence() {
  const list = $('#evidenceList');
  list.innerHTML = state.records.map(record => `
    <div class="evidence"><strong>${labelForLiquid(record.liquid)}${record.heat === 'none' ? '' : `（煮沸 ${record.heat}）`}</strong> → ${record.label}</div>`
  ).join('') || '<p>請先完成實驗。</p>';
}

function saveRecord() {
  const record = {
    schemaVersion: 2,
    moduleId: 'VL_BIO_DIGESTION_OPTION_A',
    savedAt: new Date().toISOString(),
    profile: state.profile,
    durationSeconds: Math.round((Date.now() - state.started) / 1000),
    hypothesis: state.hypothesis,
    trials: state.records,
    conclusion: {
      physicalVsChemical: $('#q1').value,
      heatSensitiveLiquid: $('#q2').value,
      surfaceArea: $('#q3').value
    },
    telemetry: state.events
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  return record;
}

$('#profileForm').addEventListener('submit', event => {
  event.preventDefault();
  const profile = { name: $('#profileName').value.trim(), classInfo: $('#profileClass').value.trim() };
  applyProfile(profile);
  $('#profileModal').classList.remove('show');
  logEvent('lab_started', { classInfo: profile.classInfo });
});

$('#changeProfile').addEventListener('click', () => {
  $('#profileName').value = state.profile?.name || '';
  $('#profileClass').value = state.profile?.classInfo || '';
  showProfile();
});

$$('[data-next]').forEach(button => button.addEventListener('click', () => {
  const nextPhase = Number(button.dataset.next);
  if (nextPhase === 2) $('.step[data-phase="2"]').disabled = false;
  if (nextPhase === 3) {
    state.hypothesis = {
      liquid: $('#hypothesisLiquid').value,
      outcome: $('#hypothesisOutcome').value,
      reason: $('#reason').value.trim()
    };
    $('.step[data-phase="3"]').disabled = false;
    logEvent('hypothesis_saved', state.hypothesis);
  }
  setPhase(nextPhase);
}));

$$('[data-back]').forEach(button => button.addEventListener('click', () => setPhase(Number(button.dataset.back))));
$$('.step').forEach(button => button.addEventListener('click', () => {
  if (!button.disabled) setPhase(Number(button.dataset.phase));
}));

$$('#observationChoices button').forEach(button => button.addEventListener('click', () => {
  $$('#observationChoices button').forEach(item => item.classList.remove('selected'));
  button.classList.add('selected');
  const correct = button.dataset.answer === 'separated';
  $('#observationFeedback').textContent = correct
    ? '對，這是油脂不溶於水時可觀察到的分層現象。'
    : '再看看試管：黃色油層是否和水層混合？';
  $('#observationFeedback').classList.toggle('good', correct);
  logEvent('orientation_answered', { selected: button.dataset.answer, correct });
}));

$$('#liquidButtons button').forEach(button => button.addEventListener('click', () => {
  state.liquid = button.dataset.liquid;
  state.heat = 'none';
  $$('#liquidButtons button').forEach(item => item.classList.toggle('selected', item === button));
  $$('.heat-buttons button').forEach(item => item.classList.toggle('selected', item.dataset.heat === 'none'));
  $('#recordData').disabled = true;
  logEvent('condition_selected', { liquid: state.liquid, heat: state.heat });
}));

$$('.heat-buttons button').forEach(button => button.addEventListener('click', () => {
  if (button.disabled) return;
  state.liquid = 'XY';
  state.heat = button.dataset.heat;
  $$('.heat-buttons button').forEach(item => item.classList.toggle('selected', item === button));
  $$('#liquidButtons button').forEach(item => item.classList.toggle('selected', item.dataset.liquid === 'XY'));
  $('#recordData').disabled = true;
  logEvent('condition_selected', { liquid: state.liquid, heat: state.heat });
}));

$('#runExperiment').addEventListener('click', () => {
  const result = experiments[currentKey()];
  if (!result) return showToast('請選擇可比較的實驗條件。');
  const tube = $('#testTube');
  tube.className = 'test-tube running';
  $('#resultTitle').textContent = '實驗進行中…';
  $('#resultStatus').textContent = '觀察中';
  $('#resultDescription').textContent = '請留意油滴與液體外觀的變化。';
  logEvent('trial_run', { liquid: state.liquid, heat: state.heat });
  window.setTimeout(() => {
    tube.className = `test-tube ${result.outcome}`;
    $('#resultTitle').textContent = result.label;
    $('#resultStatus').textContent = '可記錄';
    $('#resultDescription').textContent = result.text;
    $('#recordData').disabled = false;
  }, 850);
});

$('#recordData').addEventListener('click', () => {
  const key = currentKey();
  if (hasTrial(key)) return showToast('這個條件已記錄，可改變條件再測試。');
  state.records.push({ liquid: state.liquid, heat: state.heat, ...experiments[key] });
  $('#recordData').disabled = true;
  renderTable();
  updateHeatUnlock();
  $('#trialPill').textContent = `${state.records.length} / 6 次關鍵測試`;
  logEvent('trial_recorded', { liquid: state.liquid, heat: state.heat, outcome: experiments[key].outcome });
  showToast('數據已記錄到你的實驗表。');
});

$('#revealConcept').addEventListener('click', () => {
  const correct = $('#q1').value === 'cloudy' && $('#q2').value === 'Y' && $('#q3').value === 'increase';
  $('#conclusionFeedback').textContent = correct
    ? '你的推論與實驗證據一致。請閱讀下方的概念揭示。'
    : '請回看你的數據表，再用證據修訂推論。';
  $('#conclusionFeedback').classList.toggle('good', correct);
  logEvent('conclusion_checked', { correct });
  if (correct) {
    state.completed = true;
    $('#conceptReveal').classList.add('show');
    saveRecord();
  }
});

$('#downloadRecord').addEventListener('click', () => {
  const data = JSON.stringify(saveRecord(), null, 2);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  link.download = 'digestive-lab-learning-record.json';
  link.click();
  URL.revokeObjectURL(link.href);
});

$('#resetLab').addEventListener('click', () => {
  if (confirm('要重新開始這個模組嗎？目前的實驗紀錄會清除。')) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
});

showProfile();
