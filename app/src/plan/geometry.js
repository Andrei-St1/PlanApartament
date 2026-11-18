/* Geometria apartamentului (din releveu, metri; x spre dreapta, y în jos pe plan) */
export const H = 2.40;            // înălțimea pereților
export const CX = 3.53, CZ = 4.98;

const WIN = (a, b) => ({ a, b, lo: 0.90, hi: 2.10, win: true });
const DOOR = (a, b, hi = 2.05) => ({ a, b, lo: 0, hi });

export const WALLS = [
  // pereți exteriori
  { x0: 0, x1: 3.90, y0: 0, y1: 0.30, op: [WIN(0.99, 2.27), DOOR(2.27, 3.11, 2.10)] },           // camera 9 + ușă balcon
  { x0: 3.90, x1: 7.06, y0: 0, y1: 0.233, op: [WIN(4.50, 5.47), { a: 5.95, b: 6.31, lo: 1.20, hi: 2.00, win: true }] }, // bucătărie + cămară
  { x0: 0, x1: 0.30, y0: 0.30, y1: 7.52, op: [] },
  { x0: 0, x1: 0.26, y0: 7.52, y1: 10.95, op: [] },
  { x0: 6.76, x1: 7.06, y0: 0.233, y1: 4.31, op: [] },
  { x0: 6.76, x1: 7.06, y0: 4.31, y1: 5.20, op: [DOOR(4.31, 5.20, 2.10)], entry: true },       // ușa de intrare
  { x0: 6.76, x1: 7.06, y0: 5.20, y1: 11.35, op: [] },
  { x0: 0, x1: 3.89, y0: 10.95, y1: 11.35, op: [WIN(1.48, 2.83)] },
  { x0: 3.89, x1: 7.06, y0: 11.10, y1: 11.35, op: [WIN(4.56, 6.09)] },
  // pereți interiori
  { x0: 3.74, x1: 3.90, y0: 0.30, y1: 4.29, op: [] },                                        // 9 | 2
  { x0: 3.90, x1: 6.76, y0: 4.11, y1: 4.29, op: [DOOR(4.87, 5.69)] },                         // 2 | 3
  { x0: 3.90, x1: 4.25, y0: 3.87, y1: 4.11, op: [], nopass: true },                          // pilastru bucătărie
  { x0: 3.74, x1: 3.90, y0: 4.29, y1: 5.56, op: [DOOR(4.31, 5.20)] },                         // 9 | 3
  { x0: 0.30, x1: 3.82, y0: 5.56, y1: 5.62, op: [] },                                        // 9 | 8
  { x0: 3.66, x1: 3.82, y0: 5.62, y1: 6.10, op: [] },                                        // debara
  { x0: 1.04, x1: 1.77, y0: 5.62, y1: 5.93, op: [], nopass: true },                          // ghenă baie
  { x0: 2.52, x1: 2.80, y0: 5.62, y1: 5.90, op: [], nopass: true },                          // ghenă baie
  { x0: 2.80, x1: 2.87, y0: 5.62, y1: 7.37, op: [DOOR(6.67, 7.37)] },                         // 8 | 3
  { x0: 0.30, x1: 6.76, y0: 7.37, y1: 7.52, op: [DOOR(2.90, 3.74), DOOR(3.90, 4.73)] },        // hol | 7, 6
  { x0: 3.74, x1: 3.89, y0: 7.28, y1: 11.10, op: [] },                                       // 7 | 6
  { x0: 5.14, x1: 6.76, y0: 5.62, y1: 5.76, op: [] },                                        // hol | 4
  { x0: 5.14, x1: 5.25, y0: 5.76, y1: 7.37, op: [DOOR(6.67, 7.37)] },                         // 3 | 4
  { x0: 5.82, x1: 5.91, y0: 0.233, y1: 1.60, op: [DOOR(0.65, 1.40, 2.00)] },                   // cămară
  { x0: 5.91, x1: 6.76, y0: 1.53, y1: 1.60, op: [] },
];

