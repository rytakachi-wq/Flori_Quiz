// きせかえ(フロリの色・頭・体・顔・背景)と、そのもらい方(解放の条件)。成績(storage.js)から、条件を数える。
// 名前や個人情報は入れない。きせかえの選びかただけ、端末内に保存する。

const DRESS_KEY = "floriQuiz.dress";

// ---------------- 解放の条件 ----------------
// [id、クエスト名(「〜をクリアで ○○ GET!」の〜)、数えるもの、目標]
// 数えるもの:right=正解した問題の数  plays=遊んだ回数  perfect=全問正解の回数  perfectHard=難しいモードの全問正解の回数
//   oni=正解したオニ問題の数  streak=毎日1問を続けた最高の日数  daily=毎日1問をやった日数  versus=対戦の回数  review=復習を全部クリアした回数
//   dex=図鑑のカード  timed=制限時間をつけて遊んだ回数  timedPerfect=制限時間をつけて全問正解した回数  garden=お花畑の完成  total=総合得点
// 目標:数、または "playable"(ふつう+難しい問題の数)・"oni"(オニ問題の数)・"all"(全部の問題の数)
const SPEC = [
  ["first", "初めての正解", "right", 1], ["right5", "5問正解", "right", 5], ["right10", "10問正解", "right", 10], ["right15", "15問正解", "right", 15],
  ["right20", "20問正解", "right", 20], ["right30", "30問正解", "right", 30], ["right40", "40問正解", "right", 40], ["right50", "50問正解", "right", 50],
  ["right60", "60問正解", "right", 60], ["right70", "70問正解", "right", 70], ["right80", "80問正解", "right", 80], ["rightAll", "全問制覇", "right", "playable"],
  ["play1", "初めてのプレイ", "plays", 1], ["play5", "5回プレイ", "plays", 5], ["play10", "10回プレイ", "plays", 10], ["play20", "20回プレイ", "plays", 20],
  ["play30", "30回プレイ", "plays", 30], ["play50", "50回プレイ", "plays", 50], ["play75", "75回プレイ", "plays", 75], ["play100", "100回プレイ", "plays", 100],
  ["perfect", "5問パーフェクト", "perfect", 1], ["perfect3", "パーフェクト3回", "perfect", 3], ["perfect5", "パーフェクト5回", "perfect", 5],
  ["perfect10", "パーフェクト10回", "perfect", 10], ["perfect20", "パーフェクト20回", "perfect", 20],
  ["hardPerfect", "難しいパーフェクト", "perfectHard", 1], ["hardPerfect3", "難しいパーフェクト3回", "perfectHard", 3], ["hardPerfect5", "難しいパーフェクト5回", "perfectHard", 5],
  ["oni1", "オニ退治", "oni", 1], ["oni3", "オニ3問正解", "oni", 3], ["oni5", "オニ5問正解", "oni", 5], ["oni7", "オニ7問正解", "oni", 7], ["oniAll", "オニ全問制覇", "oni", "oni"],
  ["streak2", "毎日1問2日連続", "streak", 2], ["streak3", "毎日1問3日連続", "streak", 3], ["streak5", "毎日1問5日連続", "streak", 5], ["streak7", "毎日1問7日連続", "streak", 7],
  ["streak10", "毎日1問10日連続", "streak", 10], ["streak14", "毎日1問14日連続", "streak", 14], ["streak30", "毎日1問30日連続", "streak", 30],
  ["daily5", "毎日1問5日", "daily", 5], ["daily10", "毎日1問10日", "daily", 10], ["daily20", "毎日1問20日", "daily", 20],
  ["versus1", "初めての対戦", "versus", 1], ["versus3", "3回対戦", "versus", 3], ["versus5", "5回対戦", "versus", 5], ["versus10", "10回対戦", "versus", 10], ["versus20", "20回対戦", "versus", 20],
  ["review", "復習コンプリート", "review", 1], ["review3", "復習コンプリート3回", "review", 3], ["review5", "復習コンプリート5回", "review", 5],
  ["dex10", "図鑑10枚", "dex", 10], ["dex20", "図鑑20枚", "dex", 20], ["dex30", "図鑑30枚", "dex", 30], ["dex40", "図鑑40枚", "dex", 40], ["dex50", "図鑑50枚", "dex", 50],
  ["dex60", "図鑑60枚", "dex", 60], ["dex70", "図鑑70枚", "dex", 70], ["dex80", "図鑑80枚", "dex", 80], ["dexAll", "図鑑コンプリート", "dex", "all"],
  ["timed1", "時間チャレンジ", "timed", 1], ["timed5", "時間チャレンジ5回", "timed", 5], ["timed10", "時間チャレンジ10回", "timed", 10],
  ["timedPerfect", "時間内パーフェクト", "timedPerfect", 1], ["timedPerfect3", "時間内パーフェクト3回", "timedPerfect", 3],
  ["garden", "お花畑完成", "garden", 1], ["garden3", "お花畑3回完成", "garden", 3], ["garden5", "お花畑5回完成", "garden", 5],
  ["total10", "総合10点", "total", 10], ["total20", "総合20点", "total", 20], ["total30", "総合30点", "total", 30], ["total40", "総合40点", "total", 40],
  ["total50", "総合50点", "total", 50], ["total60", "総合60点", "total", 60], ["total70", "総合70点", "total", 70], ["total80", "総合80点", "total", 80],
  ["total90", "総合90点", "total", 90], ["total100", "総合100点", "total", 100],
];

