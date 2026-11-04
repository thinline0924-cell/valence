// 3D 表示:盤・原子のコマ・物質の姿・演出
import * as THREE from 'three';
import { CELLS, SPECIAL, parseKey, RADIUS } from './board.js';
import { ELEMENTS, SUBSTANCES } from './chem.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const HS = 0.72;
const FLOOR = 0.07;
export const hexPos = key => { const [q, r] = parseKey(key); return V(HS * Math.sqrt(3) * (q + r / 2), 0, HS * 1.5 * r); };

const P = {
  nuke: 0x8fd0ff,
  slate: 0x2f3a44, table: 0x28313a, base: 0x55616b, cell: 0x3d4954, cream: 0xefe6d3, heat: 0xf08a3c, light: 0xf2df8a,
  warmSlate: 0x3f3634, warmTable: 0x33292a, warmCell: 0x4d4140,
};

const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeIn = t => t * t;
const easeOut = t => 1 - (1 - t) * (1 - t);
const backOut = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

export class View {
  constructor(canvas, labelRoot) {
    this.canvas = canvas;
    this.labelRoot = labelRoot;
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.bg = new THREE.Color(P.slate);
    this.scene.background = this.bg;
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    this.target = V(0, 0.3, 0);
    this.az = THREE.MathUtils.degToRad(0); this.azGoal = this.az;
    this.pol = THREE.MathUtils.degToRad(42);
    this.shake = 0;
    this.warm = 0; this.warmGoal = 0;
    this.ents = new Map();   // id → { obj, key, kind }
    this.bars = new Map();   // 'a-b' → mesh
    this.tweens = [];
    this.showNames = false;
    this.onTap = () => {};
    this.hover = null;

    this.grad = (() => { const d = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
      const t = new THREE.DataTexture(d, 3, 1); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();

    this.buildWorld();
    this.buildShared();
    this.bindInput();
    addEventListener('resize', () => this.resize());
    this.resize();
  }

  toon(c, o = {}) { return new THREE.MeshToonMaterial({ color: c, gradientMap: this.grad, ...o }); }
  line(c, op) { return new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: op }); }

