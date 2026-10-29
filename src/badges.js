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
  // あとから足した かざり15こ用(もらえる順の、いちばん後ろ。EXTRA_LADDER)
  ["daily30", "毎日1問30日", "daily", 30], ["versus30", "30回対戦", "versus", 30], ["timed20", "時間チャレンジ20回", "timed", 20],
  ["review10", "復習コンプリート10回", "review", 10], ["perfect30", "パーフェクト30回", "perfect", 30], ["garden10", "お花畑10回完成", "garden", 10],
  ["timedPerfect5", "時間内パーフェクト5回", "timedPerfect", 5], ["hardPerfect10", "難しいパーフェクト10回", "perfectHard", 10],
  ["play150", "150回プレイ", "plays", 150], ["streak50", "毎日1問50日連続", "streak", 50], ["timed30", "時間チャレンジ30回", "timed", 30],
  ["daily50", "毎日1問50日", "daily", 50], ["versus50", "50回対戦", "versus", 50], ["play200", "200回プレイ", "plays", 200],
  // あとから足した 顔のかざり13こ用(そのまた後ろ。EXTRA_LADDER の おわり)
  ["perfect40", "パーフェクト40回", "perfect", 40], ["review15", "復習コンプリート15回", "review", 15], ["garden15", "お花畑15回完成", "garden", 15],
  ["timedPerfect8", "時間内パーフェクト8回", "timedPerfect", 8], ["daily70", "毎日1問70日", "daily", 70], ["hardPerfect15", "難しいパーフェクト15回", "perfectHard", 15],
  ["versus70", "70回対戦", "versus", 70], ["timed40", "時間チャレンジ40回", "timed", 40], ["play250", "250回プレイ", "plays", 250],
  ["streak70", "毎日1問70日連続", "streak", 70], ["perfect60", "パーフェクト60回", "perfect", 60], ["play300", "300回プレイ", "plays", 300],
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
// 条件の数(78)+星の数(12)で、ちょうど90。そのあとに、あとから足した かざり15こ(EXTRA_LADDER)が続く(全部で105)。
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
  { id: "red", name: "炎のレッド", tint: "#d8504a", bg: "#ffe3e0", blue: "#f08a84", dark: "#b8352f", color: { hue: 2, gain: 3, minSat: 0.88, boost: 1.16 } },
  { id: "orange", name: "日だまりオレンジ", tint: "#ec8a3a", bg: "#ffeed8", blue: "#f4a85a", dark: "#bf6a1e", color: { hue: 28, gain: 3, minSat: 0.9 } },
  { id: "yellow", name: "ピカピカイエロー", tint: "#e0b920", bg: "#fff8d0", blue: "#f2d24a", dark: "#a8870a", color: { hue: 50, gain: 3, minSat: 0.85 } },
  { id: "lime", name: "若草ライム", tint: "#98c534", bg: "#f2fad0", blue: "#b6dc4c", dark: "#6f8f1a", color: { hue: 85, gain: 2.6, minSat: 0.7 } },
  { id: "green", name: "森のエメラルド", tint: "#4fae6a", bg: "#e4f3e1", blue: "#6fc088", dark: "#2f7d4c", color: { hue: 130, gain: 2.4, minSat: 0.5 } },
  { id: "purple", name: "魔法のパープル", tint: "#9a6ad0", bg: "#f0e6fb", blue: "#b08be0", dark: "#6a43a8", color: { hue: 272, gain: 2.2, minSat: 0.5 } },
  { id: "pink", name: "ときめきピンク", tint: "#e0709c", bg: "#fdeaf0", blue: "#f0a8bd", dark: "#c0587a", color: { hue: 338, gain: 2.6, minSat: 0.65 } },
  { id: "white", name: "雪だるまホワイト", tint: "#9fabb4", swatch: "linear-gradient(135deg, #ffffff 0%, #ffffff 55%, #dfe5ea 100%)", bg: "#ffffff", blue: "#cfd6dc", dark: "#6b7a84", color: { tone: "white" } },
  { id: "black", name: "真夜中ブラック", tint: "#2c3038", bg: "#1b1d22", blue: "#9aa0ab", dark: "#2c3038", color: { tone: "black" } },
  { id: "navy", name: "深海ネイビー", tint: "#24367a", bg: "#1d2a55", blue: "#7f93d4", dark: "#24367a", color: { tone: "navy" } },
  { id: "gold", name: "ゴージャスゴールド", tint: "#d9a21c", bg: SWATCH.gold, blue: "#e6b422", dark: "#8a5a0c", swatch: SWATCH.gold, color: { metal: ["#6e5e3a", "#a8935a", "#cdb878", "#e8dba8", "#faf4dc"] } },
  { id: "silver", name: "ミラクルシルバー", tint: "#aab2ba", bg: SWATCH.silver, blue: "#b9c2ca", dark: "#5a6670", swatch: SWATCH.silver, color: { metal: ["#555c64", "#949ca5", "#cdd3d9", "#f0f3f6", "#ffffff"] } },
  { id: "bronze", name: "どっしりブロンズ", tint: "#b8763a", bg: SWATCH.bronze, blue: "#c98a4a", dark: "#7a4416", swatch: SWATCH.bronze, color: { metal: ["#5e4838", "#8e7054", "#b8906c", "#d8bc9c", "#f0e2d2"] } },
  { id: "rainbow", name: "七色レインボー", tint: "#c9a8f0", bg: "linear-gradient(135deg, #ffd9d9, #fff3c4, #d9f7d9, #d9ecff, #ead9ff)", blue: "#c9a8f0", dark: "#7a50bd", swatch: SWATCH.rainbow, color: { rainbow: true }, stage: "linear-gradient(135deg, #ffb3a7 0%, #ffd9a0 22%, #ffeea0 40%, #b9ecb5 60%, #a8d4ff 80%, #cbb6ff 100%)" },
];
// もらえる順(やさしい → むずかしい)
const COLOR_ORDER = ["pink", "orange", "yellow", "green", "lime", "red", "purple", "white", "navy", "black", "bronze", "silver", "gold", "rainbow"];
const THEME_ORDER = ["pink", "yellow", "green", "lime", "orange", "purple", "red", "white", "navy", "black", "bronze", "silver", "gold", "rainbow"];

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
  [4, "キャップ", { x: 54.0, y: 4.1, w: 52, sy: 0.75 }],
  [5, "ニット帽", { x: 50.7, y: -2.7, w: 46, sy: 0.8 }],
  [6, "ベレー帽", { x: 53, y: 2.5, w: 59, sy: 0.7 }],
  [14, "小鳥", { x: 50, y: 0.7, w: 22 }],
  [15, "ひよこ", { x: 50, y: 0.8, w: 22 }],
  [24, "星のかざり", { x: 66.6, y: 7.8, w: 36 }],
  [23, "ひまわり", { x: 79, y: 11, w: 30 }],
  [11, "猫耳", { x: 55.6, y: 1.2, w: 55, sy: 0.75 }],
  [12, "うさぎ耳", { x: 51.9, y: -4.7, w: 51.1, sy: 0.8, sx: 1.25 }],
  [13, "くま耳", { x: 52.5, y: 4.1, w: 72, sy: 0.75 }],
  [7, "コック帽", { x: 51.9, y: -6.4, w: 59.5, sy: 0.75 }],
  [17, "プロペラ帽", { x: 52.7, y: -3.7, w: 57.8, sy: 0.73 }],
  [16, "アンテナ", { x: 54.9, y: -2.8, w: 52, sx: 1.15, sy: 0.71 }],
  [22, "サンタ帽", { x: 58.3, y: -1.5, w: 65.3, sy: 0.75 }],
  [25, "麦わら帽子", { x: 50.5, y: 1.3, w: 62, sy: 0.8 }],
  [10, "卒業帽", { x: 53.1, y: -2.0, w: 38.0 }],
  [9, "魔女帽", { x: 54, y: -7.0, w: 50 }],
  [18, "天使の輪", { x: 52.2, y: 0.7, w: 57.4, sy: 0.8 }],
  [21, "ティアラ", { x: 55.1, y: 1.0, w: 54.2, sy: 0.75 }],
  [8, "王冠", { x: 52.8, y: -1.7, w: 60.1, sy: 0.8 }],
];
const BODY = [
  [2, "ボウタイ", { x: 52, y: 55, w: 38 }],
  [3, "ネクタイ", { x: 53.0, y: 62.2, w: 16 }],
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
  [18, "ハートのネックレス", { x: 52.8, y: 64.0, w: 44.0, sy: 0.7 }],
  [23, "レインボーのよだれかけ", { x: 53, y: 64.2, w: 39 }],
  [8, "ウエストポーチ", { x: 49.9, y: 67.2, w: 66, r: -20, sy: 0.85 }],
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
  [4, "汗", { x: 71.0, y: 39.0, w: 9.5 }],
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
// 一覧から外したかざり(利用者の指示)。もらえる順(assignUnlocks)は、いまの並びのまま変えないために、表には残して、見せないだけにする。
const REMOVED = new Set(["face07"]); // きらきらの目

// あとから足した かざり15こ(頭4・体9・顔2)。絵は assets/illust/<名前>.webp(絵文字の置きかえと同じシート)。
// 並びは、もらえる順(EXTRA_LADDER と同じ順)。場所 = フロリの絵に対する、中心(x, y)と はば(w)、かたむき(r)、左右反転(sx: -1)。
// 手に持つもの(体)は、バンザイの手(左上)に合わせた。体の欄は1つしか付けられないので、ほかの手に持つもの(星のステッキなど)とは、どれか1つ。
const EXTRA_DECOR = [
  ["face", 11, "ハートマーク", "heart", { x: 72, y: 36, w: 13 }],
  ["face", 12, "音符マーク", "note", { x: 77, y: 37, w: 13 }],
  ["head", 26, "四つ葉のクローバー", "clover", { x: 73, y: 7, w: 21 }],
  ["body", 39, "ダイヤのブローチ", "diamond", { x: 62, y: 64, w: 20 }],
  ["head", 27, "さくらの花", "sakura", { x: 74, y: 8, w: 21 }],
  ["body", 40, "ハートのブローチ", "heart", { x: 62, y: 64, w: 18 }],
  ["head", 28, "三日月", "moon", { x: 68, y: 7, w: 23 }],
  ["body", 41, "風船", "balloon", { x: 9.0, y: 17.9, w: 46 }],
  ["body", 42, "かぎのキーホルダー", "key", { x: 52, y: 61, w: 17 }],
  ["body", 43, "虫めがね", "magnifier", { x: 7.8, y: 23.3, w: 42, r: 45 }],
  ["body", 44, "地球儀", "globe", { x: 9.0, y: 16.6, w: 48 }],
  ["body", 45, "開いた本", "book", { x: 9.0, y: 31.2, w: 48 }],
  ["body", 46, "ゴールのはた", "flag", { x: -8.6, y: 25.5, w: 44, sx: -1 }],
  ["body", 47, "トロフィー", "trophy", { x: 9.0, y: 16.5, w: 58 }],
  ["head", 29, "シルクハット", "tophat", { x: 52.5, y: 0.5, w: 44 }],
  // 顔のかざり13こ(ChatGPT。位置は、顔の画面に合わせた。目:x≈33%・69%、y≈29%)
  ["face", 13, "ねこの鼻", "fp_nose", { x: 51.0, y: 32.0, w: 7 }],
  ["face", 14, "ほっぺの花", "fp_flowercheek", { x: 51.0, y: 36.0, w: 52 }],
  ["face", 15, "ほっぺの星", "fp_starcheek", { x: 51.0, y: 36.0, w: 52 }],
  ["face", 16, "そばかす", "fp_freckles", { x: 51.0, y: 35.5, w: 57 }],
  ["face", 17, "雪の結晶", "fp_snow", { x: 72.0, y: 37.0, w: 13 }],
  ["face", 18, "舌ぺろ", "fp_tongue", { x: 51.5, y: 43.0, w: 12 }],
  ["face", 19, "ちょびひげ", "fp_mustache", { x: 51.0, y: 34.2, w: 26 }],
  ["face", 20, "猫のひげ", "fp_whiskers", { x: 51.0, y: 35.8, w: 61.5 }],
  ["face", 21, "ぐるぐる目", "fp_spiral", { x: 51.0, y: 29.0, w: 55.2 }],
  ["face", 22, "ハートの目", "fp_hearteyes", { x: 51.0, y: 29.0, w: 55.9 }],
  ["face", 23, "サングラス", "fp_sunglasses", { x: 51.0, y: 29.5, w: 62.7 }],
  ["face", 24, "眼帯(白)", "fp_eyepatch", { x: 58.2, y: 23.5, w: 74.1 }],
  ["face", 25, "眼帯(黒)", "fp_eyepatch_black", { x: 58.2, y: 23.5, w: 74.1 }],
];
const EXTRA_LADDER = [
  "daily30", "versus30", "timed20", "review10", "perfect30", "garden10", "timedPerfect5", "hardPerfect10",
  "play150", "streak50", "timed30", "daily50", "versus50", "play200", { stars: 200 },
  // 顔のかざり13こ(やさしい順)
  "perfect40", "review15", "garden15", "timedPerfect8", "daily70", "hardPerfect15", "versus70", "timed40", "play250", "streak70", { stars: 250 }, "perfect60", "play300",
];
const extraOf = (slot) =>
  EXTRA_DECOR.map((row, index) => ({ row, unlock: EXTRA_LADDER[index] }))
    .filter(({ row }) => row[0] === slot)
    .map(({ row: [, number, name, slug, pos], unlock }) => ({
      id: `${slot}${String(number).padStart(2, "0")}`,
      slot,
      img: `../assets/illust/${slug}.webp`,
      name,
      tint: "#7ec3e0",
      pos,
      unlock,
    }));

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
  ...PALETTE.map((p) => ({ id: p.id, name: p.name, tint: p.tint, preview: p.swatch ?? `linear-gradient(160deg, ${p.bg}, ${p.blue})`, stage: p.stage, bg: p.bg, blue: p.blue, dark: p.dark, unlock: null })),
];
// 着せ替えの一覧は、系統ごとにまとめて並べる(もらえる順とは別。もらえる順は、assignUnlocks の表のまま)。
// 頭:帽子 → 頭の上(耳・冠・輪・ふたば・小鳥・ひよこ・アンテナ)→ 右上の飾り(花・リボンなど)
// 体:首まわり → 胸(ブローチ・バッジ)→ ポーチ・バッグ → 手に持つもの
// 顔:目のまわり(メガネ・涙・汗)→ ほっぺ(ハート・ぐるぐる・線・ばんそうこう)→ マーク(ハート・音符・怒り)
const DISPLAY_ORDER = {
  head: [
    ["head04", "head05", "head06", "head22", "head25", "head07", "head17", "head09", "head10", "head29"], // 帽子
    ["head11", "head12", "head13", "head08", "head21", "head18", "head03", "head14", "head15", "head16"], // 頭の上(耳・冠・輪・のせるもの)
    ["head01", "head02", "head19", "head20", "head23", "head24", "head26", "head27", "head28"], // 右上の飾り
  ],
  body: [
    ["body01", "body02", "body03", "body04", "body19", "body12", "body18", "body23", "body31", "body42"], // 首まわり(かぎのキーホルダーも)
    ["body15", "body14", "body13", "body38", "body39", "body40", "body26", "body30"], // 胸
    ["body07", "body20", "body21", "body25", "body08", "body28", "body29", "body24"], // ポーチ・バッグ
    ["body33", "body34", "body27", "body41", "body43", "body44", "body45", "body46", "body47"], // 手に持つもの
  ],
  face: [
    ["face09", "face23", "face24", "face25", "face21", "face22", "face05"], // 目のまわり(メガネ・サングラス・眼帯・ぐるぐる目・ハートの目・涙)
    ["face01", "face03", "face08", "face06", "face16", "face15", "face14", "face20"], // ほっぺ(猫のひげも)
    ["face13", "face19", "face18", "face11", "face12", "face10", "face17", "face04"], // 顔まわり(ねこの鼻・ちょびひげ・舌ぺろ・マーク類・汗)
  ],
};
// 系統ごとの、見出し(一覧に、線と文字で出す。どのあたりに着けるものかの説明)
const GROUP_LABELS = {
  head: ["帽子(頭にかぶる)", "頭の上", "頭の右上(かざる)"],
  body: ["首まわり", "胸(ブローチ・バッジ)", "おなか・腰(ポーチ・バッグ)", "手に持つ(左手)"],
  face: ["目のまわり", "ほっぺ", "顔まわり"],
};
export const groupLabel = (slot, group) => GROUP_LABELS[slot]?.[group] ?? "";
// 系統ごとに並べる。item.group に、系統の番号を入れる(一覧で、系統が変わるごとに改行するため)
const arrange = (slot, items) => {
  const rank = new Map();
  DISPLAY_ORDER[slot].forEach((ids, group) => ids.forEach((id) => rank.set(id, { group, order: rank.size })));
  for (const item of items) item.group = rank.get(item.id)?.group ?? DISPLAY_ORDER[slot].length;
  return [...items].sort((x, y) => (rank.get(x.id)?.order ?? 999) - (rank.get(y.id)?.order ?? 999));
};
export const HEADS = [{ id: "none", slot: "head", img: "", name: "なし", tint: "#46555e", unlock: null }, ...arrange("head", [...heads, ...extraOf("head")])];
export const BODIES = [{ id: "none", slot: "body", img: "", name: "なし", tint: "#46555e", unlock: null }, ...arrange("body", [...bodies, ...extraOf("body")])];
export const FACES = [{ id: "none", slot: "face", img: "", name: "なし", tint: "#46555e", unlock: null }, ...arrange("face", [...faces.filter((item) => !REMOVED.has(item.id)), ...extraOf("face")])];

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
