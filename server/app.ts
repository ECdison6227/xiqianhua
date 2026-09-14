import express from 'express';
import path from 'node:path';
import { z } from 'zod';
import { GameService, GameError } from './service';
import { ProviderError, type Provider } from './providers';
import type { Server } from 'node:http';

export const TalkBody=z.object({sessionId:z.uuid(),requestId:z.uuid(),npcId:z.enum(['pipa','blue','grey','huashen','keeper','waiter']),evidenceId:z.string().max(40).optional(),question:z.string().trim().min(1).max(500),mode:z.enum(['ai','preset']).default('ai'),position:z.object({x:z.number().finite(),y:z.number().finite()}).strict()}).strict();
export function createApp(options:{dataDir:string;provider:Provider;story:{id:string;speaker:string;character:string;text:string}[]}){
  const app=express();const service=new GameService(options.dataDir,options.provider,options.story.length);
  app.disable('x-powered-by');
  app.set('trust proxy','loopback');
  app.use((req,_res,next)=>{if(req.url.startsWith('/xiqianhua/'))req.url=req.url.slice('/xiqianhua'.length);next();});
  const rates=new Map<string,{n:number;t:number}>();
  app.use((req,res,next)=>{
    if(req.method!=='POST'||!req.path.startsWith('/api/'))return next();
    const key=(req.ip??'unknown')+':'+req.path;const now=Date.now();let r=rates.get(key);
    if(!r||now-r.t>3600000){r={n:0,t:now};rates.set(key,r);}
    const max=req.path==='/api/sessions'?20:120;
    if(++r.n>max){res.status(429).json({message:'这一小时的互动较多，请稍后再试。其他剧情与探索仍可继续。'});return;}
    if(rates.size>20000)for(const [k,v] of rates)if(now-v.t>3600000)rates.delete(k);
    next();
  });
  app.use((req,res,next)=>{
    if(!/^(localhost|127\.0\.0\.1|edsionc\.top|www\.edsionc\.top)(:\d+)?$/.test(req.get('host')??'')){res.status(403).end();return;}
    let pathname=req.path;try{pathname=decodeURIComponent(pathname);}catch{res.status(400).end();return;}
    if(/^\/(\.env|\.runtime|\.git|server\/|scripts\/|tests\/)/.test(pathname)){res.status(404).end();return;}
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
    if(req.path.startsWith('/api/')){
      res.setHeader('Cache-Control','no-store');
      const origin=req.get('origin');
      if(origin){try{if(new URL(origin).host!==req.get('host')){res.status(403).json({error:'origin',message:'请从游戏页面发起请求。'});return;}}catch{res.status(403).end();return;}}
      if(req.method==='POST'&&!req.is('application/json')){res.status(415).json({error:'content_type',message:'请求格式不正确。'});return;}
    }
    next();
  });
  app.use(express.json({limit:'12kb'}));
  const route=(fn:(req:express.Request,res:express.Response)=>Promise<void>)=>(req:express.Request,res:express.Response,next:express.NextFunction)=>{fn(req,res).catch(next);};
  app.get('/api/health',(_req,res)=>res.json({ok:true,provider:options.provider.tag,configured:options.provider.configured!==false}));
  app.post('/api/sessions',route(async(_req,res)=>{res.status(201).json(await service.create());}));
  app.get('/api/sessions/:id',route(async(req,res)=>{res.json(await service.state(String(req.params.id)));}));
  app.post('/api/talk',route(async(req,res)=>{res.json(await service.talk(TalkBody.parse(req.body)));}));
  app.post('/api/story',route(async(req,res)=>{
    const body=z.object({sessionId:z.uuid(),expectedRevision:z.number().int().nonnegative(),action:z.enum(['start','next'])}).strict().parse(req.body);
    res.json(await service.story(body.sessionId,body.expectedRevision,body.action));
  }));
  app.get('/api/story/:id',route(async(req,res)=>{const session=await service.state(String(req.params.id));res.json({beat:session.phase==='story'?options.story[session.storyIndex]:null,total:options.story.length});}));
  app.use('/api',(_req,res)=>res.status(404).json({error:'not_found',message:'这个接口不存在。'}));
  app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    if(err instanceof z.ZodError){res.status(400).json({error:'validation',message:'问题或请求格式不正确，请检查后重试。'});return;}
    if(err instanceof GameError){res.status(err.status).json({error:err.code,message:err.message});return;}
    if(err instanceof ProviderError){res.status(502).json({error:err.code,message:err.message});return;}
    res.status(500).json({error:'server',message:'进度暂未保存，请稍后重试。'});
  });
  return {app,service};
}
