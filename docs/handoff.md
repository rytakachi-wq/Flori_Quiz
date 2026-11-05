# 引きつぎメモ(別のセッションで作業を始める人は、最初にこれを読む)

プロジェクトの全体の決まりは [CLAUDE.md](../CLAUDE.md) と [scheme.md](../scheme.md)。決めたことの記録は [decisions.md](decisions.md)(その1〜その69、おおむね新しいほど下)。
これまでのやり取りの全文は、前のセッションの記録(`~/.claude/projects/C--Users-rytak-Documents-Flori-Quiz/*.jsonl`)にある。細かい経緯が必要なときだけ、そこを検索する。

## 作業の約束(利用者の指示)
- お試し全開放(`?tryall=1`)は、なくした(decisions その71)。
- 公開(`git push origin main`)は、利用者が「公開を更新して」と言ったときだけ。そのあと「Ctrl+F5 で読みこみ直して」と伝える。ふだんはローカルにコミットだけ(題名の終わりに「(未公開)」)。
- フロリの画像は描き直さない・別キャラを作らない。問題は独自作成で解説つき。個人情報は集めない(保存は端末の localStorage のみ)。
- 新しい文言は、漢字で書いて、ふりがな設定でふりがなが付くようにする。数字は半角。読点「、」は多用しない。文言を足したら `readingOf`/`segments` で読みを確かめる。
- 全画面が 320×568〜でも 1 画面に収まる。ボタンを押しても画面の大きさが変わらない。長い一覧だけ枠の中で動く。縦スクロールで他の画面に行かない。
- 戻るボタン(青い ↩ の絵)はどの画面も同じ位置。どの画面にもフロリを 1 体は出す。ボタンの色は絵文字の色に合わせる。フロリの色はうすい色合い。ふきだしは揺らさない。豆知識(src/talk.js)はクイズの問題と同じことを書かない。
- ご褒美の言い方:`「クエスト名」をクリアで ○○ GET!`。
- 決めたことは docs/decisions.md に追記。「未定」は勝手に決めず利用者に聞く。

## 作りの要点
- 素の JS(ES modules)。`src/`:main.js(画面・流れ)、game.js(出題・採点)、storage.js、badges.js(ご褒美の条件・着せ替えの表)、flori-color.js(色づけ)、talk.js(ふきだし・豆知識)、tutorial.js、audio.js/music.js、furigana.js/furigana-data.js、garden.js、illustrations.js、style.css、index.html。問題は data/questions/questions.json(遊べる 90 問+オニ 10 問。理系 31/文系 30/ひらめき 29)。
- 流れ:表紙(ホーム)→ クイズ → ルール(`screen-rules`:動画+共通+1人/皆で)→ モード選択(`screen-setup`:人数選択・分類・難しさ/皆の人数・制限時間+おすすめ+続きのしるし)→ スタートの確認(`screen-confirm`)→ 出題。皆で対戦でもヒント(点が半分)・「分からない」が使える。オニ問題は 10 問続けて出る。
- 表紙の背景は、`assets/bg/<背景id>.webp`(上半分そのまま+下半分上下反転、表紙の疑似要素)。着せ替えの背景を変えると、`--cover-bg` が変わる。
- 画面は 6 つのページ(ホーム・図鑑・着せ替え・成績・その他・設定。その他=毎日1問・復習[=まちがいノート。時間なし]・リラックス[先にムービー]・遊び方・`screen-note`・`showNote`。ムービーはノートからいつでも。decisions その62)を、下のタブと横スワイプで移動(`show(name, direction)`)。表紙のクリックでは動かない。
- ご褒美:条件 78+星 12=90 個を、色 15・背景 15・頭 25・体 26・顔 9 に割りあて(あとから、頭4・体9・顔2を、いちばん後ろに足した=105こ。`EXTRA_DECOR`・`EXTRA_LADDER`。そのあと「きらきらの目」を外して104こ、顔のかざり13こを足して117こ(顔23)。決めたことは decisions の その55〜その61。一覧の並びは系統順=`DISPLAY_ORDER`)(badges.js の SPEC/LADDER/assignUnlocks。表の並び=やさしい順)。かざりの画像は assets/dress/(head01〜25、body01〜38のうち26こ[番号は飛ぶ]、face 9こ)。位置・大きさは badges.js の表 `{x,y,w,r,sx,sy,back}`(sx/sy=横・縦の ふやし。CSS の scale で表す。利用者が赤丸・青丸で直した値)。作り方の記録:`docs/dress-request.md`(ChatGPT への依頼書)、元のシート・切り出し・見本は `assets/dress/new/`(コミットしていない作業用)。
- 絵文字は、描いた絵(`assets/illust/*.webp`)に自動で置きかわる(`src/emoji-img.js`。しくみと例外は decisions の「その54」)。**文字に絵文字を入れるだけで、対応表にあれば絵になる**。新しい絵文字を使うときは、MAP に絵を足す(絵はシートから `tools/illust/export.py` で切り出す)。
- ふりがな:furigana-data.js の ENTRIES(後ろの項目が優先。形は `漢字{よみ}送りがな`)、KYOIKU_BY_GRADE(学年別の漢字)。設定は 全部・多め[3年生以上]・少なめ[5年生以上]・なし(decisions その61)。
- 画面の収まり:style.css 末尾の `@media screen` の層(`:is(#screen-…)` でID指定に勝つ)、小さい画面用の規則、固定高の `.screen-head`(46px)。