export const ROOMS = [
  { n: 9, name: 'Living', a: 18.1, c: '#e9dcc3', r: [[0.30, 3.74, 0.30, 5.56]] },
  { n: 2, name: 'Bucătărie', a: 9.8, c: '#dfe6ea', r: [[3.90, 6.76, 0.233, 4.11]], lab: [5.0, 2.4] },
  { n: 1, name: 'Cămară', a: 1.0, c: '#e4e0d6', r: [[5.91, 6.76, 0.233, 1.53]] },
  { n: 3, name: 'Hol', a: 7.2, c: '#ece4d4', r: [[3.90, 6.76, 4.29, 5.62], [2.87, 5.14, 5.62, 7.37]], lab: [4.3, 5.4] },
  { n: 4, name: 'Baie de serviciu', a: 2.2, c: '#d3e7ec', r: [[5.25, 6.76, 5.76, 7.37]] },
  { n: 5, name: 'Debara', a: 0.4, c: '#e4e0d6', r: [[2.87, 3.66, 5.62, 6.10]] },
  { n: 8, name: 'Baie mare', a: 4.1, c: '#d3e7ec', r: [[0.30, 2.80, 5.62, 7.37]], lab: [1.5, 6.6] },
  { n: 7, name: 'Cameră mare', a: 11.9, c: '#e9dcc3', r: [[0.26, 3.74, 7.52, 10.95]] },
  { n: 6, name: 'Cameră copii', a: 10.3, c: '#e9dcc3', r: [[3.89, 6.76, 7.52, 11.10]] },
  { n: 10, name: 'Balcon', a: 4.1, c: '#d9d9d6', r: [[0.24, 3.94, -1.40, 0]] },
];
export const roomLabel = r => `${r.n} · ${r.name}`;
export const roomByN = n => ROOMS.find(r => r.n === n);

export function roomAt(px, py) {
  for (const r of ROOMS) for (const [x0, x1, y0, y1] of r.r)
    if (px >= x0 - 0.02 && px <= x1 + 0.02 && py >= y0 - 0.02 && py <= y1 + 0.02) return r;
  return null;
}

/* Tipuri de elemente */
export const ABBR = n => n.replace('Priză dublă + TV + internet', 'Pr. dublă+TV+net').replace('Priză TV / internet', 'Pr. TV/net').replace(/^Priză/, 'Pr.').replace(/^Întrerupător/, 'Într.').replace(/^Comutator/, 'Com.');
export const SUB = {
  p1: { cat: 'socket', name: 'Priză simplă', mods: 1 }, p2: { cat: 'socket', name: 'Priză dublă', mods: 2 },
  p3: { cat: 'socket', name: 'Priză triplă', mods: 3 }, p4: { cat: 'socket', name: 'Priză cvadruplă', mods: 4 },
  pc: { cat: 'socket', name: 'Priză dublă + TV + internet', mods: 4, pow: 2, data: true, net: true, tv: true },
  pt: { cat: 'socket', name: 'Priză TV / internet', mods: 1, data: true, net: true, tv: true },
  pi: { cat: 'socket', name: 'Priză internet', mods: 1, data: true, net: true }, pv: { cat: 'socket', name: 'Priză TV', mods: 1, data: true, tv: true },
  s1: { cat: 'switch', name: 'Întrerupător simplu', mods: 1, rock: 1 }, s2: { cat: 'switch', name: 'Întrerupător dublu', mods: 1, rock: 2 },
  s3: { cat: 'switch', name: 'Întrerupător triplu', mods: 1, rock: 3 },
  sc: { cat: 'switch', name: 'Comutator cap-scară', mods: 1, rock: 1, cap: true },
  sx: { cat: 'switch', name: 'Comutator cruce', mods: 1, rock: 1, cross: true },
  t: { cat: 'text', name: 'Notă text', mods: 0 },
  tb: { cat: 'panel', name: 'Tablou electric', mods: 0 },
};
/* Comutatoare care se cuplează între ele (aceeași lumină din mai multe locuri).
   Legătura se ține într-un singur element: a.pair = id-ul lui b. */
export const isLinkable = s => !!(s && (s.cap || s.cross));
export const maxLinks = () => 2;   // capetele lanțului au o legătură, cele din mijloc (cruce) două
/** toate comutatoarele din același lanț cu id */
export function chainOf(pm, id) {
  const seen = new Set([id]), st = [id];
  while (st.length) for (const p of pm.get(st.pop()) || []) if (!seen.has(p.id)) { seen.add(p.id); st.push(p.id); }
  return seen;
}
export function switchLinks(items) {
  const by = new Map(items.map(i => [i.id, i])), seen = new Set(), out = [];
  for (const a of items) {
    const b = a.pair && by.get(a.pair);
    if (!b || b === a || !isLinkable(SUB[a.sub]) || !isLinkable(SUB[b.sub])) continue;
    const k = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
    if (!seen.has(k)) { seen.add(k); out.push([a, b]); }
  }
  return out;
}
/** id -> lista elementelor cuplate cu el */
export function partnersOf(items) {
  const m = new Map();
  for (const [a, b] of switchLinks(items)) { (m.get(a.id) || m.set(a.id, []).get(a.id)).push(b); (m.get(b.id) || m.set(b.id, []).get(b.id)).push(a); }
  return m;
}

