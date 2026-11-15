(function(){
'use strict';
var API='https://iddzcbknnddkonrcwgpt.supabase.co/functions/v1/ssuite-checkin';
var card=document.getElementById('card'),note=document.getElementById('note');
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
var t=(new URLSearchParams(location.search).get('t')||'').trim();
var CK='ssuite_pass_'+t;
function qr(text){var q=qrcode(0,'M');q.addData(text);q.make();return q.createDataURL(8,2);}
function draw(p,stale){
  var link=location.origin+'/pass/?t='+encodeURIComponent(t);
  var ev=p.event||{};
  var table=p.table!=null?'<div><span class="lbl">Table</span><b>'+esc(p.table)+'</b></div>':'<div><span class="lbl">Table</span><div class="tbd">Shared at<br>check-in</div></div>';
  card.innerHTML='<div class="hd"><img src="/assets/ssuite-logo-header.png" alt="S.SUITE"><span>Guest Pass</span></div>'+
   '<div class="nm"><span class="lbl">Guest</span><h1>'+esc(p.name)+'</h1></div>'+
   '<div class="tb">'+table+'<div class="ev">'+esc(ev.dateLabel||'')+'<br>'+esc(ev.timeLabel||'')+'</div></div>'+
   '<div class="det"><div><span class="lbl">Venue</span>'+esc(ev.venue||'')+'</div><div><span class="lbl">Dress</span>'+esc(ev.dress||'')+'</div><div><span class="lbl">Address</span>'+esc(ev.address||'')+'</div></div>'+
   '<div class="qr"><img alt="Check-in code" src="'+qr(link)+'"><span>Show this code at check-in</span></div>'+
   '<div class="ft">'+esc(ev.subtitle||'')+' · Presented by SALUTE</div>';
  document.title=(p.first||'Your')+'’s S.SUITE Pass';
  note.textContent=stale?'You’re offline — showing your saved pass. Your table is confirmed at check-in.':'Your table number updates here automatically if anything changes. Tip: add this page to your Home Screen to keep it handy.';
}
function missing(msg){card.innerHTML='<div class="missing"><h1>Pass not found</h1>'+esc(msg)+'</div>';}
if(!/^[A-Za-z0-9_-]{22}$/.test(t)){missing('Please open the link exactly as it was sent to you, or contact hello@salute.community.');return;}
var cached=null;try{cached=JSON.parse(localStorage.getItem(CK)||'null');}catch(e){}
if(cached)draw(cached,false);
fetch(API+'/pass?t='+encodeURIComponent(t),{cache:'no-store'}).then(function(r){return r.json().then(function(j){return {ok:r.ok,status:r.status,j:j};});}).then(function(x){
  if(x.ok){try{localStorage.setItem(CK,JSON.stringify(x.j));}catch(e){}draw(x.j,false);}
  else if(x.status===404){try{localStorage.removeItem(CK);}catch(e){}missing('This pass is no longer active. Please contact hello@salute.community.');}
  else if(cached)draw(cached,true);else missing('We couldn’t load your pass right now. Please try again in a moment.');
}).catch(function(){if(cached)draw(cached,true);else missing('You appear to be offline. Please reconnect and reload this page.');});
})();
