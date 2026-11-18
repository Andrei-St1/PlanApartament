/* Scena 3D (three.js), folosită de componenta React <Plan3D>.
   Scena desenează apartamentul și elementele; deciziile (ce se întâmplă la o atingere) le ia aplicația. */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { H, CX, CZ, WALLS, ROOMS, SUB, CAT, ABBR, roomAt, isFree, partnersOf } from './geometry.js';

/* ce are fiecare modul al unei prize: 'pow' (230 V), 'tv', 'net' sau 'data' (TV și/sau internet în același modul) */
const modKind = (sub, i) => !sub.data ? 'pow' : sub.pow ? (i < sub.pow ? 'pow' : i === sub.pow ? 'tv' : 'net') : 'data';

const W = (x, y) => new THREE.Vector3(x - CX, 0, y - CZ);   // plan -> lume
export const EYE = 1.6;

function canvasTex(draw, w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const a = Array.isArray(r) ? r : [r, r, r, r]; const [tl, tr, br, bl] = [a[0] || 0, a[1] ?? a[0] ?? 0, a[2] ?? a[0] ?? 0, a[3] ?? a[1] ?? a[0] ?? 0];
    this.moveTo(x + tl, y); this.lineTo(x + w - tr, y); this.quadraticCurveTo(x + w, y, x + w, y + tr); this.lineTo(x + w, y + h - br);
    this.quadraticCurveTo(x + w, y + h, x + w - br, y + h); this.lineTo(x + bl, y + h); this.quadraticCurveTo(x, y + h, x, y + h - bl); this.lineTo(x, y + tl); this.quadraticCurveTo(x, y, x + tl, y); return this;
  };
}

export class PlanScene {
  /** @param {HTMLElement} stage  @param {{onTap:Function, onWalk:Function}} cb */
  constructor(stage, cb) {
    this.stage = stage; this.cb = cb;
    this.objs = new Map(); this.itemRefs = new Map();
    this.selected = null; this.showLabels = true;
    this.walk = false; this.WK = { x: 0, y: 0, yaw: 0, pitch: -0.08, jx: 0, jy: 0, keys: {} };
    this.tween = null; this.lastRoom = null; this.disposers = [];

    const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    stage.prepend(renderer.domElement);
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color('#f5f3ee');
    const camera = this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200);
    const controls = this.controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.12;
    controls.maxPolarAngle = Math.PI * 0.495; controls.minDistance = 0.05; controls.maxDistance = 40;
    controls.screenSpacePanning = true;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc8b8, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(6, 14, 9); scene.add(sun);
    const sun2 = new THREE.DirectionalLight(0xffffff, 0.5); sun2.position.set(-8, 6, -6); scene.add(sun2);

    this.buildApartment();
    this.makeMaterials();
    this.routeGroup = new THREE.Group(); scene.add(this.routeGroup);
    this.cyl = new THREE.CylinderGeometry(1, 1, 1, 6);
    this.bindInput();

    camera.position.set(7.5, 11.5, 11); controls.target.set(0, 0, 0.6);
    const resize = () => {
      const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(stage); resize();
    this.disposers.push(() => ro.disconnect());
    this.view3d(1);

    let lastT = performance.now();
    renderer.setAnimationLoop(() => {
      const now = performance.now(), dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      if (this.walk) { this.walkStep(dt); renderer.render(scene, camera); return; }
      const tw = this.tween;
      if (tw) {
        const k = Math.min(1, (now - tw.t0) / tw.ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        camera.position.lerpVectors(tw.p0, tw.p1, e); controls.target.lerpVectors(tw.t0v, tw.t1, e);
        camera.fov = tw.f0 + (tw.f1 - tw.f0) * e; camera.updateProjectionMatrix(); if (k >= 1) this.tween = null;
      }
      controls.update(); renderer.render(scene, camera);
    });
  }

  /* ---------- apartamentul ---------- */
  buildApartment() {
    const scene = this.scene;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: '#ebe8e1' }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.12; scene.add(ground);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(7.06, 0.12, 11.35), new THREE.MeshLambertMaterial({ color: '#bdb7aa' }));
    slab.position.copy(W(3.53, 5.675)); slab.position.y = -0.06; scene.add(slab);

