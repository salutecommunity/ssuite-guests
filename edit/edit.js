// S.Suite edit mode. Talks only to the guests-edit backend; holds no data. Session token in sessionStorage.
(function () {
  const B = 'https://iddzcbknnddkonrcwgpt.supabase.co/functions/v1/guests-edit', K = 'ge_token';
  const $ = (s) => document.querySelector(s);
  const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'on') for (const [ev, f] of Object.entries(v)) e.addEventListener(ev, f); else if (k === 'cls') e.className = v; else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); } for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k))); return e; };
  async function api(path, body) {
    const t = sessionStorage.getItem(K);
    const r = await fetch(B + '/' + path, { method: body ? 'POST' : 'GET', headers: Object.assign({ 'Content-Type': 'application/json' }, t ? { Authorization: 'Bearer ' + t } : {}), body: body ? JSON.stringify(body) : undefined, cache: 'no-store', credentials: 'omit' });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && t && path !== 'verify') { sessionStorage.removeItem(K); location.reload(); }
    if (!r.ok) throw new Error(j.error || 'Something went wrong');
    return j;
  }
  // ---------- sign in ----------
  let email = '';
  $('#emailForm').addEventListener('submit', async (e) => { e.preventDefault(); $('#error').textContent = ''; email = $('#email').value.trim().toLowerCase();
    try { await api('request-code', { email }); $('#emailForm').hidden = true; $('#codeForm').hidden = false; $('#sentTo').textContent = 'If ' + email + ' is a named editor, a code is on its way (subject: "Your S.Suite Admin sign-in code"). It works for 10 minutes.'; $('#code').focus(); } catch (x) { $('#error').textContent = x.message; } });
  $('#codeForm').addEventListener('submit', async (e) => { e.preventDefault(); $('#error').textContent = '';
    try { const r = await api('verify', { email, code: $('#code').value.trim() }); sessionStorage.setItem(K, r.token); start(); } catch (x) { $('#error').textContent = x.message; } });
  $('#again').addEventListener('click', (e) => { e.preventDefault(); $('#codeForm').hidden = true; $('#emailForm').hidden = false; });

  // ---------- app ----------
  let D = null, tab = 'fill', sel = null, msg = '';
  async function load() { D = await api('data'); }
  async function start() { $('#login').hidden = true; $('#app').hidden = false; try { await load(); render(); } catch (x) { $('#content').textContent = x.message; } }
  function nav() { const t = $('#tabs'); t.replaceChildren(
    ...[['fill', 'Fill a host’s seat'], ['seat', 'Seating plan']].map(([k, l]) => h('button', { cls: 'nav' + (tab === k ? ' active' : ''), on: { click: () => { tab = k; sel = null; msg = ''; render(); } } }, l)),
    h('button', { cls: 'nav', id: 'logout', on: { click: () => { sessionStorage.removeItem(K); location.reload(); } } }, 'Sign out')); }
  function render() { nav(); const c = $('#content'); c.replaceChildren(); if (msg) c.append(h('p', { cls: 'ed-msg' }, msg)); (tab === 'fill' ? fillView : seatView)(c); }

  // ---------- fill a seat ----------
  function fillView(c) {
    c.append(h('p', {}, 'Signed in as ' + D.editor + '. Adding someone sends nothing. After you add a person you choose: send them the finish-registration email, copy their link, or do nothing.'));
    const open = D.fillable.filter((t) => t.empty.length && (t.free_ent == null || t.free_ent > 0));
    const ul = h('ul', { cls: 'ed-list' });
    for (const t of open) {
      const n = t.free_ent == null ? t.empty.length : Math.min(t.empty.length, t.free_ent);
      const li = h('li', {}, h('div', {}, h('strong', {}, t.name), h('small', {}, (t.host && t.host !== t.name ? 'Host: ' + t.host + ' · ' : '') + n + ' open seat' + (n === 1 ? '' : 's') + ' of ' + t.cap)),
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

  // ---------- seating plan ----------
  const S = () => D.seating;
  const asg = (k) => S().assignments.find((a) => a.person_key === k);
  const tableOf = (k) => (asg(k) || {}).seating_table_id || null;
  const byKey = () => Object.fromEntries(D.people.map((p) => [p.key, p]));
  function warnings() {
    const w = []; const P = byKey();
    for (const t of S().tables) { const n = D.people.filter((p) => tableOf(p.key) === t.id).length; if (n > t.capacity) w.push('Table ' + t.number + ' is over capacity (' + n + ' of ' + t.capacity + ').'); }
    for (const a of S().assignments) if (a.wants_with_key && P[a.person_key] && P[a.wants_with_key] && tableOf(a.person_key) && tableOf(a.wants_with_key) !== tableOf(a.person_key)) w.push(P[a.person_key].name + ' asked to sit with ' + P[a.wants_with_key].name + ', who is ' + (tableOf(a.wants_with_key) ? 'at another table' : 'not seated yet') + '.');
    return w;
  }
  const separated = (k) => { const a = asg(k); return a && a.wants_with_key && tableOf(k) && tableOf(a.wants_with_key) !== tableOf(k); };
  async function op(body) { try { await api('seating', body); await load(); } catch (x) { msg = x.message; } render(); }
  function chip(p) {
    const a = asg(p.key) || {};
    const li = h('li', { cls: 'chip2' + (sel === p.key ? ' sel' : '') + (separated(p.key) ? ' bad' : ''), draggable: 'true', 'data-k': p.key,
      on: { dragstart: (e) => { e.dataTransfer.setData('text/plain', p.key); }, click: (e) => { if (e.target.closest('.nt')) return; sel = sel === p.key ? null : p.key; render(); } } },
      h('div', {}, p.name, h('small', {}, [p.group ? (p.isHost ? 'Host · ' : '') + p.group : (p.companionOf ? 'Guest of ' + p.companionOf : 'Individual ticket'), p.status === 'Invited' ? ' · invited' : ''].join('')),
        p.via ? h('small', { cls: 'flag' }, 'Came through ' + p.via) : null, a.wants_with ? h('small', {}, 'Wants to sit with: ' + a.wants_with) : null),
      h('button', { cls: 'nt', type: 'button', title: 'Seating note', 'aria-label': 'Seating note for ' + p.name, on: { click: () => noteDlg(p) } }, '✎'));
    return li;
  }
  function dropZone(el, tableId) {
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop'); });
    el.addEventListener('dragleave', () => el.classList.remove('drop'));
    el.addEventListener('drop', (e) => { e.preventDefault(); el.classList.remove('drop'); const k = e.dataTransfer.getData('text/plain'); if (k) op({ op: 'assign', person_key: k, table_id: tableId }); });
  }
  function seatView(c) {
    const P = byKey();
    if (!S().tables.length) {
      c.append(h('p', {}, 'This is a separate seating layer: it never changes orders, payments or who owns a table.'),
        h('button', { cls: 'btn', on: { click: () => op({ op: 'auto' }) } }, 'Start with the default plan'),
        h('p', { cls: 'hint', style: 'text-align:left' }, 'Default: each paid, partner and honoree table becomes a numbered table with its guests; individual ticket holders are placed on tables around them, kept together by invite page.'));
      c.append(h('button', { cls: 'btn ghost', style: 'margin-top:10px', on: { click: () => tableDlg() } }, 'Or start empty: add a table'));
      return;
    }
    const w = warnings(); if (w.length) c.append(h('div', { cls: 'ed-msg warn' }, h('strong', {}, 'Check: '), h('ul', {}, w.map((x) => h('li', {}, x)))));
    if (sel) c.append(h('div', { cls: 'tapbar' }, h('span', {}, 'Moving ' + (P[sel] ? P[sel].name : '') + ' — tap a table to seat them.'), h('span', {}, h('button', { on: { click: () => op({ op: 'assign', person_key: sel, table_id: null }).then(() => { sel = null; render(); }) } }, 'Unseat'), ' ', h('button', { on: { click: () => { sel = null; render(); } } }, 'Cancel'))));
    const q = (window.__q || '').toLowerCase();
    const un = D.people.filter((p) => !tableOf(p.key) || !S().tables.some((t) => t.id === tableOf(p.key)));
    const search = h('input', { type: 'search', placeholder: 'Search unseated', value: window.__q || '', on: { input: (e) => { window.__q = e.target.value; const pos = e.target.selectionStart; render(); const s = document.querySelector('.pool input'); s.focus(); s.setSelectionRange(pos, pos); } } });
    const pool = h('div', { cls: 'pool' }, h('h3', {}, 'Not seated (' + un.length + ')'), search, h('ul', { cls: 'chips' }, un.filter((p) => !q || (p.name + ' ' + (p.org || '') + ' ' + (p.via || '')).toLowerCase().includes(q)).map(chip)));
    dropZone(pool, null);
    const grid = h('div', { cls: 'stgrid' });
    for (const t of S().tables) {
      const ppl = D.people.filter((p) => tableOf(p.key) === t.id);
      const card = h('div', { cls: 'stbl' + (ppl.length > t.capacity ? ' over' : '') },
        h('div', { cls: 'hd', on: { click: () => { if (sel) { const k = sel; sel = null; op({ op: 'assign', person_key: k, table_id: t.id }); } } } }, h('h3', {}, 'Table ' + t.number), h('span', { cls: 'cnt' }, ppl.length + ' / ' + t.capacity)),
        t.label ? h('small', {}, t.label) : null, h('ul', { cls: 'chips', style: 'margin-top:8px' }, ppl.map(chip)),
        sel ? h('button', { cls: 'btn', style: 'width:100%;margin-top:6px', on: { click: () => { const k = sel; sel = null; op({ op: 'assign', person_key: k, table_id: t.id }); } } }, 'Seat here') : null,
        h('div', { cls: 'ops' }, h('button', { on: { click: () => tableDlg(t) } }, 'Edit'), h('button', { on: { click: () => { if (confirm('Remove Table ' + t.number + '? Its people go back to “Not seated”.')) op({ op: 'table_delete', id: t.id }); } } }, 'Remove')));
      dropZone(card, t.id); grid.append(card);
    }
    c.append(h('div', { cls: 'tools' }, h('button', { cls: 'btn', on: { click: () => tableDlg() } }, 'Add table'),
      h('button', { cls: 'btn ghost', on: { click: () => { if (confirm('Rebuild the whole plan from the default? Current table placements are replaced; seating notes are kept.')) op({ op: 'auto', replace: true }); } } }, 'Reset to default plan'),
      h('small', {}, 'Drag people between tables, or tap a person and then tap a table.')), h('div', { cls: 'sp' }, pool, grid));
  }
  function dialog(...kids) { const d = h('div', { cls: 'dlg', on: { click: (e) => { if (e.target === d) d.remove(); } } }, h('div', {}, ...kids)); document.body.append(d); return d; }
  function tableDlg(t) {
    const next = Math.max(0, ...S().tables.map((x) => x.number)) + 1;
    const n = h('input', { type: 'number', min: 1, max: 999, value: t ? t.number : next }), cap = h('input', { type: 'number', min: 1, max: 30, value: t ? t.capacity : 10 }), lb = h('input', { value: t && t.label ? t.label : '', maxlength: 120 });
    const d = dialog(h('h3', {}, t ? 'Edit Table ' + t.number : 'Add a table'), h('label', {}, 'Table number', n), h('label', {}, 'Seats', cap), h('label', {}, 'Label (optional)', lb),
      h('div', { cls: 'choice' }, h('button', { cls: 'btn', on: { click: () => { d.remove(); op({ op: 'table_save', id: t ? t.id : undefined, number: Number(n.value), capacity: Number(cap.value), label: lb.value }); } } }, 'Save'), h('button', { cls: 'btn ghost', on: { click: () => d.remove() } }, 'Cancel')));
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