const COUNT = {
  right: (c) => c.stats.right.length,
  plays: (c) => c.stats.plays,
  perfect: (c) => c.stats.perfect,
  perfectHard: (c) => c.stats.perfectHard,
  oni: (c) => c.stats.oniRight.length,
  streak: (c) => c.stats.dailyBest,
  daily: (c) => c.stats.dailyDays,
  versus: (c) => c.stats.versusPlays,
  review: (c) => c.stats.reviewClears,
  dex: (c) => c.stats.dex.length,
  timed: (c) => c.stats.timedPlays,
  timedPerfect: (c) => c.stats.timedPerfect,
  garden: (c) => c.stats.gardenClears,
  total: (c) => c.total,
};
// 数のあとに付ける、ことば(「いま 2 / 5問」のように)
const UNIT = { right: "問", plays: "回", perfect: "回", perfectHard: "回", oni: "問", streak: "日", daily: "日", versus: "回", review: "回", dex: "枚", timed: "回", timedPerfect: "回", garden: "回", total: "点" };
const GOAL = { playable: (c) => c.playable, oni: (c) => c.oni, all: (c) => c.all };

export const CONDITIONS = SPEC.map(([id, quest, key, goal]) => ({
  id,
  quest,
  unit: UNIT[key] ?? "",
  now: COUNT[key],
  goal: typeof goal === "string" ? GOAL[goal] : goal,
}));
const BY_ID = new Map(CONDITIONS.map((condition) => [condition.id, condition]));

const goalOf = (condition, ctx) => (typeof condition.goal === "function" ? condition.goal(ctx) : condition.goal);

// いま、条件を満たしている id の一覧
export function earnedBadges(ctx) {
  return CONDITIONS.filter((condition) => {
    const goal = goalOf(condition, ctx);
    return goal > 0 && condition.now(ctx) >= goal;
  }).map((condition) => condition.id);
}

// ---------------- もらえる順番(やさしい → むずかしい)----------------
// きせかえは全部で90こ(色15・頭25・体26・顔9・背景15)。やさしいものから順に、この表のとおりに、わりあてる。
// 条件の数(78)+星の数(12)で、ちょうど90。
const LADDER = [
  "first", "play1", "right5", "garden", "streak2", "versus1", "timed1", "dex10", "total10", { stars: 5 },
  "play5", "right10", "review", "perfect", "streak3", "dex20", "total20", "oni1", "versus3", "daily5",
  { stars: 10 }, "garden3", "right15", "play10", "right20", "perfect3", "streak5", "dex30", "total30", "oni3",
  "versus5", "review3", "play20", { stars: 15 }, "timedPerfect", "daily10", "hardPerfect", "right30", "perfect5", "streak7",
  "dex40", "total40", "oni5", "versus10", { stars: 20 }, "timed5", "garden5", "hardPerfect3", "play30", "right40",
  "dex50", "total50", "streak10", "perfect10", { stars: 25 }, "right50", "play50", "total60", "oni7", "versus20",
  "review5", { stars: 30 }, "timedPerfect3", "daily20", "dex60", "right60", "total70", "timed10", "hardPerfect5", "streak14",
  { stars: 40 }, "play75", "right70", "dex70", "total80", "perfect20", "oniAll", { stars: 50 }, "play100", "right80",
  "dex80", "total90", { stars: 60 }, "streak30", "rightAll", "dexAll", { stars: 75 }, "total100", { stars: 100 }, { stars: 150 },
];

