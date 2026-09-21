const SDK='https://cdn.jsdelivr.net/npm/@vdoninja/sdk@1.5.5/vdoninja-sdk.js';
const QR='https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
const ROOM='ra_beyond_the_line_live';
const STREAM='ra_beyond_the_line_controller';
const MARKER=6;
export const PROTOCOL='ra-presentation-control';
export const PROTOCOL_VERSION=1;
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
  for(const name of ['error','alert','rejected','connectionFailed'])sdk.addEventListener(name,e=>{
    if(!closed)onConnection?.('error',e.detail??e);
  });
  return {
    send(data,target){if(!closed)sdk.sendData({...data,ra:MARKER},target);},
    async close(){closed=true;await sdk.disconnect();}
  };
}
function errorText(value){
  if(value instanceof Error)return `${value.name} ${value.message}`;
  if(typeof value==='string')return value;
  try{return JSON.stringify(value);}
  catch{return String(value||'');}
}
export function isControllerConflict(value){
  return /already.{0,24}(use|active|claim|publish)|stream.{0,24}(use|active|claim|exist)|duplicate.{0,16}stream/i.test(errorText(value));
}
function controllerConflict(cause){
  const error=new Error('Another device is already controlling this presentation.',{cause});
  error.code='controller_in_use';return error;
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function base(){
  await load(SDK);
  if(typeof window.VDONinjaSDK!=='function')throw new Error('Connection library did not initialize.');
  const sdk=new window.VDONinjaSDK({salt:'creations-of-ra-live-v6',debug:false});
  await sdk.connect();await sdk.joinRoom({room:ROOM});return sdk;
}
export async function connectController(onMessage,onConnection){
  const sdk=await base();
  const channel=wire(sdk,onMessage,onConnection);
  let conflict=null;
  const notice=event=>{if(isControllerConflict(event.detail??event))conflict=event.detail??event;};
  for(const name of ['error','alert','rejected','connectionFailed'])sdk.addEventListener(name,notice);
  try{
    await sdk.announce({streamID:STREAM});
    // The signaling service can reject a duplicate publisher just after announce resolves.
    await wait(1400);
  }catch(error){
    await channel.close().catch(()=>{});
    if(isControllerConflict(error))throw controllerConflict(error);
    throw error;
  }finally{
    for(const name of ['error','alert','rejected','connectionFailed'])sdk.removeEventListener(name,notice);
  }
  if(conflict){await channel.close().catch(()=>{});throw controllerConflict(conflict);}
  return channel;
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
