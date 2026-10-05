// Exercise the real bridge with browser-shaped objects and deterministic timers.
// No Google service or network request is mocked as a successful cloud save.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const sourceCode = fs.readFileSync(path.join(__dirname, '..', 'cloud-bridge.js'), 'utf8');
const endpoint = 'https://script.google.com/macros/s/test-deployment/exec';
const googleOrigin = 'https://test-script.googleusercontent.com';
const tick = () => new Promise(resolve => setImmediate(resolve));

function harness() {
  const frames = [], timers = new Map(), listeners = new Set();
  let timerId = 0;
  const document = {
    createElement(tag) {
      assert.equal(tag, 'iframe');
      const frame = {
        style: {}, attributes: {}, contentWindow: {}, removed: false, listeners: new Map(),
        setAttribute(name, value) {this.attributes[name] = value;},
        addEventListener(type, callback) {this.listeners.set(type, callback);},
        remove() {this.removed = true;},
      };
      frames.push(frame);
      return frame;
    },
    body: {append() {}, appendChild() {}},
  };
  const window = {
    addEventListener(type, callback) {
      assert.equal(type, 'message'); listeners.add(callback);
    },
    removeEventListener(type, callback) {
      assert.equal(type, 'message'); listeners.delete(callback);
    },
  };
  const context = {
    window, document, URL, crypto, location: {origin: 'https://lab.example'},
    setTimeout(callback, delay) {
      const id = ++timerId; timers.set(id, {callback, delay}); return id;
    },
    clearTimeout(id) {timers.delete(id);},
  };
  vm.createContext(context); vm.runInContext(sourceCode, context);
  const bridge = window.createAppsScriptBridge(endpoint);
  const channel = frame => new URL(frame.src).searchParams.get('channel');
  const emit = (source, data, origin = googleOrigin) => {
    for (const callback of [...listeners]) callback({source, origin, data});
  };
  const ready = (source, frame = frames.at(-1), origin = googleOrigin) =>
    emit(source, {type: 'vl1-ready', channel: channel(frame)}, origin);
  const respond = (source, message, result, origin = googleOrigin) =>
    emit(source, {type: 'vl1-response', channel: message.channel, id: message.id, result}, origin);
  const fireTimer = id => {
    const timer = timers.get(id); assert(timer, 'Expected a live timer');
    timers.delete(id); timer.callback();
  };
  const source = (fail = false) => ({
    messages: [],
    postMessage(data, origin) {
      if (fail) throw Error('The Google frame has been detached');
      this.messages.push({data, origin});
    },
  });
  const request = payload => {
    const outcome = {state: 'pending'};
    outcome.done = bridge.send(payload).then(
      value => {outcome.state = 'resolved'; outcome.value = value;},
      error => {outcome.state = 'rejected'; outcome.error = error;},
    );
    return outcome;
  };
  const rpc = target => target.messages.filter(message => message.data.type === 'vl1-request').at(-1)?.data;
  const acknowledgements = target => target.messages.filter(message => message.data.type === 'vl1-connected').length;
  const noLeaks = () => {
    assert.equal(timers.size, 0, 'Abandoned requests must not leave timers');
    assert.equal(listeners.size, 0, 'Abandoned transport must remove its receiver');
    assert(frames.every(frame => frame.removed), 'Abandoned transport must remove every iframe');
  };
  return {frames, timers, listeners, bridge, channel, emit, ready, respond, fireTimer,
    source, request, rpc, acknowledgements, noLeaks};
}

async function handshakeRetry() {
  const h = harness(), first = h.request({action: 'save'}), oldFrame = h.frames[0];
  assert.equal(h.timers.size, 1);
  h.fireTimer([...h.timers.keys()][0]); await first.done;
  assert.equal(first.state, 'rejected'); h.noLeaks();

  const second = h.request({action: 'save'}), newFrame = h.frames.at(-1);
  assert.notEqual(h.channel(oldFrame), h.channel(newFrame), 'Every reconnection needs a new channel');
  const stale = h.source(); h.ready(stale, oldFrame); await tick();
  assert.equal(h.acknowledgements(stale), 0, 'Late messages from an abandoned iframe are ignored');
  assert.equal(second.state, 'pending');
  const valid = h.source(); h.ready(valid); await tick();
  h.respond(valid, h.rpc(valid), {ok: true}); await second.done;
  assert.equal(second.state, 'resolved'); assert.equal(h.timers.size, 0);
}

