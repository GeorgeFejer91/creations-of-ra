const SDK='https://cdn.jsdelivr.net/npm/@vdoninja/sdk@1.5.5/vdoninja-sdk.js';
const QR='https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
const ROOM='ra_beyond_the_line_live';
const STREAM='ra_beyond_the_line_controller';
const MARKER=6;
const scripts=new Map();

async function load(url){
  if(!scripts.has(url))scripts.set(url,new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src=url;s.onload=resolve;
    s.onerror=()=>{s.remove();scripts.delete(url);reject(new Error('Connection library unavailable.'));};
    document.head.append(s);
  }));
  return scripts.get(url);
}
function wire(sdk,onMessage,onConnection){
  let closed=false;
  sdk.addEventListener('dataReceived',e=>{const {uuid,data}=e.detail||{};if(!closed&&uuid&&data?.ra===MARKER)onMessage(data,uuid);});
  sdk.addEventListener('dataChannelOpen',e=>{if(!closed)onConnection?.('open',e.detail?.uuid);});
  sdk.addEventListener('peerDisconnected',e=>{if(!closed)onConnection?.('closed',e.detail?.uuid);});
  sdk.addEventListener('disconnected',()=>{if(!closed)onConnection?.('closed');});
  return {
    send(data,target){if(!closed)sdk.sendData({...data,ra:MARKER},target);},
    async close(){closed=true;await sdk.disconnect();}
  };
}
async function base(){
  await load(SDK);
  if(typeof window.VDONinjaSDK!=='function')throw new Error('Connection library did not initialize.');
  const sdk=new window.VDONinjaSDK({salt:'creations-of-ra-live-v6',debug:false});
  await sdk.connect();await sdk.joinRoom({room:ROOM});return sdk;
}
export async function connectController(onMessage,onConnection){
  const sdk=await base();
  try{await sdk.announce({streamID:STREAM});}
  catch(error){await sdk.disconnect().catch(()=>{});throw new Error('Another phone is already controlling this presentation.');}
  return wire(sdk,onMessage,onConnection);
}
export async function connectViewer(onMessage,onConnection){
  const sdk=await base();
  try{await sdk.view(STREAM,{audio:false,video:false});}
  catch(error){await sdk.disconnect().catch(()=>{});throw error;}
  return wire(sdk,onMessage,onConnection);
}
export function controllerURL(){return new URL('/presentations/controller/',location.origin).href;}
export async function drawQR(container,text){
  await load(QR);const qr=window.qrcode(0,'M');qr.addData(text);qr.make();
  container.innerHTML=qr.createSvgTag({cellSize:4,margin:16,scalable:true});
}