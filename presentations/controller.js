import {fitAll,setFitText} from '/assets/js/fit.js';
import {connect,readInvite} from './transport.js';
const $=id=>document.getElementById(id);
let invite,channel=null,host=null,approved=false,seq=0,lastSeen=0,version=0,name='',requesting=false;
const status=text=>setFitText($('remote-status'),text);
function enable(value){approved=value;$('remote-panel').querySelectorAll('button,input').forEach(el=>el.disabled=!value);}
function send(action,extra={}){if(approved&&host&&channel)channel.send({type:'command',action,seq:++seq,...extra},host);}
function hello(){if(channel&&!approved&&requesting)channel.send({type:'hello',name},host||undefined);}
function receive(data,uuid){
 if(host&&uuid!==host)return;
 if(!host)host=uuid;lastSeen=Date.now();
 if(data.type==='approved'){requesting=false;enable(true);$('join-form').hidden=true;$('remote-panel').hidden=false;status(`${name}, you control this display.`);fitAll($('remote-panel'));return;}
 if(data.type==='denied'||data.type==='revoked'){requesting=false;enable(false);status(data.reason||'The display ended your control. Request access again.');$('join-form').hidden=false;$('join').disabled=false;return;}
 if(data.type==='notice'){status(String(data.text).slice(0,200));return;}
 if(data.type!=='state'||!approved||!Number.isSafeInteger(data.version)||data.version<version)return;
 version=data.version;
 if(typeof data.preview==='string'&&data.preview.startsWith('data:image/jpeg;base64,')&&data.preview.length<55000)$('preview-image').src=data.preview;
 $('remote-counter').textContent=`${data.index+1} / ${data.count}`;setFitText($('remote-title'),String(data.title));$('remote-seek').value=String(Math.round((data.position||0)*1000));$('remote-seek').disabled=!data.media?.length;$('remote-play').disabled=!data.media?.length;$('remote-play').textContent=data.playing?'Pause media':'Play media';
 $('hotspots').replaceChildren();for(const m of (data.media||[]).slice(0,10)){if(!Array.isArray(m.box)||m.box.length!==4||!m.box.every(Number.isFinite))continue;const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Play or pause ${String(m.label).slice(0,100)}`);['left','top','width','height'].forEach((k,i)=>button.style[k]=`${m.box[i]*100}%`);button.addEventListener('click',()=>send('media',{layer:m.layer}));$('hotspots').append(button);}
 $('remote-panel').querySelector('[data-command="prev"]').disabled=data.index===0;$('remote-panel').querySelector('[data-command="next"]').disabled=data.index===data.count-1;
}
try{invite=readInvite();}catch(error){status(error.message);$('join').disabled=true;}
$('join-form').addEventListener('submit',async event=>{
 event.preventDefault();if(!invite)return;name=$('name').value.trim().slice(0,40);if(!name)return;requesting=true;$('join').disabled=true;status('Connecting. Approve your name on the display.');
 try{await channel?.close();host=null;version=0;seq=0;enable(false);channel=await connect(invite,'controller',receive,(state,uuid)=>{if(state==='open'){host=uuid||host;lastSeen=Date.now();hello();}else{enable(false);status('Connection lost. Request access again.');$('join-form').hidden=false;$('join').disabled=false;}});hello();}
 catch(error){requesting=false;status(error.message);$('join').disabled=false;}
});
$('remote-panel').querySelectorAll('[data-command]').forEach(button=>button.addEventListener('click',()=>send(button.dataset.command)));
$('remote-seek').addEventListener('change',event=>send('seek',{value:Number(event.target.value)/1000}));
$('leave').addEventListener('click',async()=>{requesting=false;channel?.send({type:'leave'},host);enable(false);await channel?.close();channel=null;$('remote-panel').hidden=true;$('join-form').hidden=false;$('join').disabled=false;status('You have left the presentation.');});
setInterval(()=>{if(!channel)return;if(approved){channel.send({type:'ping'},host);if(Date.now()-lastSeen>15000){enable(false);status('The display is offline. Reopen a fresh invitation.');$('join-form').hidden=false;$('join').disabled=false;}}else hello();},3000);
window.addEventListener('pagehide',()=>{channel?.send({type:'leave'},host);channel?.close();});
