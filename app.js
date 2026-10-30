// S.SUITE guest dashboard — one shared layout for Board/SLC and Leadership. Data comes from the server; this file holds none.
let data=null,tab='overview';const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const F={q:'',st:'all',t:'all',iq:'',iv:'all'};
async function load(){const r=await fetch('/api/snapshot',{cache:'no-store'});if(!r.ok){data=null;$('login').hidden=false;$('dashboard').hidden=true;return}data=await r.json();$('passcode').value='';$('login').hidden=true;$('dashboard').hidden=false;
 document.querySelector('header .private').textContent=data.leadership?'LEADERSHIP VIEW · READ ONLY':'BOARD & SLC · READ ONLY';if(tab==='honorees'&&!data.leadership)tab='overview';render()}
$('loginForm').onsubmit=async e=>{e.preventDefault();const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({passcode:$('passcode').value})});$('error').textContent=r.ok?'':(await r.json()).error;if(r.ok)await load()};
const TABS=()=>[['overview','Overview'],['tables','Tables'],['individuals','Individual tickets'],['partners','Partners & invite pages']].concat(data.leadership?[['honorees','Honorees']]:[]);
const go=t=>{tab=t;render();scrollTo(0,0)};
const pill=s=>s==='Confirmed'?'<span class="tag on">Confirmed</span>':'<span class="tag">Invited</span>';
const fd=s=>s?new Date(s+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
const line=p=>[p.title,p.org].filter(Boolean).join(' · ');
function render(){
 $('tabs').innerHTML=TABS().map(([k,l])=>`<button class="nav${tab===k?' active':''}" data-tab="${k}">${l}</button>`).join('')+'<button class="nav" id="logout">Sign out</button>';
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>go(b.dataset.tab));
 $('logout').onclick=async()=>{tab='overview';await fetch('/api/logout',{method:'POST'});data=null;$('content').replaceChildren();await load()};
 const V={overview,tables,individuals,partners,honorees}[tab]||overview;$('content').innerHTML=V()+`<p class="footer">Updated ${esc(data.asOf)} · <button id="refresh">Refresh</button></p>`;
 if($('refresh'))$('refresh').onclick=()=>load();
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=e=>{e.preventDefault();go(b.dataset.go)});
 if(tab==='tables')bindTables();if(tab==='individuals')bindInd();if(tab==='honorees')bindHon();
}
function tally(){const S=data.summary;return `<div class="tally"><div class="tt"><span>Total seats committed</span><b>${S.total}</b><small>every individual ticket plus every seat at every table, including honoree tables</small></div><div class="eq">=</div><div><span>Registered</span><b>${S.registered}</b><small>name and details are in</small></div><div class="eq">+</div><div><span>Named or invited, not yet registered</span><b>${S.pending}</b><small>we know who is coming; they still need to register</small></div><div class="eq">+</div><div><span>Table seats not yet assigned</span><b>${S.unassigned}</b><small>seats paid for or held; the host has not named a guest yet</small></div></div>`}
function overview(){const S=data.summary,P=data.pages.filter(p=>p.n>0);const card=(k,t,v,s)=>`<a href="#" class="kpi ocard" data-go="${k}"><span>${t}</span><b>${v}</b><small>${s}</small><em>Open →</em></a>`;
 let h='';if(data.leadership){const H=honList();h=card('honorees','Honorees',H.filter(x=>!x.open).length,`${H.filter(x=>x.b==='Complete').length} portals complete · ${H.filter(x=>x.b==='In progress').length} in progress`)}
 return `<h1>Overview</h1>${tally()}<div class="kpis ocards">${card('tables','Tables',S.tables,`${S.tableSeats} seats · ${S.unassigned} not yet assigned`)}${card('individuals','Individual tickets',S.individuals,'people on their own ticket, plus their guests')}${card('partners','Partners & invite pages',P.reduce((n,p)=>n+p.n,0),'people brought in through invite pages'+(P[0]?` · top: ${esc(P[0].label)} (${P[0].n})`:''))}${h}</div>`}
