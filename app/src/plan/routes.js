/* Proiect preliminar al instalației electrice: circuite, trasee prin șapă, tuburi, tablou și materiale.
   Regulile, cu articolele și sursele lor, sunt în docs/cablare.md (secțiunea „Cum se reflectă în cod”). */
import { GC, GX, GY, NC, H, CX, CZ, wallCell, doorCell, nearW, ROOMS, SUB, WALLS, TUB, roomAt, hasPower, switchLinks, partnersOf, chainOf } from './geometry.js';

export const SCREED = 0.05;                   // șapa de 5 cm
const SCREED_MM = 50, COVER_MIN = 25;         // acoperire minimă recomandată peste tub, în șapă (mm)
export const SLEEP = [7, 6];                  // camere de dormit: AFDD obligatoriu (I7 4.2.2.10, modificarea din 2023)
const GUEST = [9];                             // livingul: se doarme doar ocazional (musafiri) – AFDD opțional
const WET = [4, 8], KITCH = [2, 1];           // băi; bucătărie + cămară
const UN = 230, RHO = 0.0206;                 // V; rezistivitatea cuprului la 70 °C (Ω·mm²/m)
export const COL = { L: 3, S: 10, I: 25 };    // coloana contor → tablou: m, mm², A (contorul e aproape de tablou; secțiunea e presupusă)
const DU_MAX = { light: 3, power: 5 };        // I7 5.2.5.1 – cădere de tensiune admisă (%), de la contor
const IZ = { 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57 };    // curent admisibil, mod B1 (conductoare în tub), PVC, 30 °C – I7 anexa 5.10
const IZ_C = { 1.5: 16.5, 2.5: 23, 4: 30, 6: 38, 10: 52 };  // idem, mod B2 (cablu multiconductor în tub)
const SECS = [1.5, 2.5, 4, 6, 10], MCBS = [10, 13, 16, 20, 25, 32, 40];
const FY_A = { 1.5: 8, 2.5: 11.94, 4: 15.2, 6: 19.62, 10: 32.15 };  // aria unui conductor FY cu izolație (mm²) – I7 tabelul 5.7
const CYY_D = { 1.5: 10.1, 2.5: 11.0, 4: 12.9, 6: 13.9, 10: 16.5 }; // diametrul cablului CYY-F 3×s (mm), fișe de produs
export const TUBES = [[16, 10.7], [20, 14.1], [25, 18.3], [32, 24.3]]; // tub flexibil 750 N: Ø exterior, Ø interior minim (mm)
const UTP_D = 6.5, COAX_D = 6.9;              // FTP Cat6, RG6 (mm)
const MAX_LIGHT = 8, LOC_MAX = 12, KITCH_MAX = 6, RCD_MAX = 6;
const PULL_L = 15, PULL_BENDS = 3, PULL_STRAIGHT = 25;           // I7 5.2.12.3.10 și nota 4 la tabelul 5.7
const TURN = 0.45;
export const PAL = ['#e6194b', '#2e9e44', '#4363d8', '#f58231', '#911eb4', '#0fa3b1', '#f032e6', '#9a6324', '#808000', '#000075', '#b8860b', '#e377c2'];
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/* Aparate care cer circuit separat (I7 5.4.7: peste 2 kW). Puterea vine din câmpul kw, din text („3,5 kW”) sau din tipul recunoscut. */
export const APPL = [
  { re: /pe gaz|gaz/i, name: 'Aragaz pe gaz (aprindere)', kw: 0.1 },
  { re: /plit|induc|aragaz/i, name: 'Plită electrică', kw: 7.2 },
  { re: /cuptor/i, name: 'Cuptor', kw: 3.5 },
  { re: /vase/i, name: 'Mașină de spălat vase', kw: 2.2 },
  { re: /usc/i, name: 'Uscător de rufe', kw: 2.5 },
  { re: /sp[aă]l/i, name: 'Mașină de spălat rufe', kw: 2.3 },
  { re: /boiler/i, name: 'Boiler', kw: 2.0 },
  { re: /\bac\b|aer cond|clima/i, name: 'Aer condiționat', kw: 2.5 },
  { re: /central/i, name: 'Centrală termică', kw: 0.2 },
  { re: /detector/i, name: 'Detector de gaz cu electrovalvă', kw: 0.05 },
];
const DED_KW = 3.5, SOCKET_KW = 3.68;          // peste 16 A × 230 V aparatul se leagă fix, nu prin priză
export function applOf(it) {
  const a = APPL.find(a => a.re.test(it.text || ''));
  const m = /(\d+(?:[.,]\d+)?)\s*kw/i.exec(it.text || '');
  const kw = typeof it.kw === 'number' && it.kw > 0 ? it.kw : m ? parseFloat(m[1].replace(',', '.')) : a ? a.kw : DED_KW;
  return { name: (it.text || '').trim() || (a ? a.name : SUB[it.sub].name), kw, known: !!(it.kw || m || a) };
}

