import { z } from 'zod';
import type { NpcId } from '../shared/world';
import type { Turn, ProviderTag } from '../shared/types';
import { messagesFor, presetReply, KNOWLEDGE } from './canon';
export interface Provider {
  tag: ProviderTag;
  configured?: boolean;
  generate(npc:NpcId,history:Turn[],question:string,signal?:AbortSignal):Promise<{raw:unknown;model?:string}>;
}
export class ProviderError extends Error { constructor(public code:string, message:string){super(message);} }
export const presetProvider:Provider={tag:'preset',async generate(id,_history,q){return {raw:presetReply(id,q)};}};
const Envelope=z.object({model:z.string().optional(),choices:z.array(z.object({finish_reason:z.string(),message:z.object({content:z.string().nullable()})})).min(1)});
type ProviderConfig={key:string;baseUrl:string;model:string;fetcher?:typeof fetch;timeoutMs?:number};
export function deepseekProvider(config:ProviderConfig):Provider {return chatProvider('deepseek',config);}
export function siliconflowProvider(config:ProviderConfig):Provider {return chatProvider('siliconflow',config);}
export function providerFromEnv(env:NodeJS.ProcessEnv):Provider {
  if(env.NPC_PROVIDER==='openainext')return chatProvider('openainext',{key:env.OPENAINEXT_API_KEY??'',baseUrl:env.OPENAINEXT_BASE_URL??'https://api.openai-next.com/v1',model:env.OPENAINEXT_MODEL??'gpt-4.1-mini'});
  if(env.NPC_PROVIDER==='preset')return presetProvider;
  if(env.NPC_PROVIDER==='siliconflow')return siliconflowProvider({key:env.SILICONFLOW_API_KEY??'',baseUrl:env.SILICONFLOW_BASE_URL??'https://api.siliconflow.cn/v1',model:env.SILICONFLOW_MODEL??'deepseek-ai/DeepSeek-V4-Flash'});
  if(env.NPC_PROVIDER&&env.NPC_PROVIDER!=='deepseek')throw new ProviderError('bad_config','未识别的 AI 服务配置。');
  return deepseekProvider({key:env.DEEPSEEK_API_KEY??'',baseUrl:env.DEEPSEEK_BASE_URL??'https://api.deepseek.com',model:env.DEEPSEEK_MODEL??'deepseek-flash'});
}
function chatProvider(tag:'deepseek'|'siliconflow'|'openainext',config:ProviderConfig):Provider {
  return {tag,configured:Boolean(config.key),async generate(id,history,question,signal){
    if(!config.key)throw new ProviderError('not_configured','尚未配置 AI 服务。可以先使用预设问答。');
    const endpoint=new URL(config.baseUrl.replace(/\/$/,'')+'/chat/completions');
    if(endpoint.protocol!=='https:' && !['127.0.0.1','localhost'].includes(endpoint.hostname))throw new ProviderError('bad_config','AI 服务地址配置不正确。');
    let response:Response;
    try {
      response=await (config.fetcher??fetch)(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.key}`},body:JSON.stringify({model:config.model,messages:messagesFor(id,history,question),...(tag==='siliconflow'?{enable_thinking:false,temperature:0.3}:tag==='deepseek'?{thinking:{type:'disabled'}}:{temperature:0.35}),max_tokens:500,response_format:tag==='openainext'?{type:'json_schema',json_schema:{name:'npc_reply',strict:true,schema:{type:'object',additionalProperties:false,properties:{reply:{type:'string'},emotion:{type:'string',enum:['calm','guarded','angry','relieved']},clueIds:{type:'array',items:{type:'string',enum:KNOWLEDGE[id].clues}}},required:['reply','emotion','clueIds']}}}:{type:'json_object'},stream:false}),signal:AbortSignal.any([AbortSignal.timeout(config.timeoutMs??45000),...(signal?[signal]:[])])});
    } catch {throw new ProviderError('connection','未能取得回应。问题已保留，可以重试或使用预设问答。');}
    if(!response.ok){
      const msg=response.status===401?'AI 服务认证失败，请检查后端配置。':response.status===402?'AI 服务余额不足，可以先使用预设问答。':response.status===429?'AI 服务暂时繁忙，请稍后重试。':'AI 服务暂时无法回应，可以重试或使用预设问答。';
      throw new ProviderError(`provider_${response.status}`,msg);
    }
    try {
      const envelope=Envelope.parse(await response.json());
      const choice=envelope.choices[0];
      if(choice.finish_reason!=='stop'||!choice.message.content)throw new Error('incomplete');
      return {raw:JSON.parse(choice.message.content),model:envelope.model};
    } catch {throw new ProviderError('invalid_reply','这次回应不完整，未写入手记。可以重试。');}
  }};
}
