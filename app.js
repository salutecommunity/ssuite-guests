let data=null,view='room',wish=new Set(),me='',sent=false;const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function load(){const r=await fetch('/api/snapshot',{cache:'no-store'});if(!r.ok){data=null;$('login').hidden=false;$('dashboard').hidden=true;$('wishbar').innerHTML='';return}data=await r.json();$('passcode').value='';$('login').hidden=true;$('dashboard').hidden=false;$('leadnav').hidden=!data.leadership;document.querySelector('[data-view=wishes]').hidden=true;if(data.leadership&&!window._landed){view='lead';window._landed=1}if(view==='lead'&&!data.leadership)view='room';document.querySelector('header .private').textContent=data.leadership?'LEADERSHIP · READ ONLY':'BOARD & SLC · READ ONLY';render()}
$('loginForm').onsubmit=async e=>{e.preventDefault();const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({passcode:$('passcode').value})});$('error').textContent=r.ok?'':(await r.json()).error;if(r.ok)await load()};
$('logout').onclick=async()=>{window._landed=0;view='room';await fetch('/api/logout',{method:'POST'});data=null;wish.clear();$('content').replaceChildren();await load()};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;render();scrollTo(0,0)});
const status=g=>g.attendance==='Confirmed'?'<span class="tag on">Confirmed</span>':'<span class="tag">Invited · not yet registered</span>';
const nearBtn=g=>`<button class="near ${wish.has(g.id)?'on':''}" data-near="${g.id}">${wish.has(g.id)?'✓ Sit near':'+ Sit near'}</button>`;
function render(){document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));const g=data.guests,t=data.tables,C=data.capacity;
const seatsTaken=t.reduce((n,x)=>n+x.allocated,0)+g.filter(x=>!t.some(tb=>tb.seatGuestIds.includes(x.id))).length;const conf=g.filter(x=>x.attendance==='Confirmed').length;const pct=Math.round(seatsTaken/C*100);
if(view==='room'){const F=window._f||'all';const conf=g.filter(x=>x.attendance==='Confirmed').length,pend=g.length-conf,open=t.filter(x=>!x.committed).reduce((a,x)=>a+x.seatGuestIds.filter(z=>!z).length,0);
const line=x=>[x.title,x.organization].filter(Boolean).join(' · ');
const P=(x,sub)=>{const pd=x.attendance!=='Confirmed';if(F==='pending'&&!pd&&!sub)return'';return `<li class="${sub?'sub ':''}${pd?'pd':''}${wish.has(x.id)?' on':''}" data-near="${x.id}" data-q="${esc((x.name+' '+line(x)).toLowerCase())}"><span class="nm">${esc(x.name)}${pd?' <em>pending</em>':''}</span><span class="co">${esc(line(x))||'&nbsp;'}</span><span class="st">${wish.has(x.id)?'★':'☆'}</span></li>`};
const kids=p=>g.filter(y=>y.note==='Guest of '+p.name);const fam=p=>P(p)+kids(p).map(k=>P(k,1)).join('');
const tableCard=tb=>{const ppl=tb.seatGuestIds.filter(Boolean).map(id=>g.find(z=>z.id===id)).filter(Boolean);const host=ppl.find(p=>p.name===tb.host)||null;const rest=ppl.filter(p=>p!==host);const iv=tb.invited||0;const o=Math.max(0,tb.seatGuestIds.filter(z=>!z).length-iv);const nm=tb.host.replace(/ \(.*\)$/,'');
const body=(host?P(host):'')+rest.map(p=>P(p,1)).join('')+Array.from({length:iv},()=>`<li class="sub pd inv"><span class="n">Invited guest</span> <span class="tag">pending</span><small>Invitation sent · name appears once they register</small></li>`).join('');if(F==='pending'&&!/<li/.test(body))return'';
return `<div class="tc" id="t-${nm.replace(/[^A-Za-z]/g,'')}"><div class="th"><b>${esc(nm)}'s table</b>${tb.honoree&&!tb.committed&&tb.basis?'<i class="bs">Honoree · '+esc(tb.basis)+'</i>':''}<span>${tb.committed?'Committed':ppl.length+' named'+(iv?' · '+iv+' invited':'')+' · '+tb.capacity+' seats'}</span></div><ul>${body}</ul>${o||tb.committed?`<p class="op">${tb.committed?tb.capacity+' seats · names to come':o+' open '+(o===1?'seat':'seats')}</p>`:''}</div>`};
const used=new Set(t.flatMap(x=>x.seatGuestIds));const ind=g.filter(x=>!used.has(x.id)&&!/^Guest of /.test(x.note||''));
const hon=ind.filter(x=>x.note==='Honoree'),rest=ind.filter(x=>x.note!=='Honoree').sort((a,b)=>a.name.localeCompare(b.name));
const sec=(k,title,sub,html)=>(F==='all'||F===k||F==='pending')&&html.includes('<li')||(F===k&&html)?`<section class="sec" id="s-${k}"><h2>${title}</h2><p class="ss">${sub}</p>${html}</section>`:'';
const honHtml=`<div class="room">${hon.map(h=>`<div class="tc"><div class="th"><b>${esc(h.name)}</b><span>Honoree${kids(h).length?' + '+kids(h).length:''}</span></div><ul>${fam(h)}</ul></div>`).join('')}${t.filter(x=>x.honoree).map(tableCard).join('')}</div>`;
const tabHtml=`<div class="room">${t.filter(x=>!x.honoree).map(tableCard).join('')}</div>`;
const indHtml=`<div class="room"><div class="tc wide"><ul class="cols">${rest.map(fam).join('')}</ul></div></div>`;
const chip=(k,l)=>`<button class="chip${F===k?' act':''}" data-f="${k}">${l}</button>`;
const hn=x=>x.host.replace(/ \(.*\)$/,'');const tid=x=>'t-'+hn(x).replace(/[^A-Za-z]/g,'');const ni=(h,l,n)=>`<a href="#${h}">${l}<span>${n}</span></a>`;const sub=L=>L.map(x=>`<a class="s2" href="#${tid(x)}">${esc(hn(x))}</a>`).join('');const HT=t.filter(x=>x.honoree),TT=t.filter(x=>!x.honoree);
const side=`<aside class="side"><p class="sh">Jump to</p>${ni('s-hon','Honorees',hon.length+HT.length)}${sub(HT)}${ni('s-tab','Tables',TT.length)}${sub(TT)}${ni('s-ind','Individual tickets',rest.length)}<p class="sh">Show</p>${chip('all','Everyone')}${chip('pending','Pending only')}</aside>`;
$('content').innerHTML=`<div class="layout">${side}<div class="mainc"><h1>The room</h1><p class="lead"><b>${conf}</b> confirmed &nbsp;·&nbsp; <b>${pend}</b> pending &nbsp;·&nbsp; <b>${open}</b> open seats at tables</p><p class="how">Hosts are listed first, with their guests indented beneath. <em class="k">pending</em> = invited, not yet registered. Tap a name to ☆ star someone (visible only to you).</p>
<div class="tools"><input id="search" class="srch" placeholder="Search name, title or company"></div>
${sec('hon','Honorees','Honorees, their guests and honoree-hosted tables',honHtml)}${sec('tab','Tables','Partner and host tables',tabHtml)}${sec('ind','Individual tickets','Guests with their own tickets · plus-ones indented beneath',indHtml)}`+foot()+'</div></div>';
document.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{window._f=b.dataset.f;render()});
$('search').oninput=()=>{const q=$('search').value.toLowerCase().trim();document.querySelectorAll('.sec li').forEach(li=>li.classList.toggle('hit',!!q&&li.dataset.q.includes(q)));document.querySelectorAll('.sec .tc').forEach(c=>c.classList.toggle('dim',!!q&&!c.querySelector('.hit')))}}
else if(view==='lead'&&data.leadership){$('content').innerHTML=leadView()+foot()+'<div id="drawer" class="drawer" hidden><div class="dr-bg"></div><aside class="dr-p" role="dialog" aria-modal="true"></aside></div>';
 const open=n=>{const h=window.__H.find(x=>x.name===n);if(!h)return;const D=$('drawer');D.querySelector('.dr-p').innerHTML=window.__REC(h);D.hidden=false;document.body.style.overflow='hidden';const c=()=>{D.hidden=true;document.body.style.overflow=''};D.querySelector('.dr-x').onclick=c;D.querySelector('.dr-bg').onclick=c;document.onkeydown=e=>{if(e.key==='Escape')c()}};
 document.querySelectorAll('[data-hon]').forEach(el=>{el.onclick=e=>{if(e.target.closest('details'))return;open(el.dataset.hon)};el.onkeydown=e=>{if(e.key==='Enter')open(el.dataset.hon)}})}
