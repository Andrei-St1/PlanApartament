/* Varianta Cloudflare: Worker + Durable Object.
   Paginile vin din fișierele construite (dist/); /api/* ajunge la un singur Durable Object („main”),
   care păstrează planul și istoricul în SQLite și trimite modificările live prin WebSocket. */
import { DurableObject } from 'cloudflare:workers';
import { applyOp, emptyPlan, newHistoryId, createLimiter, MAX_HISTORY, SNAPSHOT_EVERY_MS } from '../server/core.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) return env.PLAN.get(env.PLAN.idFromName('main')).fetch(req);
    return env.ASSETS.fetch(req);
  },
};

export class PlanDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY, at INTEGER NOT NULL, count INTEGER NOT NULL, state TEXT NOT NULL)');
    const row = this.sql.exec("SELECT v FROM kv WHERE k = 'plan'").toArray()[0];
    const p = row ? JSON.parse(row.v) : emptyPlan();
    this.state = p.state; this.rev = p.rev;
    this.lastSnapshotAt = this.sql.exec('SELECT MAX(at) AS at FROM history').one().at || 0;
    this.limited = createLimiter();
    // ping/pong fără să trezească obiectul (WebSocket hibernation)
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  snapshot(force) {
    const now = Date.now();
    if (!force && now - this.lastSnapshotAt < SNAPSHOT_EVERY_MS) return;
    if (!this.state.items.length && !force) return;
    this.sql.exec('INSERT INTO history (id, at, count, state) VALUES (?, ?, ?, ?)',
      newHistoryId(now), now, this.state.items.length, JSON.stringify(this.state));
    this.sql.exec('DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY at DESC LIMIT ?)', MAX_HISTORY);
    this.lastSnapshotAt = now;
  }

  commit(op, client) {
    const r = applyOp(this.state, op);
    if (r.error) return r;
    this.snapshot(!!r.replace);                    // varianta de dinainte rămâne în istoric
    this.state = r.state; this.rev++;
    this.sql.exec("INSERT OR REPLACE INTO kv (k, v) VALUES ('plan', ?)", JSON.stringify({ state: this.state, rev: this.rev }));
    this.broadcast({ rev: this.rev, client, op: r.op });
    return { rev: this.rev };
  }

  sockets(except) { return this.ctx.getWebSockets().filter(ws => ws !== except && ws.readyState === WebSocket.OPEN); }
  broadcast(msg, except) {
    const data = JSON.stringify(msg);
    for (const ws of this.sockets(except)) { try { ws.send(data); } catch {} }
  }
  presence(except) { this.broadcast({ type: 'presence', n: this.sockets(except).length }, except); }

  async fetch(req) {
    const { pathname: p } = new URL(req.url);
    const ip = req.headers.get('CF-Connecting-IP') || '';

    if (p === '/api/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'Este nevoie de WebSocket' }, 426);
      const [client, server] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify({ type: 'hello', rev: this.rev }));
      this.presence();
      return new Response(null, { status: 101, webSocket: client });
    }

    if (p === '/api/plan' && req.method === 'GET') return json({ state: this.state, rev: this.rev });

    if (p === '/api/op' && req.method === 'POST') {
      if (this.limited(ip)) return json({ error: 'Prea multe modificări într-un timp scurt' }, 429);
      if (+req.headers.get('Content-Length') > 1024 * 1024) return json({ error: 'Date prea mari' }, 413);
      const body = await req.json().catch(() => null) || {};
      const r = this.commit(body.op, typeof body.client === 'string' ? body.client.slice(0, 64) : '');
      return r.error ? json(r, 400) : json(r);
    }

    if (p === '/api/history' && req.method === 'GET') {
      return json(this.sql.exec('SELECT id, at, count FROM history ORDER BY at DESC').toArray());
    }

    const m = p.match(/^\/api\/history\/([^/]+)\/restore$/);
    if (m && req.method === 'POST') {
      if (this.limited(ip)) return json({ error: 'Prea multe modificări într-un timp scurt' }, 429);
      const row = this.sql.exec('SELECT state FROM history WHERE id = ?', decodeURIComponent(m[1])).toArray()[0];
      if (!row) return json({ error: 'Versiunea nu există' }, 404);
      const r = this.commit({ type: 'replace', state: JSON.parse(row.state) }, 'history');
      return r.error ? json(r, 400) : json(r);
    }

    return json({ error: 'Nu există' }, 404);
  }

  webSocketMessage(ws, msg) { if (msg === 'ping') ws.send('pong'); }
  webSocketClose(ws, code) {
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code); } catch {}
    this.presence(ws);
  }
  webSocketError(ws) { this.presence(ws); }
}
