// OFFLINE TEST DOUBLE ONLY. Exercises application handshake, not real WebRTC.
class MockSDK extends EventTarget{
 constructor(){super();this.uuid=crypto.randomUUID();window.__testSDK=this;}
 async connect(){}
 async joinRoom({room}){this.room=room;this.bc=new BroadcastChannel('ra-test-'+room);this.bc.onmessage=({data:m})=>{if(m.target!==this.uuid&&m.target!=='*')return;if(m.kind==='open')this.dispatchEvent(new CustomEvent('dataChannelOpen',{detail:{uuid:m.uuid}}));if(m.kind==='data')this.dispatchEvent(new CustomEvent('dataReceived',{detail:{data:m.data,uuid:m.uuid}}));};}
 async announce({streamID}){localStorage.setItem('ra-test-'+this.room+'-'+streamID,this.uuid);}
 async view(streamID){this.peer=localStorage.getItem('ra-test-'+this.room+'-'+streamID);setTimeout(()=>{this.bc.postMessage({kind:'open',uuid:this.uuid,target:this.peer});this.dispatchEvent(new CustomEvent('dataChannelOpen',{detail:{uuid:this.peer}}));},20);}
 sendData(data,target){this.bc.postMessage({kind:'data',uuid:this.uuid,target:target||this.peer||'*',data});}
 async disconnect(){this.bc?.close();}
}
window.VDONinjaSDK=MockSDK;
