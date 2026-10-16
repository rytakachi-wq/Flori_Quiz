// きせかえ(フロリの色・かざり・背景)と、その解放の条件。成績(storage.js)から、条件を数える。
// 名前や個人情報は入れない。きせかえの選びかただけ、端末内に保存する。
// (むかしの「バッジ・称号」は、画面からなくした。条件を数えるしくみだけを、解放のために残している)

const DRESS_KEY = "floriQuiz.dress";

// 解放の条件:id、クエスト名(quest。「〜をクリアで〇〇 GET!」の〜に入る)、今の数(now)、目標(goal)。ctx = { stats, total, playable, all, oni }
export const CONDITIONS = [
  { id: "first", quest: "初めての正解", now: (c) => c.stats.right.length, goal: 1 },
  { id: "right10", quest: "10問正解", now: (c) => c.stats.right.length, goal: 10 },
  { id: "right20", quest: "20問正解", now: (c) => c.stats.right.length, goal: 20 },
  { id: "rightAll", quest: "全問制覇", now: (c) => c.stats.right.length, goal: (c) => c.playable },
  { id: "perfect", quest: "5問パーフェクト", now: (c) => c.stats.perfect, goal: 1 },
  { id: "perfect5", quest: "パーフェクト5回", now: (c) => c.stats.perfect, goal: 5 },
  { id: "hardPerfect", quest: "難しいパーフェクト", now: (c) => c.stats.perfectHard, goal: 1 },
  { id: "oni1", quest: "オニ退治", now: (c) => c.stats.oniRight.length, goal: 1 },
  { id: "oniAll", quest: "オニ全問制覇", now: (c) => c.stats.oniRight.length, goal: (c) => c.oni },
  { id: "streak3", quest: "毎日1問3日連続", now: (c) => c.stats.dailyBest, goal: 3 },
  { id: "streak7", quest: "毎日1問7日連続", now: (c) => c.stats.dailyBest, goal: 7 },
  { id: "play10", quest: "10回プレイ", now: (c) => c.stats.plays, goal: 10 },
  { id: "play50", quest: "50回プレイ", now: (c) => c.stats.plays, goal: 50 },
  { id: "versus1", quest: "初めての対戦", now: (c) => c.stats.versusPlays, goal: 1 },
  { id: "versus10", quest: "10回対戦", now: (c) => c.stats.versusPlays, goal: 10 },
  { id: "review", quest: "復習コンプリート", now: (c) => c.stats.reviewClears, goal: 1 },
  { id: "dex10", quest: "図鑑10枚", now: (c) => c.stats.dex.length, goal: 10 },
  { id: "dexAll", quest: "図鑑コンプリート", now: (c) => c.stats.dex.length, goal: (c) => c.all },
  { id: "timed1", quest: "時間チャレンジ", now: (c) => c.stats.timedPlays, goal: 1 },
  { id: "timedPerfect", quest: "時間内パーフェクト", now: (c) => c.stats.timedPerfect, goal: 1 },
  { id: "garden", quest: "お花畑完成", now: (c) => c.stats.gardenClears, goal: 1 },
  { id: "total50", quest: "総合50点", now: (c) => c.total, goal: 50 },
  { id: "total100", quest: "総合100点", now: (c) => c.total, goal: 100 },
];

const goalOf = (condition, ctx) => (typeof condition.goal === "function" ? condition.goal(ctx) : condition.goal);

// いま、条件を満たしている id の一覧
export function earnedBadges(ctx) {
  return CONDITIONS.filter((condition) => {
    const goal = goalOf(condition, ctx);
    return goal > 0 && condition.now(ctx) >= goal;
  }).map((condition) => condition.id);
}