else{const list=g.filter(x=>wish.has(x.id));$('content').innerHTML=`<h1>My seating wishes</h1><p class="lead">${sent?'Thank you — your wishes were sent to the S.SUITE team. You can update and send again any time.':'Tell us who you would love to sit near. Seating is not guaranteed, but we\'ll do our best.'}</p>${list.length?table(list):'<div class="note">You haven\'t picked anyone yet. Go to "Who\'s coming" and tap "+ Sit near."</div>'}<form id="wf" style="max-width:520px;margin-top:30px"><label>Your name<input id="me" required value="${esc(me)}"></label><label style="margin-top:20px">Anything else? (optional)<input id="note" placeholder="e.g., seat me near my co-host"></label><button class="action" ${list.length?'':'disabled'}>Send my seating wishes</button></form>`+foot();$('wf').onsubmit=async e=>{e.preventDefault();me=$('me').value.trim();await fetch('/api/wishes',{method:'POST',body:JSON.stringify({name:me,note:$('note').value,ids:[...wish]})});sent=true;render()}}
document.querySelectorAll('[data-near]').forEach(b=>b.onclick=()=>{const id=b.dataset.near;wish.has(id)?wish.delete(id):wish.add(id);sent=false;render()});
$('wishbar').innerHTML=false?`<div class="wish"><p>You've picked ${wish.size} ${wish.size===1?'person':'people'} to sit near.</p><button id="go">Review and send</button></div>`:'';if($('go'))$('go').onclick=()=>{view='wishes';render();scrollTo(0,0)};
if($('refresh'))$('refresh').onclick=()=>load()}
function foot(){return `<p class="footer">Updated ${esc(data.asOf)} · <button id="refresh">Refresh</button></p>`}
function table(rows,compact){return `<div class="tablewrap"><table><thead><tr><th>Guest</th>${compact?'':'<th>Table</th>'}<th>Status</th><th></th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.name)}<small>${esc([x.title,x.organization].filter(Boolean).join(', '))}${x.note?' · '+esc(x.note):''}</small></td>${compact?'':`<td>${esc(x.tableHost?x.tableHost+"'s table":'Individual ticket')}</td>`}<td>${status(x)}</td><td style="text-align:right">${nearBtn(x)}</td></tr>`).join('')}</tbody></table>${rows.length?'':'<p>No matches.</p>'}</div>`}
load().catch(()=>{$('error').textContent='Dashboard unavailable'});
function leadView(){const L=data.leadership,V=L.live,C=data.capacity;
const fd=s=>s?new Date(s+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
const badge=b=>`<span class="badge b-${b.replace(/ /g,'').toLowerCase()}">${b}</span>`;const tc=' <span class="tag">to confirm</span>';
const ck=(ok,l)=>`<li class="${ok?'ok':''}">${ok?'✓':'○'} ${l}</li>`;
// ---- honorees
const STEPS=['Response','Profile','Evening','Additional guests','Support SALUTE','Review'];
const H=V.honorees.filter(h=>!h.closed&&h.db!=='declined'&&!(L.hiddenHonorees||[]).includes(h.name)).map(h=>{const o=L.honoreeOverride[h.name]||{};const st=o.st||({accepted:'Accepted',declined:'Declined',invited:'Invited'}[h.db]||h.db);
 const b=st==='Declined'?'Closed':h.submitted?'Complete':(h.opened&&(h.done.length||h.saved||h.db==='accepted'))?'In progress':'Not started';return Object.assign({},h,{st,b,note:o.note||'',confirm:o.confirm})});
(L.manualHonorees||[]).forEach(m=>H.push(Object.assign({b:'Not started',done:[],invitees:[],codeGuests:[],det:{},manual:1},m)));
L.openCategories.forEach(c=>H.push({name:'—',honor:c.cat,st:'Open',b:'Not started',note:c.note,done:[],invitees:[],codeGuests:[],open:1}));
const ci=c=>{const i=L.categoryOrder.indexOf(c);return i<0?99:i};const so={'Accepted':0,'Verbal yes':1,'In conversation':2,'Invited':2,'Open':3,'Declined':4};H.sort((a,b)=>ci(a.honor)-ci(b.honor)||so[a.st]-so[b.st]);
const fu=h=>{if(h.open)return[];const d=h.det||{},o=[];if(h.manual)return['Create portal once she accepts'];
 if(!h.opened)o.push('Has not opened her portal — resend or reach out personally');
 if(h.db==='invited'&&h.st==='Invited')o.push('Waiting on her response');
 if(h.st==='Verbal yes'&&!h.submitted)o.push('Verbal yes — ask her to confirm in the portal');
 if(!h.headshot)o.push('Headshot not uploaded');if(!h.bio)o.push('Bio not provided');
 if(!(d.pubName&&d.pubTitle&&d.pubOrg))o.push('Name/title/company for the program not confirmed');
 if(d.resp==='virtual'&&!h.video)o.push('Virtual acceptance video not received');
 if(d.attend===null||d.attend===undefined)o.push('In-person attendance not confirmed');
 if(d.inviteList&&!h.invitees.length&&!h.codeGuests.length)o.push('Guest list note: “'+d.inviteList+'”');
 if(h.opened&&!h.submitted)o.push('Portal started but not submitted');return o};
const items=h=>{const d=h.det||{};const virt=d.resp==='virtual';const gl=h.invitees.length+h.codeGuests.length;
 const r=[[!!d.resp&&d.resp!=='',  'Said yes in portal', d.resp?({accept:'Accepted',virtual:'Accepting virtually',represent:'Sending a representative'}[d.resp]||d.resp):''],
 [virt?true:d.attend===true,virt?'Attendance':'Attending in person', virt?'Joining virtually':d.attend===false?'Said no / not answered':''],
 [!!(d.pubName&&d.pubTitle&&d.pubOrg),'Program name, title, company',[d.pubTitle,d.pubOrg].filter(Boolean).join(', ')],
 [!!h.headshot,'Headshot'],[!!h.bio,'Bio']];
 if(virt)r.push([!!h.video||!!d.videoLink,'Acceptance video','due Nov 15']);
 r.push([!!h.plusOne||gl>0,'Guests named',h.plusOne?h.plusOne.name+(gl?' + '+gl:''):gl?gl+' invited':'']);
 r.push([!!h.submitted,'Portal submitted',h.submitted?fd(h.submitted):h.opened?'opened, not submitted':'never opened']);return r};
const yn=(v,y,n)=>v===true?y:v===false?n:'—';
const rec=h=>{const d=h.det||{},row=(l,v)=>`<div class="rr"><dt>${l}</dt><dd>${v||'<span class="pm">Not provided</span>'}</dd></div>`;const F=fu(h);
 const resp={accept:'Accepted',virtual:'Accepting virtually',decline:'Declined',represent:'Sending a representative'}[d.resp]||(h.st);
 return `<div class="dr-h"><p class="cat">${esc(h.honor)} Honor</p><h2>${esc(h.name)}</h2><p class="pst"><span class="tag${h.st==='Accepted'?' on':''}">${esc(h.st)}</span> ${badge(h.b)}</p><button class="dr-x" aria-label="Close">×</button></div>
 <h3>Checklist</h3><ul class="need">${h.manual?'':items(h).map(([ok,l,v])=>`<li class="${ok?'ok':'no'}"><span>${ok?'Done':'Missing'}</span>${l}${v?'<small>'+esc(v)+'</small>':''}</li>`).join('')}</ul><h3>Follow up</h3>${F.length?`<ul class="fu">${F.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="pm">Nothing outstanding</p>'}
 ${h.manual?`<p class="pn">${esc(h.note||'')}</p>`:`<h3>Portal activity</h3><dl>${row('First opened',fd(h.opened))}${row('Last opened',d.last?fd(d.last.slice(0,10)):'')}${row('Visits',String(h.opens||0))}${row('Last saved',fd(h.saved))}${row('Submitted',h.submitted?fd(h.submitted)+(d.subs>1?' · '+d.subs+' times':''):'')}</dl>
 <h3>Response</h3><dl>${row('Response',esc(resp))}${row('Attending in person',yn(d.attend,'Yes','No'))}${d.rName?row('Representative',esc([d.rName,d.rTitle,d.rOrg].filter(Boolean).join(' · '))):''}${d.declineNote?row('Note',esc(d.declineNote)):''}</dl>
 <h3>Program listing</h3><dl>${row('Name',esc(d.pubName||''))}${row('Title',esc(d.pubTitle||''))}${row('Company',esc(d.pubOrg||''))}${row('Pronunciation',esc(d.pron||''))}${row('Headshot',h.headshot?'Uploaded':'')}${d.resp==='virtual'||h.video?row('Acceptance video',h.video?'Uploaded':d.videoLink?'Link provided':''):''}${row('Bio',d.bio?`<details><summary>Read bio</summary><p>${esc(d.bio)}</p></details>`:'')}</dl>
 <h3>Guests &amp; table</h3><dl>${row('Plus-one',h.plusOne?esc([h.plusOne.name,h.plusOne.title,h.plusOne.org].filter(Boolean).join(' · ')):'')}${row('Table',esc({honoree:'Joining the honoree table',additional:'Hosting an additional table'}[d.tableKind]||d.tableKind||''))}${row('Guests invited',(h.invitees.concat(h.codeGuests.map(x=>x.name+(x.registered?' (registered)':' (not registered)')))).map(esc).join('<br>'))}${d.inviteList?row('Guest list note',esc(d.inviteList)):''}${d.teamName?row('Point of contact',esc(d.teamName)):''}</dl>
 <h3>Announcements &amp; support</h3><dl>${row('Share announcement',esc(d.share||''))}${row('Social handle',esc(d.social||''))}${row('Support SALUTE',esc(d.supportMode||'')+(d.supporters?' · '+d.supporters+' supporters named':''))}${d.annNote?row('Note',esc(d.annNote)):''}</dl>`}
 <p class="pm" style="margin-top:24px">Contact details, dietary and payment information are not shown here.</p>`};
