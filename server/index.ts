import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {decodeKeychainValue} from './keychain';
import { createApp } from './app';
import { providerFromEnv } from './providers';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(existsSync(path.join(root,'.env.local')))process.loadEnvFile(path.join(root,'.env.local'));
const provider=providerFromEnv(process.env);
const story=JSON.parse(readFileSync(path.join(root,'server/story.json'),'utf8'));
const configFile=path.join(root,'hackathon.config.json');
const oauthConfig=existsSync(configFile)?JSON.parse(readFileSync(configFile,'utf8')).oauth:null;
const keychain=async(service:string,account:string)=>{if(process.platform!=='darwin')return undefined;try{return decodeKeychainValue((await promisify(execFile)('/usr/bin/security',['find-generic-password','-s',service,'-a',account,'-w'])).stdout)||undefined;}catch{return undefined;}};
const {app}=createApp({dataDir:path.join(root,'.runtime/sessions'),provider,story,...(oauthConfig?.enabled?{oauth:{appId:oauthConfig.appId,redirectUri:oauthConfig.redirectUri,allowMissingState:oauthConfig.allowMissingState===true,credentials:async()=>({appKey:process.env.ZHIHU_OAUTH_APP_KEY||await keychain(oauthConfig.credentialService,oauthConfig.credentialAccount),accessSecret:process.env.ZHIHU_ACCESS_SECRET||await keychain('zhihu-cli','access-secret')})}}:{})});
if(process.argv.includes('--production')){
  app.use(express.static(path.join(root,'dist'),{dotfiles:'deny'}));
  app.get('/{*path}',(req,res)=>{if(path.extname(req.path))res.status(404).end();else res.sendFile(path.join(root,'dist/index.html'));});
}else{
  const {createServer}=await import('vite');const vite=await createServer({root,server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);
}
const port=Number(process.env.PORT??3911);
const server=app.listen(port,'127.0.0.1',()=>console.log(`酒楼探索已启动：http://127.0.0.1:${port} · ${{preset:'预设问答',deepseek:'DeepSeek 对话',siliconflow:'硅基流动对话',openainext:'OpenAI Next 对话'}[provider.tag]}`));
server.on('error',(e:NodeJS.ErrnoException)=>{console.error(e.code==='EADDRINUSE'?'端口已被占用，请使用另一个 PORT。':'服务未能启动。');process.exitCode=1;});
