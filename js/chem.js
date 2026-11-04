// 元素・物質・反応のデータ
// 熱量は 25 °C・1 bar の標準生成エンタルピー(NBS/CODATA の表)から計算した値を整数に丸めたもの。
// 単純化の方針は docs/chemistry.md にまとめている。

// v:結合の手の数(原子価) w:出やすさ(重み)
export const ELEMENTS = {
  H:  { z: 1,  v: 1, mass: '1.008',  col: '#efe6d3', ink: '#2f3a44', w: 22, name: '水素' },
  C:  { z: 6,  v: 4, mass: '12.011', col: '#2a3138', ink: '#efe6d3', w: 9,  name: '炭素' },
  N:  { z: 7,  v: 3, mass: '14.007', col: '#3f7fd0', ink: '#f3efe6', w: 8,  name: '窒素' },
  O:  { z: 8,  v: 2, mass: '15.999', col: '#e0583a', ink: '#fff3e6', w: 20, name: '酸素' },
  Na: { z: 11, v: 1, mass: '22.990', col: '#e9c24a', ink: '#2f3a44', w: 9,  name: 'ナトリウム' },
  Cl: { z: 17, v: 1, mass: '35.45',  col: '#b8cc3c', ink: '#2f3a44', w: 11, name: '塩素' },
  Ca: { z: 20, v: 2, mass: '40.078', col: '#c4ccd0', ink: '#2f3a44', w: 7,  name: 'カルシウム' },
};

const mol = (atoms, edges) => ({ atoms: atoms.split(' '), edges });

// st:状態(g 気体 / l 液体 / s 固体 / aq 水溶液)
// form:盤の上での姿(bubble 気泡 / drop しずく / crystal 立方体の結晶 / rhomb 菱面体の結晶 / powder 粉 / pellets 粒 / lump かたまり)
// mol があるものは原子から組み立てられる。M はモル質量(g/mol)で、気泡の浮く高さに使う
export const SUBSTANCES = {
  H2:    { name: '水素',             f: 'H2',      st: 'g',  form: 'bubble', M: 2.016, mol: mol('H H', [[0, 1]]) },
  O2:    { name: '酸素',             f: 'O2',      st: 'g',  form: 'bubble', M: 32.00, mol: mol('O O', [[0, 1]]) },
  N2:    { name: '窒素',             f: 'N2',      st: 'g',  form: 'bubble', M: 28.01, mol: mol('N N', [[0, 1]]) },
  Cl2:   { name: '塩素',             f: 'Cl2',     st: 'g',  form: 'bubble', M: 70.90, mol: mol('Cl Cl', [[0, 1]]), color: 0xc6d64a, opacity: 0.62 },
  HCl:   { name: '塩化水素',         f: 'HCl',     st: 'g',  form: 'bubble', M: 36.46, mol: mol('H Cl', [[0, 1]]) },
  NH3:   { name: 'アンモニア',       f: 'NH3',     st: 'g',  form: 'bubble', M: 17.03, mol: mol('N H H H', [[0, 1], [0, 2], [0, 3]]) },
  CH4:   { name: 'メタン',           f: 'CH4',     st: 'g',  form: 'bubble', M: 16.04, mol: mol('C H H H H', [[0, 1], [0, 2], [0, 3], [0, 4]]) },
  CO2:   { name: '二酸化炭素',       f: 'CO2',     st: 'g',  form: 'bubble', M: 44.01, mol: mol('C O O', [[0, 1], [0, 2]]) },
  H2O:   { name: '水',               f: 'H2O',     st: 'l',  form: 'drop', color: 0x9ad3e6, mol: mol('O H H', [[0, 1], [0, 2]]) },
  H2O2:  { name: '過酸化水素',       f: 'H2O2',    st: 'l',  form: 'drop', color: 0xd9eef0, mol: mol('O O H H', [[0, 1], [0, 2], [1, 3]]) },
  NaCl:  { name: '食塩',             f: 'NaCl',    st: 's',  form: 'crystal', color: 0xf4efe6, mol: mol('Na Cl', [[0, 1]]) },
  NaOH:  { name: '水酸化ナトリウム', f: 'NaOH',    st: 's',  form: 'pellets', color: 0xf1ede4, mol: mol('Na O H', [[0, 1], [1, 2]]) },
  CaO:   { name: '酸化カルシウム',   f: 'CaO',     st: 's',  form: 'lump', color: 0xe9e4d8, mol: mol('Ca O', [[0, 1]]) },
  CaCl2: { name: '塩化カルシウム',   f: 'CaCl2',   st: 's',  form: 'pellets', color: 0xe7ebe9, mol: mol('Ca Cl Cl', [[0, 1], [0, 2]]) },

  HClaq:   { name: '塩酸',                     f: 'HCl',     st: 'aq', form: 'drop', color: 0xe8653a },
  NaOHaq:  { name: '水酸化ナトリウム水溶液',   f: 'NaOH',    st: 'aq', form: 'drop', color: 0x3f82d6 },
  NaClaq:  { name: '食塩水',                   f: 'NaCl',    st: 'aq', form: 'drop', color: 0x9ad3e6, inner: 'cube' },
  H2CO3aq: { name: '炭酸水',                   f: 'H2CO3',   st: 'aq', form: 'drop', color: 0xbfe3ea, inner: 'fizz' },
  NH3aq:   { name: 'アンモニア水',             f: 'NH3',     st: 'aq', form: 'drop', color: 0x86b8ea },
  CaCl2aq: { name: '塩化カルシウム水溶液',     f: 'CaCl2',   st: 'aq', form: 'drop', color: 0x9ad3e6, inner: 'speck' },
  NH4Cl:   { name: '塩化アンモニウム',         f: 'NH4Cl',   st: 's',  form: 'powder', color: 0xf6f3ec },
  CaOH2:   { name: '水酸化カルシウム',         f: 'Ca(OH)2', st: 's',  form: 'powder', color: 0xebe7dd },
  CaCO3:   { name: '炭酸カルシウム',           f: 'CaCO3',   st: 's',  form: 'rhomb', color: 0xf0ebe0 },
};

