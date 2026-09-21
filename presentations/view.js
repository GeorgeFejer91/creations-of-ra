// Every browser renders the published PowerPoint locally. Network messages carry state only.
export function createView(stage, deck, onMediaClick = () => {}, onChange = () => {}, onPlaybackBlocked = () => {}) {
  stage.replaceChildren();stage.style.aspectRatio=String(deck.width/deck.height);
  const resize=new ResizeObserver(([entry])=>{
    const ratio=deck.width/deck.height;
    const width=Math.min(entry.contentRect.width,entry.contentRect.height*ratio);
    stage.style.width=`${width}px`;stage.style.height=`${width/ratio}px`;
  });
  resize.observe(stage.parentElement);
  let index=0;
  const media=[],panes=[];
  deck.slides.forEach((slide,n)=>{
    const pane=document.createElement('section');pane.className='slide';pane.hidden=n!==0;
    pane.setAttribute('aria-label',`Slide ${n+1}: ${slide.title}`);
    slide.layers.forEach((layer,j)=>{
      const element=document.createElement(layer.kind==='image'?'img':layer.kind==='audio'?'audio':'video');
      element.className='layer';element.dataset.layer=String(j);element.dataset.slide=String(n);
      ['left','top','width','height'].forEach((key,i)=>{element.style[key]=`${layer.box[i]*100}%`;});
      element.src=layer.src;
      if(layer.kind==='image'){
        element.alt=slide.title;element.draggable=false;element.addEventListener('load',onChange);
      }else{
        element.classList.add('media-layer');element.poster=layer.poster;element.preload='metadata';element.playsInline=true;element.controls=false;
        element.volume=layer.volume??0.8;element.tabIndex=-1;element.setAttribute('aria-label',`Play or pause ${layer.label}`);
        element.addEventListener('click',()=>onMediaClick(j));
        for(const name of ['play','pause','ended','loadedmetadata','volumechange','seeked'])element.addEventListener(name,onChange);
        media.push(element);
      }
      pane.append(element);
    });
    panes.push(pane);stage.append(pane);
  });
  const currentMedia=()=>media.filter(el=>Number(el.dataset.slide)===index);
  function show(next){
    if(!Number.isInteger(next)||next<0||next>=panes.length||next===index)return;
    currentMedia().forEach(el=>el.pause());panes[index].hidden=true;index=next;panes[index].hidden=false;
  }
  return {
    get index(){return index;},media,currentMedia,show,
    setInteractive(value){
      stage.classList.toggle('read-only',!value);
      media.forEach(el=>{el.tabIndex=value?0:-1;el.style.pointerEvents=value?'auto':'none';});
    },
    playback(){
      return currentMedia().map(el=>({
        layer:Number(el.dataset.layer),
        time:el.currentTime,
        duration:Number.isFinite(el.duration)?el.duration:0,
        paused:el.paused,
        muted:el.muted,
        volume:el.volume,
        rate:el.playbackRate
      }));
    },
    apply(state,delay=0){
      show(state.index);
      for(const el of currentMedia()){
        const playback=state.media?.find(item=>item.layer===Number(el.dataset.layer));
        if(!playback||state.blackout){el.pause();continue;}
        el.volume=Math.max(0,Math.min(1,Number.isFinite(playback.volume)?playback.volume:.8));
        el.muted=Boolean(playback.muted);
        const target=Math.max(0,playback.time+(playback.paused?0:delay*(playback.rate||1)));
        if(Number.isFinite(el.duration)&&Math.abs(el.currentTime-target)>(playback.paused?0.06:0.35))el.currentTime=Math.min(el.duration,target);
        el.playbackRate=playback.rate||1;
        if(playback.paused)el.pause();
        else if(el.paused)el.play().catch(()=>{
          const wantedAudio=!el.muted;
          el.muted=true;el.play().catch(()=>{});
          if(wantedAudio)onPlaybackBlocked();
        });
      }
    },
    dispose(){resize.disconnect();media.forEach(el=>el.pause());stage.replaceChildren();}
  };
}
