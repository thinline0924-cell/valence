// 盤の形(半径3の六角形・37マス)と、マスどうしの隣り合い
export const RADIUS = 3;
export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

export const keyOf = (q, r) => `${q},${r}`;
export const parseKey = k => k.split(',').map(Number);

export const inBoard = (q, r) =>
  Math.abs(q) <= RADIUS && Math.abs(r) <= RADIUS && Math.abs(q + r) <= RADIUS;

export const CELLS = [];
for (let q = -RADIUS; q <= RADIUS; q++)
  for (let r = -RADIUS; r <= RADIUS; r++)
    if (inBoard(q, r)) CELLS.push(keyOf(q, r));

const NB = new Map(CELLS.map(k => {
  const [q, r] = parseKey(k);
  return [k, DIRS.map(([dq, dr]) => [q + dq, r + dr]).filter(([a, b]) => inBoard(a, b)).map(([a, b]) => keyOf(a, b))];
}));
export const neighbors = k => NB.get(k);

// 特殊なマス
// heat:加熱(吸熱反応と点火)/ light:光 / cat:触媒
export const SPECIAL = {
  '2,-1': 'heat',
  '-2,1': 'heat',
  '-1,-2': 'light',
  '1,2': 'cat',
};
