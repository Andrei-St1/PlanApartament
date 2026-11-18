/* Server pentru planul 3D: păstrează planul comun într-un fișier JSON,
   primește modificări (operații) și le trimite live tuturor celor conectați (Server-Sent Events). */
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const PLAN_FILE = path.join(DATA_DIR, 'plan.json');
const HIST_FILE = path.join(DATA_DIR, 'history.json');
const PORT = +process.env.PORT || 3001;
const MAX_ITEMS = 1500, MAX_HISTORY = 100, SNAPSHOT_EVERY_MS = 5 * 60 * 1000;
const SUBS = new Set(['p1', 'p2', 'p3', 'pt', 'pi', 'pv', 's1', 's2', 'sc', 't', 'tb']);

fs.mkdirSync(DATA_DIR, { recursive: true });
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
let { state, rev } = readJson(PLAN_FILE, { state: { items: [], next: 1 }, rev: 0 });
let history = readJson(HIST_FILE, []);
let lastSnapshotAt = history.length ? history[0].at : 0;

/* scriere atomică, grupată */
let saveT = null;
function persist() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    const w = (f, obj) => { const tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(obj)); fs.renameSync(tmp, f); };
    try { w(PLAN_FILE, { state, rev }); w(HIST_FILE, history); } catch (e) { console.error('Nu s-a putut salva:', e.message); }
  }, 300);
}

function snapshot(force) {
  const now = Date.now();
  if (!force && now - lastSnapshotAt < SNAPSHOT_EVERY_MS) return;
  if (!state.items.length && !force) return;
  history.unshift({ id: now.toString(36) + Math.random().toString(36).slice(2, 6), at: now, count: state.items.length, state: structuredClone(state) });
  history = history.slice(0, MAX_HISTORY);
  lastSnapshotAt = now;
}

/* validare */
const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
function cleanItem(it) {
  if (!it || typeof it !== 'object') return null;
  if (typeof it.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(it.id)) return null;
  if (!SUBS.has(it.sub)) return null;
  if (!num(it.x, -20, 20) || !num(it.z, -20, 20) || !num(it.nx, -1.01, 1.01) || !num(it.nz, -1.01, 1.01) || !num(it.h, 0, 2.4)) return null;
  const out = { id: it.id, n: Number.isInteger(it.n) && it.n > 0 && it.n < 100000 ? it.n : 0, sub: it.sub, x: it.x, z: it.z, nx: it.nx, nz: it.nz, h: it.h,
    text: typeof it.text === 'string' ? it.text.slice(0, 60) : '', room: Number.isInteger(it.room) ? it.room : null };
  if (it.ded === true) out.ded = true;
  return out;
}

/* aplică o operație; întoarce operația „curată” (cu numărul dat de server) sau un mesaj de eroare */
function applyOp(op) {
  if (!op || typeof op !== 'object') return { error: 'Operație invalidă' };
  if (op.type === 'upsert') {
    const it = cleanItem(op.item); if (!it) return { error: 'Element invalid' };
    const i = state.items.findIndex(x => x.id === it.id);
    if (i >= 0) { it.n = state.items[i].n; state.items[i] = it; }
    else {
      if (state.items.length >= MAX_ITEMS) return { error: 'Prea multe elemente' };
      if (!it.n || state.items.some(x => x.n === it.n)) it.n = state.next;   // numărul cerut e ocupat: dăm altul
      state.next = Math.max(state.next, it.n + 1);
      state.items.push(it);
    }
    return { op: { type: 'upsert', item: it } };
  }
  if (op.type === 'delete') {
    if (typeof op.id !== 'string') return { error: 'Operație invalidă' };
    state.items = state.items.filter(x => x.id !== op.id);
    return { op: { type: 'delete', id: op.id } };
  }
  if (op.type === 'replace') {
    const s = op.state; if (!s || !Array.isArray(s.items)) return { error: 'Date invalide' };
    const seen = new Set(), items = [];
    for (const raw of s.items.slice(0, MAX_ITEMS)) { const it = cleanItem(raw); if (it && !seen.has(it.id)) { seen.add(it.id); items.push(it); } }
    let next = Math.max(Number.isInteger(s.next) ? s.next : 1, 1);
    for (const it of items) { if (!it.n) it.n = next++; next = Math.max(next, it.n + 1); }
    snapshot(true);                                    // varianta de dinainte rămâne în istoric
    state = { items, next };
    return { op: { type: 'replace', state: structuredClone(state) } };
  }
  return { error: 'Operație necunoscută' };
}

/* clienți conectați (SSE) */
const clients = new Set();
function broadcast(msg) { const data = `data: ${JSON.stringify(msg)}\n\n`; for (const res of clients) res.write(data); }
const presence = () => broadcast({ type: 'presence', n: clients.size });

function commit(op, client) {
  if (op.type !== 'replace') snapshot(false);
  const r = applyOp(op);
  if (r.error) return r;
  rev++; persist();
  broadcast({ rev, client, op: r.op });
  return { rev };
}

/* limită simplă de viteză, pe IP */
const buckets = new Map();
function limited(ip) {
  const now = Date.now(); const b = buckets.get(ip) || { t: now, n: 0 };
  if (now - b.t > 10000) { b.t = now; b.n = 0; }
  b.n++; buckets.set(ip, b);
  return b.n > 200;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (now - b.t > 60000) buckets.delete(k); }, 60000).unref();

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));

app.get('/api/plan', (req, res) => { res.set('Cache-Control', 'no-store'); res.json({ state, rev }); });

app.post('/api/op', (req, res) => {
  if (limited(req.ip)) return res.status(429).json({ error: 'Prea multe modificări într-un timp scurt' });
  const { client, op } = req.body || {};
  const r = commit(op, typeof client === 'string' ? client.slice(0, 64) : '');
  if (r.error) return res.status(400).json(r);
  res.json(r);
});

app.get('/api/history', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(history.map(h => ({ id: h.id, at: h.at, count: h.count })));
});
app.post('/api/history/:id/restore', (req, res) => {
  if (limited(req.ip)) return res.status(429).json({ error: 'Prea multe modificări într-un timp scurt' });
  const h = history.find(x => x.id === req.params.id);
  if (!h) return res.status(404).json({ error: 'Versiunea nu există' });
  const r = commit({ type: 'replace', state: structuredClone(h.state) }, 'history');
  if (r.error) return res.status(400).json(r);
  res.json(r);
});

app.get('/api/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write(`retry: 3000\ndata: ${JSON.stringify({ type: 'hello', rev })}\n\n`);
  clients.add(res); presence();
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); clients.delete(res); presence(); });
});

/* aplicația construită (npm run build) */
const DIST = path.join(ROOT, 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { index: 'index.html', maxAge: '1h' }));
  app.get('*', (req, res, next) => (req.path.startsWith('/api/') ? next() : res.sendFile(path.join(DIST, 'index.html'))));
}

app.listen(PORT, () => console.log(`Planul rulează pe http://localhost:${PORT}  (date în ${DATA_DIR})`));
