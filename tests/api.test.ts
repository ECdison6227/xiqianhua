import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm,readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { START,NPCS,canWalk,moveStep,findPath,type NpcId } from '../shared/world';
import { messagesFor,validateReply,presetReply } from '../server/canon';
import { deepseekProvider,siliconflowProvider,providerFromEnv,presetProvider,type Provider } from '../server/providers';
import { approach } from '../src/navigation';
import { GameService } from '../server/service';
import { createApp } from '../server/app';

async function setup(provider:Provider=presetProvider){const dir=await mkdtemp(path.join(tmpdir(),'tavern-test-'));return {service:new GameService(dir,provider,3),dir,close:()=>rm(dir,{recursive:true,force:true})};}
const question=(sessionId:string,npcId:NpcId='pipa')=>{const n=NPCS.find(n=>n.id===npcId)!;return {sessionId,npcId,question:'方才发生了什么？',requestId:randomUUID(),position:approach('tavern',START,n)!.at(-1)!,mode:'ai' as const};};
test('家具、墙外、水平方向大步穿越不会被当作空地',()=>{
  for(const p of [{x:10,y:10},{x:638,y:551},{x:420,y:650},{x:1000,y:850},{x:NaN,y:1000}])assert.equal(canWalk(p),false);
  const end=moveStep({x:640,y:700},0,-400);assert.ok(canWalk(end));assert.ok(end.y>650);
});
test('每个角色只获得自己的事实和最近交谈，不带全局剧情与别人的私聊',()=>{
  const prompt=JSON.stringify(messagesFor('pipa',[{role:'user',content:'我称自己为试雨客'},{role:'assistant',content:'王妃为何这样说？'}],'我刚才怎么称呼自己？'));
  assert.match(prompt,/试雨客/);assert.doesNotMatch(prompt,/仲溪午|牧遥|皇家身份|舍弟/);
});
test('线索只能来自本角色允许范围，且本句确实提及；越界输出不落入世界',()=>{
  const checked=validateReply('pipa',{reply:'华公子纠缠，小女子不情愿。',emotion:'guarded',clueIds:['refusal','refusal','prejudice','invented']});
  assert.deepEqual(checked.answer.clueIds,['refusal']);
  assert.deepEqual(validateReply('pipa',{reply:'王妃安好。',emotion:'calm',clueIds:['refusal']}).answer.clueIds,[]);
  assert.deepEqual(validateReply('blue',{reply:'我与舍弟看不过华深纠缠琵琶女，见不平事总想管上一管。',emotion:'calm',clueIds:['intervention','prejudice']}).answer.clueIds,['intervention']);
  assert.deepEqual(validateReply('grey',{reply:'我怎知你不会偏袒自家兄长？',emotion:'angry',clueIds:['prejudice']}).answer.clueIds,['prejudice']);
  assert.deepEqual(validateReply('grey',{reply:'谁知道你会不会站在他那边。',emotion:'angry',clueIds:['prejudice']}).answer.clueIds,['prejudice']);
  const spoiler=validateReply('pipa',{reply:'仲溪午就是皇帝。',emotion:'calm',clueIds:['refusal']});assert.ok(spoiler.guarded);assert.deepEqual(spoiler.answer.clueIds,[]);assert.doesNotMatch(spoiler.answer.reply,/皇帝|仲溪午/);
  const fabricated=validateReply('grey',{reply:'我那兄弟险些被你兄长的人伤了。',emotion:'angry',clueIds:['prejudice']});assert.ok(fabricated.guarded);assert.deepEqual(fabricated.answer.clueIds,[]);assert.doesNotMatch(fabricated.answer.reply,/险些|伤了/);
});
test('服务端拒绝无内容、伪动作字段和任意世界修改',()=>{
  assert.throws(()=>validateReply('blue',{reply:'',emotion:'calm',clueIds:[]}));
  assert.throws(()=>validateReply('blue',{reply:'我去找他。',emotion:'calm',clueIds:[],action:'MOVE',world:{chapter:13}}));
});
test('重试同一个问句只调用模型一次，不重复记线索；请求号不可改题复用',async()=>{
  let calls=0;const f=await setup({tag:'deepseek',async generate(id,_h,q){calls++;return {raw:presetReply(id,q)};}});
  try{const s=await f.service.create(),input=question(s.id);const a=await f.service.talk(input),b=await f.service.talk(input);assert.equal(calls,1);assert.deepEqual(a,b);assert.equal(a.session.clues.length,1);await assert.rejects(()=>f.service.talk({...input,question:'换一个问题'}),/请求/);}finally{await f.close();}
});
test('不能远程交谈，也不能把客户端提供的世界事实当成进度',async()=>{
  const f=await setup();try{const s=await f.service.create();await assert.rejects(()=>f.service.talk({...question(s.id),position:START}),/走近/);assert.equal((await f.service.state(s.id)).revision,0);}finally{await f.close();}
});
test('同一角色记住自己的交谈；服务重建后记录与线索仍在',async()=>{
  const contexts:unknown[]=[];const f=await setup({tag:'deepseek',async generate(id,h,q){contexts.push(structuredClone(h));return {raw:presetReply(id,q)};}});
  try{const s=await f.service.create();await f.service.talk(question(s.id));await f.service.talk(question(s.id,'blue'));assert.deepEqual(contexts[1],[]);await f.service.talk(question(s.id));assert.equal((contexts[2] as unknown[]).length,2);const reopened=new GameService(f.dir,presetProvider,3);const saved=await reopened.state(s.id);assert.equal(saved.history.pipa.length,4);assert.equal(saved.clues.length,2);}finally{await f.close();}
});
test('模型失败不留下半条对话、假线索或被占用的会话',async()=>{
  const f=await setup({tag:'deepseek',async generate(){throw new Error('unavailable');}});try{const s=await f.service.create();await assert.rejects(()=>f.service.talk(question(s.id)));assert.deepEqual(await f.service.state(s.id),s);const offline=await f.service.talk({...question(s.id),mode:'preset'});assert.equal(offline.source,'preset');assert.equal(offline.session.revision,1);}finally{await f.close();}
});
test('未拿线索也能进入已有剧情，越序翻页被拒绝，末句后结束',async()=>{
  const f=await setup();try{const s=await f.service.create();let current=await f.service.story(s.id,0,'start');assert.equal(current.phase,'story');await assert.rejects(()=>f.service.story(s.id,0,'next'),/更新/);await assert.rejects(()=>f.service.talk(question(s.id)),/剧情/);for(let i=0;i<3;i++)current=await f.service.story(s.id,current.revision,'next');assert.equal(current.phase,'complete');assert.equal(current.clues.length,0);}finally{await f.close();}
});
test('API 适配层发送真实上下文与 JSON 请求，密钥不进入提示词或结果',async()=>{
  let captured:any;const provider=deepseekProvider({key:'fixture-only-private-key',baseUrl:'https://api.deepseek.com',model:'deepseek-flash',fetcher:(async(_url,init)=>{captured=JSON.parse(String(init?.body));return new Response(JSON.stringify({model:'verified-model',choices:[{finish_reason:'stop',message:{content:JSON.stringify(presetReply('pipa','hi'))}}]}));}) as typeof fetch});
  const result=await provider.generate('pipa',[],'方才发生了什么？');assert.equal(captured.thinking.type,'disabled');assert.equal(captured.response_format.type,'json_object');assert.equal(result.model,'verified-model');assert.doesNotMatch(JSON.stringify(captured),/fixture-only/);assert.doesNotMatch(JSON.stringify(result),/fixture-only/);
});
test('拒绝服务端返回截断 JSON、空回答，以及错误响应中的敏感内容',async()=>{
  for(const payload of [{choices:[{finish_reason:'length',message:{content:'{}'}}]},{choices:[{finish_reason:'stop',message:{content:''}}]}]){
    const p=deepseekProvider({key:'x',baseUrl:'https://api.deepseek.com',model:'fixture',fetcher:(async()=>new Response(JSON.stringify(payload))) as typeof fetch});await assert.rejects(()=>p.generate('pipa',[],'hi'),/不完整/);
  }
  const p=deepseekProvider({key:'x',baseUrl:'https://api.deepseek.com',model:'fixture',fetcher:(async()=>new Response('sensitive details',{status:401})) as typeof fetch});await assert.rejects(()=>p.generate('pipa',[],'hi'),e=>e instanceof Error&&e.message.includes('认证')&&!e.message.includes('sensitive'));
});
test('硅基流动使用独立密钥与参数，结果保留真实提供方，配置错误不暗中切换',async()=>{
  let endpoint='';let payload:any;let authorization='';
  const provider=siliconflowProvider({key:'fixture-siliconflow-secret',baseUrl:'https://api.siliconflow.cn/v1/',model:'deepseek-ai/DeepSeek-V4-Flash',fetcher:(async(url,init)=>{
    endpoint=String(url);payload=JSON.parse(String(init?.body));authorization=new Headers(init?.headers).get('Authorization')??'';
    return new Response(JSON.stringify({model:'deepseek-ai/DeepSeek-V4-Flash',choices:[{finish_reason:'stop',message:{content:JSON.stringify(presetReply('blue','为什么出手？'))}}]}));
  }) as typeof fetch});
  const result=await provider.generate('blue',[],'为什么出手？');
  assert.equal(endpoint,'https://api.siliconflow.cn/v1/chat/completions');assert.equal(provider.tag,'siliconflow');
  assert.equal(payload.enable_thinking,false);assert.equal(payload.thinking,undefined);assert.equal(payload.response_format.type,'json_object');
  assert.equal(authorization,'Bearer fixture-siliconflow-secret');assert.doesNotMatch(JSON.stringify([payload,result]),/fixture-siliconflow-secret/);
  assert.equal(providerFromEnv({NPC_PROVIDER:'siliconflow',DEEPSEEK_API_KEY:'wrong-provider-key'}).configured,false);
  assert.equal(providerFromEnv({NPC_PROVIDER:'siliconflow',SILICONFLOW_API_KEY:'fixture'}).tag,'siliconflow');
  assert.throws(()=>providerFromEnv({NPC_PROVIDER:'mistyped'}),/未识别/);
});
test('HTTP 请求经校验，恶意来源与私有文件访问被拦截',async()=>{
  const f=await setup();const {app}=createApp({dataDir:f.dir,provider:presetProvider,story:[{id:'a',speaker:'华浅',character:'char-huaqian',text:'test'}]});const server=app.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try{
    const denied=await fetch(base+'/api/sessions',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://another.example'},body:'{}'});assert.equal(denied.status,403);
    const privateFile=await fetch(base+'/.env.local');assert.equal(privateFile.status,404);
    const runtimeFile=await fetch(base+'/.runtime/sessions/foo.json');assert.equal(runtimeFile.status,404);
    const s=await (await fetch(base+'/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json() as any;
    const bad=await fetch(base+'/api/talk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...question(s.id),clues:['invented']})});assert.equal(bad.status,400);
    const good=await fetch(base+'/api/talk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...question(s.id),mode:'preset'})});assert.equal(good.status,200);const body=await good.json() as any;assert.equal(body.source,'preset');assert.equal(body.session.clues[0].id,'refusal');
  }finally{server.close();await once(server,'close');await f.close();}
});

test('未获得的证词不能伪造出示，已获得证词可携带给另一位人物',async()=>{const f=await setup();try{const s=await f.service.create();await assert.rejects(()=>f.service.talk({...question(s.id,'huashen'),evidenceId:'refusal'}),/证词|线索/);await f.service.talk(question(s.id));const r=await f.service.talk({...question(s.id,'huashen'),evidenceId:'refusal'});assert.equal(r.session.history.huashen.length,2);assert.ok(r.session.clues.some(c=>c.id==='refusal'));}finally{await f.close();}});

test('关系混淆和凭空追加施事者的模型回答被收束，不产生证词',()=>{for(const reply of ['在下出手，是因舍弟华深纠缠琵琶女。','因舍弟与华深纠缠琵琶女，情势紧急。']){const r=validateReply('blue',{reply,emotion:'calm',clueIds:['intervention']});assert.equal(r.guarded,true);assert.deepEqual(r.answer.clueIds,[]);}});
