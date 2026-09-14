import type {Fragment,Snapshot,Block} from './story-engine';
export type Catalog={chapter:{fragments:Fragment[]};characters:{id:string;name:string;expressions:{name:string;assetPath:string}[]}[];scenes:{id:string;layers:{assetPath:string}[]}[];voices:Record<string,string>;transitions:Record<string,string>;assets:Record<string,string>};
export let catalog:Catalog;
const spriteCache=new Map<string,string>();
async function prepareKeyedSprite(id:string,url:string){const im=new Image();im.src=url;await im.decode();const canvas=document.createElement('canvas');canvas.width=im.width;canvas.height=im.height;const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(im,0,0);const frame=ctx.getImageData(0,0,canvas.width,canvas.height),d=frame.data;for(let i=0;i<d.length;i+=4){const excess=d[i+1]-Math.max(d[i],d[i+2]);if(excess>45&&d[i+1]>105){d[i+3]=Math.round(255*Math.max(0,1-(excess-45)/65));if(d[i+3]>0)d[i+1]=Math.max(d[i],d[i+2]);}}ctx.putImageData(frame,0,0);spriteCache.set(id,canvas.toDataURL('image/png'));}

export const BASE=import.meta.env.BASE_URL;
export async function initialize(){const r=await fetch(BASE+'story.json');if(!r.ok)throw Error('故事数据暂未加载，请刷新重试。');catalog=await r.json();await Promise.all(['innkeeper','waiter'].map(n=>prepareKeyedSprite('char-'+n,BASE+'media/npc-'+n+'.webp').catch(()=>{})));}
export function asset(p:string){if(!p)return '';if(p.startsWith('media/'))return BASE+p;const key=p.startsWith('res://')?p:p.startsWith('generated/')?'res://assets/'+p:'res://assets/migrated/'+p.replace(/^assets\//,'');return catalog?.assets[key]?BASE+catalog.assets[key]:'';}
export const art=(name:string)=>asset('generated/ui/'+name);
export function character(id:string,expression='微笑'){if(spriteCache.has(id))return spriteCache.get(id)!;const c=catalog.characters.find(c=>c.id===id);return asset(c?.expressions.find(e=>e.name===expression)?.assetPath??c?.expressions.find(e=>e.name==='微笑')?.assetPath??c?.expressions[0]?.assetPath??'');}
export const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const $=<T extends HTMLElement=HTMLElement>(s:string,root:ParentNode=document)=>root.querySelector<T>(s)!;
export const bind=(s:string,fn:()=>void,root:ParentNode=document)=>{const e=$(s,root);if(e)e.onclick=fn;};
export function toast(text:string){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.append(t);}t.textContent=text;t.className='show';clearTimeout((window as any)._toast);(window as any)._toast=setTimeout(()=>t.className='',3600);}
export type Note={id:string;title:string;text:string;source:string;kind:'观察'|'证词'|'推断'|'趣闻';question?:string};
export type ExplorationState={done:string[];notes:Note[];collected:Record<string,string[]>;positions:Record<string,{x:number;y:number}>;games:Record<string,number>;session?:string};
export type Save={version:1;at:number;story:Snapshot;bg:string;lastPortrait:string;lastSlot:string;history:{speaker:string;text:string;block:string}[];exploration:ExplorationState;activeExplore?:string;review?:boolean;musicPath?:string};
export type Profile={settings:{speed:number;volume:number;music:number;voice:number;instant:boolean;motion:boolean};seen:string[];visited:string[];unlocked:string[];endings:string[];slots:Record<string,Save>;auto?:Save;reviewAuto?:Save;best:Record<string,number>};
const DEFAULT=():Profile=>({settings:{speed:32,volume:.8,music:.34,voice:1,instant:false,motion:true},seen:[],visited:[],unlocked:[],endings:[],slots:{},best:{}});
export let profile=DEFAULT();
try{const p=JSON.parse(localStorage.getItem('xiqianhua-profile-v1')??'null');if(p&&typeof p==='object'&&Array.isArray(p.visited)&&Array.isArray(p.seen)&&p.slots)profile={...DEFAULT(),...p,settings:{...DEFAULT().settings,...p.settings}};}catch{}
export const emptyExploration=():ExplorationState=>({done:[],notes:[],collected:{},positions:{},games:{}});
export function persist(){try{localStorage.setItem('xiqianhua-profile-v1',JSON.stringify(profile));return true;}catch{toast('浏览器未能保存，请导出存档留存。');return false;}}
export function download(name:string,content:string,type='application/json'){const u=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),5000);}
export function speaker(b:Block){return b.type==='narration'?((b.content??[]).some(c=>c.text?.includes('我'))?'华浅 · 自白':'旁白'):b.type==='floatingText'?'卷末题记':b.props.characterName??'旁白';}
export const audio={music:new Audio(),voice:new Audio(),ambient:new Audio(),effect:new Audio()};
let bgmPath='',musicSource='';
export function currentMusic(){return musicSource;}
export function restoreMusic(path:string){if(!path){audio.music.pause();bgmPath='';musicSource='';return;}playMusic(path);}
export function syncAudio(){audio.music.volume=profile.settings.volume*profile.settings.music;audio.voice.volume=profile.settings.volume*profile.settings.voice;audio.ambient.volume=profile.settings.volume*.16;audio.effect.volume=profile.settings.volume*.36;}
export function playMusic(path:string){const url=asset(path);if(!url)return;if(url===bgmPath){if(audio.music.paused)audio.music.play().catch(()=>{});return;}bgmPath=url;musicSource=path;audio.music.src=url;audio.music.loop=true;syncAudio();audio.music.play().catch(()=>{});}
export function stopVoice(){audio.voice.pause();audio.voice.removeAttribute('src');}
export function playVoice(b:Block){stopVoice();const path=catalog.voices[b.id];if(!path||b.type!=='dialogue')return;audio.voice.src=asset(path);syncAudio();audio.voice.play().catch(()=>{});}
export function playSound(b:Block){const p=b.props; if(p.soundType==='BGM'){if(p.action==='stop'||!p.uri){audio.music.pause();bgmPath='';musicSource='';}else playMusic(p.uri);return;}const a=String(p.loop)==='true'?audio.ambient:audio.effect;const u=asset(p.uri??'');if(!u)return;a.src=u;a.loop=String(p.loop)==='true';syncAudio();a.play().catch(()=>{});}
