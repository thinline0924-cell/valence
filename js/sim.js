// ゲームのルール本体(表示とは切り離してある)
import { CELLS, SPECIAL, neighbors } from './board.js';
import { ELEMENTS, SUBSTANCES, REACTIONS, NUCLEAR, FINAL, BUILDABLE, signature } from './chem.js';

export const RULES = {
  time: 150,          // 制限時間(秒)
  heatMax: 600,       // 熱ゲージの上限(kJ)。満タンで過熱
  feverTime: 10,      // 過熱の長さ(秒)
  cool: 4,            // 熱が自然に逃げる速さ(kJ/秒)
  pauseMax: 8,        // 1回の連鎖で時計を止められる長さの上限(秒)
  tick: 0.5,          // 反応の判定の間隔(秒)
  tickFever: 0.28,    // 過熱中の間隔(温度が高いほど反応は速い)
  bias: 0.3,          // 組み立て中の分子に合う原子を配る確率
  fragLife: 20,       // 組み立て途中の原子が散るまで(秒)
  gasLife: 24,        // 反応しない気体が抜けていくまで(秒)
  collectDelay: 1.0,  // それ以上反応しない物質が回収されるまで(秒)
  water: 5,           // 水の補給の間隔(秒)。盤の水が waterMin より少ないとき、空いたマスに一滴落ちる
  waterMin: 4,
  reagent: 9,         // 試薬の補給の間隔(秒)。反応の回数が増えるほど、補給される物質の種類が広がる
  flameAt: 150,       // この熱量(kJ)以上の発熱反応は炎を出し、となりの燃えるものに点火する
  nuclearAfter: 12,   // ウランとプルトニウムが出はじめるまでの反応の回数
  fissionPts: 2000,   // 核分裂1回の基本点
  diffuse: 0.35,      // 気体が隣へ動く確率(1秒あたり、空気と同じ重さのとき)。軽いほど速い(グレアムの法則)
};

const BY_SIZE = [...REACTIONS].sort((a, b) => b.in.length - a.in.length || Math.abs(b.dH) - Math.abs(a.dH));

export class Game {
  constructor() { this.listeners = []; this.over = true; }
  on(fn) { this.listeners.push(fn); }
  emit(type, d = {}) { for (const f of this.listeners) f(type, d); }

  start() {
    Object.assign(this, {
      t: 0, time: RULES.time, score: 0, heat: 0, fever: 0, chain: 0, maxChain: 0,
      cells: new Map(), frags: new Map(), uid: 1, tickIn: -1, idleIn: 1, waterIn: RULES.water, reagentIn: RULES.reagent, tier: 0, flames: new Set(), nextFlames: new Set(),
      over: false, found: new Set(), reactCount: 0, lastHeatHint: -99, pauseLeft: 0, seen: new Map(),
    });
    this.queue = ['Cl', this.pick(), this.pick()];
    this.emit('start');
    // 最初の連鎖の見本:加熱マスに Cl を置くと
    //   H + Cl → HCl → (水) 塩酸 → (水酸化ナトリウム水溶液) 中和 → (加熱) 食塩の結晶 と進む
    const O = OPENING;
    this.placeAtom('H', O.h);
    this.addSub('H2O', O.water, -1);
    this.addSub('NaOHaq', O.base, -1);
    this.hintKey = O.at;
    this.emit('hint', { key: O.at, el: 'Cl' });
    const near = new Set([O.h, O.water, O.base, O.at].flatMap(k => [k, ...neighbors(k)]));
    const seeds = ['H2O', 'H2O', 'H2O', 'O2', 'CaO', 'H2O2'];
    const free = CELLS.filter(k => !SPECIAL[k] && !near.has(k)).sort(() => Math.random() - 0.5);
    // 最初に置く物質どうしは離しておく(始まってすぐ勝手に反応しないように)
    for (const s of seeds) {
      const k = free.find(k => !near.has(k));
      if (!k) break;
      this.addSub(s, k, -1);
      near.add(k); neighbors(k).forEach(n => near.add(n));
    }
  }