// ---------------- 色と背景(同じ15色)----------------
// 見本の絵(swatch):金・銀・銅の光沢と、虹色は、グラデーションで表す。
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
  { id: "gold", name: "ゴージャスゴールド", tint: "#d9a21c", bg: SWATCH.gold, blue: "#e6b422", dark: "#8a5a0c", swatch: SWATCH.gold, color: { metal: ["#6e5e3a", "#a8935a", "#cdb878", "#e8dba8", "#faf4dc"] } },
  { id: "silver", name: "ミラクルシルバー", tint: "#aab2ba", bg: SWATCH.silver, blue: "#b9c2ca", dark: "#5a6670", swatch: SWATCH.silver, color: { metal: ["#555c64", "#949ca5", "#cdd3d9", "#f0f3f6", "#ffffff"] } },
  { id: "bronze", name: "どっしりブロンズ", tint: "#b8763a", bg: SWATCH.bronze, blue: "#c98a4a", dark: "#7a4416", swatch: SWATCH.bronze, color: { metal: ["#5e4838", "#8e7054", "#b8906c", "#d8bc9c", "#f0e2d2"] } },
  { id: "rainbow", name: "七色レインボー", tint: "#c9a8f0", bg: "linear-gradient(135deg, #ffd9d9, #fff3c4, #d9f7d9, #d9ecff, #ead9ff)", blue: "#c9a8f0", dark: "#7a50bd", swatch: SWATCH.rainbow, color: { rainbow: true } },
];
// もらえる順(やさしい → むずかしい)
const COLOR_ORDER = ["pink", "orange", "yellow", "green", "lime", "red", "purple", "white", "gray", "navy", "black", "bronze", "silver", "gold", "rainbow"];
const THEME_ORDER = ["pink", "yellow", "green", "lime", "orange", "purple", "red", "white", "gray", "navy", "black", "bronze", "silver", "gold", "rainbow"];

// うすい色の見本(フロリは、うすい色に染まるので、見本も、うすくする)
function soften(hex, amount = 0.5) {
  const mix = (i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amount) + 255 * amount);
  return `#${[1, 3, 5].map((i) => mix(i).toString(16).padStart(2, "0")).join("")}`;
}

