// 画面なしでルールを動かし、反応や完成が起きるか・例外が出ないかを確かめる
import { Game, exactValence, OPENING } from '../js/sim.js';
import { CELLS } from '../js/board.js';
import { REACTIONS, NUCLEAR_LIST, SUBSTANCES, BUILDABLE } from '../js/chem.js';

let ok = true;
const check = (c, msg) => { if (!c) { ok = false; console.error('NG', msg); } };

// 原子価:H2O は完成、OH は未完成、CO2 は二重結合で完成、N2 は三重結合で完成
const A = (els) => els.map((el, i) => ({ id: i, el }));
check(exactValence(A(['O', 'H', 'H']), [[0, 1], [0, 2]]), 'H2O');
check(!exactValence(A(['O', 'H']), [[0, 1]]), 'OH');
check(exactValence(A(['C', 'O', 'O']), [[0, 1], [0, 2]]), 'CO2');
check(!exactValence(A(['C', 'O']), [[0, 1]]), 'CO');
check(exactValence(A(['N', 'N']), [[0, 1]]), 'N2');

// 反応式の原子の数が合っているか(式の文字列から数える)
const count = side => {
  const c = {};
  for (let term of side.split(' + ')) {
    term = term.replace(/\((g|l|s|aq)\)/g, '').replace(/\^[+−]/g, '').trim();
    const m = term.match(/^(\d*)(.*)$/); const k = +(m[1] || 1);
    const expand = f => f.replace(/\(([^)]+)\)(\d+)/g, (_, g, n) => g.repeat(+n));
    for (const [, el, n] of expand(m[2]).matchAll(/([A-Z][a-z]?)(\d*)/g)) c[el] = (c[el] || 0) + k * (+(n || 1));
  }
  return c;
};
for (const R of REACTIONS) {
  const [l, r] = R.eq.split(/ → | ⇌ /);
  const a = count(l), b = count(r);
  // 溶けるだけの式(左辺に水がない)は水を除いて比べる
  const same = JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
  check(same, `atom balance ${R.id}: ${R.eq}`);
}

// 置いたあとに起こせる反応の数で、置く場所を選ぶ(狙って遊ぶ人の近似)
function greedy(game) {
  const free = CELLS.filter(k => !game.cells.has(k));
  let best = null, bestV = -1;
  for (const k of free) {
    const g = new Game();
    Object.assign(g, game, { listeners: [], cells: structuredClone(game.cells), frags: structuredClone(game.frags), queue: [...game.queue] });
    // frags の atoms は cells と同じ物を指す必要がある
    for (const f of g.frags.values()) f.atoms = f.atoms.map(a => g.cells.get(a.key));
    g.place(k);
    const t = g.t; g.t = 1e9; const n = g.findReactions().length; g.t = t;
    const v = n * 10 + [...g.cells.values()].filter(e => e.kind === 'atom').length * -0.1 + Math.random();
    if (v > bestV) { bestV = v; best = k; }
  }
  return best;
}

// 反応に出てくる物質がすべて定義されているか
for (const R of REACTIONS) for (const x of [...R.in, ...R.out]) check(SUBSTANCES[x], `unknown substance ${x} in ${R.id}`);
// 核反応の質量数と原子番号がそろっているか
for (const N of NUCLEAR_LIST) if (N.nucl) {
  check(N.nucl.A[0] === N.nucl.A[1], `mass number ${N.id}`);
  check(N.nucl.Z[0] === N.nucl.Z[1], `atomic number ${N.id}`);
}

// 最初の連鎖の見本:加熱マスに Cl を置くと、塩酸 → 中和 → 結晶化まで進むか
{
  const g = new Game(); const seen = [];
  g.on((t, d) => { if (t === 'react') seen.push(d.R.id); });
  g.start();
  check(g.queue[0] === 'Cl', 'opening queue starts with Cl');
  g.place(OPENING.at);
  for (let i = 0; i < 30 * 6; i++) g.update(1 / 30);
  for (const id of ['hcl_dissolve', 'neutral', 'crystallize']) check(seen.includes(id), `opening chain: ${id} (saw ${seen.join(',')})`);
}

