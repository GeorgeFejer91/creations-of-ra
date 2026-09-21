import {fitAll} from '/assets/js/fit.js';
import {loadPublishedDeck} from './deck.js?v=control9';
import {createView} from './view.js?v=control8';
import {connectViewer,controllerURL,drawQR} from './transport.js?v=min6';

const $=id=>document.getElementById(id);
const mirror=new URLSearchParams(location.search).get('mirror')==='1';
const mirrorWindows=new Map();
let deck,view,channel,controller=null,lastSeen=0,lastVersion=-1,retryTimer,desiredFullscreen=null,screenDetails;
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
  $('viewer-blackout').hidden=true;controller=null;lastSeen=0;lastVersion=-1;desiredFullscreen=null;
  showFullscreenFallback(false);
  if(view){view.show(0);view.currentMedia().forEach(media=>media.pause());}
  leaveNativeFullscreen();
  status('Waiting for controller.');
}
function live(){
  $('idle').hidden=true;$('live').hidden=false;document.body.classList.add('presenting');
}
function validState(data){
  return Number.isSafeInteger(data.version)&&data.version>lastVersion&&
    Number.isInteger(data.index)&&deck&&data.index>=0&&data.index<deck.slides.length&&
    Array.isArray(data.media)&&(data.fullscreen===undefined||typeof data.fullscreen==='boolean');
}
function receive(data,uuid){
  if(controller&&uuid!==controller)return;
  if(data.type==='state'){
    if(!validState(data))return;
    controller=uuid;lastSeen=Date.now();lastVersion=data.version;live();
    $('viewer-blackout').hidden=!data.blackout;
    applyFullscreen(data.fullscreen!==false);
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
  $('viewer-fullscreen').onclick=tryNativeFullscreen;
  document.addEventListener('fullscreenchange',()=>showFullscreenFallback(Boolean(desiredFullscreen&&!document.fullscreenElement)));
  document.querySelectorAll('[data-open-displays]').forEach(button=>button.onclick=activateDisplays);
  setupDisplays();
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
