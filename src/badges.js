// バッジ・称号・きせかえ・背景。成績(storage.js)から、もらえるバッジを数える。
// 名前や個人情報は入れない。きせかえの選びかただけ、端末内に保存する。

const DRESS_KEY = "floriQuiz.dress";

// バッジ:id、絵文字、名前、もらえる条件の説明、条件(ctx を受けとって true/false)
// ctx = { stats, total(総合得点), playable(ふつう+難しい問題の数), all(オニもふくむ全部の数), oni(オニの数) }
export const BADGES = [
  { id: "first", icon: "🌱", name: "はじめの一歩", text: "はじめて問題に正解した", test: (c) => c.stats.right.length >= 1 },
  { id: "right10", icon: "🌿", name: "ひらめきの芽", text: "10問に正解した(問題の種類で数える)", test: (c) => c.stats.right.length >= 10 },
  { id: "right20", icon: "🌳", name: "ひらめきの木", text: "20問に正解した", test: (c) => c.stats.right.length >= 20 },
  { id: "rightAll", icon: "🌸", name: "ぜんぶ解いた!", text: "ふつうと難しいの問題に全部正解した", test: (c) => c.stats.right.length >= c.playable },
  { id: "perfect", icon: "💯", name: "全問正解!", text: "5問で全問正解した", test: (c) => c.stats.perfect >= 1 },
  { id: "perfect5", icon: "🏅", name: "全問正解の達人", text: "全問正解を5回した", test: (c) => c.stats.perfect >= 5 },
  { id: "hardPerfect", icon: "🔥", name: "難しいモード制覇", text: "難しいモードで全問正解した", test: (c) => c.stats.perfectHard >= 1 },
  { id: "oni1", icon: "👹", name: "オニを解いた", text: "オニ問題に1問正解した", test: (c) => c.stats.oniRight.length >= 1 },
  { id: "oniAll", icon: "🏆", name: "オニたおし", text: "オニ問題に全部正解した", test: (c) => c.oni > 0 && c.stats.oniRight.length >= c.oni },
  { id: "streak3", icon: "📅", name: "3日連続", text: "毎日1問を3日続けた", test: (c) => c.stats.dailyBest >= 3 },
  { id: "streak7", icon: "🗓️", name: "7日連続", text: "毎日1問を7日続けた", test: (c) => c.stats.dailyBest >= 7 },
  { id: "play10", icon: "🎈", name: "10回あそんだ", text: "5問を10回遊んだ", test: (c) => c.stats.plays >= 10 },
  { id: "play50", icon: "🎉", name: "50回あそんだ", text: "5問を50回遊んだ", test: (c) => c.stats.plays >= 50 },
  { id: "versus1", icon: "👥", name: "対戦デビュー", text: "みんなで対戦を1回した", test: (c) => c.stats.versusPlays >= 1 },
  { id: "versus10", icon: "⚔️", name: "対戦の達人", text: "みんなで対戦を10回した", test: (c) => c.stats.versusPlays >= 10 },
  { id: "review", icon: "📖", name: "おさらいクリア", text: "おさらいを全部クリアした", test: (c) => c.stats.reviewClears >= 1 },
  { id: "dex10", icon: "📚", name: "問題図鑑​コレクター", text: "問題図鑑に10問のせた", test: (c) => c.stats.dex.length >= 10 },
  { id: "dexAll", icon: "📕", name: "問題図鑑​コンプリート", text: "問題図鑑を全部うめた", test: (c) => c.stats.dex.length >= c.all },
  { id: "timed1", icon: "⏱️", name: "スピードチャレンジ", text: "制限時間をつけて1回遊んだ", test: (c) => c.stats.timedPlays >= 1 },
  { id: "timedPerfect", icon: "⚡", name: "はやわざ名人", text: "制限時間をつけて全問正解した", test: (c) => c.stats.timedPerfect >= 1 },
  { id: "garden", icon: "🌸", name: "お花畑のたつじん", text: "お花畑を完成させた", test: (c) => c.stats.gardenClears >= 1 },
  { id: "stars10", icon: "☆", name: "ほしひろい", text: "ごほうびの星を10こ集めた", test: (c) => c.stats.stars >= 10 },
  { id: "stars30", icon: "⭐", name: "ほしあつめ", text: "ごほうびの星を30こ集めた", test: (c) => c.stats.stars >= 30 },
  { id: "stars100", icon: "🌟", name: "ほしの王様", text: "ごほうびの星を100こ集めた", test: (c) => c.stats.stars >= 100 },
  { id: "total50", icon: "⭐", name: "総合得点50点", text: "総合得点が50点になった", test: (c) => c.total >= 50 },
  { id: "total100", icon: "🌟", name: "総合得点100点", text: "総合得点が100点になった", test: (c) => c.total >= 100 },
];