const hrow=h=>{const g=[];if(h.plusOne)g.push(`<li class="ok">${esc(h.plusOne.name)}<small>${esc([h.plusOne.title,h.plusOne.org].filter(Boolean).join(' · '))}</small> <em>plus-one, named in portal</em></li>`);
 h.codeGuests.forEach(x=>g.push(`<li class="${x.registered?'ok':''}">${esc(x.name)}<small>${esc([x.title,x.org].filter(Boolean).join(' · '))}</small> <em>${x.registered?'registered':'invited · not registered'}</em></li>`));
 h.invitees.forEach(n=>g.push(`<li>${esc(n)} <em>invited · not registered</em></li>`));
 return `<div class="pc click ${h.st==='Declined'?'muted':''}" data-hon="${esc(h.name)}" tabindex="0" role="button" aria-label="Open record for ${esc(h.name)}"><div class="pch"><div><p class="cat">${esc(h.honor)}</p><b>${esc(h.name)}</b></div>${badge(h.b)}</div>
 <p class="pst"><span class="tag${h.st==='Accepted'?' on':''}">${esc(h.st)}</span>${h.confirm?tc:''}</p>${h.note?`<p class="pn">${esc(h.note)}</p>`:''}
 ${h.open?'':h.manual?'<p class="pm">No portal yet</p>':`<p class="pm">${h.opened?'Portal opened '+fd(h.opened)+(h.opens>1?' · '+h.opens+' visits':''):'Portal not opened'}${h.submitted?' · submitted '+fd(h.submitted):''}</p>
 <ul class="need">${items(h).map(([ok,l,v])=>`<li class="${ok?'ok':'no'}"><span>${ok?'Done':'Missing'}</span>${l}${v?'<small>'+esc(v)+'</small>':''}</li>`).join('')}</ul>
 <p class="sub">Guests</p>${g.length?`<ul class="gl">${g.join('')}</ul>`:'<p class="pm">No guests named yet</p>'}`}${h.open?'':`<p class="more">${h.manual?'':items(h).filter(x=>!x[0]).length?items(h).filter(x=>!x[0]).length+' missing · ':'All done · '}View full record →</p>`}</div>`};
