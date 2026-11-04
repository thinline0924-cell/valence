// ランキング:動いている場所に応じて、記録の置き場所を選ぶ
//   claude   … Claude の試遊ページ。ページの共有データベースに、1人1件(自己ベスト)を置く。名前は Claude のアカウント名
//   supabase … 公開サイト。js/config.js に Supabase の URL とキーがあるとき。名前は自分で決める
//   local    … どちらも使えないとき。この端末だけの記録
import { CONFIG } from './config.js';

const LOCAL_KEY = 'valence.localRank';
const NAME_KEY = 'valence.name';
const loadJSON = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export class Ranking {
  constructor() {
    this.mode = 'local';
    this.ready = this.init();
  }

  async init() {
    if (window.claude && typeof window.claude.use === 'function') {
      try {
        const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        const id = db && user ? await user.id() : null;
        if (id) { this.mode = 'claude'; this.db = db; this.user = user; this.me = id; return; }
      } catch {}
    }
    if (CONFIG.rank && CONFIG.rank.url && CONFIG.rank.key) this.mode = 'supabase';
  }

  get needsName() { return this.mode !== 'claude'; }
  get name() { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } }
  set name(v) { try { localStorage.setItem(NAME_KEY, v); } catch {} }
  get scopeText() {
    return { claude: 'このページを開いた人の記録', supabase: 'すべてのプレイヤーの記録', local: 'この端末だけの記録' }[this.mode];
  }

  // 上位の記録:[{ name, score, chain, mine }]
  async top(n = 20) {
    await this.ready;
    if (this.mode === 'claude') {
      const snap = await withTimeout(this.db.collection('scores').orderBy('score', 'desc').limit(n).get());
      const ids = snap.docs.map(d => d.id);
      const ps = ids.length ? await this.user.profiles(ids) : {};
      return snap.docs.map(d => { const v = d.data() || {}; return { name: (ps[d.id] && ps[d.id].name) || '名前のない人', score: +v.score || 0, chain: +v.chain || 0, mine: d.id === this.me }; });
    }
    if (this.mode === 'supabase') {
      const { url, key } = CONFIG.rank;
      const r = await withTimeout(fetch(`${url}/rest/v1/scores?select=name,score,max_chain&order=score.desc&limit=${n * 4}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }));
      if (!r.ok) throw new Error('rank_fetch');
      const rows = await r.json(), best = new Map();
      for (const x of rows) if (!best.has(x.name)) best.set(x.name, x);   // 同じ名前は最高の1件だけ
      const me = this.name;
      return [...best.values()].slice(0, n).map(x => ({ name: x.name, score: x.score, chain: x.max_chain || 0, mine: x.name === me }));
    }
    const me = this.name;
    return loadJSON(LOCAL_KEY, []).slice(0, n).map(x => ({ ...x, mine: x.name === me }));
  }

  // 記録を送る。返り値は順位(わからないときは null)
  async submit({ score, maxChain }) {
    await this.ready;
    if (this.mode === 'claude') {
      const ref = this.db.collection('scores').doc(this.me);
      const cur = await withTimeout(ref.get());
      const best = cur.exists ? +(cur.data() || {}).score || 0 : 0;
      if (score > best) await withTimeout(ref.set({ score, chain: maxChain, at: Date.now() }));
    } else if (this.mode === 'supabase') {
      const { url, key } = CONFIG.rank;
      const r = await withTimeout(fetch(`${url}/rest/v1/scores`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ name: this.name.slice(0, 12), score, max_chain: maxChain }),
      }));
      if (!r.ok) throw new Error('rank_post');
    } else {
      const list = loadJSON(LOCAL_KEY, []);
      list.push({ name: this.name || 'あなた', score, chain: maxChain });
      list.sort((a, b) => b.score - a.score);
      saveJSON(LOCAL_KEY, list.slice(0, 50));
    }
    const top = await this.top(100);
    const i = top.findIndex(x => x.mine && x.score <= score);
    return i >= 0 ? i + 1 : null;
  }
}

function withTimeout(p, ms = 10000) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}