// 核分裂:燃料2つ + 水で分裂し、となりの燃料へ中性子が届いて連鎖するか
{
  const g = new Game(); const seen = [];
  g.on((t, d) => { if (t === 'react') seen.push(d.R.id); });
  g.start();
  g.cells.clear(); g.frags.clear(); g.queue = ['H', 'H', 'H'];
  g.addSub('UO2', '0,0', 0); g.addSub('UO2', '1,0', 0); g.addSub('H2O', '0,1', 0); g.addSub('H2O', '1,1', 0);
  g.addSub('UO2', '-1,0', 0);   // 水に接していない → プルトニウムに変わる
  g.tick(); g.t += 1; g.tick(); g.t += 1; g.tick();
  check(seen.filter(x => x === 'u_fission').length >= 2, `fission chain (saw ${seen.join(',')})`);
  check(seen.includes('breed'), `breeding (saw ${seen.join(',')})`);
  check(g.feverOn, 'fission starts overheating');
}

// 核分裂は重ねるほど得点が下がり、燃料の出る数には上限がある
{
  const g = new Game(); const pts = [];
  g.on((t, d) => { if (t === 'react' && d.R.id === 'u_fission') pts.push(d.pts); });
  g.start(); g.cells.clear(); g.frags.clear();
  for (let i = 0; i < 4; i++) { g.addSub('UO2', `${i - 2},0`, 0); g.addSub('H2O', `${i - 2},1`, 0); }
  for (let i = 0; i < 6; i++) { g.tick(); g.t += 1; }
  check(pts.length >= 3 && pts.every((p, i) => i === 0 || p < pts[i - 1] * 2), `fission points decay (${pts.join(',')})`);
  const fp = [...g.cells.values()].find(e => e.sub === 'FP');
  check(fp && fp.spentUntil > g.t, 'spent fuel blocks its cell');
  const h = new Game(); h.start(); h.reactCount = 99;
  let u = 0, pu = 0;
  for (let i = 0; i < 5000; i++) { const el = h.pick(); if (el === 'U') u++; if (el === 'Pu') pu++; }
  check(u <= 3 && pu <= 2, `fuel cap (U ${u}, Pu ${pu})`);
}

// 自動プレイ
for (const mode of ['random', 'greedy']) {
let stats = { games: 0, reactions: 0, completes: 0, found: new Set(), maxChain: 0, fevers: 0, score: 0 };
for (let g = 0; g < (mode === 'greedy' ? 12 : 60); g++) {
  const game = new Game();
  game.on((type, d) => {
    if (type === 'react') { stats.reactions++; stats.found.add(d.R.id); }
    if (type === 'complete') stats.completes++;
    if (type === 'fever' && d.on) stats.fevers++;
  });
  game.start();
  let steps = 0;
  while (!game.over && steps < 20000) {
    if (steps % 24 === 0) {
      const free = CELLS.filter(k => !game.cells.has(k));
      // 組み立て中の原子の隣を優先して置く(人の遊び方に少し近づける)
      if (free.length) game.place(mode === 'greedy' ? greedy(game) : free[Math.floor(Math.random() * free.length)]);
    }
    game.update(1 / 30);
    steps++;
  }
  check(game.over, 'game should end within the time limit');
  stats.games++; stats.maxChain = Math.max(stats.maxChain, game.maxChain); stats.score += game.score;
}
console.log(mode, 'games', stats.games, 'avg score', Math.round(stats.score / stats.games),
  'reactions/game', (stats.reactions / stats.games).toFixed(1), 'completes/game', (stats.completes / stats.games).toFixed(1),
  'max chain', stats.maxChain, 'fevers', stats.fevers);
console.log('reactions seen', stats.found.size, '/', REACTIONS.length, [...REACTIONS.map(r => r.id).filter(i => !stats.found.has(i))].join(' ') || '');
}
console.log(ok ? 'OK' : 'FAILED');
process.exit(ok ? 0 : 1);
