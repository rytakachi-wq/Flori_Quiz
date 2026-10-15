// 問題ごとの、イラスト(絵文字と、かんたんな図)。文字をへらして、見ただけで場面が分かるように。
// 問題の uid(番号がつけなおされても変わらない)で、ひもづける。答えが分かってしまう絵には、しない。
// 動きは、style.css の ia- ではじまるクラス(ゆれる・はねる・すべる など)。

const e = (emoji, cls = "", delay = 0) => `<span class="ie ${cls}"${delay ? ` style="--d:${delay}s"` : ""}>${emoji}</span>`;
const t = (text, cls = "") => `<span class="it ${cls}">${text}</span>`;
const row = (...parts) => parts.join("");
const bars = (heights, cls = "", labels = []) =>
  `<span class="ibars ${cls}">${heights
    .map((h, i) => `<span class="ibar ${h === "?" ? "is-q" : ""}" style="--h:${h === "?" ? 70 : h}%;--d:${i * 0.12}s">${labels[i] ?? ""}</span>`)
    .join("")}</span>`;
const box = (text, cls = "") => `<span class="ibox ${cls}">${text}</span>`;

const ART = {
  // q01 水1滴+水1滴
  ufae16e5c: row(e("💧", "ia-slide-r"), t("＋"), e("💧", "ia-slide-l"), t("＝"), e("❓", "ia-pop")),
  // q02 海に面していない県
  u6db2c831: row(e("🌊", "ia-sway"), e("🗾", "ia-bob"), e("🌊", "ia-sway", 0.4), e("🐚", "ia-bob", 0.3)),
  // q03 影の長さ
  u44b5a205: row(e("☀️", "ia-spin-slow"), e("🧍", "ia-bob"), `<span class="ishadow"></span>`),
  // q04 ろうそく
  u3052da47: row(e("🕯️", "ia-flicker"), e("🕯️", "ia-flicker", 0.2), e("🕯️", "ia-bob"), e("🕯️", "ia-bob", 0.3), e("🕯️", "ia-bob", 0.6), e("💨", "ia-slide-r")),
  // q05 かけっこ
  u4e831231: row(e("🏃", "ia-run"), e("🏃‍♀️", "ia-run", 0.25), e("🏃‍♂️", "ia-run", 0.5), e("🏁", "ia-sway")),
  // q06 冷たい飲み物の水滴
  u146fc6b8: row(e("☀️", "ia-spin-slow"), e("🥤", "ia-bob"), e("💧", "ia-fall"), e("💧", "ia-fall", 0.7)),
  // q07 30日までの月
  u056ac32e: row(e("📅", "ia-bob"), box("30"), e("➡️", "ia-slide-r"), e("❓", "ia-pop")),
  // q08 サイコロ
  uff6b6f4d: row(e("⚂", "ia-roll"), e("↕️", "ia-bob"), e("🎲", "ia-roll", 0.3), e("❓", "ia-pop")),
  // q09 人口が一番多い都道府県
  u0bdd75bf: row(e("🗼", "ia-bob"), e("👥", "ia-pop"), e("🏙️", "ia-bob", 0.3), e("❓", "ia-pop", 0.5)),
  // q10 面積
  uf82373b2: row(e("🗾", "ia-bob"), e("📏", "ia-sway"), e("📐", "ia-sway", 0.3)),
  // q11 国旗の赤い丸
  u399b9bdc: `<span class="iflag"><span class="iflag-dot"></span></span>${e("❓", "ia-pop")}`,
  // q12 地図記号「文」
  ua61836ee: row(e("🗺️", "ia-bob"), `<span class="imapsym">文</span>`, e("❓", "ia-pop")),
  // q13 青信号
  u2995c8e4: row(e("🚦", "ia-blink"), e("🚶", "ia-run"), e("❓", "ia-pop")),
  // q14 ひもを切る
  u00a98518: row(e("🧵", "ia-bob"), e("✂️", "ia-snip"), t("×3"), e("❓", "ia-pop")),
  // q15 食べるの尊敬語
  u1c0bfc89: row(e("🧑‍🏫", "ia-bob"), e("🍙", "ia-pop"), e("🍵", "ia-bob", 0.3)),
  // q16 並ぶ4人
  u406f9146: `<span class="iline">${["A", "B", "C", "D"].map((l, i) => `<span class="iperson ia-bob" style="--d:${i * 0.2}s">🚶<b>${l}</b></span>`).join("")}</span>`,
  // q17 硬貨2枚
  u898cba24: row(e("🪙", "ia-roll"), e("🪙", "ia-roll", 0.3), t("＝"), box("60")),
  // q18 氷が溶ける
  u62e1e802: row(e("🥛", "ia-bob"), e("🧊", "ia-float"), e("💧", "ia-fall", 0.5)),
  // q19 数の並び(だんだん大きくなる)
  ub3fc5058: bars([14, 22, 36, 55, 80, "?"], "ia-grow-bars"),
  // q20 日本で2番目に高い山
  u6c29c7b3: row(e("🥇", "ia-pop"), e("🗻", "ia-bob"), e("🥈", "ia-pop", 0.3), e("⛰️", "ia-bob", 0.3)),
  // q21 ねことねずみ
  u2a199ccc: row(e("🐱", "ia-run"), e("🐱", "ia-run", 0.2), e("🐱", "ia-run", 0.4), e("🐭", "ia-bob"), e("🐭", "ia-bob", 0.2), e("🐭", "ia-bob", 0.4)),
  // q22 お湯が沸騰
  u44d6fc30: row(e("🔥", "ia-flicker"), e("🍲", "ia-bob"), e("♨️", "ia-fall-up"), e("🌡️", "ia-sway")),
  // q23 南を上にした地図
  u5f8188a1: row(e("🗺️", "ia-flip-half"), e("🧭", "ia-spin-slow"), e("❓", "ia-pop")),
  // q24 ねこの手も借りたい
  uac671342: row(e("🏃‍♂️", "ia-run"), e("💦", "ia-fall"), e("🐱", "ia-bob"), e("🐾", "ia-pop", 0.3)),
  // q25 日本一長い川
  u1a7023d8: row(e("🏞️", "ia-bob"), e("〰️", "ia-sway"), e("〰️", "ia-sway", 0.3), e("🌊", "ia-sway", 0.6)),
  // q26 雨降って地固まる
  uaddd618a: row(e("🌧️", "ia-bob"), e("➡️", "ia-slide-r"), e("🌈", "ia-pop"), e("🤝", "ia-pop", 0.3)),
  // q27 枯れ木も山のにぎわい
  uca450574: row(e("🍂", "ia-fall"), e("🌳", "ia-sway"), e("⛰️", "ia-bob"), e("🎉", "ia-pop", 0.3)),
  // q28 回文
  u912c1e6d: row(e("📜", "ia-bob"), e("🔁", "ia-spin-slow"), e("📜", "ia-bob", 0.3)),
  // q29 カレンダーの縦3つ
  uf2aa49c1: `<span class="icalendar">${box("")}${box("?", "is-q")}${box("")}</span>${e("🗓️", "ia-bob")}${t("＝42")}`,
  // q30 情けは人のためならず
  u6726478f: row(e("🤝", "ia-pop"), e("➡️", "ia-slide-r"), e("🔄", "ia-spin-slow"), e("😊", "ia-bob"), e("❓", "ia-pop", 0.5)),
  // q31 ふくろの札
  uef8770f5: `<span class="ibags">${[["🍎"], ["🍊"], ["🍎", "🍊"]].map((f, i) => `<span class="ibag ia-bob" style="--d:${i * 0.25}s"><span class="ibag-tag">${f.join("")}</span>🛍️</span>`).join("")}</span>`,
  // q32 鏡の時計
  uc4af73c8: row(e("🕓", "ia-bob"), e("🪞", "ia-flip"), e("🕓", "ia-flip", 0.2)),
  // q33 井戸のカエル
  ucbf506fa: row(e("🐸", "ia-updown"), e("⬆️", "ia-slide-up"), t("3"), e("⬇️", "ia-slide-down"), t("2")),
  // q34 時計の音
  u3c446dec: row(e("⏰", "ia-ring"), e("🔔", "ia-ring", 0.2), e("🔔", "ia-ring", 0.4), e("⏱️", "ia-bob")),
  // q35 はかりと指
  u62b76139: row(e("☝️", "ia-press"), e("🥛", "ia-bob"), e("⚖️", "ia-tilt")),
  // q36 北極点
  u91fd3c39: row(e("🧍", "ia-bob"), e("❄️", "ia-fall"), e("🌐", "ia-spin-slow")),
  // q37 4枚のカードを並べる
  uc306394d: `<span class="icards">${[1, 2, 3, 4].map((n, i) => `<span class="icard ia-shuffle" style="--d:${i * 0.15}s">${n}</span>`).join("")}</span>`,
  // q38 雨が降らないとは限らない
  uef0228b3: row(e("☁️", "ia-bob"), e("🤔", "ia-sway"), e("☔", "ia-bob", 0.3)),
  // q39 日本で一番東の島
  u152c4e98: row(e("🗾", "ia-bob"), e("➡️", "ia-slide-r"), e("🏝️", "ia-bob", 0.3), e("🧭", "ia-spin-slow")),
  // q40 100日後の曜日
  u985fbe66: row(e("📅", "ia-bob"), t("＋100"), e("➡️", "ia-slide-r"), e("❓", "ia-pop")),
  // q41 3つの扉
  u351f7200: row(e("🚪", "ia-swing"), e("🚪", "ia-bob"), e("🚪", "ia-bob", 0.3), e("🎁", "ia-pop", 0.5)),
  // q42 天びんと金貨
  ubf41e3c4: row(e("⚖️", "ia-tilt"), e("🪙", "ia-bob"), e("🪙", "ia-bob", 0.2), e("🪙", "ia-bob", 0.4)),
  // q43 2けたの数の入れかえ
  uc545691b: row(box("", "is-q"), box("", "is-q"), e("🔄", "ia-spin-slow"), box("", "is-q"), box("", "is-q")),
  // q44 本当を言う人とうそをつく人
  u8df2286a: row(e("😇", "ia-bob"), e("🗣️", "ia-pop"), e("😈", "ia-bob", 0.3), e("🗣️", "ia-pop", 0.3), e("🤔", "ia-sway")),
  // q45 5Lと3Lの容器
  u538275d7: `<span class="ijars"><span class="ijar j5"><span class="iwater"></span><b>5</b></span><span class="ijar j3"><span class="iwater"></span><b>3</b></span></span>${t("→")}${box("4", "is-q")}`,
  // q46 3でも5でも割り切れない数
  u901bea22: row(e("🔢", "ia-bob"), e("🔍", "ia-sway"), t("3"), t("5"), e("❓", "ia-pop")),
  // q47 足して20、かけて91
  u4747ec11: `<span class="istack"><span class="irow">${row(box("?", "is-q"), t("＋"), box("?", "is-q"), t("＝20"))}</span><span class="irow">${row(box("?", "is-q"), t("×"), box("?", "is-q"), t("＝91"))}</span></span>`,
  // q48 4人の並び方
  u056da16b: `<span class="iline">${["A", "B", "C", "D"].map((l, i) => `<span class="iperson ia-shuffle" style="--d:${i * 0.2}s">🧍<b>${l}</b></span>`).join("")}</span>${e("🚫", "ia-pop")}`,
  // q49 あまりの数
  ua843ac76: row(e("🍬", "ia-bob"), e("🍬", "ia-bob", 0.1), e("🍬", "ia-bob", 0.2), e("🍬", "ia-bob", 0.3), e("➗", "ia-spin-slow"), e("❓", "ia-pop")),
  // q50 オオカミ・ヤギ・キャベツ
  uc95c222b: row(e("🐺", "ia-bob"), e("🐐", "ia-bob", 0.2), e("🥬", "ia-bob", 0.4), e("🌊", "ia-sway"), e("🛶", "ia-boat")),
  // o01 21本の棒
  u15d2f312: row(e("🧑", "ia-bob"), e("🥢", "ia-pop"), e("🥢", "ia-pop", 0.1), e("🥢", "ia-pop", 0.2), e("🥢", "ia-pop", 0.3), e("🧑", "ia-bob", 0.3)),
  // o02 100枚の扉
  uc0a74a66: `<span class="idoors">${Array.from({ length: 10 }, (_, i) => `<span class="idoor" style="--d:${(i % 5) * 0.2 + Math.floor(i / 5) * 0.1}s"></span>`).join("")}</span>${e("🔄", "ia-spin-slow")}`,
  // o03 5人のことば
  ub3d53fe0: `<span class="ifaces">${[1, 2, 3, 4, 5].map((n, i) => `<span class="iface ia-bob" style="--d:${i * 0.15}s"><b>${n}</b>😀</span>`).join("")}</span>`,
  // o04 時計の針が重なる
  u1ba4bd48: `<svg class="iclock" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#46555e" stroke-width="4"/><g stroke="#46555e" stroke-width="3" stroke-linecap="round"><line x1="50" y1="8" x2="50" y2="14"/><line x1="92" y1="50" x2="86" y2="50"/><line x1="50" y1="92" x2="50" y2="86"/><line x1="8" y1="50" x2="14" y2="50"/></g><line class="ih-hour" x1="50" y1="50" x2="50" y2="26" stroke="#d8504a" stroke-width="6" stroke-linecap="round"/><line class="ih-min" x1="50" y1="50" x2="50" y2="14" stroke="#4a78d8" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="50" r="4" fill="#46555e"/></svg>`,
  // o05 夜に橋をわたる4人
  u0222dcac: row(e("🧍", "ia-bob"), e("🧍", "ia-bob", 0.15), e("🧍", "ia-bob", 0.3), e("🧍", "ia-bob", 0.45), e("🔦", "ia-flicker"), e("🌉", "ia-sway")),
};

// その問題の、イラストのHTML(ないときは、空)
export function illustrationFor(question) {
  const art = ART[question.uid ?? question.id];
  return art ? `<span class="qa-in">${art}</span>` : "";
}