export const HATS = [
  { id: "none", img: "", name: "なし", tint: "#46555e", unlock: null },
  { id: "ribbon", img: "../assets/dress/ribbon.png", name: "リボン", tint: "#d8455c", unlock: "first" },
  { id: "headphones", img: "../assets/dress/headphones.png", name: "ヘッドホン", tint: "#4a9ad8", unlock: "play10" },
  { id: "flowers", img: "../assets/dress/flowers.png", name: "お花", tint: "#6fb86a", unlock: "garden" },
  { id: "glasses", img: "../assets/dress/glasses.png", name: "丸メガネ", tint: "#4a78d8", unlock: "perfect" },
  { id: "crown", img: "../assets/dress/crown.png", name: "王冠", tint: "#e0a020", unlock: "total50" },
  { id: "horns", img: "../assets/dress/horns.png", name: "オニのつの", tint: "#e8603a", unlock: "oni1" },
  { id: "starclip", img: "../assets/dress/starclip.png", name: "星のヘアピン", tint: "#f0c030", unlock: { stars: 5 } },
  { id: "sparkle", img: "../assets/dress/sparkle.png", name: "キラキラ", tint: "#f2b61e", unlock: { stars: 10 } },
  { id: "scarf", img: "../assets/dress/scarf.png", name: "マフラー", tint: "#4aa0d8", unlock: { stars: 30 } },
  { id: "scarfred", img: "../assets/dress/scarfred.png", name: "赤いマフラー", tint: "#c0392b", unlock: "play50" },
  { id: "crowngold", img: "../assets/dress/crowngold.png", name: "金の冠", tint: "#f0a818", unlock: "total100" },
  { id: "strawhat", img: "../assets/dress/strawhat.png", name: "麦わら帽子", tint: "#d9a526", unlock: "streak3" },
  { id: "apron", img: "../assets/dress/apron.png", name: "エプロン", tint: "#f0a0a0", unlock: "versus1" },
  { id: "catears", img: "../assets/dress/catears.png", name: "猫耳", tint: "#f4b82a", unlock: "dex10" },
];

// 背景とフロリの色:同じ15色から選べる(名前も同じ)。見本の絵(swatch)は、金・銀・銅の光沢と、虹色を、グラデーションで表す。
const SWATCH = {
  gold: "linear-gradient(135deg, #fff6c0 0%, #f0c040 30%, #a8741a 58%, #ffe27a 82%, #fff6c0 100%)",
  silver: "linear-gradient(135deg, #ffffff 0%, #c9d0d6 30%, #7f8a94 58%, #e8edf1 82%, #ffffff 100%)",
  bronze: "linear-gradient(135deg, #fbe3c4 0%, #d79a5a 30%, #8a4f1e 58%, #f0c080 82%, #fbe3c4 100%)",
  rainbow: "linear-gradient(135deg, #ff6b6b, #ffb84a, #ffe94a, #6fd66f, #4ab4ff, #9a6bff)",
};

// id、名前、見本の色(tint)、背景(bg:背景の色、blue:ふち・ボタンの色、dark:題字の色)、フロリの色の作り方(color)
const PALETTE = [
  { id: "red", name: "炎のレッド", tint: "#d8504a", bg: "#ffe3e0", blue: "#f08a84", dark: "#b8352f", color: { hue: 2, gain: 3, minSat: 0.8 } },
  { id: "orange", name: "日だまりオレンジ", tint: "#ec8a3a", bg: "#ffeed8", blue: "#f4a85a", dark: "#bf6a1e", color: { hue: 28, gain: 3, minSat: 0.9 } },
  { id: "yellow", name: "ピカピカイエロー", tint: "#e0b920", bg: "#fff8d0", blue: "#f2d24a", dark: "#a8870a", color: { hue: 50, gain: 3, minSat: 0.85 } },
  { id: "lime", name: "若草ライム", tint: "#98c534", bg: "#f2fad0", blue: "#b6dc4c", dark: "#6f8f1a", color: { hue: 85, gain: 2.6, minSat: 0.7 } },
  { id: "green", name: "森のエメラルド", tint: "#4fae6a", bg: "#e4f3e1", blue: "#6fc088", dark: "#2f7d4c", color: { hue: 130, gain: 2.4, minSat: 0.5 } },
  { id: "purple", name: "魔法のパープル", tint: "#9a6ad0", bg: "#f0e6fb", blue: "#b08be0", dark: "#6a43a8", color: { hue: 272, gain: 2.2, minSat: 0.5 } },
  { id: "pink", name: "ときめきピンク", tint: "#e0709c", bg: "#fdeaf0", blue: "#f0a8bd", dark: "#c0587a", color: { hue: 338, gain: 2.6, minSat: 0.65 } },
  { id: "white", name: "雪だるまホワイト", tint: "#f4f6f8", bg: "#ffffff", blue: "#cfd6dc", dark: "#6b7a84", color: { tone: "white" } },
  { id: "black", name: "真夜中ブラック", tint: "#2c3038", bg: "#1b1d22", blue: "#9aa0ab", dark: "#2c3038", color: { tone: "black" } },
  { id: "navy", name: "深海ネイビー", tint: "#24367a", bg: "#1d2a55", blue: "#7f93d4", dark: "#24367a", color: { tone: "navy" } },
  { id: "gray", name: "曇り空グレー", tint: "#8a8f94", bg: "#e6e8ea", blue: "#a9b0b6", dark: "#5f6a72", color: { gray: true } },
  { id: "gold", name: "ゴージャスゴールド", tint: "#d9a21c", bg: SWATCH.gold, blue: "#e6b422", dark: "#8a5a0c", swatch: SWATCH.gold, color: { metal: ["#6b4510", "#b8821c", "#e8b830", "#fbe58a", "#fffbe0"] } },
  { id: "silver", name: "ミラクルシルバー", tint: "#aab2ba", bg: SWATCH.silver, blue: "#b9c2ca", dark: "#5a6670", swatch: SWATCH.silver, color: { metal: ["#555c64", "#949ca5", "#cdd3d9", "#f0f3f6", "#ffffff"] } },
  { id: "bronze", name: "どっしりブロンズ", tint: "#b8763a", bg: SWATCH.bronze, blue: "#c98a4a", dark: "#7a4416", swatch: SWATCH.bronze, color: { metal: ["#4a2810", "#8a5224", "#c27c3a", "#e6b074", "#fae0c0"] } },
  { id: "rainbow", name: "七色レインボー", tint: "#c9a8f0", bg: "linear-gradient(135deg, #ffd9d9, #fff3c4, #d9f7d9, #d9ecff, #ead9ff)", blue: "#c9a8f0", dark: "#7a50bd", swatch: SWATCH.rainbow, color: { rainbow: true } },
];