window.__H=H;window.__REC=rec;
const closed=[].filter(h=>h).map(h=>h.name+' ('+h.honor+')');
// ---- tables
const T=V.tables.map(t=>Object.assign({},t)).concat(L.heldTables.map(t=>({host:t.host,label:t.label,cap:t.cap,basis:t.basis,held:1,hostStatus:null,seats:Array.from({length:t.cap},(_,i)=>({n:i+1,st:'open'}))})));
const cnt=(t,s)=>t.seats.filter(x=>x.st===s).length;
const sumS=s=>T.reduce((n,t)=>n+cnt(t,s),0),seatsTot=T.reduce((n,t)=>n+t.cap,0);
const seat=x=>x.st==='registered'||x.st==='pending'?`<li class="${x.st==='registered'?'ok':''}"><span class="sn">${x.n}</span>${esc(x.name)}${x.host?' <em>host</em>':''}<small>${esc([x.title,x.org].filter(Boolean).join(' · '))}</small> ${x.st==='pending'?'<span class="tag">pending</span>':''}</li>`:x.st==='invited'?`<li><span class="sn">${x.n}</span><i>${esc(x.email||'Invited guest')}</i> <span class="tag">invited</span><small>Invitation sent ${fd(x.sent)} · name appears once they register</small></li>`:`<li class="open"><span class="sn">${x.n}</span>Open</li>`;
const tcard=t=>{const r=cnt(t,'registered'),i=cnt(t,'invited')+cnt(t,'pending');return `<div class="pc"><div class="pch"><div><p class="cat">${esc(t.basis==='paid'?(t.label||'Table'):'Partner Table')}</p><b>${esc(t.display||t.host)}</b></div><span class="kn">${r+i} of ${t.cap}</span></div>
 <p class="pm">${t.held?(t.basis==='committed'?'Committed · held outside ticketing · names to come':'Held outside ticketing · names to come'):'Host '+(t.hostStatus==='registered'?'registered':'<b>pending registration</b>')+' · '+r+' registered · '+i+' invited/pending · '+cnt(t,'open')+' open'}</p>${t.held?'':`<ul class="seats">${t.seats.map(seat).join('')}</ul>`}</div>`};