async function rpcTimeoutRetry() {
  const h = harness(), first = h.request({action: 'save'}), sibling = h.request({action: 'list'});
  const original = h.source(); h.ready(original); await tick();
  assert.equal(h.timers.size, 2);
  h.fireTimer([...h.timers.keys()][0]); await Promise.all([first.done, sibling.done]);
  assert.equal(first.state, 'rejected'); assert.equal(sibling.state, 'rejected'); h.noLeaks();
  const oldChannel = h.channel(h.frames[0]);

  const retry = h.request({action: 'save'}), fresh = h.source();
  assert.equal(h.frames.length, 2, 'Retry must create a fresh iframe after RPC timeout');
  assert.notEqual(h.channel(h.frames.at(-1)), oldChannel);
  h.ready(fresh); await tick(); h.respond(fresh, h.rpc(fresh), {ok: true}); await retry.done;
  assert.equal(retry.state, 'resolved'); assert.equal(h.timers.size, 0);
}

async function sourceValidationAndReplacement() {
  const h = harness(), first = h.request({action: 'save'});
  const source = h.source(), attacker = h.source();
  h.ready(attacker, h.frames.at(-1), 'https://attacker.example'); await tick();
  assert.equal(h.acknowledgements(attacker), 0); assert.equal(first.state, 'pending');
  h.ready(source); await tick();
  const message = h.rpc(source);
  h.ready(source); assert.equal(h.acknowledgements(source), 2, 'Repeated readiness must be acknowledged');
  h.respond(attacker, message, {ok: true});
  h.respond(source, message, {ok: true}, 'https://attacker.example');
  h.respond(source, {...message, id: crypto.randomUUID()}, {ok: true});
  await tick(); assert.equal(first.state, 'pending', 'Wrong source, origin, or request ID cannot resolve jobs');
  h.respond(source, message, {ok: true}); await first.done;

  const inFlight = h.request({action: 'save'}); await tick();
  const replacement = h.source(); h.ready(replacement); await inFlight.done;
  assert.equal(inFlight.state, 'rejected', 'A replaced Google document invalidates old RPC jobs');
  assert.equal(h.acknowledgements(replacement), 1); assert.equal(h.timers.size, 0);
  const afterReload = h.request({action: 'save'}); await tick();
  h.respond(replacement, h.rpc(replacement), {ok: true}); await afterReload.done;
  assert.equal(afterReload.state, 'resolved'); assert.equal(h.frames.length, 1);
}

async function synchronousPostFailure() {
  const h = harness(), first = h.request({action: 'save'}), source = h.source();
  h.ready(source); await tick(); h.respond(source, h.rpc(source), {ok: true}); await first.done;
  source.postMessage = () => {throw Error('Detached frame');};
  const failed = h.request({action: 'save'}); await failed.done;
  assert.equal(failed.state, 'rejected'); h.noLeaks();
  const retry = h.request({action: 'save'}), fresh = h.source();
  assert.equal(h.frames.length, 2);
  h.ready(fresh); await tick(); h.respond(fresh, h.rpc(fresh), {ok: true}); await retry.done;
  assert.equal(retry.state, 'resolved'); assert.equal(h.timers.size, 0);
}

async function initialFrameFailure() {
  const h = harness(), failedLoad = h.request({action: 'save'});
  const frame = h.frames.at(-1);
  assert(frame.listeners.has('error'), 'Iframe load errors should reject the connection');
  frame.listeners.get('error')(); await failedLoad.done;
  assert.equal(failedLoad.state, 'rejected'); h.noLeaks();
  const failedAcknowledgement = h.request({action: 'save'});
  h.ready(h.source(true)); await failedAcknowledgement.done;
  assert.equal(failedAcknowledgement.state, 'rejected'); h.noLeaks();
  const retry = h.request({action: 'save'}), fresh = h.source();
  h.ready(fresh); await tick(); h.respond(fresh, h.rpc(fresh), {ok: true}); await retry.done;
  assert.equal(retry.state, 'resolved'); assert.equal(h.timers.size, 0);
}

(async () => {
  await handshakeRetry();
  await rpcTimeoutRetry();
  await sourceValidationAndReplacement();
  await synchronousPostFailure();
  await initialFrameFailure();
  console.log('PASS: bridge timeout recovery, fresh retry channels, stale-message rejection, source/origin/request validation, frame replacement, synchronous postMessage failure, and timer/listener cleanup.');
})().catch(error => {console.error(error); process.exitCode = 1;});