// in:反応物(先頭が中心。ほかは中心の隣にあればよい) out:生成物 esc:盤に残らず抜ける生成物
// cond:none 条件なし / ignite 点火(加熱マスか臨界中) / heat 加熱マスで熱を使う / light 光のマス / cat 触媒のマス
// dH:反応エンタルピー(kJ、式の係数どおりの量)
export const REACTIONS = [
  { id: 'ch4_burn', in: ['CH4', 'O2', 'O2'], out: ['CO2', 'H2O', 'H2O'], cond: 'ignite', dH: -890,
    name: 'メタンの燃焼', eq: 'CH4(g) + 2O2(g) → CO2(g) + 2H2O(l)' },
  { id: 'h2_burn', in: ['O2', 'H2', 'H2'], out: ['H2O', 'H2O'], cond: 'ignite', dH: -572,
    name: '水素の燃焼', eq: '2H2(g) + O2(g) → 2H2O(l)' },
  { id: 'h2o2_dec', in: ['H2O2', 'H2O2'], out: ['H2O', 'H2O', 'O2'], cond: 'cat', dH: -196,
    name: '過酸化水素の分解', eq: '2H2O2(l) → 2H2O(l) + O2(g)', note: '実際には二酸化マンガンなどの触媒を使う' },
  { id: 'photo_hcl', in: ['H2', 'Cl2'], out: ['HCl', 'HCl'], cond: 'light', dH: -185,
    name: '光による塩化水素の生成', eq: 'H2(g) + Cl2(g) → 2HCl(g)', note: '光が当たると爆発的に進む' },
  { id: 'nh4cl', in: ['NH3', 'HCl'], out: ['NH4Cl'], cond: 'none', dH: -176,
    name: '塩化アンモニウムの白煙', eq: 'NH3(g) + HCl(g) → NH4Cl(s)' },
  { id: 'carbonate', in: ['CaOH2', 'CO2'], out: ['CaCO3', 'H2O'], cond: 'none', dH: -115,
    name: '炭酸カルシウムの生成', eq: 'Ca(OH)2(s) + CO2(g) → CaCO3(s) + H2O(l)', note: '石灰水が白くにごるのと同じ反応' },
  { id: 'haber', in: ['N2', 'H2', 'H2', 'H2'], out: ['NH3', 'NH3'], cond: 'cat', dH: -92,
    name: 'アンモニアの合成', eq: 'N2(g) + 3H2(g) → 2NH3(g)', note: '実際には鉄の触媒と高温・高圧が必要' },
  { id: 'cacl2_dissolve', in: ['CaCl2', 'H2O'], out: ['CaCl2aq'], cond: 'none', dH: -82,
    name: '塩化カルシウムが溶ける', eq: 'CaCl2(s) → CaCl2(aq)', note: '溶けると温かくなる。融雪剤に使われる' },
  { id: 'hcl_dissolve', in: ['HCl', 'H2O'], out: ['HClaq'], cond: 'none', dH: -75,
    name: '塩化水素が水に溶ける', eq: 'HCl(g) + H2O(l) → H3O^+(aq) + Cl^−(aq)' },
  { id: 'slake', in: ['CaO', 'H2O'], out: ['CaOH2'], cond: 'none', dH: -65,
    name: '生石灰と水', eq: 'CaO(s) + H2O(l) → Ca(OH)2(s)', note: '発熱するので、食品の加熱剤に使われる' },
  { id: 'neutral', in: ['HClaq', 'NaOHaq'], out: ['NaClaq', 'H2O'], cond: 'none', dH: -56,
    name: '中和', eq: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H2O(l)' },
  { id: 'naoh_dissolve', in: ['NaOH', 'H2O'], out: ['NaOHaq'], cond: 'none', dH: -45,
    name: '水酸化ナトリウムが溶ける', eq: 'NaOH(s) → Na^+(aq) + OH^−(aq)' },
  { id: 'nh3_dissolve', in: ['NH3', 'H2O'], out: ['NH3aq'], cond: 'none', dH: -34,
    name: 'アンモニアが水に溶ける', eq: 'NH3(g) → NH3(aq)' },
  { id: 'co2_dissolve', in: ['CO2', 'H2O'], out: ['H2CO3aq'], cond: 'none', dH: -20,
    name: '二酸化炭素が水に溶ける', eq: 'CO2(g) + H2O(l) ⇌ H2CO3(aq)' },
  { id: 'caco3_acid', in: ['CaCO3', 'HClaq', 'HClaq'], out: ['CaCl2aq', 'H2O', 'CO2'], cond: 'none', dH: -14,
    name: '石灰石と塩酸', eq: 'CaCO3(s) + 2HCl(aq) → CaCl2(aq) + H2O(l) + CO2(g)' },
  { id: 'degas', in: ['H2CO3aq'], out: ['H2O', 'CO2'], cond: 'heat', dH: 20,
    name: '加熱で二酸化炭素が抜ける', eq: 'H2CO3(aq) → H2O(l) + CO2(g)' },
  { id: 'crystallize', in: ['NaClaq'], out: ['NaCl'], esc: ['H2O(g)'], cond: 'heat', dH: 40,
    name: '水を蒸発させて結晶化', eq: 'NaCl(aq) → NaCl(s)', note: '溶媒の水 1 mol を蒸発させる熱として計算(水の蒸発熱 44 kJ/mol と溶解熱 +4 kJ/mol から)' },
  { id: 'calcine', in: ['CaCO3'], out: ['CaO', 'CO2'], cond: 'heat', dH: 179,
    name: '石灰石の熱分解', eq: 'CaCO3(s) → CaO(s) + CO2(g)', note: '実際には約 900 °C まで加熱する' },
];

// それ以上反応しない物質:できたら回収される
const AS_REACTANT = new Set(REACTIONS.flatMap(r => r.in));
export const FINAL = new Set(Object.keys(SUBSTANCES).filter(k => !AS_REACTANT.has(k)));

// 原子から組み立てられる物質
export const BUILDABLE = Object.entries(SUBSTANCES).filter(([, s]) => s.mol).map(([id, s]) => {
  const counts = {};
  for (const a of s.mol.atoms) counts[a] = (counts[a] || 0) + 1;
  return { id, counts, sig: signature(s.mol.atoms, s.mol.edges) };
});

// つながり方の指紋:各原子の「元素:となりの元素」を並べたもの
export function signature(atoms, edges) {
  const nb = atoms.map(() => []);
  for (const [a, b] of edges) { nb[a].push(atoms[b]); nb[b].push(atoms[a]); }
  return atoms.map((el, i) => el + ':' + nb[i].sort().join('')).sort().join('|');
}

// 'H2O' → 'H<sub>2</sub>O'、'H3O^+' → 'H<sub>3</sub>O<sup>+</sup>'
export function fmt(s) {
  return s
    .replace(/\^([+−])/g, '<sup>$1</sup>')
    .replace(/([A-Za-z)])(\d+)/g, '$1<sub>$2</sub>');
}

const ST = { g: '(g)', l: '(l)', s: '(s)', aq: '(aq)' };
export const formulaHTML = id => fmt(SUBSTANCES[id].f) + ST[SUBSTANCES[id].st];