/* ---------- grilă ---------- */
let EXTRA = null;
function extra() {
  if (EXTRA) return EXTRA;
  const near2 = new Uint8Array(NC), wet = new Uint8Array(NC);
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
    const k = j * GX + i; if (wallCell[k] || doorCell[k]) continue;
    const r = roomAt((i + .5) * GC, (j + .5) * GC); if (r && WET.includes(r.n)) wet[k] = 1;
    if (nearW[k]) continue;
    for (let dj = -2; dj <= 2 && !near2[k]; dj++) for (let di = -2; di <= 2; di++) {
      const a = i + di, b = j + dj;
      if (a >= 0 && b >= 0 && a < GX && b < GY && wallCell[b * GX + a]) { near2[k] = 1; break; }
    }
  }
  return (EXTRA = { near2, wet });
}
const CA_CACHE = new Map();
function costArr(RS) {
  const par = RS.mode !== 'dia';
  if (CA_CACHE.has(par)) return CA_CACHE.get(par);
  const { near2, wet } = extra(), a = new Float32Array(NC);
  for (let k = 0; k < NC; k++) {
    const w = wallCell[k];
    // în pardoseală: la ≥ 20 cm de pereți (DIN 18015-3), prin dreptul ușilor; străpungerea pereților interiori doar dacă ocolul e mult mai lung
    a[k] = w === 2 ? Infinity : w === 1 ? 40 : doorCell[k] ? 1 : nearW[k] ? (par ? 2.5 : 1.3) : near2[k] ? (par ? 1.4 : 1.05) : 1;
    if (wet[k] && a[k] < 40) a[k] *= 1.5;   // I7 5.4.12: se evită traversarea băilor cu circuite pentru alte încăperi
  }
  CA_CACHE.set(par, a);
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
  const par = RS.mode !== 'dia', dirs = par ? DIRS4 : DIRS8, ND = dirs.length, N = NC * ND;
  const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), h = new Heap();
  for (let d = 0; d < ND; d++) { dist[src * ND + d] = 0; h.push(0, src * ND + d); }
  while (h.size) {
    const [dc, s] = h.pop(); if (dc > dist[s]) continue;
    const c = (s / ND) | 0, d0 = s - c * ND, ci = c % GX, cj = (c / GX) | 0;
    for (let d = 0; d < ND; d++) {
      const ni = ci + dirs[d][0], nj = cj + dirs[d][1]; if (ni < 0 || nj < 0 || ni >= GX || nj >= GY) continue;
      const nk = nj * GX + ni, cc = CA[nk]; if (cc === Infinity) continue;
      if (d >= 4 && (CA[cj * GX + ni] > 5 || CA[nj * GX + ci] > 5)) continue;
      let st = GC * cc * (d >= 4 ? Math.SQRT2 : 1); if (d !== d0 && par) st += TURN;
      const ns = nk * ND + d, nd = dc + st; if (nd < dist[ns]) { dist[ns] = nd; prev[ns] = s; h.push(nd, ns); }
    }
  }
  return { dist, prev, ND };
}
const bestState = (r, k) => { let b = -1, bd = Infinity; for (let d = 0; d < r.ND; d++) { const v = r.dist[k * r.ND + d]; if (v < bd) { bd = v; b = k * r.ND + d; } } return [b, bd]; };
const cxy = c => [(c % GX + .5) * GC, (((c / GX) | 0) + .5) * GC];
function trace(r, k) {
  let [s] = bestState(r, k); const cells = [];
  while (s >= 0) { cells.push((s / r.ND) | 0); s = r.prev[s]; }
  return cells.reverse();
}
/* puncte pentru desen, lungime, străpungeri de perete, curbe și direcția tubului în fiecare celulă */
function pathInfo(cells) {
  const pts = [], ax = new Uint8Array(cells.length); let len = 0, cross = 0, turn = 0, pa = null;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (wallCell[c] === 1 && (i === 0 || wallCell[cells[i - 1]] !== 1)) cross++;
    const P = cxy(c);
    if (i > 0) {
      const Q = cxy(cells[i - 1]); len += Math.hypot(P[0] - Q[0], P[1] - Q[1]);
      const a = Math.atan2(P[1] - Q[1], P[0] - Q[0]);
      if (pa !== null) { let d = Math.abs(a - pa); if (d > Math.PI) d = 2 * Math.PI - d; turn += d; }
      pa = a;
    }
    const o = i < cells.length - 1 ? cells[i + 1] : i > 0 ? cells[i - 1] : c, dd = Math.abs(o - c);
    ax[i] = dd === 1 ? 0 : dd === GX ? 1 : 2;
    if (i > 0 && i < cells.length - 1 && (c - cells[i - 1]) === (cells[i + 1] - c)) continue;
    pts.push(P);
  }
  return { pts, len, cross, bends: Math.round(turn / (Math.PI / 2)), ax };   // curbe echivalente de 90°
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
const cellOf = (x, y) => Math.min(GY - 1, Math.max(0, Math.floor(y / GC))) * GX + Math.min(GX - 1, Math.max(0, Math.floor(x / GC)));
function portOf(it) {
  const wx = it.x + CX, wy = it.z + CZ, px = wx + it.nx * 0.15, py = wy + it.nz * 0.15;
  let k = cellOf(px, py);
  if (wallCell[k]) k = nearestFree(k);
  const [cx, cy] = cxy(k);
  return { k, wx, wy, cx, cy, stub: Math.hypot(cx - wx, cy - wy) };
}

/* Punctul media (tabloul de curenți slabi): lângă tabloul electric, pe același perete, la ~45 cm lateral */
function mediaOf(panel) {
  const tx = -panel.nz, tz = panel.nx;
  for (const off of [0.45, 0.6, 0.35]) for (const s of [1, -1]) {
    const x = panel.x + tx * off * s, z = panel.z + tz * off * s, wx = x + CX, wy = z + CZ;
    const back = cellOf(wx - panel.nx * 0.06, wy - panel.nz * 0.06), front = cellOf(wx + panel.nx * 0.15, wy + panel.nz * 0.15);
    const r = roomAt(wx + panel.nx * 0.1, wy + panel.nz * 0.1);
    if (wallCell[back] && !wallCell[front] && !doorCell[back] && r && r.n === panel.room) return { id: '__media', n: 0, sub: 'tb', media: true, x, z, nx: panel.nx, nz: panel.nz, h: panel.h, room: panel.room, text: 'punct media' };
  }
  return { ...panel, id: '__media', n: 0, media: true, text: 'punct media' };
}

/* Coborârea verticală sub/peste aparat nu trebuie să treacă printr-un gol de ușă sau fereastră */
function dropBlocked(it, isPanel) {
  const wx = it.x + CX - it.nx * 0.05, wy = it.z + CZ - it.nz * 0.05, bottom = isPanel ? it.h - 0.21 : it.h;
  for (const w of WALLS) {
    if (wx < w.x0 - 0.02 || wx > w.x1 + 0.02 || wy < w.y0 - 0.02 || wy > w.y1 + 0.02) continue;
    const along = (w.x1 - w.x0) >= (w.y1 - w.y0) ? wx : wy, half = isPanel ? 0.16 : 0.04;
    for (const o of w.op) if (along + half > o.a && along - half < o.b && bottom > o.lo - 0.02) return o.lo === 0 ? 'ușa' : 'fereastra';
  }
  return null;
}

