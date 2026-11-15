(function(){
'use strict';
var API='https://iddzcbknnddkonrcwgpt.supabase.co/functions/v1/ssuite-checkin';
var TK='ssuite_checkin_token',CK='ssuite_checkin_cache',QK='ssuite_checkin_queue';
var $=function(id){return document.getElementById(id);};
var S={guests:[],tables:[],log:[],lastId:0,byKey:{},byT:{},status:{},walkups:[],filter:'all',q:'',online:true,asOf:null,staff:'',event:null};
var queue=[];try{queue=JSON.parse(localStorage.getItem(QK)||'[]');}catch(e){queue=[];}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fold(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function tok(){try{var t=JSON.parse(localStorage.getItem(TK)||'null');if(t&&t.exp>Date.now())return t;}catch(e){}return null;}
function signOut(){localStorage.removeItem(TK);location.reload();}
async function call(path,opts){opts=opts||{};var t=tok();var h={'content-type':'application/json'};if(t)h.authorization='Bearer '+t.v;var r=await fetch(API+path,Object.assign({},opts,{headers:h,cache:'no-store'}));var j={};try{j=await r.json();}catch(e){}if(r.status===401&&path!=='/login'){signOut();throw new Error('Session expired');}if(!r.ok){var er=new Error(j.error||'Request failed');er.status=r.status;throw er;}return j;}
function toast(m,ms){var t=$('toast');t.textContent=m;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(function(){t.hidden=true;},ms||2200);}
function uid(){return (crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2));}
function fmtTime(at){try{return new Date(at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'});}catch(e){return '';}}
// ---------- state ----------
function rebuild(){
  S.byKey={};S.byT={};S.guests.forEach(function(g){S.byKey[g.key]=g;if(g.t)S.byT[g.t]=g;});
  var st={},walk={};
  S.log.concat(queue.map(function(q){return {guest_key:q.key,guest_name:q.name,action:q.action,staff:S.staff,note:q.note,at:q.at,pending:true,client_id:q.clientId};})).forEach(function(e){
    if(e.action==='walkup'){walk[e.guest_key]={key:e.guest_key,name:e.guest_name,note:e.note,staff:e.staff,at:e.at,pending:e.pending};st[e.guest_key]={in:true,at:e.at,staff:e.staff,pending:e.pending};return;}
    if(e.action==='in')st[e.guest_key]={in:true,at:e.at,staff:e.staff,pending:e.pending};
    else if(e.action==='undo')st[e.guest_key]={in:false,at:e.at,staff:e.staff,pending:e.pending};
  });
  S.status=st;S.walkups=Object.keys(walk).map(function(k){return walk[k];});
}
function isIn(k){return !!(S.status[k]&&S.status[k].in);}
function saveCache(){try{localStorage.setItem(CK,JSON.stringify({guests:S.guests,tables:S.tables,log:S.log,lastId:S.lastId,asOf:S.asOf,event:S.event,staff:S.staff}));}catch(e){}}
function loadCache(){try{var c=JSON.parse(localStorage.getItem(CK)||'null');if(c){S.guests=c.guests||[];S.tables=c.tables||[];S.log=c.log||[];S.lastId=c.lastId||0;S.asOf=c.asOf;S.event=c.event;S.staff=c.staff||'';}}catch(e){}}
function setSync(){var el=$('sync');if(!S.online){el.className='sync off';el.textContent='Offline'+(queue.length?' · '+queue.length+' saved on device':'');}else if(queue.length){el.className='sync pend';el.textContent='Syncing '+queue.length+'…';}else{el.className='sync';el.textContent='Live';}}
// ---------- rendering ----------
function counts(){var exp=0,arr=0;S.guests.forEach(function(g){exp++;if(isIn(g.key))arr++;});$('arrived').textContent=arr;$('expected').textContent=exp;}
function sub(g){var b=[];if(g.title||g.company)b.push([g.title,g.company].filter(Boolean).join(', '));if(g.with)b.push('With '+g.with);return b.join(' · ');}
function lastName(n){var p=String(n).replace(/\(.*?\)/g,'').trim().split(/\s+/);return p[p.length-1]||n;}
function matches(g,q){if(!q)return true;if(/^\d{1,2}$/.test(q))return String(g.table)===q;var hay=fold([g.name,g.company,g.with,g.title].join(' '));return fold(q).split(/\s+/).every(function(w){return hay.indexOf(w)>=0;});}
function render(){
  counts();setSync();
  var q=S.q.trim(),f=S.filter,list=$('list'),rows=[];
  if(f==='walk'){
    rows=S.walkups.filter(function(w){return matches({name:w.name,company:w.note},q);}).map(function(w){return '<div class="row in"><div class="who"><div class="nm">'+esc(w.name)+'<span class="tag walk">Walk-up</span></div><div class="sub">'+esc((w.note||'No note')+' · '+fmtTime(w.at)+' · '+w.staff)+'</div></div><div class="tbl none"><small>TABLE</small><b>Host desk</b></div></div>';});
  } else {
    var gs=S.guests.filter(function(g){if(f==='todo'&&isIn(g.key))return false;if(f==='done'&&!isIn(g.key))return false;if(f==='hon'&&!g.honor)return false;if(f==='notable'&&g.table!=null)return false;return matches(g,q);});
    gs.sort(function(a,b){return a.name.localeCompare(b.name);});
    if(f==='done')gs.sort(function(a,b){return String((S.status[b.key]||{}).at).localeCompare(String((S.status[a.key]||{}).at));});
    rows=gs.slice(0,400).map(function(g){var i=isIn(g.key);return '<button class="row'+(i?' in':'')+'" data-k="'+esc(g.key)+'"><span class="tick">✓</span><div class="who"><div class="nm">'+esc(g.name)+(g.honor?'<span class="tag hon">Honoree</span>':'')+(g.placeholder?'<span class="tag ph">Name pending</span>':'')+'</div><div class="sub">'+esc(sub(g)||' ')+'</div></div>'+(g.table!=null?'<div class="tbl"><small>TABLE</small><b>'+g.table+'</b></div>':'<div class="tbl none"><small>TABLE</small><b>TBD</b></div>')+'</button>';});
  }
  list.innerHTML=rows.length?rows.join(''):'<p class="empty">'+(q?'No one matches “'+esc(q)+'”. Try a last name, company, or table number — or log a walk-up.':'No guests here.')+'</p>';
  $('foot').textContent=S.asOf?'Seating as of '+fmtTime(S.asOf)+' · updates automatically':'';
  if(!$('sheet').hidden&&S.open)openGuest(S.open,true);
  if(!$('tablesView').hidden)renderTables();
}
function openGuest(key,refresh){
  var g=S.byKey[key];if(!g)return;S.open=key;var st=S.status[key],i=!!(st&&st.in);
  var facts=[];
  if(g.honor)facts.push(['Honoree',g.honor+' Honor']);
  if(g.with)facts.push(['Arriving with',g.with]);
  if(g.meal)facts.push(['Meal',g.meal]);
  if(g.diet)facts.push(['Dietary',g.diet]);
  if(g.access)facts.push(['Accessibility',g.access]);
  if(g.placeholder)facts.push(['Note','Guest name not yet provided — confirm with the host']);
  var h='<div class="d-name">'+esc(g.name)+'</div><div class="d-sub">'+esc([g.title,g.company].filter(Boolean).join(', '))+'</div>';
  h+=g.table!=null?'<div class="d-table"><small>TABLE</small><b>'+g.table+'</b></div>':'<div class="d-table none"><small>TABLE</small><b>See host desk</b></div>';
  if(facts.length)h+='<div class="d-facts">'+facts.map(function(f){return '<div><span>'+esc(f[0])+'</span><b>'+esc(f[1])+'</b></div>';}).join('')+'</div>';
  h+=i?'<div class="done">✓ Checked in '+esc(fmtTime(st.at))+' · '+esc(st.staff)+(st.pending?' · saving…':'')+'</div><button class="linkbtn" id="undoBtn">Undo check-in</button>':'<button class="primary" id="ciBtn">Check in</button>';
  $('sheetBody').innerHTML=h;$('sheet').hidden=false;
  var b=$('ciBtn');if(b)b.onclick=function(){act('in',g.key,g.name);};
  var u=$('undoBtn');if(u)u.onclick=function(){if(confirm('Undo check-in for '+g.name+'?'))act('undo',g.key,g.name);};
}
function renderTables(){
  var by={};S.guests.forEach(function(g){if(g.table==null)return;var t=by[g.table]||(by[g.table]={n:g.table,seated:0,in:0});t.seated++;if(isIn(g.key))t.in++;});
  var ts=Object.keys(by).map(function(k){return by[k];}).sort(function(a,b){return a.n-b.n;});
  $('tablesGrid').innerHTML=ts.map(function(t){return '<button class="tcell'+(t.in>=t.seated?' full':'')+'" data-t="'+t.n+'"><b>'+t.n+'</b><span>'+t.in+' / '+t.seated+' arrived</span></button>';}).join('');
}
// ---------- actions ----------
async function act(action,key,name,note){
  var cid=uid();if(action==='walkup')key='walkup:'+cid;var q={clientId:cid,action:action,key:key,name:name,note:note||'',at:new Date().toISOString()};
  queue.push(q);localStorage.setItem(QK,JSON.stringify(queue));rebuild();render();
  if(action==='in')toast(name+' checked in');
  flush();
}
var flushing=false;
async function flush(){
  if(flushing||!queue.length)return;flushing=true;
  try{while(queue.length){var q=queue[0];try{await call('/action',{method:'POST',body:JSON.stringify({action:q.action,key:q.key,name:q.name,note:q.note,clientId:q.clientId})});S.online=true;}catch(e){if(e.status&&e.status<500&&e.status!==429){toast('Couldn’t save: '+e.message,4000);}else{S.online=false;break;}}queue.shift();localStorage.setItem(QK,JSON.stringify(queue));}
  }finally{flushing=false;}
  await pull();
}
async function pull(){
  try{var j=await call('/log?since='+S.lastId);S.online=true;(j.log||[]).forEach(function(e){if(e.id>S.lastId){S.log.push(e);S.lastId=e.id;}});
    // drop queued items already recorded server-side
    rebuild();saveCache();render();
  }catch(e){S.online=false;setSync();}
}
async function loadRoster(){
  var j=await call('/roster');S.online=true;S.guests=j.guests||[];S.tables=j.tables||[];S.log=j.log||[];S.lastId=S.log.length?S.log[S.log.length-1].id:0;S.asOf=j.asOf;S.event=j.event;S.staff=j.staff||S.staff;
  $('who').textContent=S.staff;rebuild();saveCache();render();
}
// ---------- scanner ----------
var stream=null,scanning=false,lastScan='';
async function openScanner(){
  $('scanner').hidden=false;$('scanMsg').textContent='Point the camera at the guest’s pass QR code';lastScan='';
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});var v=$('video');v.srcObject=stream;await v.play();scanning=true;requestAnimationFrame(tick);}
  catch(e){$('scanMsg').textContent='Camera unavailable. Allow camera access in your browser settings, or search by name.';}
}
function closeScanner(){scanning=false;$('scanner').hidden=true;if(stream){stream.getTracks().forEach(function(t){t.stop();});stream=null;}}
var lastTick=0;
function tick(ts){
  if(!scanning)return;requestAnimationFrame(tick);if(ts-lastTick<120)return;lastTick=ts;
  var v=$('video');if(v.readyState<2)return;var c=$('canvas'),w=v.videoWidth,h=v.videoHeight,s=Math.min(1,640/Math.max(w,h));c.width=Math.round(w*s);c.height=Math.round(h*s);
  var ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(v,0,0,c.width,c.height);var img=ctx.getImageData(0,0,c.width,c.height);
  var code=window.jsQR&&window.jsQR(img.data,img.width,img.height,{inversionAttempts:'dontInvert'});if(!code||!code.data||code.data===lastScan)return;lastScan=code.data;
  var t='';try{t=new URL(code.data).searchParams.get('t')||'';}catch(e){var m=String(code.data).match(/[A-Za-z0-9_-]{22}/);t=m?m[0]:'';}
  var g=S.byT[t];
  if(!g){$('scanMsg').textContent='This code isn’t an S.SUITE guest pass. Try search instead.';setTimeout(function(){lastScan='';},2500);return;}
  if(navigator.vibrate)navigator.vibrate(60);closeScanner();openGuest(g.key);
}
// ---------- print ----------
function printList(){
  var gs=S.guests.slice().sort(function(a,b){return lastName(a.name).localeCompare(lastName(b.name))||a.name.localeCompare(b.name);});
  var cur='',h='<h1>S.SUITE · Door list</h1><p class="meta">Alphabetical by last name · '+gs.length+' guests · seating as of '+esc(new Date(S.asOf||Date.now()).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))+' ET · ✓ = checked in when printed</p><div class="cols">';
  gs.forEach(function(g){var L=fold(lastName(g.name)).charAt(0).toUpperCase();if(L!==cur){cur=L;h+='<div class="letter">'+esc(L)+'</div>';}h+='<div class="pr"><span class="box">'+(isIn(g.key)?'✓':'')+'</span><span class="n">'+esc(g.name)+(g.honor?' (Honoree)':'')+'</span><span class="t">'+(g.table!=null?'Table '+g.table:'Host desk')+'</span></div>';});
  h+='</div>';$('printArea').innerHTML=h;$('menu').hidden=true;setTimeout(function(){window.print();},50);
}
// ---------- wiring ----------
function bind(){
  $('q').addEventListener('input',function(e){S.q=e.target.value;render();});
  $('chips').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;S.filter=b.dataset.f;[].forEach.call($('chips').children,function(x){x.classList.toggle('on',x===b);});render();});
  $('list').addEventListener('click',function(e){var b=e.target.closest('[data-k]');if(b)openGuest(b.dataset.k);});
  document.addEventListener('click',function(e){if(e.target.matches('[data-close]')||e.target.classList.contains('overlay')&&!e.target.classList.contains('dark')){var o=e.target.closest('.overlay');o.hidden=true;if(o.id==='sheet'){S.open=null;$('q').focus();}}});
  $('btnScan').onclick=openScanner;$('scanClose').onclick=closeScanner;
  $('btnTables').onclick=function(){renderTables();$('tablesView').hidden=false;};
  $('tablesGrid').onclick=function(e){var b=e.target.closest('[data-t]');if(!b)return;$('tablesView').hidden=true;S.q=b.dataset.t;$('q').value=S.q;S.filter='all';[].forEach.call($('chips').children,function(x){x.classList.toggle('on',x.dataset.f==='all');});render();};
  $('btnWalkup').onclick=function(){$('walkName').value=S.q&&!/^\d+$/.test(S.q)?S.q:'';$('walkNote').value='';$('walkView').hidden=false;$('walkName').focus();};
  $('walkSave').onclick=function(){var n=$('walkName').value.trim();if(!n){$('walkName').focus();return;}act('walkup','',n,$('walkNote').value.trim());$('walkView').hidden=true;toast('Walk-up logged — send them to the host desk',3000);};
  $('mTables').onclick=function(){$('menu').hidden=true;$('btnTables').click();};$('mWalkup').onclick=function(){$('menu').hidden=true;$('btnWalkup').click();};
  $('btnMenu').onclick=function(){$('menu').hidden=!$('menu').hidden;};
  $('btnPrint').onclick=printList;
  $('btnRefresh').onclick=function(){$('menu').hidden=true;loadRoster().then(function(){toast('Seating refreshed');}).catch(function(){toast('Offline — using saved list');});};
  $('btnSignout').onclick=function(){if(queue.length&&!confirm(queue.length+' check-ins haven’t synced yet. Sign out anyway?'))return;signOut();};
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){['sheet','tablesView','walkView'].forEach(function(id){$(id).hidden=true;});closeScanner();}else if(e.key==='Enter'&&document.activeElement===$('q')){var f=$('list').querySelector('[data-k]');if(f)openGuest(f.dataset.k);}});
  window.addEventListener('online',flush);
  document.addEventListener('visibilitychange',function(){if(!document.hidden){pull();wake();}});
}
var lock=null;async function wake(){try{if('wakeLock' in navigator&&!lock){lock=await navigator.wakeLock.request('screen');lock.addEventListener('release',function(){lock=null;});}}catch(e){}}
async function start(){
  $('gate').hidden=true;$('app').hidden=false;bind();loadCache();var t=tok();S.staff=S.staff||(t&&t.staff)||'';$('who').textContent=S.staff;rebuild();render();
  try{await loadRoster();}catch(e){S.online=false;setSync();if(!S.guests.length)$('list').innerHTML='<p class="empty">Can’t reach the guest list. Check the connection and refresh.</p>';}
  flush();wake();
  setInterval(function(){queue.length?flush():pull();},5000);
  setInterval(function(){loadRoster().catch(function(){});},60000);
}
function gate(){
  $('gate').hidden=false;$('code').focus();
  $('gateForm').onsubmit=async function(e){e.preventDefault();$('gateErr').textContent='';var b=e.target.querySelector('button');b.disabled=true;
    try{var j=await call('/login',{method:'POST',body:JSON.stringify({code:$('code').value})});localStorage.setItem(TK,JSON.stringify({v:j.token,exp:Date.now()+15*3600e3,staff:j.staff}));localStorage.removeItem(CK);start();}
    catch(err){$('gateErr').textContent=err.message||'Sign-in failed';}finally{b.disabled=false;}};
}
tok()?start():gate();
})();