// ---------------- 頭・体・顔のかざり(60こ:頭25・体26・顔9)----------------
// [絵の番号, 名前, 場所]。絵は assets/dress/head01.png など。場所 = フロリの絵の大きさに対する、中心(x, y)と、はば(w)、かたむき(r)、よこ・たての ふやし(sx, sy)、うしろ(back)。x,y,w は%。
// 並びは、もらえる順(やさしい → むずかしい)。
const HEAD = [
  [3, "ふたば", { x: 51.0, y: 0.4, w: 32 }],
  [2, "花", { x: 75.9, y: 8.2, w: 20 }],
  [1, "リボン", { x: 71.8, y: 7.3, w: 26 }],
  [19, "ちょうちょ", { x: 74.1, y: 7.8, w: 22 }],
  [20, "さくらんぼ", { x: 79.9, y: 11.5, w: 24 }],
  [4, "キャップ", { x: 54, y: 1.4, w: 66, sy: 0.75 }],
  [5, "ニット帽", { x: 50.7, y: -5.8, w: 57.1, sy: 0.8 }],
  [6, "ベレー帽", { x: 53, y: 2.5, w: 59, sy: 0.7 }],
  [14, "小鳥", { x: 50, y: 0.7, w: 22 }],
  [15, "ひよこ", { x: 50, y: 0.8, w: 22 }],
  [24, "星のかざり", { x: 66.6, y: 7.8, w: 36 }],
  [23, "ひまわり", { x: 79, y: 11, w: 30 }],
  [11, "猫耳", { x: 55.6, y: 1.2, w: 55, sy: 0.75 }],
  [12, "うさぎ耳", { x: 51.9, y: -7.7, w: 51.1, sy: 0.8 }],
  [13, "くま耳", { x: 52.5, y: 4.1, w: 72, sy: 0.75 }],
  [7, "コック帽", { x: 51.9, y: -6.4, w: 59.5, sy: 0.75 }],
  [17, "プロペラ帽", { x: 52.7, y: -3.7, w: 57.8, sy: 0.73 }],
  [16, "アンテナ", { x: 54.9, y: -6.0, w: 65.0, sx: 1.15, sy: 0.71 }],
  [22, "サンタ帽", { x: 51.8, y: -1.5, w: 65.3, sy: 0.75 }],
  [25, "麦わら帽子", { x: 50.5, y: 1.3, w: 62, sy: 0.8 }],
  [10, "卒業帽", { x: 48.1, y: -2.0, w: 38 }],
  [9, "魔女帽", { x: 54, y: -7.0, w: 50 }],
  [18, "天使の輪", { x: 52.2, y: 0.7, w: 57.4, sy: 0.8 }],
  [21, "ティアラ", { x: 55.1, y: 1.0, w: 54.2, sy: 0.75 }],
  [8, "王冠", { x: 50.7, y: -1.7, w: 60.1, sy: 0.8 }],
];
const BODY = [
  [2, "ボウタイ", { x: 52, y: 55, w: 38 }],
  [3, "ネクタイ", { x: 53, y: 64.9, w: 20 }],
  [1, "マフラー", { x: 49.9, y: 59.4, w: 50, r: 14, sx: 1.3 }],
  [4, "バンダナ", { x: 51.0, y: 64.0, w: 37.5 }],
  [19, "チョーカー", { x: 51.0, y: 61.2, w: 40 }],
  [15, "星のブローチ", { x: 62, y: 64, w: 20 }],
  [14, "名札", { x: 57.4, y: 65.4, w: 20 }],
  [13, "メダル", { x: 67, y: 62.6, w: 22 }],
  [26, "花のコサージュ", { x: 33.7, y: 64.5, w: 20 }],
  [7, "ハートポーチ", { x: 37.7, y: 71.8, w: 34 }],
  [20, "巾着", { x: 65.5, y: 70.9, w: 32 }],
  [21, "水筒", { x: 69.5, y: 73.7, w: 22 }],
  [25, "ペンのポケット", { x: 35.4, y: 70.0, w: 30 }],
  [12, "花のレイ", { x: 50.4, y: 66.1, w: 50 }],
  [18, "ハートのネックレス", { x: 48.7, y: 64.0, w: 44, sy: 0.7 }],
  [23, "レインボーのよだれかけ", { x: 53, y: 64.2, w: 39 }],
  [8, "ウエストポーチ", { x: 49.9, y: 67.2, w: 58, r: -20, sy: 0.85 }],
  [24, "くまのぬいぐるみ", { x: 75, y: 72, w: 36 }],
  [28, "ひよこのバッグ", { x: 48.3, y: 67.0, w: 73.0 }],
  [29, "うさぎのバッグ", { x: 47.8, y: 69.5, w: 74.0 }],
  [30, "懐中時計", { x: 51.0, y: 67.7, w: 22 }],
  [31, "金の鈴", { x: 52, y: 59, w: 18 }],
  [33, "星のステッキ", { x: 2.5, y: 30.4, w: 38 }],
  [34, "キャンディ", { x: -2.7, y: 30.4, w: 30 }],
  [27, "ブーケ", { x: 3.6, y: 29.4, w: 38 }],
  [38, "音符のバッジ", { x: 36.0, y: 64.0, w: 22 }],
];
const FACE = [
  [4, "汗", { x: 71, y: 39, w: 8 }],
  [6, "ばんそうこう", { x: 77.0, y: 39.1, w: 20, r: -20 }],
  [5, "涙", { x: 50.9, y: 40.0, w: 43.4 }],
  [1, "ハートのほっぺ", { x: 52.4, y: 35.0, w: 59.1 }],
  [3, "ぐるぐるほっぺ", { x: 52.5, y: 35.0, w: 60.4 }],
  [8, "ほっぺ線", { x: 50.7, y: 39.1, w: 55.7 }],
  [9, "メガネ", { x: 52.2, y: 29.0, w: 54, sx: 1.22 }],
  [10, "怒りマーク", { x: 79, y: 16, w: 20 }],
  [7, "きらきらの目", { x: 51.4, y: 31.2, w: 60.6 }],
];
const decorList = (slot, rows) =>
  rows.map(([sheet, name, pos]) => {
    const id = `${slot}${String(sheet).padStart(2, "0")}`;
    return { id, slot, img: `../assets/dress/${id}.png`, name, tint: "#7ec3e0", pos };
  });

const heads = decorList("head", HEAD);
const bodies = decorList("body", BODY);
const faces = decorList("face", FACE);

// 色・背景・かざりの、もらえる条件を、やさしい順に、わりあてる(カテゴリごとに、なるべくまんべんなく)
function assignUnlocks(groups) {
  const entries = [];
  for (const [list, rank] of groups) {
    const ordered = rank ? rank.map((id) => list.find((item) => item.id === id)) : list;
    ordered.forEach((item, index) => entries.push({ item, at: (index + 0.5) / ordered.length, tie: entries.length }));
  }
  entries.sort((a, b) => a.at - b.at || a.tie - b.tie);
  entries.forEach((entry, index) => {
    entry.item.unlock = LADDER[index] ?? LADDER[LADDER.length - 1];
  });
}