const roomShort = n => { const r = ROOMS.find(r => r.n === n); return r ? r.name : '?'; };
const vDrop = it => SUB[it.sub].cat === 'panel' ? it.h - 0.21 + SCREED : it.h + SCREED;
const secTxt = s => String(s).replace('.', ',');
export const fm = v => v.toFixed(1).replace('.', ',');
const ROLE = { L: 'maro (fază)', N: 'albastru (nul)', PE: 'galben-verde (PE)', R: 'negru (retur / comutare)' };
const condLabel = (cab, n, sec) => cab === 'fy' ? `${n} × FY ${secTxt(sec)} mm²` : `CYY-F ${n}×${secTxt(sec)} mm²`;

/* Diametrul tubului (I7 5.2.12.1.7 și tab. 5.7: S_i ≥ 3·S_c pentru conductoare; un singur cablu: D_i ≥ 1,5·D cablu, I7 5.2.3.2.2) */
function tubeIdx(spec, cab, k = 3) {
  let di;
  if (spec.data) di = Math.sqrt(4 * k * spec.data.reduce((s, D) => s + Math.PI * D * D / 4, 0) / Math.PI);
  else if (cab === 'fy') di = Math.sqrt(4 * k * spec.n * FY_A[spec.sec] / Math.PI);
  else di = 1.5 * Math.sqrt(k / 3) * CYY_D[spec.sec] * (1 + 0.08 * (spec.n - 3));
  const min = spec.data ? 20 : 16, i = TUBES.findIndex(([d, dii]) => d >= min && dii >= di);
  return i < 0 ? TUBES.length - 1 : i;
}
function sizeLink(L, spec, cab) {
  let ti = tubeIdx(spec, cab); L.pull = 0; L.up = false; L.hard = false;
  if (L.len > PULL_L || L.bends > PULL_BENDS) {
    // tabelul 5.7 e valabil până la 15 m și 3 curbe între doze; peste, cerem o rezervă mai mare în tub (S_i ≥ 4·S_c) dacă tubul încape în șapă
    const t2 = tubeIdx(spec, cab, 4);
    if (t2 > ti) { if (TUBES[t2][0] <= SCREED_MM - COVER_MIN) { ti = t2; L.up = true; } else L.hard = true; }
  }
  if (L.len > PULL_STRAIGHT) L.pull = Math.ceil(L.len / PULL_STRAIGHT) - 1;
  L.tube = TUBES[ti][0]; L.spec = spec;
}

