// 元素・物質・反応のデータ
// 熱量は 25 °C・1 bar の標準生成エンタルピー(NBS 化学熱力学表)から計算し、整数に丸めた値。
// 単純化の方針は docs/chemistry.md にまとめている。

// v:結合の手の数(原子価) w:出やすさ(重み) late:反応を何回か起こしてから出はじめる
export const ELEMENTS = {
  H:  { z: 1,  v: 1, mass: '1.008',  col: '#efe6d3', ink: '#2f3a44', w: 22, name: '水素' },
  C:  { z: 6,  v: 4, mass: '12.011', col: '#2a3138', ink: '#efe6d3', w: 10, name: '炭素' },
  N:  { z: 7,  v: 3, mass: '14.007', col: '#3f7fd0', ink: '#f3efe6', w: 8,  name: '窒素' },
  O:  { z: 8,  v: 2, mass: '15.999', col: '#e0583a', ink: '#fff3e6', w: 20, name: '酸素' },
  Na: { z: 11, v: 1, mass: '22.990', col: '#9fb6c3', ink: '#2f3a44', w: 8,  name: 'ナトリウム' },
  S:  { z: 16, v: 2, mass: '32.06',  col: '#e8cf45', ink: '#2f3a44', w: 6,  name: '硫黄' },
  Cl: { z: 17, v: 1, mass: '35.45',  col: '#b8cc3c', ink: '#2f3a44', w: 11, name: '塩素' },
  Ca: { z: 20, v: 2, mass: '40.078', col: '#b5a79a', ink: '#2f3a44', w: 6,  name: 'カルシウム' },
  U:  { z: 92, v: 4, mass: '238.03', col: '#3d4a33', ink: '#e9e4c8', w: 1.4, late: true, name: 'ウラン' },
  Pu: { z: 94, v: 4, mass: '(244)',  col: '#6e5a33', ink: '#f1e8d2', w: 0.8, late: true, name: 'プルトニウム' },
};

const mol = (atoms, edges) => ({ atoms: atoms.split(' '), edges });
const STAR = (center, n) => Array.from({ length: n }, (_, i) => [center, i + 1]);

