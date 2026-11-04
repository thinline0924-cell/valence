// 画面の上と下の表示(スコア・連鎖・時間・熱・次の原子・反応の記録)と、開始・結果の画面
import { ELEMENTS, ALL_REACTIONS, REACTIONS, NUCLEAR_LIST, SUBSTANCES, CHAPTERS, fmt } from './chem.js';
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
    if (type === 'unlock') this.unlockMsg(d.els);
    if (type === 'tier') this.hint('補給される試薬が増えました', 2000);
    if (type === 'settle' && d.on && d.grow) this.hint(`${SUBSTANCES[d.sub].name}になれます。となりに ${d.grow} を置くと、もっと大きな物質に`, 2200, 'learn');
    if (type === 'targets' || type === 'target') this.showTargets(d.list);
    if (type === 'learn') {
      const name = SUBSTANCES[d.sub].name, others = d.rest.filter(x => x !== d.sub);
      this.hint(others.length ? `${name}は、${needText(d.rest)}と${COND[d.cond]}反応する` : `${name}どうしが${COND[d.cond]}反応する`, 2600, 'learn');
    }
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
  // 同じ時に解放された元素をまとめて知らせる
  unlockMsg(els) {
    this.unlocked = (this.unlocked || []).concat(els);
    clearTimeout(this.uT);
    this.uT = setTimeout(() => { this.hint(`${this.unlocked.map(e => ELEMENTS[e].name).join('・')}が出るようになりました`, 2600); this.unlocked = []; }, 50);
  }

  showTargets(list) {
    byId('targets').innerHTML = list.map(T => T.done
      ? `<div class="tg done"><span class="gl">お題</span><span class="need">${T.R.name}</span><span class="st">達成</span></div>`
      : `<div class="tg"><span class="gl">お題</span><span class="need">${needText(T.R.in)}<em>${COND_TAG[T.R.cond]}</em></span><span class="st">+500</span></div>`).join('');
  }

  openBook() {
    const known = this.foundAll;
    const chapters = [...CHAPTERS, ['核反応', NUCLEAR_LIST[0].id]];
    const all = [...REACTIONS, ...NUCLEAR_LIST];
    let html = '', tabs = '', part = 0, ch = null;
    all.forEach((R, i) => {
      const c = chapters.find(c => c[1] === R.id);
      if (c) {
        part++; ch = c[0];
        html += `<h3 class="part" id="part${part}"><span class="pn">第${KANJI[part]}部</span>${c[0]}</h3>`;
        tabs += `<a href="#part${part}" data-part="${part}" title="${c[0]}">${KANJI[part]}</a>`;
      }
      html += bookItem(R, known.has(R.id), i + 1, ch);
    });
    byId('bookList').innerHTML = html;
    byId('bookTabs').innerHTML = tabs;
    byId('bookCount').textContent = `${known.size} / ${all.length} 項`;
    byId('book').hidden = false;
    byId('bookPage').scrollTop = 0;
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
const KANJI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const num = n => String(n).padStart(3, '0');
function bookItem(R, known, n, ch) {
  const cond = R.cond && R.cond !== 'none' ? COND_TAG[R.cond] : '';
  const heat = R.nuclear ? (R.id === 'breed' ? '' : '約 200 MeV/核') : `${R.dH < 0 ? '−' : '+'}${Math.abs(R.dH)} kJ`;
  if (known) return `<article class="entry">
    <p class="hw"><span class="no">${num(n)}</span>${R.name}</p>
    <p class="eq">${R.nuclear ? R.eq : fmt(R.eq)}</p>
    <p class="data">${heat ? `<span><i>熱</i>${heat}</span>` : ''}${cond ? `<span><i>条件</i>${cond}</span>` : ''}</p>
    ${R.note ? `<p class="gloss">${R.note}</p>` : ''}
  </article>`;
  const need = R.nuclear ? (R.id === 'breed' ? '二酸化ウラン、中性子(水に接していないこと)' : `${SUBSTANCES[R.fuel].name}、ほかの燃料、水`) : needText(R.in).replace(/ \+ /g, '、');
  return `<article class="entry unknown">
    <p class="hw"><span class="no">${num(n)}</span><span class="blank"></span><span class="stamp">未収録</span></p>
    <p class="data"><span><i>材料</i>${need}</span>${cond ? `<span><i>条件</i>${cond}</span>` : ''}</p>
  </article>`;
}
