// 元素・物質・反応のデータ
// 熱量は 25 °C・1 bar の標準生成エンタルピー(NBS 化学熱力学表)から計算し、整数に丸めた値。
// 単純化の方針は docs/chemistry.md にまとめている。

// v:結合の手の数(原子価) w:出やすさ(重み) after:反応を何回起こすと出はじめるか(2種類ずつ増える) late:核燃料(数に上限)
export const ELEMENTS = {
  H:  { z: 1,  v: 1, mass: '1.008',  col: '#efe6d3', ink: '#2f3a44', w: 22, name: '水素' },
  C:  { z: 6,  v: 4, mass: '12.011', col: '#2a3138', ink: '#efe6d3', w: 10, name: '炭素' },
  N:  { z: 7,  v: 3, mass: '14.007', col: '#3f7fd0', ink: '#f3efe6', w: 8,  name: '窒素' },
  O:  { z: 8,  v: 2, mass: '15.999', col: '#e0583a', ink: '#fff3e6', w: 20, name: '酸素' },
  Na: { z: 11, v: 1, mass: '22.990', col: '#9fb6c3', ink: '#2f3a44', w: 8,  name: 'ナトリウム' },
  S:  { z: 16, v: 2, mass: '32.06',  col: '#e8cf45', ink: '#2f3a44', w: 6, after: 4,  name: '硫黄' },
  Cl: { z: 17, v: 1, mass: '35.45',  col: '#b8cc3c', ink: '#2f3a44', w: 11, name: '塩素' },
  Ca: { z: 20, v: 2, mass: '40.078', col: '#b5a79a', ink: '#2f3a44', w: 6, after: 4,  name: 'カルシウム' },
  Mg: { z: 12, v: 2, mass: '24.305', col: '#cfd8dc', ink: '#2f3a44', w: 5, after: 9, name: 'マグネシウム' },
  K:  { z: 19, v: 1, mass: '39.098', col: '#8faa6a', ink: '#1f2a20', w: 4, after: 14, name: 'カリウム' },
  F:  { z: 9,  v: 1, mass: '18.998', col: '#d9e58a', ink: '#2f3a44', w: 4, after: 14, name: 'フッ素' },
  Br: { z: 35, v: 1, mass: '79.904', col: '#9a3b26', ink: '#f6e9dc', w: 3, after: 26, name: '臭素' },
  Al: { z: 13, v: 3, mass: '26.982', col: '#a9b3ba', ink: '#2f3a44', w: 3, after: 32, name: 'アルミニウム' },
  Si: { z: 14, v: 4, mass: '28.085', col: '#5f6b74', ink: '#eef0ea', w: 3, after: 32, name: 'ケイ素' },
  P:  { z: 15, v: 3, mass: '30.974', col: '#f0b9a0', ink: '#2f3a44', w: 3, after: 38, name: 'リン' },
  Fe: { z: 26, v: 3, mass: '55.845', col: '#7a4b3a', ink: '#f3e6da', w: 4, after: 20, name: '鉄' },
  Cu: { z: 29, v: 2, mass: '63.546', col: '#c47a4a', ink: '#2a1e18', w: 4, after: 20, name: '銅' },
  Zn: { z: 30, v: 2, mass: '65.38',  col: '#8fa0aa', ink: '#1f272c', w: 3, after: 26, name: '亜鉛' },
  Ag: { z: 47, v: 1, mass: '107.87', col: '#e0e3e1', ink: '#2f3a44', w: 3, after: 38, name: '銀' },
  U:  { z: 92, v: 4, mass: '238.03', col: '#3d4a33', ink: '#e9e4c8', w: 1.4, late: true, name: 'ウラン' },
  Pu: { z: 94, v: 4, mass: '(244)',  col: '#6e5a33', ink: '#f1e8d2', w: 0.8, late: true, after: 14, name: 'プルトニウム' },
};

const mol = (atoms, edges) => ({ atoms: atoms.split(' '), edges });
const STAR = (center, n) => Array.from({ length: n }, (_, i) => [center, i + 1]);