// 称号:総合得点で、きまる(高いほうから)
export const TITLES = [
  { min: 100, name: "ひらめきの王様" },
  { min: 80, name: "ひらめきマスター" },
  { min: 60, name: "ひらめき博士" },
  { min: 40, name: "ひらめき名人" },
  { min: 20, name: "ひらめき見習い" },
  { min: 0, name: "ひらめきのたまご" },
];

// ☆の称号:ごほうびの星の数で、きまる(10こから)
export const STAR_TITLES = [
  { min: 100, name: "ほしの王様" },
  { min: 60, name: "ほしのまほうつかい" },
  { min: 30, name: "ほしあつめ名人" },
  { min: 10, name: "ほしひろい" },
];

export function starTitleFor(stars) {
  return STAR_TITLES.find((title) => stars >= title.min)?.name ?? "";
}

export function titleFor(total) {
  return TITLES.find((title) => total >= title.min).name;
}

// いま、もらえているバッジの id の一覧
export function earnedBadges(ctx) {
  return BADGES.filter((badge) => badge.test(ctx)).map((badge) => badge.id);
}

// きせかえ(かざり)と背景。unlock は、必要なバッジの id(null なら、はじめから使える)
export const HATS = [
  { id: "none", icon: "", name: "なし", tint: "#46555e", unlock: null },
  { id: "ribbon", icon: "🎀", name: "リボン", tint: "#d8455c", unlock: "first" },
  { id: "cap", icon: "🧢", name: "ぼうし", tint: "#4a78d8", unlock: "play10" },
  { id: "sakura", icon: "🌸", name: "さくら", tint: "#f0809e", unlock: "garden" },
  { id: "grad", icon: "🎓", name: "はかせぼうし", tint: "#3a3a5c", unlock: "perfect" },
  { id: "crown", icon: "👑", name: "おうかん", tint: "#e0a020", unlock: "total50" },
  { id: "devil", icon: "😈", name: "オニのつの", tint: "#8a4fc7", unlock: "oni1" },
  { id: "starpin", icon: "⭐", name: "スターバッジ", tint: "#f0c030", unlock: { stars: 5 } },
  { id: "star", icon: "🌟", name: "ほしのかざり", tint: "#f2b61e", unlock: { stars: 10 } },
  { id: "gem", icon: "💎", name: "ほうせき", tint: "#3fb5d8", unlock: { stars: 30 } },
  { id: "comet", icon: "☄️", name: "ながれぼし", tint: "#7a8ef0", unlock: { stars: 50 } },
];

export const THEMES = [
  { id: "sky", name: "あおぞら", tint: "#7ec3e0", unlock: null },
  { id: "sakura", name: "さくら", tint: "#f0a8bd", unlock: "garden" },
  { id: "forest", name: "もり", tint: "#9fd49a", unlock: "right20" },
  { id: "sunset", name: "ゆうやけ", tint: "#f4b072", unlock: "streak3" },
  { id: "night", name: "よぞら", tint: "#8c9bd4", unlock: "oni1" },
  { id: "rainbow", name: "にじ", tint: "#c9a8f0", unlock: "total100" },
  { id: "starry", name: "ほしぞら", tint: "#9aa6e8", unlock: { stars: 20 } },
  { id: "comet", name: "ながれぼし", tint: "#b48cf0", unlock: { stars: 50 } },
];

