# Flori_Quiz

マスコット「フロリ」と遊ぶ、ひらめき問題のクイズアプリ。1回5問、3〜5分。

開発方針は [scheme.md](scheme.md) を参照。

## 構成

| パス | 内容 |
|---|---|
| `scheme.md` | 開発方針（最優先の仕様書） |
| `CLAUDE.md` | AI向けの作業ルール |
| `src/` | アプリ本体（`index.html`、`main.js`、`game.js`、`storage.js`、`style.css`） |
| `assets/flori/` | フロリの画像（利用者が提供） |
| `data/questions/` | 問題と解説（全20問） |
| `docs/` | 決定事項の記録など |

## 動かし方

問題とフロリの画像を読み込むので、リポジトリの直下をサーバーで開く(ファイルを直接開くと動かない)。

```bash
python -m http.server 8000
```

ブラウザで `http://localhost:8000/src/` を開く。
