import {randomBytes, timingSafeEqual} from 'node:crypto';
import type {Express, Request, Response} from 'express';

export interface ZhihuConfig {
  appId: string;
  redirectUri: string;
  credentials: () => Promise<{appKey?: string; accessSecret?: string}>;
  allowMissingState?: boolean;
  secureCookie?: boolean;
  fetcher?: typeof fetch;
  now?: () => number;
}
type Session = {expires: number; pending?: {state: string; expires: number; redirect: string}; token?: string; tokenExpires?: number; stateVerified?: boolean; profile?: {name: string|null; headline: string|null}; error?: string; checking?: boolean};
const COOKIE='xiqianhua_zhihu';
const BASE='/xiqianhua/';
const messages:Record<string,string>={
  credentials:'知乎连接正在配置中，请稍后再试。',
  not_started:'请从游戏内的「连接知乎账号」重新发起授权。',
  state:'本次授权无法与当前浏览器对应，请重新连接。',
  missing_state:'知乎没有返回登录校验信息，本次连接未完成。',
  exchange:'未能完成知乎授权，请稍后重新连接。',
  expired:'知乎授权已过期，请重新连接。',
  login:'请先连接知乎账号。',
  busy:'正在核验，请稍候。',
  rate:'连接尝试较多，请稍后再试。',
};
class OAuthError extends Error {constructor(public kind:string,public upstreamCode?:number){super(messages[kind]??messages.exchange);}}
const equal=(a:string,b:string)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
const text=(x:unknown)=>typeof x==='string'?x.slice(0,160):null;

