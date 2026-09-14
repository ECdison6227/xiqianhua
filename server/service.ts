import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import type { DialogueResult, SessionView } from '../shared/types';
import { type NpcId, type Point, inTalkRange } from '../shared/world';
import { CLUES, validateReply } from './canon';
import { type Provider, presetProvider, ProviderError } from './providers';

export class GameError extends Error { constructor(public status:number,public code:string,message:string){super(message);} }
type StoredSession = SessionView & {receipts:Record<string,{fingerprint:string;result:DialogueResult}>};
export class GameService {
  private sessions=new Map<string,StoredSession>();
  private busy=new Set<string>();
  constructor(private directory:string,private provider:Provider,readonly storyLength:number){}
  async create():Promise<SessionView> {
    const s:StoredSession={id:randomUUID(),phase:'explore',storyIndex:0,clues:[],history:{pipa:[],blue:[],grey:[],huashen:[],keeper:[],waiter:[]},emotions:{pipa:'guarded',blue:'calm',grey:'angry',huashen:'guarded',keeper:'calm',waiter:'calm'},revision:0,receipts:{}};
    await this.save(s);this.sessions.set(s.id,s);return this.view(s);
  }
  private view(s:StoredSession):SessionView {const {receipts:_r,...view}=s;return structuredClone(view);}
  private async get(id:string) {
    if(!/^[a-f0-9-]{36}$/.test(id))throw new GameError(404,'missing_session','这份进度不存在，请重新进入酒楼。');
    if(this.sessions.has(id))return this.sessions.get(id)!;
    try {const s=JSON.parse(await readFile(path.join(this.directory,id+'.json'),'utf8')) as StoredSession;if(s.id!==id)throw new Error();this.sessions.set(id,s);return s;}
    catch {throw new GameError(404,'missing_session','未找到这份进度，请重新进入酒楼。');}
  }
  async state(id:string){return this.view(await this.get(id));}
  private async save(s:StoredSession){
    await mkdir(this.directory,{recursive:true,mode:0o700});
    const dest=path.join(this.directory,s.id+'.json');const temp=dest+'.tmp';
    await writeFile(temp,JSON.stringify(s),{mode:0o600});await rename(temp,dest);
  }
  async talk(input:{sessionId:string;npcId:NpcId;question:string;requestId:string;position:Point;mode:'ai'|'preset';evidenceId?:string}):Promise<DialogueResult>{
    const original=await this.get(input.sessionId);
    const fingerprint=JSON.stringify([input.npcId,input.question,input.mode,input.evidenceId??'']);
    const old=original.receipts[input.requestId];
    if(old){if(old.fingerprint!==fingerprint)throw new GameError(409,'request_conflict','这次请求与已保存的问题不同，请重新询问。');return structuredClone(old.result);}
    if(this.busy.has(original.id))throw new GameError(409,'busy','上一句话仍在回应中，请稍候。');
    if(original.phase!=='explore')throw new GameError(409,'wrong_phase','当前已进入剧情演出，暂时不能交谈。');
    if(!inTalkRange(input.position,input.npcId))throw new GameError(400,'too_far','请先走近这位人物再交谈。');
    this.busy.add(original.id);
    try {
      const started=Date.now();const active=input.mode==='preset'?presetProvider:this.provider;
      const evidence=input.evidenceId?original.clues.find(c=>c.id===input.evidenceId):undefined;
      if(input.evidenceId&&!evidence)throw new GameError(400,'missing_evidence','请先取得这条证词。');
      const question=input.question+(evidence?`\n玩家出示已收集的证词（保留来源，仍非全知事实）：${evidence.source}：${evidence.detail}`:'');
      const raw=await active.generate(input.npcId,original.history[input.npcId],question);
      let checked:ReturnType<typeof validateReply>;
      try {checked=validateReply(input.npcId,raw.raw);}catch{throw new ProviderError('invalid_reply','这次回应不完整，未写入进度。可以重试。');}
      const {answer,guarded}=checked;const s=structuredClone(original);
      const newClues=answer.clueIds.filter(id=>!s.clues.some(c=>c.id===id)).map(id=>CLUES[id]);
      s.clues.push(...newClues);
      s.history[input.npcId].push({role:'user',content:input.question+(evidence?'【出示：'+evidence.title+'】':'')},{role:'assistant',content:answer.reply,source:active.tag,guarded});
      s.history[input.npcId]=s.history[input.npcId].slice(-40);
      s.emotions[input.npcId]=answer.emotion;s.revision++;
      const result:DialogueResult={reply:answer.reply,emotion:answer.emotion,source:active.tag,guarded,model:raw.model,elapsedMs:Date.now()-started,newClues,session:this.view(s)};
      s.receipts[input.requestId]={fingerprint,result};
      const ids=Object.keys(s.receipts);for(const id of ids.slice(0,Math.max(0,ids.length-32)))delete s.receipts[id];
      await this.save(s);this.sessions.set(s.id,s);return structuredClone(result);
    } finally {this.busy.delete(original.id);}
  }
  async story(id:string,expectedRevision:number,action:'start'|'next'){
    const old=await this.get(id);
    if(this.busy.has(id))throw new GameError(409,'busy','请等当前回应保存后再进入剧情。');
    if(old.revision!==expectedRevision)throw new GameError(409,'stale_revision','进度已更新，请同步后再继续。');
    const s=structuredClone(old);
    if(action==='start'){
      if(s.phase!=='explore')throw new GameError(409,'wrong_phase','剧情已经开始。');
      s.phase='story';s.storyIndex=0;
    } else {
      if(s.phase!=='story')throw new GameError(409,'wrong_phase','当前不在剧情演出中。');
      if(s.storyIndex+1>=this.storyLength)s.phase='complete';else s.storyIndex++;
    }
    this.busy.add(id);
    try {s.revision++;await this.save(s);this.sessions.set(id,s);return this.view(s);} finally {this.busy.delete(id);}
  }
}
