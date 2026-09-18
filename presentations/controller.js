import { fitAll, setFitText } from '/assets/js/fit.js';
import { connect, readInvite } from './transport.js?v=viewer3';
import { loadPublishedDeck } from './deck.js?v=viewer3';
import { createView } from './view.js?v=viewer3';
const $ = id => document.getElementById(id);
// Do not invent a new session when someone opens the viewer without an invitation.
const invite = readInvite();
// The landing-page link must retain this live session, not mint a different QR.
if (invite) document.querySelector('.join-footer a').href = '/presentations/#' + new URLSearchParams(invite);
let channel, host, self, epoch, grant = null, seq = 0, version = -1, lastSeen = 0;
let state = null, deck = null, view = null, requesting = false, connecting = false, clockOffset = 0, retriedAt = 0;
const message = text => setFitText($('remote-status'), text);
const canControl = () => Boolean(grant && $('show-controls').checked && state && state.controller?.uuid === self && Date.now() - lastSeen < 15000);
function refresh() {
  const enabled = canControl(), show = $('show-controls').checked;
  $('show-controls').disabled = Boolean(state?.controller && state.controller.uuid !== self);
  $('control-panel').hidden = !show;
  $('join-form').hidden = !show || Boolean(grant);
  $('join').disabled = !channel || !host || !epoch || !lastSeen || Date.now() - lastSeen > 15000 || requesting || Boolean(state?.controller && !grant);
  $('name').disabled = Boolean(state?.controller && !grant);
  $('control-panel').querySelectorAll('[data-command], input[type=range]').forEach(el => { el.disabled = !enabled; });
  if (state) {
    $('remote-counter').textContent = `${state.index + 1} / ${state.count}`;
    setFitText($('remote-title'), state.title);
    $('remote-panel').querySelector('[data-command="prev"]').disabled = !enabled || state.index === 0;
    $('remote-panel').querySelector('[data-command="next"]').disabled = !enabled || state.index === state.count - 1;
    $('remote-play').disabled = !enabled || !state.media.length;
    $('remote-play').textContent = state.media[0]?.paused === false ? 'Pause media' : 'Play media';
    $('remote-seek').disabled = !enabled || !state.media[0]?.duration;
    if (document.activeElement !== $('remote-seek')) $('remote-seek').value = String(state.media[0]?.duration ? Math.round(state.media[0].time / state.media[0].duration * 1000) : 0);
  }
  $('leave').hidden = !grant;
  $('hotspots').hidden = !enabled;
  $('role').textContent = enabled ? 'Presenter' : 'Viewer';
  if (state?.controller && !grant) $('request-note').textContent = `${state.controller.name} is presenting. Your controls are disabled.`;
  else $('request-note').textContent = requesting ? 'Waiting for approval on the display.' : 'Watching needs no approval. Control needs approval from the display.';
  fitAll($('control-panel'));
}
function send(action, extra = {}) {
  if (canControl()) channel.send({ type: 'command', action, seq: ++seq, grant, ...extra }, host);
}
function applyState() {
  if (!state || !lastSeen || Date.now() - lastSeen > 15000) return;
  const fullQuality = view && state.source === 'published' && state.sourceSha256 && deck.sourceSha256 === state.sourceSha256 && state.count === deck.slides.length;
  $('viewer-stage').hidden = !fullQuality;
  $('preview-image').hidden = Boolean(fullQuality);
  $('viewer-blackout').hidden = !state.blackout;
  if (fullQuality) view.apply(state, Math.max(0, Math.min(2, (Date.now() + clockOffset - state.sentAt) / 1000)));
  $('preview').dataset.rendering = fullQuality ? 'synchronized-deck' : 'display-preview';
  $('hotspots').replaceChildren();
  for (const media of state.media) {
    const button = document.createElement('button'); button.type = 'button';
    button.setAttribute('aria-label', `Play or pause ${media.label}`);
    ['left', 'top', 'width', 'height'].forEach((key, i) => { button.style[key] = `${media.box[i] * 100}%`; });
    button.onclick = () => send('media', { layer: media.layer }); $('hotspots').append(button);
  }
  refresh();
}
function receive(data, uuid) {
  if (host && host !== uuid) return;
  if (data.type === 'welcome') {
    host = uuid; self = data.viewer;
    if (epoch !== data.epoch) { version = -1; state = null; requesting = false; seq = 0; }
    epoch = data.epoch; lastSeen = Date.now(); grant = data.grant || null;
    if (grant) requesting = false;
    message(grant ? 'You control the display. Everyone sees the same slide.' : 'Connected as a viewer. Following the display.'); refresh(); return;
  }
  if (!host || data.epoch !== epoch) return;
  lastSeen = Date.now();
  if (data.type === 'pong') {
    if (Number.isFinite(data.clientTime) && Number.isFinite(data.hostTime)) clockOffset = data.hostTime - (data.clientTime + Date.now()) / 2;
    return;
  }
  if (data.type === 'approved') { grant = data.grant; requesting = false; seq = 0; message('Presenter approved. The display and viewers follow your commands.'); refresh(); return; }
  if (data.type === 'denied' || data.type === 'revoked') { grant = null; requesting = false; message(data.reason || 'Control ended. You are still watching.'); refresh(); return; }
  if (data.type === 'notice') { message(String(data.text).slice(0, 300)); return; }
  if (data.type === 'ended') { markOffline('This presentation ended. Ask the display for a new viewer link.'); return; }
  if (data.type !== 'state' || !Number.isSafeInteger(data.version) || data.version <= version || !Number.isInteger(data.index) || !Number.isInteger(data.count) || data.index < 0 || data.index >= data.count || data.count > 100 || !Number.isFinite(data.sentAt)) return;
  version = data.version;
  const media = Array.isArray(data.media) ? data.media.filter(m => Number.isInteger(m.layer) && Array.isArray(m.box) && m.box.length === 4 && m.box.every(Number.isFinite) && Number.isFinite(m.time) && Number.isFinite(m.rate) && m.rate > 0 && m.rate <= 4).slice(0, 10) : [];
  state = { ...data, title: String(data.title).slice(0, 200), media };
  $('preview').dataset.offline = 'false';
  if (state.controller?.uuid !== self) grant = null;
  if (typeof data.preview === 'string' && data.preview.startsWith('data:image/jpeg;base64,') && data.preview.length < 55000) $('preview-image').src = data.preview;
  applyState();
}
function markOffline(text) {
  grant = null; requesting = false; state = null; view?.media.forEach(el => el.pause());
  $('preview').dataset.offline = 'true';
  message(text); lastSeen = 0; refresh();
}
async function joinSession() {
  if (!invite) { message('Open the viewer link or scan the QR beside the presentation preview.'); $('retry').disabled = true; refresh(); return; }
  if (connecting) return; connecting = true; retriedAt = Date.now();
  try {
    await channel?.close().catch(() => {}); channel = null; host = null; epoch = null; version = -1; grant = null;
    message('Joining as a viewer. Keep the presentation display open.'); refresh();
    channel = await connect(invite, 'viewer', receive, (event, uuid) => {
      if (event === 'open') { host = uuid; lastSeen = Date.now(); setTimeout(() => channel?.send({ type: 'hello' }, host), 0); }
      else if (!uuid || uuid === host) markOffline('Display connection lost. Waiting to reconnect; controls are disabled.');
    });
    channel.send({ type: 'hello' }, host); refresh();
  } catch (error) { markOffline(error.message); }
  finally { connecting = false; }
}
$('show-controls').onchange = () => {
  if (!$('show-controls').checked) { channel?.send({ type: 'release-control' }, host); grant = null; requesting = false; }
  refresh();
};
$('join-form').onsubmit = event => {
  event.preventDefault(); if (!$('show-controls').checked || $('join').disabled) return;
  const name = $('name').value.trim().slice(0, 40); if (!name) return;
  requesting = true; channel.send({ type: 'request-control', name }, host); refresh();
};
$('remote-panel').querySelectorAll('[data-command]').forEach(button => { button.onclick = () => send(button.dataset.command); });
$('remote-seek').onchange = event => send('seek', { value: Number(event.target.value) / 1000 });
$('leave').onclick = () => { $('show-controls').checked = false; $('show-controls').dispatchEvent(new Event('change')); message('Control released. You are still watching.'); };
$('viewer-fullscreen').onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('preview').requestFullscreen(); }
  catch { $('preview').classList.toggle('cinema'); }
};
$('retry').onclick = joinSession;
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') $('preview').classList.remove('cinema');
  if (!canControl() || /INPUT|BUTTON|TEXTAREA|SELECT|A/.test(event.target.tagName)) return;
  const action = { ArrowRight: 'next', ArrowLeft: 'prev', PageDown: 'next', PageUp: 'prev', Home: 'first', End: 'last', ' ': 'play', b: 'blackout' }[event.key];
  if (action) { event.preventDefault(); send(action); }
});
setInterval(() => {
  if (!invite) return;
  if (channel && host && epoch) channel.send({ type: 'ping', clientTime: Date.now() }, host);
  else channel?.send({ type: 'hello' }, host);
  if (lastSeen && Date.now() - lastSeen > 15000) markOffline('Display unavailable. Controls disabled until reconnected.');
  if ((!lastSeen || !epoch) && Date.now() - retriedAt > 20000) joinSession();
}, 3000);
window.addEventListener('pagehide', () => { channel?.send({ type: 'leave' }, host); channel?.close(); view?.dispose(); });
loadPublishedDeck().then(value => { deck = value; view = createView($('viewer-stage'), deck); view.setInteractive(false); applyState(); }).catch(() => { /* The host's shared preview remains available, including for locally opened decks. */ });
refresh(); joinSession();