function tables(){const T=data.tables;return `<h1>Tables</h1><p class="lead">${data.summary.tables} tables · each card shows the host first, guests beneath.</p>
 <div class="tools"><input id="tq" class="srch" placeholder="Search name, title or company" value="${esc(F.q)}">${[['all','Everyone'],['Confirmed','Confirmed'],['Invited','Invited']].map(([k,l])=>`<button class="chip${F.st===k?' act':''}" data-st="${k}">${l}</button>`).join('')}<select id="tsel"><option value="all">All tables</option>${T.map((t,i)=>`<option value="${i}"${F.t==String(i)?' selected':''}>${esc(t.name)}</option>`).join('')}</select></div>
 <div class="grid" id="tgrid">${T.map((t,i)=>tcard(t,i)).join('')}</div>`}
function tcard(t,i){const inv=t.invites.map(x=>`<li class="sub" data-s="Invited" data-q="${esc((x.email||'invited guest').toLowerCase())}"><span class="nm"><i>${esc(x.email||'Invited guest')}</i></span>${pill('Invited')}<small>${x.sent?'Invitation sent '+fd(x.sent)+' · ':''}name appears once they register</small></li>`).join('');
 const ppl=t.people.map(p=>`<li class="${p.host?'':'sub'}" data-s="${p.status}" data-q="${esc((p.name+' '+line(p)).toLowerCase())}"><span class="nm">${esc(p.name)}${p.host?' <em class="hs">host</em>':''}</span>${pill(p.status)}<small>${esc(line(p))}</small>${p.via?`<small class="via">Came through: via ${esc(p.via)}</small>`:''}</li>`).join('');
 return `<div class="pc tcard" data-i="${i}"><div class="pch"><div><p class="cat">${esc(t.label)}</p><b>${esc(t.name)}</b>${t.name!==t.host?`<p class="pm">Host: ${esc(t.host)}</p>`:''}</div><span class="kn">${t.held?t.cap+' seats':t.filled+' of '+t.cap+' filled'}</span></div>
 ${t.held?'<p class="pm">Held for the honoree’s guests · names to come</p>':`<ul class="ppl">${ppl}${inv}</ul>${t.open?`<p class="op">${t.open} open ${t.open===1?'seat':'seats'}</p>`:''}`}</div>`}
function bindTables(){const ap=()=>{const q=F.q.toLowerCase().trim();document.querySelectorAll('.tcard').forEach(c=>{let any=false;c.querySelectorAll('li[data-s]').forEach(li=>{const ok=(F.st==='all'||li.dataset.s===F.st)&&(!q||li.dataset.q.includes(q));li.hidden=!ok;any=any||ok});
 c.hidden=(F.t!=='all'&&c.dataset.i!==F.t)||((q||F.st!=='all')&&!any)})};
 $('tq').oninput=()=>{F.q=$('tq').value;ap()};$('tsel').onchange=()=>{F.t=$('tsel').value;ap()};document.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{F.st=b.dataset.st;render();});ap()}
function individuals(){const I=data.individuals;const row=(p,sub)=>`<li class="${sub?'sub':''}" data-q="${esc((p.name+' '+line(p)+' '+(p.via||'')).toLowerCase())}" data-via="${esc(p.via||'')}"><span class="nm">${esc(p.name)}${p.honoree?' <em class="hs">honoree</em>':''}${sub?' <em class="hs">guest</em>':''}</span>${pill(p.status)}<small>${esc(line(p))}</small>${p.via?`<small class="via">Came through: via ${esc(p.via)}</small>`:''}</li>`;
 const C={};I.forEach(p=>[p,...p.guests].forEach(x=>{if(x.via)C[x.via]=(C[x.via]||0)+1}));const V=Object.keys(C).sort((a,b)=>C[b]-C[a]||a.localeCompare(b));if(F.iv!=='all'&&!C[F.iv])F.iv='all';
 return `<h1>Individual tickets</h1><p class="lead">${data.summary.individuals} people on their own ticket · their guests are listed beneath them.</p><div class="tools"><input id="iq" class="srch" placeholder="Search name, title, company or invite page" value="${esc(F.iq)}"><select id="iv" class="sel"><option value="all">All invite pages</option>${V.map(v=>`<option value="${esc(v)}"${F.iv===v?' selected':''}>${esc(v)} (${C[v]})</option>`).join('')}</select></div>
 <div class="pc"><ul class="ppl cols">${I.map(p=>row(p)+p.guests.map(k=>row(k,1)).join('')).join('')}</ul></div>`}
