"""index.html・style.css・js/*.js を 1 枚の HTML にまとめる(three.js は CDN から読む)。

使い方: python3 tools/bundle.py [出力先]   (出力先の既定は dist/valence.html)
各モジュールの import 行と export を外して、依存の順に並べるだけの単純なまとめ方。
モジュールどうしで同じ名前を最上位に置かないこと。
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ORDER = ['board', 'chem', 'sim', 'view', 'hud', 'audio', 'config', 'rank', 'main']
THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js'

out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'dist' / 'valence.html'
html = (ROOT / 'index.html').read_text(encoding='utf-8')
css = (ROOT / 'style.css').read_text(encoding='utf-8')

parts = ["import * as THREE from 'three';"]
for name in ORDER:
    src = (ROOT / 'js' / f'{name}.js').read_text(encoding='utf-8')
    src = re.sub(r"^import .*?;\s*$", '', src, flags=re.M)
    src = re.sub(r"^export (?=(const|let|class|function|async))", '', src, flags=re.M)
    parts.append(f'// ---- {name}.js ----\n{src}')
js = '\n'.join(parts)

html = html.replace('<link rel="stylesheet" href="style.css">', f'<style>\n{css}\n</style>')
html = re.sub(r'"three": "[^"]+"', f'"three": "{THREE_CDN}"', html)
html = html.replace('<script type="module" src="js/main.js"></script>', f'<script type="module">\n{js}\n</script>')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding='utf-8')
print('wrote', out, f'{len(html) // 1024} KB')
