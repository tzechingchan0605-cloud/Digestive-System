'use strict';
// Apps Script serves an embedded page. google.script.run operates within Google's
// own page; only request/response messages cross to the lab. No unreadable responses
// are treated as saved, and teacher passwords remain protected by server checks.
window.createAppsScriptBridge = function (endpoint) {
  const channel = crypto.randomUUID(), endpointOrigin = new URL(endpoint).origin;
  const pending = new Map();
  let source, sourceOrigin, readyPromise, frame;
  const trustedOrigin = origin => {
    if (origin === endpointOrigin) return true;
    try {
      const url = new URL(origin);
      return url.protocol === 'https:' && (url.hostname === 'script.googleusercontent.com' || /^[a-z0-9-]+-script\.googleusercontent\.com$/.test(url.hostname));
    } catch {return false;}
  };
  function connect() {
    if (readyPromise) return readyPromise;
    readyPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('message', receive);frame.remove();readyPromise = null;
        reject(Error('未能開啟雲端連線頁，請教師確認已更新 Apps Script 部署且允許所有人存取'));
      }, 20000);
      function receive(event) {
        const data = event.data;
        if (!data || data.channel !== channel || !trustedOrigin(event.origin)) return;
        if (data.type === 'vl1-ready' && !source) {
          source = event.source;sourceOrigin = event.origin;clearTimeout(timeout);
          source.postMessage({type:'vl1-connected',channel}, sourceOrigin);resolve();return;
        }
        if (event.source !== source || event.origin !== sourceOrigin || data.type !== 'vl1-response') return;
        const job = pending.get(data.id);
        if (!job) return;
        pending.delete(data.id);clearTimeout(job.timeout);
        if (data.error) job.reject(Error(String(data.error)));else job.resolve(data.result);
      }
      window.addEventListener('message', receive);
      const url = new URL(endpoint);
      url.searchParams.set('view', 'bridge');url.searchParams.set('channel', channel);url.searchParams.set('parentOrigin', location.origin);
      frame = document.createElement('iframe');frame.hidden = true;frame.title = '雲端紀錄連線';frame.src = url.href;
      document.body.append(frame);
    });
    return readyPromise;
  }
  async function send(payload) {
    await connect();
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {pending.delete(id);reject(Error('雲端尚未確認回應，請保留本機紀錄並重試'));}, 25000);
      pending.set(id, {resolve, reject, timeout});
      source.postMessage({type:'vl1-request',channel,id,payload}, sourceOrigin);
    });
  }
  return {send};
};
