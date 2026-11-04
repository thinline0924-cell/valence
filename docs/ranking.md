# ランキングの設定

ランキングは、動いている場所によって記録の置き場所が変わります。

| 動いている場所 | 記録の置き場所 | 名前 |
|---|---|---|
| Claude の試遊ページ | ページの共有データベース。1人1件(自己ベスト) | Claude のアカウント名 |
| 公開サイト(`js/config.js` に Supabase を設定したとき) | Supabase のデータベース。すべての回の記録 | 結果画面で入力(12文字まで) |
| どちらでもないとき | その端末のブラウザの中だけ | 結果画面で入力 |

## 公開サイトで、全員のランキングを有効にする(Supabase)

Supabase は無料で使えるデータベースのサービスです。

1. https://supabase.com でアカウントを作り、**New project** でプロジェクトを作る(リージョンは Tokyo が近い)
2. 左のメニューの **SQL Editor** を開き、下の SQL を貼り付けて **Run** を押す
3. **Project Settings → API** を開き、**Project URL** と **anon public** のキーを写す
4. `js/config.js` の `url` と `key` に貼り付けて、`main` に反映する

```sql
create table scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 12),
  score integer not null check (score between 0 and 10000000),
  max_chain integer not null default 0 check (max_chain between 0 and 1000),
  created_at timestamptz not null default now()
);
alter table scores enable row level security;
create policy "だれでも読める" on scores for select using (true);
create policy "だれでも記録できる" on scores for insert with check (true);
create index scores_score on scores (score desc);
```

anon public のキーは、ページの中に書いても問題ない公開用のキーです(読み取りと追加しかできないように、上の SQL で制限しています)。**service_role のキーは絶対にページに書かないでください。**

## 注意

- いまの仕組みでは、ブラウザから送られた点数をそのまま記録します。改造したブラウザから大きな点数を送ることは防げません。公開して広く遊んでもらう段階では、サーバー側で点数を検証する仕組み(Supabase Edge Functions など)を足すのが安全です
- 名前は他の人の入力なので、画面には文字として表示し、HTML として扱いません
