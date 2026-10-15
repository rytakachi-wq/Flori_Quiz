// きせかえ(フロリの色・かざり・背景)と、その解放の条件。成績(storage.js)から、条件を数える。
// 名前や個人情報は入れない。きせかえの選びかただけ、端末内に保存する。
// (むかしの「バッジ・称号」は、画面からなくした。条件を数えるしくみだけを、解放のために残している)

const DRESS_KEY = "floriQuiz.dress";

// 解放の条件:id、してほしいこと(todo)、いまの数(now)、目標(goal)。ctx = { stats, total, playable, all, oni }
export const CONDITIONS = [
  { id: "first", todo: "はじめて問題に正解する", now: (c) => c.stats.right.length, goal: 1 },
  { id: "right10", todo: "10問に正解する(問題の種類で数えます)", now: (c) => c.stats.right.length, goal: 10 },
  { id: "right20", todo: "20問に正解する", now: (c) => c.stats.right.length, goal: 20 },
  { id: "rightAll", todo: "ふつうと難しいの問題に、全部正解する", now: (c) => c.stats.right.length, goal: (c) => c.playable },
  { id: "perfect", todo: "5問で全問正解する", now: (c) => c.stats.perfect, goal: 1 },
  { id: "perfect5", todo: "全問正解を5回する", now: (c) => c.stats.perfect, goal: 5 },
  { id: "hardPerfect", todo: "難しいモードで全問正解する", now: (c) => c.stats.perfectHard, goal: 1 },
  { id: "oni1", todo: "オニ問題に1問正解する", now: (c) => c.stats.oniRight.length, goal: 1 },
  { id: "oniAll", todo: "オニ問題に全部正解する", now: (c) => c.stats.oniRight.length, goal: (c) => c.oni },
  { id: "streak3", todo: "毎日1問を3日続ける", now: (c) => c.stats.dailyBest, goal: 3 },
  { id: "streak7", todo: "毎日1問を7日続ける", now: (c) => c.stats.dailyBest, goal: 7 },
  { id: "play10", todo: "5問を10回遊ぶ", now: (c) => c.stats.plays, goal: 10 },
  { id: "play50", todo: "5問を50回遊ぶ", now: (c) => c.stats.plays, goal: 50 },
  { id: "versus1", todo: "みんなで対戦を1回する", now: (c) => c.stats.versusPlays, goal: 1 },
  { id: "versus10", todo: "みんなで対戦を10回する", now: (c) => c.stats.versusPlays, goal: 10 },
  { id: "review", todo: "おさらいを全部クリアする", now: (c) => c.stats.reviewClears, goal: 1 },
  { id: "dex10", todo: "問題図鑑に10問のせる", now: (c) => c.stats.dex.length, goal: 10 },
  { id: "dexAll", todo: "問題図鑑を全部うめる", now: (c) => c.stats.dex.length, goal: (c) => c.all },
  { id: "timed1", todo: "制限時間をつけて1回遊ぶ", now: (c) => c.stats.timedPlays, goal: 1 },
  { id: "timedPerfect", todo: "制限時間をつけて全問正解する", now: (c) => c.stats.timedPerfect, goal: 1 },
  { id: "garden", todo: "リラックスのお花畑を完成させる", now: (c) => c.stats.gardenClears, goal: 1 },
  { id: "total50", todo: "総合得点を50点にする", now: (c) => c.total, goal: 50 },
  { id: "total100", todo: "総合得点を100点にする", now: (c) => c.total, goal: 100 },
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
  { id: "flowers", img: "../assets/dress/flowers.png", name: "おはな", tint: "#6fb86a", unlock: "garden" },
  { id: "glasses", img: "../assets/dress/glasses.png", name: "まるメガネ", tint: "#4a78d8", unlock: "perfect" },
  { id: "crown", img: "../assets/dress/crown.png", name: "おうかん", tint: "#e0a020", unlock: "total50" },
  { id: "horns", img: "../assets/dress/horns.png", name: "オニのつの", tint: "#e8603a", unlock: "oni1" },
  { id: "starclip", img: "../assets/dress/starclip.png", name: "ほしのヘアピン", tint: "#f0c030", unlock: { stars: 5 } },
  { id: "sparkle", img: "../assets/dress/sparkle.png", name: "きらきら", tint: "#f2b61e", unlock: { stars: 10 } },
  { id: "scarf", img: "../assets/dress/scarf.png", name: "マフラー", tint: "#4aa0d8", unlock: { stars: 30 } },
];

export const THEMES = [
  { id: "sky", name: "あおぞら", tint: "#7ec3e0", preview: "linear-gradient(160deg, #eef8fd, #7ec3e0)", unlock: null },
  { id: "sakura", name: "さくら", tint: "#f0a8bd", preview: "linear-gradient(160deg, #fff4f7, #f0a8bd)", unlock: "garden" },
  { id: "forest", name: "もり", tint: "#9fd49a", preview: "linear-gradient(160deg, #f0faee, #8fcf8a)", unlock: "right20" },
  { id: "sunset", name: "ゆうやけ", tint: "#f4b072", preview: "linear-gradient(160deg, #fff3e0, #f08a4a)", unlock: "streak3" },
  { id: "night", name: "よぞら", tint: "#8c9bd4", preview: "linear-gradient(160deg, #3a4573, #1c2240)", unlock: "oni1" },
  { id: "rainbow", name: "にじ", tint: "#c9a8f0", preview: "linear-gradient(135deg, #ffd9d9, #fff3c4, #d9f7d9, #d9ecff, #ead9ff)", unlock: "total100" },
  { id: "starry", name: "ほしぞら", tint: "#9aa6e8", preview: "linear-gradient(160deg, #3a4aa8, #1a2052)", unlock: { stars: 20 } },
  { id: "comet", name: "ながれぼし", tint: "#b48cf0", preview: "linear-gradient(160deg, #6a4fc0, #1b2350)", unlock: { stars: 50 } },
];

// きせかえが使えるか(unlock:条件の id、または { stars: 必要な星の数 }、または null)
export function isOpen(item, { have, stars }) {
  const u = item.unlock;
  if (!u) return true;
  return typeof u === "string" ? have.has(u) : stars >= u.stars;
}

// 使えないときの、もらいかた(「〜する」の形)
export function todoText(item) {
  const u = item.unlock;
  if (!u) return "";
  return typeof u === "string" ? (CONDITIONS.find((condition) => condition.id === u)?.todo ?? "") : `制限時間のごほうびの星を ${u.stars}こ 集める`;
}

// もらうまでの、いまの数と目標({ now, goal })。数えられない条件は、null
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