  get nuclearOpen() { return this.reactCount >= RULES.nuclearAfter; }

  get feverOn() { return this.fever > 0; }
  get cascading() { return this.chain > 0; }
  get paused() { return this.chain > 0 && this.pauseLeft > 0; }

  /* ---------- 原子を置く ---------- */
  place(key) {
    if (this.over || !key || this.cells.has(key)) return false;
    const el = this.queue.shift();
    this.queue.push(this.pick());
    if (this.hintKey) { this.hintKey = null; this.emit('hint', { key: null }); }
    this.placeAtom(el, key);
    this.schedule(RULES.tick * (this.feverOn ? 0.6 : 1));
    return true;
  }

  placeAtom(el, key) {
    const atom = { kind: 'atom', id: this.uid++, el, key, deg: 0, frag: null };
    this.cells.set(key, atom);
    this.emit('place', { id: atom.id, el, key });

    const nb = neighbors(key).map(k => this.cells.get(k))
      .filter(e => e && e.kind === 'atom' && e.deg < ELEMENTS[e.el].v);
    const best = this.bestMerge(atom, nb);
    const frag = { id: this.uid++, atoms: [atom], edges: [], touched: this.t };
    for (const n of best.with) {
      const f = this.frags.get(n.frag);
      if (f && f !== frag && this.frags.has(f.id)) {
        frag.atoms.push(...f.atoms); frag.edges.push(...f.edges); this.frags.delete(f.id);
      }
      frag.edges.push([atom.id, n.id]);
      atom.deg++; n.deg++;
      this.emit('bond', { a: atom.id, b: n.id, ka: key, kb: n.key });
    }
    for (const a of frag.atoms) a.frag = frag.id;
    this.frags.set(frag.id, frag);
    if (best.sub) this.complete(frag, best.sub, key);
  }

  // となりの原子のうち、どれと結合するかを決める
  bestMerge(atom, nb) {
    const v = ELEMENTS[atom.el].v;
    let best = { with: [], sub: null, score: 0 };
    const n = nb.length;
    for (let mask = 1; mask < (1 << n); mask++) {
      const pick = nb.filter((_, i) => mask & (1 << i));
      if (pick.length > v) continue;
      const fids = pick.map(p => p.frag);
      if (new Set(fids).size !== fids.length) continue; // 輪はつくらない
      const atoms = [atom], edges = [];
      for (const fid of fids) { const f = this.frags.get(fid); atoms.push(...f.atoms); edges.push(...f.edges); }
      for (const p of pick) edges.push([atom.id, p.id]);
      const counts = {};
      for (const a of atoms) counts[a.el] = (counts[a.el] || 0) + 1;
      if (!BUILDABLE.some(b => Object.entries(counts).every(([e, c]) => (b.counts[e] || 0) >= c))) continue;
      let sub = null;
      if (exactValence(atoms, edges)) {
        sub = matchSubstance(atoms, edges, counts);
        if (!sub) continue; // 手は埋まるが実在の形でない
      }
      const score = (sub ? 100 : 0) + atoms.length;
      if (score > best.score) best = { with: pick, sub, score };
    }
    return best;
  }

  complete(frag, subId, key) {
    for (const a of frag.atoms) this.cells.delete(a.key);
    this.frags.delete(frag.id);
    const e = this.addSub(subId, key, this.t + 0.35);
    const pts = 10 * frag.atoms.length * (this.feverOn ? 2 : 1);
    this.score += pts;
    this.emit('complete', { id: e.id, sub: subId, key, atoms: frag.atoms.map(a => ({ id: a.id, key: a.key })), edges: frag.edges, pts });
  }

  addSub(sub, key, readyAt) {
    const e = { kind: 'sub', id: this.uid++, sub, key, born: this.t, readyAt: readyAt < 0 ? 0 : readyAt };
    this.cells.set(key, e);
    if (readyAt < 0) this.emit('spawn', { id: e.id, sub, key });
    return e;
  }

