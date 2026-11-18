/* Starea comună a planului: se încarcă de pe server, modificările se trimit ca operații
   și ajung live (Server-Sent Events) la toți cei care au pagina deschisă. */

const CLIENT = Math.random().toString(36).slice(2) + Date.now().toString(36);

export function createStore() {
  let state = { items: [], next: 1 };
  let rev = -1, status = 'connecting', loading = false, buffered = [], online = 0;
  const listeners = new Set();
  const queue = [];            // operații de trimis, în ordine
  const timers = new Map();    // id -> {t, item} pentru modificări cu întârziere (text)
  let sending = false, es = null, closed = false;

  const emit = () => listeners.forEach(f => f());
  const setStatus = s => { if (status !== s) { status = s; emit(); } };

  /* aplică o operație pe starea locală */
  function apply(op) {
    if (op.type === 'upsert') {
      const it = op.item; const i = state.items.findIndex(x => x.id === it.id);
      const items = i < 0 ? [...state.items, it] : state.items.map((x, k) => k === i ? it : x);
      state = { items, next: Math.max(state.next, (it.n || 0) + 1) };
    } else if (op.type === 'delete') {
      state = { ...state, items: state.items.filter(x => x.id !== op.id) };
    } else if (op.type === 'replace') {
      state = { items: op.state.items, next: op.state.next };
    }
  }

  /* operație venită de pe server */
  function onRemote(m) {
    if (m.rev <= rev) return;
    if (m.rev !== rev + 1) { load(); return; }
    rev = m.rev;
    if (m.client === CLIENT) {
      // ecoul propriei operații: păstrăm ce e local, preluăm doar numărul dat de server
      if (m.op.type === 'upsert') {
        const loc = state.items.find(x => x.id === m.op.item.id);
        if (loc && loc.n !== m.op.item.n) apply({ type: 'upsert', item: { ...loc, n: m.op.item.n } });
      }
    } else {
      if (m.op.type === 'upsert' && (timers.has(m.op.item.id) || queue.some(q => q.op.type === 'upsert' && q.op.item.id === m.op.item.id))) {
        /* avem o modificare locală mai nouă pentru același element: o lăsăm să câștige */
      } else apply(m.op);
    }
    emit();
  }

  async function load() {
    if (loading) return; loading = true; buffered = [];
    try {
      const r = await fetch('/api/plan', { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      state = j.state; rev = j.rev;
      for (const q of queue) apply(q.op);                       // modificările încă netrimise rămân
      for (const t of timers.values()) apply({ type: 'upsert', item: t.item });
      loading = false;
      const b = buffered; buffered = [];
      b.sort((a, c) => a.rev - c.rev).forEach(onRemote);
      if (status === 'connecting') setStatus('live');
      emit();
    } catch (e) {
      loading = false; setStatus('offline');
      setTimeout(() => { if (!closed) load(); }, 3000);
    }
  }

  function connect() {
    es = new EventSource('/api/events');
    es.onopen = () => setStatus(queue.length ? 'saving' : 'live');
    es.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === 'hello') { if (m.rev !== rev) load(); return; }
      if (m.type === 'presence') { if (online !== m.n) { online = m.n; emit(); } return; }
      if (loading) { buffered.push(m); return; }
      onRemote(m);
    };
    es.onerror = () => setStatus('offline');   // EventSource se reconectează singur
  }

  async function pump() {
    if (sending) return; sending = true;
    while (queue.length) {
      setStatus('saving');
      const q = queue[0];
      try {
        const r = await fetch('/api/op', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client: CLIENT, op: q.op }) });
        if (r.status >= 400 && r.status < 500) {          // operația a fost refuzată: o renunțăm
          queue.shift(); store.onError && store.onError((await r.json().catch(() => ({}))).error || 'Modificarea nu a fost acceptată'); load(); continue;
        }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        queue.shift();
      } catch {
        setStatus('offline');
        await new Promise(res => setTimeout(res, 2500));
      }
    }
    sending = false;
    setStatus(es && es.readyState === 1 ? 'live' : 'offline');
  }

  function send(op) { queue.push({ op }); pump(); }

  const store = {
    client: CLIENT,
    onError: null,
    getState: () => state,
    getStatus: () => status,
    getOnline: () => online,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    start() { connect(); load(); },
    stop() { closed = true; es && es.close(); },
    /** număr nou pentru un element (serverul îl poate corecta dacă e deja folosit) */
    nextN() { const n = state.next; state = { ...state, next: n + 1 }; return n; },
    /** adaugă sau modifică un element; delay > 0 grupează modificările rapide (ex. textul tastat) */
    upsert(item, delay = 0) {
      apply({ type: 'upsert', item }); emit();
      const old = timers.get(item.id); if (old) clearTimeout(old.t);
      if (delay > 0) {
        timers.set(item.id, { item, t: setTimeout(() => { timers.delete(item.id); send({ type: 'upsert', item: store.getState().items.find(x => x.id === item.id) || item }); }, delay) });
        setStatus('saving');
      } else { timers.delete(item.id); send({ type: 'upsert', item }); }
    },
    remove(id) {
      const old = timers.get(id); if (old) { clearTimeout(old.t); timers.delete(id); }
      apply({ type: 'delete', id }); emit(); send({ type: 'delete', id });
    },
    replace(s) {
      for (const t of timers.values()) clearTimeout(t.t); timers.clear();
      apply({ type: 'replace', state: s }); emit(); send({ type: 'replace', state: s });
    },
    async history() { const r = await fetch('/api/history', { cache: 'no-store' }); if (!r.ok) throw new Error(); return r.json(); },
    async restore(id) {
      const r = await fetch('/api/history/' + encodeURIComponent(id) + '/restore', { method: 'POST' });
      if (!r.ok) throw new Error();
    },
  };
  return store;
}
