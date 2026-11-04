// 遊び方:5つの段階を、実際の盤の上で動く見本と一緒に説明する
// 初めて遊ぶときに出る。「次回から表示しない」で出なくなり、開始画面の「遊び方」からいつでも見られる
import { REACTIONS } from './chem.js';

const SEEN_KEY = 'valence.tutorialSeen';
const tid = id => document.getElementById(id);

// at:何秒後に do:何をするか。最後の手順のあと、少し待ってくり返す
const STEPS = [
  {
    title: '置く',
    text: 'マスを押すと、下の台にある原子が置かれます。となりの原子とつながり、組み合わせが実在の物質と同じになると完成します。つなぐ順番は自由です。',
    queue: ['O', 'H', 'H'],
    script: [
      [0.6, g => g.demoAtom('O', '0,0')],
      [1.6, g => g.demoAtom('H', '1,0')],
      [2.6, g => g.demoAtom('H', '-1,0')],
    ],
    loop: 6.5,
  },
  {
    title: '物質の姿',
    text: '完成した物質は、その物質らしい姿に変わります。気体は気泡で、軽い気体ほど高く浮きます。液体はしずくや試薬びん、固体は結晶や粉。床には化学式が出ます。',
    names: true, keep: true,
    script: [
      [0.3, g => g.demoPut('H2', '-1,-1')],
      [0.9, g => g.demoPut('CO2', '1,-1')],
      [1.5, g => g.demoPut('H2O', '-2,1')],
      [2.1, g => g.demoPut('HClaq', '0,0')],
      [2.7, g => g.demoPut('NaCl', '2,0')],
      [3.3, g => g.demoPut('SiO2', '-1,2')],
      [3.9, g => g.demoPut('Cu', '1,1')],
    ],
  },
  {
    title: '反応と連鎖',
    text: 'となり合った物質は、条件がそろうと自動で反応します。できた物質がさらに反応すると連鎖になり、連鎖の間は時計が止まります。',
    queue: ['H', 'Cl'],
    setup: g => { g.demoPut('H2O', '2,-2'); g.demoPut('NaOHaq', '1,0'); },
    script: [
      [0.6, g => g.demoAtom('H', '3,-2')],
      [1.6, g => g.demoAtom('Cl', '2,-1')],
    ],
    loop: 8,
  },
  {
    title: '熱と特殊なマス',
    text: '加熱マスの上では燃焼に火がつき、熱を使う反応も起こせます。発熱反応で熱がたまり、満タンになると過熱。反応が速くなり、得点は2倍です。光のマスと触媒のマスで進む反応もあります。',
    setup: g => { g.demoPut('CH4', '-2,1'); g.demoPut('H2O', '-1,0'); },
    script: [
      [0.8, g => g.demoPut('O2', '-1,1')],
      [1.6, g => g.demoPut('O2', '-2,2')],
    ],
    loop: 8,
  },
  {
    title: 'お題と図鑑',
    text: '毎回、まだ見つけていない反応が「お題」として2つ出ます。黄色い枠の物質が中心です。見つけた反応は図鑑に記録されます。反応を重ねるほど、新しい元素や、ウラン・プルトニウムが出てきます。',
    setup: g => {
      const e = g.demoPut('CO2', '0,0');
      g.targets = [{ R: REACTIONS.find(r => r.id === 'co2_dissolve'), done: false, center: e.id }];
      e.target = 'co2_dissolve';
      g.emit('targets', { list: g.targets }); g.emit('targetMark', { id: e.id, on: true });
    },
    script: [[2.2, g => g.demoPut('H2O', '1,0')]],
    loop: 7,
  },
];

export class Tutorial {
  constructor({ game, view, audio, onFinish }) {
    Object.assign(this, { game, view, audio, onFinish, i: 0, timers: [], mode: 'first' });
    tid('tutNext').onclick = () => { this.audio.play('ui'); this.i < STEPS.length - 1 ? this.go(this.i + 1) : this.close(true); };
    tid('tutBack').onclick = () => { this.audio.play('ui'); if (this.i > 0) this.go(this.i - 1); };
    tid('tutSkip').onclick = () => { this.audio.play('ui'); this.close(true); };
    tid('tutDots').innerHTML = STEPS.map((_, k) => `<button data-k="${k}" aria-label="${k + 1}段目"></button>`).join('');
    tid('tutDots').onclick = e => { const b = e.target.closest('button'); if (b) { this.audio.play('ui'); this.go(+b.dataset.k); } };
  }

  static get seen() { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; } }

  // mode:'first' 終わったらゲームを始める / 'review' 終わったら開始画面に戻る
  open(mode) {
    this.mode = mode;
    tid('tutHide').checked = mode === 'first' ? true : Tutorial.seen;
    tid('tutorial').hidden = false;
    document.documentElement.classList.add('tutoring');
    this.go(0);
  }

  go(i) {
    this.i = i;
    const S = STEPS[i];
    tid('tutCount').textContent = `${i + 1} / ${STEPS.length}`;
    tid('tutTitle').textContent = S.title;
    tid('tutText').textContent = S.text;
    tid('tutBack').disabled = i === 0;
    tid('tutNext').textContent = i < STEPS.length - 1 ? '次へ' : (this.mode === 'first' ? 'はじめる' : '閉じる');
    [...tid('tutDots').children].forEach((b, k) => b.setAttribute('aria-current', k === i ? 'step' : 'false'));
    this.play(S);
  }

  play(S) {
    this.clearTimers();
    this.view.showNames = !!S.names;
    this.game.startDemo(S.queue || []);
    this.game.demoKeep = !!S.keep;
    if (S.setup) S.setup(this.game);
    for (const [at, fn] of S.script) this.timers.push(setTimeout(() => fn(this.game), at * 1000));
    const last = Math.max(...S.script.map(x => x[0]));
    this.timers.push(setTimeout(() => this.play(S), (S.loop || last + 4) * 1000));
  }

  clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; }

  close(finished) {
    this.clearTimers();
    try { localStorage.setItem(SEEN_KEY, tid('tutHide').checked ? '1' : '0'); } catch {}
    tid('tutorial').hidden = true;
    document.documentElement.classList.remove('tutoring');
    this.view.showNames = tid('nameBtn').getAttribute('aria-pressed') === 'true';
    this.game.stopDemo();
    this.onFinish(this.mode, finished);
  }
}
