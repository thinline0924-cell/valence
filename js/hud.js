// 画面の上と下の表示(スコア・連鎖・時間・熱・次の原子・反応の記録)と、開始・結果の画面
import { ELEMENTS, ALL_REACTIONS, REACTIONS, NUCLEAR_LIST, SUBSTANCES, fmt } from './chem.js';
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
    byId('foundStart').textContent = `${this.foundAll.size} / ${ALL_REACTIONS.length}`;
  }

  handle(type, d) {
    if (type === 'react') this.showEvent(d);
    if (type === 'start') { this.shown = 0; byId('event').classList.remove('show'); document.documentElement.classList.remove('fever'); }
    if (type === 'fever') document.documentElement.classList.toggle('fever', d.on);
    if (type === 'needHeat') this.hint(`熱が ${d.need} kJ 必要`);
    if (type === 'hint') this.guide(d.key ? `光っている加熱マスに ${d.el} を置くと、連鎖が始まります` : '');
    if (type === 'unlock') this.hint('ウランとプルトニウムが出るようになりました', 2600);
    if (type === 'tier') this.hint('補給される試薬が増えました', 2000);
    if (type === 'targets' || type === 'target') this.showTargets(d.list);
    if (type === 'learn') this.hint(`${SUBSTANCES[d.sub].name}は、${needText(d.rest)}と${COND[d.cond]}反応する`, 2600, 'learn');
    if (type === 'end') this.result(d);
  }

  showEvent(d) {
    const R = d.R;
    byId('eq').innerHTML = R.nuclear ? R.eq : fmt(R.eq);
    byId('event').classList.toggle('nuclear', !!R.nuclear);
    const heat = R.nuclear ? (R.id === 'breed' ? '<span class="nuke">中性子の吸収</span>' : '<span class="nuke">核エネルギー 約 200 MeV/核</span>')
      : R.dH < 0 ? `<span class="hot">発熱 ${-R.dH} kJ</span>` : `<span class="cold">熱を ${R.dH} kJ 使う</span>`;
    const isNew = !this.foundAll.has(R.id);
    byId('meta').innerHTML = `<span>${R.name}</span>${heat}${d.chain > 1 ? `<span>連鎖 ×${d.chain}</span>` : ''}${isNew ? '<span class="new">初めての反応</span>' : ''}<span class="pts">+${d.pts.toLocaleString('en-US')}</span>`;
    if (isNew) { this.foundAll.add(R.id); save(FOUND_KEY, [...this.foundAll]); }
    const ev = byId('event'); ev.classList.remove('show'); void ev.offsetWidth; ev.classList.add('show');
    clearTimeout(this.evT); this.evT = setTimeout(() => ev.classList.remove('show'), 2600);
  }

  hint(text, ms = 1400, cls = '') {
    const h = byId('hint'); h.textContent = text; h.className = 'hint show ' + cls;
    clearTimeout(this.hT); this.hT = setTimeout(() => h.classList.remove('show'), ms);
  }
  showTargets(list) {
    byId('targets').innerHTML = list.map(T => T.done
      ? `<div class="tg done"><span class="gl">お題</span><span class="need">${T.R.name}</span><span class="st">達成</span></div>`
      : `<div class="tg"><span class="gl">お題</span><span class="need">${needText(T.R.in)}<em>${COND_TAG[T.R.cond]}</em></span><span class="st">+500</span></div>`).join('');
  }

  openBook() {
    const known = this.foundAll;
    const cats = [['燃焼', 'c2h4_burn'], ['有機化学', 'etoh_ox'], ['硫黄と窒素', 'claus'], ['無機化学', 'h2o2_dec']];
    let html = '';
    REACTIONS.forEach(R => {
      const c = cats.find(c => c[1] === R.id); if (c) html += `<p class="bk-cat">${c[0]}</p>`;
      html += bookItem(R, known.has(R.id));
    });
    html += '<p class="bk-cat">核反応</p>' + NUCLEAR_LIST.map(R => bookItem(R, known.has(R.id))).join('');
    byId('bookList').innerHTML = html;
    byId('bookCount').textContent = `${known.size} / ${ALL_REACTIONS.length}`;
    byId('book').hidden = false;
  }

  // 最初の一手の案内(置くまで出しておく)
  guide(text) {
    const h = byId('guide'); h.textContent = text; h.classList.toggle('show', !!text);
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
    byId('hlabel').textContent = g.feverOn ? '過熱' : '熱';

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
    byId('rFound').textContent = `${this.foundAll.size} / ${ALL_REACTIONS.length}`;
    byId('rList').innerHTML = ALL_REACTIONS.filter(r => d.found.includes(r.id))
      .map(r => `<li><span class="n">${r.name}</span><span class="e">${r.nuclear ? r.eq : fmt(r.eq)}</span></li>`).join('') || '<li><span class="n">反応は起きませんでした</span></li>';
    byId('bestStart').textContent = this.best.toLocaleString('en-US');
    byId('foundStart').textContent = `${this.foundAll.size} / ${ALL_REACTIONS.length}`;
    setTimeout(() => { byId('result').hidden = false; }, 700);
  }
}

const COND = { none: '', ignite: '点火で', heat: '加熱マスで', light: '光のマスで', cat: '触媒のマスで' };
const COND_TAG = { none: '', ignite: '点火', heat: '加熱', light: '光', cat: '触媒' };
function needText(list) {
  const n = {};
  for (const x of list) n[x] = (n[x] || 0) + 1;
  return Object.entries(n).map(([x, c]) => SUBSTANCES[x].name + (c > 1 ? ` ×${c}` : '')).join(' + ');
}
function bookItem(R, known) {
  const cond = R.cond && R.cond !== 'none' ? `条件:${COND_TAG[R.cond]}` : '';
  if (known) return `<div class="bk"><span class="n">${R.name}</span><span class="e">${R.nuclear ? R.eq : fmt(R.eq)}</span>${R.note ? `<span class="c">${R.note}</span>` : ''}</div>`;
  const need = R.nuclear ? (R.id === 'breed' ? '二酸化ウラン + 中性子(水に接していない)' : `${SUBSTANCES[R.fuel].name} + 燃料 + 水`) : needText(R.in);
  return `<div class="bk unknown"><span class="n">未発見</span><span class="e">${need} → ?</span>${cond ? `<span class="c">${cond}</span>` : ''}</div>`;
}