/* are alimentare 230 V (prize normale și cele combinate) */
export const hasPower = s => s.cat === 'socket' && (!s.data || !!s.pow);
export const CAT = {
  socket: { c: '#d9641e', std: 30, first: 'p1', pre: [30, 60, 110, 120, 220] },
  switch: { c: '#2b6cb0', std: 110, first: 's1', pre: [90, 100, 110, 120, 150] },
  text: { c: '#7b3fb3', std: 150, first: 't', pre: [100, 150, 200] },
  panel: { c: '#c0392b', std: 170, first: 'tb', pre: [150, 160, 170, 180] },
};

/* Grilă 10 cm pentru trasee și pentru mersul prin apartament */
export const GC = 0.1, GX = Math.ceil(7.06 / GC), GY = Math.ceil(11.35 / GC), NC = GX * GY;
export const wallCell = new Uint8Array(NC), doorCell = new Uint8Array(NC), nearW = new Uint8Array(NC);
(function buildGrid() {
  const ov = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);
  const each = (x0, x1, y0, y1, fn) => {
    for (let j = Math.max(0, Math.floor(y0 / GC)); j <= Math.min(GY - 1, Math.floor(y1 / GC)); j++)
      for (let i = Math.max(0, Math.floor(x0 / GC)); i <= Math.min(GX - 1, Math.floor(x1 / GC)); i++) fn(i, j, j * GX + i);
  };
  for (const w of WALLS) {
    const outer = w.x0 <= 0.01 || w.x1 >= 7.05 || w.y0 <= 0.01 || w.y1 >= 10.9 || w.nopass;
    each(w.x0, w.x1, w.y0, w.y1, (i, j, k) => {
      if (ov(i * GC, (i + 1) * GC, w.x0, w.x1) > 0.012 && ov(j * GC, (j + 1) * GC, w.y0, w.y1) > 0.012) wallCell[k] = Math.max(wallCell[k], outer ? 2 : 1);
    });
  }
  for (const w of WALLS) {
    if (w.entry) continue;
    const ax = (w.x1 - w.x0) >= (w.y1 - w.y0);
    for (const o of w.op) {
      if (o.lo > 0) continue;
      const [x0, x1, y0, y1] = ax ? [o.a, o.b, w.y0, w.y1] : [w.x0, w.x1, o.a, o.b];
      each(x0, x1, y0, y1, (i, j, k) => {
        const cx = (i + .5) * GC, cy = (j + .5) * GC; const along = ax ? cx : cy;
        if (along > (ax ? x0 : y0) + 0.02 && along < (ax ? x1 : y1) - 0.02 && ov(i * GC, (i + 1) * GC, x0, x1) > 0 && ov(j * GC, (j + 1) * GC, y0, y1) > 0 && wallCell[k] < 2) { wallCell[k] = 0; doorCell[k] = 1; }
      });
    }
  }
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
    const k = j * GX + i; if (wallCell[k] || doorCell[k]) continue;
    for (let dj = -1; dj <= 1 && !nearW[k]; dj++) for (let di = -1; di <= 1; di++) {
      const a = i + di, b = j + dj;
      if (a >= 0 && b >= 0 && a < GX && b < GY && wallCell[b * GX + a]) { nearW[k] = 1; break; }
    }
  }
})();

/* Poți sta în punctul (x, y)? (pentru modul de plimbare) */
export function isFree(x, y) {
  if (x > 0.32 && x < 3.86 && y > -1.32 && y < 0.02) return true;   // balcon
  if (x > 2.32 && x < 3.06 && y > -0.4 && y < 0.5) return true;     // ușa balconului
  if (x < 0 || y < 0 || x > 7.06 || y > 11.35) return false;
  for (const [dx, dy] of [[0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22], [0.16, 0.16], [-0.16, 0.16], [0.16, -0.16], [-0.16, -0.16]]) {
    const i = Math.floor((x + dx) / GC), j = Math.floor((y + dy) / GC);
    if (i < 0 || j < 0 || i >= GX || j >= GY) continue;
    if (wallCell[j * GX + i]) return false;
  }
  return true;
}

