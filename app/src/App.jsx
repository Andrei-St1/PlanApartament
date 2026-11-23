import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { PlanScene } from './plan/scene.js';
import { H, ROOMS, SUB, CAT, ABBR, hasPower, isLinkable, maxLinks, partnersOf, chainOf, roomLabel, roomByN, sortedByRoom, countByCat, listText, roomSummary, summaryText, summaryCsv, SUM_COLS } from './plan/geometry.js';
import { computeRoutes, routeText, bomCsv, fm, APPL, COL, SLEEP } from './plan/routes.js';
import { createStore } from './store.js';

const store = createStore();
const newId = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const ls = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* fără stocare locală */ } },
};
function download(text, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const SOURCES = [
  ['https://legislatie.just.ro/Public/DetaliiDocument/287132', 'Normativ I7/2011 – textul oficial (Portal legislativ)'],
  ['https://curentulelectric.ro/wp-content/uploads/2023/11/Actualizari-2023-la-normativ-I7-2011.pdf', 'Modificările I7 din 2023 – AFDD, DDR 30 mA (Monitorul Oficial 512/2023)'],
  ['https://www.arya.ro/legislatie/pdf.php?slug=normativ-i7-2011', 'I7/2011 în PDF: tabelul 5.7 (tuburi), anexa 5.32 (secțiuni minime), cap. 7.1 (băi)'],
  ['https://excel-networking.com/excel_web_files/uploads/Technical%20Notes/TN01_Power_Segregation_Distances.pdf', 'Distanțe între date și forță după EN 50174-2 (Excel Networking)'],
  ['https://www.ancom.ro/uploads/standarde/pdf/Rezumat%20SR%20EN%2050174-2_2019_Tehnologia%20informa%C8%9Biei.Instalarea%20cablurilor.Proiectare%20%C8%99i%20prectici%20de%20instalare%20%C3%AEn%20interiorul%20cl%C4%83dirilor.pdf', 'SR EN 50174-2:2019 – rezumat (ANCOM)'],
  ['https://cdn.dedeman.ro/media/catalog/product/fise-tehnice/Fisa_tehnica_-_tub_flexibil_Legrand_rezistenta_marita.pdf', 'Tub flexibil 750 N – diametre interioare (fișă Legrand)'],
  ['https://cdn.mathaus.ro/medias/sys_master/productPdfs/h02/hf1/h00/9467631894558.pdf', 'Cablu CYY-F – diametre exterioare (fișă tehnică)'],
  ['https://www.baunetzwissen.de/elektro/fachwissen/leitungen-verteiler/leitungsverlegung-und-installationszonen-153012', 'Zone de instalare pe pereți, DIN 18015-3 (Baunetz Wissen)'],
  ['https://www.elektro-wandelt.de/ratgeber/Elektro-Installationszonen-im-Fussboden/', 'Zone de instalare în pardoseală, DIN 18015-3 (elektro-wandelt.de)'],
  ['https://www.legrand.fr/questions-frequentes/combien-de-prises-de-courant-par-disjoncteur', 'Câte prize pe un circuit – NF C 15-100 (Legrand)'],
];

export default function App() {
  const plan = useSyncExternalStore(store.subscribe, store.getState);
  const status = useSyncExternalStore(store.subscribe, store.getStatus);
  const online = useSyncExternalStore(store.subscribe, store.getOnline);
  // elementele de un tip pe care această versiune a paginii nu-l cunoaște (pagină veche, tip nou) sunt ignorate
  const items = useMemo(() => plan.items.filter(i => SUB[i.sub]), [plan.items]);

  const stageRef = useRef(null), sceneRef = useRef(null);
  const [bootErr, setBootErr] = useState(null);
  const [mode, setMode] = useState('nav');
  const [curSub, setCurSub] = useState({ socket: 'p1', switch: 's1', text: 't', panel: 'tb' });
  const [hmode, setHmode] = useState('tap');
  const [selected, setSelected] = useState(null);
  const [moving, setMoving] = useState(null);
  const [walk, setWalk] = useState(false);
  const [roomN, setRoomN] = useState(null);
  const [viewBtn, setViewBtn] = useState('3d');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [hint, setHint] = useState({ t: 'Alege o cameră din meniul de sus ca să intri și să pui prize', on: true });
  const [showLabels, setShowLabels] = useState(() => ls.get('plan-labels', true));
  const [RS, setRS] = useState(() => ({ mode: 'par', max: 8, cab: 'fy', ...ls.get('plan-rs', {}), on: false }));
  const [routeRes, setRouteRes] = useState(null);
  const [visitor, setVisitor] = useState(() => ls.get('plan-visitor', false));

  const hintT = useRef(), toastT = useRef();
  const showHint = t => { setHint({ t, on: true }); clearTimeout(hintT.current); hintT.current = setTimeout(() => setHint(h => ({ ...h, on: false })), 3200); };
  const showToast = (msg, btn, fn) => { setToast({ msg, btn, fn }); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(null), 4500); };
  useEffect(() => { hintT.current = setTimeout(() => setHint(h => ({ ...h, on: false })), 4000); }, []);

  const sel = items.find(i => i.id === selected) || null;
  const select = id => { setSelected(id); if (!id) setMoving(null); };

  /* ultima stare, pentru apelurile venite din scena 3D */
  const L = useRef();
  L.current = { mode, curSub, hmode, moving, items, visitor };

  /* ---------- scena 3D ---------- */
  useEffect(() => {
    store.onError = msg => showToast(msg);
    store.start();
    let sc;
    try {
      sc = new PlanScene(stageRef.current, {
        onTap: t => onTap(t),
        onWalk: (w, n) => { setWalk(w); setRoomN(n); if (w) setViewBtn(null); },
      });
    } catch (e) {
      setBootErr('Browserul nu poate afișa grafică 3D (WebGL este oprit). În Chrome/Edge: Setări → Sistem → activează „Folosește accelerarea grafică”, apoi repornește browserul.');
      return () => store.stop();
    }
    sceneRef.current = sc;
    return () => { sc.dispose(); sceneRef.current = null; store.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { sceneRef.current?.setItems(items); }, [items]);
  useEffect(() => { sceneRef.current?.setSelected(sel ? sel.id : null); }, [sel]);
  useEffect(() => { sceneRef.current?.setShowLabels(showLabels); ls.set('plan-labels', showLabels); }, [showLabels]);

  function onTap({ itemId, wall, walk }) {
    const s = L.current;
    if (s.visitor) return;   // în modul vizitator planul doar se privește
    if (itemId && !s.moving) { select(itemId); return; }
    if (!walk) { if (s.moving || s.mode !== 'nav') showHint('Ca să pui ceva pe perete, intră într-o cameră din meniul de sus'); else select(null); return; }
    if (!wall) { if (s.mode === 'nav' && !s.moving) select(null); return; }
    if (wall.horizontal) { showHint('Atinge fața verticală a peretelui'); return; }
    const pos = { x: wall.x, z: wall.z, nx: wall.nx, nz: wall.nz, room: wall.room };
    if (s.moving) {
      const it = s.items.find(i => i.id === s.moving); setMoving(null);
      if (it) { store.upsert({ ...it, ...pos }); showHint('Mutat'); }
      return;
    }
    if (s.mode === 'nav') { select(null); showHint('Alege Priză, Întrerupător, Text sau Tablou jos, apoi atinge peretele'); return; }
    const sub = s.curSub[s.mode], cat = SUB[sub].cat;
    let h = s.hmode === 'std' ? CAT[cat].std / 100 : Math.round(wall.y * 100) / 100;
    h = Math.min(H - 0.05, Math.max(0.05, h));
    if (cat === 'panel') {
      h = Math.min(H - 0.24, Math.max(0.25, h));
      const ex = s.items.find(i => SUB[i.sub].cat === 'panel');
      if (ex) { store.upsert({ ...ex, ...pos, h }); select(ex.id); showHint('Tabloul a fost mutat aici (există un singur tablou)'); return; }
    }
    const it = { id: newId(), n: store.nextN(), sub, ...pos, h, text: '' };
    store.upsert(it); select(it.id);
  }

  /* ---------- trasee ---------- */
  useEffect(() => {
    if (!RS.on) { setRouteRes(null); sceneRef.current?.drawRoutes(null); return; }
    const t = setTimeout(() => { const r = computeRoutes(items, RS); setRouteRes(r); sceneRef.current?.drawRoutes(r); }, 250);
    return () => clearTimeout(t);
  }, [items, RS]);
  const updRS = patch => setRS(r => { const n = { ...r, ...patch }; ls.set('plan-rs', { mode: n.mode, max: n.max, cab: n.cab }); return n; });
  function toggleRoutes() {
    const on = !RS.on; updRS({ on });
    if (on) {
      const r = computeRoutes(items, RS); setRouteRes(r); sceneRef.current?.drawRoutes(r);
      if (!r.err && !walk) { setViewBtn('top'); sceneRef.current?.viewTop(); }
      showHint('Liniile colorate de pe pardoseală sunt tuburile prin șapă');
    }
  }

  /* ---------- acțiuni pe element ---------- */
  const update = (patch, delay) => { if (sel) store.upsert({ ...sel, ...patch }, delay); };
  const setH = v => { v = Math.round(+v); if (!isFinite(v) || !sel) return; v = Math.min(Math.round(H * 100) - 3, Math.max(3, v)); update({ h: v / 100 }); };
  function dup() {
    if (!sel) return;
    const t = new THREE.Vector3().crossVectors(new THREE.Vector3(sel.nx, 0, sel.nz), new THREE.Vector3(0, 1, 0)).normalize();
    const w = (SUB[sel.sub].mods * 0.071 + 0.02) * 1.8 + 0.05;
    const c = { ...sel, id: newId(), n: store.nextN(), x: sel.x + t.x * w, z: sel.z + t.z * w };
    store.upsert(c); select(c.id); showHint('Copiat alături – folosește „Mută” dacă vrei alt loc');
  }
  /* cuplarea comutatoarelor cap-scară / cruce */
  const pm = useMemo(() => partnersOf(items), [items]);
  const pairOk = x => !!x.pair && (pm.get(x.id) || []).some(p => p.id === x.pair);
  /* modificările pe mai multe elemente se adună și se trimit o singură dată per element */
  function applyPatches(P) { for (const [id, patch] of P) { const x = items.find(i => i.id === id); if (x) store.upsert({ ...x, ...patch }); } }
  const patch = (P, x, p) => P.set(x.id, { ...(P.get(x.id) || {}), ...p });
  /* Cuplare: o lumină din 2 locuri = 2 cap-scară; din 3 sau mai multe = cap-scară la capete și cruce la mijloc.
     Un cap-scară care primește a doua legătură devine automat comutator cruce. */
  function link(a, b) {
    if (chainOf(pm, a.id).has(b.id)) { showToast('Sunt deja în același lanț'); return; }
    const P = new Map(), byId = id => items.find(i => i.id === id);
    if (!pairOk(a)) patch(P, a, { pair: b.id });
    else if (!pairOk(b)) patch(P, b, { pair: a.id });
    else {
      // amândouă au legătura lor proprie ocupată: o mutăm pe partenerul unuia dintre ele, dacă acesta e liber
      const pa = byId(a.pair), pb = byId(b.pair);
      if (pa && !pairOk(pa)) { patch(P, pa, { pair: a.id }); patch(P, a, { pair: b.id }); }
      else if (pb && !pairOk(pb)) { patch(P, pb, { pair: b.id }); patch(P, b, { pair: a.id }); }
      else { showToast('Nu le pot cupla direct – cuplează-le prin capătul liber al lanțului'); return; }
    }
    const conv = [a, b].filter(x => x.sub === 'sc' && (pm.get(x.id) || []).length >= 1);
    conv.forEach(x => patch(P, x, { sub: 'sx' }));
    applyPatches(P);
    if (conv.length) showToast(conv.map(x => '#' + x.n).join(', ') + ' a devenit comutator cruce (e la mijlocul lanțului)');
  }
  function unlink(a, b) {
    const P = new Map();
    if (a.pair === b.id) patch(P, a, { pair: undefined });
    if (b.pair === a.id) patch(P, b, { pair: undefined });
    // un comutator cruce rămas cu o singură legătură (sau niciuna) redevine cap-scară
    for (const x of [a, b]) if (x.sub === 'sx' && (pm.get(x.id) || []).length <= 2) patch(P, x, { sub: 'sc' });
    applyPatches(P);
  }
  function del() {
    if (!sel) return; const it = sel;
    store.remove(it.id); select(null);
    showToast('#' + it.n + ' șters', 'Anulează', () => store.upsert(it));
  }

  /* ---------- copiere ---------- */
  function copy(txt) {
    navigator.clipboard.writeText(txt).then(() => showToast('Copiat în clipboard')).catch(() => setModal({ kind: 'copy', txt }));
  }

  function toggleVisitor() {
    const v = !visitor; setVisitor(v); ls.set('plan-visitor', v);
    if (v) { setMode('nav'); setMoving(null); select(null); }
    showHint(v ? 'Mod vizitator: poți doar să te uiți prin apartament' : 'Mod editare: poți pune din nou prize și întrerupătoare');
  }

  const cnt = countByCat(items);
  const syncInfo = {
    live: ['☁ Salvat · live' + (online > 1 ? ` · ${online} online` : ''), 'ok', 'Modificările se salvează pe server și le văd toți cei care au pagina deschisă'],
    saving: ['Se salvează…', '', ''],
    connecting: ['Se conectează…', '', ''],
    offline: ['⚠ Fără conexiune', 'err', 'Modificările se trimit când revine conexiunea'],
  }[status];

  return (
    <div id="app">
      <div id="top">
        <h1>Ap. 3 · Str. Pârâului 15</h1><span className="sub">Su 65,0 m² · pereți 2,40 m</span>
        <span className={'sync ' + syncInfo[1]} title={syncInfo[2]}>{syncInfo[0]}</span>
        <button className={'btn' + (viewBtn === '3d' ? ' on' : '')} onClick={() => { setViewBtn('3d'); sceneRef.current?.view3d(); }}>3D</button>
        <button className={'btn' + (viewBtn === 'top' ? ' on' : '')} onClick={() => { setViewBtn('top'); sceneRef.current?.viewTop(); }}>Sus</button>
        <select className="btn" value={walk && roomN != null ? String(roomN) : ''} onChange={e => {
          if (!e.target.value) return; sceneRef.current?.viewRoom(+e.target.value);
          showHint('Trage cu degetul ca să te uiți în jur, mergi cu joystick-ul din dreapta-jos');
        }}>
          <option value="">🚶 Intră în cameră…</option>
          {ROOMS.map(r => <option key={r.n} value={r.n}>{roomLabel(r)}</option>)}
        </select>
        <button className={'btn' + (RS.on ? ' on' : '')} onClick={toggleRoutes}>⚡ Trasee</button>
        <button className="btn" onClick={() => setModal({ kind: 'list' })}>Listă</button>
        <button className="btn" onClick={() => setModal({ kind: 'options' })}>⋯</button>
        <button className={'btn' + (visitor ? ' on' : '')} onClick={toggleVisitor} title="Ascunde butoanele de editare">👁 Vizitator</button>
      </div>

      <div id="stage" ref={stageRef}>
        {bootErr && <div id="boot"><div><b>Planul nu s-a putut porni.</b><br />{bootErr}</div></div>}
        <div id="hint" style={{ opacity: hint.on ? 1 : 0 }}>{hint.t}</div>
        {!visitor && <div id="legend">
          <div><i style={{ background: CAT.socket.c }}></i><b>Prize</b> {cnt.socket}</div>
          <div><i style={{ background: CAT.switch.c }}></i><b>Întrerupătoare</b> {cnt.switch}</div>
          <div><i style={{ background: CAT.text.c }}></i><b>Note</b> {cnt.text}</div>
          <div><i style={{ background: CAT.panel.c }}></i><b>Tablou</b> {cnt.panel ? 'da' : '–'}</div>
        </div>}
        {walk && <Joystick scene={sceneRef} />}
        {RS.on && routeRes && (
          <div id="rcard">
            {routeRes.err ? <span>{routeRes.err}</span> : <>
              <span className="sw">{routeRes.groups.map((g, i) => <i key={i} style={{ background: g.color }}></i>)}</span>
              <span>{routeRes.circ.length} circuite · ~{Math.round(Object.values(routeRes.tot).reduce((a, b) => a + b, 0))} m cablu{routeRes.warn.some(w => w.lvl !== 'info') ? <b className="wn"> · ⚠ {routeRes.warn.filter(w => w.lvl !== 'info').length}</b> : null}</span>
              <button className="btn" style={{ padding: '4px 9px' }} onClick={() => setModal({ kind: 'routes' })}>Detalii</button>
            </>}
          </div>
        )}
        {sel && !visitor && <Sheet it={sel} items={items} pm={pm} link={link} unlink={unlink} moving={moving === sel.id} update={update} setH={setH}
          onMove={() => { setMoving(sel.id); showHint('Atinge noul loc pe perete (înălțimea rămâne aceeași)'); }}
          onDup={dup} onDel={del} onDone={() => select(null)} />}
      </div>

      {!visitor && <div id="tools">
        <div className="row">
          {[['nav', '✋', 'Navighează'], ['socket', '🔌', 'Priză'], ['switch', '💡', 'Întrerupător'], ['text', '✏️', 'Text'], ['panel', '🗄️', 'Tablou']].map(([m, ic, t]) => (
            <button key={m} className={'btn mode' + (mode === m ? ' on' : '')} onClick={() => {
              setMode(m); setMoving(null);
              if (m !== 'nav' && !walk) showHint('Intră într-o cameră (meniul de sus), apoi atinge peretele');
              else if (m !== 'nav') showHint(m === 'text' ? 'Atinge peretele unde vrei nota' : m === 'panel' ? 'Atinge peretele unde vrei tabloul (de obicei în holul de la intrare)' : 'Atinge peretele unde vrei ' + (m === 'socket' ? 'priza' : 'întrerupătorul'));
            }}><span className="ic">{ic}</span>{t}</button>
          ))}
        </div>
        {(mode === 'socket' || mode === 'switch') && (
          <div className="row">
            {Object.entries(SUB).filter(([, s]) => s.cat === mode).map(([k, s]) => (
              <button key={k} className={'chip' + (mode === 'switch' ? ' sw' : '') + (curSub[mode] === k ? ' on' : '')} onClick={() => setCurSub(c => ({ ...c, [mode]: k }))}>{ABBR(s.name)}</button>
            ))}
          </div>
        )}
        {mode !== 'nav' && (
          <div className="row">
            <span className="lbl">Înălțime la plasare:</span>
            <button className={'chip hm' + (hmode === 'tap' ? ' on' : '')} onClick={() => setHmode('tap')}>unde atingi</button>
            <button className={'chip hm' + (hmode === 'std' ? ' on' : '')} onClick={() => setHmode('std')}>standard ({CAT[mode].std} cm)</button>
          </div>
        )}
      </div>}

      {modal && <Modal modal={modal} setModal={setModal} items={items} plan={plan} copy={copy} showToast={showToast}
        showLabels={showLabels} setShowLabels={setShowLabels} sceneRef={sceneRef} select={select}
        RS={RS} updRS={updRS} routeRes={routeRes} />}

      {toast && <div id="toast"><span>{toast.msg}</span>{toast.btn && <button onClick={() => { toast.fn && toast.fn(); setToast(null); }}>{toast.btn}</button>}</div>}
    </div>
  );
}

/* ---------- joystick pentru modul de plimbare ---------- */
function Joystick({ scene }) {
  const ref = useRef(null), knob = useRef(null), id = useRef(null);
  const R0 = 46;
  const mv = e => {
    const r = ref.current.getBoundingClientRect(); let x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    const L = Math.hypot(x, y); if (L > R0) { x *= R0 / L; y *= R0 / L; }
    knob.current.style.transform = `translate(${x}px,${y}px)`; scene.current?.setJoy(x / R0, y / R0);
  };
  const end = e => { if (e.pointerId !== id.current) return; id.current = null; scene.current?.setJoy(0, 0); knob.current.style.transform = ''; };
  useEffect(() => () => scene.current?.setJoy(0, 0), [scene]);
  return (
    <div id="joy" ref={ref}
      onPointerDown={e => { id.current = e.pointerId; ref.current.setPointerCapture(e.pointerId); mv(e); e.stopPropagation(); }}
      onPointerMove={e => { if (e.pointerId === id.current) mv(e); }}
      onPointerUp={end} onPointerCancel={end}>
      <div id="knob" ref={knob}></div>
    </div>
  );
}

/* ---------- foaia de editare a unui element ---------- */
function Sheet({ it, items, pm, link, unlink, moving, update, setH, onMove, onDup, onDel, onDone }) {
  const s = SUB[it.sub], r = roomByN(it.room), hcm = Math.round(it.h * 100);
  const [hv, setHv] = useState(String(hcm));
  useEffect(() => setHv(String(hcm)), [hcm, it.id]);
  return (
    <div id="sheet">
      <h2><span>#{it.n} {s.name}</span><span className="room">{r ? '· ' + roomLabel(r) : ''}</span></h2>
      <div className="f"><label>Tip</label>
        <select value={it.sub} disabled={s.cat === 'panel'} onChange={e => update({ sub: e.target.value })}>
          {Object.entries(SUB).filter(([k]) => (k === 'tb') === (s.cat === 'panel')).map(([k, x]) => <option key={k} value={k}>{x.name}</option>)}
        </select>
      </div>
      <div className="f"><label>Înălțime</label>
        <div>
          <div className="hgt">
            <button className="btn" onClick={() => setH(hcm - 1)}>−</button>
            <input type="number" inputMode="numeric" step="1" min="3" max="237" value={hv}
              onChange={e => setHv(e.target.value)} onBlur={() => setH(hv)}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
            <span className="lbl">cm de la pardoseală</span>
            <button className="btn" onClick={() => setH(hcm + 1)}>+</button>
          </div>
          <div className="presets">
            {CAT[s.cat].pre.map(v => <button key={v} className={'chip' + (hcm === v ? ' on' : '')} onClick={() => setH(v)}>{v} cm</button>)}
          </div>
        </div>
      </div>
      <div className="f"><label>Text</label>
        <input type="text" placeholder="ex: frigider, TV, aplică pat…" maxLength={60} value={it.text || ''} onChange={e => update({ text: e.target.value }, 400)} />
      </div>
      {isLinkable(s) && (() => {
        const partners = pm.get(it.id) || [];
        const chain = chainOf(pm, it.id);
        const opts = items.filter(o => !chain.has(o.id) && isLinkable(SUB[o.sub]) && (pm.get(o.id) || []).length < maxLinks(SUB[o.sub]));
        return (
          <div className="f"><label>Cuplat cu</label>
            <div className="presets">
              {partners.map(p => <button key={p.id} className="chip on" title="Decuplează" onClick={() => unlink(it, p)}>#{p.n} ✕</button>)}
              {partners.length < maxLinks(s) && (opts.length
                ? <select className="btn" value="" onChange={e => { const t = items.find(x => x.id === e.target.value); if (t) link(it, t); }}>
                    <option value="">+ cuplează cu…</option>
                    {opts.map(o => { const rr = roomByN(o.room); return <option key={o.id} value={o.id}>#{o.n} {SUB[o.sub].name}{rr ? ' · ' + roomLabel(rr) : ''}</option>; })}
                  </select>
                : <span className="lbl">Pune și celălalt comutator cap-scară, apoi cuplează-le aici.</span>)}
            </div>
          </div>
        );
      })()}
      {hasPower(s) && (
        <label className="chk"><input type="checkbox" checked={!!it.ded} onChange={e => update({ ded: e.target.checked })} />
          <span>Circuit separat – aparat peste 2 kW (cuptor, plită, mașină de spălat, boiler, AC)</span></label>
      )}
      {hasPower(s) && it.ded && <Appliance it={it} update={update} />}
      <div className="acts">
        <button className={'btn' + (moving ? ' on' : '')} onClick={onMove}>↔ Mută</button>
        {s.cat !== 'panel' && <button className="btn" onClick={onDup}>⧉ Copiază</button>}
        <button className="btn dang" onClick={onDel}>Șterge</button>
        <button className="btn on" onClick={onDone}>Gata</button>
      </div>
    </div>
  );
}

/* aparatul de pe un circuit separat: tipul și puterea (pentru siguranță, secțiune și căderea de tensiune) */
function Appliance({ it, update }) {
  const kw = typeof it.kw === 'number' ? it.kw : null;
  const [v, setV] = useState(kw != null ? String(kw).replace('.', ',') : '');
  useEffect(() => setV(kw != null ? String(kw).replace('.', ',') : ''), [kw, it.id]);
  const save = () => { const n = parseFloat(String(v).replace(',', '.')); if (isFinite(n) && n >= 0.1 && n <= 30) update({ kw: Math.round(n * 10) / 10 }); else if (!v) update({ kw: undefined }); };
  return (
    <div className="f"><label>Aparat</label>
      <div>
        <div className="presets" style={{ marginTop: 0 }}>
          {APPL.map(a => <button key={a.name} className={'chip' + (kw === a.kw && a.re.test(it.text || '') ? ' on' : '')}
            onClick={() => update({ kw: a.kw, text: (it.text || '').trim() ? it.text : a.name })}>{a.name} {fm(a.kw)} kW</button>)}
        </div>
        <div className="hgt" style={{ marginTop: 6 }}>
          <input type="text" inputMode="decimal" placeholder="?" value={v} onChange={e => setV(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
          <span className="lbl">kW (din eticheta aparatului)</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- ferestre (listă, opțiuni, import, trasee, istoric) ---------- */
function Modal({ modal, setModal, items, plan, copy, showToast, showLabels, setShowLabels, sceneRef, select, RS, updRS, routeRes }) {
  const close = () => setModal(null);
  let title = '', body = null;
  if (modal.kind === 'list') {
    title = 'Listă elemente' + (items.length ? ` (${items.length})` : '');
    if (!items.length) body = <p className="note">Încă nu ați adăugat nimic. Alege jos <b>Priză</b> sau <b>Întrerupător</b> și atinge un perete.</p>;
    else {
      const rows = []; let last; const pm = partnersOf(items);
      for (const it of sortedByRoom(items)) {
        if (it.room !== last) { const r = roomByN(it.room); rows.push(<tr key={'g' + it.room} className="grp"><td colSpan={4}>{r ? roomLabel(r) : 'Fără cameră'}</td></tr>); last = it.room; }
        rows.push(<tr key={it.id} className="click" onClick={() => { close(); select(it.id); sceneRef.current?.focusItem(it); }}>
          <td>{it.n}</td><td><span className="tag" style={{ background: CAT[SUB[it.sub].cat].c }}></span>{SUB[it.sub].name}</td><td className="h">{Math.round(it.h * 100)} cm</td><td>{pm.get(it.id) ? '↔ ' + pm.get(it.id).map(p => '#' + p.n).join(', ') + (it.text ? ' · ' : '') : ''}{it.text}</td></tr>);
      }
      const sum = roomSummary(items);
      const csv = () => download(summaryCsv(items), 'sumar-camere.csv');
      body = <>
        <h4 className="sub">Sumar pe camere</h4>
        <div className="scrollx"><table className="sum"><tbody>
          <tr><th>Cameră</th>{SUM_COLS.map(c => <th key={c[0]}>{c[1]}</th>)}</tr>
          {sum.rows.map(r => <tr key={r.label}><td>{r.label}</td>{SUM_COLS.map(c => <td key={c[0]}>{r[c[0]] || '–'}</td>)}</tr>)}
          <tr className="tot"><td>Total</td>{SUM_COLS.map(c => <td key={c[0]}>{sum.total[c[0]]}</td>)}</tr>
        </tbody></table></div>
        <div className="acts">
          <button className="btn" onClick={() => copy(summaryText(items))}>Copiază sumarul</button>
          <button className="btn" onClick={csv}>Descarcă tabel (Excel)</button>
        </div>
        <p className="note">„Locuri 230 V” numără fiecare loc de ștecher (o priză dublă = 2). Priza TV / internet apare la ambele.</p>
        <h4 className="sub">Toate elementele</h4>
        <table><tbody><tr><th>#</th><th>Tip</th><th>Înălțime</th><th>Text</th></tr>{rows}</tbody></table>
        <div className="acts"><button className="btn" onClick={() => copy(listText(items))}>Copiază lista ca text</button></div>
        <p className="note">Atinge un rând ca să mergi la element.</p>
      </>;
    }
  } else if (modal.kind === 'options') {
    title = 'Opțiuni';
    body = <Options {...{ close, setModal, plan, copy, showLabels, setShowLabels, sceneRef }} />;
  } else if (modal.kind === 'import') {
    title = 'Importă date';
    body = <Import {...{ close, showToast }} />;
  } else if (modal.kind === 'history') {
    title = 'Istoric versiuni';
    body = <History {...{ close, showToast }} />;
  } else if (modal.kind === 'shot') {
    title = 'Captură';
    body = <><img id="shot" src={modal.url} alt="Captură plan 3D" /><p className="note">Ține apăsat pe imagine (sau click dreapta) ca s-o salvezi.</p></>;
  } else if (modal.kind === 'copy') {
    title = 'Copiază manual';
    body = <><p className="note">Selectează tot textul și copiază-l.</p><textarea readOnly value={modal.txt} onFocus={e => e.target.select()} autoFocus /></>;
  } else if (modal.kind === 'routes') {
    title = 'Trasee cabluri și tablou';
    body = <Routes {...{ RS, updRS, routeRes, copy }} />;
  }
  return (
    <div id="modal" onClick={e => { if (e.target.id === 'modal') close(); }}>
      <div id="mbox">
        <div id="mhead"><h3>{title}</h3><button className="btn" onClick={close}>Închide</button></div>
        <div id="mbody">{body}</div>
      </div>
    </div>
  );
}

function Options({ close, setModal, plan, copy, showLabels, setShowLabels, sceneRef }) {
  const [armed, setArmed] = useState(false);
  return <>
    <div className="menu">
      <button className="btn" onClick={() => { setShowLabels(!showLabels); close(); }}>{showLabels ? 'Ascunde' : 'Arată'} etichetele cu înălțimi</button>
      <button className="btn" onClick={() => { const url = sceneRef.current?.screenshot(); if (url) setModal({ kind: 'shot', url }); }}>📷 Captură a vederii curente</button>
      <button className="btn" onClick={() => copy(JSON.stringify(plan))}>Copiază datele (copie de siguranță)</button>
      <button className="btn" onClick={() => setModal({ kind: 'import' })}>Importă date</button>
      <button className="btn" onClick={() => setModal({ kind: 'history' })}>🕘 Istoric versiuni (anulează modificări)</button>
      <button className="btn dang" onClick={() => {
        if (!armed) { setArmed(true); return; }
        store.replace({ items: [], next: 1 }); close();
      }}>{armed ? 'Atinge din nou pentru a confirma' : 'Șterge toate elementele'}</button>
    </div>
    <p className="note">Planul este comun: ce modifici se salvează pe server și apare imediat la toți cei care au pagina deschisă. Dacă cineva greșește ceva, din „Istoric versiuni” poți reveni la o variantă mai veche.<br />
      Dimensiunile camerelor sunt luate din releveul din 04.10.2024 (scara 1/100); grosimile pereților sunt măsurate pe desen, cu aproximație de câțiva cm.</p>
  </>;
}

function Import({ close, showToast }) {
  const [txt, setTxt] = useState('');
  return <>
    <p className="note">Lipește datele copiate anterior (din această aplicație sau din planul vechi) sau alege un fișier .json. Planul comun va fi înlocuit; varianta de acum rămâne în istoric.</p>
    <textarea value={txt} onChange={e => setTxt(e.target.value)} placeholder='{"items":[...]}' />
    <div className="acts">
      <label className="btn" style={{ textAlign: 'center' }}>Fișier…<input type="file" accept=".json,application/json,text/plain" hidden onChange={async e => { const f = e.target.files[0]; if (f) setTxt(await f.text()); }} /></label>
      <button className="btn on" onClick={() => {
        try {
          const s = JSON.parse(txt); if (!Array.isArray(s.items)) throw 0;
          const list = s.items.filter(i => i && SUB[i.sub] && typeof i.id === 'string');
          const next = Math.max(s.next || 1, ...list.map(i => (i.n || 0) + 1), 1);
          store.replace({ items: list, next }); close(); showToast('Importat: ' + list.length + ' elemente');
        } catch { showToast('Date invalide'); }
      }}>Importă</button>
    </div>
  </>;
}

function History({ close, showToast }) {
  const [list, setList] = useState(null), [err, setErr] = useState(false);
  useEffect(() => { store.history().then(setList).catch(() => setErr(true)); }, []);
  if (err) return <p className="note">Istoricul nu s-a putut încărca.</p>;
  if (!list) return <p className="note">Se încarcă…</p>;
  if (!list.length) return <p className="note">Încă nu există versiuni salvate. Se păstrează automat o versiune la câteva minute de modificări și înainte de fiecare import sau ștergere completă.</p>;
  return <>
    <p className="note">Alege o versiune ca să revii la ea. Varianta de acum se păstrează și ea în istoric.</p>
    <table className="hist"><tbody>
      <tr><th>Data</th><th>Elemente</th><th></th></tr>
      {list.map(h => <tr key={h.id}>
        <td>{new Date(h.at).toLocaleString('ro-RO')}</td><td>{h.count}</td>
        <td><button className="btn" onClick={() => store.restore(h.id).then(() => { close(); showToast('Am revenit la versiunea din ' + new Date(h.at).toLocaleString('ro-RO')); }).catch(() => showToast('Nu s-a putut reveni'))}>Revino</button></td>
      </tr>)}
    </tbody></table>
  </>;
}

function Routes({ RS, updRS, routeRes, copy }) {
  const r = routeRes;
  const [tab, setTab] = useState('circ');
  if (!r || r.err) return <p className="note">{r ? r.err : 'Se calculează…'}</p>;
  const bad = r.warn.filter(w => w.lvl !== 'info'), info = r.warn.filter(w => w.lvl === 'info');
  const tubes = g => [...new Set(g.edges.map(L => L.tube))].sort((a, b) => a - b).map(d => 'Ø' + d).join('/');
  let lastCat;
  return <>
    <div className="set"><span className="lbl">Traseu în șapă:</span>
      <button className={'chip hm' + (RS.mode === 'par' ? ' on' : '')} onClick={() => updRS({ mode: 'par' })}>paralel cu pereții (recomandat)</button>
      <button className={'chip hm' + (RS.mode === 'dia' ? ' on' : '')} onClick={() => updRS({ mode: 'dia' })}>cel mai scurt (diagonal)</button></div>
    <div className="set"><span className="lbl">Conductoare:</span>
      <button className={'chip hm' + (RS.cab !== 'cyy' ? ' on' : '')} onClick={() => updRS({ cab: 'fy' })}>FY în tub (recomandat)</button>
      <button className={'chip hm' + (RS.cab === 'cyy' ? ' on' : '')} onClick={() => updRS({ cab: 'cyy' })}>cablu CYY-F în tub</button></div>
    <div className="set"><span className="lbl">Max. prize pe circuit:</span>
      {[6, 8, 10].map(v => <button key={v} className={'chip hm' + (RS.max === v ? ' on' : '')} onClick={() => updRS({ max: v })}>{v}</button>)}</div>

    {bad.length > 0 && <div className="warnbox">{bad.map((w, i) => <div key={i}>⚠ {w.t}</div>)}</div>}
    {info.length > 0 && <details className="infobox"><summary>De verificat la execuție ({info.length})</summary>{info.map((w, i) => <div key={i}>· {w.t}</div>)}</details>}

    <div className="set tabs">
      {[['circ', `Circuite (${r.circ.length})`], ['tab', 'Tablou'], ['mat', 'Materiale']].map(([k, t]) =>
        <button key={k} className={'chip hm' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{t}</button>)}
    </div>

    {tab === 'circ' && <>
      <div className="scrollx"><table className="rt"><tbody>
        <tr><th></th><th>Circuit</th><th>Cablu</th><th>Lungime</th></tr>
        {r.groups.map((g, i) => <tr key={i}>
          <td><span className="tag" style={{ background: g.color }}></span>{g.id || ''}</td>
          <td><b>{g.name}</b><br /><span className="lbl wrap">{g.prot}
            {g.kind === 'data'
              ? <> · {g.edges.map(L => `#${L.b.n} ${L.net && L.tv ? 'net+TV' : L.net ? 'net' : 'TV'} Ø${L.tube}`).join(', ')}</>
              : <> · {g.kind === 'trav' ? `#${g.seq[0].n} ↔ #${g.seq[1].n}` : 'tablou → ' + g.seq.map(x => '#' + x.n).join(' → ')} · tub {tubes(g)}</>}
            {g.cross ? <> · <b>{g.cross} străpungere{g.cross > 1 ? 'i' : ''} de perete</b></> : null}
            {g.dU != null && <> · ΔU {fm(g.dU)}%{g.points ? ` · ${g.points} lumini` : ''}</>}</span></td>
          <td>{g.type}</td><td className="h">{fm(g.cable + (g.legLen || 0))} m</td></tr>)}
      </tbody></table></div>
      <p className="note">ΔU = căderea de tensiune de la contor la cel mai îndepărtat aparat, cu toată sarcina la capăt (max 3% la iluminat, 5% la prize – I7 5.2.5.1). Lungimea include coborârile în perete, rezerva din doze și, la iluminat, estimarea până la plafon.</p>
    </>}

    {tab === 'tab' && <>
      <div className="scrollx"><table className="rt"><tbody>
        <tr><th>Poz.</th><th>Aparat</th><th>Mod.</th><th>Circuite</th></tr>
        {r.board.rows.map((x, i) => <tr key={i} className={x.sub ? 'subrow' : ''}><td className="h">{x.pos}</td><td>{x.dev}</td><td>{x.mods}</td><td className="lbl wrap">{x.circ}</td></tr>)}
      </tbody></table></div>
      <p className="note">Ocupat: <b>{r.board.mods} module</b>; cu 20% rezervă îți trebuie {r.board.need} → cutie îngropată de <b>{r.board.encl} module</b>. Pe sub tablou intră {r.board.tubes} tuburi de forță (≈ {r.board.tubes * 3} cm lățime), iar cutia media de alături primește tuburile de internet și TV.
        Circuitele din dormitoare ({SLEEP.map(n => roomByN(n)?.name).join(', ')}) au AFDD, cerut din 2023 pentru spațiile de dormit.</p>
    </>}

    {tab === 'mat' && <>
      <div className="scrollx"><table className="rt"><tbody>
        <tr><th>Material</th><th>Cantitate</th></tr>
        {r.bom.flatMap((b, i) => {
          const out = [];
          if (b.cat !== lastCat) { out.push(<tr key={'c' + i} className="grp"><td colSpan={2}>{b.cat}</td></tr>); lastCat = b.cat; }
          out.push(<tr key={i}><td>{b.item}{b.note ? <span className="lbl wrap"> · {b.note}</span> : null}</td><td className="h">{b.unit === 'm' ? Math.ceil(b.qty) : b.qty} {b.unit}</td></tr>);
          return out;
        })}
      </tbody></table></div>
      <p className="note">Cantitățile sunt fără marjă: cumpără cablu și tub cu 10–15% în plus. Tub total ~{Math.round(r.tube)} m ({Object.entries(r.tubeM).map(([d, m]) => `Ø${d}: ${Math.round(m)} m`).join(', ')}).</p>
    </>}

    <div className="acts">
      <button className="btn" onClick={() => copy(routeText(r, RS))}>Copiază ca text</button>
      <button className="btn" onClick={() => download(bomCsv(r), 'materiale-instalatie.csv')}>Descarcă (Excel)</button>
    </div>

    <h4>Cum am calculat</h4>
    <ul className="rules">
      <li>Fiecare circuit pleacă din tablou, coboară în șapă și leagă dozele din doză în doză, în ordinea cu cel mai scurt cablu. Pe orizontală tuburile merg doar prin șapă, la cel puțin 20 cm de pereți și prin dreptul ușilor; în pereți doar vertical, drept sub aparat.</li>
      <li>Iluminatul e separat de prize (I7 5.4.1). Prizele din bucătărie (max 6 pe circuit), din băi și din dormitoare au circuite proprii, iar orice aparat de peste 2 kW are circuit separat (I7 5.4.7) – bifează „Circuit separat” și alege aparatul.</li>
      <li>Secțiuni minime: 1,5 mm² la iluminat, 2,5 mm² la prize (I7 anexa 5.32). Siguranța nu depășește curentul admisibil al conductorului; la plită ies 4–6 mm² și C32. Toate circuitele au diferențial de 30 mA (prize: I7 4.1.5.2.1; băi: I7 7.1.3.5), câte cel mult 6 pe un diferențial.</li>
      <li>Fiecare circuit are tubul lui (I7 5.2.12.1.5), ales ca secțiunea interioară să fie de cel puțin 3 ori cea a conductoarelor (I7 tabelul 5.7). Peste 15 m sau 3 curbe între doze cerem mai mult loc în tub. Tubul nu trece de Ø25, ca să rămână 25 mm de șapă deasupra.</li>
      <li>Internetul și TV-ul pleacă în stea dintr-o cutie media pusă lângă tablou, fiecare priză cu cablul ei, în tub separat (I7 5.2.8.1), ferit de tuburile de forță și încrucișat cu ele în unghi drept (EN 50174-2).</li>
      <li>Presupuneri: coloana contor–tablou de {COL.L} m × {COL.S} mm² consumă {fm(r.colDU)}% din căderea de tensiune; un circuit de prize are 2 kW, cel de bucătărie 3,5 kW, un punct de lumină 100 W. Corpurile de iluminat nu sunt desenate: am pus câte o lumină în mijlocul camerei pentru fiecare clapă.</li>
    </ul>
    <p className="note">Este un proiect preliminar, pentru planificare și deviz. Proiectul tehnic și execuția le face un electrician autorizat ANRE, conform normativului I7/2011.</p>
    <h4>Surse</h4>
    <div className="src">{SOURCES.map(([u, t]) => <div key={u}><a href={u} target="_blank" rel="noreferrer">{t}</a></div>)}</div>
  </>;
}
