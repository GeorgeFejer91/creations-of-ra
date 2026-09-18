import {loadPublishedDeck} from './deck.js?v=min6';
import {createView} from './view.js?v=min6';
import {connectViewer,controllerURL,drawQR} from './transport.js?v=min6';

const $=id=>document.getElementById(id);
let deck,view,channel,controller=null,lastSeen=0,lastVersion=-1,retryTimer;
const status=text=>$('presentation-status').textContent=text;

function idle(){
  $('idle').hidden=false;$('live').hidden=true;document.body.classList.remove('presenting');
  $('viewer-blackout').hidden=true;controller=null;lastSeen=0;lastVersion=-1;
  if(view){view.show(0);view.currentMedia().forEach(v=>v.pause());}
  status('Waiting for controller.');
}
function live(){
  $('idle').hidden=true;$('live').hidden=false;document.body.classList.add('presenting');
}
function receive(data,uuid){
  if(controller&&uuid!==controller)return;
  if(data.type==='state'){
    if(!Number.isSafeInteger(data.version)||data.version<=lastVersion||!Number.isInteger(data.index))return;
    controller=uuid;lastSeen=Date.now();lastVersion=data.version;live();
    $('viewer-blackout').hidden=!data.blackout;
    if(view&&Array.isArray(data.media))view.apply(data,Math.max(0,Math.min(2,(Date.now()-Number(data.sentAt||Date.now()))/1000)));
    if(typeof data.preview==='string'&&data.preview.startsWith('data:image/jpeg;base64,')){$('viewer-frame').src=data.preview;$('viewer-frame').hidden=false;}
    status('Presentation live.');
  }
  if(data.type==='ended'){idle();restart(500);}
}
function restart(delay=1500){
  clearTimeout(retryTimer);retryTimer=setTimeout(connect,delay);
}
async function connect(){
  try{await channel?.close();}catch{}
  channel=null;controller=null;
  try{
    channel=await connectViewer(receive,(event,uuid)=>{
      if(event==='open'&&uuid){controller=uuid;lastSeen=Date.now();setTimeout(()=>channel?.send({type:'hello'},uuid),0);}
      if(event==='closed'&&(!uuid||uuid===controller)){idle();restart();}
    });
    if(controller)channel.send({type:'hello'},controller);
  }catch{idle();restart(1800);}
}
async function boot(){
  await drawQR($('controller-qr'),controllerURL());
  try{
    deck=await loadPublishedDeck();
    const first=deck.slides?.[0]?.layers?.find(layer=>layer.kind==='image');
    if(first)$('cover').src=first.src;
    view=createView($('viewer-stage'),deck);view.setInteractive(false);view.show(0);
  }catch{status('Presentation preview unavailable.');}
  idle();connect();
  setInterval(()=>{
    if(channel&&controller)channel.send({type:'ping'},controller);
    if(lastSeen&&Date.now()-lastSeen>15000){idle();restart(200);}
  },3000);
}
window.addEventListener('pagehide',()=>channel?.close());
boot();