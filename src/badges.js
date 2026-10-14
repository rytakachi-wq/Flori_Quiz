// バッジ・称号・きせかえ・背景。成績(storage.js)から、もらえるバッジを数える。
// 名前や個人情報は入れない。きせかえの選びかただけ、端末内に保存する。

const DRESS_KEY = "floriQuiz.dress";

// バッジ:id、絵文字、名前、もらえる条件の説明、条件(ctx を受けとって true/false)
// ctx = { stats, total(総合得点), playable(ふつう+難しい問題の数), all(オニもふくむ全部の数), oni(オニの数) }
export const BADGES = [
  { id: "first", icon: "🌱", name: "はじめの一歩", text: "はじめて、問題に正解した", test: (c) => c.stats.right.length >= 1 },
  { id: "right10", icon: "🌿", name: "ひらめきの芽", text: "10問に正解した(問題の種類で数える)", test: (c) => c.stats.right.length >= 10 },
  { id: "right20", icon: "🌳", name: "ひらめきの木", text: "20問に正解した", test: (c) => c.stats.right.length >= 20 },
  { id: "rightAll", icon: "🌸", name: "ぜんぶ解いた!", text: "ふつうと難しいの問題に、全部正解した", test: (c) => c.stats.right.length >= c.playable },
  { id: "perfect", icon: "💯", name: "全問正解!", text: "5問で、全問正解した", test: (c) => c.stats.perfect >= 1 },
  { id: "perfect5", icon: "🏅", name: "全問正解の達人", text: "全問正解を、5回した", test: (c) => c.stats.perfect >= 5 },
  { id: "hardPerfect", icon: "🔥", name: "難しいモード制覇", text: "難しいモードで、全問正解した", test: (c) => c.stats.perfectHard >= 1 },
  { id: "oni1", icon: "👹", name: "オニを解いた", text: "オニ問題に、1問正解した", test: (c) => c.stats.oniRight.length >= 1 },
  { id: "oniAll", icon: "🏆", name: "オニたおし", text: "オニ問題に、全部正解した", test: (c) => c.oni > 0 && c.stats.oniRight.length >= c.oni },
  { id: "streak3", icon: "📅", name: "3日連続", text: "毎日1問を、3日続けた", test: (c) => c.stats.dailyBest >= 3 },
  { id: "streak7", icon: "🗓️", name: "7日連続", text: "毎日1問を、7日続けた", test: (c) => c.stats.dailyBest >= 7 },
  { id: "play10", icon: "🎈", name: "10回あそんだ", text: "5問を、10回遊んだ", test: (c) => c.stats.plays >= 10 },
  { id: "play50", icon: "🎉", name: "50回あそんだ", text: "5問を、50回遊んだ", test: (c) => c.stats.plays >= 50 },
  { id: "versus1", icon: "👥", name: "対戦デビュー", text: "みんなで対戦を、1回した", test: (c) => c.stats.versusPlays >= 1 },
  { id: "versus10", icon: "⚔️", name: "対戦の達人", text: "みんなで対戦を、10回した", test: (c) => c.stats.versusPlays >= 10 },
  { id: "review", icon: "📖", name: "おさらいクリア", text: "おさらいを、全部クリアした", test: (c) => c.stats.reviewClears >= 1 },
  { id: "dex10", icon: "📚", name: "図鑑コレクター", text: "図鑑に、10問のせた", test: (c) => c.stats.dex.length >= 10 },
  { id: "dexAll", icon: "📕", name: "図鑑コンプリート", text: "図鑑を、全部うめた", test: (c) => c.stats.dex.length >= c.all },
  { id: "timed1", icon: "⏱️", name: "スピードチャレンジ", text: "制限時間をつけて、1回遊んだ", test: (c) => c.stats.timedPlays >= 1 },
  { id: "timedPerfect", icon: "⚡", name: "はやわざ名人", text: "制限時間をつけて、全問正解した", test: (c) => c.stats.timedPerfect >= 1 },
  { id: "garden", icon: "🌸", name: "お花畑のたつじん", text: "お花畑を、完成させた", test: (c) => c.stats.gardenClears >= 1 },
  { id: "total50", icon: "⭐", name: "総合得点50点", text: "総合得点が、50点になった", test: (c) => c.total >= 50 },
  { id: "total100", icon: "🌟", name: "総合得点100点", text: "総合得点が、100点になった", test: (c) => c.total >= 100 },
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

export function titleFor(total) {
  return TITLES.find((title) => total >= title.min).name;
}

// いま、もらえているバッジの id の一覧
export function earnedBadges(ctx) {
  return BADGES.filter((badge) => badge.test(ctx)).map((badge) => badge.id);
}

// きせかえ(かざり)と背景。unlock は、必要なバッジの id(null なら、はじめから使える)
export const HATS = [
  { id: "none", icon: "", name: "なし", unlock: null },
  { id: "ribbon", icon: "🎀", name: "リボン", unlock: "first" },
  { id: "cap", icon: "🧢", name: "ぼうし", unlock: "play10" },
  { id: "sakura", icon: "🌸", name: "さくら", unlock: "garden" },
  { id: "grad", icon: "🎓", name: "はかせぼうし", unlock: "perfect" },
  { id: "crown", icon: "👑", name: "おうかん", unlock: "total50" },
  { id: "devil", icon: "😈", name: "オニのつの", unlock: "oni1" },
];

export const THEMES = [
  { id: "sky", name: "あおぞら", unlock: null },
  { id: "sakura", name: "さくら", unlock: "garden" },
  { id: "forest", name: "もり", unlock: "right20" },
  { id: "sunset", name: "ゆうやけ", unlock: "streak3" },
  { id: "night", name: "よぞら", unlock: "oni1" },
  { id: "rainbow", name: "にじ", unlock: "total100" },
];

export function badgeName(id) {
  return BADGES.find((badge) => badge.id === id)?.name ?? "";
}

// フロリの色(体の水色の部分だけ、色あいをかえる。目・ほお・口・線は、そのまま。flori-color.js)
// hue:色あい(0〜360)  gain:もとの色のこさを何倍にするか  minSat:いちばん薄い所でも、これだけは色をつける  gray:灰色
export const COLORS = [
  { id: "original", name: "もとの色", original: true, unlock: null },
  { id: "pink", name: "ピンク", hue: 338, gain: 2.6, minSat: 0.65, unlock: "first" },
  { id: "green", name: "みどり", hue: 130, gain: 2.4, minSat: 0.5, unlock: "right10" },
  { id: "yellow", name: "きいろ", hue: 50, gain: 3, minSat: 0.85, unlock: "play10" },
  { id: "purple", name: "むらさき", hue: 272, gain: 2.2, minSat: 0.5, unlock: "perfect" },
  { id: "orange", name: "オレンジ", hue: 28, gain: 3, minSat: 0.9, unlock: "streak3" },
  { id: "red", name: "あか", hue: 2, gain: 3, minSat: 0.8, unlock: "right20" },
  { id: "mint", name: "ミント", hue: 165, gain: 2.2, minSat: 0.5, unlock: "versus1" },
  { id: "lime", name: "きみどり", hue: 85, gain: 2.6, minSat: 0.7, unlock: "review" },
  { id: "lavender", name: "ラベンダー", hue: 255, gain: 1.8, minSat: 0.45, unlock: "dex10" },
  { id: "peach", name: "もも", hue: 18, gain: 2.4, minSat: 0.7, unlock: "timed1" },
  { id: "gray", name: "はいいろ", gray: true, unlock: "perfect5" },
  { id: "gold", name: "きん", hue: 42, gain: 3, minSat: 0.9, unlock: "total50" },
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