export function computeRoutes(items, RS) {
  const cab = RS.cab === 'cyy' ? 'cyy' : 'fy', maxSock = Math.max(2, RS.max || 8);
  const panel = items.find(i => SUB[i.sub].cat === 'panel');
  const devs = items.filter(i => { const c = SUB[i.sub].cat; return c === 'socket' || c === 'switch'; });
  if (!panel) return { err: 'Adaugă întâi tabloul electric (butonul „Tablou” jos).' };
  if (!devs.length) return { err: 'Adaugă prize sau întrerupătoare ca să calculez traseele.' };
  const CA = costArr(RS), cache = new Map(), port = new Map(), byId = new Map(items.map(i => [i.id, i]));
  const media = mediaOf(panel);
  for (const it of [panel, media, ...devs]) port.set(it.id, portOf(it));
  const dj = it => { if (!cache.has(it.id)) cache.set(it.id, dijkstra(port.get(it.id).k, CA, RS)); return cache.get(it.id); };
  const D = (a, b) => { const pa = port.get(a.id), pb = port.get(b.id); return bestState(dj(a), pb.k)[1] + pa.stub + pb.stub; };
  const mkLink = (a, b, r) => {
    const pa = port.get(a.id), pb = port.get(b.id), cells = trace(r || dj(a), pb.k), p = pathInfo(cells);
    const floor = p.len + pa.stub + pb.stub, vert = vDrop(a) + vDrop(b);
    return { a, b, pts: p.pts, pa, pb, cells, ax: p.ax, cross: p.cross, bends: p.bends + 2, floor, vert, len: floor + vert };
  };
  const warn = [], W = (lvl, t) => warn.push({ lvl, t });
  const cat = it => SUB[it.sub].cat, loc = it => SUB[it.sub].pow || SUB[it.sub].mods;
  const pd = it => D(panel, it);

  /* ---------- gruparea pe circuite ---------- */
  const cluster = (list, max, prefix, kind, zone) => {
    const byRoom = new Map(); list.forEach(i => { const k = i.room ?? -1; if (!byRoom.has(k)) byRoom.set(k, []); byRoom.get(k).push(i); });
    const rooms = [...byRoom.entries()].map(([r, l]) => ({ r, l, d: Math.min(...l.map(pd)) })).sort((a, b) => a.d - b.d);
    let cur = null; const out = [];
    const full = (c, it) => c.items.length >= max || (kind !== 'light' && c.loc + loc(it) > LOC_MAX);
    for (const { r, l } of rooms) {
      const ord = [...l].sort((a, b) => pd(a) - pd(b));
      if (cur && cur.items.length + ord.length > max) cur = null;
      for (const it of ord) {
        if (!cur || full(cur, it)) { cur = { kind, zone, items: [], rooms: new Set(), loc: 0 }; out.push(cur); }
        cur.items.push(it); cur.rooms.add(r); cur.loc += kind === 'light' ? 0 : loc(it);
      }
    }
    out.forEach(g => { g.name = prefix + ' – ' + [...g.rooms].map(roomShort).join(', '); });
    return out;
  };
  const zoneOf = it => SLEEP.includes(it.room) ? 'n' : 'z';
  const pm = partnersOf(items);
  const sock = devs.filter(i => hasPower(SUB[i.sub])), data = devs.filter(i => SUB[i.sub].data);
  // comutatorul cruce cuplat e legat doar prin firele de comutare; unul necuplat e tratat ca întrerupător simplu
  const sw = devs.filter(i => cat(i) === 'switch' && (!SUB[i.sub].cross || !(pm.get(i.id) || []).length));
  const rest = sock.filter(i => !i.ded), gen = rest.filter(i => !WET.includes(i.room) && !KITCH.includes(i.room));
  const groups = [];
  groups.push(...cluster(sw.filter(i => zoneOf(i) === 'z'), MAX_LIGHT, 'Iluminat', 'light', 'z'));
  groups.push(...cluster(sw.filter(i => zoneOf(i) === 'n'), MAX_LIGHT, 'Iluminat dormitoare', 'light', 'n'));
  groups.push(...cluster(gen.filter(i => zoneOf(i) === 'z'), maxSock, 'Prize', 'socket', 'z'));
  groups.push(...cluster(gen.filter(i => zoneOf(i) === 'n'), maxSock, 'Prize dormitoare', 'socket', 'n'));
  groups.push(...cluster(rest.filter(i => KITCH.includes(i.room)), Math.min(maxSock, KITCH_MAX), 'Prize bucătărie', 'kitchen', 'z'));
  groups.push(...cluster(rest.filter(i => WET.includes(i.room)), maxSock, 'Prize baie', 'bath', 'z'));
  sock.filter(i => i.ded).forEach(i => { const a = applOf(i); groups.push({ kind: 'ded', zone: zoneOf(i), items: [i], appl: a, name: `Circuit dedicat – ${a.name} (${roomShort(i.room)})` }); });

  /* ---------- puncte de lumină: câte unul pe fiecare clapă; lanțul cap-scară / cruce aprinde o singură lumină ---------- */
  const legRock = new Map();
  for (const it of devs.filter(i => cat(i) === 'switch')) {
    const s = SUB[it.sub], prs = pm.get(it.id) || [];
    if (!s.cap && !s.cross) { legRock.set(it.id, s.rock); continue; }
    if (!prs.length) { W('warn', `#${it.n} ${s.name} nu e cuplat cu alt comutator – cuplează-l din foaia lui (altfel e tratat ca întrerupător simplu)`); legRock.set(it.id, 1); continue; }
    const chain = [...chainOf(pm, it.id)].map(id => byId.get(id)).filter(x => x && !SUB[x.sub].cross);
    const own = chain.sort((a, b) => b.n - a.n)[0];
    if (own && own.id === it.id) legRock.set(it.id, 1);
    if (!own && s.cross) W('warn', `Lanțul cu #${it.n} are numai comutatoare cruce – capetele trebuie să fie cap-scară`);
  }
  const legOf = it => {
    const r = ROOMS.find(r => r.n === it.room), wx = it.x + CX, wy = it.z + CZ;
    const rect = r ? (r.r.find(([x0, x1, y0, y1]) => wx >= x0 - 0.05 && wx <= x1 + 0.05 && wy >= y0 - 0.05 && wy <= y1 + 0.05) || r.r[0]) : null;
    const hz = rect ? Math.hypot(wx - (rect[0] + rect[1]) / 2, wy - (rect[2] + rect[3]) / 2) : 1.5;
    const rock = legRock.get(it.id);
    return { it, rock, len: (H - it.h) + hz + 0.3, spec: { n: rock + 2, sec: 1.5, roles: [...Array(rock).fill('R'), 'N', 'PE'] } };
  };

  /* ---------- ordinea dozelor (din doză în doză) și traseele ---------- */
  groups.forEach(g => {
    let seq = g.items;
    if (seq.length > 1) {
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
    g.seq = seq;
    g.edges = seq.map((x, i) => mkLink(i ? seq[i - 1] : panel, x));
    g.legs = g.kind === 'light' ? seq.filter(x => legRock.has(x.id)).map(legOf) : [];
  });

  /* firele de comutare dintre comutatoarele cap-scară / cruce (2 fire + PE), parte din circuitul de iluminat */
  const lightOf = id => groups.find(g => g.kind === 'light' && g.items.some(x => x.id === id));
  for (const [a, b] of switchLinks(items)) {
    const [x, y] = a.n < b.n ? [a, b] : [b, a];
    const par = lightOf(x.id) || lightOf(y.id) || [...chainOf(pm, x.id)].map(lightOf).find(Boolean);
    groups.push({ kind: 'trav', zone: zoneOf(x), items: [x, y], seq: [x, y], parent: par, name: `Comutare #${x.n} ↔ #${y.n} (${[...new Set([x.room, y.room])].map(roomShort).join(', ')})`, edges: [mkLink(x, y)], legs: [] });
  }

  /* ---------- dimensionare electrică ---------- */
  const colDU = 200 * RHO * COL.L * COL.I / (COL.S * UN);
  const iz = cab === 'fy' ? IZ : IZ_C;
  const power = groups.filter(g => g.kind !== 'trav');
  power.forEach(g => {
    let P, In, secMin = 2.5, lim = DU_MAX.power;
    if (g.kind === 'light') { g.points = g.legs.reduce((s, l) => s + l.rock, 0); P = Math.max(300, 100 * g.points); In = 10; secMin = 1.5; lim = DU_MAX.light; }
    else if (g.kind === 'kitchen') { P = 3500; In = 16; }
    else if (g.kind === 'ded') { P = g.appl.kw * 1000; g.fixed = g.appl.kw > SOCKET_KW; In = g.fixed ? MCBS.find(v => v >= P / UN) || 40 : 16; }
    else { P = 2000; In = 16; }   // I7 5.4.7: 2 kW instalați pe un circuit de prize într-o locuință
    const Ib = P / UN; let sec = SECS.find(s => s >= secMin && iz[s] >= In) || 10;
    let cum = 0, far = 0;
    g.edges.forEach((L, i) => { cum += L.len; const lg = g.legs.find(l => l.it === g.seq[i]); far = Math.max(far, cum + (lg ? lg.len : 0)); });
    const du = s => colDU + 200 * RHO * far * Ib / (s * UN);
    g.secMin = sec;
    if (du(sec) > lim) { const s2 = SECS.find(s => s > sec && du(s) <= lim); W('warn', `${g.name}: căderea de tensiune ar fi ${fm(du(sec))}% (> ${lim}%) cu ${secTxt(sec)} mm² – am mărit secțiunea la ${secTxt(s2 || 10)} mm²`); sec = s2 || 10; g.upsized = true; }
    Object.assign(g, { P, Ib, In, sec, lim, far, dU: du(sec) });
  });
  groups.filter(g => g.kind === 'trav').forEach(g => { g.sec = 1.5; g.In = g.parent ? g.parent.In : 10; });

  /* ---------- tuburi pe fiecare tronson ---------- */
  groups.forEach(g => {
    const spec = g.kind === 'trav' ? { n: 3, sec: 1.5, roles: ['R', 'R', 'PE'] } : { n: 3, sec: g.sec, roles: ['L', 'N', 'PE'] };
    g.spec = spec; g.type = condLabel(cab, spec.n, spec.sec);
    g.edges.forEach(L => sizeLink(L, spec, cab));
    g.legs.forEach(l => { l.tube = TUBES[tubeIdx(l.spec, cab)][0]; });
  });

  /* ---------- curenți slabi: stea din punctul media, tub separat, departe de tuburile de forță ---------- */
  const occ = new Map(), occP = new Uint8Array(NC), nearBoard = new Uint8Array(NC);
  const pk = [port.get(panel.id).k, port.get(media.id).k];
  for (let k = 0; k < NC; k++) { const [x, y] = cxy(k); if (pk.some(q => { const [a, b] = cxy(q); return Math.hypot(x - a, y - b) < 0.55; })) nearBoard[k] = 1; }
  groups.forEach(g => g.edges.forEach(L => L.cells.forEach((c, i) => {
    occP[c] = 1; if (!occ.has(c)) occ.set(c, []); occ.get(c).push({ L, ax: L.ax[i], end: i < 2 || i > L.cells.length - 3 });
  })));
  if (data.length) {
    const CD = new Float32Array(CA);
    for (let k = 0; k < NC; k++) {
      if (CD[k] === Infinity || nearBoard[k]) continue;
      if (occP[k]) CD[k] += 6;
      else { const i = k % GX, j = (k / GX) | 0; if ((i > 0 && occP[k - 1]) || (i < GX - 1 && occP[k + 1]) || (j > 0 && occP[k - GX]) || (j < GY - 1 && occP[k + GX])) CD[k] += 1; }
    }
    const r = dijkstra(port.get(media.id).k, CD, RS);
    const g = { kind: 'data', zone: 'z', items: data, seq: data, legs: [], name: 'Curenți slabi – internet și TV (stea din punctul media)' };
    g.edges = data.map(x => {
      const L = mkLink(media, x, r), s = SUB[x.sub];
      L.net = !!s.net; L.tv = !!s.tv;
      sizeLink(L, { data: [...(s.net ? [UTP_D] : []), ...(s.tv ? [COAX_D] : [])] }, cab);
      return L;
    });
    g.type = 'FTP Cat6 / RG6'; groups.push(g);
    // separare față de forță (EN 50174-2): fără porțiuni paralele în aceeași celulă de 10 cm, încrucișări la 90°
    let par = 0;
    for (const L of g.edges) L.cells.forEach((c, i) => {
      if (nearBoard[c] || i < 2 || i > L.cells.length - 3) return;
      if ((occ.get(c) || []).some(o => !o.end && o.ax === L.ax[i])) par += GC;
    });
    g.par = par;
    if (par > 0.25) W('warn', `Curenții slabi merg ~${fm(par)} m paralel, lipiți de tuburi de forță – ține-i la cel puțin 10 cm (EN 50174-2) sau mută aparatele`);
  }

  /* ---------- încrucișări de tuburi în șapă ---------- */
  const crossPairs = new Map();
  for (const [c, list] of occ) {
    if (nearBoard[c] || list.length < 2) continue;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.L === b.L || a.end || b.end || a.ax === b.ax) continue;
      const k = [a.L, b.L].map(x => x.cells[0] + ':' + x.cells[x.cells.length - 1]).sort().join('|');
      const st = a.L.tube + b.L.tube; if (!crossPairs.has(k) || crossPairs.get(k) < st) crossPairs.set(k, st);
    }
  }
  const dataEdges = groups.filter(g => g.kind === 'data').flatMap(g => g.edges);
  for (const L of dataEdges) L.cells.forEach((c, i) => {
    if (nearBoard[c] || i < 2 || i > L.cells.length - 3) return;
    for (const o of occ.get(c) || []) if (!o.end && o.ax !== L.ax[i]) { const k = 'd' + L.cells[L.cells.length - 1] + '|' + o.L.cells[0] + ':' + o.L.cells[o.L.cells.length - 1]; crossPairs.set(k, Math.max(crossPairs.get(k) || 0, L.tube + o.L.tube)); }
  });
  const stackMax = Math.max(0, ...crossPairs.values()), crossings = crossPairs.size;
  const tight = [...crossPairs.values()].filter(v => v > SCREED_MM - 10).length;
  if (tight) W('warn', `${tight} din cele ${crossings} încrucișări de tuburi au împreună ${stackMax} mm din cei ${SCREED_MM} mm de șapă (sub 1 cm deasupra): așază tuburile alăturat pe culoare ca să nu se calce, iar unde trebuie să se încrucișeze, scobește local placa`);

  /* ---------- verificări pe aparate ---------- */
  for (const it of [panel, ...devs]) {
    const b = dropBlocked(it, it === panel);
    if (b) W('warn', `#${it.n} ${SUB[it.sub].name} (${roomShort(it.room)}): e deasupra unei ${b === 'ușa' ? 'uși' : 'ferestre'}, iar coborârea verticală spre șapă ar trece prin gol – mută aparatul lateral, la 10–30 cm de toc (DIN 18015-3)`);
  }
  devs.filter(i => hasPower(SUB[i.sub]) && i.h < 0.1 && !WET.includes(i.room) && !KITCH.includes(i.room))
    .forEach(i => W('warn', `#${i.n}: priza e la ${Math.round(i.h * 100)} cm – I7 5.4.25 cere axul prizei peste 10 cm de pardoseala finită`));
  /* volumele 0–2 din baia mare: cada plus 60 cm în jur (I7 7.1.2, 7.1.4.3) */
  const tubDist = it => { const x = it.x + CX, y = it.z + CZ, [x0, x1, y0, y1] = TUB.r; return Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)); };
  const nearTub = devs.filter(i => i.room === TUB.room && (hasPower(SUB[i.sub]) || SUB[i.sub].cat === 'switch') && tubDist(i) < 0.6);
  if (nearTub.length) W('warn', `${nearTub.map(i => `#${i.n} (${Math.round(tubDist(i) * 100)} cm)`).join(', ')}: prea aproape de cadă – în volumele 0–2 (cada și 60 cm în jurul ei) nu se pun prize sau întrerupătoare (I7 7.1.4.3); mută-le la peste 60 cm`);
  const bathSock = sock.filter(i => WET.includes(i.room));
  if (bathSock.length) W('info', `Prizele din băi (${bathSock.map(i => '#' + i.n).join(', ')}) sunt pe diferențial 30 mA. În baia mare distanța față de cadă e verificată automat; în baia de serviciu nu e cadă – dacă pui duș, ține prizele la 60 cm de el`);
  groups.filter(g => g.kind === 'ded' && g.fixed).forEach(g => W('info', `${g.appl.name} (#${g.items[0].n}, ${fm(g.appl.kw)} kW): racord fix într-o doză cu cleme, nu prin priză Schuko de 16 A`));
  groups.filter(g => g.kind === 'ded' && !g.appl.known).forEach(g => W('info', `#${g.items[0].n}: nu știu ce aparat e – am presupus ${fm(DED_KW)} kW; scrie în „Text” aparatul sau puterea (ex. „cuptor 3,5 kW”)`));
  if (sock.some(i => KITCH.includes(i.room)) && !sock.some(i => i.ded && KITCH.includes(i.room)))
    W('info', 'În bucătărie nu e marcat niciun aparat peste 2 kW (cuptor electric, mașină de vase): bifează „Circuit separat” la prizele lor (I7 5.4.7). Plita e pe gaz, deci nu are nevoie de circuit propriu');
  /* apartamentul are plită și centrală pe gaz */
  if (devs.length && !sock.some(i => i.ded && /central/i.test(applOf(i).name)))
    W('info', 'Centrala pe gaz e în bucătărie, pe peretele din fața tabloului: pune lângă ea o priză cu „Circuit separat” și aparatul „Centrală termică”, ca o defecțiune pe prize să n-o oprească (recomandat de producători)');
  if (devs.length && !devs.some(i => /detector/i.test(i.text || '')))
    W('info', 'Detector de gaz: pune o priză lângă locul lui, în bucătărie (între aragaz și centrală), la circa 30 cm sub tavan (gazul natural urcă), și scrie „detector” în Text; electrovalva se montează pe conducta de gaz – verifică cerințele cu firma de gaze');
  if (devs.some(i => GUEST.includes(i.room)))
    W('info', 'Livingul nu e cameră de dormit, așa că AFDD nu e obligatoriu acolo; dacă vei avea des musafiri la dormit, poți pune AFDD și pe circuitele lui (I7 4.2.2.10)');

  /* ---------- tabloul ---------- */
  const circ = groups.filter(g => g.kind !== 'trav' && g.kind !== 'data');
  const order = { light: 0, socket: 1, kitchen: 2, bath: 3, ded: 4 };
  circ.sort((a, b) => order[a.kind] - order[b.kind]);
  circ.forEach((g, i) => { g.id = 'C' + (i + 1); g.afdd = g.items.some(x => SLEEP.includes(x.room)); g.rcbo = !g.afdd && g.kind === 'ded' && g.In > 20; });
  const rows = [{ pos: 'Q0', dev: 'Întrerupător general (separator) 2P 40 A', mods: 2, circ: 'toată locuința' },
    { pos: 'F0', dev: 'Descărcător de supratensiuni tip 2, 1P+N (recomandat)', mods: 2, circ: '–' }];
  const bom = new Map(), add = (cat, item, qty, unit, note = '') => { const k = cat + '|' + item; const o = bom.get(k) || { cat, item, qty: 0, unit, note }; o.qty += qty; bom.set(k, o); };
  const mcbName = g => `MCB 1P+N C${g.In} A`;
  // diferențiale: iluminat + băi + aparate pe unul, prizele generale + bucătăria pe altul (o declanșare nu lasă casa complet pe întuneric)
  const bins = [[], []];
  for (const g of circ.filter(g => !g.afdd && !g.rcbo)) {
    const pref = ['socket', 'kitchen'].includes(g.kind) ? 1 : 0;
    const b = [bins[pref], bins[1 - pref], ...bins.slice(2)].find(b => b.length < RCD_MAX) || (bins.push([]), bins[bins.length - 1]);
    b.push(g);
  }
  let qn = 1;
  for (const part of bins.filter(b => b.length)) {
    const q = 'Q' + qn++;
    part.sort((a, b) => +a.id.slice(1) - +b.id.slice(1));
    rows.push({ pos: q, dev: 'Întrerupător diferențial (DDR) 2P 40 A, 30 mA, tip A', mods: 2, circ: part.map(g => g.id).join(', ') });
    add('Tablou', 'Întrerupător diferențial 2P 40 A / 30 mA tip A', 1, 'buc');
    part.forEach(g => { g.rcd = q; g.prot = `${mcbName(g)} · DDR 30 mA (${q})`; rows.push({ pos: g.id, dev: mcbName(g), mods: 1, circ: g.name, sub: true }); add('Tablou', `Disjunctor ${mcbName(g)}`, 1, 'buc'); });
  }
  circ.filter(g => g.afdd).forEach(g => {
    g.prot = `AFDD + DDR 30 mA + C${g.In} A`;
    rows.push({ pos: g.id, dev: `AFDD cu disjunctor diferențial 1P+N C${g.In} A, 30 mA, tip A`, mods: 2, circ: g.name });
    add('Tablou', `AFDD cu disjunctor diferențial (RCBO) 1P+N C${g.In} A / 30 mA`, 1, 'buc');
  });
  circ.filter(g => g.rcbo).forEach(g => {
    g.prot = `RCBO C${g.In} A, 30 mA`;
    rows.push({ pos: g.id, dev: `Disjunctor diferențial (RCBO) 1P+N C${g.In} A, 30 mA, tip A`, mods: 2, circ: g.name });
    add('Tablou', `Disjunctor diferențial (RCBO) 1P+N C${g.In} A / 30 mA tip A`, 1, 'buc');
  });
  const modsUsed = rows.reduce((s, r) => s + r.mods, 0), need = Math.ceil(modsUsed * 1.2);
  const encl = [12, 18, 24, 36, 48, 54, 72].find(v => v >= need) || 72;
  const board = { rows, mods: modsUsed, need, encl, tubes: circ.length };
  groups.filter(g => g.kind === 'trav').forEach(g => { g.prot = g.parent ? `parte din ${g.parent.id} (${g.parent.name})` : 'parte din circuitul de iluminat'; });
  groups.filter(g => g.kind === 'data').forEach(g => { g.prot = 'fără protecție – cabluri de date, tub separat'; });

  /* ---------- lungimi, culori și materiale ---------- */
  const tubeM = {}, tot = {};
  const addTube = (d, m, where) => { tubeM[d] = (tubeM[d] || 0) + m; add('Tuburi', `Tub flexibil (copex) Ø${d} mm, 750 N${where ? ' – ' + where : ''}`, m, 'm'); };
  const addCond = (spec, m, est) => {
    if (cab === 'fy') spec.roles.forEach(r => { const k = `Conductor FY ${secTxt(spec.sec)} mm² ${ROLE[r]}`; add('Cabluri', k, m, 'm', est ? 'include estimarea spre plafon' : ''); });
    else add('Cabluri', `Cablu CYY-F ${spec.n}×${secTxt(spec.sec)} mm²`, m, 'm', est ? 'include estimarea spre plafon' : '');
  };
  const all = [...circ, ...groups.filter(g => g.kind === 'trav'), ...groups.filter(g => g.kind === 'data')];
  all.forEach((g, gi) => {
    g.color = PAL[gi % PAL.length];
    g.floor = g.edges.reduce((s, L) => s + L.floor, 0); g.vert = g.edges.reduce((s, L) => s + L.vert, 0);
    g.cross = g.edges.reduce((s, L) => s + L.cross, 0); g.len = g.floor + g.vert;
    g.legLen = g.legs.reduce((s, l) => s + l.len, 0);
    g.cable = g.len + 0.3 * (g.edges.length + 1);
    g.pulls = g.edges.reduce((s, L) => s + L.pull, 0);
    if (g.kind === 'data') {
      g.cable = 0;
      g.edges.forEach(L => {
        const m = L.len + 0.8;   // 0,5 m rezervă în cutia media + 0,3 m la priză
        if (L.net) { add('Curenți slabi', 'Cablu FTP Cat6', m, 'm'); tot['FTP Cat6 (internet)'] = (tot['FTP Cat6 (internet)'] || 0) + m; }
        if (L.tv) { add('Curenți slabi', 'Cablu coaxial RG6', m, 'm'); tot['Coaxial RG6 (TV)'] = (tot['Coaxial RG6 (TV)'] || 0) + m; }
        g.cable += m; addTube(L.tube, L.len, 'curenți slabi');
      });
      return;
    }
    g.edges.forEach(L => { addTube(L.tube, L.len, ''); addCond(L.spec, L.len + 0.3, false); });
    addCond(g.spec, 0.3, false);
    g.legs.forEach(l => { addTube(l.tube, l.len, 'perete + plafon, estimare'); addCond(l.spec, l.len + 0.3, true); });
    tot[g.type] = (tot[g.type] || 0) + g.cable + g.legLen;
  });
  const tube = Object.values(tubeM).reduce((a, b) => a + b, 0);
  for (const g of groups) for (const L of g.edges) if (L.tube > SCREED_MM - COVER_MIN) { W('warn', `${g.name}: tubul Ø${L.tube} lasă doar ${SCREED_MM - L.tube} mm de șapă deasupra (minim ${COVER_MIN} mm) – folosește conductoare FY în loc de cablu sau un traseu prin perete`); break; }
  const pulls = groups.reduce((s, g) => s + (g.pulls || 0), 0), E = groups.flatMap(g => g.edges);
  const ups = E.filter(L => L.up).length, hards = E.filter(L => L.hard && !L.spec.data).length, longs = E.filter(L => L.len > PULL_L || L.bends > PULL_BENDS).length;
  const hardData = E.filter(L => L.hard && L.spec.data).length;
  if (hardData) W('info', `${hardData} prize TV + internet au ambele cabluri într-un tub Ø25 pe un traseu cu multe curbe: trage-le împreună, cu fir de tragere, sau pune fiecare cablu în tubul lui Ø20`);
  if (longs) W('info', `${longs} tronsoane au peste ${PULL_L} m sau peste ${PULL_BENDS} curbe între doze (I7, nota 4 la tabelul 5.7): am cerut tub cu mai mult loc liber (S_i ≥ 4·S_c)${ups ? `, ceea ce a mărit tubul la ${ups} dintre ele` : ''}; folosește tub cu fir de tragere`);
  if (hards) W('warn', `${hards} tronsoane cu cablu gros și multe curbe vor fi greu de tras, iar un tub mai mare nu încape în șapă – folosește conductoare FY`);
  if (pulls) W('info', `Sunt necesare ${pulls} doze de tragere pe perete (tronsoane prea lungi sau cu prea multe curbe, I7 5.2.12.3.10)`);

  // doze
  const boxName = m => ({ 1: 'Doză aparat simplă Ø60 mm', 2: 'Doză aparat dublă', 3: 'Doză aparat triplă', 4: 'Doză aparat cvadruplă' }[Math.min(4, Math.max(1, m))]);
  devs.forEach(it => add('Doze', boxName(SUB[it.sub].mods), 1, 'buc', SUB[it.sub].data && SUB[it.sub].pow ? 'cu separator între 230 V și date' : ''));
  const legsAll = groups.flatMap(g => g.legs);
  if (legsAll.length) add('Doze', 'Doză de derivație Ø80 mm sub plafon (deasupra întrerupătorului)', legsAll.length, 'buc');
  if (pulls) add('Doze', 'Doză de tragere pe perete', pulls, 'buc');
  groups.filter(g => g.fixed).forEach(() => add('Doze', 'Doză de racord fix cu cleme (aparat > 3,7 kW)', 1, 'buc'));
  // tablou
  add('Tablou', 'Întrerupător general 2P 40 A (separator)', 1, 'buc', 'de corelat cu puterea din avizul de racordare');
  add('Tablou', 'Descărcător de supratensiuni tip 2, 1P+N', 1, 'buc', 'recomandat');
  add('Tablou', `Cutie tablou îngropată ${encl} module`, 1, 'buc', `${modsUsed} module ocupate + 20% rezervă`);
  // curenți slabi
  const nNet = data.filter(i => SUB[i.sub].net).length, nTv = data.filter(i => SUB[i.sub].tv).length;
  if (data.length) {
    add('Curenți slabi', 'Cutie media îngropată (tablou de curenți slabi), lângă tabloul electric', 1, 'buc');
    if (nNet) { add('Curenți slabi', 'Conector RJ45 Cat6 (keystone) în priză', nNet, 'buc'); add('Curenți slabi', `Patch panel / switch cu min. ${nNet + 1} porturi`, 1, 'buc'); }
    if (nTv) { add('Curenți slabi', `Splitter TV 1 intrare / ${[2, 3, 4, 6, 8, 12].find(v => v >= nTv) || nTv} ieșiri`, 1, 'buc'); add('Curenți slabi', 'Mufă F pentru RG6', 2 * nTv + 1, 'buc'); }
  }
  // aparataj (pentru deviz)
  for (const k of Object.keys(SUB)) { const n = devs.filter(i => i.sub === k).length; if (n) add('Aparataj', SUB[k].name, n, 'buc'); }
  if (legsAll.length) add('Aparataj', 'Punct de lumină pe plafon (estimare, câte unul pe clapă)', legsAll.reduce((s, l) => s + l.rock, 0), 'buc');

  const CATS = ['Cabluri', 'Tuburi', 'Doze', 'Tablou', 'Curenți slabi', 'Aparataj'];
  const bomList = [...bom.values()].sort((a, b) => CATS.indexOf(a.cat) - CATS.indexOf(b.cat) || a.item.localeCompare(b.item, 'ro'));
  const assigned = new Set(groups.flatMap(g => g.items.map(i => i.id)));
  devs.filter(i => !assigned.has(i.id)).forEach(i => W('err', `#${i.n} nu a ajuns pe niciun circuit`));
  return { groups: all, circ, tot, panel, media, port, tube, tubeM, board, bom: bomList, warn, crossings, stackMax, colDU, cab };
}