// st:状態(g 気体 / l 液体 / s 固体 / aq 水溶液)
// form:盤の上での姿(bubble 気泡 / drop しずく / crystal 立方体の結晶 / rhomb 菱面体の結晶 / powder 粉 / pellets 粒 / lump かたまり / pellet 燃料ペレット)
// mol があるものは原子から組み立てられる。M はモル質量(g/mol)で、気泡の浮く高さと拡散の速さに使う
export const SUBSTANCES = {
  // ---- 原子から組み立てられる物質 ----
  H2:     { name: '水素',             f: 'H2',     st: 'g', form: 'bubble', M: 2.016, mol: mol('H H', [[0, 1]]) },
  O2:     { name: '酸素',             f: 'O2',     st: 'g', form: 'bubble', M: 32.00, mol: mol('O O', [[0, 1]]) },
  N2:     { name: '窒素',             f: 'N2',     st: 'g', form: 'bubble', M: 28.01, mol: mol('N N', [[0, 1]]) },
  Cl2:    { name: '塩素',             f: 'Cl2',    st: 'g', form: 'bubble', M: 70.90, mol: mol('Cl Cl', [[0, 1]]), color: 0xc6d64a, opacity: 0.62 },
  HCl:    { name: '塩化水素',         f: 'HCl',    st: 'g', form: 'bubble', M: 36.46, mol: mol('H Cl', [[0, 1]]) },
  NH3:    { name: 'アンモニア',       f: 'NH3',    st: 'g', form: 'bubble', M: 17.03, mol: mol('N H H H', STAR(0, 3)) },
  CH4:    { name: 'メタン',           f: 'CH4',    st: 'g', form: 'bubble', M: 16.04, mol: mol('C H H H H', STAR(0, 4)) },
  CO2:    { name: '二酸化炭素',       f: 'CO2',    st: 'g', form: 'bubble', M: 44.01, mol: mol('C O O', STAR(0, 2)) },
  H2S:    { name: '硫化水素',         f: 'H2S',    st: 'g', form: 'bubble', M: 34.08, mol: mol('S H H', STAR(0, 2)) },
  C2H2:   { name: 'アセチレン',       f: 'C2H2',   st: 'g', form: 'bubble', M: 26.04, mol: mol('C C H H', [[0, 1], [0, 2], [1, 3]]) },
  C2H4:   { name: 'エチレン',         f: 'C2H4',   st: 'g', form: 'bubble', M: 28.05, mol: mol('C C H H H H', [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5]]) },
  CH2O:   { name: 'ホルムアルデヒド', f: 'CH2O',   st: 'g', form: 'bubble', M: 30.03, mol: mol('C O H H', STAR(0, 3)) },
  H2O:    { name: '水',               f: 'H2O',    st: 'l', form: 'drop', color: 0x9ad3e6, mol: mol('O H H', STAR(0, 2)) },
  H2O2:   { name: '過酸化水素',       f: 'H2O2',   st: 'l', form: 'drop', color: 0xd9eef0, mol: mol('O O H H', [[0, 1], [0, 2], [1, 3]]) },
  CH3OH:  { name: 'メタノール',       f: 'CH3OH',  st: 'l', form: 'drop', color: 0xdfeaf0, mol: mol('C O H H H H', [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5]]) },
  N2H4:   { name: 'ヒドラジン',       f: 'N2H4',   st: 'l', form: 'drop', color: 0xe4ecef, mol: mol('N N H H H H', [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5]]) },
  NaCl:   { name: '食塩',             f: 'NaCl',   st: 's', form: 'crystal', color: 0xf4efe6, mol: mol('Na Cl', [[0, 1]]) },
  NaOH:   { name: '水酸化ナトリウム', f: 'NaOH',   st: 's', form: 'pellets', color: 0xf1ede4, mol: mol('Na O H', [[0, 1], [1, 2]]) },
  CaO:    { name: '酸化カルシウム',   f: 'CaO',    st: 's', form: 'lump', color: 0xe9e4d8, mol: mol('Ca O', [[0, 1]]) },
  CaCl2:  { name: '塩化カルシウム',   f: 'CaCl2',  st: 's', form: 'pellets', color: 0xe7ebe9, mol: mol('Ca Cl Cl', STAR(0, 2)) },
  UO2:    { name: '二酸化ウラン',     f: 'UO2',    st: 's', form: 'pellet', color: 0x2b2a27, mol: mol('U O O', STAR(0, 2)), fuel: true },
  PuO2:   { name: '二酸化プルトニウム', f: 'PuO2', st: 's', form: 'pellet', color: 0x6b5a2a, mol: mol('Pu O O', STAR(0, 2)), fuel: true },

  // ---- 反応でできる物質 ----
  CO:      { name: '一酸化炭素',             f: 'CO',       st: 'g',  form: 'bubble', M: 28.01 },
  NO:      { name: '一酸化窒素',             f: 'NO',       st: 'g',  form: 'bubble', M: 30.01 },
  NO2:     { name: '二酸化窒素',             f: 'NO2',      st: 'g',  form: 'bubble', M: 46.01, color: 0xb5562e, opacity: 0.66 },
  SO2:     { name: '二酸化硫黄',             f: 'SO2',      st: 'g',  form: 'bubble', M: 64.07 },
  SO3:     { name: '三酸化硫黄',             f: 'SO3',      st: 'g',  form: 'bubble', M: 80.06 },
  C2H6:    { name: 'エタン',                 f: 'C2H6',     st: 'g',  form: 'bubble', M: 30.07 },
  CH3Cl:   { name: 'クロロメタン',           f: 'CH3Cl',    st: 'g',  form: 'bubble', M: 50.49 },
  C2H5OH:  { name: 'エタノール',             f: 'C2H5OH',   st: 'l',  form: 'drop', color: 0xe2edf0 },
  CH3COOH: { name: '酢酸',                   f: 'CH3COOH',  st: 'l',  form: 'drop', color: 0xece4cf },
  EtOAc:   { name: '酢酸エチル',             f: 'CH3COOC2H5', st: 'l', form: 'drop', color: 0xf0e6c4 },
  HClaq:   { name: '塩酸',                   f: 'HCl',      st: 'aq', form: 'drop', color: 0xe8653a },
  H2SO4aq: { name: '硫酸',                   f: 'H2SO4',    st: 'aq', form: 'drop', color: 0xd84a2e },
  HNO3aq:  { name: '硝酸',                   f: 'HNO3',     st: 'aq', form: 'drop', color: 0xeb7d45 },
  NaOHaq:  { name: '水酸化ナトリウム水溶液', f: 'NaOH',     st: 'aq', form: 'drop', color: 0x3f82d6 },
  NH3aq:   { name: 'アンモニア水',           f: 'NH3',      st: 'aq', form: 'drop', color: 0x86b8ea },
  NaHCO3aq:{ name: '炭酸水素ナトリウム水溶液', f: 'NaHCO3', st: 'aq', form: 'drop', color: 0x9cc6e3, inner: 'speck' },
  H2CO3aq: { name: '炭酸水',                 f: 'H2CO3',    st: 'aq', form: 'drop', color: 0xbfe3ea, inner: 'fizz' },
  NaClaq:  { name: '食塩水',                 f: 'NaCl',     st: 'aq', form: 'drop', color: 0x9ad3e6, inner: 'cube' },
  NaClOaq: { name: '次亜塩素酸ナトリウム水溶液', f: 'NaClO', st: 'aq', form: 'drop', color: 0xd7e6a8 },
  CaCl2aq: { name: '塩化カルシウム水溶液',   f: 'CaCl2',    st: 'aq', form: 'drop', color: 0x9ad3e6, inner: 'speck' },
  Na2SO4aq:{ name: '硫酸ナトリウム水溶液',   f: 'Na2SO4',   st: 'aq', form: 'drop', color: 0x9ad3e6, inner: 'speck' },
  NaNO3aq: { name: '硝酸ナトリウム水溶液',   f: 'NaNO3',    st: 'aq', form: 'drop', color: 0x9ad3e6, inner: 'speck' },
  AcONaaq: { name: '酢酸ナトリウム水溶液',   f: 'CH3COONa', st: 'aq', form: 'drop', color: 0x9ad3e6, inner: 'speck' },
  NH4NO3aq:{ name: '硝酸アンモニウム水溶液', f: 'NH4NO3',   st: 'aq', form: 'drop', color: 0x9ad3e6, inner: 'speck' },
  AmSO4aq: { name: '硫酸アンモニウム水溶液', f: '(NH4)2SO4', st: 'aq', form: 'drop', color: 0x9ad3e6, inner: 'speck' },
  S:       { name: '硫黄',                   f: 'S',        st: 's',  form: 'rhomb', color: 0xe8cf45 },
  NH4Cl:   { name: '塩化アンモニウム',       f: 'NH4Cl',    st: 's',  form: 'powder', color: 0xf6f3ec },
  CaOH2:   { name: '水酸化カルシウム',       f: 'Ca(OH)2',  st: 's',  form: 'powder', color: 0xebe7dd },
  CaCO3:   { name: '炭酸カルシウム',         f: 'CaCO3',    st: 's',  form: 'rhomb', color: 0xf0ebe0 },
  CaSO4:   { name: '硫酸カルシウム',         f: 'CaSO4',    st: 's',  form: 'powder', color: 0xf3f1ea },

  // ---- 核分裂でできる物質 ----
  FP:      { name: '核分裂生成物',           f: 'FP',       st: 's',  form: 'pellet', color: 0x5d5a55, glow: true, nf: '核分裂生成物' },
  Kr:      { name: 'クリプトン',             f: 'Kr',       st: 'g',  form: 'bubble', M: 83.80 },
  Xe:      { name: 'キセノン',               f: 'Xe',       st: 'g',  form: 'bubble', M: 131.29 },
};