  /* ---------- 原子の配り方(重み付き) ---------- */
  pick() {
    if (this.frags && this.frags.size && Math.random() < RULES.bias) {
      const want = new Set();
      for (const f of this.frags.values()) {
        const counts = {};
        for (const a of f.atoms) counts[a.el] = (counts[a.el] || 0) + 1;
        for (const el of Object.keys(ELEMENTS)) {
          if (ELEMENTS[el].late && !this.nuclearOpen) continue;
          const c = { ...counts, [el]: (counts[el] || 0) + 1 };
          if (BUILDABLE.some(b => Object.entries(c).every(([e, n]) => (b.counts[e] || 0) >= n))) want.add(el);
        }
      }
      if (want.size) { const w = [...want]; return w[Math.floor(Math.random() * w.length)]; }
    }
    const list = Object.entries(ELEMENTS).filter(([, e]) => !e.late || (this.cells && this.nuclearOpen));
    const tot = list.reduce((s, [, e]) => s + e.w, 0);
    let r = Math.random() * tot;
    for (const [el, e] of list) { r -= e.w; if (r <= 0) return el; }
    return 'H';
  }

  /* ---------- 反応 ---------- */
  schedule(dt) { if (this.tickIn < 0 || this.tickIn > dt) this.tickIn = dt; }

  tick() {
    const nuc = this.findNuclear();
    const found = this.findReactions(new Set(nuc.map(n => n.key)));
    if (!found.length && !nuc.length) {
      if (this.chain > 0) this.emit('chainEnd', { chain: this.chain });
      this.chain = 0; this.seen.clear(); this.flames = new Set();
      return;
    }
    if (this.chain === 0) this.pauseLeft = RULES.pauseMax;
    this.chain++;
    this.maxChain = Math.max(this.maxChain, this.chain);
    this.nextFlames = new Set();
    for (const n of nuc) n.type === 'fission' ? this.fission(n.key) : this.breed(n.key);
    for (const f of found) this.execute(f);
    this.flames = this.nextFlames;
    this.schedule(this.feverOn ? RULES.tickFever : RULES.tick);
  }

  findReactions(used = new Set()) {
    const out = [];
    let heatLeft = this.heat;
    const ready = k => { const e = this.cells.get(k); return e && e.kind === 'sub' && e.readyAt <= this.t && !used.has(k); };
    for (const R of BY_SIZE) {
      for (const [k, e] of this.cells) {
        if (!ready(k) || e.sub !== R.in[0]) continue;
        const need = R.in.slice(1), keys = [k];
        for (const n of neighbors(k)) {
          if (!need.length) break;
          if (!ready(n)) continue;
          const i = need.indexOf(this.cells.get(n).sub);
          if (i >= 0) { need.splice(i, 1); keys.push(n); }
        }
        if (need.length) continue;
        const on = kind => keys.some(x => SPECIAL[x] === kind);
        let ok = true;
        // 点火:加熱マス、過熱中、または直前の大きな発熱反応の炎がとなりに来ている
        if (R.cond === 'ignite') ok = on('heat') || this.feverOn || keys.some(x => this.flames.has(x) || neighbors(x).some(n => this.flames.has(n)));
        else if (R.cond === 'light') ok = on('light');
        else if (R.cond === 'cat') ok = on('cat');
        else if (R.cond === 'heat') {
          ok = on('heat') && heatLeft >= R.dH;
          if (on('heat') && !ok && this.t - this.lastHeatHint > 3) { this.lastHeatHint = this.t; this.emit('needHeat', { key: k, need: R.dH }); }
        }
        if (!ok) continue;
        if (R.dH > 0) heatLeft -= R.dH;
        keys.forEach(x => used.add(x));
        out.push({ R, keys });
      }
    }
    return out;
  }