export const COLORS = [
  { id: "original", name: "ミルキーブルー", original: true, tint: "#7ec3e0", swatch: "linear-gradient(135deg, #f4fbff, #7ec3e0)", unlock: null },
  ...PALETTE.map((p) => ({ id: p.id, name: p.name, tint: p.tint, swatch: p.swatch ?? soften(p.tint), ...p.color, unlock: null })),
];
export const THEMES = [
  { id: "sky", name: "青空", tint: "#7ec3e0", preview: "linear-gradient(160deg, #eef8fd, #7ec3e0)", unlock: null },
  ...PALETTE.map((p) => ({ id: p.id, name: p.name, tint: p.tint, preview: p.swatch ?? `linear-gradient(160deg, ${p.bg}, ${p.blue})`, bg: p.bg, blue: p.blue, dark: p.dark, unlock: null })),
];
export const HEADS = [{ id: "none", slot: "head", img: "", name: "なし", tint: "#46555e", unlock: null }, ...heads];
export const BODIES = [{ id: "none", slot: "body", img: "", name: "なし", tint: "#46555e", unlock: null }, ...bodies];
export const FACES = [{ id: "none", slot: "face", img: "", name: "なし", tint: "#46555e", unlock: null }, ...faces];

assignUnlocks([
  [COLORS.slice(1), COLOR_ORDER],
  [THEMES.slice(1), THEME_ORDER],
  [heads, null],
  [bodies, null],
  [faces, null],
]);

// お試し:URL に ?tryall=1 を付けて開くと、着せ替えを、ぜんぶ選べる(端末内に覚える)。?tryall=0 で、もとにもどる。もらった数・NEW・ご褒美の記録は、かわらない。
const TRY_KEY = "floriQuiz.tryAll";
export const TRY_ALL = (() => {
  try {
    const q = new URLSearchParams(location.search).get("tryall");
    if (q === "1") localStorage.setItem(TRY_KEY, "1");
    else if (q === "0") localStorage.removeItem(TRY_KEY);
    return localStorage.getItem(TRY_KEY) === "1";
  } catch {
    return false;
  }
})();
export const canWear = (item, ctx) => TRY_ALL || isOpen(item, ctx);

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
  const quest = typeof u === "string" ? (BY_ID.get(u)?.quest ?? "") : `星${u.stars}個集め`;
  return `「${quest}」をクリア`;
}

// 手に入れ方の文(どこでも同じ言い方にそろえる)
export function getText(item) {
  return `${todoText(item)}で ${item.name} GET!`;
}

// もらうまでの、いまの数と目標({ now, goal })。数えられない条件は、null
export function progressOf(item, ctx) {
  const u = item.unlock;
  if (!u) return null;
  if (typeof u !== "string") return { now: Math.min(ctx.stats.stars, u.stars), goal: u.stars, unit: "個" };
  const condition = BY_ID.get(u);
  if (!condition) return null;
  const goal = goalOf(condition, ctx);
  return { now: Math.min(condition.now(ctx), goal), goal, unit: condition.unit };
}

// ---------------- ランク(総合得点で決まる)----------------
export const RANKS = [
  { min: 0, icon: "🥚", name: "たまご" },
  { min: 10, icon: "🐣", name: "ひよこ" },
  { min: 20, icon: "🐥", name: "ひよっこ探検家" },
  { min: 30, icon: "🐦", name: "ことり博士" },
  { min: 40, icon: "🦊", name: "きつね名人" },
  { min: 50, icon: "🐬", name: "イルカ先生" },
  { min: 60, icon: "🦉", name: "ふくろう博士" },
  { min: 70, icon: "🦄", name: "ユニコーン賢者" },
  { min: 80, icon: "🐉", name: "ドラゴン学者" },
  { min: 90, icon: "🌟", name: "ひらめきスター" },
  { min: 100, icon: "👑", name: "ひらめき王" },
];
export function rankOf(total) {
  return [...RANKS].reverse().find((rank) => total >= rank.min) ?? RANKS[0];
}

// ---------------- 選びかたの保存 ----------------
const DEFAULT_DRESS = { head: "none", body: "none", face: "none", theme: "sky", color: "original" };
const LISTS = { head: HEADS, body: BODIES, face: FACES, theme: THEMES, color: COLORS };

export function loadDress() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRESS_KEY) ?? "{}");
    const out = {};
    for (const [kind, list] of Object.entries(LISTS)) out[kind] = list.some((item) => item.id === saved[kind]) ? saved[kind] : DEFAULT_DRESS[kind];
    return out;
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
