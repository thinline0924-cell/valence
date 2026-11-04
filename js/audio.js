// 効果音と BGM。assets/sound/ に下の名前のファイル(.mp3)を置くと鳴る。無いものは鳴らないだけ
export const SOUNDS = {
  place: '原子を置く', bond: '結合する', complete: '物質が完成する', fizzle: '組み立て途中の原子が散る',
  react_s: '小さな反応(熱量 100 kJ 未満)', react_m: '中くらいの反応(100〜400 kJ)', react_l: '大きな反応(400 kJ 以上)',
  endo: '熱を使う反応', collect: '物質の回収', escape: '気体が抜ける', drip: '水の補給',
  fever_on: '臨界に入る', fever_off: '臨界が終わる', need_heat: '熱が足りない',
  tick: '残り10秒の秒読み', start: 'ゲーム開始', end: 'ゲーム終了', ui: 'ボタン',
  bgm_main: 'BGM(通常)', bgm_fever: 'BGM(臨界中)',
};

export class Sound {
  constructor(base = 'assets/sound/') {
    this.base = base; this.ctx = null; this.buf = {}; this.on = true; this.bgm = null;
  }
  unlock() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    // manifest.json に書かれた名前だけ読む(置いていない音で読み込みエラーを出さないため)
    fetch(this.base + 'manifest.json').then(r => r.ok ? r.json() : []).catch(() => []).then(list => {
      for (const name of list) {
        if (!(name in SOUNDS)) continue;
        fetch(this.base + name + '.mp3').then(r => r.ok ? r.arrayBuffer() : null)
          .then(b => b && this.ctx.decodeAudioData(b)).then(buf => { if (buf) this.buf[name] = buf; }).catch(() => {});
      }
    });
  }
  play(name, { rate = 1, gain = 1 } = {}) {
    if (!this.on || !this.ctx || !this.buf[name]) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.buf[name]; s.playbackRate.value = rate;
    const g = this.ctx.createGain(); g.gain.value = gain; s.connect(g).connect(this.master); s.start();
  }
  music(name) {
    if (!this.ctx) return;
    if (this.bgm) { const old = this.bgm; old.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4); setTimeout(() => old.s.stop(), 2000); this.bgm = null; }
    if (!name || !this.on || !this.buf[name]) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.buf[name]; s.loop = true;
    const g = this.ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.5);
    s.connect(g).connect(this.master); s.start(); this.bgm = { s, g };
  }
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 1 : 0; }
}
