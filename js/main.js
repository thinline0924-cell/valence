// 入り口:ルール・表示・画面・音をつなぐ
import { Game } from './sim.js';
import { View } from './view.js';
import { Hud } from './hud.js';
import { Sound, SOUNDS } from './audio.js';
import { Ranking } from './rank.js';
import { Tutorial } from './tutorial.js';

try { await Promise.race([document.fonts.load('400 100px Jost'), new Promise(r => setTimeout(r, 1500))]); } catch {}

const $ = id => document.getElementById(id);
const game = new Game();
const view = new View($('c'), $('labels'));
const hud = new Hud();
const audio = new Sound();
const rank = new Ranking();
let lastResult = null;

let lastTick = -1, reactSoundAt = -1;
game.on((type, d) => {
  view.handle(type, d);
  hud.handle(type, d);
  switch (type) {
    case 'place': audio.play('place'); break;
    case 'bond': audio.play('bond'); break;
    case 'complete': audio.play('complete'); break;
    case 'dissolve': audio.play('fizzle'); break;
    case 'react': {
      // 同じ判定で同時に起きた反応は、最初の1つ(材料の多い反応・核分裂が先)の音だけ鳴らす
      if (reactSoundAt === game.t) break;
      reactSoundAt = game.t;
      if (d.R.nuclear) { audio.play(d.R.id === 'breed' ? 'complete' : 'fission'); break; }
      const q = Math.abs(d.R.dH);
      audio.play(d.R.dH > 0 ? 'endo' : q >= 400 ? 'react_l' : q >= 100 ? 'react_m' : 'react_s', { rate: Math.min(1.6, 1 + (d.chain - 1) * 0.06) });
      break;
    }
    case 'collect': audio.play('collect'); break;
    case 'escape': audio.play('escape', { gain: 0.6 }); break;
    case 'spawn': if (d.drip) audio.play('drip'); break;
    case 'needHeat': audio.play('need_heat'); break;
    case 'fever': audio.play(d.on ? 'fever_on' : 'fever_off'); audio.music(d.on ? 'fever' : 'main'); break;
    case 'end': audio.play('end'); audio.music(null); onEnd(d); break;
  }
});
view.onTap = key => { if (!game.over && !game.demo) game.place(key); };

function start() {
  audio.unlock(); audio.play('start'); audio.music('main');
  $('title').hidden = true; $('result').hidden = true;
  lastTick = -1;
  game.start(hud.foundAll);
}
const tutorial = new Tutorial({ game, view, audio, onFinish: mode => { if (mode === 'first') start(); else $('title').hidden = false; } });
// 初めて遊ぶときは、先に遊び方を見せる
$('startBtn').onclick = () => {
  if (Tutorial.seen) return start();
  audio.unlock(); audio.play('ui');
  $('title').hidden = true; tutorial.open('first');
};
$('tutBtn').onclick = () => { audio.unlock(); audio.play('ui'); $('title').hidden = true; tutorial.open('review'); };
document.querySelectorAll('[data-book]').forEach(b => b.onclick = () => { audio.unlock(); audio.play('ui'); hud.openBook(); });
$('bookClose').onclick = () => { audio.play('ui'); $('book').hidden = true; };
$('bookTabs').addEventListener('click', e => {
  const a = e.target.closest('a'); if (!a) return;
  e.preventDefault();
  document.getElementById('part' + a.dataset.part)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
});

