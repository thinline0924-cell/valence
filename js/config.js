// 公開サイトの設定
// ランキングを全員で共有するには、Supabase(無料のデータベース)の URL と公開用のキー(anon key)を書く。
// 手順は docs/ranking.md。空のままだと、ランキングはこの端末だけの記録になる。
// (Claude の試遊ページでは、ページの共有データベースを使うので、ここは使わない)
export const CONFIG = {
  rank: {
    url: '',   // 例:'https://xxxxxxxx.supabase.co'
    key: '',   // 例:'eyJhbGciOi...'(anon public key)
  },
};