function bindInd(){const ap=()=>{const q=F.iq.toLowerCase().trim();document.querySelectorAll('.ppl li').forEach(li=>li.hidden=(!!q&&!li.dataset.q.includes(q))||(F.iv!=='all'&&li.dataset.via!==F.iv))};$('iq').oninput=()=>{F.iq=$('iq').value;ap()};$('iv').onchange=()=>{F.iv=$('iv').value;ap()};ap()}
function partners(){const P=data.pages.filter(x=>x.n>0),M=Math.max(1,...P.map(x=>x.n)),z=data.pages.length-P.length;
 const bars=`<div class="ipb">${P.map(x=>`<div class="ipr"><span class="ipl">${esc(x.label)}<em>${x.kind==='partner'?'Partner page':x.kind==='founder'?'Founder invite link':'Personal page'}</em></span><span class="ipt"><span class="ipf" style="width:${Math.round(x.n/M*100)}%"></span></span><b>${x.n}</b></div>`).join('')||'<p class="pm">No sign-ups through invite pages yet</p>'}</div>${z?`<p class="pm">${z} other invite ${z===1?'page has':'pages have'} no sign-ups yet</p>`:''}`;
 let sp='';if(data.leadership){const L=data.leadership,V=L.live,tc='',ck=(ok,l)=>`<li class="${ok?'ok':''}">${ok?'✓':'○'} ${l}</li>`,badge=b=>`<span class="badge b-${b.replace(/ /g,'').toLowerCase()}">${b}</span>`;
  const byHost=h=>V.tables.find(t=>t.host===h);
const S=L.sponsors.map(s=>{const t=s.host?byHost(s.host):null;const p=t&&t.portal;const any=p&&(p.logo||p.bio||p.website||p.linkedin);
 return Object.assign({},s,{t,p,b:p&&p.submitted?'Complete':any?'In progress':'Not started',filled:t?t.filled:0,cap:t?t.cap:s.seats})});
const srow=s=>`<div class="pc"><div class="pch"><div><p class="cat">${esc(/to confirm/i.test(s.level||'')?'':s.level)}</p><b>${esc(s.name)}</b></div>${badge(s.b)}</div>
 <p class="pst"><span class="tag${s.status==='Paid'?' on':''}">${esc(s.status)}</span> &nbsp;<span class="pm">${s.cap==null?'':s.filled+' of '+s.cap+' seats named'}</span></p>
 ${s.p?`<p class="pm">Partner portal${s.p.submitted?' · submitted '+fd(s.p.submitted):' · not yet submitted'}</p><ul class="steps">${ck(!!s.p.recognition,'Recognition: '+(s.p.recognition||'—'))}${ck(s.p.name,'Name / company')}${ck(s.p.logo,'Logo')}${ck(s.p.bio,'Company bio')}${ck(s.p.website,'Website')}${ck(s.p.linkedin,'LinkedIn')}${ck(!!s.p.submitted,'Submitted')}</ul>`:`<p class="pm">${s.t?'No partner portal record yet':'No table in ticketing yet · no partner portal'}</p>`}</div>`;

  sp=`<section class="sec"><h2>Sponsors</h2><p class="ss">Level, status and partner-portal progress</p><div class="grid">${S.map(srow).join('')}</div></section>`}
 return `<h1>Partners &amp; invite pages</h1><div class="cp2"><section class="sec"><h2>Community partners</h2><p class="ss">Seats used on each partner page</p><ul class="cl">${data.community.map(c=>`<li><span>${esc(c.org)}</span><b>${c.used} of ${c.max}</b></li>`).join('')}</ul></section>
 <section class="sec"><h2>Invite pages</h2><p class="ss">People brought in by each personal and partner invite page (registered or paid)</p>${bars}</section></div>${sp}`}