// 音の確認(開始画面):割り当てた音を1つずつ鳴らす
$('soundTest').addEventListener('toggle', () => {
  if (!$('soundTest').open) return;
  audio.unlock();
  const list = $('soundList');
  const fill = () => {
    list.innerHTML = Object.entries(SOUNDS).map(([k, label]) =>
      `<button data-s="${k}" ${audio.has(k) ? '' : 'disabled'}>${label}<span>${k}</span></button>`).join('');
  };
  fill(); setTimeout(fill, 800); setTimeout(fill, 2500);
});
$('soundList').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const k = b.dataset.s;
  if (k.startsWith('bgm_')) { audio.music(null); setTimeout(() => audio.music(k === 'bgm_fever' ? 'fever' : 'main'), 50); setTimeout(() => audio.music(null), 8000); }
  else audio.play(k);
});
/* ---------- ランキング ---------- */
const status = t => { $('rankStatus').textContent = t; };
async function onEnd(d) {
  lastResult = d; status('');
  await rank.ready;
  $('rankForm').hidden = !rank.needsName || d.score <= 0;
  $('rankName').value = rank.name;
  $('rankSend').disabled = false;
  if (!rank.needsName && d.score > 0) sendScore();
}
async function sendScore() {
  if (!lastResult) return;
  if (rank.needsName) {
    const n = $('rankName').value.trim();
    if (!n) { status('名前を入れてください'); $('rankName').focus(); return; }
    rank.name = n;
  }
  $('rankSend').disabled = true; status('記録しています');
  try {
    const pos = await rank.submit({ score: lastResult.score, maxChain: lastResult.maxChain });
    status(pos ? `${rank.scopeText}で ${pos} 位` : '記録しました');
    $('rankForm').hidden = true;
  } catch {
    status('記録できませんでした。通信の状態を確かめて、もう一度押してください');
    $('rankSend').disabled = false;
  }
}
$('rankForm').addEventListener('submit', e => { e.preventDefault(); sendScore(); });
async function openRanking() {
  audio.unlock(); audio.play('ui');
  $('ranking').hidden = false;
  await rank.ready;
  $('rankScope').textContent = rank.scopeText;
  const list = $('rankList');
  list.innerHTML = '<li><span class="empty">読み込んでいます</span></li>';
  try {
    const rows = await rank.top(20);
    if (!rows.length) { list.innerHTML = '<li><span class="empty">まだ記録がありません</span></li>'; return; }
    list.innerHTML = '';
    rows.forEach((x, i) => {
      const li = document.createElement('li'); if (x.mine) li.className = 'mine';
      li.innerHTML = '<span class="pos"></span><span class="nm"></span><span class="sc"></span><span class="ch"></span>';
      li.querySelector('.pos').textContent = i + 1;
      li.querySelector('.nm').textContent = x.name;           // 名前は他の人の入力なので textContent で入れる
      li.querySelector('.sc').textContent = x.score.toLocaleString('en-US');
      li.querySelector('.ch').textContent = `×${x.chain}`;
      list.appendChild(li);
    });
  } catch {
    list.innerHTML = '<li><span class="empty">読み込めませんでした。通信の状態を確かめてください</span></li>';
  }
}
document.querySelectorAll('[data-rank]').forEach(b => b.onclick = openRanking);
$('rankClose').onclick = () => { audio.play('ui'); $('ranking').hidden = true; };

if (location.hash === '#debug') window.__valence = { game, view, audio };
$('againBtn').onclick = start;

const toggle = (btn, fn) => { btn.onclick = () => { const v = btn.getAttribute('aria-pressed') !== 'true'; btn.setAttribute('aria-pressed', v); fn(v); audio.play('ui'); }; };
toggle($('nameBtn'), v => { view.showNames = v; });
toggle($('caseBtn'), v => { view.caseGroup.visible = v; });
toggle($('soundBtn'), v => audio.setOn(v));
$('rotL').onclick = () => view.rotate(-1);
$('rotR').onclick = () => view.rotate(1);
addEventListener('keydown', e => { if (e.key === 'ArrowLeft') view.rotate(-1); if (e.key === 'ArrowRight') view.rotate(1); });

let prev = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
  game.update(dt);
  if (!game.over && game.time < 10 && !game.paused) {
    const s = Math.ceil(game.time); if (s !== lastTick) { lastTick = s; audio.play('tick'); }
  }
  view.update(dt, game);
  hud.update(game);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
