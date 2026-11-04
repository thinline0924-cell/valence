// 入り口:ルール・表示・画面・音をつなぐ
import { Game } from './sim.js';
import { View } from './view.js';
import { Hud } from './hud.js';
import { Sound } from './audio.js';

try { await Promise.race([document.fonts.load('400 100px Jost'), new Promise(r => setTimeout(r, 1500))]); } catch {}

const $ = id => document.getElementById(id);
const game = new Game();
const view = new View($('c'), $('labels'));
const hud = new Hud();
const audio = new Sound();

let lastTick = -1;
game.on((type, d) => {
  view.handle(type, d);
  hud.handle(type, d);
  switch (type) {
    case 'place': audio.play('place'); break;
    case 'bond': audio.play('bond'); break;
    case 'complete': audio.play('complete'); break;
    case 'dissolve': audio.play('fizzle'); break;
    case 'react': {
      const q = Math.abs(d.R.dH);
      audio.play(d.R.dH > 0 ? 'endo' : q >= 400 ? 'react_l' : q >= 100 ? 'react_m' : 'react_s', { rate: Math.min(1.6, 1 + (d.chain - 1) * 0.06) });
      break;
    }
    case 'collect': audio.play('collect'); break;
    case 'escape': audio.play('escape', { gain: 0.6 }); break;
    case 'spawn': if (d.drip) audio.play('drip'); break;
    case 'needHeat': audio.play('need_heat'); break;
    case 'fever': audio.play(d.on ? 'fever_on' : 'fever_off'); audio.music(d.on ? 'bgm_fever' : 'bgm_main'); break;
    case 'end': audio.play('end'); audio.music(null); break;
  }
});
view.onTap = key => { if (!game.over) game.place(key); };

function start() {
  audio.unlock(); audio.play('start'); audio.music('bgm_main');
  $('title').hidden = true; $('result').hidden = true;
  lastTick = -1;
  game.start();
}
$('startBtn').onclick = start;
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
