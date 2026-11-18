/* Calculul traseelor de cablu prin șapă (portat din planul original) */
import { GC, GX, GY, NC, wallCell, doorCell, nearW, ROOMS, SUB, CX, CZ, hasPower, switchLinks } from './geometry.js';

export const SCREED = 0.05;
const TURN = 0.3;
export const PAL = ['#e6194b', '#2e9e44', '#4363d8', '#f58231', '#911eb4', '#0fa3b1', '#f032e6', '#9a6324', '#808000', '#000075', '#b8860b', '#e377c2'];
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

function costArr(RS) {
  const a = new Float32Array(NC);
  for (let k = 0; k < NC; k++) {
    const w = wallCell[k];
    a[k] = w === 2 ? Infinity : w === 1 ? 40 : doorCell[k] ? 1 : nearW[k] ? (RS.mode === 'par' ? 1.8 : 1.15) : 1;
  }
  return a;
}

class Heap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(k, v) {
    const K = this.k, V = this.v; let i = K.length; K.push(k); V.push(v);
    while (i > 0) { const p = (i - 1) >> 1; if (K[p] <= k) break; K[i] = K[p]; V[i] = V[p]; i = p; }
    K[i] = k; V[i] = v;
  }
  pop() {
    const K = this.k, V = this.v; const rk = K[0], rv = V[0]; const lk = K.pop(), lv = V.pop(); const n = K.length;
    if (n) {
      let i = 0;
      while (true) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && K[c + 1] < K[c]) c++; if (K[c] >= lk) break; K[i] = K[c]; V[i] = V[c]; i = c; }
      K[i] = lk; V[i] = lv;
    }
    return [rk, rv];
  }
}

function dijkstra(src, CA, RS) {
  const dirs = RS.mode === 'par' ? DIRS4 : DIRS8, ND = dirs.length, N = NC * ND;
  const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), h = new Heap();
  for (let d = 0; d < ND; d++) { dist[src * ND + d] = 0; h.push(0, src * ND + d); }
  while (h.size) {
    const [dc, s] = h.pop(); if (dc > dist[s]) continue;
    const c = (s / ND) | 0, d0 = s - c * ND, ci = c % GX, cj = (c / GX) | 0;
    for (let d = 0; d < ND; d++) {
      const ni = ci + dirs[d][0], nj = cj + dirs[d][1]; if (ni < 0 || nj < 0 || ni >= GX || nj >= GY) continue;
      const nk = nj * GX + ni, cc = CA[nk]; if (cc === Infinity) continue;
      if (d >= 4 && (CA[cj * GX + ni] > 5 || CA[nj * GX + ci] > 5)) continue;
      let st = GC * cc * (d >= 4 ? Math.SQRT2 : 1); if (d !== d0 && RS.mode === 'par') st += TURN;
      const ns = nk * ND + d, nd = dc + st; if (nd < dist[ns]) { dist[ns] = nd; prev[ns] = s; h.push(nd, ns); }
    }
  }
  return { dist, prev, ND };
}

function nearestFree(k) {
  const i0 = k % GX, j0 = (k / GX) | 0;
  for (let r = 1; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
    const i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= GX || j >= GY) continue;
    const q = j * GX + i; if (!wallCell[q]) return q;
  }
  return k;
}

function portOf(it) {
  const wx = it.x + CX, wy = it.z + CZ, px = wx + it.nx * 0.15, py = wy + it.nz * 0.15;
  let k = Math.min(GY - 1, Math.max(0, Math.floor(py / GC))) * GX + Math.min(GX - 1, Math.max(0, Math.floor(px / GC)));
  if (wallCell[k]) k = nearestFree(k);
  const cx = (k % GX + .5) * GC, cy = (((k / GX) | 0) + .5) * GC;
  return { k, wx, wy, cx, cy, stub: Math.hypot(cx - wx, cy - wy) };
}

const roomShort = n => { const r = ROOMS.find(r => r.n === n); return r ? (r.name === 'Cameră' ? 'Cameră ' + n : r.name) : '?'; };
const vDrop = it => SUB[it.sub].cat === 'panel' ? it.h - 0.21 + SCREED : it.h + SCREED;