- RPGクエスト(decisions その63):`game.js` の `RpgRound`、専用の画面 `screen-rpg`(`main.js` の `showRpg`/`rpgAnswer`/`rpgNext`、見た目は style.css 末尾)。専用の見た目(戦いの場+青いウィンドウ。style.css 末尾)。ヒントでハートが半分へる・ハート4つ・BGM=`TRACKS.quest`(ボスは `questboss`)・ルール説明=`rules.js` の `KINDS`(普通・難しい・RPG・皆で。decisions その69)。ハートの絵=ハートのブローチ(`assets/illust/heart.webp`)。モード選択の「遊び方」の行は、普通・難しい・RPG(`pick.level`=normal/hard/rpg)。**公開は更新していない**(手元で確認)。

- スタッフクレジット(decisions その75〜86):「その他」の一番下のボタン → `screen-credits`。`src/credits.js`(内容の表 `CREDITS`+流れるロール+ループ)、`src/shooter.js`(シューティング、canvas)。画面を離れると `closeCredits()` で止まる(main.js の `show`)。

## フロリを動かす(Live2D。アプリに入れた、2026-11-05に公開)
- モデル:デスクトップの `hehehe - コピー.cmo3`(利用者が絵を描きなおしたもの)から `python -I tools/cmo3/extract.py <cmo3> src/live2d` で `src/live2d/model.json`・`tex/` を作る(絵からはみ出した古いメッシュは、取り出すときに絵の大きさに合わせる)。描画は自作の `src/live2d/live2d.js`、動きは `src/live2d/flori-motion.js`(パラメーター名で動かす)。確かめ用ページ:`/src/live2d/cover.html`(クリックでぴょん)・`preview.html`(スライダー)。
- アプリへの入れ方:`src/live-flori.js`(main.js から `startLiveFlori()`)。ポーズつきの絵(`img.flori` で、POSE に合う `wave_*.png`・`body_wave.webp`)の上に、同じ場所・同じ大きさの canvas を重ねて、動くフロリを描く。絵(img)は残して `visibility:hidden`(大きさ・ゆれ・かざりの位置は、絵のもの)。かざりは decor-overlay.js のまま(canvas は `.decor-front` の中、または `.hero-fig` の中)。**クイズ画面(`#screen-question`・`#screen-rpg`)は動くフロリにしない。着せ替え画面は腕を動かさない。表紙はクリックで ぴょん**。絵のポーズに合わせて、`wave_wrong`=こまった顔・`wave_surprised`=びっくり顔でずっと固定。
- 位置合わせ(`live-flori.js` の S・X0・Y0):静止画(800×1003)の頭の幅・上端に合わせた(頭が3%せまく、体が4%長い)。かざりの位置は、静止画で決めた値のまま。腕・体のかざりは、少しずれるかもしれない(着せ替え画面で確かめて、必要なら badges.js の表を直す)。
- 色(着せ替えの色):`flori-color.js` の `recolorCanvas` で、体・頭・手足のパーツの絵を色づけして貼る(色が変わると `flori-color` イベントで作り直し)。
- 動き:`createMotion(model, { mood, noArms })`。同じ系統(顔 / 目 / 腕)を続けて出さない・直近の同じ種類をほとんど出さない。調整できる数字は、flori-motion.js の先頭(CROSS_PX・GAZE_PX・GAZE_EXTRA_R・ARM_L_BIAS など)と、live2d.js の LIP_TRIM。決めた経緯は decisions その49・その50(その1〜その31)。
- **まだ確かめていない**:結果・ゲームオーバー・ヒントのダイアログ・ルール説明のフロリ(ポーズ固定の動き)、実機のスマホでの重さ(約30コマ/秒に制限している)、`prefers-reduced-motion`、ふりがな設定ごとの画面の収まり。
- 開発用サーバー:`python tools/serve.py [ポート]`(既定 8780)。アプリは、このリポジトリの `.claude/launch.json` の `flori-quiz`(8765)でも見られる(こちらは接続が切れにくい)。標準の http.server は、画像を同時に読むと接続を切ることがある(live2d.js はやり直す)。
- 表紙の試作ページを、claude.ai の限定公開ページに置いてある(動きの確認用。アプリとは別。古いモデルのまま)。