// きせかえが使えるか(unlock:バッジの id、または { stars: 必要な星の数 }、または null)
export function isOpen(item, { have, stars }) {
  const u = item.unlock;
  if (!u) return true;
  return typeof u === "string" ? have.has(u) : stars >= u.stars;
}

// 使えないときの、もらいかたの説明
export function lockText(item) {
  const u = item.unlock;
  return typeof u === "string" ? `バッジ「${badgeName(u)}」` : `制限時間のごほうびの星 ${u.stars}こ`;
}

export function badgeName(id) {
  return BADGES.find((badge) => badge.id === id)?.name ?? "";
}

// フロリの色(体の水色の部分だけ、色あいをかえる。目・ほお・口・線は、そのまま。flori-color.js)
// hue:色あい(0〜360)  gain:もとの色のこさを何倍にするか  minSat:いちばん薄い所でも、これだけは色をつける  gray:灰色
export const COLORS = [
  { id: "original", name: "もとの色", original: true, tint: "#46555e", unlock: null },
  { id: "pink", name: "ピンク", hue: 338, gain: 2.6, minSat: 0.65, tint: "#e0709c", unlock: "first" },
  { id: "green", name: "みどり", hue: 130, gain: 2.4, minSat: 0.5, tint: "#4fae6a", unlock: "right10" },
  { id: "yellow", name: "きいろ", hue: 50, gain: 3, minSat: 0.85, tint: "#e0b920", unlock: "play10" },
  { id: "purple", name: "むらさき", hue: 272, gain: 2.2, minSat: 0.5, tint: "#9a6ad0", unlock: "perfect" },
  { id: "orange", name: "オレンジ", hue: 28, gain: 3, minSat: 0.9, tint: "#ec8a3a", unlock: "streak3" },
  { id: "red", name: "あか", hue: 2, gain: 3, minSat: 0.8, tint: "#d8504a", unlock: "right20" },
  { id: "mint", name: "ミント", hue: 165, gain: 2.2, minSat: 0.5, tint: "#3fb89a", unlock: "versus1" },
  { id: "lime", name: "きみどり", hue: 85, gain: 2.6, minSat: 0.7, tint: "#98c534", unlock: "review" },
  { id: "lavender", name: "ラベンダー", hue: 255, gain: 1.8, minSat: 0.45, tint: "#8c84dc", unlock: "dex10" },
  { id: "peach", name: "もも", hue: 18, gain: 2.4, minSat: 0.7, tint: "#f09a80", unlock: "timed1" },
  { id: "gray", name: "はいいろ", gray: true, tint: "#8a8f94", unlock: "perfect5" },
  { id: "gold", name: "きん", hue: 42, gain: 3, minSat: 0.9, tint: "#d9a21c", unlock: "total50" },
  { id: "starcolor", name: "ほしいろ", hue: 52, gain: 3, minSat: 0.75, tint: "#f0c828", unlock: { stars: 50 } },
];

const DEFAULT_DRESS = { hat: "none", theme: "sky", color: "original" };

export function loadDress() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRESS_KEY) ?? "{}");
    return {
      hat: HATS.some((hat) => hat.id === saved.hat) ? saved.hat : DEFAULT_DRESS.hat,
      theme: THEMES.some((theme) => theme.id === saved.theme) ? saved.theme : DEFAULT_DRESS.theme,
      color: COLORS.some((color) => color.id === saved.color) ? saved.color : DEFAULT_DRESS.color,
    };
  } catch {
    return { ...DEFAULT_DRESS };
  }
}

export function saveDress(dress) {
  try {
    localStorage.setItem(DRESS_KEY, JSON.stringify(dress));
  } catch {
    // 保存できなくても、そのページを開いている間は、かわったまま。
  }
}

export function resetDress() {
  saveDress(DEFAULT_DRESS);
  return { ...DEFAULT_DRESS };
}