  /* ---------- 盤・卓・ケース ---------- */
  buildWorld() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xf3ecdc, 0x26303a, 1.25));
    const key = this.key = new THREE.DirectionalLight(0xfff4e2, 1.9);
    key.position.set(-5, 10, 4); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
    key.shadow.radius = 5; key.shadow.bias = -0.0006;
    s.add(key);

    this.tableMat = this.toon(P.table);
    const table = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 0.3, 96), this.tableMat);
    table.position.y = -0.42; table.receiveShadow = true; s.add(table);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.7, 4.82, 0.26, 6), this.toon(P.base));
    base.rotation.y = Math.PI / 6; base.position.y = -0.14; base.receiveShadow = base.castShadow = true; s.add(base);

    this.caseGroup = new THREE.Group();
    const caseGeo = new THREE.CylinderGeometry(4.65, 4.65, 3.1, 6, 1, true);
    const glass = new THREE.Mesh(caseGeo, new THREE.MeshBasicMaterial({ color: 0xdfe8ea, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }));
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(4.65, 4.65, 3.1, 6)), this.line(P.cream, 0.5));
    this.caseGroup.add(glass, edge);
    this.caseGroup.rotation.y = Math.PI / 6; this.caseGroup.position.y = 1.55;
    this.caseGroup.visible = false;
    s.add(this.caseGroup);

    const cellGeo = new THREE.CylinderGeometry(HS * 0.94, HS * 0.94, 0.14, 6);
    const edgeGeo = new THREE.EdgesGeometry(cellGeo);
    this.cellMat = this.toon(P.cell);
    this.heatMats = [];
    this.cellMeshes = [];
    for (const k of CELLS) {
      const kind = SPECIAL[k];
      let mat = this.cellMat;
      if (kind === 'heat') { mat = this.toon(0x4a4038, { emissive: P.heat, emissiveIntensity: 0 }); this.heatMats.push(mat); }
      if (kind === 'cat') mat = this.toon(0x6d777e);
      const m = new THREE.Mesh(cellGeo, mat);
      m.position.copy(hexPos(k)); m.receiveShadow = true; m.userData.key = k;
      s.add(m); this.cellMeshes.push(m);
      const e = new THREE.LineSegments(edgeGeo, this.line(kind === 'heat' ? P.heat : P.cream, kind === 'heat' ? 0.8 : 0.18));
      e.position.copy(m.position); s.add(e);
      const at = (pts, c, op) => { const l = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), this.line(c, op)); l.position.copy(m.position); s.add(l); };
      if (kind === 'heat') {
        for (const rr of [0.26, 0.44]) {
          const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
            Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3; return V(Math.sin(a) * rr, 0.075, Math.cos(a) * rr); })), this.line(P.heat, 0.7));
          ring.position.copy(m.position); s.add(ring);
        }
      }
      if (kind === 'light') {
        const pts = [];
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; pts.push(V(Math.sin(a) * 0.15, 0.075, Math.cos(a) * 0.15), V(Math.sin(a) * 0.43, 0.075, Math.cos(a) * 0.43)); }
        at(pts, P.light, 0.9);
        const dot = new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), new THREE.MeshBasicMaterial({ color: P.light }));
        dot.rotation.x = -Math.PI / 2; dot.position.copy(m.position).setY(0.076); s.add(dot);
      }
      if (kind === 'cat') {
        const pts = [];
        for (let i = -2; i <= 2; i++) pts.push(V(i * 0.13, 0.075, -0.34), V(i * 0.13, 0.075, 0.34), V(-0.34, 0.075, i * 0.13), V(0.34, 0.075, i * 0.13));
        at(pts, 0xd9dee0, 0.6);
      }
    }
    this.heatLights = CELLS.filter(k => SPECIAL[k] === 'heat').map(k => {
      const l = new THREE.PointLight(P.heat, 0, 4, 2); l.position.copy(hexPos(k)).setY(0.4); s.add(l); return l;
    });
    this.heatGlow = 0;
    this.nukeLight = new THREE.PointLight(P.nuke, 0, 9, 1.6); s.add(this.nukeLight); this.nukeGlow = 0;

    // 置ける場所の目印(パソコンのマウス用)
    this.hoverMesh = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3; return V(Math.sin(a) * HS * 0.9, 0.08, Math.cos(a) * HS * 0.9); })), this.line(P.cream, 0.9));
    this.hoverMesh.visible = false; s.add(this.hoverMesh);
    // 最初の一手の案内
    this.hintMesh = new THREE.LineLoop(this.hoverMesh.geometry, this.line(P.cream, 1));
    this.hintMesh.visible = false; s.add(this.hintMesh);
  }

  buildShared() {
    this.g = {
      token: new THREE.CylinderGeometry(0.52, 0.52, 0.2, 6),
      plane: new THREE.PlaneGeometry(1, 1),
      sphere: new THREE.SphereGeometry(1, 24, 16),
      bubble: new THREE.SphereGeometry(0.42, 40, 24),
      torus: new THREE.TorusGeometry(0.42, 0.012, 8, 64),
      box: new THREE.BoxGeometry(1, 1, 1),
      boxEdge: new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      bar: new THREE.CylinderGeometry(0.07, 0.07, 1, 12),
      ring: new THREE.RingGeometry(0.6, 0.66, 6),
      lump: new THREE.DodecahedronGeometry(0.3, 0),
      drop: (() => { const pts = [];
        for (let i = 0; i <= 48; i++) { const a = Math.PI * (1 - i / 48); pts.push(new THREE.Vector2(Math.sin(a) * Math.pow(Math.sin(a / 2), 1.6) * 0.5, (1 - Math.cos(a)) * 0.5 * 1.2)); }
        return new THREE.LatheGeometry(pts, 40); })(),
      ingot: (() => { const g = new THREE.CylinderGeometry(0.2, 0.28, 0.16, 4, 1); g.rotateY(Math.PI / 4); g.scale(1.5, 1, 0.8); return g; })(),
      pellet: new THREE.CylinderGeometry(0.17, 0.17, 0.34, 24),
      pelletEdge: new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.17, 0.17, 0.34, 24), 30),
      ingotEdge: null,
      rhomb: (() => { const g = new THREE.BoxGeometry(1, 1, 1); g.applyMatrix4(new THREE.Matrix4().makeShear(0.32, 0, 0.18, 0, 0, 0)); return g; })(),
    };
    this.g.ingotEdge = new THREE.EdgesGeometry(this.g.ingot);
    this.white = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    this.barMat = this.toon(P.cream);
    this.texCache = new Map();
  }

  /* ---------- 文字の貼り紙 ---------- */
  canvasTex(key, w, h, draw) {
    if (this.texCache.has(key)) return this.texCache.get(key);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    this.texCache.set(key, t); return t;
  }
  tokenTex(el) {
    return this.canvasTex('tok:' + el, 256, 256, (x) => {
      const d = ELEMENTS[el];
      x.fillStyle = d.ink; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `400 ${el.length > 1 ? 92 : 108}px Jost, "Century Gothic", sans-serif`;
      x.fillText(el, 128, 116);
      for (let i = 0; i < d.v; i++) { x.beginPath(); x.arc(128 + (i - (d.v - 1) / 2) * 28, 200, 8, 0, Math.PI * 2); x.fill(); }
    });
  }
  tagTex(sub) {
    return this.canvasTex('tag:' + sub, 256, 64, (x, w, h) => {
      const f = SUBSTANCES[sub].f;
      const parts = [...f.matchAll(/(\d+)|([^\d]+)/g)].map(m => m[1] ? { s: m[1], sub: true } : { s: m[2], sub: false });
      const big = '400 46px Jost, "Century Gothic", sans-serif', small = '400 30px Jost, "Century Gothic", sans-serif';
      let total = 0;
      for (const p of parts) { x.font = p.sub ? small : big; total += x.measureText(p.s).width; }
      let cx = (w - total) / 2;
      x.fillStyle = 'rgba(239,230,211,0.92)'; x.textBaseline = 'alphabetic';
      for (const p of parts) { x.font = p.sub ? small : big; x.fillText(p.s, cx, p.sub ? 54 : 46); cx += x.measureText(p.s).width; }
    });
  }

  /* ---------- 物と姿 ---------- */
  makeToken(el) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(this.g.token, this.toon(ELEMENTS[el].col)); body.castShadow = true; g.add(body);
    const dm = new THREE.Mesh(this.g.plane, new THREE.MeshBasicMaterial({ map: this.tokenTex(el), transparent: true, depthWrite: false }));
    dm.scale.setScalar(0.86); dm.position.y = 0.106; dm.rotation.order = 'YXZ'; dm.userData.decal = true; g.add(dm);
    g.userData.body = g;
    return g;
  }

  makeSub(id) {
    const s = SUBSTANCES[id];
    const g = new THREE.Group();
    const body = new THREE.Group(); g.add(body); g.userData.body = body;
    if (s.form === 'bubble') {
      body.add(new THREE.Mesh(this.g.bubble, this.toon(s.color ?? 0xdfe9ec, { transparent: true, opacity: s.opacity ?? 0.42, depthWrite: false })));
      const rim = new THREE.Mesh(this.g.torus, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
      body.add(rim); g.userData.rim = rim;
      const hi = new THREE.Mesh(this.g.sphere, this.white); hi.scale.setScalar(0.06); hi.position.set(-0.17, 0.2, 0.24); body.add(hi);
      // 空気(29 g/mol)より軽いほど高く浮かぶ
      g.userData.float = THREE.MathUtils.clamp(0.5 + (29 - s.M) * 0.033, 0.4, 1.45);
      body.scale.setScalar(s.M < 10 ? 0.82 : 0.95);
    } else if (s.form === 'drop') {
      const mat = this.toon(s.color, { transparent: !!s.inner || id === 'H2O', opacity: s.inner || id === 'H2O' ? 0.88 : 1 });
      const m = new THREE.Mesh(this.g.drop, mat); m.castShadow = true; body.add(m);
      const hi = new THREE.Mesh(this.g.sphere, this.white); hi.scale.set(0.05, 0.12, 0.04); hi.position.set(-0.19, 0.5, 0.22); hi.rotation.z = 0.5; body.add(hi);
      if (s.inner === 'cube') { const c = new THREE.Mesh(this.g.box, this.toon(0xf4efe6)); c.scale.setScalar(0.16); c.position.y = 0.28; c.rotation.set(0.5, 0.6, 0); body.add(c); g.userData.spin = c; }
      if (s.inner === 'speck') { for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(this.g.sphere, this.toon(0xf4efe6)); c.scale.setScalar(0.05); c.position.set((i - 1) * 0.1, 0.22 + (i % 2) * 0.1, 0.02); body.add(c); } }
      if (s.inner === 'fizz') { g.userData.fizz = []; for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(this.g.sphere, this.white); c.scale.setScalar(0.035); body.add(c); g.userData.fizz.push(c); } }
      body.scale.setScalar(0.92);
    } else if (s.form === 'crystal' || s.form === 'rhomb') {
      const geo = s.form === 'rhomb' ? this.g.rhomb : this.g.box, mat = this.toon(s.color);
      for (const [sz, x, y, z, ry] of [[0.46, 0, 0.23, 0, 0.2], [0.26, 0.31, 0.13, 0.19, 0.7], [0.2, -0.28, 0.1, -0.17, -0.4]]) {
        const b = new THREE.Mesh(geo, mat); b.scale.setScalar(sz); b.position.set(x, y, z); b.rotation.y = ry; b.castShadow = true;
        b.add(new THREE.LineSegments(this.g.boxEdge, this.line(0xb7ae9c, 0.9))); body.add(b);
      }
    } else if (s.form === 'powder') {
      const mat = this.toon(s.color);
      for (let i = 0; i < 14; i++) {
        const a = i * 2.4, rr = 0.06 + (i / 14) * 0.3, m = new THREE.Mesh(this.g.sphere, mat);
        m.scale.setScalar(0.12 - i * 0.004); m.position.set(Math.cos(a) * rr, 0.09 + (1 - i / 14) * 0.18, Math.sin(a) * rr); m.castShadow = true; body.add(m);
      }
    } else if (s.form === 'pellets') {
      const mat = this.toon(s.color);
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9, rr = i ? 0.22 : 0, m = new THREE.Mesh(this.g.sphere, mat);
        m.scale.set(0.11, 0.065, 0.11); m.position.set(Math.cos(a) * rr, 0.07 + (i ? 0 : 0.09), Math.sin(a) * rr); m.castShadow = true; body.add(m);
      }
    } else if (s.form === 'pellet') {
      // 燃料ペレット:焼き固めた円柱
      const mat = this.toon(s.color, s.glow ? { emissive: 0xff7a2a, emissiveIntensity: 0.35 } : {});
      for (const [x, y, z, rx, rz] of [[0, 0.17, 0, 0, 0], [0.26, 0.17, 0.12, 0, 0], [-0.14, 0.17, 0.27, 0, 0], [0.1, 0.42, 0.08, 0.2, 0.3]]) {
        const m = new THREE.Mesh(this.g.pellet, mat); m.position.set(x, y + (y > 0.3 ? 0 : 0), z); m.rotation.set(rx, 0, rz); m.castShadow = true;
        m.add(new THREE.LineSegments(this.g.pelletEdge, this.line(0x8b8272, 0.55))); body.add(m);
      }
      if (s.fuel) g.userData.fuel = true;
    } else if (FORMS[s.form]) {
      FORMS[s.form].call(this, body, s, g);
    } else if (s.form === 'metal') {
      // 金属:小さな延べ棒
      const mat = this.toon(s.color, { emissive: s.color, emissiveIntensity: 0.08 });
      for (const [x, z, ry, y] of [[0, 0, 0.3, 0], [0.12, 0.2, -0.4, 0], [-0.05, 0.08, 0.1, 0.16]]) {
        const m = new THREE.Mesh(this.g.ingot, mat); m.position.set(x, 0.08 + y, z); m.rotation.y = ry; m.castShadow = true;
        m.add(new THREE.LineSegments(this.g.ingotEdge, this.line(0xffffff, 0.35))); body.add(m);
      }
    } else if (s.form === 'lump') {
      const mat = this.toon(s.color);
      for (const [sz, x, z] of [[1, 0, 0], [0.6, 0.3, 0.16], [0.5, -0.26, 0.18]]) {
        const m = new THREE.Mesh(this.g.lump, mat); m.scale.setScalar(sz); m.position.set(x, 0.24 * sz, z); m.rotation.set(sz * 2, sz * 3, 0); m.castShadow = true; body.add(m);
      }
    }
    // 床の名札(化学式)
    const tag = new THREE.Mesh(this.g.plane, new THREE.MeshBasicMaterial({ map: this.tagTex(id), transparent: true, depthWrite: false }));
    tag.scale.set(1.0, 0.25, 1); tag.rotation.order = 'YXZ'; tag.userData.tag = true; g.add(tag);
    g.userData.sub = id;
    return g;
  }

  add(id, obj, key, kind) {
    obj.position.copy(hexPos(key)).setY(kind === 'atom' ? 0.17 : FLOOR);
    this.scene.add(obj);
    const label = document.createElement('div'); label.className = 'mlabel';
    if (kind === 'sub') { const s = SUBSTANCES[obj.userData.sub]; label.innerHTML = `<b>${s.name}</b>`; }
    this.labelRoot.appendChild(label);
    const e = { obj, key, kind, label, born: performance.now() };
    this.ents.set(id, e); return e;
  }
  remove(id) {
    const e = this.ents.get(id); if (!e) return;
    this.scene.remove(e.obj); e.label.remove(); this.ents.delete(id);
  }
  clear() {
    for (const id of [...this.ents.keys()]) this.remove(id);
    for (const m of this.bars.values()) this.scene.remove(m);
    this.bars.clear(); this.tweens = [];
    this.warmGoal = 0;
  }

  tween(dur, fn, done, delay = 0) { this.tweens.push({ t: -delay, dur, fn, done }); }

  /* ---------- 演出 ---------- */
  ring(key, color = P.cream, size = 1) {
    const m = new THREE.Mesh(this.g.ring, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 6; m.position.copy(hexPos(key)).setY(0.09);
    this.scene.add(m);
    this.tween(0.55, k => { m.scale.setScalar(1 + k * 0.8 * size); m.material.opacity = (1 - k) * 0.9; }, () => this.scene.remove(m));
  }
  burst(pos, color, n = 10, spread = 1) {
    if (this.reduce) n = Math.min(n, 4);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false });
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.g.sphere, mat); const sz = 0.03 + Math.random() * 0.05; m.scale.setScalar(sz);
      const a = Math.random() * Math.PI * 2, v = (0.6 + Math.random() * 1.2) * spread, up = 0.6 + Math.random() * 1.4;
      m.position.copy(pos); this.scene.add(m);
      const o = pos.clone();
      this.tween(0.5 + Math.random() * 0.3, k => {
        m.position.set(o.x + Math.cos(a) * v * easeOut(k), o.y + up * k - 1.6 * k * k * 0.6, o.z + Math.sin(a) * v * easeOut(k));
        mat.opacity = 1 - k;
      }, () => this.scene.remove(m));
    }
  }
  steam(pos, n = 6) {
    const mat = new THREE.MeshBasicMaterial({ color: P.cream, transparent: true, depthWrite: false });
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.g.sphere, mat.clone()); m.position.copy(pos); m.scale.setScalar(0.001); m.material.opacity = 0; this.scene.add(m);
      const dx = (Math.random() - .5) * 0.5, dz = (Math.random() - .5) * 0.5;
      this.tween(1.1, k => { m.position.set(pos.x + dx * k, pos.y + 0.4 + k * 1.6, pos.z + dz * k); m.scale.setScalar(0.07 + k * 0.12); m.material.opacity = Math.sin(Math.PI * k) * 0.55; },
        () => this.scene.remove(m), i * 0.08);
    }
  }
  floatText(key, html, cls = '') {
    const d = document.createElement('div'); d.className = 'ftext ' + cls; d.innerHTML = html;
    this.labelRoot.appendChild(d);
    const p = hexPos(key).setY(1.0);
    d._pos = p; this.floaters = this.floaters || new Set(); this.floaters.add(d);
    setTimeout(() => { d.remove(); this.floaters.delete(d); }, 1000);
  }
  flashName(id) {
    const e = this.ents.get(id); if (!e) return;
    e.flash = performance.now();
  }

  bar(a, b, ka, kb) {
    const m = new THREE.Mesh(this.g.bar, this.barMat);
    const pa = hexPos(ka), pb = hexPos(kb), d = pb.clone().sub(pa);
    m.position.copy(pa).add(pb).multiplyScalar(0.5).setY(0.19);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
    m.userData.len = d.length();
    m.scale.set(1, 0.001, 1);
    this.scene.add(m); this.bars.set(a + '-' + b, m);
    this.tween(0.12, k => m.scale.set(1, m.userData.len * k, 1));
  }
  dropBars(edges) {
    for (const [a, b] of edges) {
      const m = this.bars.get(a + '-' + b) || this.bars.get(b + '-' + a);
      if (!m) continue;
      this.bars.delete(a + '-' + b); this.bars.delete(b + '-' + a);
      this.tween(0.15, k => m.scale.set(1 - k + 0.001, m.userData.len, 1 - k + 0.001), () => this.scene.remove(m));
    }
  }

  // 消える物を中心へ寄せて縮める
  gather(id, toKey, dur = 0.2) {
    const e = this.ents.get(id); if (!e) return;
    const from = e.obj.position.clone(), to = hexPos(toKey).setY(from.y);
    this.ents.delete(id); e.label.remove();
    this.tween(dur, k => { e.obj.position.lerpVectors(from, to, easeIn(k)); e.obj.scale.setScalar(1 - easeIn(k) * 0.9); }, () => this.scene.remove(e.obj));
  }
  popIn(id, sub, key, delay = 0) {
    const obj = this.makeSub(sub);
    const e = this.add(id, obj, key, 'sub');
    obj.scale.setScalar(0.001);
    this.tween(0.36, k => obj.scale.setScalar(Math.max(0.001, backOut(k))), null, delay);
    return e;
  }

  /* ---------- ゲームのできごと ---------- */
  handle(type, d) {
    switch (type) {
      case 'start': this.clear(); break;
      case 'spawn': {
        if (d.drip) {
          const obj = this.makeSub(d.sub); const e = this.add(d.id, obj, d.key, 'sub');
          const y0 = 3.2;
          this.tween(0.42, k => { obj.position.y = FLOOR + (y0 - FLOOR) * (1 - easeIn(k)); }, () => { this.ring(d.key, 0x9ad3e6, 0.6); });
        } else this.popIn(d.id, d.sub, d.key, Math.random() * 0.3);
        break;
      }
      case 'place': {
        const obj = this.makeToken(d.el); this.add(d.id, obj, d.key, 'atom');
        obj.position.y = 2.2;
        this.tween(0.16, k => { obj.position.y = 0.17 + (2.2 - 0.17) * (1 - easeIn(k)); }, () => this.ring(d.key, P.cream, 0.5));
        break;
      }
      case 'bond': this.bar(d.a, d.b, d.ka, d.kb); break;
      case 'complete': {
        this.dropBars(d.edges);
        for (const a of d.atoms) this.gather(a.id, d.key, 0.2);
        const e = this.popIn(d.id, d.sub, d.key, 0.16);
        setTimeout(() => { this.ring(d.key); this.burst(hexPos(d.key).setY(0.4), P.cream, 8, 0.6); this.flashName(d.id); }, 170);
        break;
      }
      case 'dissolve': {
        this.dropBars(d.edges);
        for (const a of d.atoms) { const e = this.ents.get(a.id); if (!e) continue; this.ents.delete(a.id); e.label.remove();
          this.tween(0.35, k => e.obj.scale.setScalar(1 - k + 0.001), () => this.scene.remove(e.obj)); }
        break;
      }
      case 'move': {
        const e = this.ents.get(d.id); if (!e) break;
        const from = hexPos(d.from), to = hexPos(d.to); e.key = d.to;
        this.tween(0.5, k => { const p = from.clone().lerp(to, ease(k)); e.obj.position.x = p.x; e.obj.position.z = p.z; });
        break;
      }
      case 'react': {
        if (d.R.nuclear) { this.nuclearFx(d); break; }
        const hot = d.R.dH < 0, big = Math.min(1, Math.abs(d.R.dH) / 900);
        const center = hexPos(d.center).setY(0.4);
        for (const c of d.consumed) this.gather(c.id, d.center, 0.18);
        d.products.forEach((p, i) => this.popIn(p.id, p.sub, p.key, 0.16 + i * 0.04));
        setTimeout(() => {
          this.ring(d.center, hot ? P.heat : 0x9ad3e6, 1 + big);
          this.burst(center, hot ? P.heat : P.cream, Math.round(8 + big * 22), 0.8 + big);
          if (hot) { this.heatGlow = Math.max(this.heatGlow, 0.4 + big); this.flashAt = center; }
          if (!this.reduce) this.shake = Math.max(this.shake, 0.04 + big * 0.12);
          for (const p of d.products) this.flashName(p.id);
          for (const esc of d.escapes) {
            if (esc === 'H2O(g)') this.steam(center);
            else this.escapeBubble(d.center, esc);
          }
          this.floatText(d.center, `+${d.pts.toLocaleString('en-US')}`, hot ? 'hot' : '');
        }, 160);
        break;
      }
      case 'collect': {
        const e = this.ents.get(d.id); if (!e) break;
        this.ents.delete(d.id); e.label.remove();
        const y0 = e.obj.position.y;
        this.tween(0.55, k => { e.obj.position.y = y0 + easeIn(k) * 1.6; e.obj.scale.setScalar(1 - easeIn(k) * 0.85); }, () => this.scene.remove(e.obj));
        if (d.pts) { this.ring(d.key, P.cream, 0.6); this.floatText(d.key, `+${d.pts}`); }
        break;
      }
      case 'escape': case 'overflow': {
        const e = this.ents.get(d.id); if (!e) break;
        this.ents.delete(d.id); e.label.remove();
        const y0 = e.obj.position.y;
        this.tween(0.9, k => { e.obj.position.y = y0 + k * 1.4; e.obj.scale.setScalar(1 - k + 0.001); }, () => this.scene.remove(e.obj));
        break;
      }
      case 'needHeat': this.ring(d.key, P.heat, 0.4); break;
      case 'targetMark': { const e = this.ents.get(d.id); if (e) e.mark = d.on; break; }
      case 'target': this.ring(d.key, P.light, 2.2); this.floatText(d.key, `お題 +${d.pts}`, 'target'); break;
      case 'settle': for (const id of d.atoms) { const e = this.ents.get(id); if (e) e.settle = d.on ? { t0: performance.now(), dur: d.dur * 1000 } : null; } break;
      case 'fragWarn': for (const id of d.atoms) { const e = this.ents.get(id); if (e) e.warn = performance.now(); } break;
      case 'hint': this.hintKey = d.key; this.hintMesh.visible = !!d.key; if (d.key) this.hintMesh.position.copy(hexPos(d.key)).setY(0.01); break;
      case 'fever': this.warmGoal = d.on ? 1 : 0; break;
    }
  }

  // 核分裂:水の中で光る青白い光(チェレンコフ光)と、大きな衝撃
  nuclearFx(d) {
    const center = hexPos(d.center).setY(0.4), fission = d.R.id !== 'breed';
    for (const c of d.consumed) this.gather(c.id, d.center, 0.14);
    d.products.forEach((p, i) => this.popIn(p.id, p.sub, p.key, 0.2 + i * 0.05));
    setTimeout(() => {
      if (fission) {
        this.ring(d.center, P.nuke, 3.2); this.ring(d.center, 0xffffff, 1.6);
        this.burst(center, P.nuke, 40, 2.2); this.burst(center, 0xffffff, 16, 1.2);
        this.nukeGlow = 1; this.nukeAt = center;
        if (!this.reduce) this.shake = Math.max(this.shake, 0.26);
        for (const e of d.escapes) this.escapeBubble(d.center, e);
      } else {
        this.ring(d.center, 0xd9b36a, 1.2);
      }
      for (const p of d.products) this.flashName(p.id);
      this.floatText(d.center, `+${d.pts.toLocaleString('en-US')}`, fission ? 'nuke' : '');
    }, 140);
  }

  escapeBubble(key, sub) {
    if (!SUBSTANCES[sub]) return;
    const obj = this.makeSub(sub); obj.position.copy(hexPos(key)).setY(FLOOR); this.scene.add(obj);
    obj.userData.float = null;
    this.tween(1.2, k => { obj.userData.body.position.y = 0.4 + k * 2.2; obj.scale.setScalar(Math.max(0.001, 1 - k * 0.6)); }, () => this.scene.remove(obj));
  }

  /* ---------- 入力:タップで置く、横にドラッグで盤を回す(60°ごとに止まる) ---------- */
  bindInput() {
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const pickCell = (x, y) => {
      const r = this.canvas.getBoundingClientRect();
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
      const hit = ray.intersectObjects(this.cellMeshes, false)[0];
      if (hit) return hit.object.userData.key;
      // 物の上を押したとき:床の高さの面で拾う
      const p = new THREE.Vector3();
      if (!ray.ray.intersectPlane(new THREE.Plane(V(0, 1, 0), -FLOOR), p)) return null;
      let best = null, bd = HS;
      for (const m of this.cellMeshes) { const dd = Math.hypot(m.position.x - p.x, m.position.z - p.z); if (dd < bd) { bd = dd; best = m.userData.key; } }
      return best;
    };
    let down = null;
    const c = this.canvas;
    c.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, az: this.azGoal, drag: false, id: e.pointerId }; });
    c.addEventListener('pointermove', e => {
      if (down && down.id === e.pointerId) {
        const dx = e.clientX - down.x;
        if (Math.abs(dx) > 10) down.drag = true;
        if (down.drag) this.azGoal = down.az - dx * 0.008;
      }
      if (e.pointerType === 'mouse') this.hover = pickCell(e.clientX, e.clientY);
    });
    const up = e => {
      if (!down || down.id !== e.pointerId) return;
      if (down.drag) { const step = Math.PI / 3; this.azGoal = Math.round(this.azGoal / step) * step; }
      else { const k = pickCell(e.clientX, e.clientY); if (k) this.onTap(k); }
      down = null;
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', () => { down = null; });
    c.addEventListener('pointerleave', () => { this.hover = null; });
  }
  rotate(dir) { const step = Math.PI / 3; this.azGoal = Math.round(this.azGoal / step) * step + dir * step; }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const vf = THREE.MathUtils.degToRad(this.camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * this.camera.aspect);
    this.dist = Math.max(4.55 / Math.tan(hf / 2), 4.6 / Math.tan(vf / 2));
    this.camera.updateProjectionMatrix();
  }

  /* ---------- 毎フレーム ---------- */
  update(dt, game) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i]; tw.t += dt;
      if (tw.t < 0) continue;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(k);
      if (k >= 1) { this.tweens.splice(i, 1); tw.done && tw.done(); }
    }
    // カメラ
    this.az += (this.azGoal - this.az) * Math.min(1, dt * 9);
    const d = this.dist;
    this.camera.position.set(d * Math.sin(this.pol) * Math.sin(this.az), this.target.y + d * Math.cos(this.pol), d * Math.sin(this.pol) * Math.cos(this.az));
    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - .5) * this.shake; this.camera.position.y += (Math.random() - .5) * this.shake;
      this.shake *= Math.pow(0.002, dt);
    }
    this.camera.lookAt(this.target);

    // 過熱中の暖色
    this.warm += (this.warmGoal - this.warm) * Math.min(1, dt * 2.5);
    this.bg.set(P.slate).lerp(new THREE.Color(P.warmSlate), this.warm);
    this.tableMat.color.set(P.table).lerp(new THREE.Color(P.warmTable), this.warm);
    this.cellMat.color.set(P.cell).lerp(new THREE.Color(P.warmCell), this.warm);

    const t = performance.now() / 1000;
    const heatOn = game && !game.over ? (game.feverOn ? 0.6 + Math.sin(t * 6) * 0.25 : 0) : 0;
    this.heatGlow = Math.max(0, this.heatGlow - dt * 1.6);
    const g = Math.max(heatOn, this.heatGlow);
    this.heatMats.forEach(m => m.emissiveIntensity = g * 0.9);
    this.heatLights.forEach(l => l.intensity = g * 6);
    this.nukeGlow = Math.max(0, this.nukeGlow - dt * 1.2);
    this.nukeLight.intensity = this.nukeGlow * 40;
    if (this.nukeAt) this.nukeLight.position.copy(this.nukeAt).setY(1.2);
    if (this.hintMesh.visible) { const k = 0.5 + 0.5 * Math.sin(t * 5); this.hintMesh.material.opacity = 0.35 + k * 0.65; this.hintMesh.scale.setScalar(1 + k * 0.06); }

    // 貼り紙はいつもカメラの方を向く
    const az = this.az;
    for (const e of this.ents.values()) {
      const o = e.obj;
      for (const ch of o.children) {
        if (ch.userData.decal) { ch.rotation.y = az; ch.rotation.x = -Math.PI / 2; }
        if (ch.userData.tag) { ch.rotation.y = az; ch.rotation.x = -Math.PI / 2; ch.position.set(Math.sin(az) * 0.5, 0.006, Math.cos(az) * 0.5); }
      }
      if (e.settle) { const k = Math.min(1, (performance.now() - e.settle.t0) / e.settle.dur); o.scale.setScalar(1 + 0.07 * Math.sin(k * Math.PI * 3)); if (k >= 1) { e.settle = null; o.scale.setScalar(1); } }
      if (e.warn) { const on = Math.sin((performance.now() - e.warn) / 1000 * Math.PI * 4) > -0.2; o.visible = on; }
      if (o.userData.sub === 'FP' && e.spent == null) e.spent = performance.now();
      if (e.spent != null) { const k = Math.min(1, (performance.now() - e.spent) / 15000); o.userData.body.children.forEach(m => { if (m.material?.emissive) m.material.emissiveIntensity = 0.6 * (1 - k); }); }
      if (o.userData.float != null) o.userData.body.position.y = o.userData.float + Math.sin(t * 1.4 + e.born) * 0.04;
      if (o.userData.rim) o.userData.rim.lookAt(this.camera.position);
      if (o.userData.spin) o.userData.spin.rotation.y = t;
      if (o.userData.puffs) o.userData.puffs.forEach((b, i) => { const ph = (t * 0.35 + i / 6) % 1; b.position.set(Math.sin(i * 1.7 + ph * 2) * 0.18 * ph, 0.25 + ph * 0.8, Math.cos(i * 1.7) * 0.18 * ph); b.scale.setScalar(0.08 + ph * 0.16); b.material.opacity = 0.5 * Math.sin(Math.PI * ph); });
      if (o.userData.fizz) o.userData.fizz.forEach((b, i) => { const ph = (t * 0.5 + i / 5) % 1; b.position.set(Math.sin(i * 2.3) * 0.12, 0.08 + ph * 0.6, Math.cos(i * 2.3) * 0.12); });
    }
    // お題の中心:黄色い枠が脈打つ
    this.markMeshes = this.markMeshes || [];
    let mi = 0;
    for (const [id, e] of this.ents) {
      if (!e.mark || !game || !game.targets || !game.targets.some(T => !T.done && T.center === id)) continue;
      let m = this.markMeshes[mi];
      if (!m) { m = new THREE.LineLoop(this.hoverMesh.geometry, this.line(P.light, 1)); this.scene.add(m); this.markMeshes.push(m); }
      m.visible = true; m.position.set(e.obj.position.x, 0.012, e.obj.position.z);
      const k = 0.5 + 0.5 * Math.sin(t * 3); m.material.opacity = 0.35 + 0.5 * k; m.scale.setScalar(1.02 + 0.04 * k);
      mi++;
    }
    for (; mi < this.markMeshes.length; mi++) this.markMeshes[mi].visible = false;
    if (this.hover && game && !game.over && !game.cells.has(this.hover)) { this.hoverMesh.visible = true; this.hoverMesh.position.copy(hexPos(this.hover)); }
    else this.hoverMesh.visible = false;

    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
  }

  updateLabels() {
    const w = innerWidth, h = innerHeight, now = performance.now(), p = new THREE.Vector3();
    for (const e of this.ents.values()) {
      if (e.kind !== 'sub') { e.label.style.opacity = 0; continue; }
      const flash = e.flash ? Math.max(0, 1 - (now - e.flash) / 1400) : 0;
      const a = this.showNames ? 1 : Math.min(1, flash * 2.2);
      if (a <= 0) { e.label.style.opacity = 0; continue; }
      const body = e.obj.userData.body;
      p.copy(e.obj.position); p.y += (body.position.y || 0) + (e.obj.userData.float != null ? 0.55 : 0.95); p.project(this.camera);
      e.label.style.transform = `translate(${(p.x * .5 + .5) * w}px,${(-p.y * .5 + .5) * h}px) translate(-50%,-100%)`;
      e.label.style.opacity = a;
    }
    if (this.floaters) for (const d of this.floaters) {
      p.copy(d._pos).project(this.camera);
      d.style.left = `${(p.x * .5 + .5) * w}px`; d.style.top = `${(-p.y * .5 + .5) * h}px`;
    }
  }
}

