(()=>{
  const hd=location.hash.match(/[?&#]d=([^&]+)/)||location.hash.match(/^#d=([^&]+)/)||location.hash.match(/d=([^&]+)/);
  const ht=location.hash.match(/[?&#]t=([^&]+)/)||location.hash.match(/t=([^&]+)/);
  if(hd){localStorage.setItem('d',decodeURIComponent(hd[1]));history.replaceState(null,'',location.pathname+location.search)}
  if(ht){localStorage.setItem('t',decodeURIComponent(ht[1]));history.replaceState(null,'',location.pathname+location.search)}
})();
const D=localStorage.getItem('d')||'';
const T=localStorage.getItem('t')||'';
const PLAN_B=!!D;
const BASE=(()=>{const p=location.pathname;if(p.endsWith('/'))return p.slice(0,-1);const i=p.lastIndexOf('/');return i<=0?'':p.slice(0,i)})();
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const api=(p,o={})=>{
  if(PLAN_B){
    // Map API paths to Plan B static JSON under /d/{DATA_PATH}/
    let url=null;
    if(p==='/api/state')url=`${BASE}/d/${D}/state.json`;
    else if(p==='/api/activity')url=`${BASE}/d/${D}/activity.json`;
    else if(p.startsWith('/api/coin/'))url=`${BASE}/d/${D}/coin/${p.slice('/api/coin/'.length)}.json`;
    else if(p==='/api/account')url=`${BASE}/d/${D}/state.json`; // settings embedded, read-only
    else return Promise.reject(new Error('read-only in Plan B'));
    return fetch(url,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()});
  }
  return fetch(p,{...o,headers:{'Authorization':'Bearer '+T,'Content-Type':'application/json',...(o.headers||{})}})
    .then(r=>{if(!r.ok)throw new Error(r.status);return r.json()});
};
let shown=0;function odo(v){const s=shown,t0=performance.now();const f=n=>{const k=Math.min(1,(n-t0)/600);$('bal').textContent='$'+(s+(v-s)*k).toFixed(2);if(k<1)requestAnimationFrame(f)};requestAnimationFrame(f);shown=v}
function err(m){$('err').hidden=!m;$('err').textContent=m||''}
async function load(){try{const s=await api('/api/state');err();$('badge').textContent=s.mode+(PLAN_B?' · B':'');$('badge').className='badge'+(s.mode=='LIVE'?' live':'');odo(s.balance);
$('ticket').textContent=s.ticket&&s.ticket.message||'';
$('pos').innerHTML=s.positions.length?s.positions.map(p=>`<div class="row"><span onclick="coin('${p.mint}')">${esc(p.name)}<small>$${p.size_usd} @ ${p.entry_price} · stop -${p.stop_pct}%</small></span><a href="${p.link}" target="_blank">Sell on FOMO</a></div>`).join(''):'<div class="empty">No open positions</div>';
$('act').innerHTML=s.activity.length?s.activity.map(a=>`<div class="row"><span>${a.mode=='PAPER'?'PAPER · ':''}${a.link?`<a href="${a.link}" target="_blank">${esc(a.title)}</a>`:esc(a.title)}<small>${esc(a.sub)}</small></span><span>${esc(a.right)}</span></div>`).join(''):'<div class="empty">Nothing yet tonight</div>';
cards(s.agents);$('conn').className='dot ok'}catch(e){err(PLAN_B?(e.message=='404'?'Data path not published yet':'Desk data unreachable ('+e.message+')'):(e.message=='401'?'Not signed in. Open the app link with #t=…':'Desk unreachable ('+e.message+')'));$('conn').className='dot'}}
function cards(a){if(!a)return;const L=a.auditor&&a.auditor.last;const strips=L&&L.layers?L.layers.map(l=>`<div class="strip ${l.pass===true?'p':l.pass===false?'f':''}"></div>`).join(''):'<div class="strip"></div>'.repeat(8);
const v=a.analyst&&a.analyst.last;$('cards').innerHTML=`
<div class="card"><b>Scanner</b><div>${a.scanner.pools} pools</div>${(a.scanner.feed||[]).slice(0,6).map(f=>{let j={};try{j=typeof f.json==='string'?JSON.parse(f.json):f.json||{}}catch(e){}return `<div class="${f.verdict=='kill'?'kill':''}">${esc(j.name||(f.mint||'').slice(0,6))} ${f.verdict=='pass'?'· liq $'+Math.round(j.liquidityUsd||0)+' · → auditor':'· '+esc(f.reason)}</div>`}).join('')}</div>
<div class="card" onclick="tab('agents')"><b>Auditor</b><div>${a.auditor.taken} taken apart · ${a.auditor.rejected} rejected</div><div class="strips">${strips}</div><div>${L?(L.passed?'8/8 → Executor':esc(L.reason)):''}</div></div>
<div class="card"><b>Analyst${a.analyst.mode=='rules'?' (rules)':''}</b><div>Scoring ${v?v.score:'—'}</div></div>
<div class="card"><b>Executor</b><div>${a.executor.trades} trades · ${a.executor.stack_pct}% of stack</div></div>
<div class="card"><b>Risk</b><div>${a.risk.guarding?'Guarding':'Idle'}</div><span class="pill red">stop -${a.risk.stop_pct}%</span><span class="pill green">trail ${a.risk.trail_pct}%</span></div>`}
async function coin(m){tab('coin');try{const c=await api('/api/coin/'+m);$('coinv').innerHTML=`<b>${esc(c.name)}</b> <a href="${c.link}" target="_blank">Open on FOMO</a><div>holders ${c.holders??'—'}</div>`;
const p=c.position;drawChart($('chart'),c.prices||[],p&&p.status!='closed'?p.entry_price*(1-p.stop_pct/100):null)}catch(e){$('coinv').textContent='Could not load coin'}}
async function account(){try{const a=await api('/api/account');
  const settings=a.settings||{};
  const handle=a.fomo_handle||settings['desk.fomo_handle']||'';
  const profile=a.profile_url||'';
  const signup=a.signup_url||'';
  let html=`<div class="card">FOMO @${esc(handle)}`;
  if(profile)html+=` · <a href="${profile}" target="_blank">profile</a>`;
  if(signup)html+=`<br><a href="${signup}" target="_blank">Invite</a>`;
  if(PLAN_B)html+=`<br><small style="color:#8e8e93">Plan B · settings read-only (change on the desk host)</small>`;
  html+=`</div>`;
  html+=Object.entries(settings).map(([k,v])=>PLAN_B
    ?`<div class="row"><span>${esc(k)}</span><span style="color:#8e8e93">${esc(v)}</span></div>`
    :`<div class="row"><span>${esc(k)}</span><input data-k="${esc(k)}" value="${esc(v)}" style="width:110px;background:#1c1c1e;color:#fff;border:0"></div>`
  ).join('');
  $('acct').innerHTML=html;
  if(!PLAN_B){
    document.querySelectorAll('[data-k]').forEach(i=>i.onchange=async()=>{const r=await api('/api/settings',{method:'POST',body:JSON.stringify({key:i.dataset.k,value:i.value})});$('reply').textContent=r.reply});
    window._vapid=a.vapid_public_key;
  }else{
    $('cmdf').querySelector('button').disabled=true;
    $('cmd').placeholder='Commands disabled in Plan B';
    $('pushbtn').disabled=true;
    $('pushbtn').textContent='Push needs Plan A / Telegram';
  }
}catch(e){$('acct').textContent='Could not load account'}}
function tab(t){document.querySelectorAll('.tab').forEach(s=>s.classList.toggle('on',s.id==t));document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t==t));if(t=='account')account()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>tab(b.dataset.t));
$('cmdf').onsubmit=async e=>{e.preventDefault();if(PLAN_B){$('reply').textContent='Plan B is read-only';return}const r=await api('/api/command',{method:'POST',body:JSON.stringify({text:$('cmd').value})});$('reply').textContent=r.reply+(r.buttons?'\n'+r.buttons.map(b=>b.label+': '+(b.url||'')).join('\n'):'')};
$('pushbtn').onclick=async()=>{if(PLAN_B){$('reply').textContent='Web push needs Plan A';return}try{const reg=await navigator.serviceWorker.register(BASE+'/sw.js');const k=window._vapid;const b=atob(k.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-k.length%4)%4));
const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(b,c=>c.charCodeAt(0))});await api('/api/push/subscribe',{method:'POST',body:JSON.stringify(sub)});$('reply').textContent='Push on'}catch(e){$('reply').textContent='Push failed: '+e.message}};
if('serviceWorker'in navigator)navigator.serviceWorker.register(BASE+'/sw.js').catch(()=>{});
load();setInterval(load,PLAN_B?15000:10000);
if(!PLAN_B){try{const es=new EventSource('/api/stream?token='+encodeURIComponent(T));es.onopen=()=>$('conn').className='dot ok';es.onerror=()=>$('conn').className='dot';['scan','audit','audit_layer','verdict','signal','exit'].forEach(ev=>es.addEventListener(ev,()=>load()))}catch(e){}}
