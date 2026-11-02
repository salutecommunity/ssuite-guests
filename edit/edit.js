// S.Suite edit mode. Talks only to the guests-edit backend; holds no data. Session token in sessionStorage.
(function () {
  const B = 'https://iddzcbknnddkonrcwgpt.supabase.co/functions/v1/guests-edit', K = 'ge_token';
  const $ = (s) => document.querySelector(s);
  const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'on') for (const [ev, f] of Object.entries(v)) e.addEventListener(ev, f); else if (k === 'cls') e.className = v; else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); } for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k))); return e; };
  async function api(path, body) {
    const t = sessionStorage.getItem(K);
    const r = await fetch(B + '/' + path, { method: body ? 'POST' : 'GET', headers: Object.assign({ 'Content-Type': 'application/json' }, t ? { Authorization: 'Bearer ' + t } : {}), body: body ? JSON.stringify(body) : undefined, cache: 'no-store', credentials: 'omit' });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && t && path !== 'verify' && path !== 'passcode') { sessionStorage.removeItem(K); location.reload(); }
    if (!r.ok) throw new Error(j.error || 'Something went wrong');
    return j;
  }
  // ---------- sign in ----------
  let email = '';
  $('#emailForm').addEventListener('submit', async (e) => { e.preventDefault(); $('#error').textContent = ''; email = $('#email').value.trim().toLowerCase();
    try { await api('request-code', { email }); $('#emailForm').hidden = true; $('#codeForm').hidden = false; $('#sentTo').textContent = 'If ' + email + ' is a named editor, a code is on its way (subject: "Your S.Suite Admin sign-in code"). It works for 10 minutes.'; $('#code').focus(); } catch (x) { $('#error').textContent = x.message; } });
  $('#codeForm').addEventListener('submit', async (e) => { e.preventDefault(); $('#error').textContent = '';
    try { const r = await api('verify', { email, code: $('#code').value.trim() }); sessionStorage.setItem(K, r.token); start(); } catch (x) { $('#error').textContent = x.message; } });
  $('#leadForm').addEventListener('submit', async (e) => { e.preventDefault(); $('#error').textContent = '';
    try { const r = await api('passcode', { name: $('#lname').value.trim(), passcode: $('#lpass').value }); $('#lpass').value = ''; sessionStorage.setItem(K, r.token); start(); } catch (x) { $('#error').textContent = x.message; } });
  $('#again').addEventListener('click', (e) => { e.preventDefault(); $('#codeForm').hidden = true; $('#emailForm').hidden = false; });

  // ---------- app ----------
  let D = null, tab = 'seat', sel = null, msg = '';
  async function load() { D = await api('data'); }
  async function start() { $('#login').hidden = true; $('#app').hidden = false; try { await load(); render(); } catch (x) { $('#content').textContent = x.message; } }
  function nav() { const t = $('#tabs'); t.replaceChildren(
    ...[['fill', 'Fill a host’s seat'], ['seat', 'Seating plan (rounds of 10)']].map(([k, l]) => h('button', { cls: 'nav' + (tab === k ? ' active' : ''), on: { click: () => { tab = k; sel = null; msg = ''; render(); } } }, l)),
    h('button', { cls: 'nav', id: 'logout', on: { click: () => { sessionStorage.removeItem(K); location.reload(); } } }, 'Sign out')); }
  function render() { nav(); const c = $('#content'); c.replaceChildren(); if (msg) c.append(h('p', { cls: 'ed-msg' }, msg)); (tab === 'fill' ? fillView : seatView)(c); }

  // ---------- fill a seat ----------
  function fillView(c) {
    c.append(h('p', {}, 'Signed in as ' + D.editor + '. Adding someone sends nothing. After you add a person you choose: send them the finish-registration email, copy their link, or do nothing.'));
    const open = D.fillable.filter((t) => t.empty.length && (t.free_ent == null || t.free_ent > 0));
    const ul = h('ul', { cls: 'ed-list' });
    for (const t of open) {
      const n = t.free_ent == null ? t.empty.length : Math.min(t.empty.length, t.free_ent);
      const dt = D.tables.find((x) => x.name === t.name || (t.host && x.host === t.host)); const extra = dt && dt.filled > t.cap - t.empty.length ? ' · the dashboard also counts ' + (dt.filled - (t.cap - t.empty.length)) + ' invited guest(s) here not yet in a seat' : '';
      const li = h('li', {}, h('div', {}, h('strong', {}, t.name), h('small', {}, (t.host && t.host !== t.name ? 'Host: ' + t.host + ' · ' : '') + n + ' open seat' + (n === 1 ? '' : 's') + ' of ' + t.cap + extra)),
        h('button', { cls: 'btn', on: { click: () => { li.after(form(t)); } } }, 'Add person'));
      ul.append(li);
    }
    c.append(open.length ? ul : h('p', {}, 'No open seats on existing tables.'));
  }
  function form(t) {
    const f = h('form', { cls: 'ed-form' });
    const fld = (id, l, type = 'text', req = true) => h('label', {}, l + (req ? '' : ' (optional)'), h('input', { name: id, type, required: req, maxlength: id === 'email' ? 320 : 200 }));
    const seat = h('select', { name: 'seat' }, t.empty.map((s) => h('option', { value: s }, 'Seat ' + s)));
    const err = h('p', { cls: 'full', role: 'alert' });
    f.append(h('div', { cls: 'full' }, h('strong', {}, 'Add a guest at ' + t.name)), fld('first_name', 'First name'), fld('last_name', 'Last name'), fld('email', 'Email', 'email'), fld('job_title', 'Job title'), fld('company', 'Company'), fld('phone', 'Phone', 'tel', false),
      h('label', {}, 'Seat', seat), h('p', { cls: 'full hint', style: 'text-align:left' }, 'They will accept the terms themselves when they finish registering. Nothing is emailed when you save.'), err,
      h('div', { cls: 'row' }, h('button', { cls: 'btn' }, 'Save guest'), h('button', { cls: 'btn ghost', type: 'button', on: { click: () => f.remove() } }, 'Cancel')));
    f.addEventListener('submit', async (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(f)); err.textContent = 'Saving…';
      try { const r = await api('fill', { table_id: t.id, seat_number: Number(v.seat), first_name: v.first_name, last_name: v.last_name, email: v.email, job_title: v.job_title, company: v.company, phone: v.phone });
        f.replaceWith(after(r.attendee_id, v.first_name + ' ' + v.last_name, v.email, t.name)); load().catch(() => {}); } catch (x) { err.textContent = x.message; } });
    return f;
  }
  function after(id, name, em, table) {
    const box = h('div', { cls: 'ed-form' }); const out = h('div', { cls: 'full' });
    const act = async (mode) => { out.textContent = 'Working…'; try { const r = await api('completion', { attendee_id: id, mode });
      if (mode === 'send') out.replaceChildren('Finish-registration email queued to ' + r.recipient + '.' + (r.held_until ? ' (Held until ' + r.held_until + '.)' : ''));
      else if (mode === 'copy') { out.replaceChildren('Their private finish-registration link (nothing was emailed):', h('div', { cls: 'linkbox' }, r.completion_url)); try { await navigator.clipboard.writeText(r.completion_url); out.append(h('small', {}, 'Copied to clipboard.')); } catch (_) {} }
      else out.replaceChildren('Done. Nothing was sent.'); choice.remove(); } catch (x) { out.textContent = x.message; } };
    const choice = h('div', { cls: 'choice full' }, h('button', { cls: 'btn', type: 'button', on: { click: () => act('send') } }, 'Send finish-registration email'), h('button', { cls: 'btn ghost', type: 'button', on: { click: () => act('copy') } }, 'Copy link'), h('button', { cls: 'btn ghost', type: 'button', on: { click: () => act('none') } }, 'Nothing for now'));
    box.append(h('div', { cls: 'full' }, h('strong', {}, name + ' added to ' + table + '.'), h('small', {}, 'Nothing has been emailed. What would you like to do for ' + em + '?')), choice, out);
    return box;
  }

  // ---------- seating plan: rounds of 10 (2026-11-02) ----------
  const S = () => D.seating;
  const asg = (k) => S().assignments.find((a) => a.person_key === k);
  const tableOf = (k) => { const id = (asg(k) || {}).seating_table_id || null; return id && S().tables.some((t) => t.id === id) ? id : null; };
  const byKey = () => Object.fromEntries(D.people.map((p) => [p.key, p]));
  const partyOf = (p) => D.people.filter((x) => x.party && x.party === p.party);
  const partyName = (p) => p.kind === 'table' ? (p.group || p.host) + ' party' : (p.companionOf || p.name) + '’s party';
  const tnum = (id) => { const t = S().tables.find((x) => x.id === id); return t ? 'Table ' + t.number : 'Not seated'; };
  function order(ppl) { const first = {}; ppl.forEach((p, i) => { if (!(p.party in first)) first[p.party] = i; }); const rk = (p) => (p.isHost ? 0 : p.invite ? 2 : p.companionOf ? 1 : 0);
    return [...ppl].sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0) || (a.party === b.party ? 0 : String(a.party).localeCompare(String(b.party))) || rk(a) - rk(b) || a.name.localeCompare(b.name)); }
  const atTable = (id) => order(D.people.filter((p) => tableOf(p.key) === id));
  function warnings() {
    const w = []; const P = byKey();
    for (const t of S().tables) { const n = atTable(t.id).length + (t.held_seats || 0); if (n > t.capacity) w.push('Table ' + t.number + ' is over capacity (' + n + ' of ' + t.capacity + ' seats).'); }
    const seenParty = new Set();
    for (const p of D.people) { if (!p.party || seenParty.has(p.party)) continue; seenParty.add(p.party); const g = partyOf(p); if (g.length < 2) continue;
      const where = [...new Set(g.map((x) => tableOf(x.key) || ''))]; if (where.length > 1 && where.some(Boolean)) w.push(partyName(p) + ' is split: ' + where.map((id) => id ? tnum(id) : 'not seated').join(', ') + '.'); }
    for (const a of S().assignments) if (a.wants_with_key && P[a.person_key] && P[a.wants_with_key] && tableOf(a.person_key) && tableOf(a.wants_with_key) !== tableOf(a.person_key)) w.push(P[a.person_key].name + ' asked to sit with ' + P[a.wants_with_key].name + ', who is ' + (tableOf(a.wants_with_key) ? 'at another table' : 'not seated yet') + '.');
    return w;
  }
  const separated = (k) => { const a = asg(k); return a && a.wants_with_key && tableOf(k) && tableOf(a.wants_with_key) !== tableOf(k); };
  async function op(body) { try { await api('seating', body); await load(); } catch (x) { msg = x.message; } render(); }
  const moveTo = (tableId) => { const s = sel; sel = null; if (!s) return; if (s.keys.length > 1) op({ op: 'assign_group', person_keys: s.keys, table_id: tableId, party: s.party }); else op({ op: 'assign', person_key: s.keys[0], table_id: tableId }); };
  const pick = (p, whole) => { const keys = whole ? partyOf(p).map((x) => x.key) : [p.key]; sel = (sel && sel.keys.join() === keys.join()) ? null : { keys, party: whole ? p.party : '', text: whole ? partyName(p) + ' (' + keys.length + ')' : p.name }; render(); };
  function chip(p) {
    const a = asg(p.key) || {}; const g = partyOf(p); const q = (window.__q || '').toLowerCase();
    const hit = q && (p.name + ' ' + (p.org || '') + ' ' + (p.title || '')).toLowerCase().includes(q);
    const sub = [p.isHost ? 'Host' : '', p.kind === 'table' ? (p.isHost ? '' : (p.host || '') + '’s party') : (p.companionOf ? 'Guest of ' + p.companionOf : 'Individual ticket'), p.board ? (p.board === 'SALUTE Board' ? 'SALUTE Board' : 'SLC') : '', p.invite ? 'reserved · awaiting registration' : p.status === 'Invited' ? 'awaiting registration' : ''].filter(Boolean).join(' · ');
    const li = h('li', { cls: 'chip2' + (sel && sel.keys.includes(p.key) ? ' sel' : '') + (separated(p.key) ? ' bad' : '') + (hit ? ' hit' : '') + (p.invite ? ' inv' : ''), draggable: 'true', 'data-k': p.key,
      on: { dragstart: (e) => { e.dataTransfer.setData('text/plain', 'k:' + p.key); }, click: (e) => { if (e.target.closest('button')) return; pick(p, false); } } },
      h('div', {}, p.invite ? 'Invited guest' : p.name, h('small', {}, [p.title, p.org].filter(Boolean).join(' · ')), h('small', {}, sub + (p.industry && p.industry !== 'Other' ? ' · ' + p.industry : '')),
        p.invite ? h('small', {}, p.name.replace(/^Invited: /, '')) : null, a.wants_with ? h('small', {}, 'Wants to sit with: ' + a.wants_with) : null),
      h('span', { cls: 'cb' }, g.length > 1 ? h('button', { cls: 'pty', type: 'button', draggable: 'true', title: 'Move ' + partyName(p) + ' together', on: { click: () => pick(p, true), dragstart: (e) => { e.stopPropagation(); e.dataTransfer.setData('text/plain', 'g:' + p.party); } } }, 'Party ' + g.length) : null,
        h('button', { cls: 'nt', type: 'button', title: 'Seating note', 'aria-label': 'Seating note for ' + p.name, on: { click: () => noteDlg(p) } }, '✎')));
    return li;
  }
  function dropZone(el, tableId) {
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop'); });
    el.addEventListener('dragleave', () => el.classList.remove('drop'));
    el.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.remove('drop'); const d = e.dataTransfer.getData('text/plain') || '';
      if (d.startsWith('g:')) { const party = d.slice(2); const keys = D.people.filter((x) => x.party === party).map((x) => x.key); if (keys.length) op({ op: 'assign_group', person_keys: keys, table_id: tableId, party }); }
      else if (d.startsWith('k:')) op({ op: 'assign', person_key: d.slice(2), table_id: tableId }); });
  }
  function seatView(c) {
    if (!S().tables.length) {
      c.append(h('p', {}, 'This is a separate seating layer: it never changes orders, payments, tickets or who owns a table.'),
        h('button', { cls: 'btn', on: { click: () => op({ op: 'auto' }) } }, 'Create the draft plan (rounds of 10)'),
        h('p', { cls: 'hint', style: 'text-align:left' }, 'Draft: honoree tables, then each host’s table as its own round (invited guests hold reserved seats), half tables paired, then individual guests and Board/SLC seats in rounds of 10, kept with the people they came with.'));
      c.append(h('button', { cls: 'btn ghost', style: 'margin-top:10px', on: { click: () => tableDlg() } }, 'Or start empty: add a round'));
      return;
    }
    const T = S().tables, draft = S().status !== 'final';
    const seated = D.people.filter((p) => tableOf(p.key)), held = T.reduce((n, t) => n + (t.held_seats || 0), 0), cap = T.reduce((n, t) => n + t.capacity, 0);
    const un = D.people.filter((p) => !tableOf(p.key));
    c.append(h('div', { cls: 'stat ' + (draft ? 'draft' : 'final') }, h('div', {}, h('strong', {}, draft ? 'DRAFT seating plan — not final' : 'FINAL seating plan'), h('small', {}, draft ? 'Everything here can be changed. The dashboard’s Seating chart tab shows it with a Draft label.' : 'Marked final. You can still change it; switch back to draft any time.')),
      h('button', { cls: 'btn ' + (draft ? '' : 'ghost'), on: { click: () => { if (confirm(draft ? 'Mark the seating plan as FINAL? (You can still edit it.)' : 'Switch the seating plan back to DRAFT?')) op({ op: 'status', status: draft ? 'final' : 'draft' }); } } }, draft ? 'Mark as final' : 'Back to draft')));
    c.append(h('p', { cls: 'sum' }, T.length + ' rounds · ' + cap + ' seats · ' + seated.filter((p) => !p.invite).length + ' people seated · ' + (seated.filter((p) => p.invite).length + held) + ' reserved · ' + Math.max(0, cap - seated.length - held) + ' open · ' + un.length + ' not seated'));
    const w = warnings(); if (w.length) c.append(h('div', { cls: 'ed-msg warn' }, h('strong', {}, 'Check: '), h('ul', {}, w.map((x) => h('li', {}, x)))));
    if (sel) c.append(h('div', { cls: 'tapbar' }, h('span', {}, 'Moving ' + sel.text + ' — tap “Seat here” on a round (or an open seat).'), h('span', {}, h('button', { on: { click: () => moveTo(null) } }, 'Unseat'), ' ', h('button', { on: { click: () => { sel = null; render(); } } }, 'Cancel'))));
    const q = (window.__q || '').toLowerCase();
    const search = h('input', { type: 'search', placeholder: 'Find a person (highlights at tables too)', value: window.__q || '', on: { input: (e) => { window.__q = e.target.value; const pos = e.target.selectionStart; render(); const s = document.querySelector('.pool input'); s.focus(); s.setSelectionRange(pos, pos); } } });
    const pool = h('div', { cls: 'pool' }, h('h3', {}, 'Not seated (' + un.length + ')'), search, h('ul', { cls: 'chips' }, un.filter((p) => !q || (p.name + ' ' + (p.org || '') + ' ' + (p.title || '') + ' ' + (p.via || '')).toLowerCase().includes(q)).map(chip)),
      un.length ? null : h('p', { cls: 'hint', style: 'text-align:left' }, 'Everyone is seated. Drag someone here (or tap them, then Unseat) to take them off a table.'));
    dropZone(pool, null);
    const grid = h('div', { cls: 'stgrid' });
    T.forEach((t, i) => {
      const ppl = atTable(t.id), used = ppl.length + (t.held_seats || 0), open = Math.max(0, t.capacity - used);
      const seats = h('ol', { cls: 'seats10' });
      ppl.forEach((p) => { const li = chip(p); seats.append(li); });
      for (let k = 0; k < (t.held_seats || 0); k++) seats.append(h('li', { cls: 'seat held' }, 'Reserved · guest list to come'));
      for (let k = 0; k < open; k++) seats.append(h('li', { cls: 'seat open' + (sel ? ' can' : ''), on: { click: () => { if (sel) moveTo(t.id); } } }, sel ? 'Open seat — tap to seat here' : 'Open seat'));
      const card = h('div', { cls: 'stbl' + (used > t.capacity ? ' over' : '') + (q && ppl.some((p) => (p.name + ' ' + (p.org || '') + ' ' + (p.title || '')).toLowerCase().includes(q)) ? ' found' : '') },
        h('div', { cls: 'hd' }, h('h3', {}, 'Table ' + t.number), h('span', { cls: 'cnt' }, used + ' / ' + t.capacity + (open ? ' · ' + open + ' open' : ''))),
        h('p', { cls: 'lbl' }, t.label || 'No label yet'), t.note ? h('small', { cls: 'tn' }, t.note) : null,
        sel ? h('button', { cls: 'btn', style: 'width:100%;margin:8px 0 4px', on: { click: () => moveTo(t.id) } }, 'Seat here') : null, seats,
        h('div', { cls: 'ops' }, h('button', { disabled: i === 0, title: 'Move this round up', on: { click: () => op({ op: 'table_move', id: t.id, dir: -1 }) } }, '↑ Up'), h('button', { disabled: i === T.length - 1, title: 'Move this round down', on: { click: () => op({ op: 'table_move', id: t.id, dir: 1 }) } }, '↓ Down'),
          h('button', { on: { click: () => tableDlg(t) } }, 'Rename / edit'), h('button', { on: { click: () => { if (confirm('Remove Table ' + t.number + (t.label ? ' (' + t.label + ')' : '') + '? Its people go back to “Not seated”.')) op({ op: 'table_delete', id: t.id }); } } }, 'Remove')));
      dropZone(card, t.id); grid.append(card);
    });
    c.append(h('div', { cls: 'tools' }, h('button', { cls: 'btn', on: { click: () => tableDlg() } }, 'Add a round'),
      h('button', { cls: 'btn ghost', on: { click: () => { if (confirm('Renumber all rounds 1, 2, 3… in their current order?')) op({ op: 'renumber' }); } } }, 'Renumber 1…' + T.length),
      h('button', { cls: 'btn ghost', on: { click: () => { if (confirm('Throw away the current plan and rebuild the DRAFT from scratch? Every placement is replaced (seating notes are kept). This is logged.')) op({ op: 'auto', replace: true }); } } }, 'Rebuild draft plan'),
      h('button', { cls: 'btn ghost', on: { click: () => historyDlg() } }, 'Change log'),
      h('small', {}, 'Computer: drag a person (or their “Party” button) onto a round. Phone: tap a person (or “Party”), then “Seat here”.')), h('div', { cls: 'sp' }, pool, grid));
  }
  function dialog(...kids) { const d = h('div', { cls: 'dlg', on: { click: (e) => { if (e.target === d) d.remove(); } } }, h('div', {}, ...kids)); document.body.append(d); return d; }
  function tableDlg(t) {
    const next = Math.max(0, ...S().tables.map((x) => x.number)) + 1;
    const n = h('input', { type: 'number', min: 1, max: 999, value: t ? t.number : next }), cap = h('input', { type: 'number', min: 1, max: 30, value: t ? t.capacity : 10 }), lb = h('input', { value: t && t.label ? t.label : '', maxlength: 120, placeholder: 'e.g. host name' }),
      nt = h('input', { value: t && t.note ? t.note : '', maxlength: 200 }), hs = h('input', { type: 'number', min: 0, max: 30, value: t ? t.held_seats || 0 : 0 });
    const d = dialog(h('h3', {}, t ? 'Edit Table ' + t.number : 'Add a round'), h('label', {}, 'Table number (taking a used number swaps the two)', n), h('label', {}, 'Seats', cap), h('label', {}, 'Label', lb), h('label', {}, 'Note (optional)', nt), h('label', {}, 'Seats held for a guest list to come', hs),
      h('div', { cls: 'choice' }, h('button', { cls: 'btn', on: { click: () => { d.remove(); op({ op: 'table_save', id: t ? t.id : undefined, number: Number(n.value), capacity: Number(cap.value), label: lb.value, note: nt.value, held_seats: Number(hs.value) }); } } }, 'Save'), h('button', { cls: 'btn ghost', on: { click: () => d.remove() } }, 'Cancel')));
  }
  async function historyDlg() {
    const d = dialog(h('h3', {}, 'Seating change log'), h('p', {}, 'Loading…'));
    try { const r = await api('history'); const P = byKey(); const box = d.firstChild; box.replaceChildren(h('h3', {}, 'Seating change log (latest ' + r.rows.length + ')'),
      h('ul', { cls: 'hist' }, r.rows.map((x) => h('li', {}, h('strong', {}, x.who), ' · ', new Date(x.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), h('small', {}, x.action.replace(/^seating_/, '').replace(/_/g, ' ') + (x.entity && P[x.entity] ? ': ' + P[x.entity].name : x.label ? ': ' + x.label : ''))))),
      h('div', { cls: 'choice' }, h('button', { cls: 'btn ghost', on: { click: () => d.remove() } }, 'Close'))); } catch (x) { d.firstChild.replaceChildren(h('p', {}, x.message)); }
  }
  function noteDlg(p) {
    const a = asg(p.key) || {};
    const ta = h('textarea', { maxlength: 500 }); ta.value = a.wants_with || '';
    const s = h('select', { style: 'width:100%' }, h('option', { value: '' }, '— nobody specific —'), D.people.filter((x) => x.key !== p.key).sort((x, y) => x.name.localeCompare(y.name)).map((x) => h('option', { value: x.key, selected: a.wants_with_key === x.key }, x.name)));
    const d = dialog(h('h3', {}, p.name), p.via ? h('p', {}, 'Came through ' + p.via) : null, h('label', {}, 'Wants to sit with (note)', ta), h('label', {}, 'Seat them with (we warn if separated)', s),
      h('div', { cls: 'choice' }, h('button', { cls: 'btn', on: { click: () => { d.remove(); op({ op: 'note', person_key: p.key, wants_with: ta.value, wants_with_key: s.value }); } } }, 'Save'), h('button', { cls: 'btn ghost', on: { click: () => d.remove() } }, 'Cancel')));
  }
  if (sessionStorage.getItem(K)) start();
})();
