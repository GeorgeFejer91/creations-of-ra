import {loadPublishedDeck} from './deck.js?v=localdeck7';
import {createView} from './view.js?v=localdeck7';
import {connectController} from './transport.js?v=min6';

const $=id=>document.getElementById(id);
let deck,view,channel,version=0,blackout=false,finished=false,heartbeat;
const status=text=>$('controller-status').textContent=text;

function activeMedia(){return view?.currentMedia()?.[0]||null;}
function state(){
  return {
    type:'state',
    version:++version,
    sentAt:Date.now(),
    index:view?.index||0,
    count:deck?.slides.length||0,
    title:deck?.slides?.[view?.index||0]?.title||'Beyond the Line',
    blackout,
    media:view?.playback?.()||[]
  };
}
function broadcast(target){if(channel&&!finished)channel.send(state(),target);}
function refresh(){
  if(!view||!deck)return;
  $('controller-count').textContent=`${view.index+1} / ${deck.slides.length}`;
  $('controller-title').textContent=deck.slides[view.index].title;
  const media=activeMedia();
  $('controller-play').disabled=!media;
  $('controller-play').textContent=media&&!media.paused?'Pause video':'Play video';
  $('controller-seek').disabled=!media||!Number.isFinite(media.duration);
  if(media&&Number.isFinite(media.duration)&&media.duration>0)$('controller-seek').value=String(Math.round(media.currentTime/media.duration*1000));
}
async function act(action){
  if(!view||finished)return;
  const media=activeMedia();
  if(action==='prev')view.show(Math.max(0,view.index-1));
  if(action==='next')view.show(Math.min(deck.slides.length-1,view.index+1));
  if(action==='play'&&media){
    media.muted=true;
    try{media.paused?await media.play():media.pause();}catch{}
  }
  if(action==='blackout')blackout=!blackout;
  refresh();broadcast();
}
function receive(data,uuid){
  if(data.type==='hello'){broadcast(uuid);return;}
  if(data.type==='ping')channel?.send({type:'pong'},uuid);
}
async function finish(){
  if(finished)return;finished=true;clearInterval(heartbeat);
  try{channel?.send({type:'ended'});}catch{}
  try{await channel?.close();}catch{}
  $('controller-panel').hidden=true;status('Presentation finished.');
  setTimeout(()=>location.replace('/presentations/'),600);
}
async function boot(){
  try{
    deck=await loadPublishedDeck();
    view=createView($('controller-stage'),deck,()=>{},()=>{refresh();broadcast();});
    view.setInteractive(false);
    view.media.forEach(media=>{media.muted=true;});
    refresh();
    channel=await connectController(receive,(event,uuid)=>{if(event==='open'&&uuid)setTimeout(()=>broadcast(uuid),0);});
    $('controller-panel').hidden=false;status('You control the presentation.');broadcast();
    heartbeat=setInterval(()=>broadcast(),700);
  }catch(error){status(error.message);return;}
  document.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>act(button.dataset.action));
  $('controller-seek').onchange=e=>{
    const media=activeMedia();
    if(media&&Number.isFinite(media.duration))media.currentTime=Number(e.target.value)/1000*media.duration;
    refresh();broadcast();
  };
  $('finish-presentation').onclick=finish;
}
window.addEventListener('pagehide',()=>{
  if(!finished){try{channel?.send({type:'ended'});}catch{}channel?.close();}
});
boot();