/* ---------- 物質の姿(追加分) ----------
   実験室や身近な場面で見かける姿にする:試薬びん、水晶、宝石、針状の結晶、銅線、くぎ、粒、ビーカーの沈殿、錠剤、白煙 */
const glassMat = (v, color = 0xdfe9ec, opacity = 0.32) => v.toon(color, { transparent: true, opacity, depthWrite: false });
const FORMS = {
  // 試薬びん:中の液体の色が見える。光で分解する硝酸・過酸化水素は褐色びん、ガラスを溶かすフッ化水素酸はポリびん
  bottle(body, s) {
    const glass = s.bottle === 'brown' ? glassMat(this, 0x6b4426, 0.55) : s.bottle === 'poly' ? this.toon(0xe9e6dc) : glassMat(this);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 28), glass); b.position.y = 0.21; body.add(b);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, 0.12, 28), glass); sh.position.y = 0.48; body.add(sh);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 20), glass); neck.position.y = 0.58; body.add(neck);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.09, 20), this.toon(s.bottle === 'poly' ? 0x3f82d6 : 0x2f3a44)); cap.position.y = 0.66; cap.castShadow = true; body.add(cap);
    if (s.bottle !== 'poly') { const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.28, 28), this.toon(s.color)); liq.position.y = 0.15; body.add(liq); }
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.203, 0.203, 0.14, 28, 1, true, -0.9, 1.8), this.toon(0xf4efe2, { side: THREE.DoubleSide }));
    label.position.y = 0.24; body.add(label);
    b.castShadow = true;
  },
  // アンプル:臭素のように揮発しやすく危険な液体を封じる
  ampoule(body, s) {
    const glass = glassMat(this);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.36, 24), glass); b.position.y = 0.2; body.add(b);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 24), glass); tip.position.y = 0.51; body.add(tip);
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.24, 24), this.toon(s.color)); liq.position.y = 0.14; body.add(liq);
    const vap = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.1, 24), this.toon(s.color, { transparent: true, opacity: 0.35, depthWrite: false })); vap.position.y = 0.31; body.add(vap);
  },
  // 水晶:六角柱の先がとがった結晶の群れ(二酸化ケイ素)
  quartz(body, s) {
    const mat = this.toon(s.color, { transparent: true, opacity: 0.82 });
    for (const [h, x, z, tx, tz] of [[0.5, 0, 0, 0, 0], [0.34, 0.17, 0.1, 0.35, 0.25], [0.28, -0.15, 0.12, -0.3, 0.3], [0.22, 0.05, -0.16, 0.1, -0.4]]) {
      const g = new THREE.Group();
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, h, 6), mat); col.position.y = h / 2; g.add(col);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 6), mat); tip.position.y = h + 0.07; g.add(tip);
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(col.geometry), this.line(0xffffff, 0.5)).translateY(h / 2));
      g.position.set(x, 0, z); g.rotation.set(tx, 0, tz); col.castShadow = true; body.add(g);
    }
  },
  // 宝石:六方両錐の結晶(酸化アルミニウム。不純物でルビーやサファイアになる)
  gem(body, s) {
    const mat = this.toon(s.color, { transparent: true, opacity: 0.88 });
    for (const [sz, x, z, ry] of [[1, 0, 0, 0.2], [0.55, 0.26, 0.16, 0.9]]) {
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.2 * sz, 0.26 * sz, 6), mat); top.position.set(x, 0.39 * sz, z);
      const bot = new THREE.Mesh(new THREE.ConeGeometry(0.2 * sz, 0.26 * sz, 6), mat); bot.rotation.x = Math.PI; bot.position.set(x, 0.13 * sz, z);
      top.rotation.y = bot.rotation.y = ry; top.castShadow = true;
      body.add(top, bot);
      for (const m of [top, bot]) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), this.line(0xffffff, 0.55)));
    }
  },
  // 針状の結晶:中心から放射状に伸びる(石こう、リン酸アンモニウム)
  needles(body, s) {
    const mat = this.toon(s.color);
    for (let i = 0; i < 11; i++) {
      const a = i * 2.4, up = 0.4 + (i % 3) * 0.35, len = 0.3 + (i % 4) * 0.05;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, len, 0.035), mat);
      const d = new THREE.Vector3(Math.cos(a) * Math.cos(up), Math.sin(up), Math.sin(a) * Math.cos(up));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      m.position.copy(d.multiplyScalar(len / 2)).setY(0.04 + Math.sin(up) * len / 2); m.castShadow = true; body.add(m);
    }
  },
  // 銅線:ぐるぐる巻いた赤銅色の線
  coil(body, s) {
    const pts = [];
    for (let i = 0; i <= 120; i++) { const t = i / 120, a = t * Math.PI * 2 * 4.5; pts.push(new THREE.Vector3(Math.cos(a) * 0.2, 0.05 + t * 0.32, Math.sin(a) * 0.2)); }
    pts.push(new THREE.Vector3(0.32, 0.38, 0.05));
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.022, 8), this.toon(s.color, { emissive: s.color, emissiveIntensity: 0.12 }));
    m.castShadow = true; body.add(m);
  },
  // 鉄くぎ
  nails(body, s) {
    const mat = this.toon(s.color, { emissive: s.color, emissiveIntensity: 0.06 });
    for (const [x, z, ry, y] of [[0, 0, 0.3, 0.03], [0.04, 0.08, -0.6, 0.07], [-0.06, -0.06, 1.3, 0.11]]) {
      const n = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.52, 10), mat); shaft.rotation.z = Math.PI / 2; n.add(shaft);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16), mat); head.rotation.z = Math.PI / 2; head.position.x = -0.26; n.add(head);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 10), mat); tip.rotation.z = -Math.PI / 2; tip.position.x = 0.29; n.add(tip);
      n.position.set(x, y, z); n.rotation.y = ry; shaft.castShadow = true; body.add(n);
    }
  },
  // 粒状の金属(実験で使う亜鉛粒)
  granules(body, s) {
    const mat = this.toon(s.color, { emissive: s.color, emissiveIntensity: 0.08 });
    for (let i = 0; i < 9; i++) {
      const a = i * 2.1, rr = 0.06 + (i % 4) * 0.06, m = new THREE.Mesh(this.g.lump, mat);
      m.scale.set(0.32, 0.22, 0.28).multiplyScalar(0.8 + (i % 3) * 0.15); m.rotation.set(i, i * 2, 0);
      m.position.set(Math.cos(a) * rr, 0.06 + (i > 6 ? 0.08 : 0), Math.sin(a) * rr); m.castShadow = true; body.add(m);
    }
  },
  // ビーカーの中の沈殿:上ずみと、底にたまった色のついた沈殿
  beaker(body, s) {
    const glass = glassMat(this, 0xdfe9ec, 0.28);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.5, 30, 1, true), glass); wall.position.y = 0.25; body.add(wall);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.012, 6, 30), this.toon(0xffffff)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.5; body.add(rim);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.215, 0.3, 30), this.toon(0x9ad3e6, { transparent: true, opacity: 0.45, depthWrite: false })); water.position.y = 0.17; body.add(water);
    const sed = new THREE.Mesh(new THREE.CylinderGeometry(0.212, 0.205, 0.08, 30), this.toon(s.color)); sed.position.y = 0.05; body.add(sed);
    const fl = new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.7, depthWrite: false });
    for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(this.g.sphere, fl); f.scale.setScalar(0.025); f.position.set(Math.sin(i * 2.3) * 0.13, 0.12 + (i % 3) * 0.06, Math.cos(i * 2.3) * 0.13); body.add(f); }
    wall.castShadow = true;
  },
  // 錠剤(水酸化マグネシウムは胃薬に使われる)
  tablet(body, s) {
    const mat = this.toon(s.color);
    const geo = new THREE.CylinderGeometry(0.15, 0.15, 0.06, 28);
    for (const [x, y, z, rx] of [[0, 0.03, 0, 0], [0, 0.09, 0, 0], [0, 0.15, 0, 0], [0.26, 0.05, 0.1, 1.2], [-0.2, 0.03, 0.2, 0]]) {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true;
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 40), this.line(0xb7ae9c, 0.7))); body.add(m);
    }
  },
  // 白煙:塩化アンモニウムの細かい結晶が煙のように漂う
  smoke(body, s, g) {
    const mat = this.toon(s.color);
    for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(this.g.sphere, mat); const a = i * 2.4, rr = 0.05 + (i / 9) * 0.22; m.scale.setScalar(0.08 - i * 0.004); m.position.set(Math.cos(a) * rr, 0.06 + (1 - i / 9) * 0.1, Math.sin(a) * rr); body.add(m); }
    const puff = this.toon(0xf6f3ec, { transparent: true, opacity: 0.55, depthWrite: false });
    g.userData.puffs = [];
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(this.g.sphere, puff.clone()); body.add(m); g.userData.puffs.push(m); }
  },
};
