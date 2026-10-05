'use strict';
// Local records remain the durable outbox; acknowledgements never delete answers.
window.createCloudSync = function ({endpoint, storage, records, status, fetcher = fetch, transport = 'auto'}) {
  const enabled = Boolean(endpoint), key = 'digestiveLab.cloudSync.v1';
  const pending = new Map();
  const useBridge = enabled && (transport === 'bridge' || /^https:\/\/script\.google\.com\/macros\/s\//.test(endpoint));
  let bridge, bridgeLoader;
  let running = null, timer, credential = '', confirmed = false;
  function metadata() {
    const raw = storage.getItem(key);
    const value = raw ? JSON.parse(raw) : {};
    if (!value || Array.isArray(value) || typeof value !== 'object') throw Error('同步設定損壞，原資料已保留');
    return value;
  }
  function entry(id) {
    const all = metadata();
    if (!all[id]) {
      all[id] = {token: crypto.randomUUID() + crypto.randomUUID(), acknowledgements: {}};
      storage.setItem(key, JSON.stringify(all));
    }
    if (!all[id].token || !all[id].acknowledgements) throw Error('同步設定不完整');
    return all[id];
  }
  function student(r) {
    return r?.moduleId === 'VL_BIO_DIGESTION_OPTION_A' && r.id && r.profile?.email && r.profile.email.toLowerCase() !== 'tzechingchan0605@gmail.com';
  }
  async function request(body, keepalive = false) {
    if (useBridge) {
      if (!bridge) {
        // Also support a cached HTML page that did not yet include this script.
        if (!window.createAppsScriptBridge) {
          if (!bridgeLoader) bridgeLoader = new Promise((resolve,reject) => {
            const script=document.createElement('script');script.src='cloud-bridge.js?v=2';
            script.onload=resolve;script.onerror=()=>{bridgeLoader=null;script.remove();reject(Error('未能載入雲端連線程式，請重新整理後重試'));};
            document.head.append(script);
          });
          await bridgeLoader;
        }
        bridge = createAppsScriptBridge(endpoint);
      }
      const result = await bridge.send(body);
      if (!result?.ok) throw Error(result?.error || '雲端未確認儲存');
      return result;
    }
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetcher(endpoint, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(body), signal: controller.signal, keepalive});
      if (!response.ok) throw Error('雲端連線失敗');
      let result;
      try {result = await response.json();}
      catch {throw Error('收集端未回傳有效資料，請教師檢查雲端部署設定');}
      if (!result.ok) throw Error(result.error || '雲端未確認儲存');
      return result;
    } finally {clearTimeout(timeout);}
  }
  function enqueue(record) {
    if (!enabled || !student(record)) return;
    try {
      const info = entry(record.id);
      if (info.acknowledgements[endpoint] === record.savedAt) return;
      pending.set(record.id, structuredClone(record));
      status('pending', `尚有 ${pending.size} 份紀錄等待同步；本機備份已保留。`);
      clearTimeout(timer); timer = setTimeout(() => flush().catch(() => {}), 1200);
    } catch (e) {pending.set(record.id, structuredClone(record));status('error', e.message + '；請勿清除瀏覽器資料。');}
  }
  async function drain() {
    while (pending.size) {
      const [id, record] = pending.entries().next().value;
      const info = entry(id);
      await request({action: 'save', token: info.token, record});
      const all = metadata();
      all[id].acknowledgements[endpoint] = record.savedAt;
      storage.setItem(key, JSON.stringify(all));
      if (pending.get(id)?.savedAt === record.savedAt) pending.delete(id);
    }
    confirmed = true;
    status('synced', '本機學生紀錄已同步至全班雲端紀錄。');
  }
  function flush() {
    clearTimeout(timer);
    if (!enabled || !running && !pending.size) return Promise.resolve();
    if (!running) running = drain().catch(e => {status('error', '尚未同步至雲端：' + e.message + '。本機備份仍在，請連線後重試。');throw e;}).finally(() => {running = null;});
    return running;
  }
  function recover() {
    if (!enabled) {status('unconfigured', '尚未設定雲端收集網址；紀錄只存於這部瀏覽器，教師無法跨裝置收集。');return;}
    records().filter(student).forEach(enqueue);
    if (!pending.size && !confirmed) status('configured', '已設定雲端收集網址；開始探究後會自動上傳。尚未確認本次連線或儲存成功。');
  }
  async function list(password) {
    if (password !== undefined) credential = password;
    if (!credential) throw Error('請先輸入教師雲端密碼');
    const rows = []; let cursor = 0;
    do {
      const page = await request({action: 'list', teacherEmail: 'tzechingchan0605@gmail.com', password: credential, cursor});
      if (!Array.isArray(page.records) || !(page.nextCursor === null || Number.isInteger(page.nextCursor) && page.nextCursor > cursor)) throw Error('雲端回應格式不正確');
      rows.push(...page.records.filter(student)); cursor = page.nextCursor;
    } while (cursor !== null);
    return rows;
  }
  function leave() {
    // keepalive has a 64 KiB limit. Larger drawings remain in the local outbox.
    for (const [id, record] of pending) {
      const body = {action: 'save', token: entry(id).token, record};
      if (new Blob([JSON.stringify(body)]).size < 60000) request(body, true).catch(() => {});
    }
  }
  return {enabled, enqueue, flush, recover, list, leave, clearCredential() {credential = '';}};
};