// st:状態(g 気体 / l 液体 / s 固体 / aq 水溶液)
// form:盤の上での姿(bubble 気泡 / drop しずく / bottle 試薬びん / ampoule アンプル / crystal 立方体の結晶 / rhomb 菱面体の結晶 / quartz 水晶 / gem 宝石
//   / needles 針状の結晶 / powder 粉 / pellets 粒 / lump かたまり / tablet 錠剤 / smoke 白煙 / beaker ビーカーの沈殿 / metal 延べ棒 / coil 銅線 / nails くぎ
//   / granules 金属の粒 / pellet 燃料ペレット)
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
  H2O2:   { name: '過酸化水素',       f: 'H2O2',   st: 'l', form: 'bottle', color: 0xd9eef0, mol: mol('O O H H', [[0, 1], [0, 2], [1, 3]]), bottle: 'brown' },
  CH3OH:  { name: 'メタノール',       f: 'CH3OH',  st: 'l', form: 'bottle', color: 0xdfeaf0, mol: mol('C O H H H H', [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5]]) },
  N2H4:   { name: 'ヒドラジン',       f: 'N2H4',   st: 'l', form: 'bottle', color: 0xe4ecef, mol: mol('N N H H H H', [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5]]) },
  NaCl:   { name: '食塩',             f: 'NaCl',   st: 's', form: 'crystal', color: 0xf4efe6, mol: mol('Na Cl', [[0, 1]]) },
  NaOH:   { name: '水酸化ナトリウム', f: 'NaOH',   st: 's', form: 'pellets', color: 0xf1ede4, mol: mol('Na O H', [[0, 1], [1, 2]]) },
  CaO:    { name: '酸化カルシウム',   f: 'CaO',    st: 's', form: 'lump', color: 0xe9e4d8, mol: mol('Ca O', [[0, 1]]) },
  CaCl2:  { name: '塩化カルシウム',   f: 'CaCl2',  st: 's', form: 'pellets', color: 0xe7ebe9, mol: mol('Ca Cl Cl', STAR(0, 2)) },
  MgO:    { name: '酸化マグネシウム', f: 'MgO',    st: 's', form: 'lump', color: 0xf3f1ea, mol: mol('Mg O', [[0, 1]]) },
  MgCl2:  { name: '塩化マグネシウム', f: 'MgCl2',  st: 's', form: 'pellets', color: 0xefece4, mol: mol('Mg Cl Cl', STAR(0, 2)) },
  KCl:    { name: '塩化カリウム',     f: 'KCl',    st: 's', form: 'crystal', color: 0xf1eee8, mol: mol('K Cl', [[0, 1]]) },
  KOH:    { name: '水酸化カリウム',   f: 'KOH',    st: 's', form: 'pellets', color: 0xf0ece2, mol: mol('K O H', [[0, 1], [1, 2]]) },
  KBr:    { name: '臭化カリウム',     f: 'KBr',    st: 's', form: 'crystal', color: 0xf3efe6, mol: mol('K Br', [[0, 1]]) },
  HF:     { name: 'フッ化水素',       f: 'HF',     st: 'g', form: 'bubble', M: 20.01, mol: mol('H F', [[0, 1]]) },
  F2:     { name: 'フッ素',           f: 'F2',     st: 'g', form: 'bubble', M: 38.00, mol: mol('F F', [[0, 1]]), color: 0xe9e6a0, opacity: 0.5 },
  HBr:    { name: '臭化水素',         f: 'HBr',    st: 'g', form: 'bubble', M: 80.91, mol: mol('H Br', [[0, 1]]) },
  Br2:    { name: '臭素',             f: 'Br2',    st: 'l', form: 'ampoule', color: 0x8e2f1c, mol: mol('Br Br', [[0, 1]]) },
  Al2O3:  { name: '酸化アルミニウム', f: 'Al2O3',  st: 's', form: 'gem', color: 0xeeeeea, mol: mol('Al Al O O O', [[0, 2], [0, 3], [1, 3], [1, 4]]) },
  AlCl3:  { name: '塩化アルミニウム', f: 'AlCl3',  st: 's', form: 'powder', color: 0xf2efe4, mol: mol('Al Cl Cl Cl', STAR(0, 3)) },
  SiO2:   { name: '二酸化ケイ素',     f: 'SiO2',   st: 's', form: 'quartz', color: 0xe6eef0, mol: mol('Si O O', STAR(0, 2)) },
  SiH4:   { name: 'シラン',           f: 'SiH4',   st: 'g', form: 'bubble', M: 32.12, mol: mol('Si H H H H', STAR(0, 4)) },
  SiCl4:  { name: '四塩化ケイ素',     f: 'SiCl4',  st: 'l', form: 'bottle', color: 0xe6ecee, mol: mol('Si Cl Cl Cl Cl', STAR(0, 4)) },
  PH3:    { name: 'ホスフィン',       f: 'PH3',    st: 'g', form: 'bubble', M: 34.00, mol: mol('P H H H', STAR(0, 3)) },
  PCl3:   { name: '三塩化リン',       f: 'PCl3',   st: 'l', form: 'bottle', color: 0xece9da, mol: mol('P Cl Cl Cl', STAR(0, 3)) },
  Fe2O3:  { name: '酸化鉄(III)',      f: 'Fe2O3',  st: 's', form: 'powder', color: 0x9c4a2e, mol: mol('Fe Fe O O O', [[0, 2], [0, 3], [1, 3], [1, 4]]) },
  FeCl3:  { name: '塩化鉄(III)',      f: 'FeCl3',  st: 's', form: 'pellets', color: 0x6e4f24, mol: mol('Fe Cl Cl Cl', STAR(0, 3)) },
  CuO:    { name: '酸化銅(II)',       f: 'CuO',    st: 's', form: 'powder', color: 0x2c2724, mol: mol('Cu O', [[0, 1]]) },
  CuCl2:  { name: '塩化銅(II)',       f: 'CuCl2',  st: 's', form: 'powder', color: 0xb08a3c, mol: mol('Cu Cl Cl', STAR(0, 2)) },
  ZnO:    { name: '酸化亜鉛',         f: 'ZnO',    st: 's', form: 'powder', color: 0xf4f2ec, mol: mol('Zn O', [[0, 1]]) },
  ZnCl2:  { name: '塩化亜鉛',         f: 'ZnCl2',  st: 's', form: 'pellets', color: 0xefede6, mol: mol('Zn Cl Cl', STAR(0, 2)) },
  ZnS:    { name: '硫化亜鉛',         f: 'ZnS',    st: 's', form: 'powder', color: 0xd8c68a, mol: mol('Zn S', [[0, 1]]) },
  AgCl:   { name: '塩化銀',           f: 'AgCl',   st: 's', form: 'powder', color: 0xf5f4ef, mol: mol('Ag Cl', [[0, 1]]) },
  Ag2O:   { name: '酸化銀',           f: 'Ag2O',   st: 's', form: 'powder', color: 0x3a2e28, mol: mol('Ag Ag O', [[0, 2], [1, 2]]) },
  O3:     { name: 'オゾン',           f: 'O3',     st: 'g', form: 'bubble', M: 48.00, color: 0xb9d8ee, opacity: 0.5, mol: mol('O O O', []), vx: true },
  HCN:    { name: 'シアン化水素',     f: 'HCN',    st: 'g', form: 'bubble', M: 27.03, mol: mol('H C N', [[0, 1], [1, 2]]) },
  N2O:    { name: '一酸化二窒素',     f: 'N2O',    st: 'g', form: 'bubble', M: 44.01, mol: mol('N N O', []), vx: true },
  CS2:    { name: '二硫化炭素',       f: 'CS2',    st: 'l', form: 'bottle', color: 0xeeeed8, mol: mol('C S S', []), vx: true },
  HOCl:   { name: '次亜塩素酸',       f: 'HOCl',   st: 'aq', form: 'bottle', color: 0xe6edc0, mol: mol('H O Cl', [[0, 1], [1, 2]]) },
  HCOOH:  { name: 'ギ酸',             f: 'HCOOH',  st: 'l', form: 'bottle', color: 0xeeeadc, mol: mol('C H H O O', [[0, 1], [0, 3], [0, 4], [3, 2]]) },
  CHCl3:  { name: 'クロロホルム',     f: 'CHCl3',  st: 'l', form: 'bottle', color: 0xeef0ea, mol: mol('C H Cl Cl Cl', STAR(0, 4)) },
  CCl4:   { name: '四塩化炭素',       f: 'CCl4',   st: 'l', form: 'bottle', color: 0xedeee8, mol: mol('C Cl Cl Cl Cl', STAR(0, 4)) },
  NaF:    { name: 'フッ化ナトリウム', f: 'NaF',    st: 's', form: 'crystal', color: 0xf2f0ea, mol: mol('Na F', [[0, 1]]) },
  CaF2:   { name: 'フッ化カルシウム', f: 'CaF2',   st: 's', form: 'gem', color: 0xa9d8c0, mol: mol('Ca F F', STAR(0, 2)) },
  FeS:    { name: '硫化鉄(II)',       f: 'FeS',    st: 's', form: 'lump', color: 0x3b3530, mol: mol('Fe S', []), vx: true },
  FeS2:   { name: '黄鉄鉱',           f: 'FeS2',   st: 's', form: 'crystal', color: 0xc9a94a, mol: mol('Fe S S', []), vx: true },
  Fe3O4:  { name: '四酸化三鉄',       f: 'Fe3O4',  st: 's', form: 'powder', color: 0x2a2a2c, mol: mol('Fe Fe Fe O O O O', []), vx: true },
  Cu2O:   { name: '酸化銅(I)',        f: 'Cu2O',   st: 's', form: 'powder', color: 0xa8402a, mol: mol('Cu Cu O', []), vx: true },
  Ag2S:   { name: '硫化銀',           f: 'Ag2S',   st: 's', form: 'powder', color: 0x2c2c2e, mol: mol('Ag Ag S', [[0, 2], [1, 2]]) },
  UO2:    { name: '二酸化ウラン',     f: 'UO2',    st: 's', form: 'pellet', color: 0x2b2a27, mol: mol('U O O', STAR(0, 2)), fuel: true },
  PuO2:   { name: '二酸化プルトニウム', f: 'PuO2', st: 's', form: 'pellet', color: 0x6b5a2a, mol: mol('Pu O O', STAR(0, 2)), fuel: true },

  // ---- 反応でできる物質 ----
  CO:      { name: '一酸化炭素',             f: 'CO',       st: 'g',  form: 'bubble', M: 28.01, mol: mol('C O', []), vx: true },
  NO:      { name: '一酸化窒素',             f: 'NO',       st: 'g',  form: 'bubble', M: 30.01, mol: mol('N O', []), vx: true },
  NO2:     { name: '二酸化窒素',             f: 'NO2',      st: 'g',  form: 'bubble', M: 46.01, color: 0xb5562e, opacity: 0.66, mol: mol('N O O', []), vx: true },
  SO2:     { name: '二酸化硫黄',             f: 'SO2',      st: 'g',  form: 'bubble', M: 64.07, mol: mol('S O O', []), vx: true },
  SO3:     { name: '三酸化硫黄',             f: 'SO3',      st: 'g',  form: 'bubble', M: 80.06, mol: mol('S O O O', []), vx: true },
  C2H6:    { name: 'エタン',                 f: 'C2H6',     st: 'g',  form: 'bubble', M: 30.07, mol: mol('C C H H H H H H', []), vx: true },
  CH3Cl:   { name: 'クロロメタン',           f: 'CH3Cl',    st: 'g',  form: 'bubble', M: 50.49, mol: mol('C H H H Cl', []), vx: true },
  C2H5OH:  { name: 'エタノール',             f: 'C2H5OH',   st: 'l',  form: 'bottle', color: 0xe2edf0, mol: mol('C C H H H H H H O', []), vx: true },
  CH3COOH: { name: '酢酸',                   f: 'CH3COOH',  st: 'l',  form: 'bottle', color: 0xece4cf, mol: mol('C C H H H H O O', []), vx: true },
  EtOAc:   { name: '酢酸エチル',             f: 'CH3COOC2H5', st: 'l', form: 'bottle', color: 0xf0e6c4 },
  HClaq:   { name: '塩酸',                   f: 'HCl',      st: 'aq', form: 'bottle', color: 0xe8653a },
  H2SO4aq: { name: '硫酸',                   f: 'H2SO4',    st: 'aq', form: 'bottle', color: 0xd84a2e, mol: mol('H H S O O O O', []), vx: true },
  HNO3aq:  { name: '硝酸',                   f: 'HNO3',     st: 'aq', form: 'bottle', color: 0xeb7d45, bottle: 'brown', mol: mol('H N O O O', []), vx: true },
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
  NH4Cl:   { name: '塩化アンモニウム',       f: 'NH4Cl',    st: 's',  form: 'smoke', color: 0xf6f3ec, mol: mol('N H H H H Cl', []), vx: true },
  CaOH2:   { name: '水酸化カルシウム',       f: 'Ca(OH)2',  st: 's',  form: 'powder', color: 0xebe7dd, mol: mol('Ca O O H H', []), vx: true },
  CaCO3:   { name: '炭酸カルシウム',         f: 'CaCO3',    st: 's',  form: 'rhomb', color: 0xf0ebe0, mol: mol('Ca C O O O', []), vx: true },
  CaSO4:   { name: '硫酸カルシウム',         f: 'CaSO4',    st: 's',  form: 'needles', color: 0xf3f1ea },

  Cu:      { name: '銅',                     f: 'Cu',       st: 's',  form: 'coil', color: 0xc46a3c },
  Fe:      { name: '鉄',                     f: 'Fe',       st: 's',  form: 'nails', color: 0x6f7377 },
  Zn:      { name: '亜鉛',                   f: 'Zn',       st: 's',  form: 'granules', color: 0xa7b3ba },
  Ag:      { name: '銀',                     f: 'Ag',       st: 's',  form: 'metal', color: 0xdfe3e5 },
  CuSO4aq: { name: '硫酸銅(II)水溶液',       f: 'CuSO4',    st: 'aq', form: 'drop', color: 0x29a3d6 },
  ZnSO4aq: { name: '硫酸亜鉛水溶液',         f: 'ZnSO4',    st: 'aq', form: 'drop', color: 0x9ad3e6, inner: 'speck' },
  FeSO4aq: { name: '硫酸鉄(II)水溶液',       f: 'FeSO4',    st: 'aq', form: 'drop', color: 0xb8d8a8 },
  FeCl2aq: { name: '塩化鉄(II)水溶液',       f: 'FeCl2',    st: 'aq', form: 'drop', color: 0xb5d6a0 },
  FeCl3aq: { name: '塩化鉄(III)水溶液',      f: 'FeCl3',    st: 'aq', form: 'drop', color: 0xc9902e },
  ZnCl2aq: { name: '塩化亜鉛水溶液',         f: 'ZnCl2',    st: 'aq', form: 'drop', color: 0x9ad3e6, inner: 'speck' },
  MgCl2aq: { name: '塩化マグネシウム水溶液', f: 'MgCl2',    st: 'aq', form: 'drop', color: 0x9ad3e6, inner: 'speck' },
  AlCl3aq: { name: '塩化アルミニウム水溶液', f: 'AlCl3',    st: 'aq', form: 'drop', color: 0x9ad3e6, inner: 'speck' },
  KOHaq:   { name: '水酸化カリウム水溶液',   f: 'KOH',      st: 'aq', form: 'drop', color: 0x4f8fd8 },
  KClaq:   { name: '塩化カリウム水溶液',     f: 'KCl',      st: 'aq', form: 'drop', color: 0x9ad3e6, inner: 'speck' },
  HFaq:    { name: 'フッ化水素酸',           f: 'HF',       st: 'aq', form: 'bottle', color: 0xf0a070, bottle: 'poly' },
  HBraq:   { name: '臭化水素酸',             f: 'HBr',      st: 'aq', form: 'bottle', color: 0xe0703c },
  H3PO4:   { name: 'リン酸',                 f: 'H3PO4',    st: 'l',  form: 'bottle', color: 0xe8e8d8 },
  SiF4:    { name: '四フッ化ケイ素',         f: 'SiF4',     st: 'g',  form: 'bubble', M: 104.08 },
  CuOH2:   { name: '水酸化銅(II)',           f: 'Cu(OH)2',  st: 's',  form: 'beaker', color: 0x8cc4e0 },
  FeOH3:   { name: '水酸化鉄(III)',          f: 'Fe(OH)3',  st: 's',  form: 'beaker', color: 0x9a4a28 },
  MgOH2:   { name: '水酸化マグネシウム',     f: 'Mg(OH)2',  st: 's',  form: 'tablet', color: 0xf1efe8, mol: mol('Mg O O H H', []), vx: true },
  MgCO3:   { name: '炭酸マグネシウム',       f: 'MgCO3',    st: 's',  form: 'powder', color: 0xf4f2ec, mol: mol('Mg C O O O', []), vx: true },
  PCl5:    { name: '五塩化リン',             f: 'PCl5',     st: 's',  form: 'powder', color: 0xeee6b0 },
  NH4H2PO4:{ name: 'リン酸二水素アンモニウム', f: 'NH4H2PO4', st: 's', form: 'needles', color: 0xf2f0ea },

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

  // 金属
  { id: 'cuo_h2', in: ['CuO', 'H2'], out: ['Cu', 'H2O'], cond: 'ignite', dH: -129,
    name: '酸化銅の還元', eq: 'CuO(s) + H2(g) → Cu(s) + H2O(l)', note: '黒い酸化銅が赤い銅に戻る' },
  { id: 'cu_ox', in: ['O2', 'Cu', 'Cu'], out: ['CuO', 'CuO'], cond: 'ignite', dH: -315,
    name: '銅の酸化', eq: '2Cu(s) + O2(g) → 2CuO(s)' },
  { id: 'blast', in: ['Fe2O3', 'CO', 'CO', 'CO'], out: ['Fe', 'Fe', 'CO2', 'CO2', 'CO2'], cond: 'ignite', dH: -25,
    name: '鉄の製錬', eq: 'Fe2O3(s) + 3CO(g) → 2Fe(s) + 3CO2(g)', note: '溶鉱炉の中で起こる反応' },
  { id: 'zno_co', in: ['ZnO', 'CO'], out: ['Zn', 'CO2'], cond: 'heat', dH: 65,
    name: '亜鉛の製錬', eq: 'ZnO(s) + CO(g) → Zn(s) + CO2(g)', note: '実際には約 1000 °C 以上で行う' },
  { id: 'ag2o_dec', in: ['Ag2O', 'Ag2O'], out: ['Ag', 'Ag', 'Ag', 'Ag', 'O2'], cond: 'heat', dH: 62,
    name: '酸化銀の熱分解', eq: '2Ag2O(s) → 4Ag(s) + O2(g)' },
  { id: 'zn_hcl', in: ['Zn', 'HClaq', 'HClaq'], out: ['ZnCl2aq', 'H2'], cond: 'none', dH: -154,
    name: '亜鉛と塩酸', eq: 'Zn(s) + 2HCl(aq) → ZnCl2(aq) + H2(g)' },
  { id: 'fe_hcl', in: ['Fe', 'HClaq', 'HClaq'], out: ['FeCl2aq', 'H2'], cond: 'none', dH: -89,
    name: '鉄と塩酸', eq: 'Fe(s) + 2HCl(aq) → FeCl2(aq) + H2(g)' },
  { id: 'cuo_h2so4', in: ['CuO', 'H2SO4aq'], out: ['CuSO4aq', 'H2O'], cond: 'none', dH: -64,
    name: '酸化銅と硫酸', eq: 'CuO(s) + H2SO4(aq) → CuSO4(aq) + H2O(l)', note: '青い硫酸銅の水溶液ができる' },
  { id: 'zn_cuso4', in: ['Zn', 'CuSO4aq'], out: ['ZnSO4aq', 'Cu'], cond: 'none', dH: -219,
    name: '亜鉛による銅の析出', eq: 'Zn(s) + CuSO4(aq) → ZnSO4(aq) + Cu(s)', note: 'イオン化傾向の大きい亜鉛が溶け、銅が出てくる' },
  { id: 'fe_cuso4', in: ['Fe', 'CuSO4aq'], out: ['FeSO4aq', 'Cu'], cond: 'none', dH: -154,
    name: '鉄による銅の析出', eq: 'Fe(s) + CuSO4(aq) → FeSO4(aq) + Cu(s)' },
  { id: 'cuso4_naoh', in: ['CuSO4aq', 'NaOHaq', 'NaOHaq'], out: ['CuOH2', 'Na2SO4aq'], cond: 'none', dH: -52,
    name: '水酸化銅の沈殿', eq: 'CuSO4(aq) + 2NaOH(aq) → Cu(OH)2(s) + Na2SO4(aq)', note: '青白い沈殿ができる' },
  { id: 'cuoh2_heat', in: ['CuOH2'], out: ['CuO', 'H2O'], cond: 'heat', dH: 7,
    name: '水酸化銅の熱分解', eq: 'Cu(OH)2(s) → CuO(s) + H2O(l)', note: '青白い沈殿が黒く変わる' },
  { id: 'zns_burn', in: ['O2', 'ZnS', 'ZnS', 'O2', 'O2'], out: ['ZnO', 'ZnO', 'SO2', 'SO2'], cond: 'ignite', dH: -878,
    name: '硫化亜鉛の焙焼', eq: '2ZnS(s) + 3O2(g) → 2ZnO(s) + 2SO2(g)', note: '亜鉛の鉱石から亜鉛を取り出す最初の工程' },
  { id: 'zncl2_dissolve', in: ['ZnCl2', 'H2O'], out: ['ZnCl2aq'], cond: 'none', dH: -73,
    name: '塩化亜鉛が溶ける', eq: 'ZnCl2(s) → ZnCl2(aq)' },
  { id: 'fecl3_dissolve', in: ['FeCl3', 'H2O'], out: ['FeCl3aq'], cond: 'none', dH: -151,
    name: '塩化鉄(III)が溶ける', eq: 'FeCl3(s) → FeCl3(aq)', note: '黄褐色の水溶液になる' },
  { id: 'fecl3_naoh', in: ['FeCl3aq', 'NaOHaq', 'NaOHaq', 'NaOHaq'], out: ['FeOH3', 'NaClaq', 'NaClaq', 'NaClaq'], cond: 'none', dH: -84,
    name: '水酸化鉄の沈殿', eq: 'FeCl3(aq) + 3NaOH(aq) → Fe(OH)3(s) + 3NaCl(aq)', note: '赤褐色の沈殿ができる' },

  // マグネシウムとカリウム
  { id: 'mgcl2_dissolve', in: ['MgCl2', 'H2O'], out: ['MgCl2aq'], cond: 'none', dH: -160,
    name: '塩化マグネシウムが溶ける', eq: 'MgCl2(s) → MgCl2(aq)', note: 'にがりの主な成分' },
  { id: 'mgoh2_hcl', in: ['MgOH2', 'HClaq', 'HClaq'], out: ['MgCl2aq', 'H2O', 'H2O'], cond: 'none', dH: -114,
    name: '制酸剤の反応', eq: 'Mg(OH)2(s) + 2HCl(aq) → MgCl2(aq) + 2H2O(l)', note: '胃酸を中和する薬と同じ反応' },
  { id: 'mgo_co2', in: ['MgO', 'CO2'], out: ['MgCO3'], cond: 'none', dH: -101,
    name: '炭酸マグネシウムの生成', eq: 'MgO(s) + CO2(g) → MgCO3(s)' },
  { id: 'mgo_water', in: ['MgO', 'H2O'], out: ['MgOH2'], cond: 'none', dH: -37,
    name: '酸化マグネシウムと水', eq: 'MgO(s) + H2O(l) → Mg(OH)2(s)' },
  { id: 'koh_dissolve', in: ['KOH', 'H2O'], out: ['KOHaq'], cond: 'none', dH: -58,
    name: '水酸化カリウムが溶ける', eq: 'KOH(s) → K^+(aq) + OH^−(aq)' },
  { id: 'koh_hcl', in: ['HClaq', 'KOHaq'], out: ['KClaq', 'H2O'], cond: 'none', dH: -56,
    name: '水酸化カリウムの中和', eq: 'HCl(aq) + KOH(aq) → KCl(aq) + H2O(l)' },
  { id: 'kcl_dissolve', in: ['KCl', 'H2O'], out: ['KClaq'], cond: 'none', dH: 17,
    name: '塩化カリウムが溶ける', eq: 'KCl(s) → KCl(aq)', note: '溶けると冷たくなる。吸熱だが自然に溶ける' },

  // ハロゲン
  { id: 'h2_f2', in: ['H2', 'F2'], out: ['HF', 'HF'], cond: 'none', dH: -542,
    name: '水素とフッ素', eq: 'H2(g) + F2(g) → 2HF(g)', note: '暗い所でも爆発的に進む' },
  { id: 'etching', in: ['SiO2', 'HF', 'HF', 'HF', 'HF'], out: ['SiF4', 'H2O', 'H2O'], cond: 'none', dH: -191,
    name: 'ガラスの腐食', eq: 'SiO2(s) + 4HF(g) → SiF4(g) + 2H2O(l)', note: 'ガラスに目盛りを刻むのに使われる' },
  { id: 'ag2o_hcl', in: ['Ag2O', 'HClaq', 'HClaq'], out: ['AgCl', 'AgCl', 'H2O'], cond: 'none', dH: -175,
    name: '塩化銀の沈殿', eq: 'Ag2O(s) + 2HCl(aq) → 2AgCl(s) + H2O(l)', note: '白い沈殿。光に当たると黒ずむ' },
  { id: 'cl2_kbr', in: ['Cl2', 'KBr', 'KBr'], out: ['KCl', 'KCl', 'Br2'], cond: 'none', dH: -86,
    name: 'ハロゲンの置換', eq: 'Cl2(g) + 2KBr(s) → 2KCl(s) + Br2(l)', note: '塩素は臭素より酸化する力が強い' },
  { id: 'hbr_dissolve', in: ['HBr', 'H2O'], out: ['HBraq'], cond: 'none', dH: -85,
    name: '臭化水素が水に溶ける', eq: 'HBr(g) → HBr(aq)' },
  { id: 'h2_br2', in: ['H2', 'Br2'], out: ['HBr', 'HBr'], cond: 'light', dH: -73,
    name: '光による臭化水素の生成', eq: 'H2(g) + Br2(l) → 2HBr(g)' },
  { id: 'hf_dissolve', in: ['HF', 'H2O'], out: ['HFaq'], cond: 'none', dH: -49,
    name: 'フッ化水素が水に溶ける', eq: 'HF(g) → HF(aq)', note: 'フッ化水素酸は弱い酸だが、ガラスを溶かす' },

  // ケイ素・リン・アルミニウム
  { id: 'sih4_burn', in: ['SiH4', 'O2', 'O2'], out: ['SiO2', 'H2O', 'H2O'], cond: 'none', dH: -1517,
    name: 'シランの自然発火', eq: 'SiH4(g) + 2O2(g) → SiO2(s) + 2H2O(l)', note: '空気に触れるだけで燃える' },
  { id: 'ph3_burn', in: ['PH3', 'O2', 'O2'], out: ['H3PO4'], cond: 'ignite', dH: -1277,
    name: 'ホスフィンの燃焼', eq: 'PH3(g) + 2O2(g) → H3PO4(l)' },
  { id: 'alcl3_dissolve', in: ['AlCl3', 'H2O'], out: ['AlCl3aq'], cond: 'none', dH: -329,
    name: '塩化アルミニウムが溶ける', eq: 'AlCl3(s) → AlCl3(aq)', note: '水に入れると激しく発熱する' },
  { id: 'sicl4_water', in: ['SiCl4', 'H2O', 'H2O'], out: ['SiO2', 'HClaq', 'HClaq', 'HClaq', 'HClaq'], cond: 'none', dH: -321,
    name: '四塩化ケイ素の加水分解', eq: 'SiCl4(l) + 2H2O(l) → SiO2(s) + 4HCl(aq)', note: '空気中の水分でも白煙を上げる' },
  { id: 'map', in: ['H3PO4', 'NH3'], out: ['NH4H2PO4'], cond: 'none', dH: -127,
    name: 'リン酸アンモニウム(肥料)の生成', eq: 'H3PO4(l) + NH3(g) → NH4H2PO4(s)' },
  { id: 'pcl3_cl2', in: ['PCl3', 'Cl2'], out: ['PCl5'], cond: 'none', dH: -124,
    name: '五塩化リンの生成', eq: 'PCl3(l) + Cl2(g) → PCl5(s)' },
];

