import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { PlanScene } from './plan/scene.js';
import { H, ROOMS, SUB, CAT, ABBR, hasPower, roomLabel, roomByN, sortedByRoom, countByCat, listText } from './plan/geometry.js';
import { computeRoutes, routeText, fm } from './plan/routes.js';
import { createStore } from './store.js';

const store = createStore();
const newId = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const ls = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* fără stocare locală */ } },
};
const SOURCES = [
  ['https://economisi.ro/energie/solutii-casa/schema-tablou-electric-monofazat', 'Schema tablou electric – cerințele I7-2011 (economisi.ro)'],
  ['https://newsweek.ro/tehnologie/ce-tip-de-cablu-e-cel-mai-potrivit-pentru-instalatia-electrica-de-acasa', 'Ce cablu pentru instalația de acasă – I7 despre tuburi (Newsweek România)'],
  ['https://primariabuzau.ro/wp-content/uploads/2020/09/Memoriu-instalatii-electrice-1.pdf', 'Memoriu tehnic instalații electrice conform I7/2011 (Primăria Buzău)'],
  ['https://lunca-muresului.ro/download/itymDw2FXhQFTroxvmlplVT2eg9mPegs8tLVtMQv.pdf', 'Caiet de sarcini – tablouri în holul de intrare (lunca-muresului.ro)'],
  ['https://www.elektro-wandelt.de/ratgeber/Elektro-Installationszonen-im-Fussboden/', 'Zone de instalare în pardoseală, DIN 18015-3 (elektro-wandelt.de)'],
  ['https://www.sanier.de/elektroinstallation/elektroinstallation-auf-dem-rohfussboden', 'Cabluri pe placă și în șapă, în tuburi (sanier.de)'],
  ['https://re-energy.ro/calculator-sectiune-cablu/', 'Secțiune cablu și gruparea circuitelor în tub (re-energy.ro)'],
];

export default function App() {
  const plan = useSyncExternalStore(store.subscribe, store.getState);
  const status = useSyncExternalStore(store.subscribe, store.getStatus);
  const online = useSyncExternalStore(store.subscribe, store.getOnline);
  const items = plan.items;

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
  const [RS, setRS] = useState(() => ({ mode: 'par', max: 8, ...ls.get('plan-rs', {}), on: false }));
  const [routeRes, setRouteRes] = useState(null);

  const hintT = useRef(), toastT = useRef();
  const showHint = t => { setHint({ t, on: true }); clearTimeout(hintT.current); hintT.current = setTimeout(() => setHint(h => ({ ...h, on: false })), 3200); };
  const showToast = (msg, btn, fn) => { setToast({ msg, btn, fn }); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(null), 4500); };
  useEffect(() => { hintT.current = setTimeout(() => setHint(h => ({ ...h, on: false })), 4000); }, []);

  const sel = items.find(i => i.id === selected) || null;
  const select = id => { setSelected(id); if (!id) setMoving(null); };

  /* ultima stare, pentru apelurile venite din scena 3D */
  const L = useRef();
  L.current = { mode, curSub, hmode, moving, items };

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
  const updRS = patch => setRS(r => { const n = { ...r, ...patch }; ls.set('plan-rs', { mode: n.mode, max: n.max }); return n; });
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
  function del() {
    if (!sel) return; const it = sel;
    store.remove(it.id); select(null);
    showToast('#' + it.n + ' șters', 'Anulează', () => store.upsert(it));
  }

  /* ---------- copiere ---------- */
  function copy(txt) {
    navigator.clipboard.writeText(txt).then(() => showToast('Copiat în clipboard')).catch(() => setModal({ kind: 'copy', txt }));
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
      </div>

      <div id="stage" ref={stageRef}>
        {bootErr && <div id="boot"><div><b>Planul nu s-a putut porni.</b><br />{bootErr}</div></div>}
        <div id="hint" style={{ opacity: hint.on ? 1 : 0 }}>{hint.t}</div>
        <div id="legend">
          <div><i style={{ background: CAT.socket.c }}></i><b>Prize</b> {cnt.socket}</div>
          <div><i style={{ background: CAT.switch.c }}></i><b>Întrerupătoare</b> {cnt.switch}</div>
          <div><i style={{ background: CAT.text.c }}></i><b>Note</b> {cnt.text}</div>
          <div><i style={{ background: CAT.panel.c }}></i><b>Tablou</b> {cnt.panel ? 'da' : '–'}</div>
        </div>
        {walk && <Joystick scene={sceneRef} />}
        {RS.on && routeRes && (
          <div id="rcard">
            {routeRes.err ? <span>{routeRes.err}</span> : <>
              <span className="sw">{routeRes.groups.map((g, i) => <i key={i} style={{ background: g.color }}></i>)}</span>
              <span>{routeRes.groups.length} circuite · ~{Math.round(Object.values(routeRes.tot).reduce((a, b) => a + b, 0))} m cablu</span>
              <button className="btn" style={{ padding: '4px 9px' }} onClick={() => setModal({ kind: 'routes' })}>Detalii</button>
            </>}
          </div>
        )}
        {sel && <Sheet it={sel} moving={moving === sel.id} update={update} setH={setH}
          onMove={() => { setMoving(sel.id); showHint('Atinge noul loc pe perete (înălțimea rămâne aceeași)'); }}
          onDup={dup} onDel={del} onDone={() => select(null)} />}
      </div>

      <div id="tools">
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
      </div>

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
      <span>mergi</span><div id="knob" ref={knob}></div>
    </div>
  );
}

