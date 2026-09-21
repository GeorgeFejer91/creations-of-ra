import {loadPublishedDeck} from './deck.js?v=control9';
import {createView} from './view.js?v=control9';
import {connectController,isControllerConflict,PROTOCOL,PROTOCOL_VERSION} from './transport.js?v=min7';

const $=id=>document.getElementById(id);
const sessionId=crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
const viewers=new Map();
let deck,view,channel,sequence=0,revision=0,blackout=false,fullscreen=true,finished=false,heartbeat,outputVolume=.8;
const status=text=>$('controller-status').textContent=text;

function activeMedia(){return view?.currentMedia()?.[0]||null;}
function mediaState(){
  return (view?.playback?.()||[]).map(item=>({...item,muted:outputVolume<=0,volume:outputVolume}));
}
function state(){
  return {
    type:'state',
    protocol:PROTOCOL,
    protocolVersion:PROTOCOL_VERSION,
    sessionId,
    sequence:++sequence,
    revision,
    sentAt:Date.now(),
    index:view?.index||0,
    count:deck?.slides.length||0,
    title:deck?.slides?.[view?.index||0]?.title||'Beyond the Line',
    blackout,
    fullscreen,
    media:mediaState()
  };
}
function broadcast(target){if(channel&&view&&deck&&!finished)channel.send(state(),target);}
function connectionStatus(){
  const now=Date.now();
  for(const [uuid,seen] of viewers)if(now-seen>10000)viewers.delete(uuid);
  const count=viewers.size;
  status(count?`${count} presentation screen${count===1?'':'s'} synchronized.`:'You control the presentation. Waiting for presentation screens.');
}
function refresh(){
  if(!view||!deck)return;
  $('controller-count').textContent=`${view.index+1} / ${deck.slides.length}`;
  $('controller-title').textContent=deck.slides[view.index].title;
  const media=activeMedia();
  $('controller-play').disabled=!media;
  $('controller-play').textContent=media&&!media.paused?'Pause video':'Play video';
  $('controller-seek').disabled=!media||!Number.isFinite(media.duration);
  if(media&&Number.isFinite(media.duration)&&media.duration>0)$('controller-seek').value=String(Math.round(media.currentTime/media.duration*1000));
  $('controller-volume').value=String(Math.round(outputVolume*100));
  $('controller-volume-value').value=`${Math.round(outputVolume*100)}%`;
  $('fullscreen-on').disabled=fullscreen;
  $('fullscreen-off').disabled=!fullscreen;
  $('fullscreen-on').setAttribute('aria-pressed',String(fullscreen));
  $('fullscreen-off').setAttribute('aria-pressed',String(!fullscreen));
}
async function toggleMedia(media){
  if(!media||finished)return;
  media.muted=true;
  try{media.paused?await media.play():media.pause();}catch{}
  revision++;refresh();broadcast();
}
async function act(action){
  if(!view||finished)return;
  if(action==='play'){await toggleMedia(activeMedia());return;}
  if(action==='prev')view.show(Math.max(0,view.index-1));
  if(action==='next')view.show(Math.min(deck.slides.length-1,view.index+1));
  if(action==='blackout')blackout=!blackout;
  if(action==='fullscreen-on')fullscreen=true;
  if(action==='fullscreen-off')fullscreen=false;
  revision++;refresh();broadcast();
}
function receive(data,uuid){
  if(data.protocol!==PROTOCOL||data.protocolVersion!==PROTOCOL_VERSION)return;
  if(data.type==='hello'){broadcast(uuid);return;}
  if(data.type==='applied'&&data.sessionId===sessionId&&Number.isSafeInteger(data.sequence)){
    viewers.set(uuid,Date.now());connectionStatus();return;
  }
  if(data.type==='ping'&&data.sessionId===sessionId)channel?.send({type:'pong',protocol:PROTOCOL,protocolVersion:PROTOCOL_VERSION,sessionId},uuid);
}
async function finish(){
  if(finished)return;finished=true;clearInterval(heartbeat);
  try{channel?.send({type:'ended',protocol:PROTOCOL,protocolVersion:PROTOCOL_VERSION,sessionId});}catch{}
  try{await channel?.close();}catch{}
  $('controller-panel').hidden=true;status('Presentation finished.');
  setTimeout(()=>location.replace('/presentations/'),600);
}
async function boot(){
  const redirectToViewer=()=>{
    if(finished)return;finished=true;clearInterval(heartbeat);
    channel?.close().catch(()=>{});location.replace('/presentations/?controller=busy');
  };
  try{
    const deckPromise=loadPublishedDeck();
    channel=await connectController(receive,(event,detail)=>{
      if(event==='open'&&detail)setTimeout(()=>broadcast(detail),0);
      if(event==='closed'&&detail){viewers.delete(detail);connectionStatus();}
      if(event==='error'&&isControllerConflict(detail))redirectToViewer();
    });
    deck=await deckPromise;
    view=createView(
      $('controller-stage'),
      deck,
      layer=>toggleMedia(view?.currentMedia().find(media=>Number(media.dataset.layer)===layer)),
      ()=>{revision++;refresh();broadcast();}
    );
    view.setInteractive(true);
    view.media.forEach(media=>{media.muted=true;media.volume=outputVolume;});
    refresh();
    $('controller-panel').hidden=false;connectionStatus();broadcast();
    heartbeat=setInterval(()=>{broadcast();connectionStatus();},700);
  }catch(error){
    if(error?.code==='controller_in_use'||isControllerConflict(error)){redirectToViewer();return;}
    status(error.message);return;
  }
  document.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>act(button.dataset.action));
  $('controller-seek').oninput=e=>{
    const media=activeMedia();
    if(media&&Number.isFinite(media.duration))media.currentTime=Number(e.target.value)/1000*media.duration;
    revision++;refresh();broadcast();
  };
  $('controller-volume').oninput=e=>{
    outputVolume=Math.max(0,Math.min(1,Number(e.target.value)/100));
    view?.media.forEach(media=>{media.volume=outputVolume;media.muted=true;});
    revision++;refresh();broadcast();
  };
  $('finish-presentation').onclick=finish;
}
window.addEventListener('pagehide',()=>{
  if(!finished){try{channel?.send({type:'ended',protocol:PROTOCOL,protocolVersion:PROTOCOL_VERSION,sessionId});}catch{}channel?.close();}
});
boot();