    const wallMatSide = new THREE.MeshLambertMaterial({ color: '#f7f5f0' });
    const wallMatTop = new THREE.MeshLambertMaterial({ color: '#3b4048' });
    const edgeMat = new THREE.LineBasicMaterial({ color: '#9a958a' });
    const glassMat = new THREE.MeshLambertMaterial({ color: '#9cc7e0', transparent: true, opacity: 0.35, depthWrite: false });
    const wallMeshes = this.wallMeshes = [];
    const addBox = (x0, x1, y0, y1, z0, z1) => {
      if (x1 - x0 < 1e-3 || y1 - y0 < 1e-3 || z1 - z0 < 1e-3) return;
      const geo = new THREE.BoxGeometry(x1 - x0, z1 - z0, y1 - y0);
      const m = new THREE.Mesh(geo, [wallMatSide, wallMatSide, wallMatTop, wallMatSide, wallMatSide, wallMatSide]);
      const c = W((x0 + x1) / 2, (y0 + y1) / 2); m.position.set(c.x, (z0 + z1) / 2, c.z);
      scene.add(m); wallMeshes.push(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat); e.position.copy(m.position); e.raycast = () => { }; scene.add(e);
    };
    for (const w of WALLS) {
      const alongX = (w.x1 - w.x0) >= (w.y1 - w.y0);
      const s = alongX ? w.x0 : w.y0, e = alongX ? w.x1 : w.y1;
      const seg = (a, b, z0, z1) => alongX ? addBox(a, b, w.y0, w.y1, z0, z1) : addBox(w.x0, w.x1, a, b, z0, z1);
      let cur = s;
      for (const o of [...w.op].sort((p, q) => p.a - q.a)) {
        seg(cur, o.a, 0, H); if (o.lo > 0) seg(o.a, o.b, 0, o.lo); seg(o.a, o.b, o.hi, H); cur = o.b;
        if (o.win) {
          const t = 0.02, g = alongX ? new THREE.BoxGeometry(o.b - o.a, o.hi - o.lo, t) : new THREE.BoxGeometry(t, o.hi - o.lo, o.b - o.a);
          const gm = new THREE.Mesh(g, glassMat); const c = alongX ? W((o.a + o.b) / 2, (w.y0 + w.y1) / 2) : W((w.x0 + w.x1) / 2, (o.a + o.b) / 2);
          gm.position.set(c.x, (o.lo + o.hi) / 2, c.z); gm.raycast = () => { }; scene.add(gm);
        }
        if (w.entry) {
          const d = new THREE.Mesh(new THREE.BoxGeometry(0.05, o.hi, o.b - o.a), new THREE.MeshLambertMaterial({ color: '#7a5a3e' }));
          const c = W(6.93, (o.a + o.b) / 2); d.position.set(c.x, o.hi / 2, c.z); scene.add(d); wallMeshes.push(d);
        }
      }
      seg(cur, e, 0, H);
    }
    // balcon
    const sl = new THREE.Mesh(new THREE.BoxGeometry(3.70, 0.12, 1.40), new THREE.MeshLambertMaterial({ color: '#c9c5bc' }));
    const bc = W(2.09, -0.70); sl.position.set(bc.x, -0.06, bc.z); scene.add(sl);
    const rm = new THREE.MeshLambertMaterial({ color: '#8d8a84', transparent: true, opacity: 0.75 });
    const rail = (x0, x1, y0, y1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 1.0, y1 - y0), rm); const c = W((x0 + x1) / 2, (y0 + y1) / 2); m.position.set(c.x, 0.5, c.z); scene.add(m); };
    rail(0.24, 3.94, -1.40, -1.34); rail(0.24, 0.30, -1.34, 0); rail(3.88, 3.94, -1.34, 0);
    // pardoseli + etichete camere
    for (const r of ROOMS) {
      for (const [x0, x1, y0, y1] of r.r) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), new THREE.MeshLambertMaterial({ color: r.c }));
        m.rotation.x = -Math.PI / 2; const c = W((x0 + x1) / 2, (y0 + y1) / 2); m.position.set(c.x, 0.002, c.z); m.raycast = () => { }; scene.add(m);
      }
      const [x0, x1, y0, y1] = r.r[0]; const lp = r.lab || [(x0 + x1) / 2, (y0 + y1) / 2];
      const small = r.a < 2.5; const lw = small ? 1.3 : 2.8, lh = lw * 0.42;
      const tex = canvasTex((g, w, h) => {
        g.textAlign = 'center'; g.fillStyle = '#3a3530';
        g.beginPath(); g.arc(w / 2, h * 0.30, h * 0.2, 0, 7); g.lineWidth = 5; g.strokeStyle = '#3a3530'; g.stroke();
        g.font = `700 ${h * 0.22}px sans-serif`; g.textBaseline = 'middle'; g.fillText(r.n, w / 2, h * 0.31);
        g.font = `600 ${h * 0.17}px sans-serif`; g.fillText(r.name, w / 2, h * 0.66);
        g.font = `${h * 0.14}px sans-serif`; g.fillStyle = '#6b645b'; g.fillText(r.a.toFixed(1).replace('.', ',') + ' m²', w / 2, h * 0.86);
      }, 512, 215);
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      lab.rotation.x = -Math.PI / 2; const c = W(lp[0], lp[1]); lab.position.set(c.x, 0.006, c.z); lab.raycast = () => { }; scene.add(lab);
    }
  }

  makeMaterials() {
    const M = c => new THREE.MeshLambertMaterial({ color: c });
    const SM = (c, r = 0.45) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.1 });
    this.mat = {
      plate: SM('#141414', 0.35), ring: SM('#262626', 0.4), hole: M('#000000'), rock: SM('#1e1e1e', 0.3), mark: M('#d8d8d8'), sel: M('#f2b705'),
      door: SM('#2a2c30', 0.3), win: SM('#5c6f80', 0.15),
      cat: { socket: M(CAT.socket.c), switch: M(CAT.switch.c), text: M(CAT.text.c), panel: M(CAT.panel.c) },
    };
  }

  /* ---------- elemente ---------- */
  labelTexture(it) {
    const sub = SUB[it.sub], cat = CAT[sub.cat];
    const lines = [`#${it.n}  ${ABBR(sub.name)}`, `h = ${Math.round(it.h * 100)} cm`];
    const pr = this.partners && this.partners.get(it.id);
    if (pr) lines.push('cuplat cu ' + pr.map(p => '#' + p.n).join(', '));
    if (it.text) lines.push(it.text);
    const font = i => (i === 1 ? '700 58px ' : i === 0 ? '700 54px ' : 'italic 600 58px ') + 'sans-serif';
    const mc = document.createElement('canvas').getContext('2d'); let tw = 0;
    lines.forEach((l, i) => { mc.font = font(i); tw = Math.max(tw, mc.measureText(l).width); });
    const lh = 72, PADL = 44, PADR = 22, W_ = Math.ceil(Math.min(1400, tw) + PADL + PADR), H_ = 18 + lines.length * lh;
    const tex = canvasTex((g, w, h) => {
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.strokeStyle = cat.c; g.lineWidth = 6;
      const r = 18; g.beginPath(); g.roundRect(3, 3, w - 6, h - 6, r); g.fill(); g.stroke();
      g.fillStyle = cat.c; g.beginPath(); g.roundRect(3, 3, 20, h - 6, [r, 0, 0, r]); g.fill();
      g.textBaseline = 'middle'; g.textAlign = 'left';
      lines.forEach((l, i) => {
        g.font = font(i); g.fillStyle = i === 1 ? '#111' : (i === 0 ? '#333' : cat.c);
        let t = l; while (g.measureText(t).width > w - PADL - PADR && t.length > 3) t = t.slice(0, -2);
        if (t !== l) t = t.slice(0, -1) + '…';
        g.fillText(t, PADL, 9 + lh * i + lh / 2);
      });
    }, W_, H_);
    const K = 0.00125; return { tex, w: W_ * K, h: H_ * K };
  }

  build(it) {
    this.remove3d(it.id);
    const sub = SUB[it.sub]; if (!sub) return;
    const cat = sub.cat, sel = (this.selected === it.id), mat = this.mat;
    const n = new THREE.Vector3(it.nx, 0, it.nz).normalize();
    const g = new THREE.Group(); const pick = [];
    const pos = new THREE.Vector3(it.x, it.h, it.z);
    g.position.copy(pos).addScaledVector(n, 0.001);
    g.lookAt(g.position.clone().add(n));
    const S = cat === 'panel' ? 1 : 1.8, body = new THREE.Group(); body.scale.setScalar(S); g.add(body);
    let bh = 0.04;
    if (cat === 'panel') {
      const bw = 0.32, bhh = 0.42; bh = bhh / 2;
      if (sel) { const fr = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.05, bhh + 0.05, 0.006), mat.sel); fr.position.z = 0.003; body.add(fr); pick.push(fr); }
      const box = new THREE.Mesh(new THREE.BoxGeometry(bw, bhh, 0.03), mat.plate); box.position.z = 0.015; body.add(box); pick.push(box);
      const door = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.03, bhh - 0.03, 0.004), mat.door); door.position.z = 0.032; body.add(door);
      const win = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.08, 0.07, 0.003), mat.win); win.position.set(0, 0.06, 0.035); body.add(win);
      const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.004), mat.cat.panel); bolt.position.set(0, 0.06, 0.037); body.add(bolt);
      const lk = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.006), mat.mark); lk.position.set(bw / 2 - 0.035, -0.05, 0.036); body.add(lk);
    } else if (cat === 'text') {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 24), sel ? mat.sel : mat.cat.text); s.rotation.x = Math.PI / 2; s.position.z = 0.004; body.add(s); pick.push(s); bh = 0.02;
    } else {
      const mw = 0.071, w = mw * sub.mods + 0.012, h = 0.083; bh = h / 2;
      if (sel) { const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, h + 0.03, 0.006), mat.sel); fr.position.z = 0.003; body.add(fr); pick.push(fr); }
      const pl = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.014), mat.plate); pl.position.z = 0.008; body.add(pl); pick.push(pl);
      for (let i = 0; i < sub.mods; i++) {
        const cx = -mw * (sub.mods - 1) / 2 + i * mw;
        if (cat === 'socket') {
          const mk = modKind(sub, i);
          if (mk !== 'pow') {
            const net = mk === 'net' || (mk === 'data' && sub.net), tv = mk === 'tv' || (mk === 'data' && sub.tv), both = net && tv;
            if (net) {
              const q = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.018, 0.004), mat.hole); q.position.set(cx - (both ? 0.013 : 0), 0, 0.0155); body.add(q);
              const tab = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.004, 0.002), mat.mark); tab.position.set(cx - (both ? 0.013 : 0), 0.006, 0.0175); body.add(tab);
            }
            if (tv) {
              const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.004, 16), mat.hole); c2.rotation.x = Math.PI / 2; c2.position.set(cx + (both ? 0.016 : 0), 0, 0.0155); body.add(c2);
              const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.003, 8), mat.mark); pin.rotation.x = Math.PI / 2; pin.position.set(cx + (both ? 0.016 : 0), 0, 0.0175); body.add(pin);
            }
          } else {
            const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.004, 32), mat.ring); ring.rotation.x = Math.PI / 2; ring.position.set(cx, 0, 0.0155); body.add(ring);
            for (const dx of [-0.0095, 0.0095]) { const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.004, 12), mat.hole); hl.rotation.x = Math.PI / 2; hl.position.set(cx + dx, 0, 0.0175); body.add(hl); }
          }
        } else {
          const rc = sub.rock;
          for (let j = 0; j < rc; j++) {
            const rw = 0.052 / rc - 0.002; const r = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.056, 0.006), mat.rock); r.position.set(cx - 0.026 + rw / 2 + 0.001 + j * (rw + 0.002), 0, 0.017); body.add(r);
            const dot = new THREE.Mesh(new THREE.BoxGeometry(rw * 0.4, 0.004, 0.002), (sub.cap || sub.cross) ? mat.cat.switch : mat.mark); dot.position.set(r.position.x, 0.02, 0.0205); body.add(dot);
          }
        }
      }
    }
    if (cat !== 'panel') bh *= S;
    // etichetă lipită de perete (deasupra elementului; dedesubt dacă nu încape)
    const { tex, w: lw, h: lh } = this.labelTexture(it);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), new THREE.MeshBasicMaterial({ map: tex, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    let oy = bh + 0.03 + lh / 2; if (it.h + oy + lh / 2 > H - 0.01) oy = -(bh + 0.03 + lh / 2);
    lab.position.set(0, oy, 0.003); lab.visible = this.showLabels || sel; g.add(lab); if (lab.visible) pick.push(lab);
    pick.forEach(p => { p.userData.id = it.id; });
    this.scene.add(g);
    // linie de cotă (de la pardoseală)
    const lp = pos.clone().addScaledVector(n, 0.012);
    const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(lp.x, 0.004, lp.z), new THREE.Vector3(lp.x, Math.max(0.004, it.h - bh), lp.z)]);
    const line = new THREE.Line(lg, new THREE.LineDashedMaterial({ color: CAT[cat].c, dashSize: 0.04, gapSize: 0.03 }));
    line.computeLineDistances(); line.raycast = () => { }; this.scene.add(line);
    const t = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0)).multiplyScalar(0.06);
    const tick = new THREE.Line(new THREE.BufferGeometry().setFromPoints([lp.clone().setY(0.004).sub(t), lp.clone().setY(0.004).add(t)]), new THREE.LineBasicMaterial({ color: CAT[cat].c }));
    tick.raycast = () => { }; this.scene.add(tick);
    this.objs.set(it.id, { g, pick, lab, line, tick });
  }

  remove3d(id) {
    const o = this.objs.get(id); if (!o) return;
    for (const x of [o.g, o.line, o.tick]) {
      this.scene.remove(x);
      x.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material && !Array.isArray(c.material) && !Object.values(this.mat).includes(c.material) && !Object.values(this.mat.cat).includes(c.material)) {
          if (c.material.map) c.material.map.dispose();
          c.material.dispose();
        }
      });
    }
    this.objs.delete(id);
  }

  /** Sincronizează scena cu lista de elemente (obiectele noi sau schimbate se redesenează). */
  setItems(items) {
    const seen = new Set();
    this.partners = partnersOf(items);
    if (!this.linkSig) this.linkSig = new Map();
    for (const it of items) {
      seen.add(it.id);
      const sig = (this.partners.get(it.id) || []).map(p => p.n).join(',');   // eticheta se schimbă și când se cuplează altcineva cu el
      if (this.itemRefs.get(it.id) !== it || this.linkSig.get(it.id) !== sig) { this.itemRefs.set(it.id, it); this.linkSig.set(it.id, sig); this.build(it); }
    }
    for (const id of [...this.linkSig.keys()]) if (!seen.has(id)) this.linkSig.delete(id);
    for (const id of [...this.itemRefs.keys()]) if (!seen.has(id)) { this.itemRefs.delete(id); this.remove3d(id); }
  }
  setSelected(id) {
    const prev = this.selected; if (prev === id) return; this.selected = id;
    for (const k of [prev, id]) { const it = k && this.itemRefs.get(k); if (it) this.build(it); }
  }
  setShowLabels(v) {
    if (this.showLabels === v) return; this.showLabels = v;
    for (const it of this.itemRefs.values()) this.build(it);
  }

  /* ---------- vederi ---------- */
  flyTo(pos, target, fov = 50, ms = 650) {
    this.tween = { t0: performance.now(), ms, p0: this.camera.position.clone(), t0v: this.controls.target.clone(), p1: pos.clone(), t1: target.clone(), f0: this.camera.fov, f1: fov };
  }
  view3d(ms) { this.exitWalk(); const k = this.camera.aspect < 0.8 ? 1.45 : 1; this.flyTo(new THREE.Vector3(7.5 * k, 11.5 * k, 11 * k), new THREE.Vector3(0, 0, 0.6), 50, ms); }
  viewTop() { this.exitWalk(); this.flyTo(new THREE.Vector3(0, 17.5, 0.02), new THREE.Vector3(0, 0, 0), 50); }
  applyWalkCam() { const v = W(this.WK.x, this.WK.y); this.camera.position.set(v.x, EYE, v.z); this.camera.rotation.set(this.WK.pitch, this.WK.yaw, 0, 'YXZ'); }
  walkTo(x, y, yaw, pitch = -0.08) {
    const WK = this.WK;
    this.walk = true; this.tween = null; this.controls.enabled = false; WK.x = x; WK.y = y; WK.yaw = yaw; WK.pitch = pitch;
    this.camera.fov = 72; this.camera.updateProjectionMatrix(); this.applyWalkCam();
    this.lastRoom = undefined; this.syncRoom();
  }
  exitWalk() {
    if (!this.walk) return;
    this.walk = false; this.controls.enabled = true;
    const f = new THREE.Vector3(); this.camera.getWorldDirection(f); this.controls.target.copy(this.camera.position).addScaledVector(f, 2);
    this.WK.jx = this.WK.jy = 0; this.lastRoom = null;
    this.cb.onWalk(false, null);
  }
  syncRoom() {
    const r = roomAt(this.WK.x, this.WK.y); const n = r ? r.n : null;
    if (n !== this.lastRoom) { this.lastRoom = n; this.cb.onWalk(true, n); }
  }
  viewRoom(n) {
    const r = ROOMS.find(r => r.n == n); if (!r) return;
    const [x0, x1, y0, y1] = r.r[0]; const lp = r.lab || [(x0 + x1) / 2, (y0 + y1) / 2];
    let x = lp[0], y = Math.min(y1 - 0.45, lp[1] + Math.max(0, (y1 - y0) / 2 - 0.6));
    if (!isFree(x, y)) { x = lp[0]; y = lp[1]; }
    this.walkTo(x, y, 0);
  }
  focusItem(it) {
    const wx = it.x + CX, wy = it.z + CZ; let d = 1.4, x, y;
    for (; d > 0.3; d -= 0.1) { x = wx + it.nx * d; y = wy + it.nz * d; if (isFree(x, y)) break; }
    this.walkTo(x, y, Math.atan2(it.nx, it.nz), Math.atan2(it.h - EYE, d));
  }
  setJoy(x, y) { this.WK.jx = x; this.WK.jy = y; }
  walkStep(dt) {
    const WK = this.WK, k = WK.keys;
    let f = -WK.jy, s = WK.jx;
    if (k.w || k.arrowup) f += 1; if (k.s || k.arrowdown) f -= 1; if (k.a || k.arrowleft) s -= 1; if (k.d || k.arrowright) s += 1;
    if (!f && !s) return;
    const sp = 1.5 * dt, sy = Math.sin(WK.yaw), cy = Math.cos(WK.yaw);
    const dx = (-sy * f + cy * s) * sp, dy = (-cy * f - sy * s) * sp;
    if (isFree(WK.x + dx, WK.y)) WK.x += dx; if (isFree(WK.x, WK.y + dy)) WK.y += dy;
    this.applyWalkCam(); this.syncRoom();
  }

  /* ---------- intrări: tastatură, privit în jur, atingeri ---------- */
  bindInput() {
    const el = this.renderer.domElement, WK = this.WK;
    const on = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); this.disposers.push(() => t.removeEventListener(ev, fn, opt)); };
    on(window, 'keydown', e => { const tg = e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return; WK.keys[e.key.toLowerCase()] = true; });
    on(window, 'keyup', e => { WK.keys[e.key.toLowerCase()] = false; });
    on(window, 'blur', () => { WK.keys = {}; });
    const pts = new Map(); let down = null;
    on(el, 'pointerdown', e => {
      if (e.isPrimary) down = { x: e.clientX, y: e.clientY, t: performance.now() };
      this.tween = null;
      if (this.walk) { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); el.setPointerCapture(e.pointerId); }
    });
    on(el, 'pointermove', e => {
      if (!this.walk || !pts.has(e.pointerId)) return; const p = pts.get(e.pointerId);
      const k = 1.9 / el.clientHeight; WK.yaw += (e.clientX - p.x) * k * 1.2; WK.pitch = Math.max(-1.3, Math.min(1.3, WK.pitch + (e.clientY - p.y) * k));
      p.x = e.clientX; p.y = e.clientY; this.applyWalkCam();
    });
    const up = e => pts.delete(e.pointerId);
    on(el, 'pointercancel', up);
    on(el, 'pointerup', e => {
      up(e);
      if (!down || !e.isPrimary) return;
      const d = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
      if (d < 8 && dt < 600) this.tap(e);
    });
  }
  tap(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
    const picks = []; this.objs.forEach(o => picks.push(...o.pick));
    const hitEl = ray.intersectObjects(picks, false)[0];
    const hitW = ray.intersectObjects(this.wallMeshes, false)[0];
    const itemId = hitEl && (!hitW || hitEl.distance <= hitW.distance + 0.02) ? hitEl.object.userData.id : null;
    let wall = null;
    if (hitW) {
      const nrm = hitW.face.normal.clone(); // pereții nu sunt rotiți
      const p = hitW.point;
      const room = roomAt(p.x + CX + nrm.x * 0.1, p.z + CZ + nrm.z * 0.1);
      wall = { horizontal: Math.abs(nrm.y) > 0.5, x: p.x, y: p.y, z: p.z, nx: nrm.x, nz: nrm.z, room: room ? room.n : null };
    }
    this.cb.onTap({ itemId, wall, walk: this.walk });
  }

  /* ---------- trasee ---------- */
  drawRoutes(res) {
    const grp = this.routeGroup;
    grp.children.forEach(c => c.material && c.material.dispose());
    grp.clear();
    if (!res || res.err) return;
    const up = new THREE.Vector3(0, 1, 0), FY = 0.016;
    const seg3 = (a, b, mat, r = 0.013) => {
      const d = new THREE.Vector3().subVectors(b, a), L = d.length(); if (L < 1e-4) return;
      const m = new THREE.Mesh(this.cyl, mat); m.scale.set(r, L, r); m.position.copy(a).addScaledVector(d, 0.5);
      m.quaternion.setFromUnitVectors(up, d.normalize()); m.raycast = () => { }; grp.add(m);
    };
    res.groups.forEach((g, gi) => {
      const mat = new THREE.MeshBasicMaterial({ color: g.color }); const off = ((gi % 7) - 3) * 0.022;
      const F = (x, y, o = true) => { const v = W(x + (o ? off : 0), y + (o ? off : 0)); v.y = FY; return v; };
      const riser = (it, top) => { const n = new THREE.Vector3(it.nx, 0, it.nz); const b = new THREE.Vector3(it.x, FY, it.z).addScaledVector(n, 0.02); seg3(b, b.clone().setY(top), mat, 0.011); };
      for (const e of g.edges) {
        const P = [F(e.pa.wx, e.pa.wy, false).addScaledVector(new THREE.Vector3(e.a.nx, 0, e.a.nz), 0.02)];
        if (e.pts.length) e.pts.forEach(p => P.push(F(p[0], p[1]))); else P.push(F(e.pa.cx, e.pa.cy));
        P.push(F(e.pb.wx, e.pb.wy, false).addScaledVector(new THREE.Vector3(e.b.nx, 0, e.b.nz), 0.02));
        for (let i = 1; i < P.length; i++) seg3(P[i - 1], P[i], mat);
        riser(e.a, SUB[e.a.sub].cat === 'panel' ? e.a.h - 0.21 : e.a.h - 0.07);
        riser(e.b, e.b.h - 0.07);
      }
    });
  }

  screenshot() { this.renderer.render(this.scene, this.camera); return this.renderer.domElement.toDataURL('image/png'); }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.disposers.forEach(f => f());
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