export function computeRoutes(items, RS) {
  const panel = items.find(i => SUB[i.sub].cat === 'panel');
  const devs = items.filter(i => { const c = SUB[i.sub].cat; return c === 'socket' || c === 'switch'; });
  if (!panel) return { err: 'Adaugă întâi tabloul electric (butonul „Tablou” jos).' };
  if (!devs.length) return { err: 'Adaugă prize sau întrerupătoare ca să calculez traseele.' };
  const CA = costArr(RS), cache = new Map(), port = new Map();
  for (const it of [panel, ...devs]) port.set(it.id, portOf(it));
  const dj = it => { if (!cache.has(it.id)) cache.set(it.id, dijkstra(port.get(it.id).k, CA, RS)); return cache.get(it.id); };
  const bestState = (r, k) => { let b = -1, bd = Infinity; for (let d = 0; d < r.ND; d++) { const v = r.dist[k * r.ND + d]; if (v < bd) { bd = v; b = k * r.ND + d; } } return [b, bd]; };
  const D = (a, b) => { const pa = port.get(a.id), pb = port.get(b.id); return bestState(dj(a), pb.k)[1] + pa.stub + pb.stub; };
  const path = (a, b) => {
    const r = dj(a), pb = port.get(b.id); let [s] = bestState(r, pb.k); const cells = [];
    while (s >= 0) { cells.push((s / r.ND) | 0); s = r.prev[s]; }
    cells.reverse();
    const pts = []; let len = 0, cross = 0;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (wallCell[c] === 1 && (i === 0 || wallCell[cells[i - 1]] !== 1)) cross++;
      const P = [(c % GX + .5) * GC, (((c / GX) | 0) + .5) * GC];
      if (i > 0) { const pc = cells[i - 1]; len += Math.hypot(P[0] - ((pc % GX + .5) * GC), P[1] - ((((pc / GX) | 0) + .5) * GC)); }
      if (i > 0 && i < cells.length - 1) { const a = cells[i - 1], n = cells[i + 1]; if ((c - a) === (n - c)) continue; }
      pts.push(P);
    }
    return { pts, len, cross };
  };
  // grupare pe circuite
  const groups = [], cat = it => SUB[it.sub].cat;
  const sock = devs.filter(i => hasPower(SUB[i.sub])), data = devs.filter(i => SUB[i.sub].data), sw = devs.filter(i => cat(i) === 'switch' && !SUB[i.sub].cross);   // comutatorul cruce e legat doar prin firele de comutare
  const pd = it => D(panel, it);
  const cluster = (list, max, prefix, kind) => {
    const byRoom = new Map(); list.forEach(i => { const k = i.room ?? -1; if (!byRoom.has(k)) byRoom.set(k, []); byRoom.get(k).push(i); });
    const rooms = [...byRoom.entries()].map(([r, l]) => ({ r, l, d: Math.min(...l.map(pd)) })).sort((a, b) => a.d - b.d);
    let cur = null; const out = [];
    for (const { r, l } of rooms) {
      const ord = [...l].sort((a, b) => pd(a) - pd(b));
      if (cur && cur.items.length + ord.length > max) cur = null;
      for (const it of ord) { if (!cur || cur.items.length >= max) { cur = { kind, items: [], rooms: new Set() }; out.push(cur); } cur.items.push(it); cur.rooms.add(r); }
    }
    out.forEach(g => { g.name = prefix + ' – ' + [...g.rooms].map(roomShort).join(', '); });
    return out;
  };
  sock.filter(i => i.ded).forEach(i => groups.push({ kind: 'ded', items: [i], name: 'Circuit dedicat – ' + (i.text || SUB[i.sub].name) + ' (' + roomShort(i.room) + ')' }));
  const rest = sock.filter(i => !i.ded);
  groups.push(...cluster(rest.filter(i => [4, 8].includes(i.room)), RS.max, 'Prize baie', 'socket'));
  groups.push(...cluster(rest.filter(i => [1, 2].includes(i.room)), Math.min(RS.max, 6), 'Prize bucătărie', 'socket'));
  groups.push(...cluster(rest.filter(i => ![4, 8, 1, 2].includes(i.room)), RS.max, 'Prize', 'socket'));
  groups.push(...cluster(sw, 8, 'Iluminat', 'light'));
  const net = data.filter(i => SUB[i.sub].net), tvs = data.filter(i => SUB[i.sub].tv);
  if (net.length) groups.push({ kind: 'data', net: true, items: net, name: 'Internet (cablu separat la fiecare priză)' });
  if (tvs.length) groups.push({ kind: 'data', items: tvs, name: 'TV (cablu separat la fiecare priză)' });
  // legăturile dintre comutatoarele cap-scară / cruce (2 fire de comutare + împământare)
  for (const [a, b] of switchLinks(items)) {
    const [x, y] = a.n < b.n ? [a, b] : [b, a];
    groups.push({ kind: 'trav', items: [x, y], name: `Cap-scară #${x.n} ↔ #${y.n} (${[...new Set([x.room, y.room])].map(roomShort).join(', ')})` });
  }
  // ordonare + lungimi
  const tot = {};
  groups.forEach((g, gi) => {
    g.color = PAL[gi % PAL.length]; g.edges = [];
    let seq = g.items;
    if (g.kind !== 'data' && g.kind !== 'trav' && seq.length > 1) {
      let rem = [...seq], cur = panel; seq = [];
      while (rem.length) { let bi = 0, bd = Infinity; rem.forEach((x, i) => { const d = D(cur, x); if (d < bd) { bd = d; bi = i; } }); cur = rem.splice(bi, 1)[0]; seq.push(cur); }
      const T = s => { let t = D(panel, s[0]); for (let i = 1; i < s.length; i++) t += D(s[i - 1], s[i]); return t - vDrop(s[s.length - 1]); };
      let imp = true, n = 0;
      while (imp && n++ < 40) {
        imp = false;
        for (let i = 0; i < seq.length - 1; i++) for (let j = i + 1; j < seq.length; j++) {
          const c = [...seq.slice(0, i), ...seq.slice(i, j + 1).reverse(), ...seq.slice(j + 1)];
          if (T(c) < T(seq) - 1e-6) { seq = c; imp = true; }
        }
      }
    }
    g.seq = seq; g.cross = 0; let floor = 0; const boxes = g.kind === 'trav' ? 2 : seq.length + 1;
    const links = g.kind === 'trav' ? [[seq[0], seq[1]]] : g.kind === 'data' ? seq.map(x => [panel, x]) : seq.map((x, i) => [i ? seq[i - 1] : panel, x]);
    for (const [a, b] of links) {
      const p = path(a, b), pa = port.get(a.id), pb = port.get(b.id);
      floor += p.len + pa.stub + pb.stub; g.cross += p.cross; g.edges.push({ a, b, pts: p.pts, pa, pb });
    }
    const vert = g.kind === 'trav' ? vDrop(seq[0]) + vDrop(seq[1]) : g.kind === 'data' ? seq.reduce((s, x) => s + vDrop(panel) + vDrop(x), 0) : vDrop(panel) + seq.reduce((s, x, i) => s + vDrop(x) * (i < seq.length - 1 ? 2 : 1), 0);
    g.floor = floor; g.vert = vert; g.ceilLen = 0; g.len = floor + vert; g.cable = g.len + 0.3 * boxes; g.tube = floor + vert;
    g.type = g.kind === 'light' || g.kind === 'trav' ? 'CYY-F 3×1,5 mm²' : g.kind === 'data' ? (g.net ? 'UTP Cat6 (internet)' : 'Coaxial RG6 (TV)') : 'CYY-F 3×2,5 mm²';
    g.prot = g.kind === 'trav' ? 'parte din circuitul de iluminat' : g.kind === 'light' ? 'MCB C10 A' : g.kind === 'data' ? '–' : g.kind === 'ded' ? 'MCB C16–C25 A după aparat + diferențial 30 mA' : 'MCB C16 A + diferențial 30 mA';
    tot[g.type] = (tot[g.type] || 0) + g.cable;
  });
  return { groups, tot, panel, port, tube: groups.reduce((s, g) => s + g.tube, 0) };
}