export function mountZhihu(app:Express,config:ZhihuConfig){
  const sessions=new Map<string,Session>();
  const starts=new Map<string,{n:number;expires:number}>();
  const now=config.now??Date.now,fetcher=config.fetcher??fetch;
  const uri=new URL(config.redirectUri);
  if(uri.protocol!=='https:'||uri.pathname!=='/xiqianhua/auth/callback'||!/^\d+$/.test(config.appId))throw new Error('Invalid Zhihu public configuration');
  function cookie(res:Response,id:string,maxAge=28800){res.setHeader('Set-Cookie',`${COOKIE}=${id}; Path=/xiqianhua; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${config.secureCookie!==false?'; Secure':''}`);}
  function find(req:Request){const id=(req.headers.cookie??'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)??'';const s=sessions.get(id);if(s&&s.expires<=now()){sessions.delete(id);return {id,s:undefined};}if(s?.token&&(!s.tokenExpires||s.tokenExpires<=now())){delete s.token;delete s.profile;s.error='expired';}return {id,s};}
  function fresh(res:Response,s:Session={expires:now()+28800000}){for(const [id,v]of sessions)if(v.expires<=now())sessions.delete(id);if(sessions.size>=2000)sessions.delete(sessions.keys().next().value!);const id=randomBytes(32).toString('base64url');sessions.set(id,s);cookie(res,id);return {id,s};}
  async function json(url:string,init:RequestInit={},timeout=25000){const response=await fetcher(url,{...init,signal:AbortSignal.timeout(timeout),redirect:'error'});if(response.status===401||response.status===403)throw new OAuthError('expired',response.status);if(!response.ok)throw new OAuthError('http',response.status);return response.json();}
  const safe=(fn:(req:Request,res:Response)=>Promise<void>)=>(req:Request,res:Response)=>{void fn(req,res).catch(e=>res.status(e instanceof OAuthError&&e.kind==='login'?401:503).json({error:e instanceof OAuthError?e.kind:'exchange',message:e instanceof OAuthError?e.message:messages.exchange}));};
  async function userGet(endpoint:string,token:string,secret:string){return json(endpoint,{headers:{Authorization:`Bearer ${secret}`,'X-OAuth-Token':token,'X-Request-Timestamp':String(Math.floor(now()/1000)),'Content-Type':'application/json'}},10000);}
  app.get('/api/oauth/status',safe(async(req,res)=>{const {s}=find(req),c=await config.credentials();res.json({configured:!!(c.appKey&&c.accessSecret),appId:config.appId,redirectUri:config.redirectUri,authorized:!!s?.token,profile:s?.profile??null,stateVerified:s?.stateVerified??null,temporaryIntegration:config.allowMissingState===true,expiresAt:s?.tokenExpires?new Date(s.tokenExpires).toISOString():null,message:s?.error?messages[s.error]:null});}));
  app.get('/api/oauth/start',safe(async(req,res)=>{
    const c=await config.credentials();if(!c.appKey||!c.accessSecret)throw new OAuthError('credentials');
    for(const [ip,r]of starts)if(r.expires<=now())starts.delete(ip);
    const ip=req.ip??'unknown',r=starts.get(ip)??{n:0,expires:now()+3600000};if(++r.n>20)throw new OAuthError('rate');starts.set(ip,r);
    const existing=find(req);const {s}=existing.s?{s:existing.s}:fresh(res);
    s.pending={state:randomBytes(32).toString('base64url'),expires:now()+600000,redirect:req.query.legacy==='1'?uri.origin+'/xiqianhua':config.redirectUri};delete s.error;
    const url=new URL('https://openapi.zhihu.com/authorize');url.search=new URLSearchParams({app_id:config.appId,response_type:'code',redirect_uri:s.pending.redirect,state:s.pending.state}).toString();res.redirect(302,url.toString());
  }));
  async function callback(req:Request,res:Response){
    res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
    const current=find(req);const s=current.s,p=s?.pending;
    try{
      if(!s||!p||p.expires<=now())throw new OAuthError('not_started');
      const incoming=typeof req.query.state==='string'?req.query.state:undefined;
      if(incoming&&!equal(incoming,p.state))throw new OAuthError('state');
      if(!incoming&&!config.allowMissingState)throw new OAuthError('missing_state');
      const code=req.query.authorization_code??req.query.code;
      if(typeof code!=='string'||!code||code.length>4096)throw new OAuthError('not_started');
      delete s.pending;
      const c=await config.credentials();if(!c.appKey||!c.accessSecret)throw new OAuthError('credentials');
      const raw=await json('https://openapi.zhihu.com/access_token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({app_id:config.appId,app_key:c.appKey,grant_type:'authorization_code',redirect_uri:p.redirect,code})});
      const token=raw?.access_token??raw?.data?.access_token??raw?.Data?.access_token;
      const seconds=Number(raw?.expires_in??raw?.data?.expires_in??raw?.Data?.expires_in??3600);
      if(typeof token!=='string'||!token||token.length>16000||!Number.isFinite(seconds)||seconds<=0)throw new OAuthError('exchange');
      const next:Session={expires:now()+28800000,token,tokenExpires:now()+Math.min(seconds,28800)*1000,stateVerified:!!incoming};
      // /user has no formal schema. Only display available text; failure is non-blocking.
      try{const profile=await userGet('https://openapi.zhihu.com/user',token,c.accessSecret);const v=profile?.data??profile?.Data??profile?.user;const name=text(v?.name??v?.Fullname??v?.fullname);if(name)next.profile={name,headline:text(v?.headline??v?.Headline)};}catch{}
      sessions.delete(current.id);fresh(res,next);res.redirect(303,BASE+'#zhihu');
    }catch(e){if(s){delete s.pending;s.error=e instanceof OAuthError?e.kind:'exchange';}res.redirect(303,BASE+'#zhihu=failed');}
  }
  app.get('/auth/callback',(req,res)=>{void callback(req,res);});
  app.get('/xiqianhua',(req,res)=>{if(req.query.authorization_code||req.query.code||req.query.error)void callback(req,res);else res.redirect(302,BASE);});
  app.post('/api/oauth/logout',safe(async(req,res)=>{sessions.delete(find(req).id);cookie(res,'',0);res.json({ok:true});}));
  app.post('/api/oauth/verify',safe(async(req,res)=>{
    const {s}=find(req);if(!s?.token)throw new OAuthError('login');if(s.checking)throw new OAuthError('busy');
    const {accessSecret}=await config.credentials();if(!accessSecret)throw new OAuthError('credentials');s.checking=true;
    try{
      const results:{id:string;name:string;status:string;count:number;message?:string;code?:number}[]=[];let favlist:string|undefined;let favlistsState:'pending'|'empty'|'success'='pending';let denied=false;const token=s.token;
      for(const [id,name,endpoint,query]of [
        ['contents','创作内容','contents',{ContentType:'all',Offset:'0',SortField:'ts',SortOrder:'desc'}],
        ['followees','关注用户','followees',{Offset:'0'}],
        ['favlists','收藏夹','favlists',{}],
        ['favlist_contents','收藏夹内容','favlist_contents',{Offset:'0'}],
        ['collections','近期收藏','collections',{}],
      ] as [string,string,string,Record<string,string>][]){
        if(denied){results.push({id,name,status:'skipped',count:0,message:'授权失效，已停止查询。'});continue;}
        if(id==='favlist_contents'&&!favlist){results.push({id,name,status:favlistsState==='empty'?'empty':'skipped',count:0,message:favlistsState==='empty'?'没有可查询的公开收藏夹。':'收藏夹列表尚未读取，暂未查询其中内容。'});continue;}
        try{
          const q=new URLSearchParams({...query,Limit:'1',...(id==='favlist_contents'?{FavlistUrlToken:favlist!}:{})});
          const result=await userGet(`https://developer.zhihu.com/api/v1/user/${endpoint}?${q}`,token,accessSecret);
          if(result?.Code===20001)throw new OAuthError('expired',20001);
          if(result?.Code!==0)throw new OAuthError('upstream',typeof result?.Code==='number'?result.Code:undefined);
          const items=result?.Data?.Items;if(!Array.isArray(items))throw new OAuthError('shape');
          if(id==='favlists'){
            if(items.length){const idValue=items[0]?.UrlToken;if(!['string','number'].includes(typeof idValue)||!/^\d+$/.test(String(idValue))||String(idValue)==='0')throw new OAuthError('shape');favlist=String(idValue);favlistsState='success';}
            else favlistsState='empty';
          }
          results.push({id,name,status:items.length?'success':'empty',count:Math.min(items.length,1)});
        }catch(e){
          const kind=e instanceof OAuthError?e.kind:'network';
          const message=kind==='expired'?'授权失效，请重新连接。':kind==='shape'?'知乎返回的数据格式不完整。':kind==='network'?'连接超时或网络中断，可稍后重新核验。':'知乎接口暂未完成请求，可稍后重新核验。';
          const code=e instanceof OAuthError&&Number.isSafeInteger(e.upstreamCode)?e.upstreamCode:undefined;
          results.push({id,name,status:'error',count:0,message,...(code!==undefined?{code}:{})});
          if(kind==='expired'){denied=true;delete s.token;delete s.profile;s.error='expired';}
        }
      }
      // Operational evidence contains only result categories, never tokens or user records.
      console.info(JSON.stringify({event:'zhihu-oauth-verification',at:new Date(now()).toISOString(),stateVerified:s.stateVerified,results}));
      res.json({results});
    }finally{s.checking=false;}
  }));
}