// ---- sponsors
const byHost=h=>V.tables.find(t=>t.host===h);
const S=L.sponsors.map(s=>{const t=s.host?byHost(s.host):null;const p=t&&t.portal;const any=p&&(p.logo||p.bio||p.website||p.linkedin);
 return Object.assign({},s,{t,p,b:p&&p.submitted?'Complete':any?'In progress':'Not started',filled:t?t.seats.filter(x=>x.st!=='open').length:0,cap:t?t.cap:s.seats})});
const srow=s=>`<div class="pc"><div class="pch"><div><p class="cat">${esc(s.level)}${s.confirm?tc:''}</p><b>${esc(s.name)}</b></div>${badge(s.b)}</div>
 <p class="pst"><span class="tag${s.status==='Paid'?' on':''}">${esc(s.status)}</span> &nbsp;<span class="pm">${s.cap==null?'Seats to confirm':s.filled+' of '+s.cap+' seats named'}</span></p>
 ${s.p?`<p class="pm">Partner portal${s.p.submitted?' · submitted '+fd(s.p.submitted):' · not yet submitted'}</p><ul class="steps">${ck(!!s.p.recognition,'Recognition: '+(s.p.recognition||'—'))}${ck(s.p.name,'Name / company')}${ck(s.p.logo,'Logo')}${ck(s.p.bio,'Company bio')}${ck(s.p.website,'Website')}${ck(s.p.linkedin,'LinkedIn')}${ck(!!s.p.submitted,'Submitted')}</ul>`:`<p class="pm">${s.t?'No partner portal record yet':'No table in ticketing yet · no partner portal'}</p>`}</div>`;