export const fm = v => v.toFixed(1).replace('.', ',');

export function routeText(res, RS) {
  let t = 'TRASEE CABLURI – Ap. 3, Str. Pârâului 15 (prin șapă, ' + (RS.mode === 'par' ? 'paralel cu pereții' : 'drum cel mai scurt') + ')\n';
  res.groups.forEach((g, i) => {
    t += `\nC${i + 1}. ${g.name}\n   ${g.type} · ${g.prot}\n   traseu ${fm(g.len)} m (șapă ${fm(g.floor)} + pereți ${fm(g.vert)}) · cablu cu rezervă ~${fm(g.cable)} m\n   ${g.kind === 'trav' ? 'între comutatoare: #' + g.seq[0].n + ' ↔ #' + g.seq[1].n : 'ordine: tablou → ' + g.seq.map(x => '#' + x.n).join(' → ')}${g.cross ? ' · ' + g.cross + ' străpungeri de perete' : ''}\n`;
  });
  t += '\nTOTAL (cu rezervă în doze, fără marjă):\n';
  for (const [k, v] of Object.entries(res.tot)) t += `   ${k}: ~${Math.round(v)} m\n`;
  t += `   Tub de protecție (copex): ~${Math.round(res.tube)} m\nRecomandare: cumpără cu ~10-15% în plus.`;
  return t;
}