/* ---------- exporturi ---------- */
const qty = b => b.unit === 'm' ? Math.ceil(b.qty) : b.qty;
export function routeText(res, RS) {
  let t = 'PROIECT PRELIMINAR INSTALAȚIE ELECTRICĂ – Ap. 3, Str. Pârâului 15, Brașov\n';
  t += `Trasee prin șapă (${RS.mode === 'dia' ? 'drum cel mai scurt' : 'paralel cu pereții'}), ${res.cab === 'fy' ? 'conductoare FY în tub flexibil' : 'cablu CYY-F în tub flexibil'}\n`;
  if (res.warn.length) { t += '\nDE VERIFICAT:\n'; res.warn.forEach(w => { t += `  ${w.lvl === 'info' ? '·' : '!'} ${w.t}\n`; }); }
  t += '\nCIRCUITE\n';
  res.groups.forEach(g => {
    t += `\n${g.id ? g.id + '. ' : '   '}${g.name}\n   ${g.type} · ${g.prot}\n`;
    if (g.kind === 'data') { t += `   ${g.edges.map(L => '#' + L.b.n + ' ' + fm(L.len) + ' m Ø' + L.tube).join(', ')}\n`; return; }
    t += `   traseu ${fm(g.len)} m (șapă ${fm(g.floor)} + pereți ${fm(g.vert)})${g.legLen ? ` + spre plafon ~${fm(g.legLen)} m` : ''} · tub ${[...new Set(g.edges.map(L => 'Ø' + L.tube))].join('/')}\n`;
    t += `   ${g.kind === 'trav' ? 'între comutatoare: #' + g.seq[0].n + ' ↔ #' + g.seq[1].n : 'ordine: tablou → ' + g.seq.map(x => '#' + x.n).join(' → ')}${g.cross ? ' · ' + g.cross + ' străpungeri de perete' : ''}\n`;
    if (g.dU != null) t += `   ${fm(g.P / 1000)} kW, ${fm(g.Ib)} A · cădere de tensiune ${fm(g.dU)}% (max ${g.lim}%)${g.points ? ' · ' + g.points + ' puncte de lumină' : ''}\n`;
  });
  t += `\nTABLOU (${res.board.mods} module ocupate, cutie recomandată ${res.board.encl} module)\n`;
  res.board.rows.forEach(r => { t += `  ${r.sub ? '  ' : ''}${r.pos}  ${r.dev}  [${r.mods} mod.]  → ${r.circ}\n`; });
  t += '\nMATERIALE (fără marjă – cumpără cu 10–15% în plus)\n';
  let last; res.bom.forEach(b => { if (b.cat !== last) { t += `  ${b.cat}\n`; last = b.cat; } t += `    ${b.item}: ${qty(b)} ${b.unit}${b.note ? ' (' + b.note + ')' : ''}\n`; });
  t += `\nPresupuneri: coloană contor–tablou ${COL.L} m × ${COL.S} mm² (${fm(res.colDU)}% din căderea de tensiune), prize 2 kW pe circuit, bucătărie 3,5 kW, 100 W pe punct de lumină; corpurile de iluminat nu sunt desenate – legătura spre plafon e estimată.\nProiectul tehnic și execuția: electrician autorizat ANRE, conform I7/2011.`;
  return t;
}

export function bomCsv(res) {
  const q = v => /[;"\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v;
  const line = a => a.map(q).join(';');
  const out = [line(['Categorie', 'Material', 'Cantitate', 'UM', 'Observații'])];
  res.bom.forEach(b => out.push(line([b.cat, b.item, b.unit === 'm' ? Math.ceil(b.qty) : b.qty, b.unit, b.note])));
  out.push('', line(['Tablou', 'Poziție', 'Aparat', 'Module', 'Circuite']));
  res.board.rows.forEach(r => out.push(line(['', r.pos, r.dev, r.mods, r.circ])));
  out.push(line(['', '', `Total module ocupate: ${res.board.mods}; cutie recomandată: ${res.board.encl}`, '', '']));
  out.push('', line(['Circuit', 'Nume', 'Conductoare', 'Protecție', 'Lungime traseu (m)', 'Cădere tensiune (%)']));
  res.groups.forEach(g => out.push(line([g.id || '', g.name, g.type, g.prot, fm(g.len + (g.legLen || 0)), g.dU != null ? fm(g.dU) : ''])));
  return '﻿' + out.join('\r\n');
}