## 動かして確かめる方法
- `python -m http.server 8766`(src を配信)をブラウザ画面で開き、resize_window で 320×568 / 375×667 / 390×844 / 768×1024 / 1024×768 を見る。サーバーが ERR_CONNECTION_RESET になったら再読みこみ。アニメーション中のスクショは薄く写る。
- テスト用の状態は localStorage に直接書いて作る。

## 文字の大きさ(設定)
- 「大きい・とても大きい」は `--ui-zoom`(画面ぜんたいの zoom)。上限と、@media の読みかえ、vh の置きかえは decisions その70。**新しい CSS で vh・dvh・vw を使うときは、`calc(N * var(--dvh))` の形にする**(zoom の中で、大きく出ないように)。@media の幅・高さは、そのまま書けば、zoom ぶん自動でずれる。

## 既知の残り(直してよい点)
- 問題のイラストの `↕`(q08)は絵がなく、文字のまま。CSS・SVG で描いている問題の絵(q28・q54・q73・q75・o04)は、新しい絵(`assets/illust/` の stairs・cards4・buckets・bags・clock_o04)に、まだ替えていない(使うかは未定)。
- 320×568 で、着せ替えの一覧が枠の中で少し動く(ルール画面は、動画をかくして収めた)。
- 表紙の背景は、横長の画像を、半分の高さに cover で入れているので、画面によって、模様の見える場所が変わる(位置は `30% 50%`)。気になれば直してよい。
- タブレット幅で、問題画面の戻るボタンだけ他より 4px 下。
- 紺色がまだ少し濃い。
- 音・BGM はエラーが出ないことだけ確認(耳での確認はまだ)。
- 設定は 320×568 で、スクロール枠が約30px動く(読み上げの速さのバーを足したため。直すなら、ふりがな/文字の大きさの箱をまとめる)。
- ふりがなは、辞書にない熟語が1文字ずつの読みでつながるとまちがえる。新しい文言を足したら、`segments` で、熟語ごとの読み(例:選択{せんたく})を確かめる。辞書は後ろの項目が優先。
- 成績は 320×568 でぴったり(furigana ありで scrollHeight=clientHeight)。項目を足すと収まらなくなるので、足すときは別の項目をまとめる。
- 図鑑の「ひらめき」タブが 320 幅で右端にぎりぎり。

## 現在の状態
- 公開ずみ:2026-11-05(動くフロリ・顔の線の修正まで)。これより後のコミットは、題名の終わりが「(未公開)」。
- 項目ごとにセッションを分けて進める。作業が終わったら、決めたことを decisions.md に、状態が変わったらこのファイルの「既知の残り」「現在の状態」を更新する。
- 着せ替えの色・背景: お試し(TRIAL)も、正式なご褒美になった(badges.js の TRIAL_SETS で、色と背景のセットごとに条件)。一覧は、ジャンルの見出し付き(SET_ORDER)。着せたとき、名前が枠の上を流れる(main.js の flowName)。
- 着せ替えの条件・レア度は、`src/dress-unlocks.js`(`UNLOCKS`・`RARITY`・移行用の`OLD_UNLOCKS`)。レア度の名前は badges.js の `RARITY_NAMES`(ノーマル・レア・スーパーレア・レジェンド)。条件を変えたら、`OLD_UNLOCKS` ではなく `UNLOCKS` を直す。RPGの条件は、storage.js の `recordRpg` で数える。

