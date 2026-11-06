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
const setHTML=(id,html)=>{const el=$(id);if(!el)return;el.innerHTML=html;};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const api=(p,o={})=>{
  if(PLAN_B){
    let url=null;
    if(p==='/api/state')url=`${BASE}/d/${D}/state.json`;
    else if(p==='/api/activity')url=`${BASE}/d/${D}/activity.json`;
    else if(p.startsWith('/api/coin/'))url=`${BASE}/d/${D}/coin/${p.slice('/api/coin/'.length)}.json`;
    else if(p==='/api/account')url=`${BASE}/d/${D}/state.json`;
    else return Promise.reject(new Error('read-only in Plan B'));
    return fetch(url,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()});
  }
  return fetch(p,{...o,headers:{'Authorization':'Bearer '+T,'Content-Type':'application/json',...(o.headers||{})}})
    .then(r=>{if(!r.ok)throw new Error(r.status);return r.json()});
};
let shown=0;function odo(v){const s=shown,t0=performance.now();const f=n=>{const k=Math.min(1,(n-t0)/600);$('bal').textContent='$'+(s+(v-s)*k).toFixed(2);if(k<1)requestAnimationFrame(f)};requestAnimationFrame(f);shown=v}
function err(m){$('err').hidden=!m;$('err').textContent=m||''}

function hbStatus(hb){
  if(!hb) return 'off';
  const st=String(hb.status||'').toLowerCase();
  if(hb.paused) return 'warn';
  if(st==='ok'||st==='following'||st==='guarding'||st==='working') return 'ok';
  if(st==='off'||st==='stopped') return 'off';
  return 'warn';
}
function hbAgeOk(hb){
  if(!hb||!hb.ts) return false;
  const t=Date.parse(hb.ts);
  if(!Number.isFinite(t)) return false;
  return (Date.now()-t) < 120000; // 2 min
}
function agentTone(hb){
  const base=hbStatus(hb);
  if(base==='ok' && !hbAgeOk(hb)) return 'warn';
  return base;
}

function runbar(a){
  if(!a){setHTML('runbar','<span class="run-pill muted">—</span>');return}
  const keys=['scanner','auditor','analyst','executor','risk','copy'];
  let ok=0,warn=0,off=0;
  keys.forEach(k=>{
    if(!a[k]){off++;return}
    const t=agentTone(a[k].hb);
    if(t==='ok')ok++; else if(t==='off')off++; else warn++;
  });
  const total=keys.filter(k=>a[k]).length || keys.length;
  const running=ok+warn;
  const mainCls = off===total ? 'off' : (warn ? 'warn' : 'ok');
  setHTML('runbar',
    `<span class="run-pill ${mainCls}"><span class="hb"></span>${running} running</span>` +
    (ok ? `<span class="run-pill ok">${ok} ok</span>` : '') +
    (warn ? `<span class="run-pill warn">${warn} lag</span>` : '') +
    (off ? `<span class="run-pill off">${off} off</span>` : ''));
}

function squareNote(key, ag){
  if(!ag) return '—';
  if(key==='scanner') return `${ag.pools??0} pools`;
  if(key==='auditor') return `${ag.taken??0} taken · ${ag.rejected??0} rej`;
  if(key==='analyst') return `score ${(ag.last&&ag.last.score)!=null?ag.last.score:'—'} · ${ag.mode||''}`;
  if(key==='executor') return `${ag.trades??0} trades · ${ag.stack_pct??'—'}%`;
  if(key==='risk') return ag.guarding ? `guard · stop -${ag.stop_pct}%` : `idle · stop -${ag.stop_pct}%`;
  if(key==='copy'){
    const handles=String(ag.handles||'').replace(/^"|"$/g,'').split(',').filter(Boolean);
    const n=handles.length;
    const st=(ag.hb&&ag.hb.status)|| (ag.enabled?'ok':'off');
    return `${n} handles · ${ag.open||0} open · ${st}`;
  }
  return (ag.hb&&ag.hb.note)||'';
}
function squareStat(key, ag){
  const hb=ag&&ag.hb;
  const st=hb&&hb.status ? String(hb.status) : (ag?'idle':'missing');
  return st;
}

function agrid(a){
  const order=[
    ['scanner','Scanner'],
    ['auditor','Auditor'],
    ['analyst','Analyst'],
    ['executor','Executor'],
    ['risk','Risk'],
    ['copy','Copy'],
  ];
  if(!a){setHTML('agrid','');return}
  setHTML('agrid',order.map(([k,label])=>{
    const ag=a[k]||{};
    const tone=agentTone(ag.hb);
    const cls=['asq',tone,k==='copy'?'copy':''].filter(Boolean).join(' ');
    return `<div class="${cls}" data-agent="${k}">
      <div class="aname">${esc(label)}</div>
      <div class="astat">${esc(squareStat(k,ag))}</div>
      <div class="anote">${esc(squareNote(k,ag))}</div>
    </div>`;
  }).join(''));
}