  execute({ R, keys }) {
    const consumed = keys.map(k => { const e = this.cells.get(k); this.cells.delete(k); return { id: e.id, key: k, sub: e.sub }; });
    const slots = [...keys];
    const extra = [...new Set(keys.flatMap(k => neighbors(k)))].filter(k => !this.cells.has(k) && !slots.includes(k));
    const products = [], escapes = [...(R.esc || [])];
    const delay = (this.feverOn ? RULES.tickFever : RULES.tick) * 0.6;
    for (const p of R.out) {
      const k = slots.shift() ?? extra.shift();
      if (k) { const e = this.addSub(p, k, this.t + delay); products.push({ id: e.id, sub: p, key: k }); }
      else escapes.push(p);
    }
    if (R.dH <= -RULES.flameAt) for (const k of keys) this.nextFlames.add(k);
    if (R.dH < 0) this.addHeat(-R.dH);
    else this.heat = Math.max(0, this.heat - R.dH);
    // 同じ連鎖の中で同じ反応をくり返すと、得点は半分ずつになる(循環する反応で稼ぎ続けられないように)
    const rep = this.seen.get(R.id) || 0; this.seen.set(R.id, rep + 1);
    const pts = Math.round((60 + Math.abs(R.dH) * 0.5) * this.chain * (this.feverOn ? 2 : 1) * Math.pow(0.5, rep));
    this.score += pts;
    const first = !this.found.has(R.id);
    this.found.add(R.id);
    this.reactCount++;
    this.emit('react', { R, center: keys[0], consumed, products, escapes, pts, chain: this.chain, fever: this.feverOn, first });
    if (this.reactCount === RULES.nuclearAfter) this.emit('unlock', { els: ['U', 'Pu'] });
  }

  /* ---------- 核分裂 ----------
     燃料(UO2・PuO2)のペレットが、水(中性子の減速材)に接していて、
     別の燃料に接しているか、となりの核分裂で中性子を受けていると核分裂する。
     中性子を受けても水に接していない UO2 は、ウラン238が中性子を吸収してプルトニウムに変わる */
  findNuclear() {
    const out = [];
    for (const [k, e] of this.cells) {
      if (e.kind !== 'sub' || !SUBSTANCES[e.sub].fuel || e.readyAt > this.t) continue;
      const nb = neighbors(k).map(n => this.cells.get(n)).filter(Boolean);
      const water = nb.some(x => x.sub === 'H2O');
      const fuel = nb.some(x => x.kind === 'sub' && SUBSTANCES[x.sub].fuel);
      if (water && (fuel || e.irr)) out.push({ type: 'fission', key: k });
      else if (e.irr && e.sub === 'UO2') out.push({ type: 'breed', key: k });
      e.irr = false;
    }
    return out;
  }

  fission(key) {
    const e = this.cells.get(key);
    const N = e.sub === 'UO2' ? NUCLEAR.u_fission : NUCLEAR.pu_fission;
    const delay = (this.feverOn ? RULES.tickFever : RULES.tick) * 0.6;
    this.cells.delete(key);
    const products = [], escapes = [];
    const fp = this.addSub('FP', key, this.t + delay);
    products.push({ id: fp.id, sub: 'FP', key });
    const free = neighbors(key).filter(k => !this.cells.has(k));
    if (free.length) { const g = this.addSub(N.gas, free[Math.floor(Math.random() * free.length)], this.t + delay); products.push({ id: g.id, sub: N.gas, key: g.key }); }
    else escapes.push(N.gas);
    // 中性子がとなりの燃料に届く
    for (const n of neighbors(key)) { const x = this.cells.get(n); if (x && x.kind === 'sub' && SUBSTANCES[x.sub].fuel) x.irr = true; }
    this.nextFlames.add(key);
    this.addHeat(RULES.heatMax);
    const pts = Math.round(RULES.fissionPts * this.chain * (this.feverOn ? 2 : 1));
    this.finishNuclear(N, key, [{ id: e.id, key, sub: e.sub }], products, escapes, pts);
  }

