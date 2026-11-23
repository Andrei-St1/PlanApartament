/* Logica comună a planului (validare + aplicarea operațiilor).
   O folosesc atât serverul Node (server.js), cât și varianta Cloudflare (worker/index.js). */

export const MAX_ITEMS = 1500, MAX_HISTORY = 100, SNAPSHOT_EVERY_MS = 5 * 60 * 1000;
const SUBS = new Set(['p1', 'p2', 'p3', 'p4', 'pc', 'pt', 'pi', 'pv', 's1', 's2', 's3', 'sc', 'sx', 't', 'tb']);

export const emptyPlan = () => ({ state: { items: [], next: 1 }, rev: 0 });
export const newHistoryId = now => now.toString(36) + Math.random().toString(36).slice(2, 6);

const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

export function cleanItem(it) {
  if (!it || typeof it !== 'object') return null;
  if (typeof it.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(it.id)) return null;
  if (!SUBS.has(it.sub)) return null;
  if (!num(it.x, -20, 20) || !num(it.z, -20, 20) || !num(it.nx, -1.01, 1.01) || !num(it.nz, -1.01, 1.01) || !num(it.h, 0, 2.4)) return null;
  const out = { id: it.id, n: Number.isInteger(it.n) && it.n > 0 && it.n < 100000 ? it.n : 0, sub: it.sub, x: it.x, z: it.z, nx: it.nx, nz: it.nz, h: it.h,
    text: typeof it.text === 'string' ? it.text.slice(0, 60) : '', room: Number.isInteger(it.room) ? it.room : null };
  if (it.ded === true) out.ded = true;
  if (num(it.kw, 0.1, 30)) out.kw = Math.round(it.kw * 10) / 10;   // puterea aparatului de pe circuitul separat (kW)
  if (typeof it.pair === 'string' && it.pair !== it.id && /^[A-Za-z0-9_-]{1,40}$/.test(it.pair)) out.pair = it.pair;
  return out;
}

/* Aplică o operație fără să modifice starea primită.
   Întoarce { state, op, replace } (op = operația „curată”, cu numărul dat de server) sau { error }. */
export function applyOp(state, op) {
  if (!op || typeof op !== 'object') return { error: 'Operație invalidă' };
  if (op.type === 'upsert') {
    const it = cleanItem(op.item); if (!it) return { error: 'Element invalid' };
    const items = state.items.slice(); let next = state.next;
    const i = items.findIndex(x => x.id === it.id);
    if (i >= 0) { it.n = items[i].n; items[i] = it; }
    else {
      if (items.length >= MAX_ITEMS) return { error: 'Prea multe elemente' };
      if (!it.n || items.some(x => x.n === it.n)) it.n = next;   // numărul cerut e ocupat: dăm altul
      next = Math.max(next, it.n + 1);
      items.push(it);
    }
    return { state: { items, next }, op: { type: 'upsert', item: it } };
  }
  if (op.type === 'delete') {
    if (typeof op.id !== 'string') return { error: 'Operație invalidă' };
    return { state: { items: state.items.filter(x => x.id !== op.id), next: state.next }, op: { type: 'delete', id: op.id } };
  }
  if (op.type === 'replace') {
    const s = op.state; if (!s || !Array.isArray(s.items)) return { error: 'Date invalide' };
    const seen = new Set(), items = [];
    for (const raw of s.items.slice(0, MAX_ITEMS)) { const it = cleanItem(raw); if (it && !seen.has(it.id)) { seen.add(it.id); items.push(it); } }
    let next = Math.max(Number.isInteger(s.next) ? s.next : 1, 1);
    for (const it of items) { if (!it.n) it.n = next++; next = Math.max(next, it.n + 1); }
    const ns = { items, next };
    return { state: ns, op: { type: 'replace', state: ns }, replace: true };
  }
  return { error: 'Operație necunoscută' };
}

/* limită simplă de viteză, pe IP: 200 de cereri la 10 secunde */
export function createLimiter() {
  const buckets = new Map();
  return function limited(ip) {
    const now = Date.now(); const b = buckets.get(ip) || { t: now, n: 0 };
    if (now - b.t > 10000) { b.t = now; b.n = 0; }
    b.n++; buckets.set(ip, b);
    if (buckets.size > 5000) for (const [k, v] of buckets) if (now - v.t > 60000) buckets.delete(k);
    return b.n > 200;
  };
}
