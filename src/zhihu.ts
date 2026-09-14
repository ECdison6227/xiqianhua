import {BASE,esc} from './core';

export async function showZhihuAccount(container:HTMLElement){
  async function request(path:string,method='GET'){
    const response=await fetch(`${BASE}api/oauth/${path}`,{method,credentials:'same-origin',signal:AbortSignal.timeout(30000),...(method==='POST'?{headers:{'Content-Type':'application/json'},body:'{}'}:{})});
    const data=await response.json();if(!response.ok)throw new Error(data.message??'连接暂时不可用，请稍后再试。');return data;
  }
  try{
    const status=await request('status');if(!container.isConnected)return;
    container.innerHTML=`<h2>${status.authorized?'已连接知乎账号':'与你在知乎继续讨论'}</h2>
      ${status.profile?.name?`<p>${esc(status.profile.name)}</p>`:''}
      <p>知乎连接为可选功能。阅读存档仍保存在当前浏览器，连接或断开账号不会更改游戏进度。</p>
      ${status.message?`<p role="status">${esc(status.message)}</p>`:''}
      ${status.authorized?'<p>授权信息仅保存在服务器内存中，到期或服务重启后需要重新连接。这里不会自动发表内容。</p><button id="zhihu-verify">核验授权接口</button> <button id="zhihu-logout">断开本次连接</button>':status.configured?`<p>继续后将前往知乎，由你确认授权。</p><a class="button" href="${BASE}api/oauth/start">连接知乎账号 →</a>`:'<p role="status">知乎连接正在配置中，暂时不能发起授权。你可以返回游戏继续探索。</p>'}
      ${status.temporaryIntegration?'<p class="subtle">当前接入用于黑客松临时联调。知乎未返回登录校验信息时，会明确标记本次连接的验证状态。</p>':''}
      ${status.authorized&&status.stateVerified===false?'<p role="status">本次知乎回调未返回 state，未完成浏览器状态校验，仅适合临时联调。</p>':''}
      <div id="zhihu-result" aria-live="polite"></div>`;
    const result=container.querySelector<HTMLElement>('#zhihu-result')!;
    container.querySelector<HTMLButtonElement>('#zhihu-verify')?.addEventListener('click',async(event)=>{
      const button=event.currentTarget as HTMLButtonElement;button.disabled=true;result.textContent='正在逐项核验，每个接口最多读取一条记录…';
      try{const data=await request('verify','POST');if(container.isConnected)result.innerHTML='<ul>'+data.results.map((r:{name:string;status:string;count:number})=>`<li>${esc(r.name)}：${({success:'成功',empty:'无记录',error:'暂未通过',skipped:'未执行'} as Record<string,string>)[r.status]??'暂未通过'}</li>`).join('')+'</ul>';}
      catch(e){result.textContent=e instanceof Error?e.message:'核验暂未完成。';}finally{button.disabled=false;}
    });
    container.querySelector<HTMLButtonElement>('#zhihu-logout')?.addEventListener('click',async()=>{
      try{await request('logout','POST');await showZhihuAccount(container);}catch(e){result.textContent=e instanceof Error?e.message:'断开连接未完成。';}
    });
  }catch(e){if(container.isConnected)container.innerHTML=`<p role="status">${esc(e instanceof Error?e.message:'连接暂时不可用。')}</p>`;}
}
