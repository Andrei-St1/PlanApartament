/* Server Node pentru planul 3D: păstrează planul comun într-un fișier JSON,
   primește modificări (operații) și le trimite live tuturor celor conectați (WebSocket pe /api/ws).
   Pentru Cloudflare există varianta din worker/index.js, cu aceeași interfață /api/*. */
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { applyOp, emptyPlan, newHistoryId, createLimiter, MAX_HISTORY, SNAPSHOT_EVERY_MS } from './core.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const PLAN_FILE = path.join(DATA_DIR, 'plan.json');
const HIST_FILE = path.join(DATA_DIR, 'history.json');
const PORT = +process.env.PORT || 3001;

fs.mkdirSync(DATA_DIR, { recursive: true });
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
let { state, rev } = readJson(PLAN_FILE, emptyPlan());
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
  history.unshift({ id: newHistoryId(now), at: now, count: state.items.length, state: structuredClone(state) });
  history = history.slice(0, MAX_HISTORY);
  lastSnapshotAt = now;
}

/* clienți conectați */
let wss = null;
function broadcast(msg) {
  if (!wss) return;
  const data = JSON.stringify(msg);
  for (const ws of wss.clients) if (ws.readyState === 1) ws.send(data);
}
const presence = () => broadcast({ type: 'presence', n: wss ? wss.clients.size : 0 });

function commit(op, client) {
  const r = applyOp(state, op);
  if (r.error) return r;
  snapshot(!!r.replace);                    // varianta de dinainte rămâne în istoric
  state = r.state; rev++; persist();
  broadcast({ rev, client, op: r.op });
  return { rev };
}

const limited = createLimiter();

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

/* aplicația construită (npm run build) */
const DIST = path.join(ROOT, 'dist');
if (fs.existsSync(DIST)) {
  // index.html se verifică la fiecare încărcare, ca toți să primească imediat versiunea nouă
  const noCache = res => res.set('Cache-Control', 'no-cache');
  app.use(express.static(DIST, { index: 'index.html', maxAge: '1h', setHeaders: (res, f) => { if (f.endsWith('.html')) noCache(res); } }));
  app.get('*', (req, res, next) => (req.path.startsWith('/api/') ? next() : (noCache(res), res.sendFile(path.join(DIST, 'index.html')))));
}

const server = app.listen(PORT, () => console.log(`Planul rulează pe http://localhost:${PORT}  (date în ${DATA_DIR})`));

wss = new WebSocketServer({ server, path: '/api/ws', maxPayload: 1024 });
wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'hello', rev }));
  presence();
  ws.on('message', m => { if (m.toString() === 'ping') ws.send('pong'); });
  ws.on('close', presence);
  ws.on('error', () => {});
});