/* ---------- foaia de editare a unui element ---------- */
function Sheet({ it, moving, update, setH, onMove, onDup, onDel, onDone }) {
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
      {hasPower(s) && (
        <label className="chk"><input type="checkbox" checked={!!it.ded} onChange={e => update({ ded: e.target.checked })} />
          <span>Circuit separat – aparat peste 2 kW (cuptor, plită, mașină de spălat, boiler, AC)</span></label>
      )}
      <div className="acts">
        <button className={'btn' + (moving ? ' on' : '')} onClick={onMove}>↔ Mută</button>
        {s.cat !== 'panel' && <button className="btn" onClick={onDup}>⧉ Copiază</button>}
        <button className="btn dang" onClick={onDel}>Șterge</button>
        <button className="btn on" onClick={onDone}>Gata</button>
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
      const rows = []; let last;
      for (const it of sortedByRoom(items)) {
        if (it.room !== last) { const r = roomByN(it.room); rows.push(<tr key={'g' + it.room} className="grp"><td colSpan={4}>{r ? roomLabel(r) : 'Fără cameră'}</td></tr>); last = it.room; }
        rows.push(<tr key={it.id} className="click" onClick={() => { close(); select(it.id); sceneRef.current?.focusItem(it); }}>
          <td>{it.n}</td><td><span className="tag" style={{ background: CAT[SUB[it.sub].cat].c }}></span>{SUB[it.sub].name}</td><td className="h">{Math.round(it.h * 100)} cm</td><td>{it.text}</td></tr>);
      }
      body = <>
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
    title = 'Trasee cabluri prin șapă';
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
  if (!r || r.err) return <p className="note">{r ? r.err : 'Se calculează…'}</p>;
  return <>
    <div className="set"><span className="lbl">Traseu în șapă:</span>
      <button className={'chip hm' + (RS.mode === 'par' ? ' on' : '')} onClick={() => updRS({ mode: 'par' })}>paralel cu pereții (recomandat)</button>
      <button className={'chip hm' + (RS.mode === 'dia' ? ' on' : '')} onClick={() => updRS({ mode: 'dia' })}>cel mai scurt (diagonal)</button></div>
    <div className="set"><span className="lbl">Max. prize pe circuit:</span>
      {[6, 8, 10].map(v => <button key={v} className={'chip hm' + (RS.max === v ? ' on' : '')} onClick={() => updRS({ max: v })}>{v}</button>)}</div>
    <table><tbody>
      <tr><th></th><th>Circuit</th><th>Cablu</th><th>Lungime</th></tr>
      {r.groups.map((g, i) => <tr key={i}>
        <td><span className="tag" style={{ background: g.color }}></span>C{i + 1}</td>
        <td><b>{g.name}</b><br /><span className="lbl">{g.prot} · tablou → {g.seq.map(x => '#' + x.n).join(' → ')}{g.cross ? <> · <b>{g.cross} străpungere{g.cross > 1 ? 'i' : ''} de perete</b></> : null}</span></td>
        <td>{g.type}</td><td className="h">{fm(g.cable)} m</td></tr>)}
    </tbody></table>
    <h4>Total materiale (cu ~30 cm rezervă în fiecare doză)</h4>
    <table><tbody>
      {Object.entries(r.tot).map(([k, v]) => <tr key={k}><td>{k}</td><td className="h">~{Math.round(v)} m</td></tr>)}
      <tr><td>Tub flexibil de protecție în șapă și pereți</td><td className="h">~{Math.round(r.tube)} m</td></tr>
    </tbody></table>
    <p className="note">Cumpără cu 10–15% în plus. Lungimile includ coborârea din doză până în șapă (înălțimea + ~5 cm), traseul prin șapă și urcarea în perete până la fiecare doză. Cablurile de la întrerupătoare până la becuri nu sunt incluse.</p>
    <div className="acts"><button className="btn" onClick={() => copy(routeText(r, RS))}>Copiază ca text pentru electrician</button></div>
    <h4>Cum am calculat</h4>
    <ul className="rules">
      <li>Fiecare circuit pleacă din tablou, coboară în șapă și leagă dozele în buclă (din doză în doză), în ordinea care dă cel mai scurt cablu.</li>
      <li>Iluminatul e separat de prize, iar orice aparat de peste 2 kW are circuit propriu (bifează „Circuit separat” la priza respectivă). Prizele din baie și din bucătărie au circuite separate de restul.</li>
      <li>Prizele au cablu de minimum 2,5 mm² cu siguranță de 16 A și diferențial de 30 mA. Iluminatul are minimum 1,5 mm² și 10 A. La plită sau cuptor mare, secțiunea (4–6 mm²) o stabilește electricianul după putere.</li>
      <li>În șapă, cablurile merg numai în tub de protecție, cu toate firele unui circuit (inclusiv împământarea) în același tub. În modul recomandat, traseele merg paralel cu pereții, la aproximativ 20 cm de ei, și trec dintr-o cameră în alta prin dreptul ușilor. Străpungerea unui perete interior e permisă doar când ocolul ar fi mult mai lung. Pereții exteriori și ghenele nu se străpung.</li>
      <li>Prizele de internet primesc fiecare cablu UTP propriu, iar cele de TV cablu coaxial propriu, direct de la tablou (sau de la un rack media pus lângă el), separat de cablurile de 230 V. Priza TV/internet primește ambele cabluri.</li>
      <li>Mai multe circuite în același tub se încălzesc mai tare, deci e de preferat câte un tub pe circuit.</li>
    </ul>
    <p className="note">Este un calcul orientativ pentru planificare și deviz. Proiectul și execuția trebuie făcute de un electrician autorizat ANRE, conform normativului I7/2011.</p>
    <h4>Surse</h4>
    <div className="src">{SOURCES.map(([u, t]) => <div key={u}><a href={u} target="_blank" rel="noreferrer">{t}</a></div>)}</div>
  </>;
}
