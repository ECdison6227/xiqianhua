import {test,type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import type {AddressInfo} from 'node:net';
import {createApp} from '../server/app';
import {presetProvider} from '../server/providers';
import type {ZhihuConfig} from '../server/zhihu';
import {decodeKeychainValue} from '../server/keychain';

const redirect='https://edsionc.top/xiqianhua/auth/callback';
async function fixture(t:TestContext,overrides:Partial<ZhihuConfig>={}){
  let time=1800000000000;
  const calls:{url:string;init:RequestInit}[]=[];
  const dir=await mkdtemp(tmpdir()+'/zhihu-test-');
  const fetcher:typeof fetch=async(url,init={})=>{calls.push({url:String(url),init});return Response.json(String(url).endsWith('/access_token')?{data:{access_token:'test-token',expires_in:60}}:String(url).endsWith('/user')?{data:{name:'测试知友'}}:{Code:0,Data:{Items:[{UrlToken:123,secretContent:'do not expose'}]}});};
  const {app}=createApp({dataDir:dir,story:[],provider:presetProvider,oauth:{appId:'741',redirectUri:redirect,credentials:async()=>({appKey:'test-app',accessSecret:'test-secret'}),now:()=>time,fetcher,...overrides}});
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(dir,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request=(path:string,cookie='',method='GET')=>fetch(base+'/xiqianhua'+path,{method,redirect:'manual',headers:{Cookie:cookie,...(method==='POST'?{'Content-Type':'application/json'}:{})},...(method==='POST'?{body:'{}'}:{})});
  async function start(legacy=false){const r=await request('/api/oauth/start'+(legacy?'?legacy=1':''));assert.equal(r.status,302);const url=new URL(r.headers.get('location')!);const cookie=r.headers.get('set-cookie')!;assert.match(cookie,/HttpOnly; SameSite=Lax; Max-Age=28800; Secure/);return {state:url.searchParams.get('state')!,cookie:cookie.split(';')[0],url};}
  async function login(){const s=await start();const r=await request('/auth/callback?authorization_code=test-code&state='+s.state,s.cookie);assert.equal(r.headers.get('location'),'/xiqianhua/#zhihu');return r.headers.get('set-cookie')!.split(';')[0];}
  return {request,start,login,calls,advance:(ms:number)=>time+=ms,base};
}
test('OAuth: missing Access Secret never starts authorization',async t=>{
  const f=await fixture(t,{credentials:async()=>({appKey:'test-app'})});assert.equal((await(await f.request('/api/oauth/status')).json()).configured,false);assert.equal((await f.request('/api/oauth/start')).status,503);assert.equal(f.calls.length,0);
});
test('OAuth: correct exchange, cookie rotation, no exposed credentials and replay rejection',async t=>{
  const f=await fixture(t),s=await f.start();assert.equal(s.url.origin,'https://openapi.zhihu.com');assert.equal(s.url.searchParams.get('redirect_uri'),redirect);assert.equal(s.url.searchParams.has('app_key'),false);
  const path='/auth/callback?authorization_code=test-code&state='+s.state;
  const r=await f.request(path,s.cookie),cookie=r.headers.get('set-cookie')!.split(';')[0];assert.notEqual(cookie,s.cookie);assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.equal(r.headers.get('cache-control'),'no-store');
  const form=f.calls[0].init.body as URLSearchParams;assert.equal(form.get('redirect_uri'),redirect);assert.equal(form.get('app_key'),'test-app');assert.equal(form.get('code'),'test-code');
  const status=await(await f.request('/api/oauth/status',cookie)).json();assert.equal(status.authorized,true);assert.equal(status.stateVerified,true);assert.equal(status.profile.name,'测试知友');assert.doesNotMatch(JSON.stringify(status),/test-token|test-secret|test-app/);
  assert.equal((await f.request(path,s.cookie)).headers.get('location'),'/xiqianhua/#zhihu=failed');assert.equal(f.calls.filter(c=>c.url.endsWith('/access_token')).length,1);
  assert.equal((await(await f.request('/api/oauth/status',s.cookie)).json()).authorized,false);
});
test('OAuth: unsolicited, expired, mismatched and missing state callbacks cannot exchange',async t=>{
  const f=await fixture(t);await f.request('/auth/callback?code=test-code');
  for(const suffix of ['&state=wrong','']){const s=await f.start();await f.request('/auth/callback?code=test-code'+suffix,s.cookie);}
  const s=await f.start();f.advance(600001);await f.request('/auth/callback?code=test-code&state='+s.state,s.cookie);assert.equal(f.calls.length,0);
});
test('OAuth: temporary missing-state compatibility is explicit; old registered root callback uses exact URI',async t=>{
  const f=await fixture(t,{allowMissingState:true}),s=await f.start(true);assert.equal(s.url.searchParams.get('redirect_uri'),'https://edsionc.top/xiqianhua');
  const r=await f.request('?authorization_code=test-code',s.cookie),cookie=r.headers.get('set-cookie')!.split(';')[0];assert.equal((f.calls[0].init.body as URLSearchParams).get('redirect_uri'),'https://edsionc.top/xiqianhua');
  const status=await(await f.request('/api/oauth/status',cookie)).json();assert.equal(status.authorized,true);assert.equal(status.stateVerified,false);assert.equal(status.temporaryIntegration,true);
});
test('OAuth: five user APIs use both credentials, Limit 1 and do not disclose user records',async t=>{
  const f=await fixture(t),cookie=await f.login();const r=await f.request('/api/oauth/verify',cookie,'POST');const data=await r.json();assert.equal(data.results.length,5);assert.ok(data.results.every((x:{status:string})=>x.status==='success'));assert.doesNotMatch(JSON.stringify(data),/secretContent|do not expose|test-token/);
  const calls=f.calls.filter(c=>c.url.startsWith('https://developer.zhihu.com'));assert.equal(calls.length,5);for(const c of calls){assert.equal(new URL(c.url).searchParams.get('Limit'),'1');const h=new Headers(c.init.headers);assert.equal(h.get('Authorization'),'Bearer test-secret');assert.equal(h.get('X-OAuth-Token'),'test-token');assert.ok(h.has('X-Request-Timestamp'));}
  assert.equal(new URL(calls[3].url).searchParams.get('FavlistUrlToken'),'123');
  const blocked=await fetch(f.base+'/xiqianhua/api/oauth/verify',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json',Origin:'https://elsewhere.invalid'},body:'{}'});assert.equal(blocked.status,403);
  await f.request('/api/oauth/logout',cookie,'POST');assert.equal((await f.request('/api/oauth/verify',cookie,'POST')).status,401);
});
test('OAuth: expiry and service restart drop authorization',async t=>{
  const f=await fixture(t),cookie=await f.login();const other=await fixture(t);assert.equal((await(await other.request('/api/oauth/status',cookie)).json()).authorized,false);f.advance(61000);assert.equal((await f.request('/api/oauth/verify',cookie,'POST')).status,401);
});
test('OAuth: auth rejection stops remaining user requests without own-identity fallback',async t=>{
  const calls:string[]=[];const f=await fixture(t,{fetcher:async(url)=>{calls.push(String(url));return Response.json(String(url).endsWith('/access_token')?{access_token:'test-token'}:{Code:20001});}});const cookie=await f.login();const result=await(await f.request('/api/oauth/verify',cookie,'POST')).json();assert.equal(result.results[0].status,'error');assert.ok(result.results.slice(1).every((x:{status:string})=>x.status==='skipped'));assert.equal(calls.filter(x=>x.includes('/api/v1/user/')).length,1);assert.equal((await(await f.request('/api/oauth/status',cookie)).json()).authorized,false);
});
test('OAuth: failed favorites list skips dependent contents and never reports an empty list',async t=>{
  const urls:string[]=[];
  const f=await fixture(t,{fetcher:async(url)=>{const value=String(url);urls.push(value);return Response.json(value.endsWith('/access_token')?{access_token:'test-token'}:value.includes('/favlists?')?{Code:12345,Message:'test-secret must never be displayed'}:{Code:0,Data:{Items:[]}});}});
  const cookie=await f.login(),data=await(await f.request('/api/oauth/verify',cookie,'POST')).json();
  assert.equal(data.results[2].status,'error');assert.equal(data.results[2].code,12345);assert.equal(data.results[3].status,'skipped');assert.equal(data.results[4].status,'empty');assert.match(data.results[3].message,/尚未读取/);assert.doesNotMatch(JSON.stringify(data),/test-secret/);assert.ok(!urls.some(u=>u.includes('/favlist_contents?')));
});
test('OAuth: confirmed empty favorites list is distinguished from malformed upstream data',async t=>{
  for(const items of [[],null,[{}]]){
    const f=await fixture(t,{fetcher:async(url)=>Response.json(String(url).endsWith('/access_token')?{access_token:'test-token'}:{Code:0,Data:{Items:String(url).includes('/favlists?')?items:[]}})});
    const cookie=await f.login(),data=await(await f.request('/api/oauth/verify',cookie,'POST')).json();
    const empty=Array.isArray(items)&&items.length===0;
    assert.equal(data.results[2].status,empty?'empty':'error');assert.equal(data.results[3].status,empty?'empty':'skipped');
    if(!empty)assert.match(data.results[2].message,/格式不完整/);
  }
});
test('OAuth: transport errors include only a fixed explanation and safe status code',async t=>{
  const f=await fixture(t,{fetcher:async(url)=>String(url).includes('/favlists?')?new Response('sensitive upstream response',{status:503}):Response.json(String(url).endsWith('/access_token')?{access_token:'test-token'}:{Code:0,Data:{Items:[]}})});
  const cookie=await f.login(),data=await(await f.request('/api/oauth/verify',cookie,'POST')).json();assert.equal(data.results[2].code,503);assert.equal(data.results[3].status,'skipped');assert.doesNotMatch(JSON.stringify(data),/sensitive upstream/);
});
test('macOS credentials support official CLI keyring encoding and plain app keys',()=>{
  assert.equal(decodeKeychainValue('plain-test-app\n'),'plain-test-app');
  assert.equal(decodeKeychainValue('go-keyring-base64:'+Buffer.from('test-secret').toString('base64')),'test-secret');
  assert.equal(decodeKeychainValue('go-keyring-base64:bad!!'),'');
});