  breed(key) {
    const e = this.cells.get(key);
    this.cells.delete(key);
    const pu = this.addSub('PuO2', key, this.t + 0.3);
    this.finishNuclear(NUCLEAR.breed, key, [{ id: e.id, key, sub: e.sub }], [{ id: pu.id, sub: 'PuO2', key }], [], 300 * this.chain);
  }

  finishNuclear(N, key, consumed, products, escapes, pts) {
    this.score += pts;
    const first = !this.found.has(N.id);
    this.found.add(N.id);
    this.reactCount++;
    this.emit('react', { R: N, center: key, consumed, products, escapes, pts, chain: this.chain, fever: this.feverOn, first });
  }

  addHeat(kj) {
    this.heat = Math.min(RULES.heatMax, this.heat + kj);
    if (this.heat >= RULES.heatMax && !this.feverOn) {
      this.fever = RULES.feverTime;
      this.emit('fever', { on: true });
    }
  }

  /* ---------- 毎フレーム ---------- */
  update(dt) {
    if (this.over) return;
    this.t += dt;
    if (this.cascading && this.pauseLeft > 0) this.pauseLeft -= dt;
    else {
      this.time = Math.max(0, this.time - dt);
      if (this.time <= 0) return this.end();
    }
    if (this.feverOn) {
      this.fever -= dt;
      this.heat = Math.max(RULES.heatMax * 0.35, this.heat - RULES.heatMax * 0.65 / RULES.feverTime * dt);
      if (this.fever <= 0) { this.fever = 0; this.emit('fever', { on: false }); }
    } else {
      this.heat = Math.max(0, this.heat - RULES.cool * dt);
    }

    if (this.tickIn >= 0) { this.tickIn -= dt; if (this.tickIn < 0) this.tick(); }
    this.waterIn -= dt;
    if (this.waterIn <= 0) {
      this.waterIn = RULES.water;
      const n = [...this.cells.values()].filter(e => e.sub === 'H2O').length;
      const free = CELLS.filter(k => !this.cells.has(k) && !SPECIAL[k]);
      if (n < RULES.waterMin && free.length > 4) {
        const e = this.addSub('H2O', free[Math.floor(Math.random() * free.length)], this.t + 0.4);
        this.emit('spawn', { id: e.id, sub: 'H2O', key: e.key, drip: true });
        this.schedule(0.5);
      }
    }
    this.reagentIn -= dt;
    if (this.reagentIn <= 0) {
      this.reagentIn = RULES.reagent;
      const free = CELLS.filter(k => !this.cells.has(k) && !SPECIAL[k]);
      const tier = TIERS.filter(t => this.reactCount >= t.after).length;
      if (tier > this.tier) { this.tier = tier; if (tier > 1) this.emit('tier', { tier }); }
      const pool = TIERS.slice(0, tier).flatMap(t => t.subs);
      if (free.length > 8) {
        const sub = pool[Math.floor(Math.random() * pool.length)];
        const e = this.addSub(sub, free[Math.floor(Math.random() * free.length)], this.t + 0.4);
        this.emit('spawn', { id: e.id, sub, key: e.key, drip: true });
        this.schedule(0.5);
      }
    }
    this.idleIn -= dt;
    if (this.idleIn <= 0) { this.idleIn = 0.8; if (this.tickIn < 0 && !this.cascading) this.tick(); this.housekeep(); }
  }

