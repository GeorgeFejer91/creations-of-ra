import { fitAll, setFitText } from '/assets/js/fit.js';
import { importPowerPoint, loadPublishedDeck } from './deck.js?v=viewer3';
import { createView } from './view.js?v=viewer3';
import { connect, browserInvite, readInvite, rememberInvite, inviteURL, displayURL, drawQR, randomId } from './transport.js?v=viewer3';
const $ = id => document.getElementById(id);
const player = $('player'), epoch = randomId(), peers = new Map();
let invite = readInvite() || browserInvite(), channel = null, deck = null, view = null;
let controller = null, pending = null, version = 0, blackout = false, releaseLock, starting;
let commandQueue = Promise.resolve(), snapshotTimer;
// Dialogs stay outside the fullscreen slide. Pending requests wait until fullscreen ends.
const isFullscreen = () => Boolean(document.fullscreenElement || player.classList.contains('cinema'));
function showPendingRequest() {
  if (pending && !isFullscreen() && !$('approve-dialog').open) {
    $('approve-dialog').showModal();
    setFitText($('presenter-name'), pending.name); fitAll($('approve-dialog'));
  }
}
function refreshFullscreen() {
  const active = isFullscreen();
  document.body.classList.toggle('presentation-fullscreen', active);
  document.querySelector('.player-header').inert = active;
  document.querySelector('.player-status').inert = active;
  $('local-controls').inert = active;
  if (active) { $('pair-dialog').close(); $('approve-dialog').close(); }
  else showPendingRequest();
}
document.addEventListener('fullscreenchange', refreshFullscreen);
const message = text => setFitText($('status'), text);
const canControlLocally = () => Boolean(view && $('show-controls').checked && !controller);
function refresh() {
  const local = canControlLocally(), index = view?.index || 0, count = deck?.slides.length || 0;
  const media = view?.currentMedia()[0];
  $('local-controls').hidden = !$('show-controls').checked || Boolean(controller);
  $('show-controls').disabled = Boolean(controller);
  $('local-controls').querySelectorAll('button, select, input').forEach(el => { el.disabled = !local; });
  $('prev').disabled = !local || index === 0; $('next').disabled = !local || index === count - 1;
  $('play').disabled = !local || !media; $('mute').disabled = !local || !media;
  $('seek').disabled = !local || !media || !Number.isFinite(media.duration);
  $('play').textContent = media && !media.paused ? 'Pause media' : 'Play media';
  $('mute').textContent = media?.muted ? 'Sound off' : 'Sound on';
  $('blackout').textContent = blackout ? 'Show slide' : 'Black screen';
  $('counter').textContent = `${count ? index + 1 : 0} / ${count}`;
  $('slide-select').value = String(index);
  $('seek').value = String(media && media.duration > 0 ? Math.round(media.currentTime / media.duration * 1000) : 0);
  $('revoke').hidden = !controller;
  $('fullscreen').disabled = !view;
  $('ppt-file').disabled = Boolean(controller);
  $('control-note').textContent = controller ? `${controller.name} controls this presentation. Local controls are locked.` : 'Viewing by default. Tick Show controls to present from this display.';
  player.classList.toggle('phone-controlled', Boolean(controller));
  view?.setInteractive(local);
  if (deck) setFitText($('deck-title'), deck.slides[index].title);
}
function installDeck(value) {
  view?.dispose(); deck?.dispose?.(); deck = value;
  blackout = false; $('blank-screen').hidden = true;
  view = createView($('stage'), deck, layer => execute({ action: 'media', layer }, 'local'), () => { refresh(); scheduleSnapshot(); });
  $('slide-select').replaceChildren(...deck.slides.map((slide, i) => {
    const option = document.createElement('option'); option.value = String(i); option.textContent = `${i + 1}. ${slide.title}`; return option;
  }));
  $('loading').hidden = true; refresh(); broadcast();
  message(`${deck.slides.length} slides ready. Scan the QR to join as a viewer.`);
}
function scheduleSnapshot() {
  if (!snapshotTimer) snapshotTimer = setTimeout(() => { snapshotTimer = null; broadcast(); }, 40);
}
function send(data, uuid) { try { channel?.send({ ...data, epoch }, uuid); } catch { /* A closed peer is removed on its heartbeat. */ } }
function broadcast(target) {
  if (!channel || !view) return;
  let preview = ''; try { preview = view.preview(blackout); } catch { /* Non-same-origin media must not taint rendering. */ }
  const state = { type: 'state', version: ++version, sentAt: Date.now(), index: view.index, count: deck.slides.length,
    title: deck.slides[view.index].title, blackout, media: view.playback(), source: deck.source || 'local',
    sourceSha256: deck.sourceSha256 || null, controller: controller ? { uuid: controller.uuid, name: controller.name } : null };
  for (const [uuid, peer] of peers) {
    if (target && target !== uuid) continue;
    const packet = { ...state };
    if (preview && (preview !== peer.lastFrame || target)) { packet.preview = preview; peer.lastFrame = preview; }
    send(packet, uuid);
  }
}
function welcome(uuid) {
  send({ type: 'welcome', viewer: uuid, controller: controller ? { uuid: controller.uuid, name: controller.name } : null,
    grant: controller?.uuid === uuid ? controller.grant : null }, uuid);
  broadcast(uuid);
}
function revoke(reason = 'Presenter released. Everyone remains a viewer.') {
  const previous = controller; controller = null;
  if (previous) send({ type: 'revoked', reason }, previous.uuid);
  $('show-controls').checked = false; refresh(); broadcast(); message(reason);
}
function removePeer(uuid) {
  peers.delete(uuid);
  if (pending?.uuid === uuid) { pending = null; $('approve-dialog').close(); }
  if (controller?.uuid === uuid) revoke('Presenter disconnected. Local controls remain off until selected.');
}
async function startSession() {
  if (channel) return channel;
  if (starting) return starting;
  starting = connect(invite, 'host', receive, (state, uuid) => {
    if (state === 'open' && uuid) { if (!peers.has(uuid)) peers.set(uuid, { lastSeen: Date.now(), lastFrame: '', seq: 0 }); setTimeout(() => welcome(uuid), 0); }
    if (state === 'closed' && uuid) removePeer(uuid);
    if (state === 'closed' && !uuid) {
      channel = null; peers.clear(); pending = null; $('approve-dialog').close(); revoke('Session disconnected. Use Connect phone to retry.');
    }
  }).then(value => { channel = value; for (const uuid of peers.keys()) welcome(uuid); return value; }).finally(() => { starting = null; });
  return starting;
}
function receive(data, uuid) {
  if (data.type === 'hello') {
    if (!peers.has(uuid)) peers.set(uuid, { lastSeen: Date.now(), lastFrame: '', seq: 0 });
    peers.get(uuid).lastSeen = Date.now(); welcome(uuid); return;
  }
  const peer = peers.get(uuid); if (!peer) return; peer.lastSeen = Date.now();
  if (data.type === 'ping') { send({ type: 'pong', clientTime: data.clientTime, hostTime: Date.now() }, uuid); return; }
  if (data.type === 'leave') { removePeer(uuid); return; }
  if (data.type === 'release-control') {
    if (controller?.uuid === uuid) revoke();
    if (pending?.uuid === uuid) { pending = null; $('approve-dialog').close(); }
    return;
  }
  if (data.type === 'request-control') {
    const name = typeof data.name === 'string' ? data.name.trim().slice(0, 40) : '';
    if (!name || !view) { send({ type: 'denied', reason: 'The display is not ready yet.' }, uuid); return; }
    if (controller?.uuid === uuid) { welcome(uuid); return; }
    if (controller || pending && pending.uuid !== uuid) { send({ type: 'denied', reason: 'Another presenter is active or awaiting approval.' }, uuid); return; }
    pending = { uuid, name }; $('pair-dialog').close();
    showPendingRequest();
    if (isFullscreen()) send({ type: 'notice', text: 'Ask the display owner to exit fullscreen to approve control. You can keep watching.' }, uuid);
    return;
  }
  if (data.type !== 'command' || uuid !== controller?.uuid || data.grant !== controller.grant || !Number.isSafeInteger(data.seq) || data.seq <= peer.seq) return;
  peer.seq = data.seq;
  execute(data, uuid);
}
function execute(data, sender) {
  const grant = controller?.grant;
  commandQueue = commandQueue.then(async () => {
    // Recheck after asynchronous media work: a revoked controller cannot drain a stale queue.
    if (sender === 'local' ? !canControlLocally() : (sender !== controller?.uuid || grant !== controller?.grant)) return;
    const media = view?.currentMedia()[0];
    switch (data.action) {
      case 'prev': view.show(Math.max(0, view.index - 1)); break;
      case 'next': view.show(Math.min(deck.slides.length - 1, view.index + 1)); break;
      case 'first': view.show(0); break;
      case 'last': view.show(deck.slides.length - 1); break;
      case 'slide': if (Number.isInteger(data.index)) view.show(data.index); break;
      case 'play': await toggleMedia(media); break;
      case 'media': await toggleMedia(view.currentMedia().find(el => Number(el.dataset.layer) === data.layer)); break;
      case 'seek': if (media && Number.isFinite(media.duration) && Number.isFinite(data.value)) media.currentTime = Math.max(0, Math.min(1, data.value)) * media.duration; break;
      case 'mute': if (media) media.muted = !media.muted; break;
      case 'blackout': blackout = !blackout; $('blank-screen').hidden = !blackout; break;
      case 'fullscreen':
        if (document.fullscreenElement) await document.exitFullscreen();
        else player.classList.toggle('cinema');
        refreshFullscreen(); break;
      default: return;
    }
    refresh(); broadcast();
  }).catch(error => { message(error.message); if (sender !== 'local') send({ type: 'notice', text: error.message }, sender); });
}
async function toggleMedia(media) {
  if (!media) return;
  if (!media.paused) { media.pause(); return; }
  try { await media.play(); $('gesture').hidden = true; }
  catch { $('gesture').hidden = false; throw new Error('Sound needs a click on the display. Exit fullscreen and use Enable sound, then retry.'); }
}
async function fullscreen() {
  if (!view) return;
  if (document.fullscreenElement) { await document.exitFullscreen(); return; }
  if (player.classList.contains('cinema')) { player.classList.remove('cinema'); refreshFullscreen(); return; }
  try { await player.requestFullscreen(); } catch { player.classList.add('cinema'); }
  refreshFullscreen();
}
$('show-controls').addEventListener('change', refresh);
$('prev').onclick = () => execute({ action: 'prev' }, 'local');
$('next').onclick = () => execute({ action: 'next' }, 'local');
$('slide-select').onchange = e => execute({ action: 'slide', index: Number(e.target.value) }, 'local');
for (const action of ['play', 'mute', 'blackout']) $(action).onclick = () => execute({ action }, 'local');
$('seek').onchange = e => execute({ action: 'seek', value: Number(e.target.value) / 1000 }, 'local');
$('fullscreen').onclick = fullscreen;
$('gesture').onclick = () => toggleMedia(view?.currentMedia()[0]).catch(error => message(error.message));
$('pair').onclick = async () => {
  $('pair').disabled = true;
  try { await startSession(); $('invite-link').value = inviteURL(invite); $('pair-dialog').showModal(); await drawQR($('qr'), inviteURL(invite)); }
  catch (error) { message(error.message); }
  finally { $('pair').disabled = false; }
};
$('copy-link').onclick = async () => { try { await navigator.clipboard.writeText($('invite-link').value); $('copy-link').textContent = 'Copied'; } catch { $('invite-link').select(); } };
$('revoke').onclick = () => revoke();
$('approve').onclick = () => {
  if (!pending || !peers.has(pending.uuid)) return;
  controller = { ...pending, grant: randomId() }; pending = null; peers.get(controller.uuid).seq = 0;
  $('show-controls').checked = false; $('approve-dialog').close();
  send({ type: 'approved', grant: controller.grant }, controller.uuid); refresh(); broadcast();
  message(`${controller.name} is presenting. All viewers follow this display.`);
};
function deny() { if (pending) send({ type: 'denied', reason: 'The display declined control. You can still watch.' }, pending.uuid); pending = null; $('approve-dialog').close(); }
$('deny').onclick = deny; $('approve-dialog').addEventListener('cancel', deny);
$('ppt-file').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  if (controller) { message('Release phone control before replacing the presentation.'); return; }
  try { const value = await importPowerPoint(await file.arrayBuffer()); value.source = 'local'; installDeck(value); }
  catch (error) { setFitText($('load-message'), error.message); }
};
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') { player.classList.remove('cinema'); refreshFullscreen(); }
  if ($('pair-dialog').open || $('approve-dialog').open || /INPUT|SELECT|TEXTAREA|BUTTON|A/.test(event.target.tagName)) return;
  if (event.key.toLowerCase() === 'f') { fullscreen(); return; }
  if (!canControlLocally()) return;
  const actions = { ArrowRight: 'next', PageDown: 'next', ArrowLeft: 'prev', PageUp: 'prev', Home: 'first', End: 'last', b: 'blackout', ' ': view.currentMedia().length ? 'play' : 'next' };
  if (actions[event.key]) { event.preventDefault(); execute({ action: actions[event.key] }, 'local'); }
});
setInterval(() => { for (const [uuid, peer] of peers) if (Date.now() - peer.lastSeen > 15000) removePeer(uuid); }, 3000);
setInterval(() => { if (peers.size && view?.currentMedia().some(el => !el.paused)) broadcast(); }, 300);
setInterval(() => { if (peers.size) broadcast(); }, 1500);
window.addEventListener('pagehide', () => { for (const uuid of peers.keys()) send({ type: 'ended' }, uuid); channel?.close(); view?.dispose(); releaseLock?.(); });
async function boot() {
  // A copied viewer link cannot start a second state owner. Duplicate display tabs join as viewers.
  const ownerKey = 'ra:display-owner:' + invite.session;
  let tabOwnsSession = false;
  try { tabOwnsSession = sessionStorage.getItem(ownerKey) === '1'; } catch { /* Private storage may be disabled. */ }
  if (location.hash && (!new URLSearchParams(location.hash.slice(1)).has('host') || !tabOwnsSession)) {
    location.replace(inviteURL(invite)); return;
  }
  try { sessionStorage.setItem(ownerKey, '1'); } catch { /* The same-browser display lock still applies. */ }
  if (navigator.locks) {
    const owns = await new Promise(resolve => {
      navigator.locks.request('ra-display-' + invite.session, { ifAvailable: true }, async lock => {
        resolve(Boolean(lock)); if (lock) await new Promise(release => { releaseLock = release; });
      });
    });
    if (!owns) { location.replace(inviteURL(invite)); return; }
  }
  rememberInvite(invite); history.replaceState(null, '', displayURL(invite));
  refresh(); startSession().catch(error => message(error.message));
  try { installDeck(await loadPublishedDeck()); }
  catch (error) { setFitText($('load-message'), error.message); message('Preload unavailable. Open the supplied PowerPoint on this display.'); }
}
boot().catch(error => message(error.message));