// in:反応物(先頭が中心。ほかは中心の隣にあればよい) out:生成物 esc:盤に残らず抜ける生成物
// cond:none 条件なし / ignite 点火(加熱マスか過熱中) / heat 加熱マスで熱を使う / light 光のマス / cat 触媒のマス
// dH:反応エンタルピー(kJ、式の係数どおりの量)。cond が none で dH が正のものは、まわりの熱を奪って自然に進む
export const REACTIONS = [
  // 燃焼
  { id: 'c2h4_burn', in: ['C2H4', 'O2', 'O2', 'O2'], out: ['CO2', 'CO2', 'H2O', 'H2O'], cond: 'ignite', dH: -1411,
    name: 'エチレンの燃焼', eq: 'C2H4(g) + 3O2(g) → 2CO2(g) + 2H2O(l)' },
  { id: 'etoh_burn', in: ['C2H5OH', 'O2', 'O2', 'O2'], out: ['CO2', 'CO2', 'H2O', 'H2O', 'H2O'], cond: 'ignite', dH: -1367,
    name: 'エタノールの燃焼', eq: 'C2H5OH(l) + 3O2(g) → 2CO2(g) + 3H2O(l)' },
  { id: 'h2s_burn', in: ['O2', 'H2S', 'H2S', 'O2', 'O2'], out: ['SO2', 'SO2', 'H2O', 'H2O'], cond: 'ignite', dH: -1124,
    name: '硫化水素の燃焼', eq: '2H2S(g) + 3O2(g) → 2SO2(g) + 2H2O(l)' },
  { id: 'ch4_burn', in: ['CH4', 'O2', 'O2'], out: ['CO2', 'H2O', 'H2O'], cond: 'ignite', dH: -890,
    name: 'メタンの燃焼', eq: 'CH4(g) + 2O2(g) → CO2(g) + 2H2O(l)' },
  { id: 'hydrazine_burn', in: ['N2H4', 'O2'], out: ['N2', 'H2O', 'H2O'], cond: 'ignite', dH: -622,
    name: 'ヒドラジンの燃焼', eq: 'N2H4(l) + O2(g) → N2(g) + 2H2O(l)', note: 'ロケットや人工衛星の燃料に使われる' },
  { id: 'h2_burn', in: ['O2', 'H2', 'H2'], out: ['H2O', 'H2O'], cond: 'ignite', dH: -572,
    name: '水素の燃焼', eq: '2H2(g) + O2(g) → 2H2O(l)' },
  { id: 'co_burn', in: ['O2', 'CO', 'CO'], out: ['CO2', 'CO2'], cond: 'ignite', dH: -566,
    name: '一酸化炭素の燃焼', eq: '2CO(g) + O2(g) → 2CO2(g)' },
  { id: 's_burn', in: ['S', 'O2'], out: ['SO2'], cond: 'ignite', dH: -297,
    name: '硫黄の燃焼', eq: 'S(s) + O2(g) → SO2(g)', note: '青い炎を上げて燃える' },

  // 有機化学
  { id: 'etoh_ox', in: ['C2H5OH', 'O2'], out: ['CH3COOH', 'H2O'], cond: 'cat', dH: -493,
    name: 'エタノールの酸化(酢の生成)', eq: 'C2H5OH(l) + O2(g) → CH3COOH(l) + H2O(l)', note: '酢は酢酸菌の酵素がこの反応を進めてできる' },
  { id: 'meoh_ox', in: ['O2', 'CH3OH', 'CH3OH'], out: ['CH2O', 'CH2O', 'H2O', 'H2O'], cond: 'cat', dH: -311,
    name: 'メタノールの酸化', eq: '2CH3OH(l) + O2(g) → 2CH2O(g) + 2H2O(l)', note: '工業では銀の触媒を使う' },
  { id: 'acetylene_h2', in: ['C2H2', 'H2'], out: ['C2H4'], cond: 'cat', dH: -174,
    name: 'アセチレンへの水素付加', eq: 'C2H2(g) + H2(g) → C2H4(g)', note: '触媒はパラジウムなど' },
  { id: 'ethylene_h2', in: ['C2H4', 'H2'], out: ['C2H6'], cond: 'cat', dH: -137,
    name: 'エチレンへの水素付加', eq: 'C2H4(g) + H2(g) → C2H6(g)', note: '触媒はニッケルや白金など' },
  { id: 'acetic', in: ['CH3OH', 'CO'], out: ['CH3COOH'], cond: 'cat', dH: -135,
    name: '酢酸の合成', eq: 'CH3OH(l) + CO(g) → CH3COOH(l)', note: '工業ではロジウムやイリジウムの触媒を使う' },
  { id: 'meoh_synth', in: ['CO', 'H2', 'H2'], out: ['CH3OH'], cond: 'cat', dH: -128,
    name: 'メタノールの合成', eq: 'CO(g) + 2H2(g) → CH3OH(l)', note: '工業では銅と亜鉛の触媒、高圧で行う' },
  { id: 'ch3cl', in: ['CH4', 'Cl2'], out: ['CH3Cl', 'HCl'], cond: 'light', dH: -98,
    name: 'メタンの塩素化', eq: 'CH4(g) + Cl2(g) → CH3Cl(g) + HCl(g)', note: '光で塩素が原子に分かれて進む' },
  { id: 'ethylene_hyd', in: ['C2H4', 'H2O'], out: ['C2H5OH'], cond: 'cat', dH: -44,
    name: 'エタノールの合成', eq: 'C2H4(g) + H2O(l) → C2H5OH(l)', note: '工業ではリン酸の触媒を使う' },
  { id: 'ester', in: ['CH3COOH', 'C2H5OH'], out: ['EtOAc', 'H2O'], cond: 'cat', dH: -3,
    name: 'エステル化', eq: 'CH3COOH(l) + C2H5OH(l) ⇌ CH3COOC2H5(l) + H2O(l)', note: '触媒は濃硫酸。果物のような香りがする' },
  { id: 'meoh_dec', in: ['CH3OH'], out: ['CO', 'H2', 'H2'], cond: 'heat', dH: 128,
    name: 'メタノールの分解', eq: 'CH3OH(l) → CO(g) + 2H2(g)' },

  // 硫黄と窒素
  { id: 'claus', in: ['SO2', 'H2S', 'H2S'], out: ['S', 'S', 'S', 'H2O', 'H2O'], cond: 'cat', dH: -234,
    name: '硫黄の回収(クラウス法)', eq: '2H2S(g) + SO2(g) → 3S(s) + 2H2O(l)', note: '石油の精製で出る硫化水素から硫黄を取り出す' },
  { id: 'so3_water', in: ['SO3', 'H2O'], out: ['H2SO4aq'], cond: 'none', dH: -228,
    name: '硫酸の生成', eq: 'SO3(g) + H2O(l) → H2SO4(aq)' },
  { id: 'contact', in: ['O2', 'SO2', 'SO2'], out: ['SO3', 'SO3'], cond: 'cat', dH: -198,
    name: '接触法', eq: '2SO2(g) + O2(g) → 2SO3(g)', note: '触媒は酸化バナジウム(V)' },
  { id: 'am_sulfate', in: ['H2SO4aq', 'NH3', 'NH3'], out: ['AmSO4aq'], cond: 'none', dH: -173,
    name: '硫酸アンモニウム(肥料)の生成', eq: '2NH3(g) + H2SO4(aq) → (NH4)2SO4(aq)' },
  { id: 'no2_water', in: ['H2O', 'NO2', 'NO2', 'NO2'], out: ['HNO3aq', 'HNO3aq', 'NO'], cond: 'none', dH: -138,
    name: '硝酸の生成', eq: '3NO2(g) + H2O(l) → 2HNO3(aq) + NO(g)' },
  { id: 'no_ox', in: ['O2', 'NO', 'NO'], out: ['NO2', 'NO2'], cond: 'none', dH: -114,
    name: '一酸化窒素の酸化', eq: '2NO(g) + O2(g) → 2NO2(g)', note: '無色の気体が赤褐色に変わる' },
  { id: 'gypsum', in: ['CaOH2', 'H2SO4aq'], out: ['CaSO4', 'H2O', 'H2O'], cond: 'none', dH: -110,
    name: '石こうの生成', eq: 'Ca(OH)2(s) + H2SO4(aq) → CaSO4(s) + 2H2O(l)' },
  { id: 'h2so4_naoh', in: ['H2SO4aq', 'NaOHaq', 'NaOHaq'], out: ['Na2SO4aq', 'H2O', 'H2O'], cond: 'none', dH: -109,
    name: '硫酸の中和', eq: 'H2SO4(aq) + 2NaOH(aq) → Na2SO4(aq) + 2H2O(l)' },
  { id: 'nh4no3', in: ['HNO3aq', 'NH3'], out: ['NH4NO3aq'], cond: 'none', dH: -86,
    name: '硝酸アンモニウム(肥料)の生成', eq: 'NH3(g) + HNO3(aq) → NH4NO3(aq)' },
  { id: 'hno3_naoh', in: ['HNO3aq', 'NaOHaq'], out: ['NaNO3aq', 'H2O'], cond: 'none', dH: -56,
    name: '硝酸の中和', eq: 'HNO3(aq) + NaOH(aq) → NaNO3(aq) + H2O(l)' },
  { id: 'n2_o2', in: ['N2', 'O2'], out: ['NO', 'NO'], cond: 'heat', dH: 181,
    name: '窒素の酸化', eq: 'N2(g) + O2(g) → 2NO(g)', note: '雷やエンジンの中のような高温で起こる' },

  // 無機化学
  { id: 'h2o2_dec', in: ['H2O2', 'H2O2'], out: ['H2O', 'H2O', 'O2'], cond: 'cat', dH: -196,
    name: '過酸化水素の分解', eq: '2H2O2(l) → 2H2O(l) + O2(g)', note: '実際には二酸化マンガンなどの触媒を使う' },
  { id: 'photo_hcl', in: ['H2', 'Cl2'], out: ['HCl', 'HCl'], cond: 'light', dH: -185,
    name: '光による塩化水素の生成', eq: 'H2(g) + Cl2(g) → 2HCl(g)', note: '光が当たると爆発的に進む' },
  { id: 'nh4cl', in: ['NH3', 'HCl'], out: ['NH4Cl'], cond: 'none', dH: -176,
    name: '塩化アンモニウムの白煙', eq: 'NH3(g) + HCl(g) → NH4Cl(s)' },
  { id: 'carbonate', in: ['CaOH2', 'CO2'], out: ['CaCO3', 'H2O'], cond: 'none', dH: -113,
    name: '炭酸カルシウムの生成', eq: 'Ca(OH)2(s) + CO2(g) → CaCO3(s) + H2O(l)', note: '石灰水が白くにごるのと同じ反応' },
  { id: 'bleach', in: ['Cl2', 'NaOHaq', 'NaOHaq'], out: ['NaClOaq', 'NaClaq', 'H2O'], cond: 'none', dH: -100,
    name: '漂白剤の生成', eq: 'Cl2(g) + 2NaOH(aq) → NaClO(aq) + NaCl(aq) + H2O(l)' },
  { id: 'haber', in: ['N2', 'H2', 'H2', 'H2'], out: ['NH3', 'NH3'], cond: 'cat', dH: -92,
    name: 'アンモニアの合成', eq: 'N2(g) + 3H2(g) → 2NH3(g)', note: '実際には鉄の触媒と高温・高圧が必要(ハーバー・ボッシュ法)' },
  { id: 'cacl2_dissolve', in: ['CaCl2', 'H2O'], out: ['CaCl2aq'], cond: 'none', dH: -82,
    name: '塩化カルシウムが溶ける', eq: 'CaCl2(s) → CaCl2(aq)', note: '溶けると温かくなる。融雪剤に使われる' },
  { id: 'hcl_dissolve', in: ['HCl', 'H2O'], out: ['HClaq'], cond: 'none', dH: -75,
    name: '塩化水素が水に溶ける', eq: 'HCl(g) + H2O(l) → H3O^+(aq) + Cl^−(aq)' },
  { id: 'nahco3', in: ['NaOHaq', 'CO2'], out: ['NaHCO3aq'], cond: 'none', dH: -68,
    name: '炭酸水素ナトリウムの生成', eq: 'NaOH(aq) + CO2(g) → NaHCO3(aq)' },
  { id: 'slake', in: ['CaO', 'H2O'], out: ['CaOH2'], cond: 'none', dH: -65,
    name: '生石灰と水', eq: 'CaO(s) + H2O(l) → Ca(OH)2(s)', note: '発熱するので、食品の加熱剤に使われる' },
  { id: 'acetate_neut', in: ['CH3COOH', 'NaOHaq'], out: ['AcONaaq', 'H2O'], cond: 'none', dH: -57,
    name: '酢酸の中和', eq: 'CH3COOH(l) + NaOH(aq) → CH3COONa(aq) + H2O(l)' },
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
  { id: 'mixdanger', in: ['NaClOaq', 'HClaq', 'HClaq'], out: ['Cl2', 'NaClaq', 'H2O'], cond: 'none', dH: -11,
    name: '塩素の発生(混ぜるな危険)', eq: 'NaClO(aq) + 2HCl(aq) → Cl2(g) + NaCl(aq) + H2O(l)', note: '塩素系の漂白剤と酸性の洗剤を混ぜてはいけない理由' },
  { id: 'nahco3_acid', in: ['NaHCO3aq', 'HClaq'], out: ['NaClaq', 'H2O', 'CO2'], cond: 'none', dH: 13,
    name: '炭酸水素ナトリウムと塩酸', eq: 'NaHCO3(aq) + HCl(aq) → NaCl(aq) + H2O(l) + CO2(g)', note: '吸熱だが、気体が出るので自然に進む' },
  { id: 'degas', in: ['H2CO3aq'], out: ['H2O', 'CO2'], cond: 'heat', dH: 20,
    name: '加熱で二酸化炭素が抜ける', eq: 'H2CO3(aq) → H2O(l) + CO2(g)' },
  { id: 'crystallize', in: ['NaClaq'], out: ['NaCl'], esc: ['H2O(g)'], cond: 'heat', dH: 40,
    name: '水を蒸発させて結晶化', eq: 'NaCl(aq) → NaCl(s)', note: '溶媒の水 1 mol を蒸発させる熱として計算(水の蒸発熱 44 kJ/mol と溶解熱 +4 kJ/mol から)' },
  { id: 'calcine', in: ['CaCO3'], out: ['CaO', 'CO2'], cond: 'heat', dH: 178,
    name: '石灰石の熱分解', eq: 'CaCO3(s) → CaO(s) + CO2(g)', note: '実際には約 900 °C まで加熱する' },
];

