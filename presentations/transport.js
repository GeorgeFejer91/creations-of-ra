// Data-only session: random invitation room plus explicit display approval. No passwords are stored.
const SDK='https://cdn.jsdelivr.net/npm/@vdoninja/sdk@1.5.5/vdoninja-sdk.js';
const QR='https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
const scripts=new Map();
export function loadScript(url){if(!scripts.has(url))scripts.set(url,new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>{s.remove();scripts.delete(url);reject(new Error('A required library could not load. Check your connection and try again.'));};document.head.append(s);}));return scripts.get(url);}
export function randomId(){return Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');}
export function newInvite(){return {room:'ra-'+randomId(),stream:'screen-'+randomId(),session:randomId()};}
export function inviteURL(invite){const url=new URL('/presentations/controller/',location.origin);url.hash=new URLSearchParams(invite).toString();return url.href;}
export function readInvite(){const p=new URLSearchParams(location.hash.slice(1)),v=Object.fromEntries(p);if(!/^ra-[a-f0-9]{32}$/.test(v.room||'')||!/^screen-[a-f0-9]{32}$/.test(v.stream||'')||!/^[a-f0-9]{32}$/.test(v.session||''))throw new Error('Scan a fresh QR code from the presentation display.');return v;}
export async function drawQR(container,text){await loadScript(QR);const qr=window.qrcode(0,'M');qr.addData(text);qr.make();container.innerHTML=qr.createSvgTag({cellSize:4,margin:16,scalable:true});}
export async function connect(invite,role,onMessage,onConnection){
 await loadScript(SDK);
 if(typeof window.VDONinjaSDK!=='function')throw new Error('The VDO.Ninja SDK did not initialize.');
 const sdk=new window.VDONinjaSDK({salt:'creations-of-ra-presenter-v1',debug:false});
 sdk.addEventListener('dataReceived',event=>{const {uuid,data}=event.detail||{};if(!uuid||!data||typeof data!=='object'||data.ra!==1||data.session!==invite.session)return;onMessage(data,uuid);});
 sdk.addEventListener('dataChannelOpen',event=>onConnection?.('open',event.detail?.uuid));
 sdk.addEventListener('peerDisconnected',event=>onConnection?.('closed',event.detail?.uuid));
 sdk.addEventListener('disconnected',()=>onConnection?.('closed'));
 try{await sdk.connect();await sdk.joinRoom({room:invite.room});if(role==='host')await sdk.announce({streamID:invite.stream});else await sdk.view(invite.stream,{audio:false,video:false});}
 catch(error){await sdk.disconnect().catch(()=>{});throw error;}
 return {send(data,uuid){sdk.sendData({...data,ra:1,session:invite.session},uuid);},close(){return sdk.disconnect();}};
}
