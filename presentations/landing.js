import {fitAll} from '/assets/js/fit.js';
import {loadPublishedDeck} from './deck.js?v=control8';
import {createView} from './view.js?v=control8';
import {connectViewer,controllerURL,drawQR} from './transport.js?v=min6';

const $=id=>document.getElementById(id);
let deck,view,channel,controller=null,lastSeen=0,lastVersion=-1,retryTimer,fullscreenAttempted=false;
const status=text=>$('presentation-status').textContent=text;

async function leaveNativeFullscreen(){
  if(document.fullscreenElement)try{await document.exitFullscreen();}catch{}
}
async function tryNativeFullscreen(){
  if(document.fullscreenElement)return;
  try{await document.documentElement.requestFullscreen({navigationUI:'hide'});}catch{}
}
function idle(){
  $('idle').hidden=false;$('live').hidden=true;document.body.classList.remove('presenting');
  $('viewer-blackout').hidden=true;controller=null;lastSeen=0;lastVersion=-1;fullscreenAttempted=false;
  if(view){view.show(0);view.currentMedia().forEach(media=>media.pause());}
  leaveNativeFullscreen();
  status('Waiting for controller.');
}
function live(){
  $('idle').hidden=true;$('live').hidden=false;document.body.classList.add('presenting');
  if(!fullscreenAttempted){fullscreenAttempted=true;tryNativeFullscreen();}
}
function validState(data){
  return Number.isSafeInteger(data.version)&&data.version>lastVersion&&
    Number.isInteger(data.index)&&deck&&data.index>=0&&data.index<deck.slides.length&&
    Array.isArray(data.media);
}
function receive(data,uuid){
  if(controller&&uuid!==controller)return;
  if(data.type==='state'){
    if(!validState(data))return;
    controller=uuid;lastSeen=Date.now();lastVersion=data.version;live();
    $('viewer-blackout').hidden=!data.blackout;
    view?.apply(data,Math.max(0,Math.min(2,(Date.now()-Number(data.sentAt||Date.now()))/1000)));
    status('Presentation live.');
    return;
  }
  if(data.type==='ended'){idle();restart(500);}
}
function restart(delay=1500){clearTimeout(retryTimer);retryTimer=setTimeout(connect,delay);}
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
  // QR/text fitting must not hold up the independent PPT download.
  fitAll($('idle'));
  drawQR($('controller-qr'),controllerURL()).catch(()=>{
    $('controller-qr').textContent='Open controller';
    status('QR unavailable. The controller link still works.');
  });
  try{
    deck=await loadPublishedDeck();
    const first=deck.slides?.[0]?.layers?.find(layer=>layer.kind==='image');
    if(!first)throw new Error('The first slide has no image.');
    const cover=$('cover');cover.src=first.src;
    cover.decode().then(()=>{
      cover.hidden=false;$('cover-status').hidden=true;
      cover.closest('figure').setAttribute('aria-busy','false');
    }).catch(()=>{
      cover.hidden=true;$('cover-status').textContent='Preview unavailable.';
      cover.closest('figure').setAttribute('aria-busy','false');
    });
    view=createView($('viewer-stage'),deck);
    view.setInteractive(false);view.show(0);
  }catch(error){
    $('cover-status').textContent='Presentation could not load. Reload to retry.';
    $('cover').closest('figure').setAttribute('aria-busy','false');
    status(error.message);
    return;
  }
  idle();connect();
  setInterval(()=>{
    if(channel&&controller)channel.send({type:'ping'},controller);
    if(lastSeen&&Date.now()-lastSeen>15000){idle();restart(200);}
  },3000);
}
window.addEventListener('pagehide',()=>channel?.close());
boot();
