// One display announces; every other peer views it. A viewer link never grants control.
const SDK = 'https://cdn.jsdelivr.net/npm/@vdoninja/sdk@1.5.5/vdoninja-sdk.js';
const QR = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
const STORAGE = 'ra:beyond-the-line:session:v2';
const scripts = new Map();
export function loadScript(url) {
  if (!scripts.has(url)) scripts.set(url, new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = () => { script.remove(); scripts.delete(url); reject(new Error('The connection library could not load. Please retry.')); };
    document.head.append(script);
  }));
  return scripts.get(url);
}
export function randomId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), x => x.toString(16).padStart(2, '0')).join('');
}
export function newInvite() { return { room: 'ra_' + randomId(), stream: 'screen_' + randomId(), session: randomId() }; }
export function readInvite(hash = location.hash) {
  const value = Object.fromEntries(new URLSearchParams(hash.replace(/^#/, '')));
  if (!/^ra[_-][a-f0-9]{32}$/.test(value.room || '') || !/^screen[_-][a-f0-9]{32}$/.test(value.stream || '') || !/^[a-f0-9]{32}$/.test(value.session || '')) return null;
  return { room: value.room, stream: value.stream, session: value.session };
}
export function rememberInvite(invite) {
  try { localStorage.setItem(STORAGE, JSON.stringify({ ...invite, expires: Date.now() + 8 * 60 * 60 * 1000 })); } catch { /* The URL still carries the session. */ }
}
export function browserInvite() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE));
    const invite = saved && readInvite(new URLSearchParams(saved).toString());
    if (invite && saved.expires > Date.now()) return invite;
  } catch { /* Private browsing may disable storage. */ }
  const invite = newInvite(); rememberInvite(invite); return invite;
}
export function inviteURL(invite) {
  const url = new URL('/presentations/controller/', location.origin);
  url.hash = new URLSearchParams(invite).toString(); return url.href;
}
export function displayURL(invite) {
  const url = new URL('/presentations/beyond-the-line/', location.origin);
  url.hash = new URLSearchParams({ ...invite, host: '1' }).toString(); return url.href;
}
export async function drawQR(container, text) {
  await loadScript(QR);
  const qr = window.qrcode(0, 'M'); qr.addData(text); qr.make();
  container.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 16, scalable: true });
}
export async function connect(invite, role, onMessage, onConnection) {
  await loadScript(SDK);
  const sdk = new window.VDONinjaSDK({ salt: 'creations-of-ra-presenter-v1', debug: false });
  let closed = false;
  sdk.addEventListener('dataReceived', event => {
    const { uuid, data } = event.detail || {};
    if (!closed && uuid && data?.ra === 2 && data.session === invite.session) onMessage(data, uuid);
  });
  sdk.addEventListener('dataChannelOpen', e => { if (!closed) onConnection?.('open', e.detail?.uuid); });
  sdk.addEventListener('peerDisconnected', e => { if (!closed) onConnection?.('closed', e.detail?.uuid); });
  sdk.addEventListener('disconnected', () => { if (!closed) onConnection?.('closed'); });
  let timer;
  try {
    await Promise.race([
      (async () => {
        await sdk.connect(); await sdk.joinRoom({ room: invite.room });
        if (role === 'host') await sdk.announce({ streamID: invite.stream });
        else await sdk.view(invite.stream, { audio: false, video: false });
      })(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Connection timed out. Keep the presentation display open and retry.')), 20000); })
    ]);
  } catch (error) { closed = true; await Promise.resolve(sdk.disconnect()).catch(() => {}); throw error; }
  finally { clearTimeout(timer); }
  return {
    send(data, uuid) { if (!closed) sdk.sendData({ ...data, ra: 2, session: invite.session }, uuid); },
    async close() { closed = true; await sdk.disconnect(); }
  };
}
