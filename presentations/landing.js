import { fitAll } from '/assets/js/fit.js';
import { browserInvite, readInvite, inviteURL, displayURL, drawQR, connect } from './transport.js?v=viewer3';
import { loadPublishedDeck } from './deck.js?v=viewer3';
const sharedInvite = readInvite();
const invite = sharedInvite || browserInvite();
const tile = document.getElementById('preview-link'), image = document.getElementById('cover');
const viewer = document.getElementById('viewer-link'), status = document.getElementById('session-status');
let channel, host, epoch, lastSeen = 0, lastVersion = -1;
if (sharedInvite) {
  tile.setAttribute('aria-label', 'Watch the active Beyond the Line presentation');
  document.querySelector('.preview-caption > span').textContent = 'Watch presentation ↗';
}
tile.href = sharedInvite ? inviteURL(invite) : displayURL(invite); viewer.href = inviteURL(invite);
document.getElementById('join-url').value = viewer.href;
drawQR(document.getElementById('landing-qr'), viewer.href).catch(() => { document.getElementById('landing-qr').textContent = 'QR unavailable. Use the viewer link below.'; });
tile.onclick = event => {
  // Only the launcher's display tab owns the session; shared URLs remain viewer-only.
  if (sharedInvite) return;
  event.preventDefault();
  const ownerKey = 'ra:display-owner:' + invite.session;
  const display = window.open('', 'ra-beyond-the-line-display');
  if (!display) {
    try { sessionStorage.setItem(ownerKey, '1'); } catch { /* Ordinary direct entry remains available. */ }
    location.href = tile.href; return;
  }
  try {
    display.sessionStorage.setItem(ownerKey, '1');
    const current = readInvite(display.location.hash);
    if (!display.location.href.startsWith(location.origin + '/presentations/beyond-the-line/') || current?.session !== invite.session) display.location.href = tile.href;
    display.focus();
  } catch { display.location.href = viewer.href; }
};
loadPublishedDeck().then(deck => {
  if (lastSeen) return;
  const layer = deck.slides[0]?.layers.find(item => item.kind === 'image');
  if (layer) { image.src = layer.src; image.hidden = false; }
}).catch(() => { /* Keep the textual cover until the host supplies a preview. */ });
connect(invite, 'viewer', (data, uuid) => {
  if (host && uuid !== host) return;
  if (data.type === 'welcome') { host = uuid; if (epoch !== data.epoch) lastVersion = -1; epoch = data.epoch; lastSeen = Date.now(); }
  if (data.type === 'state' && data.epoch === epoch && Number.isSafeInteger(data.version) && data.version > lastVersion) {
    lastVersion = data.version;
    lastSeen = Date.now(); status.textContent = `Live · slide ${data.index + 1} of ${data.count}`;
    if (typeof data.preview === 'string' && data.preview.startsWith('data:image/jpeg;base64,') && data.preview.length < 55000) { image.src = data.preview; image.hidden = false; }
  }
  if (data.type === 'ended') { lastSeen = 0; status.textContent = 'Display closed. Open the presentation to begin.'; }
}, (event, uuid) => { if (event === 'open') { host = uuid; setTimeout(() => channel?.send({ type: 'hello' }, host), 0); } }).then(value => { channel = value; channel.send({ type: 'hello' }, host); }).catch(() => { status.textContent = 'Open the presentation; viewers join with this QR.'; });
setInterval(() => {
  channel?.send(epoch ? { type: 'ping', clientTime: Date.now() } : { type: 'hello' }, host);
  if (lastSeen && Date.now() - lastSeen > 15000) { lastSeen = 0; status.textContent = 'Display offline. Reopen it to continue.'; }
}, 3000);
document.getElementById('copy-viewer-link').onclick = async () => {
  try { await navigator.clipboard.writeText(viewer.href); document.getElementById('copy-viewer-link').textContent = 'Copied'; }
  catch { document.getElementById('join-url').select(); }
};
window.addEventListener('pagehide', () => { channel?.send({ type: 'leave' }, host); channel?.close(); });
fitAll();
