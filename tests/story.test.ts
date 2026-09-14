import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {StoryEngine} from '../src/story-engine';
import {segments,segmentForBlock} from '../src/segments';
import {walkable,approach} from '../src/navigation';
const catalog=JSON.parse(readFileSync(new URL('../public/story.json',import.meta.url),'utf8'));
test('原卷一所有片段和分支可遍历，六个结局可达，短结局回到选择后仍可继续',()=>{
 const e=new StoryEngine(catalog.chapter);e.start();const covered=new Set<string>(),ends=new Set<string>(),options=new Map<string,Set<number>>();let complete=false;
 for(let step=0;step<5000;step++){
  const b=e.next();covered.add(e.fragment);if(e.fragment.startsWith('end-'))ends.add(e.fragment);
  if(b.type==='branch'){const choices=e.choices(),seen=options.get(b.id)??new Set<number>();let index=choices.findIndex((_,i)=>!seen.has(i));if(index<0)index=choices.findIndex(c=>!c.fragmentId.startsWith('end-bad'));seen.add(index);options.set(b.id,seen);e.choose(index);}
  if(b.type==='returnToEntry'){complete=true;break;}
 }
 assert.ok(complete,'主线可结束');assert.equal(ends.size,6);assert.equal(options.size,8);
 for(const first of [0,1]){const e2=new StoryEngine(catalog.chapter);e2.start();for(let i=0;i<2500;i++){const b=e2.next();covered.add(e2.fragment);if(b.type==='returnToEntry')break;if(b.type==='branch'){const choices=e2.choices();const index=['choice-veil','choice-pond'].includes(b.props.branchId)?first:choices.findIndex(c=>!c.fragmentId.startsWith('end-bad'));e2.choose(Math.max(0,index));}}}
 const missing=catalog.chapter.fragments.filter((f:any)=>!covered.has(f.id)).map((f:any)=>f.id);assert.deepEqual(missing,[]);
});
test('每句恢复后下一步与未存档一致；分支选择与紧接着的变量赋值不重复累加',()=>{
 const e=new StoryEngine(catalog.chapter);e.start();let checked=0;
 for(let i=0;i<2500;i++){
  const b=e.next();if(b.type==='returnToEntry')break;
  const clone=new StoryEngine(catalog.chapter);clone.restore(e.snapshot());
  if(b.type==='branch'){const index=e.choices().findIndex(c=>!c.fragmentId.startsWith('end-bad'));const v={...e.variables};const option=e.choose(Math.max(0,index));clone.choose(Math.max(0,index));assert.deepEqual(clone.snapshot(),e.snapshot());const afterChoice={...e.variables};const next=e.next();clone.next();assert.deepEqual(clone.snapshot(),e.snapshot());for(const exp of option.effects??[]){const m=/(\w+)\s*=\s*\1\s*\+\s*(\d+)/.exec(exp);if(m)assert.equal(afterChoice[m[1]],Number(v[m[1]]??0)+Number(m[2]));}if(next.type==='returnToEntry')break;
  }else{const next=e.next();assert.deepEqual(clone.next(),next);assert.deepEqual(clone.snapshot(),e.snapshot());if(next.type==='branch'){const index=e.choices().findIndex(c=>!c.fragmentId.startsWith('end-bad'));e.choose(Math.max(0,index));}if(next.type==='returnToEntry')break;}
  checked++;
 }
 assert.ok(checked>200);
});
test('九段探索入口可行走，每个观察点都有真实可走路线且终点可互动',()=>{
 assert.equal(segments.length,9);
 for(const s of segments){assert.ok(walkable(s.map,s.entry),s.id+' entry');for(const p of s.points){const r=approach(s.map,s.entry,p);assert.ok(r?.length,s.id+' '+p.id+' reachable');for(const q of r!)assert.ok(walkable(s.map,q),s.id+' '+p.id+' route');const end=r!.at(-1)!;assert.ok(Math.hypot(end.x-p.x,end.y-p.y)<=138,s.id+' '+p.id+' interact range');}}
});
test('探索挂接到真实对白，人物与语音均有打包素材',()=>{
 const found=new Set<string>();for(const f of catalog.chapter.fragments)for(const b of f.blocks){const s=segmentForBlock(f.id,b.id,{});if(s)found.add(s.id);}
 assert.equal(found.size,9);
 for(const s of segments)for(const p of s.points)if(p.character){const c=catalog.characters.find((c:any)=>c.id===p.character);assert.ok(c?.expressions.length,s.id+' '+p.character);}
 for(const [id,key] of Object.entries(catalog.voices)){assert.ok(catalog.chapter.fragments.some((f:any)=>f.blocks.some((b:any)=>b.id===id)),id);assert.ok(catalog.assets[key as string],String(key));}
 for(const key of Object.values(catalog.assets))assert.ok(existsSync(new URL('../public/'+key,import.meta.url)),String(key));
});
