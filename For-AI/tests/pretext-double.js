// OFFLINE TEST DOUBLE ONLY. Production imports the real pinned Pretext package.
const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
export function prepareWithSegments(text,font,options={}){return {text,font,spacing:options.letterSpacing||0};}
function measure(p,s){ctx.font=p.font;return ctx.measureText(s).width+Math.max(0,Array.from(s).length-1)*p.spacing;}
export function measureNaturalWidth(p){return Math.max(...p.text.split('\n').map(s=>measure(p,s)));}
export function measureLineStats(p,w){let lines=[];for(const paragraph of p.text.split('\n')){let current='';for(const word of paragraph.split(' ')){const next=current?current+' '+word:word;if(current&&measure(p,next)>w){lines.push(current);current=word;}else current=next;}lines.push(current);}return {lineCount:lines.length,maxLineWidth:Math.max(...lines.map(l=>measure(p,l)))};}