function honList(){const L=data.leadership,V=L.live;
 const fd=s=>s?new Date(s+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
const badge=b=>`<span class="badge b-${b.replace(/ /g,'').toLowerCase()}">${b}</span>`;const tc='';
const ck=(ok,l)=>`<li class="${ok?'ok':''}">${ok?'✓':'○'} ${l}</li>`;
// ---- honorees
const STEPS=['Response','Profile','Evening','Additional guests','Support SALUTE','Review'];
const H=V.honorees.filter(h=>!h.closed&&h.db!=='declined'&&!(L.hiddenHonorees||[]).includes(h.name)).map(h=>{const o=L.honoreeOverride[h.name]||{};const st=o.st||({accepted:'Accepted',declined:'Declined',invited:'Invited'}[h.db]||h.db);
 const b=st==='Declined'?'Closed':h.submitted?'Complete':(h.opened&&(h.done.length||h.saved||h.db==='accepted'))?'In progress':'Not started';return Object.assign({},h,{st,b,note:o.note||'',confirm:o.confirm})});
(L.manualHonorees||[]).filter(m=>!H.some(h=>(h.name||'').toLowerCase()===m.name.toLowerCase())).forEach(m=>H.push(Object.assign({b:'Not started',done:[],invitees:[],codeGuests:[],det:{},manual:1},m)));
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
 return H}
function honorees(){const L=data.leadership,V=L.live;
 const fd=s=>s?new Date(s+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
const badge=b=>`<span class="badge b-${b.replace(/ /g,'').toLowerCase()}">${b}</span>`;const tc='';
const ck=(ok,l)=>`<li class="${ok?'ok':''}">${ok?'✓':'○'} ${l}</li>`;
// ---- honorees
const STEPS=['Response','Profile','Evening','Additional guests','Support SALUTE','Review'];
const H=V.honorees.filter(h=>!h.closed&&h.db!=='declined'&&!(L.hiddenHonorees||[]).includes(h.name)).map(h=>{const o=L.honoreeOverride[h.name]||{};const st=o.st||({accepted:'Accepted',declined:'Declined',invited:'Invited'}[h.db]||h.db);
 const b=st==='Declined'?'Closed':h.submitted?'Complete':(h.opened&&(h.done.length||h.saved||h.db==='accepted'))?'In progress':'Not started';return Object.assign({},h,{st,b,note:o.note||'',confirm:o.confirm})});
(L.manualHonorees||[]).filter(m=>!H.some(h=>(h.name||'').toLowerCase()===m.name.toLowerCase())).forEach(m=>H.push(Object.assign({b:'Not started',done:[],invitees:[],codeGuests:[],det:{},manual:1},m)));
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
 const k=b=>H.filter(x=>!x.open&&x.b===b).length;
 return `<h1>Honorees</h1><p class="lead">${k('Complete')} complete · ${k('In progress')} in progress · ${k('Not started')} not started · ${H.filter(x=>x.open).length} category open. Tap a card for the full record.</p><div class="grid">${H.map(hrow).join('')}</div><div id="drawer" class="drawer" hidden><div class="dr-bg"></div><aside class="dr-p" role="dialog" aria-modal="true"></aside></div>`}
function bindHon(){const open=n=>{const h=window.__H.find(x=>x.name===n);if(!h)return;const D=$('drawer');D.querySelector('.dr-p').innerHTML=window.__REC(h);D.hidden=false;document.body.style.overflow='hidden';const c=()=>{D.hidden=true;document.body.style.overflow=''};D.querySelector('.dr-x').onclick=c;D.querySelector('.dr-bg').onclick=c;document.onkeydown=e=>{if(e.key==='Escape')c()}};
 document.querySelectorAll('[data-hon]').forEach(el=>{el.onclick=e=>{if(e.target.closest('details'))return;open(el.dataset.hon)};el.onkeydown=e=>{if(e.key==='Enter')open(el.dataset.hon)}})}
load().catch(()=>{$('error').textContent='Dashboard unavailable'});
