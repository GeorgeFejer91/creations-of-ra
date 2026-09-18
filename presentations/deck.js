// This importer targets the supplied image-and-video PowerPoint, not arbitrary Office files.
export const SLIDE_TITLES=['Beyond the Line','Why this matters to me','What happens when a border is drawn?','Rabia Saleemi','Joseph Potts','Haaji Ka Halva','How I work with people','Holding the space','Community co-creation','Meta Art','No one','One person','Two people','Connection requires both people','How it comes together','What remains?'];
const NS={p:'http://schemas.openxmlformats.org/presentationml/2006/main',a:'http://schemas.openxmlformats.org/drawingml/2006/main',r:'http://schemas.openxmlformats.org/officeDocument/2006/relationships'};
const all=(el,ns,tag)=>Array.from(el.getElementsByTagNameNS(ns,tag));
const first=(el,ns,tag)=>all(el,ns,tag)[0];
const rid=(el,attr='embed')=>el?.getAttributeNS(NS.r,attr);
function xml(bytes){const doc=new DOMParser().parseFromString(new TextDecoder().decode(bytes),'application/xml');if(doc.querySelector('parsererror'))throw new Error('The PowerPoint contains unreadable XML.');return doc;}
function resolve(base,target){const parts=(base+'/'+target).split('/'),out=[];for(const p of parts){if(p==='..')out.pop();else if(p&&p!=='.')out.push(p);}return out.join('/');}
export async function importPowerPoint(buffer){
 if(buffer.byteLength>100*1024*1024)throw new Error('This presentation exceeds the 100 MB import limit.');
 const {unzipSync}=await import('https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js');
 let expanded=0;
 const files=unzipSync(new Uint8Array(buffer),{filter(entry){expanded+=entry.originalSize||0;if(expanded>180*1024*1024)throw new Error('Expanded presentation exceeds the import limit.');return entry.name.startsWith('ppt/');}});
 function read(path){if(!files[path])throw new Error(`Missing presentation part: ${path}`);return xml(files[path]);}
 function relationships(path){const result={};const bytes=files[path];if(!bytes)return result;for(const n of Array.from(xml(bytes).getElementsByTagName('Relationship'))){if(n.getAttribute('TargetMode')!=='External')result[n.getAttribute('Id')]=n.getAttribute('Target');}return result;}
 const presentation=read('ppt/presentation.xml'),size=first(presentation,NS.p,'sldSz');
 const width=Number(size?.getAttribute('cx')),height=Number(size?.getAttribute('cy'));if(!width||!height)throw new Error('Missing slide dimensions.');
 const rels=relationships('ppt/_rels/presentation.xml.rels'),urls=new Map();
 function asset(part){if(!part?.startsWith('ppt/media/')||!files[part])throw new Error('An embedded image or video is missing.');if(!urls.has(part)){const ext=part.split('.').pop().toLowerCase();const types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',svg:'image/svg+xml',mp4:'video/mp4',m4a:'audio/mp4',mp3:'audio/mpeg',wav:'audio/wav'};if(!types[ext])throw new Error(`Unsupported embedded media: ${ext}`);urls.set(part,URL.createObjectURL(new Blob([files[part]],{type:types[ext]})));}return urls.get(part);}
 const slides=[];
 try{
 for(const [index,id] of all(presentation,NS.p,'sldId').entries()){
  const slidePath=resolve('ppt',rels[rid(id,'id')]);const doc=read(slidePath);const filename=slidePath.split('/').pop(),base=slidePath.slice(0,slidePath.lastIndexOf('/'));
  const slideRels=relationships(`${base}/_rels/${filename}.rels`),layers=[];
  for(const pic of all(doc,NS.p,'pic')){
   const transform=first(pic,NS.a,'xfrm'),offset=transform&&first(transform,NS.a,'off'),extent=transform&&first(transform,NS.a,'ext');if(!offset||!extent)continue;
   const box=[Number(offset.getAttribute('x'))/width,Number(offset.getAttribute('y'))/height,Number(extent.getAttribute('cx'))/width,Number(extent.getAttribute('cy'))/height];
   if(!box.every(Number.isFinite))throw new Error('Invalid slide coordinates.');
   const image=first(pic,NS.a,'blip'),video=first(pic,NS.a,'videoFile'),audio=first(pic,NS.a,'audioFile');
   const poster=asset(resolve(base,slideRels[rid(image)]));const media=video||audio;const props=first(pic,NS.p,'cNvPr');
   const layer={kind:media?(audio?'audio':'video'):'image',src:media?asset(resolve(base,slideRels[rid(media,'link')])):poster,poster,box,label:props?.getAttribute('name')||`Slide ${index+1}`,volume:.8};
   layers.push(layer);
  }
  if(!layers.length)throw new Error(`Slide ${index+1} has no supported image/video layers.`);
  slides.push({title:SLIDE_TITLES[index]||`Slide ${index+1}`,layers});
 }
 if(!slides.length||slides.length>100)throw new Error('Unsupported slide count.');
 return {title:'Beyond the Line',width,height,slides,dispose:()=>urls.forEach(URL.revokeObjectURL)};
 }catch(error){urls.forEach(URL.revokeObjectURL);throw error;}
}
// The owner-supplied canonical PPTX is tried first, so an older manifest cannot mask it.
export const MAIN_PPTX = '/assets/Beyond_the_Line_Rabia_Saleemi.pptx';
let publishedDeck;
export function loadPublishedDeck() {
 if (!publishedDeck) publishedDeck = load().catch(error => { publishedDeck = null; throw error; });
 return publishedDeck;
}
async function load() {
 const candidates = [MAIN_PPTX, '/assets/beyond-the-line/deck.json', '/assets/beyond-the-line.pptx'];
 for (const path of candidates) {
  const response = await fetch(path, {cache:'no-cache'});
  if (response.status === 404) continue;
  if (!response.ok) throw new Error(`Presentation download failed (${response.status}). Please retry.`);
  if (path.endsWith('.json')) {
   const deck = await response.json();
   if (!Array.isArray(deck.slides) || !deck.slides.length || !deck.width || !deck.height) throw new Error('Invalid published presentation manifest.');
   deck.source = 'published'; return deck;
  }
  const bytes = await response.arrayBuffer();
  const deck = await importPowerPoint(bytes);
  deck.source = 'published';
  deck.sourceSha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2,'0')).join('');
  return deck;
 }
 throw new Error('The preloaded PowerPoint is not published yet. Open the supplied file locally, or publish assets/Beyond_the_Line_Rabia_Saleemi.pptx.');
}