// もらえる条件(フロリの色 / 背景)
const COLOR_UNLOCK = { pink: "first", green: "right10", yellow: "play10", purple: "perfect", orange: "streak3", red: "right20", lime: "review", white: "versus1", black: "oni1", navy: "timed1", gray: "perfect5", bronze: "total50", silver: "hardPerfect", gold: "total100", rainbow: "rightAll" };
const THEME_UNLOCK = { pink: "garden", green: "right20", yellow: "dex10", purple: "oni1", orange: "streak7", red: "play50", lime: "total50", white: "versus10", black: "oniAll", navy: "timedPerfect", gray: { stars: 10 }, bronze: { stars: 20 }, silver: { stars: 30 }, gold: { stars: 50 }, rainbow: "total100" };

export const THEMES = [
  { id: "sky", name: "青空", tint: "#7ec3e0", preview: "linear-gradient(160deg, #eef8fd, #7ec3e0)", unlock: null },
  ...PALETTE.map((p) => ({ id: p.id, name: p.name, tint: p.tint, preview: p.swatch ?? `linear-gradient(160deg, ${p.bg}, ${p.blue})`, bg: p.bg, blue: p.blue, dark: p.dark, unlock: THEME_UNLOCK[p.id] })),
];

// きせかえが使えるか(unlock:条件の id、または { stars: 必要な星の数 }、または null)
export function isOpen(item, { have, stars }) {
  const u = item.unlock;
  if (!u) return true;
  return typeof u === "string" ? have.has(u) : stars >= u.stars;
}

// 使えないときの、もらいかた(クエスト名。「〜をクリア」の形)
export function todoText(item) {
  const u = item.unlock;
  if (!u) return "";
  const quest = typeof u === "string" ? (CONDITIONS.find((condition) => condition.id === u)?.quest ?? "") : `星${u.stars}個集め`;
  return `「${quest}」をクリア`;
}

// 手に入れ方の文(どこでも同じ言い方にそろえる)
export function getText(item) {
  return `${todoText(item)}で ${item.name} GET!`;
}

// もらうまでの、今の数と目標({ now, goal })。数えられない条件は、null
export function progressOf(item, ctx) {
  const u = item.unlock;
  if (!u) return null;
  if (typeof u !== "string") return { now: Math.min(ctx.stats.stars, u.stars), goal: u.stars };
  const condition = CONDITIONS.find((item2) => item2.id === u);
  if (!condition) return null;
  const goal = goalOf(condition, ctx);
  return { now: Math.min(condition.now(ctx), goal), goal };
}

// フロリの色(体の水色の部分だけ、色あいをかえる。目・ほお・口・線は、そのまま。flori-color.js)
// hue:色あい(0〜360)  gain:もとの色のこさを何倍にするか  minSat:1番薄い所でも、これだけは色をつける
// gray:灰色  tone:白・黒・紺  metal:金・銀・銅の光沢(暗い色→明るい色)  rainbow:虹色
export const COLORS = [
  { id: "original", name: "ミルキーブルー", original: true, tint: "#7ec3e0", swatch: "linear-gradient(135deg, #f4fbff, #7ec3e0)", unlock: null },
  ...PALETTE.map((p) => ({ id: p.id, name: p.name, tint: p.tint, swatch: p.swatch, ...p.color, unlock: COLOR_UNLOCK[p.id] })),
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