  housekeep() {
    const free = CELLS.length - this.cells.size;
    let oldest = null;
    for (const [k, e] of [...this.cells]) {
      if (e.kind === 'sub') {
        const age = this.t - e.born;
        if (FINAL.has(e.sub) && age > RULES.collectDelay) {
          this.cells.delete(k);
          const pts = 40 * (this.feverOn ? 2 : 1);
          this.score += pts;
          this.emit('collect', { id: e.id, key: k, sub: e.sub, pts });
        } else if (SUBSTANCES[e.sub].st === 'g' && age > RULES.gasLife) {
          this.cells.delete(k);
          this.emit('escape', { id: e.id, key: k, sub: e.sub });
        } else if (!oldest || e.born < oldest.born) oldest = e;
      }
    }
    for (const f of [...this.frags.values()]) {
      if (this.t - f.touched > RULES.fragLife) {
        for (const a of f.atoms) this.cells.delete(a.key);
        this.frags.delete(f.id);
        this.emit('dissolve', { atoms: f.atoms.map(a => ({ id: a.id, key: a.key })), edges: f.edges });
      }
    }
    // 気体の拡散:空いている隣のマスへ動く。1/√M に比例
    let moved = false;
    for (const e of [...this.cells.values()]) {
      if (e.kind !== 'sub' || SUBSTANCES[e.sub].st !== 'g' || e.readyAt > this.t) continue;
      const p = Math.min(0.8, RULES.diffuse * Math.sqrt(29 / SUBSTANCES[e.sub].M)) * 0.8;
      if (Math.random() > p) continue;
      const to = neighbors(e.key).filter(k => !this.cells.has(k));
      if (!to.length) continue;
      const k = to[Math.floor(Math.random() * to.length)], from = e.key;
      this.cells.delete(from); e.key = k; this.cells.set(k, e); moved = true;
      this.emit('move', { id: e.id, from, to: k });
    }
    if (moved) this.schedule(0.35);
    if (free < 3 && oldest) {
      this.cells.delete(oldest.key);
      this.emit('overflow', { id: oldest.id, key: oldest.key });
    }
  }

  end() {
    this.over = true;
    this.emit('end', { score: this.score, maxChain: this.maxChain, found: [...this.found], reactCount: this.reactCount });
  }
}

// 試薬の補給:反応の回数(after)に応じて、補給される物質が増えていく
export const TIERS = [
  { after: 0,  subs: ['O2', 'NaOHaq', 'CaO', 'H2O2', 'CH4'] },
  { after: 5,  subs: ['HClaq', 'CO2', 'NH3', 'CH3OH', 'N2', 'Cl2'] },
  { after: 12, subs: ['C2H4', 'H2S', 'SO2', 'C2H5OH', 'CO', 'NO'] },
  { after: 20, subs: ['SO3', 'NO2', 'C2H2', 'N2H4', 'NaHCO3aq', 'CH3COOH'] },
];

// 最初の連鎖の見本の配置
export const OPENING = { h: '3,-2', water: '2,-2', base: '1,0', at: '2,-1' };

/* ---------- 原子価の判定 ---------- */
// 各結合に 1〜3 重の次数を割り当てて、すべての原子の手がちょうど埋まるか
export function exactValence(atoms, edges) {
  const idx = new Map(atoms.map((a, i) => [a.id, i]));
  const need = atoms.map(a => ELEMENTS[a.el].v);
  const E = edges.map(([a, b]) => [idx.get(a), idx.get(b)]);
  const rest = need.slice();
  for (const [a, b] of E) { rest[a]--; rest[b]--; }
  if (rest.some(x => x < 0)) return false;
  // rest を、各結合に 0〜2 の上乗せで配る
  const go = i => {
    if (i === E.length) return rest.every(x => x === 0);
    const [a, b] = E[i];
    for (let k = 0; k <= 2; k++) {
      if (rest[a] < k || rest[b] < k) break;
      rest[a] -= k; rest[b] -= k;
      if (go(i + 1)) { rest[a] += k; rest[b] += k; return true; }
      rest[a] += k; rest[b] += k;
    }
    return false;
  };
  return go(0);
}

function matchSubstance(atoms, edges, counts) {
  const idx = new Map(atoms.map((a, i) => [a.id, i]));
  const sig = signature(atoms.map(a => a.el), edges.map(([a, b]) => [idx.get(a), idx.get(b)]));
  const keys = Object.keys(counts);
  const b = BUILDABLE.find(b => b.sig === sig &&
    Object.keys(b.counts).length === keys.length && keys.every(k => b.counts[k] === counts[k]));
  return b ? b.id : null;
}