// 核反応:化学反応とは別の仕組みで進む(sim.js の nuclear)
// 燃料のペレットが「水(中性子を減速する)」と「別の燃料、または飛んできた中性子」に接すると核分裂する
export const NUCLEAR = {
  u_fission: { id: 'u_fission', nuclear: true, fuel: 'UO2', gas: 'Kr', name: 'ウラン235の核分裂',
    eq: '<sup>235</sup>U + n → <sup>141</sup>Ba + <sup>92</sup>Kr + 3n',
    nucl: { A: [235 + 1, 141 + 92 + 3], Z: [92, 56 + 36] } },
  pu_fission: { id: 'pu_fission', nuclear: true, fuel: 'PuO2', gas: 'Xe', name: 'プルトニウム239の核分裂',
    eq: '<sup>239</sup>Pu + n → <sup>134</sup>Xe + <sup>103</sup>Zr + 3n',
    nucl: { A: [239 + 1, 134 + 103 + 3], Z: [94, 54 + 40] } },
  breed: { id: 'breed', nuclear: true, name: 'プルトニウムの生成',
    eq: '<sup>238</sup>U + n → <sup>239</sup>U → <sup>239</sup>Np → <sup>239</sup>Pu',
    note: 'ウラン238が中性子を吸収し、2回のβ崩壊でプルトニウム239になる(実際には数日かかる)' },
};
export const NUCLEAR_LIST = Object.values(NUCLEAR);
export const ALL_REACTIONS = [...REACTIONS, ...NUCLEAR_LIST];

// それ以上反応しない物質:できたら回収される
const AS_REACTANT = new Set(REACTIONS.flatMap(r => r.in));
export const FINAL = new Set(Object.keys(SUBSTANCES).filter(k => !AS_REACTANT.has(k) && !SUBSTANCES[k].fuel && k !== 'FP'));

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
export const formulaHTML = id => (SUBSTANCES[id].nf || fmt(SUBSTANCES[id].f) + ST[SUBSTANCES[id].st]);
