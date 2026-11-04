// 画面の上と下の表示(スコア・連鎖・時間・熱・次の原子・反応の記録)と、開始・結果の画面
import { ELEMENTS, REACTIONS, fmt } from './chem.js';
import { RULES } from './sim.js';

const byId = id => document.getElementById(id);
const BEST_KEY = 'valence.best';
const FOUND_KEY = 'valence.found';
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export class Hud {
  constructor() {
    this.shown = 0; this.queueStr = ''; this.evT = 0; this.lastChain = 0;
    this.best = load(BEST_KEY, 0);
    this.foundAll = new Set(load(FOUND_KEY, []));
    byId('bestStart').textContent = this.best ? this.best.toLocaleString('en-US') : '—';
    byId('foundStart').textContent = `${this.foundAll.size} / ${REACTIONS.length}`;
  }

  handle(type, d) {
    if (type === 'react') this.showEvent(d);
    if (type === 'start') { this.shown = 0; byId('event').classList.remove('show'); document.documentElement.classList.remove('fever'); }
    if (type === 'fever') document.documentElement.classList.toggle('fever', d.on);
    if (type === 'needHeat') this.hint(`熱が ${d.need} kJ 必要`);
    if (type === 'end') this.result(d);
  }

  showEvent(d) {
    const R = d.R;
    byId('eq').innerHTML = fmt(R.eq);
    const heat = R.dH < 0 ? `<span class="hot">発熱 ${-R.dH} kJ</span>` : `<span class="cold">熱を ${R.dH} kJ 使う</span>`;
    const isNew = !this.foundAll.has(R.id);
    byId('meta').innerHTML = `<span>${R.name}</span>${heat}${d.chain > 1 ? `<span>連鎖 ×${d.chain}</span>` : ''}${isNew ? '<span class="new">初めての反応</span>' : ''}<span class="pts">+${d.pts.toLocaleString('en-US')}</span>`;
    if (isNew) { this.foundAll.add(R.id); save(FOUND_KEY, [...this.foundAll]); }
    const ev = byId('event'); ev.classList.remove('show'); void ev.offsetWidth; ev.classList.add('show');
    clearTimeout(this.evT); this.evT = setTimeout(() => ev.classList.remove('show'), 2600);
  }

  hint(text) {
    const h = byId('hint'); h.textContent = text; h.classList.add('show');
    clearTimeout(this.hT); this.hT = setTimeout(() => h.classList.remove('show'), 1400);
  }

  update(g) {
    if (!g.queue) return;
    this.shown += (g.score - this.shown) * 0.15;
    if (Math.abs(g.score - this.shown) < 1) this.shown = g.score;
    byId('score').textContent = Math.round(this.shown).toLocaleString('en-US');
    if (g.chain !== this.lastChain) {
      byId('chain').textContent = g.chain;
      if (g.chain > this.lastChain) { const c = byId('chainBox'); c.classList.remove('punch'); void c.offsetWidth; c.classList.add('punch'); }
      this.lastChain = g.chain;
    }
    byId('chainBox').classList.toggle('on', g.chain > 0);
    const left = g.time;
    byId('tbar').style.width = (left / RULES.time * 100).toFixed(2) + '%';
    byId('ttxt').textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    byId('timeRow').classList.toggle('paused', g.paused);
    byId('timeRow').classList.toggle('low', left < 15 && !g.paused);
    byId('htxt').textContent = Math.round(g.heat);
    byId('hbar').style.width = (g.heat / RULES.heatMax * 100).toFixed(1) + '%';
    byId('heatRow').classList.toggle('fever', g.feverOn);
    byId('hlabel').textContent = g.feverOn ? '臨界' : '熱';

    const q = g.queue.join(',');
    if (q !== this.queueStr) {
      this.queueStr = q;
      byId('tiles').innerHTML = g.queue.map((el, i) => { const e = ELEMENTS[el];
        return `<div class="tile${i === 0 ? ' now' : ''}" style="background:${e.col};color:${e.ink}" title="${e.name}"><span class="z">${e.z}</span><span class="sym">${el}</span><span class="pips">${'<b></b>'.repeat(e.v)}</span></div>`; }).join('');
    }
  }

  result(d) {
    const isBest = d.score > this.best;
    if (isBest) { this.best = d.score; save(BEST_KEY, d.score); }
    byId('rScore').textContent = d.score.toLocaleString('en-US');
    byId('rBest').textContent = isBest ? '自己ベスト更新' : `自己ベスト ${this.best.toLocaleString('en-US')}`;
    byId('rChain').textContent = d.maxChain;
    byId('rCount').textContent = d.reactCount;
    byId('rFound').textContent = `${this.foundAll.size} / ${REACTIONS.length}`;
    byId('rList').innerHTML = REACTIONS.filter(r => d.found.includes(r.id))
      .map(r => `<li><span class="n">${r.name}</span><span class="e">${fmt(r.eq)}</span></li>`).join('') || '<li><span class="n">反応は起きませんでした</span></li>';
    byId('bestStart').textContent = this.best.toLocaleString('en-US');
    byId('foundStart').textContent = `${this.foundAll.size} / ${REACTIONS.length}`;
    setTimeout(() => { byId('result').hidden = false; }, 700);
  }
}