/* Text pentru listă */
export function sortedByRoom(items) {
  const order = ROOMS.map(r => r.n);
  return [...items].sort((a, b) => (order.indexOf(a.room) - order.indexOf(b.room)) || (SUB[a.sub].cat.localeCompare(SUB[b.sub].cat)) || a.n - b.n);
}
export function countByCat(items) {
  const c = { socket: 0, switch: 0, text: 0, panel: 0 };
  items.forEach(i => { if (SUB[i.sub]) c[SUB[i.sub].cat]++; });
  return c;
}
export function listText(items) {
  let out = 'Ap. 3, Str. Pârâului 15, Brașov – prize și întrerupătoare (înălțimi de la pardoseală)\n';
  let last; const pm = partnersOf(items);
  for (const it of sortedByRoom(items)) {
    if (it.room !== last) { const r = roomByN(it.room); out += '\n' + (r ? roomLabel(r) : 'Fără cameră') + '\n'; last = it.room; }
    const pr = pm.get(it.id);
    out += `  #${it.n} ${SUB[it.sub].name} – ${Math.round(it.h * 100)} cm${pr ? ' – cuplat cu ' + pr.map(p => '#' + p.n).join(', ') : ''}${it.text ? ' – ' + it.text : ''}\n`;
  }
  const c = countByCat(items);
  return out + `\nTotal: ${c.socket} prize, ${c.switch} întrerupătoare`;
}

/* Sumar pe camere: câte prize, întrerupătoare, internet și TV are fiecare */
export const SUM_COLS = [
  ['sock', 'Prize 230 V'], ['outl', 'Locuri 230 V'], ['sw', 'Întrerupătoare'], ['net', 'Internet'], ['tv', 'TV'],
];
export function roomSummary(items) {
  const blank = () => ({ sock: 0, outl: 0, sw: 0, net: 0, tv: 0, types: {} });
  const by = new Map(), total = blank();
  for (const it of items) {
    const s = SUB[it.sub]; if (!s || (s.cat !== 'socket' && s.cat !== 'switch')) continue;
    if (!by.has(it.room)) by.set(it.room, blank());
    for (const c of [by.get(it.room), total]) {
      if (hasPower(s)) { c.sock++; c.outl += s.pow || s.mods; }
      if (s.cat === 'switch') c.sw++;
      if (s.net) c.net++;
      if (s.tv) c.tv++;
      c.types[it.sub] = (c.types[it.sub] || 0) + 1;
    }
  }
  const rows = ROOMS.filter(r => by.has(r.n)).map(r => ({ label: roomLabel(r), ...by.get(r.n) }));
  if (by.has(undefined) || by.has(null)) rows.push({ label: 'Fără cameră', ...(by.get(undefined) || by.get(null)) });
  return { rows, total };
}
const typesText = t => Object.keys(SUB).filter(k => t[k]).map(k => `${t[k]} × ${SUB[k].name}`).join(', ');
export function summaryText(items) {
  const { rows, total } = roomSummary(items);
  const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const line = c => `${pl(c.sock, 'priză', 'prize')} (${pl(c.outl, 'loc', 'locuri')} 230 V), ${pl(c.sw, 'întrerupător', 'întrerupătoare')}, ${c.net} internet, ${c.tv} TV`;
  let out = 'Ap. 3, Str. Pârâului 15, Brașov – sumar pe camere\n';
  for (const r of rows) out += `\n${r.label}: ${line(r)}\n  ${typesText(r.types)}\n`;
  return out + `\nTotal: ${line(total)}\n  ${typesText(total.types)}`;
}
export function summaryCsv(items) {
  const { rows, total } = roomSummary(items);
  const q = v => /[;"\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v;
  const head = ['Cameră', ...SUM_COLS.map(c => c[1]), 'Detaliu'];
  const line = (label, c) => [label, ...SUM_COLS.map(k => c[k[0]]), typesText(c.types)].map(q).join(';');
  return '﻿' + [head.join(';'), ...rows.map(r => line(r.label, r)), line('Total', total)].join('\r\n');
}
