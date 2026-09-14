export type Block={id:string;type:string;props:Record<string,any>;content?:{type:string;text?:string}[]};
export type Fragment={id:string;name:string;blocks:Block[]};
export type Choice={text:string;fragmentId:string;condition?:string;effects?:string[]};
export type Snapshot={fragment:string;cursor:number;variables:Record<string,any>;pending:Record<string,string>;current:Block|null};
export class StoryEngine {
 fragments:Map<string,Fragment>;fragment='s1-00-veil';cursor=0;variables:Record<string,any>={};pending:Record<string,string>={};current:Block|null=null;
 constructor(public chapter:{fragments:Fragment[]}){this.fragments=new Map(chapter.fragments.map(f=>[f.id,f]));}
 start(){this.variables={};this.pending={};this.jump('s1-00-veil');}
 jump(id:string){if(!this.fragments.has(id))throw Error('剧情片段不存在：'+id);this.fragment=id;this.cursor=0;this.current=null;}
 value(expr:string):any{const t=expr.trim();if(t==='true')return true;if(t==='false')return false;if(/^-?\d+(\.\d+)?$/.test(t))return Number(t);const m=/^([A-Za-z_]\w*)\s*([+-])\s*(\d+)$/.exec(t);if(m)return Number(this.variables[m[1]]??0)+(m[2]==='+'?1:-1)*Number(m[3]);return this.variables[t]??t;}
 next():Block {
  for(let guard=0;guard<256;guard++){
   const f=this.fragments.get(this.fragment)!;if(this.cursor>=f.blocks.length)return {id:'end',type:'returnToEntry',props:{}};
   const b=f.blocks[this.cursor++];this.current=b;const p=b.props??{};if(String(p.disabled)==='true')continue;
   if(b.type==='setver'){if(this.pending[p.key]===p.aLit){delete this.pending[p.key];continue;}this.variables[p.key]=this.value(String(p.aLit));continue;}
   if(b.type==='callFragment'){this.pending={};this.jump(p.fragmentId);continue;}
   return b;
  }throw Error('剧情指令形成循环。');
 }
 choices():Choice[]{if(this.current?.type!=='branch')return[];const choices=JSON.parse(this.current.props.choices??'[]');if(!Array.isArray(choices))throw Error('无效分支');return choices;}
 choose(index:number){const option=this.choices()[index];if(!option||(option.condition&&option.condition!=='always'))throw Error('选择不可用');if(!this.fragments.has(option.fragmentId))throw Error('选择目标不存在');this.pending={};for(const effect of option.effects??[]){const m=/^([A-Za-z_]\w*)\s*=(.*)$/.exec(effect);if(!m)throw Error('无效状态赋值');const expression=m[2].trim();this.variables[m[1]]=this.value(expression);this.pending[m[1]]=expression;}this.jump(option.fragmentId);return option;}
 snapshot():Snapshot{return structuredClone({fragment:this.fragment,cursor:this.cursor,variables:this.variables,pending:this.pending,current:this.current});}
 restore(data:Snapshot){const f=this.fragments.get(data?.fragment);if(!f||!Number.isInteger(data.cursor)||data.cursor<0||data.cursor>f.blocks.length||!data.variables||typeof data.variables!=='object')throw Error('这份存档无法读取');if(data.current&&(!f.blocks.some(b=>b.id===data.current!.id)||data.current.id!==f.blocks[data.cursor-1]?.id))throw Error('存档对白不匹配');this.fragment=data.fragment;this.cursor=data.cursor;this.variables=structuredClone(data.variables);this.pending=structuredClone(data.pending??{});this.current=data.current?structuredClone(f.blocks[data.cursor-1]):null;}
}
export const blockText=(b:Block)=>b.content?.map(x=>x.text??'').join('')??'';
export const CHAPTER_NAMES:Record<string,string>={'s1-00-veil':'序幕 · 红盖头','s1-00-bath':'浴桶复盘','s1-00-wait':'等不到的新郎','s1-01':'晨起 · 十日之约','s1-02':'入宫','s1-03':'太后面前','s1-04':'御池落水','s1-05':'侧殿试探','s1-06':'偷听的人','s1-07':'书房夜谈','s1-08':'归宁街市','s1-09':'华府家书','s1-10':'说服华相','s1-11':'兄长华深','s1-12':'夜归','s1-13':'一个危险的念头','s1-14':'与牧遥的约定','s1-15':'为自己留一条路','s2-01':'明月公子','s2-02':'出府','s2-03':'酒楼风波','s2-04':'回府路上','s2-05':'风波之后','s2-06':'后宫日常','s2-07':'御书房奏折','s2-08':'病榻半月','s2-09':'生辰夜宴','end-vol1-true':'卷一 · 你究竟是不是华浅','end-bad-taihou':'歧路 · 旧日面孔','end-bad-huameiren':'歧路 · 同流','end-bad-huaxiang':'歧路 · 失言','end-bad-muyao':'歧路 · 一念','end-bad-zhongxiwu':'歧路 · 破绽'};