const comm=V.community.filter(c=>L.communityNames[c.org]);
// ---- summary
const k=(arr,b)=>arr.filter(x=>x.b===b).length;const HH=H.filter(h=>h.st!=='Declined'&&!h.open);
const tile=(t,rows)=>`<div class="kpi"><span>${t}</span>${rows.map(([n,l])=>`<p><b>${n}</b> ${l}</p>`).join('')}</div>`;
const sum=`<div class="kpis">${tile('Honoree portals',[[k(HH,'Complete'),'complete'],[k(HH,'In progress'),'in progress'],[k(HH,'Not started'),'not started'],[H.filter(h=>h.open).length,'category open']])}${tile('Sponsor portals',[[k(S,'Complete'),'complete'],[k(S,'In progress'),'in progress'],[k(S,'Not started'),'not started']])}${tile('Tables · '+T.length,[[sumS('registered'),'seats registered'],[sumS('invited')+sumS('pending'),'invited / pending'],[sumS('open'),'open'],[seatsTot+' / '+C,'table seats in the room']])}</div>`;
const nav=`<nav class="jump"><a href="#p-hon">Honorees</a><a href="#p-sp">Sponsors</a><a href="#p-tab">Tables</a></nav>`;
return `<h1>Progress</h1><p class="lead">Leadership View · status only · the full guest list is under “The room.”</p>${sum}${nav}
<section class="sec" id="p-hon"><h2>Honoree portals</h2><p class="ss">One row per honoree · badge reflects their private portal</p><div class="grid">${H.map(hrow).join('')}</div>${closed.length?`<p class="pm">Closed invitations (no longer honorees): ${esc(closed.join(', '))}</p>`:''}</section>
<section class="sec" id="p-sp"><h2>Sponsor &amp; partner portals</h2><p class="ss">Level, status and partner-portal progress</p><div class="grid">${S.map(srow).join('')}</div>
<h2 style="margin-top:30px">Community partners</h2><p class="ss">Partner-page seats used, of 9 held</p><ul class="cl">${comm.map(c=>`<li><span>${esc(c.org)}</span><b>${c.used} of ${c.max}</b></li>`).join('')}</ul></section>
<section class="sec" id="p-tab"><h2>Tables</h2><p class="ss">Every seat · registered, invited (pending) or open</p><div class="grid">${T.map(tcard).join('')}</div></section>`}
