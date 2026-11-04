// 効果音と BGM
// assets/sound/manifest.json に「鳴らす場面の名前 → ファイル」を書くと鳴る。書いていない場面は鳴らないだけ
// 例:{ "ui": { "file": "se_click.mp3", "gain": 1.5 }, "bgm_main": { "file": "bgm_main.mp3", "loopLength": 126 } }
//   gain:音量の倍率 / rate:再生の速さ(音の高さ) / trim:先頭の無音を飛ばす秒数
//   loopLength:BGM のループの長さ(秒)。先頭の無音のあとから数える。省くとファイル全体でループ
export const SOUNDS = {
  place: '原子を置く', bond: '結合する', complete: '物質が完成する', fizzle: '組み立て途中の原子が散る',
  react_s: '小さな反応(熱量 100 kJ 未満)', react_m: '中くらいの反応(100〜400 kJ)', react_l: '大きな反応(400 kJ 以上)',
  endo: '熱を使う反応', fission: '核分裂', collect: '物質の回収', escape: '気体が抜ける', drip: '水の補給',
  fever_on: '過熱に入る', fever_off: '過熱が終わる', need_heat: '熱が足りない',
  tick: '残り10秒の秒読み', start: 'ゲーム開始', end: 'ゲーム終了', ui: 'ボタン',
  bgm_main: 'BGM(通常)', bgm_fever: 'BGM(過熱中)',
};

export class Sound {
  constructor(base = 'assets/sound/') {
    this.base = base; this.ctx = null; this.buf = {}; this.conf = {}; this.on = true;
    this.tracks = {}; this.want = null;
  }

  unlock() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.master.gain.value = this.on ? 1 : 0;
    fetch(this.base + 'manifest.json').then(r => r.ok ? r.json() : {}).catch(() => ({})).then(list => {
      const files = new Map();
      for (const [name, c] of Object.entries(list)) {
        if (!(name in SOUNDS)) continue;
        const conf = typeof c === 'string' ? { file: c } : c;
        this.conf[name] = conf;
        if (!files.has(conf.file)) files.set(conf.file,
          fetch(this.base + conf.file).then(r => r.ok ? r.arrayBuffer() : null).then(b => b && this.ctx.decodeAudioData(b)).catch(() => null));
        files.get(conf.file).then(buf => {
          if (!buf) return;
          this.buf[name] = buf;
          if (name.startsWith('bgm_') && this.want) this.music(this.want);
        });
      }
    });
  }

  has(name) { return !!this.buf[name]; }

  play(name, { rate = 1, gain = 1 } = {}) {
    if (!this.on || !this.ctx || !this.buf[name]) return;
    const c = this.conf[name] || {};
    const s = this.ctx.createBufferSource(); s.buffer = this.buf[name];
    s.playbackRate.value = rate * (c.rate || 1);
    const g = this.ctx.createGain(); g.gain.value = gain * (c.gain ?? 1);
    s.connect(g).connect(this.master); s.start(0, c.trim || 0);
  }

  // BGM:通常と過熱中の2本を同時に流し、音量だけ入れ替える
  music(mode) {
    this.want = mode;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (!mode) {
      for (const t of Object.values(this.tracks)) { t.g.gain.setTargetAtTime(0, now, 0.4); setTimeout(() => { try { t.s.stop(); } catch {} }, 2500); }
      this.tracks = {};
      return;
    }
    for (const name of ['bgm_main', 'bgm_fever']) {
      if (this.tracks[name] || !this.buf[name]) continue;
      const buf = this.buf[name], c = this.conf[name] || {};
      const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true;
      const start = firstSound(buf);
      s.loopStart = start;
      s.loopEnd = c.loopLength ? Math.min(buf.duration, start + c.loopLength) : buf.duration;
      const g = this.ctx.createGain(); g.gain.value = 0;
      s.connect(g).connect(this.master); s.start(0, start);
      this.tracks[name] = { s, g, vol: c.gain ?? 0.5 };
    }
    const target = mode === 'fever' && this.tracks.bgm_fever ? 'bgm_fever' : 'bgm_main';
    for (const [name, t] of Object.entries(this.tracks)) t.g.gain.setTargetAtTime(name === target ? t.vol : 0, now, 0.6);
  }

  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 1 : 0; }
}

// 先頭の無音(エンコーダーの詰め物を含む)の長さ
function firstSound(buf) {
  const d = buf.getChannelData(0), n = Math.min(d.length, buf.sampleRate);
  for (let i = 0; i < n; i++) if (Math.abs(d[i]) > 1e-4) return i / buf.sampleRate;
  return 0;
}
