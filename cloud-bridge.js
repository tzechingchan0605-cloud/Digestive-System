'use strict';
// Google executes RPC inside its embedded page. Each connection has its own nonce,
// learned sender and pending jobs; expired connections cannot survive a retry.
window.createAppsScriptBridge = function (endpoint) {
  const endpointOrigin = new URL(endpoint).origin;
  let current = null;
  const trustedOrigin = origin => {
    if (origin === endpointOrigin) return true;
    try {
      const url = new URL(origin);
      return url.protocol === 'https:' && (url.hostname === 'script.googleusercontent.com' || /^[a-z0-9-]+-script\.googleusercontent\.com$/.test(url.hostname));
    } catch {return false;}
  };
  function rejectJobs(connection, error) {
    for (const job of connection.pending.values()) {clearTimeout(job.timeout);job.reject(error);}
    connection.pending.clear();
  }
  function discard(connection, error) {
    if (current !== connection) return;
    current = null;clearTimeout(connection.timeout);
    window.removeEventListener('message', connection.receive);connection.frame.remove();
    rejectJobs(connection, error);
    if (!connection.ready) connection.reject(error);
  }
  function connect() {
    if (current) return current.promise;
    const connection = {channel:crypto.randomUUID(),pending:new Map(),ready:false,source:null,sourceOrigin:null};
    current = connection;
    connection.promise = new Promise((resolve, reject) => {connection.resolve = resolve;connection.reject = reject;});
    connection.receive = event => {
      const data = event.data;
      if (current !== connection || !data || data.channel !== connection.channel || !trustedOrigin(event.origin) || !event.source) return;
      if (data.type === 'vl1-ready') {
        if (connection.source && (connection.source !== event.source || connection.sourceOrigin !== event.origin)) {
          rejectJobs(connection, Error('雲端連線頁已重新載入，請重試同步；本機答案仍保留'));
        }
        connection.source = event.source;connection.sourceOrigin = event.origin;
        try {connection.source.postMessage({type:'vl1-connected',channel:connection.channel},connection.sourceOrigin);}
        catch {discard(connection, Error('未能確認雲端連線，請重試同步'));return;}
        clearTimeout(connection.timeout);connection.ready = true;connection.resolve(connection);return;
      }
      if (!connection.ready || event.source !== connection.source || event.origin !== connection.sourceOrigin || data.type !== 'vl1-response') return;
      const job = connection.pending.get(data.id);
      if (!job) return;
      connection.pending.delete(data.id);clearTimeout(job.timeout);
      if (data.error) job.reject(Error(String(data.error)));else job.resolve(data.result);
    };
    window.addEventListener('message', connection.receive);
    connection.timeout = setTimeout(() => discard(connection, Error('雲端連線逾時，尚未收到回應。請教師核對網頁應用程式 /exec 網址及存取權，再重試同步')),20000);
    const url = new URL(endpoint);
    url.searchParams.set('view','bridge');url.searchParams.set('channel',connection.channel);url.searchParams.set('parentOrigin',location.origin);
    connection.frame = document.createElement('iframe');connection.frame.hidden = true;connection.frame.title = '雲端紀錄連線';connection.frame.src = url.href;
    connection.frame.addEventListener?.('error',()=>discard(connection,Error('未能載入雲端連線頁，請核對 /exec 網址後重試')));
    document.body.append(connection.frame);
    return connection.promise;
  }
  async function send(payload) {
    const connection = await connect();
    if (current !== connection) throw Error('雲端連線已更新，請重試同步');
    const id = crypto.randomUUID();
    return new Promise((resolve,reject) => {
      const timeout = setTimeout(() => discard(connection,Error('雲端尚未確認回應，請保留本機紀錄並重試')),25000);
      connection.pending.set(id,{resolve,reject,timeout});
      try {connection.source.postMessage({type:'vl1-request',channel:connection.channel,id,payload},connection.sourceOrigin);}
      catch {discard(connection,Error('雲端連線已中斷，請重試同步'));}
    });
  }
  return {send};
};
