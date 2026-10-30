// Talks to the read-only guests-view backend. Passcodes are checked server-side; this file holds no data.
(function(){const B='https://iddzcbknnddkonrcwgpt.supabase.co/functions/v1/guests-view',K='gv_token',f=window.fetch.bind(window);
const R=(s,b)=>({ok:s>=200&&s<300,status:s,json:async()=>b});
window.fetch=async(u,o={})=>{if(typeof u!=='string'||!u.startsWith('/api/'))return f(u,o);
 if(u==='/api/login'){let r;try{r=await f(B+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:o.body,cache:'no-store',credentials:'omit'})}catch(e){return R(503,{error:'Dashboard unavailable. Please try again.'})}
  const j=await r.json().catch(()=>({error:'Dashboard unavailable'}));if(r.ok&&j.token){sessionStorage.setItem(K,j.token);return R(200,{role:j.role})}return R(r.status,{error:j.error||'Sign in failed'})}
 if(u==='/api/logout'){sessionStorage.removeItem(K);return R(200,{})}
 if(u==='/api/snapshot'){const t=sessionStorage.getItem(K);if(!t)return R(401,{error:'Sign in required'});
  const r=await f(B+'/snapshot',{headers:{Authorization:'Bearer '+t},cache:'no-store',credentials:'omit'});if(r.status===401)sessionStorage.removeItem(K);return R(r.status,await r.json().catch(()=>({})))}
 if(u==='/api/wishes')return R(404,{});return R(404,{})}})();