function renderPositions(positions){
  const list=Array.isArray(positions)?positions:[];
  if(!list.length){
    setHTML('pos','<div class="empty">Aucune position · No open positions</div>');
    return;
  }
  setHTML('pos',list.map(p=>`<div class="row"><span onclick="coin('${esc(p.mint)}')">${esc(p.name)}<small>$${p.size_usd} @ ${p.entry_price} · stop -${p.stop_pct}%</small></span><a href="${esc(p.link)}" target="_blank">Sell on FOMO</a></div>`).join(''));
}

function renderActivity(activity){
  const list=Array.isArray(activity)?activity:[];
  if(!list.length){
    setHTML('act','<div class="empty">Nothing yet tonight</div>');
    return;
  }
  setHTML('act',list.map(a=>{
    const kind=esc(a.kind||'info');
    const title=a.link
      ? `<a href="${esc(a.link)}" target="_blank">${esc(a.title)}</a>`
      : esc(a.title);
    const mode=a.mode==='PAPER'?'PAPER · ':'';
    return `<div class="act-item ${kind}">
      <div class="rail"></div>
      <div class="abody"><div class="atitle">${mode}${title}</div><span class="asub">${esc(a.sub||'')}</span></div>
      <div class="aright">${esc(a.right||'')}</div>
    </div>`;
  }).join(''));
}

function drawEquity(series){
  const cv=$('eqchart');
  if(!cv) return;
  const prices=Array.isArray(series)?series:[];
  if(typeof drawChart==='function'){
    drawChart(cv, prices.length?prices:[{price:shown||0},{price:shown||0}], null);
  }
}

async function load(){try{const s=await api('/api/state');err();$('badge').textContent=s.mode+(PLAN_B?' · B':'');$('badge').className='badge'+(s.mode=='LIVE'?' live':'');odo(s.balance);
$('ticket').textContent=s.ticket&&s.ticket.message||'';
renderPositions(s.positions);
renderActivity(s.activity);
agrid(s.agents);
cards(s.agents);
runbar(s.agents);
drawEquity(s.equity);
$('conn').className='dot ok'}catch(e){err(PLAN_B?(e.message=='404'?'Data path not published yet':'Desk data unreachable ('+e.message+')'):(e.message=='401'?'Not signed in. Open the app link with #t=…':'Desk unreachable ('+e.message+')'));$('conn').className='dot'}}

function cards(a){if(!a)return;const sc=a.scanner||{},au=a.auditor||{},an=a.analyst||{},ex=a.executor||{},rk=a.risk||{},copy=a.copy||{};
const L=au.last;const strips=L&&L.layers?L.layers.map(l=>`<div class="strip ${l.pass===true?'p':l.pass===false?'f':''}"></div>`).join(''):'<div class="strip"></div>'.repeat(8);
const v=an.last;
const handles=String(copy.handles||'').replace(/^"|"$/g,'');
setHTML('cards',`
<div class="card"><b>Scanner</b><div>${sc.pools??0} pools</div>${(sc.feed||[]).slice(0,6).map(f=>{let j={};try{j=typeof f.json==='string'?JSON.parse(f.json):f.json||{}}catch(e){}return `<div class="${f.verdict=='kill'?'kill':''}">${esc(j.name||(f.mint||'').slice(0,6))} ${f.verdict=='pass'?'· liq $'+Math.round(j.liquidityUsd||0)+' · → auditor':'· '+esc(f.reason)}</div>`}).join('')}</div>
<div class="card"><b>Auditor</b><div>${au.taken??0} taken apart · ${au.rejected??0} rejected</div><div class="strips">${strips}</div><div>${L?(L.passed?'8/8 → Executor':esc(L.reason)):''}</div></div>
<div class="card"><b>Analyst${an.mode=='rules'?' (rules)':''}</b><div>Scoring ${v?v.score:'—'}</div></div>
<div class="card"><b>Executor</b><div>${ex.trades??0} trades · ${ex.stack_pct??'—'}% of stack</div></div>
<div class="card"><b>Risk</b><div>${rk.guarding?'Guarding':'Idle'}</div><span class="pill red">stop -${rk.stop_pct??'—'}%</span><span class="pill green">trail ${rk.trail_pct??'—'}%</span></div>
<div class="card"><b>Copy</b><div>${copy.enabled?'PAPER following':'Off'} · ${copy.open||0} open</div>
<div class="anote" style="font-family:var(--mono);font-size:12px;color:var(--muted-2);margin-top:6px">@${esc(handles)} · +${esc(copy.delay_s)}s · TP ${esc(copy.tp_mult)}× · lock ${esc(copy.lock_time)} ET</div>
<div style="font-family:var(--mono);font-size:11px;color:var(--muted-2);margin-top:4px">${esc((copy.hb&&copy.hb.note)||'')}</div></div>`);}

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
