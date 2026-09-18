// Geometry comes from CSS. Pretext selects type size without resizing the box.
const URL='https://cdn.jsdelivr.net/npm/@chenglou/pretext@0.0.9/dist/layout.js';
let engine;
const cache=new Map();
export const ready=import(URL).then(module=>{engine=module;document.documentElement.dataset.pretext='ready';return document.fonts.ready;}).catch(error=>{document.documentElement.dataset.pretext='unavailable';console.warn('Pretext unavailable; bounded DOM fitting fallback is active.',error.message);});
function prepared(text,font,spacing){const key=JSON.stringify([text,font,spacing]);if(!cache.has(key)){if(cache.size>512)cache.clear();cache.set(key,engine.prepareWithSegments(text,font,{whiteSpace:'pre-wrap',letterSpacing:spacing}));}return cache.get(key);}
export function fitBox(box){
 if(!box?.isConnected)return;
 const child=box.firstElementChild;if(!child)return;
 const text=box.dataset.fitText??child.textContent;box.dataset.fitText=text;
 const style=getComputedStyle(box),w=box.clientWidth-2,h=box.clientHeight-2;if(w<4||h<4)return;
 const min=Number(box.dataset.fitMin||12),max=Number(box.dataset.fitMax||parseFloat(style.fontSize)||20),ratio=Number(box.dataset.fitLine||1.3);
 const spacing=parseFloat(style.letterSpacing)||0,single=box.hasAttribute('data-fit-single');
 const font=size=>`${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`;
 function fits(value,size){if(!engine){child.textContent=value;child.style.fontSize=`${size}px`;child.style.lineHeight=String(ratio);return child.scrollWidth<=w+2&&child.scrollHeight<=h+2;}const p=prepared(value,font(size),spacing);const stats=engine.measureLineStats(p,w);return (single?engine.measureNaturalWidth(p)<=w:stats.maxLineWidth<=w)&&stats.lineCount*size*ratio<=h;}
 let low=min,high=max,best=min;
 while(low<=high){const n=Math.floor((low+high)/2);if(fits(text,n)){best=n;low=n+1;}else high=n-1;}
 let shown=text;
 if(!fits(text,best)){
  const graphemes=Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text),x=>x.segment);let left=0,right=graphemes.length;
  while(left<right){const n=Math.ceil((left+right)/2);if(fits(graphemes.slice(0,n).join('')+'…',best))left=n;else right=n-1;}
  shown=graphemes.slice(0,left).join('')+'…';box.title=text;box.setAttribute('aria-label',text);
 }
 child.textContent=shown;child.style.fontSize=`${best}px`;child.style.lineHeight=String(ratio);
 // One final rendered check catches browser/font differences; no clipping-first guesses.
 if((child.scrollWidth>box.clientWidth+1||child.scrollHeight>box.clientHeight+1)&&best>min){child.style.fontSize=`${best-1}px`;}
 box.dataset.fitted=engine?'pretext':'dom-fallback';box.dataset.truncated=String(shown!==text);
}
export function setFitText(box,text){box.dataset.fitText=String(text);box.firstElementChild.textContent=String(text);fitBox(box);}
const observed=new WeakSet(),observer=new ResizeObserver(entries=>entries.forEach(e=>fitBox(e.target)));
export async function fitAll(root=document){await ready;root.querySelectorAll('[data-fit]').forEach(box=>{if(!observed.has(box)){observer.observe(box);observed.add(box);}fitBox(box);});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>fitAll());else fitAll();
document.fonts.addEventListener?.('loadingdone',()=>fitAll());