// 追加:原子から作れるようにした物質の反応
REACTIONS.push(
  { id: 'ozone', in: ['O2', 'O2', 'O2'], out: ['O3', 'O3'], cond: 'light', dH: 285,
    name: 'オゾンの生成', eq: '3O2(g) → 2O3(g)', note: '紫外線のエネルギーで進む。上空のオゾン層もこの反応でできる。光のエネルギーを使うので、熱は使わない' },
  { id: 'o3_dec', in: ['O3', 'O3'], out: ['O2', 'O2', 'O2'], cond: 'cat', dH: -285,
    name: 'オゾンの分解', eq: '2O3(g) → 3O2(g)' },
  { id: 'no_o3', in: ['NO', 'O3'], out: ['NO2', 'O2'], cond: 'none', dH: -200,
    name: '一酸化窒素とオゾン', eq: 'NO(g) + O3(g) → NO2(g) + O2(g)', note: 'オゾン層を壊す反応の一つ' },
  { id: 'n2o_dec', in: ['N2O', 'N2O'], out: ['N2', 'N2', 'O2'], cond: 'cat', dH: -164,
    name: '一酸化二窒素の分解', eq: '2N2O(g) → 2N2(g) + O2(g)' },
  { id: 'cs2_burn', in: ['CS2', 'O2', 'O2', 'O2'], out: ['CO2', 'SO2', 'SO2'], cond: 'ignite', dH: -1076,
    name: '二硫化炭素の燃焼', eq: 'CS2(l) + 3O2(g) → CO2(g) + 2SO2(g)' },
  { id: 'hcooh_dec', in: ['HCOOH'], out: ['CO', 'H2O'], cond: 'heat', dH: 28,
    name: 'ギ酸の分解', eq: 'HCOOH(l) → CO(g) + H2O(l)', note: '実験室で一酸化炭素をつくる方法(濃硫酸を加えて温める)' },
  { id: 'fluorspar', in: ['CaF2', 'H2SO4aq'], out: ['CaSO4', 'HF', 'HF'], cond: 'heat', dH: 161,
    name: 'フッ化水素の製造', eq: 'CaF2(s) + H2SO4(aq) → CaSO4(s) + 2HF(g)', note: '蛍石からフッ化水素をつくる工業の方法' },
  { id: 'fes_hcl', in: ['FeS', 'HClaq', 'HClaq'], out: ['FeCl2aq', 'H2S'], cond: 'none', dH: -10,
    name: '硫化鉄と塩酸', eq: 'FeS(s) + 2HCl(aq) → FeCl2(aq) + H2S(g)', note: '実験室で硫化水素をつくる方法' },
  { id: 'fe_s', in: ['Fe', 'S'], out: ['FeS'], cond: 'ignite', dH: -100,
    name: '鉄と硫黄', eq: 'Fe(s) + S(s) → FeS(s)' },
  { id: 'cu2o_h2', in: ['Cu2O', 'H2'], out: ['Cu', 'Cu', 'H2O'], cond: 'ignite', dH: -117,
    name: '酸化銅(I)の還元', eq: 'Cu2O(s) + H2(g) → 2Cu(s) + H2O(l)' },
  { id: 'fe3o4_co', in: ['Fe3O4', 'CO', 'CO', 'CO', 'CO'], out: ['Fe', 'Fe', 'Fe', 'CO2', 'CO2', 'CO2', 'CO2'], cond: 'ignite', dH: -14,
    name: '磁鉄鉱の還元', eq: 'Fe3O4(s) + 4CO(g) → 3Fe(s) + 4CO2(g)' },
);

// 図鑑の章分け(各章の最初の反応)
export const CHAPTERS = [
  ['燃焼', 'c2h4_burn'], ['有機化学', 'etoh_ox'], ['硫黄と窒素', 'claus'], ['無機化学', 'h2o2_dec'],
  ['金属', 'cuo_h2'], ['マグネシウムとカリウム', 'mgcl2_dissolve'], ['ハロゲン', 'h2_f2'], ['ケイ素・リン・アルミニウム', 'sih4_burn'], ['追補', 'ozone'],
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
