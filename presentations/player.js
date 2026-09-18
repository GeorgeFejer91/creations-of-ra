import {fitAll,setFitText} from '/assets/js/fit.js';
import {importPowerPoint,loadPublishedDeck} from './deck.js';
import {connect,newInvite,inviteURL,drawQR} from './transport.js';
const $=id=>document.getElementById(id);
const stage=$('stage'),player=$('player');
player.append($('pair-dialog'),$('approve-dialog')); // Dialogs remain reachable in fullscreen.
let deck=null,index=0,panes=[],media=[],channel=null,invite=null,pending=null,approved=null,lastSequence=0,lastSeen=0,lastFrame='',sequence=0;
const message=text=>setFitText($('status'),text);
const currentMedia=()=>media.filter(v=>Number(v.dataset.slide)===index);
const activeMedia=()=>currentMedia()[0];
function position(el,box){['left','top','width','height'].forEach((key,i)=>el.style[key]=`${box[i]*100}%`);}
function installDeck(value){
 media.forEach(v=>v.pause());deck?.dispose?.();deck=value;index=0;media=[];panes=[];stage.replaceChildren();
 stage.style.aspectRatio=String(deck.width/deck.height);$('slide-select').replaceChildren();
 deck.slides.forEach((slide,n)=>{
  const pane=document.createElement('section');pane.className='slide';pane.setAttribute('aria-label',`Slide ${n+1}: ${slide.title}`);pane.hidden=n!==0;
  slide.layers.forEach((layer,j)=>{
   const el=document.createElement(layer.kind==='image'?'img':layer.kind==='audio'?'audio':'video');el.className='layer';position(el,layer.box);el.src=layer.src;
   if(layer.kind==='image'){el.alt=slide.title;el.draggable=false;el.addEventListener('load',()=>{if(index===n)sendState();});}
   else{
    el.classList.add('media-layer');el.poster=layer.poster;el.preload='metadata';el._posterImage=new Image();el._posterImage.src=layer.poster;el.playsInline=true;el.volume=layer.volume??.8;el.dataset.slide=String(n);el.dataset.layer=String(j);el.tabIndex=0;el.setAttribute('aria-label',`Play or pause ${layer.label}`);el.dataset.label=layer.label;
    el.addEventListener('click',()=>toggleMedia(el).catch(()=>{}));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();toggleMedia(el).catch(()=>{});}});
    ['play','pause','ended','loadedmetadata','volumechange'].forEach(evt=>el.addEventListener(evt,()=>{refreshControls();sendState();}));
    el.addEventListener('error',()=>message(`This browser could not play ${layer.label}.`));
    el.addEventListener('timeupdate',()=>{if(!el.paused)refreshControls();});media.push(el);
   }
   pane.append(el);
  });panes.push(pane);stage.append(pane);
  const option=document.createElement('option');option.value=String(n);option.textContent=`${n+1}. ${slide.title}`;$('slide-select').append(option);
 });
 $('loading').hidden=true;$('pair').disabled=false;refreshControls();message(`${deck.slides.length} slides loaded. Use the arrows, or pair a presenter phone.`);sendState();
}
function refreshControls(){
 const count=deck?.slides.length||0,v=activeMedia();$('prev').disabled=!count||index===0;$('next').disabled=!count||index===count-1;$('slide-select').disabled=!count;$('slide-select').value=String(index);$('counter').textContent=`${count?index+1:0} / ${count}`;if(deck)setFitText($('deck-title'),deck.slides[index].title);
 $('play').disabled=!v;$('mute').disabled=!v;$('seek').disabled=!v||!Number.isFinite(v.duration);$('blackout').disabled=!count;
 $('play').textContent=v&&!v.paused?'Pause':'Play media';$('mute').textContent=v&&v.muted?'Sound off':'Sound on';$('seek').value=String(v&&Number.isFinite(v.duration)&&v.duration>0?Math.round(v.currentTime/v.duration*1000):0);
}
function go(n){if(!deck)return;const next=Math.max(0,Math.min(deck.slides.length-1,n));if(next===index)return;currentMedia().forEach(v=>v.pause());panes[index].hidden=true;index=next;panes[index].hidden=false;refreshControls();sendState();}
async function toggleMedia(v=activeMedia()){
 if(!v)return;
 if(!v.paused){v.pause();return;}
 try{await v.play();$('gesture').hidden=true;message('Media playing on this display.');}
 catch(error){$('gesture').hidden=false;message('Click Enable sound on this display once, then use the phone.');throw new Error('The display needs a local click to allow sound.');}
}
async function fullscreen(local=false){
 if(document.fullscreenElement){await document.exitFullscreen();return;}
 if(local){try{await player.requestFullscreen();$('gesture').hidden=true;return;}catch{}}
 player.classList.toggle('cinema');$('gesture').hidden=false;message('Cinema view changed. Native fullscreen needs a click on this display.');
}
async function command(cmd){
 switch(cmd.action){case'prev':go(index-1);break;case'next':go(index+1);break;case'first':go(0);break;case'last':go((deck?.slides.length||1)-1);break;
 case'play':await toggleMedia();break;
 case'media':{const v=currentMedia().find(x=>Number(x.dataset.layer)===cmd.layer);if(v)await toggleMedia(v);break;}
 case'mute':{const v=activeMedia();if(v)v.muted=!v.muted;break;}
 case'seek':{const v=activeMedia();if(v&&Number.isFinite(cmd.value)&&Number.isFinite(v.duration))v.currentTime=Math.max(0,Math.min(1,cmd.value))*v.duration;break;}
 case'blackout':$('blank-screen').hidden=!$('blank-screen').hidden;$('blackout').textContent=$('blank-screen').hidden?'Black screen':'Show slide';break;
 case'fullscreen':await fullscreen(false);break;default:return;
 }refreshControls();sendState();
}
function preview(){
 if(!deck)return '';
 const canvas=document.createElement('canvas');canvas.width=480;canvas.height=Math.round(480*deck.height/deck.width);const ctx=canvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
 if($('blank-screen').hidden){for(const el of panes[index].children){try{
  const layer=deck.slides[index].layers[Number(el.dataset.layer??Array.from(panes[index].children).indexOf(el))],b=layer.box;
  if(el.tagName==='IMG'&&el.complete)ctx.drawImage(el,...[b[0]*canvas.width,b[1]*canvas.height,b[2]*canvas.width,b[3]*canvas.height]);
  else if(el.tagName==='VIDEO'){const source=el.readyState>=2&&el.currentTime>0?el:el._posterImage;if(source&&(!(source instanceof HTMLImageElement)||source.complete))ctx.drawImage(source,b[0]*canvas.width,b[1]*canvas.height,b[2]*canvas.width,b[3]*canvas.height);}
 }catch{}}}
 let data=canvas.toDataURL('image/jpeg',.48);if(data.length>46000)data=canvas.toDataURL('image/jpeg',.25);return data.length<50000?data:'';
}
function sendState(){
 if(!channel||!approved||!deck)return;
 const v=activeMedia();let image='';try{image=preview();}catch{}
 const state={type:'state',version:++sequence,index,count:deck.slides.length,title:deck.slides[index].title,blackout:!$('blank-screen').hidden,fullscreen:!!document.fullscreenElement,media:currentMedia().map(m=>({layer:Number(m.dataset.layer),box:deck.slides[index].layers[Number(m.dataset.layer)].box,playing:!m.paused,label:m.dataset.label})),playing:!!v&&!v.paused,muted:!!v?.muted,position:v&&Number.isFinite(v.duration)&&v.duration? v.currentTime/v.duration:0};
 if(image&&image!==lastFrame){state.preview=image;lastFrame=image;}
 channel.send(state,approved.uuid);
}
function revoke(text='Presenter disconnected.'){
 if(approved)channel?.send({type:'revoked'},approved.uuid);approved=null;pending=null;lastSequence=0;lastFrame='';$('revoke').hidden=true;$('approve-dialog').close();message(text);
}
async function endSession(){revoke();const old=channel;channel=null;invite=null;await old?.close().catch(()=>{});$('pair-dialog').close();$('pair').disabled=!deck;}
function receive(data,uuid){
 if(data.type==='hello'){
  const name=typeof data.name==='string'?data.name.trim().slice(0,40):'';if(!name)return;
  if(approved?.uuid===uuid){lastSeen=Date.now();channel?.send({type:'approved'},uuid);sendState();return;}
  if(approved||pending&&pending.uuid!==uuid){channel?.send({type:'denied',reason:'Another presenter is connected or awaiting approval.'},uuid);return;}
  pending={uuid,name};setFitText($('presenter-name'),name);$('pair-dialog').close();if(!$('approve-dialog').open)$('approve-dialog').showModal();fitAll($('approve-dialog'));return;
 }
 if(uuid!==approved?.uuid)return;
 lastSeen=Date.now();
 if(data.type==='ping'){channel?.send({type:'pong'},uuid);return;}
 if(data.type==='leave'){revoke();return;}
 if(data.type!=='command'||!Number.isSafeInteger(data.seq)||data.seq<=lastSequence)return;
 lastSequence=data.seq;command(data).catch(error=>channel?.send({type:'notice',text:error.message},uuid));
}
$('pair').disabled=true;
$('pair').addEventListener('click',async()=>{
 $('pair').disabled=true;
 try{await endSession();$('pair').disabled=true;invite=newInvite();const url=inviteURL(invite);$('invite-link').value=url;$('pair-dialog').showModal();message('Connecting the presenter session…');await drawQR($('qr'),url);channel=await connect(invite,'host',receive,(state,uuid)=>{if(state==='closed'&&(!uuid||uuid===approved?.uuid))revoke('Presenter connection lost. Pair again.');});message('Scan the QR code with your phone. Approval is required on this display.');}
 catch(error){message(error.message);$('pair-dialog').close();}finally{$('pair').disabled=!deck;}
});
$('approve').addEventListener('click',()=>{if(!pending||!channel)return;approved=pending;pending=null;lastSeen=Date.now();lastSequence=0;lastFrame='';$('approve-dialog').close();$('revoke').hidden=false;channel.send({type:'approved'},approved.uuid);message(`${approved.name} is presenting.`);sendState();});
$('deny').addEventListener('click',()=>{if(pending)channel?.send({type:'denied',reason:'The display declined the request.'},pending.uuid);pending=null;$('approve-dialog').close();});
$('approve-dialog').addEventListener('cancel',()=>{if(pending)channel?.send({type:'denied',reason:'Request dismissed.'},pending.uuid);pending=null;});
$('end-session').addEventListener('click',()=>endSession());$('revoke').addEventListener('click',()=>endSession());
$('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('invite-link').value);$('copy-link').textContent='Copied';setTimeout(()=>$('copy-link').textContent='Copy link',2000);}catch{$('invite-link').select();}});
$('prev').addEventListener('click',()=>go(index-1));$('next').addEventListener('click',()=>go(index+1));$('slide-select').addEventListener('change',e=>go(Number(e.target.value)));
$('play').addEventListener('click',()=>toggleMedia().catch(()=>{}));$('mute').addEventListener('click',()=>command({action:'mute'}));$('blackout').addEventListener('click',()=>command({action:'blackout'}));$('seek').addEventListener('input',e=>command({action:'seek',value:Number(e.target.value)/1000}));
$('fullscreen').addEventListener('click',()=>fullscreen(true));$('gesture').addEventListener('click',()=>{const v=activeMedia();if(v&&v.paused)toggleMedia(v).catch(()=>{});fullscreen(true);});
$('ppt-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;setFitText($('load-message'),'Converting images and videos to browser elements…');try{installDeck(await importPowerPoint(await file.arrayBuffer()));}catch(error){$('loading').hidden=false;setFitText($('load-message'),error.message);message(error.message);}});
window.addEventListener('keydown',event=>{
 if($('pair-dialog').open||$('approve-dialog').open||/INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName))return;
 const key=event.key;if(['ArrowRight','PageDown','ArrowLeft','PageUp','Home','End',' '].includes(key))event.preventDefault();
 if(key==='ArrowRight'||key==='PageDown')go(index+1);if(key==='ArrowLeft'||key==='PageUp')go(index-1);if(key==='Home')go(0);if(key==='End')go((deck?.slides.length||1)-1);if(key===' ')activeMedia()?toggleMedia().catch(()=>{}):go(index+1);if(key.toLowerCase()==='b')command({action:'blackout'});if(key.toLowerCase()==='f')fullscreen(true);if(key==='Escape')player.classList.remove('cinema');
});
setInterval(()=>{if(approved&&Date.now()-lastSeen>15000)revoke('Presenter went offline. Reopen the link and approve again.');else if(approved)sendState();},1000);
window.addEventListener('pagehide',()=>{media.forEach(v=>v.pause());channel?.close();});
loadPublishedDeck().then(installDeck).catch(error=>{setFitText($('load-message'),error.message);message('Presentation player ready. Open the supplied PowerPoint to begin.');});
