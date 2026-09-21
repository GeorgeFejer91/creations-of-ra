import {fitAll} from '/assets/js/fit.js';
import {loadPublishedDeck} from './deck.js?v=control9';
import {createView} from './view.js?v=control9';
import {connectViewer,controllerURL,drawQR,PROTOCOL,PROTOCOL_VERSION} from './transport.js?v=min7';

const $=id=>document.getElementById(id);
const mirror=new URLSearchParams(location.search).get('mirror')==='1';
const mirrorWindows=new Map();
const viewerId=crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
let deck,view,channel,controller=null,candidate=null,sessionId=null,lastSeen=0,lastSequence=-1,lastAcknowledgedRevision=-1,lastAcknowledgedAt=0,pendingState,currentState,retryTimer,desiredFullscreen=null,screenDetails;
const status=text=>$('presentation-status').textContent=text;

function refreshViewerActions(){
  const actions=$('viewer-actions');
  actions.hidden=[...actions.querySelectorAll('.viewer-action')].every(button=>button.hidden);
  $('live').classList.toggle('needs-action',!actions.hidden);
}
function showFullscreenFallback(show){
  $('viewer-fullscreen').hidden=!show;
  refreshViewerActions();
}
function showAudioFallback(show){
  $('viewer-audio').hidden=!show;
  refreshViewerActions();
}
async function enableAudio(){
  if(!view||!currentState){showAudioFallback(false);return;}
  let blocked=false;
  for(const media of view.currentMedia()){
    const playback=currentState.media?.find(item=>item.layer===Number(media.dataset.layer));
    if(!playback||playback.paused)continue;
    media.volume=playback.volume;media.muted=playback.muted;
    try{await media.play();}catch{blocked=true;}
  }
  showAudioFallback(blocked);
}
async function leaveNativeFullscreen(){
  if(document.fullscreenElement)try{await document.exitFullscreen();}catch{}
}
async function tryNativeFullscreen(){
  if(!desiredFullscreen||document.fullscreenElement){showFullscreenFallback(false);return;}
  try{
    await document.documentElement.requestFullscreen({navigationUI:'hide'});
    showFullscreenFallback(false);
  }catch{
    showFullscreenFallback(true);
    status('Presentation live. Select Enter full screen on this display.');
  }
}
function applyFullscreen(enabled){
  if(desiredFullscreen===enabled)return;
  desiredFullscreen=enabled;
  if(enabled)tryNativeFullscreen();
  else{showFullscreenFallback(false);leaveNativeFullscreen();}
}
function showDisplayButtons(show,label='Open connected displays'){
  document.querySelectorAll('[data-open-displays]').forEach(button=>{
    button.hidden=!show;button.textContent=label;
  });
  refreshViewerActions();
}
function sameScreen(a,b){
  if(!a||!b)return false;
  return ['left','top','width','height'].every(key=>Number(a[key])===Number(b[key]));
}
function displayTargets(details){
  return [...details.screens].filter(candidate=>candidate!==details.currentScreen&&!sameScreen(candidate,details.currentScreen));
}
function placeWindow(child,target){
  try{child.moveTo(target.availLeft,target.availTop);child.resizeTo(target.availWidth,target.availHeight);}catch{}
}
function openDisplayWindows(details){
  const targets=displayTargets(details);
  let blocked=0;
  targets.forEach((target,index)=>{
    let child=mirrorWindows.get(index);
    if(!child||child.closed){
      const url=new URL('/presentations/',location.href);
      url.searchParams.set('mirror','1');url.searchParams.set('display',String(index+1));
      const features=`popup=yes,left=${target.availLeft},top=${target.availTop},width=${target.availWidth},height=${target.availHeight}`;
      child=window.open(url,`ra-presentation-display-${index+1}`,features);
      if(child)mirrorWindows.set(index,child);else blocked++;
    }
    if(child)placeWindow(child,target);
  });
  for(const [index,child] of mirrorWindows){
    if(index<targets.length)continue;
    try{child.close();}catch{}
    mirrorWindows.delete(index);
  }
  return {total:targets.length,opened:targets.length-blocked,blocked};
}
function reportDisplays(result){
  if(!result.total){showDisplayButtons(false);status('No additional display detected.');return;}
  if(result.blocked){
    const label=result.opened?'Open remaining display':'Open connected displays';
    showDisplayButtons(true,label);
    status('The browser blocked a display window. Select the display button again or allow pop-ups for this site.');
    return;
  }
  try{localStorage.setItem('ra-open-connected-displays','1');}catch{}
  showDisplayButtons(false);
  status(`${result.total} connected display${result.total===1?'':'s'} opened and synchronized.`);
}
function watchScreens(details){
  if(screenDetails===details)return;
  screenDetails=details;
  details.addEventListener('screenschange',()=>reportDisplays(openDisplayWindows(details)));
}
async function activateDisplays(){
  const buttons=[...document.querySelectorAll('[data-open-displays]')];
  buttons.forEach(button=>button.disabled=true);
  status('Checking connected displays…');
  try{
    const details=await window.getScreenDetails();
    watchScreens(details);reportDisplays(openDisplayWindows(details));
  }catch{
    showDisplayButtons(true,'Try connected displays again');
    status('Connected-display permission was not granted.');
  }finally{buttons.forEach(button=>button.disabled=false);}
}
async function setupDisplays(){
  if(mirror||!('getScreenDetails' in window))return;
  const reveal=()=>showDisplayButtons(window.screen.isExtended===true);
  window.screen.addEventListener?.('change',reveal);reveal();
  try{
    const permission=await navigator.permissions?.query({name:'window-management'});
    if(permission?.state!=='granted')return;
    const details=await window.getScreenDetails();watchScreens(details);
    let optedIn=false;try{optedIn=localStorage.getItem('ra-open-connected-displays')==='1';}catch{}
    if(optedIn)reportDisplays(openDisplayWindows(details));
    else showDisplayButtons(displayTargets(details).length>0);
  }catch{}
}
function idle(){
  $('idle').hidden=false;$('live').hidden=true;document.body.classList.remove('presenting');
  $('viewer-blackout').hidden=true;controller=null;candidate=null;sessionId=null;lastSeen=0;lastSequence=-1;lastAcknowledgedRevision=-1;lastAcknowledgedAt=0;pendingState=null;currentState=null;desiredFullscreen=null;
  showFullscreenFallback(false);
  showAudioFallback(false);
  if(view){view.show(0);view.currentMedia().forEach(media=>media.pause());}
  leaveNativeFullscreen();
  status('Waiting for controller.');
}
function live(){
  $('idle').hidden=true;$('live').hidden=false;document.body.classList.add('presenting');
}
function validState(data){
  try{if(JSON.stringify(data).length>16384)return false;}catch{return false;}
  if(data.protocol!==PROTOCOL||data.protocolVersion!==PROTOCOL_VERSION||data.type!=='state')return false;
  if(typeof data.sessionId!=='string'||data.sessionId.length<16||data.sessionId.length>80)return false;
  if(!Number.isSafeInteger(data.sequence)||data.sequence<1||!Number.isSafeInteger(data.revision)||data.revision<0)return false;
  if(!Number.isInteger(data.index)||data.index<0||!Number.isInteger(data.count)||data.count<1||data.count>500||data.index>=data.count)return false;
  if(!Array.isArray(data.media)||data.media.length>32||!data.media.every(item=>
    Number.isInteger(item?.layer)&&item.layer>=0&&item.layer<500&&Number.isFinite(item.time)&&item.time>=0&&
    typeof item.paused==='boolean'&&typeof item.muted==='boolean'&&Number.isFinite(item.volume)&&item.volume>=0&&item.volume<=1&&
    Number.isFinite(item.rate)&&item.rate>=.25&&item.rate<=4))return false;
  if(typeof data.blackout!=='boolean'||typeof data.fullscreen!=='boolean')return false;
  if(sessionId&&data.sessionId===sessionId&&data.sequence<=lastSequence)return false;
  if(sessionId&&data.sessionId!==sessionId&&controller)return false;
  return true;
}
function applyState(data){
  pendingState=data;currentState=data;
  if(!view||!deck)return;
  if(data.count!==deck.slides.length||data.index>=deck.slides.length){status('Controller and presentation files do not match. Reload this page.');return;}
  pendingState=null;
  $('viewer-blackout').hidden=!data.blackout;
  if(!data.media.some(item=>!item.paused&&!item.muted&&item.volume>0))showAudioFallback(false);
  view.apply(data,Math.max(0,Math.min(2,(Date.now()-Number(data.sentAt||Date.now()))/1000)));
  if(data.revision>lastAcknowledgedRevision||Date.now()-lastAcknowledgedAt>4000){
    lastAcknowledgedRevision=data.revision;
    lastAcknowledgedAt=Date.now();
    channel?.send({type:'applied',protocol:PROTOCOL,protocolVersion:PROTOCOL_VERSION,sessionId,sequence:data.sequence,revision:data.revision,index:data.index,viewerId},controller);
  }
}
function receive(data,uuid){
  if(controller&&uuid!==controller)return;
  if(data.type==='state'){
    if(!validState(data))return;
    if(sessionId!==data.sessionId){sessionId=data.sessionId;lastSequence=-1;lastAcknowledgedRevision=-1;lastAcknowledgedAt=0;}
    controller=uuid;candidate=uuid;lastSeen=Date.now();lastSequence=data.sequence;live();
    applyFullscreen(data.fullscreen!==false);
    applyState(data);
    status('Presentation live.');
    return;
  }
  if(data.type==='ended'&&data.protocol===PROTOCOL&&data.protocolVersion===PROTOCOL_VERSION&&data.sessionId===sessionId){idle();restart(500);}
}
function restart(delay=1500){clearTimeout(retryTimer);retryTimer=setTimeout(connect,delay);}
async function connect(){
  try{await channel?.close();}catch{}
  channel=null;controller=null;candidate=null;
  try{
    channel=await connectViewer(receive,(event,uuid)=>{
      if(event==='open'&&uuid){candidate=uuid;setTimeout(()=>channel?.send({type:'hello',protocol:PROTOCOL,protocolVersion:PROTOCOL_VERSION,viewerId},uuid),0);}
      if(event==='closed'&&(!uuid||uuid===controller||uuid===candidate)){
        controller=null;candidate=null;status(lastSeen?'Presentation connection interrupted. Reconnecting…':'Waiting for controller.');restart(250);
      }
    });
  }catch{status(lastSeen?'Presentation connection interrupted. Reconnecting…':'Waiting for controller.');restart(1800);}
}
async function boot(){
  // QR/text fitting must not hold up the independent PPT download.
  fitAll($('idle'));
  $('viewer-fullscreen').onclick=tryNativeFullscreen;
  $('viewer-audio').onclick=enableAudio;
  document.addEventListener('fullscreenchange',()=>showFullscreenFallback(Boolean(desiredFullscreen&&!document.fullscreenElement)));
  document.querySelectorAll('[data-open-displays]').forEach(button=>button.onclick=activateDisplays);
  setupDisplays();
  drawQR($('controller-qr'),controllerURL()).catch(()=>{
    $('controller-qr').textContent='Open controller';
    status('QR unavailable. The controller link still works.');
  });
  idle();connect();
  setInterval(()=>{
    if(channel&&controller)channel.send({type:'ping',protocol:PROTOCOL,protocolVersion:PROTOCOL_VERSION,sessionId,viewerId},controller);
    if(lastSeen&&Date.now()-lastSeen>15000){idle();restart(200);}
  },3000);
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
    view=createView($('viewer-stage'),deck,undefined,undefined,()=>showAudioFallback(true));
    view.setInteractive(false);
    if(pendingState)applyState(pendingState);else view.show(0);
  }catch(error){
    $('cover-status').textContent='Presentation could not load. Reload to retry.';
    $('cover').closest('figure').setAttribute('aria-busy','false');
    status(error.message);
    return;
  }
}
window.addEventListener('pagehide',()=>channel?.close());
boot();
