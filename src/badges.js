// きせかえ(フロリの色・頭・体・顔・背景)と、そのもらい方(解放の条件)。成績(storage.js)から、条件を数える。
// 名前や個人情報は入れない。きせかえの選びかただけ、端末内に保存する。

import { OLD_UNLOCKS, RARITY, UNLOCKS } from "./dress-unlocks.js";

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
  // あとから足した かざり15こ用
  ["daily30", "毎日1問30日", "daily", 30], ["versus30", "30回対戦", "versus", 30], ["timed20", "時間チャレンジ20回", "timed", 20],
  ["review10", "復習コンプリート10回", "review", 10], ["perfect30", "パーフェクト30回", "perfect", 30], ["garden10", "お花畑10回完成", "garden", 10],
  ["timedPerfect5", "時間内パーフェクト5回", "timedPerfect", 5], ["hardPerfect10", "難しいパーフェクト10回", "perfectHard", 10],
  ["play150", "150回プレイ", "plays", 150], ["streak50", "毎日1問50日連続", "streak", 50], ["timed30", "時間チャレンジ30回", "timed", 30],
  ["daily50", "毎日1問50日", "daily", 50], ["versus50", "50回対戦", "versus", 50], ["play200", "200回プレイ", "plays", 200],
  // あとから足した 顔のかざり13こ用
  ["perfect40", "パーフェクト40回", "perfect", 40], ["review15", "復習コンプリート15回", "review", 15], ["garden15", "お花畑15回完成", "garden", 15],
  ["timedPerfect8", "時間内パーフェクト8回", "timedPerfect", 8], ["daily70", "毎日1問70日", "daily", 70], ["hardPerfect15", "難しいパーフェクト15回", "perfectHard", 15],
  ["versus70", "70回対戦", "versus", 70], ["timed40", "時間チャレンジ40回", "timed", 40], ["play250", "250回プレイ", "plays", 250],
  ["streak70", "毎日1問70日連続", "streak", 70], ["perfect60", "パーフェクト60回", "perfect", 60], ["play300", "300回プレイ", "plays", 300],
  // RPG(rpgClear=クリアした回数 rpgPerfect=ノーダメージでクリアした回数 rpgBoss=ボス戦まで進んだ回数 rpgChest=宝箱の問題に正解した数)
  ["rpgClear1", "RPG制覇", "rpgClear", 1], ["rpgClear3", "RPG制覇3回", "rpgClear", 3], ["rpgClear5", "RPG制覇5回", "rpgClear", 5],
  ["rpgClear10", "RPG制覇10回", "rpgClear", 10], ["rpgClear20", "RPG制覇20回", "rpgClear", 20], ["rpgClear30", "RPG制覇30回", "rpgClear", 30],
  ["rpgPerfect1", "RPGノーダメージ制覇", "rpgPerfect", 1], ["rpgPerfect3", "RPGノーダメージ制覇3回", "rpgPerfect", 3],
  ["rpgPerfect5", "RPGノーダメージ制覇5回", "rpgPerfect", 5], ["rpgPerfect10", "RPGノーダメージ制覇10回", "rpgPerfect", 10],
  ["rpgBoss1", "RPGボス戦に初挑戦", "rpgBoss", 1], ["rpgBoss3", "RPGボス戦に3回挑戦", "rpgBoss", 3], ["rpgBoss5", "RPGボス戦に5回挑戦", "rpgBoss", 5],
  ["rpgBoss10", "RPGボス戦に10回挑戦", "rpgBoss", 10], ["rpgBoss20", "RPGボス戦に20回挑戦", "rpgBoss", 20],
  ["rpgChest3", "RPG宝箱3個", "rpgChest", 3], ["rpgChest5", "RPG宝箱5個", "rpgChest", 5],
  ["rpgChest10", "RPG宝箱10個", "rpgChest", 10], ["rpgChest20", "RPG宝箱20個", "rpgChest", 20],
  ["rpgChest30", "RPG宝箱30個", "rpgChest", 30],
  // 着せ替えを、ゆるやかに、少しずつ増やすための、あとからの条件(dress-unlocks.js で使う)
  ["play6", "6回プレイ", "plays", 6], ["play15", "15回プレイ", "plays", 15], ["play40", "40回プレイ", "plays", 40],
  ["play65", "65回プレイ", "plays", 65], ["play90", "90回プレイ", "plays", 90], ["play110", "110回プレイ", "plays", 110],
  ["play135", "135回プレイ", "plays", 135], ["play175", "175回プレイ", "plays", 175], ["play225", "225回プレイ", "plays", 225],
  ["play350", "350回プレイ", "plays", 350], ["play400", "400回プレイ", "plays", 400], ["play500", "500回プレイ", "plays", 500],
  ["play600", "600回プレイ", "plays", 600], ["play450", "450回プレイ", "plays", 450], ["play550", "550回プレイ", "plays", 550],
  ["play650", "650回プレイ", "plays", 650], ["play700", "700回プレイ", "plays", 700], ["play800", "800回プレイ", "plays", 800],
  ["perfect4", "パーフェクト4回", "perfect", 4], ["perfect6", "パーフェクト6回", "perfect", 6], ["perfect8", "パーフェクト8回", "perfect", 8],
  ["perfect12", "パーフェクト12回", "perfect", 12], ["perfect15", "パーフェクト15回", "perfect", 15], ["perfect18", "パーフェクト18回", "perfect", 18],
  ["perfect35", "パーフェクト35回", "perfect", 35], ["perfect45", "パーフェクト45回", "perfect", 45], ["perfect50", "パーフェクト50回", "perfect", 50],
  ["perfect70", "パーフェクト70回", "perfect", 70], ["perfect80", "パーフェクト80回", "perfect", 80], ["perfect100", "パーフェクト100回", "perfect", 100],
  ["perfect120", "パーフェクト120回", "perfect", 120], ["perfect150", "パーフェクト150回", "perfect", 150], ["perfect90", "パーフェクト90回", "perfect", 90],
  ["perfect110", "パーフェクト110回", "perfect", 110], ["perfect130", "パーフェクト130回", "perfect", 130], ["perfect160", "パーフェクト160回", "perfect", 160],
  ["perfect180", "パーフェクト180回", "perfect", 180], ["perfect200", "パーフェクト200回", "perfect", 200], ["hardPerfect6", "難しいパーフェクト6回", "perfectHard", 6],
  ["hardPerfect7", "難しいパーフェクト7回", "perfectHard", 7], ["hardPerfect8", "難しいパーフェクト8回", "perfectHard", 8], ["hardPerfect12", "難しいパーフェクト12回", "perfectHard", 12],
  ["hardPerfect20", "難しいパーフェクト20回", "perfectHard", 20], ["hardPerfect25", "難しいパーフェクト25回", "perfectHard", 25], ["hardPerfect30", "難しいパーフェクト30回", "perfectHard", 30],
  ["hardPerfect40", "難しいパーフェクト40回", "perfectHard", 40], ["hardPerfect50", "難しいパーフェクト50回", "perfectHard", 50], ["hardPerfect60", "難しいパーフェクト60回", "perfectHard", 60],
  ["streak12", "毎日1問12日連続", "streak", 12], ["streak18", "毎日1問18日連続", "streak", 18], ["streak25", "毎日1問25日連続", "streak", 25],
  ["streak60", "毎日1問60日連続", "streak", 60], ["streak100", "毎日1問100日連続", "streak", 100], ["streak150", "毎日1問150日連続", "streak", 150],
  ["streak200", "毎日1問200日連続", "streak", 200], ["streak250", "毎日1問250日連続", "streak", 250], ["streak300", "毎日1問300日連続", "streak", 300],
  ["streak365", "毎日1問365日連続", "streak", 365], ["daily3", "毎日1問3日", "daily", 3], ["daily15", "毎日1問15日", "daily", 15],
  ["daily35", "毎日1問35日", "daily", 35], ["daily100", "毎日1問100日", "daily", 100], ["daily150", "毎日1問150日", "daily", 150],
  ["daily200", "毎日1問200日", "daily", 200], ["daily250", "毎日1問250日", "daily", 250], ["daily300", "毎日1問300日", "daily", 300],
  ["daily365", "毎日1問365日", "daily", 365], ["versus35", "35回対戦", "versus", 35], ["versus40", "40回対戦", "versus", 40],
  ["versus60", "60回対戦", "versus", 60], ["versus100", "100回対戦", "versus", 100], ["versus150", "150回対戦", "versus", 150],
  ["versus80", "80回対戦", "versus", 80], ["versus90", "90回対戦", "versus", 90], ["versus120", "120回対戦", "versus", 120],
  ["review7", "復習コンプリート7回", "review", 7], ["review12", "復習コンプリート12回", "review", 12], ["review30", "復習コンプリート30回", "review", 30],
  ["review40", "復習コンプリート40回", "review", 40], ["review50", "復習コンプリート50回", "review", 50], ["review60", "復習コンプリート60回", "review", 60],
  ["review70", "復習コンプリート70回", "review", 70], ["review80", "復習コンプリート80回", "review", 80], ["review100", "復習コンプリート100回", "review", 100],
  ["timed3", "時間チャレンジ3回", "timed", 3], ["timed35", "時間チャレンジ35回", "timed", 35], ["timed60", "時間チャレンジ60回", "timed", 60],
  ["timed100", "時間チャレンジ100回", "timed", 100], ["timed120", "時間チャレンジ120回", "timed", 120], ["timed150", "時間チャレンジ150回", "timed", 150],
  ["timed200", "時間チャレンジ200回", "timed", 200], ["timed250", "時間チャレンジ250回", "timed", 250], ["timedPerfect16", "時間内パーフェクト16回", "timedPerfect", 16],
  ["timedPerfect20", "時間内パーフェクト20回", "timedPerfect", 20], ["timedPerfect25", "時間内パーフェクト25回", "timedPerfect", 25], ["timedPerfect30", "時間内パーフェクト30回", "timedPerfect", 30],
  ["timedPerfect40", "時間内パーフェクト40回", "timedPerfect", 40], ["timedPerfect50", "時間内パーフェクト50回", "timedPerfect", 50], ["timedPerfect60", "時間内パーフェクト60回", "timedPerfect", 60],
  ["garden7", "お花畑7回完成", "garden", 7], ["garden25", "お花畑25回完成", "garden", 25], ["garden40", "お花畑40回完成", "garden", 40],
  ["garden50", "お花畑50回完成", "garden", 50], ["garden60", "お花畑60回完成", "garden", 60], ["garden80", "お花畑80回完成", "garden", 80],
  ["rpgClear75", "RPG制覇75回", "rpgClear", 75], ["rpgClear100", "RPG制覇100回", "rpgClear", 100], ["rpgClear125", "RPG制覇125回", "rpgClear", 125],
  ["rpgPerfect4", "RPGノーダメージ制覇4回", "rpgPerfect", 4], ["rpgPerfect7", "RPGノーダメージ制覇7回", "rpgPerfect", 7], ["rpgPerfect12", "RPGノーダメージ制覇12回", "rpgPerfect", 12],
  ["rpgPerfect15", "RPGノーダメージ制覇15回", "rpgPerfect", 15], ["rpgPerfect20", "RPGノーダメージ制覇20回", "rpgPerfect", 20], ["rpgPerfect30", "RPGノーダメージ制覇30回", "rpgPerfect", 30],
  ["rpgBoss80", "RPGボス戦に80回挑戦", "rpgBoss", 80], ["rpgBoss100", "RPGボス戦に100回挑戦", "rpgBoss", 100], ["rpgBoss125", "RPGボス戦に125回挑戦", "rpgBoss", 125],
  ["rpgBoss150", "RPGボス戦に150回挑戦", "rpgBoss", 150], ["rpgChest75", "RPG宝箱75個", "rpgChest", 75], ["rpgChest125", "RPG宝箱125個", "rpgChest", 125],
  ["rpgChest150", "RPG宝箱150個", "rpgChest", 150], ["rpgChest200", "RPG宝箱200個", "rpgChest", 200], ["rpgChest250", "RPG宝箱250個", "rpgChest", 250],
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
  rpgClear: (c) => c.stats.rpgClears,
  rpgPerfect: (c) => c.stats.rpgNoDamage,
  rpgBoss: (c) => c.stats.rpgBoss,
  rpgChest: (c) => c.stats.rpgChests,
};
// 数のあとに付ける、ことば(「いま 2 / 5問」のように)
const UNIT = { right: "問", plays: "回", perfect: "回", perfectHard: "回", oni: "問", streak: "日", daily: "日", versus: "回", review: "回", dex: "枚", timed: "回", timedPerfect: "回", garden: "回", total: "点", rpgClear: "回", rpgPerfect: "回", rpgBoss: "回", rpgChest: "個" };
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
  [24, "星の飾り", { x: 66.6, y: 7.8, w: 36 }],
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
  ["head", 27, "桜の花", "sakura", { x: 74, y: 8, w: 21 }],
  ["body", 40, "ハートのブローチ", "heart", { x: 62, y: 64, w: 18 }],
  ["head", 28, "三日月", "moon", { x: 68, y: 7, w: 23 }],
  ["body", 41, "風船", "balloon", { x: 9.0, y: 17.9, w: 46 }],
  ["body", 42, "鍵のキーホルダー", "key", { x: 52, y: 61, w: 17 }],
  ["body", 43, "虫眼鏡", "magnifier", { x: 7.8, y: 23.3, w: 42, r: 45 }],
  ["body", 44, "地球儀", "globe", { x: 9.0, y: 16.6, w: 48 }],
  ["body", 45, "開いた本", "book", { x: 9.0, y: 31.2, w: 48 }],
  ["body", 46, "ゴールのはた", "flag", { x: -8.6, y: 25.5, w: 44, sx: -1 }],
  ["body", 47, "トロフィー", "trophy", { x: 9.0, y: 16.5, w: 58 }],
  ["head", 29, "シルクハット", "tophat", { x: 52.5, y: 0.5, w: 44 }],
  // 顔のかざり13こ(ChatGPT。位置は、顔の画面に合わせた。目:x≈33%・69%、y≈29%)
  ["face", 13, "猫の鼻", "fp_nose", { x: 51.0, y: 32.0, w: 7 }],
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
const extraOf = (slot) =>
  EXTRA_DECOR.map((row) => ({ row, unlock: null }))
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


// あとから足した色・背景(TRIAL)。背景は、着せ替えの画面の枠だけで、ほかの画面は、かわらない
const TRIAL = [
  { id: "skyblue", name: "空色", tint: "#4aa8ea", noTheme: true, color: { hue: 202, gain: 3, minSat: 0.95, boost: 1.5 }, stage: "linear-gradient(160deg, #e9f6ff, #6ab9f2)" },
  { id: "brown", name: "チョコブラウン", tint: "#8a5a3c", noColor: true, stage: "linear-gradient(160deg, #f4e6d8, #b98a62)" },
  { id: "wine", name: "ワインレッド", tint: "#a8405c", color: { hue: 344, gain: 2.4, minSat: 0.6, lmul: 0.7 }, stage: "linear-gradient(160deg, #f6e0e6, #b35a72)" },
  { id: "sunset", name: "夕焼け", tint: "#f59a7a", color: { sunset: true }, stage: "linear-gradient(180deg, #ffb3c8 0%, #ffc58a 45%, #c9a2f0 100%)" },
  { id: "starry", name: "星空", tint: "#34408a", noColor: true, stage: "radial-gradient(circle at 12% 18%, #fff 0 1px, transparent 1.6px), radial-gradient(circle at 31% 9%, #fff 0 1px, transparent 1.6px), radial-gradient(circle at 52% 21%, #fff 0 1.2px, transparent 1.8px), radial-gradient(circle at 74% 11%, #fff 0 1px, transparent 1.6px), radial-gradient(circle at 91% 24%, #fff 0 1.1px, transparent 1.7px), radial-gradient(circle at 6% 42%, #fff 0 1.1px, transparent 1.7px), radial-gradient(circle at 24% 38%, #fff 0 1px, transparent 1.6px), radial-gradient(circle at 44% 47%, #fff 0 1px, transparent 1.6px), radial-gradient(circle at 63% 39%, #fff 0 1.2px, transparent 1.8px), radial-gradient(circle at 82% 49%, #fff 0 1px, transparent 1.6px), radial-gradient(circle at 96% 62%, #fff 0 1px, transparent 1.6px), radial-gradient(circle at 15% 66%, #fff 0 1.2px, transparent 1.8px), radial-gradient(circle at 36% 74%, #fff 0 1px, transparent 1.6px), radial-gradient(circle at 57% 69%, #fff 0 1px, transparent 1.6px), radial-gradient(circle at 78% 78%, #fff 0 1.2px, transparent 1.8px), radial-gradient(circle at 9% 88%, #fff 0 1px, transparent 1.6px), radial-gradient(circle at 48% 91%, #fff 0 1px, transparent 1.6px), radial-gradient(circle at 90% 90%, #fff 0 1px, transparent 1.6px), linear-gradient(160deg, #1d2a55, #4a3d8f)" },
  { id: "sakura", name: "桜", tint: "#f3a7bd", noTheme: true, color: { sakura: true }, stage: "radial-gradient(ellipse 9px 5px at 10% 14%, #f7b6c9 0 100%, transparent 100%), radial-gradient(ellipse 9px 5px at 28% 30%, #f7b6c9 0 100%, transparent 100%), radial-gradient(ellipse 9px 5px at 47% 12%, #f7b6c9 0 100%, transparent 100%), radial-gradient(ellipse 9px 5px at 66% 28%, #f7b6c9 0 100%, transparent 100%), radial-gradient(ellipse 9px 5px at 86% 14%, #f7b6c9 0 100%, transparent 100%), radial-gradient(ellipse 9px 5px at 18% 52%, #f7b6c9 0 100%, transparent 100%), radial-gradient(ellipse 9px 5px at 40% 60%, #f7b6c9 0 100%, transparent 100%), radial-gradient(ellipse 9px 5px at 62% 50%, #f7b6c9 0 100%, transparent 100%), radial-gradient(ellipse 9px 5px at 90% 58%, #f7b6c9 0 100%, transparent 100%), radial-gradient(ellipse 9px 5px at 8% 82%, #f7b6c9 0 100%, transparent 100%), radial-gradient(ellipse 9px 5px at 30% 90%, #f7b6c9 0 100%, transparent 100%), radial-gradient(ellipse 9px 5px at 54% 80%, #f7b6c9 0 100%, transparent 100%), radial-gradient(ellipse 9px 5px at 76% 90%, #f7b6c9 0 100%, transparent 100%), linear-gradient(160deg, #fff4f7, #fbd3df)" },
  { id: "dots", name: "水玉", tint: "#f27fa6", noColor: true, color: { dots: true }, stage: "radial-gradient(circle at 34% 19%, #ffb3c8 0 9px, transparent 10px), radial-gradient(circle at 12% 53%, #ffb3c8 0 15px, transparent 16px), radial-gradient(circle at 57% 86%, #ffb3c8 0 12px, transparent 13px), radial-gradient(circle at 12% 14%, #ffb3c8 0 18px, transparent 19px), radial-gradient(circle at 89% 61%, #ffb3c8 0 9px, transparent 10px), radial-gradient(circle at 57% 41%, #ffb3c8 0 12px, transparent 13px), radial-gradient(circle at 10% 82%, #ffb3c8 0 15px, transparent 16px), radial-gradient(circle at 66% 15%, #ffb3c8 0 12px, transparent 13px), radial-gradient(circle at 39% 54%, #ffb3c8 0 9px, transparent 10px), radial-gradient(circle at 87% 38%, #ffb3c8 0 12px, transparent 13px), radial-gradient(circle at 92% 16%, #ffb3c8 0 18px, transparent 19px), radial-gradient(circle at 57% 66%, #ffb3c8 0 18px, transparent 19px), radial-gradient(circle at 84% 90%, #ffb3c8 0 12px, transparent 13px), radial-gradient(circle at 37% 92%, #ffb3c8 0 9px, transparent 10px), radial-gradient(circle at 49% 6%, #ffb3c8 0 9px, transparent 10px), radial-gradient(circle at 28% 71%, #ffb3c8 0 15px, transparent 16px), #fff7fa" },
  { id: "stripes", name: "ストライプ", tint: "#5aa9e6", color: { stripes: true }, stage: "repeating-linear-gradient(0deg, #cfe8fb 0 30px, #ffffff 30px 60px)" },
  { id: "snow", name: "雪の結晶", tint: "#9ccdf0", color: { snow: true }, stage: "radial-gradient(circle, #ffffff 0 8px, transparent 9px) 0 0 / 92px 92px, radial-gradient(circle, #ffffff 0 5px, transparent 6px) 46px 46px / 92px 92px, linear-gradient(160deg, #dff0fb, #a9d3f2)" },
  { id: "morning", name: "朝焼け", tint: "#ffc58a", color: { grad: ["#fff0a8", "#ffc3a0", "#ff9fbd"], gsat: 1 }, stage: "linear-gradient(180deg, #fff3b0 0%, #ffd0a8 50%, #ffa8c4 100%)" },
  { id: "sea", name: "海", tint: "#4a8fd8", color: { grad: ["#8ccfff", "#4a95e8", "#2a4fa0"], gsat: 1.2, glm: 0.9 }, stage: "linear-gradient(180deg, #bfe8ff 0%, #5aa6e8 55%, #2f4fa0 100%)" },
  { id: "forest", name: "森", tint: "#4fa86a", noColor: true, color: { grad: ["#e4f2a0", "#7cc57a", "#2f7d56"], gsat: 1 }, stage: "linear-gradient(180deg, #eaf5b4 0%, #86c880 55%, #34805a 100%)" },
  { id: "grape", name: "ぶどう", tint: "#9a6ad0", color: { grad: ["#c9a2f0", "#e08ad0", "#ffb0c8"], gsat: 1 }, stage: "linear-gradient(180deg, #cdb0f4 0%, #e496d6 55%, #ffb8cc 100%)" },
  { id: "aurora", name: "オーロラ", tint: "#5fd0a8", color: { grad: ["#9af0c8", "#7ab0f0", "#b08af0"], gsat: 1 }, stage: "linear-gradient(180deg, #1d2a55 0%, #2f7a8a 35%, #6adcb0 60%, #9a7af0 100%)" },
  { id: "candy", name: "キャンディ", tint: "#f08ab8", color: { grad: ["#ffb0d0", "#e8c0f0", "#a8dcff"], gsat: 1 }, stage: "linear-gradient(180deg, #ffbcd6 0%, #ecc8f4 50%, #b0e0ff 100%)" },
  { id: "gingham", name: "ギンガムチェック", tint: "#f0809a", color: { pat: "gingham" }, stage: "repeating-linear-gradient(0deg, rgba(255,160,185,.45) 0 34px, transparent 34px 68px), repeating-linear-gradient(90deg, rgba(255,160,185,.45) 0 34px, transparent 34px 68px), #fff" },
  { id: "hearts", name: "ハート", tint: "#f06a94", color: { pat: "hearts" }, stage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23fff6f9'/%3E%3Cpath d='M32 48 C10 33 14 15 25 16 C29 16 31 19 32 22 C33 19 35 16 39 16 C50 15 54 33 32 48Z' fill='%23ffb0c8'/%3E%3C/svg%3E\") 0 0 / 64px 64px" },
  { id: "border", name: "斜めボーダー", tint: "#4cc0a0", color: { pat: "border" }, stage: "repeating-linear-gradient(45deg, #bdeedd 0 30px, #ffffff 30px 100px)" },
  { id: "checker", name: "市松", tint: "#6a7ac0", color: { pat: "checker" }, stage: "conic-gradient(#c9d0f0 25%, #ffffff 0 50%, #c9d0f0 0 75%, #ffffff 0) 0 0 / 104px 104px" },
  { id: "wave", name: "波", tint: "#4aa0e0", color: { pat: "wave" }, stage: "repeating-linear-gradient(0deg, #cfe8fb 0 24px, #ffffff 24px 84px)" },
  { id: "diamond", name: "ひし形", tint: "#a078d0", color: { pat: "diamond" }, stage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='104' height='104'%3E%3Crect width='104' height='104' fill='%23fff'/%3E%3Cpath d='M52 26 L74 52 L52 78 L30 52Z' fill='%23e6d8f6'/%3E%3C/svg%3E\") 0 0 / 104px 104px" },
  { id: "leaves", name: "葉っぱ", tint: "#6ab870", color: { pat: "leaves" }, stage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%23fbfdf0'/%3E%3Cellipse cx='36' cy='36' rx='22' ry='9' transform='rotate%28-35 36 36%29' fill='%23b8e0a8'/%3E%3Cellipse cx='88' cy='88' rx='22' ry='9' transform='rotate%28-35 88 88%29' fill='%23b8e0a8'/%3E%3C/svg%3E\") 0 0 / 120px 120px" },
  { id: "rdots", name: "虹色の水玉", tint: "#e07ab0", color: { pat: "rainbowdots" }, stage: "radial-gradient(circle, #ff9aa8 0 11px, transparent 12px) 0 0 / 120px 120px, radial-gradient(circle, #ffd04a 0 11px, transparent 12px) 60px 0 / 120px 120px, radial-gradient(circle, #8ad88a 0 11px, transparent 12px) 0 60px / 120px 120px, radial-gradient(circle, #7ab8ff 0 11px, transparent 12px) 60px 60px / 120px 120px, #fff" },
  { id: "water", name: "水彩", tint: "#a0b8e8", color: { pat: "watercolor" }, stage: "radial-gradient(circle at 20% 25%, rgba(255,170,200,.7), transparent 45%), radial-gradient(circle at 80% 30%, rgba(150,200,255,.7), transparent 45%), radial-gradient(circle at 50% 85%, rgba(255,230,150,.7), transparent 50%), #fff" },
  { id: "clouds", name: "くも", tint: "#7ab8f0", noColor: true, stage: "radial-gradient(ellipse 60px 22px at 20% 24%, #fff 0 100%, transparent 100%), radial-gradient(ellipse 44px 18px at 28% 20%, #fff 0 100%, transparent 100%), radial-gradient(ellipse 66px 24px at 74% 40%, #fff 0 100%, transparent 100%), radial-gradient(ellipse 46px 18px at 66% 36%, #fff 0 100%, transparent 100%), radial-gradient(ellipse 56px 20px at 38% 74%, #fff 0 100%, transparent 100%), linear-gradient(180deg, #7ac4f8, #cfeaff)" },
];

// 追加した背景の、ほかの画面・ボタンの色:[画面の背景, ふち・ボタンの色, 題字の色]
const TRIAL_THEME = {
  brown: ["#f6e9dc", "#c99a74", "#7a4e30"], wine: ["#f8e6ea", "#c9687f", "#8a2f48"], sunset: ["#ffe8e0", "#f0a07a", "#b4587a"],
  starry: ["#1d2a55", "#7f93d4", "#34408a"], dots: ["#fff0f5", "#f29ab8", "#c0587a"], stripes: ["#eef7fd", "#7fbdee", "#3d86bd"],
  snow: ["#e8f4fc", "#8fc4ec", "#4a86b8"], morning: ["#fff1dc", "#f5b080", "#c0704a"], sea: ["#dff0fc", "#5aa6e8", "#2f5da0"],
  forest: ["#e6f3de", "#6fb878", "#2f7d56"], grape: ["#f1e8fb", "#b690e0", "#7a50b0"], aurora: ["#1d3340", "#6adcb0", "#2f7a8a"],
  candy: ["#fdeaf4", "#ec9ac4", "#b0609a"], gingham: ["#fff0f3", "#f59ab0", "#c0587a"], hearts: ["#fff0f4", "#f58aa8", "#c04870"],
  border: ["#e9f9f2", "#7fd4b4", "#2f9a78"], checker: ["#eef0fb", "#98a4e0", "#5060b0"], wave: ["#e8f4fc", "#6fb4e8", "#3a80b8"],
  diamond: ["#f4edfb", "#b896e0", "#7a50b0"], leaves: ["#f1f9e4", "#86c880", "#4a8a50"], rdots: ["#fff8f0", "#f5a0b8", "#b06090"],
  water: ["#f2f4fc", "#a0b8e8", "#6078b8"], clouds: ["#e3f2ff", "#7ab8f0", "#3a80c0"],
};

export const COLORS = [
  { id: "original", name: "ミルキーブルー", original: true, tint: "#7ec3e0", swatch: "linear-gradient(135deg, #f4fbff, #7ec3e0)", unlock: null },
  ...PALETTE.map((p) => ({ id: p.id, name: p.name, tint: p.tint, swatch: p.swatch ?? soften(p.tint), ...p.color, unlock: null })),
  ...TRIAL.filter((p) => !p.noColor).map((p) => ({ id: p.id, name: p.name, tint: p.tint, swatch: p.color.hue === undefined ? p.stage : soften(p.tint), ...p.color, unlock: null, trial: true })),
];
export const THEMES = [
  { id: "sky", name: "青空", tint: "#7ec3e0", preview: "linear-gradient(160deg, #eef8fd, #7ec3e0)", unlock: null },
  ...PALETTE.map((p) => ({ id: p.id, name: p.name, tint: p.tint, preview: p.swatch ?? `linear-gradient(160deg, ${p.bg}, ${p.blue})`, stage: p.stage, bg: p.bg, blue: p.blue, dark: p.dark, unlock: null })),
  ...TRIAL.filter((p) => !p.noTheme).map((p) => {
    const [bg, blue, dark] = TRIAL_THEME[p.id];
    const plain = p.stage.startsWith("linear-gradient(") && !p.stage.includes("), "); // 1つの線形グラデーションだけの背景は、表紙にも、そのまま使う
    return { id: p.id, name: p.name, tint: p.tint, preview: p.stage, stage: p.stage, bg, blue, dark, cover: plain ? p.stage : `linear-gradient(160deg, ${bg}, ${blue})`, unlock: null, trial: true };
  }),
];
// 着せ替えの一覧は、系統ごとにまとめて並べる(もらえる順とは別。もらえる順は、assignUnlocks の表のまま)。
// 頭:帽子 → 頭の上(耳・冠・輪・ふたば・小鳥・ひよこ・アンテナ)→ 右上の飾り(花・リボンなど)
// 体:首周り → 胸(ブローチ・バッジ)→ ポーチ・バッグ → 手に持つもの
// 顔:目の周り(メガネ・涙・汗)→ ほっぺ(ハート・ぐるぐる・線・ばんそうこう)→ マーク(ハート・音符・怒り)
const DISPLAY_ORDER = {
  head: [
    ["head04", "head05", "head06", "head22", "head25", "head07", "head17", "head09", "head10", "head29"], // 帽子
    ["head11", "head12", "head13", "head08", "head21", "head18", "head03", "head14", "head15", "head16"], // 頭の上(耳・冠・輪・のせるもの)
    ["head01", "head02", "head19", "head20", "head23", "head24", "head26", "head27", "head28"], // 右上の飾り
  ],
  body: [
    ["body01", "body02", "body03", "body04", "body19", "body12", "body18", "body23", "body31", "body42"], // 首周り(鍵のキーホルダーも)
    ["body15", "body14", "body13", "body38", "body39", "body40", "body26", "body30"], // 胸
    ["body07", "body20", "body21", "body25", "body08", "body28", "body29", "body24"], // ポーチ・バッグ
    ["body33", "body34", "body27", "body41", "body43", "body44", "body45", "body46", "body47"], // 手に持つもの
  ],
  face: [
    ["face09", "face23", "face24", "face25", "face21", "face22", "face05"], // 目の周り(メガネ・サングラス・眼帯・ぐるぐる目・ハートの目・涙)
    ["face01", "face03", "face08", "face06", "face16", "face15", "face14", "face20"], // ほっぺ(猫のひげも)
    ["face13", "face19", "face18", "face11", "face12", "face10", "face17", "face04"], // 顔周り(猫の鼻・ちょびひげ・舌ぺろ・マーク類・汗)
  ],
};
// 系統ごとの、見出し(一覧に、線と文字で出す。どのあたりに着けるものかの説明)
const GROUP_LABELS = {
  head: ["帽子(頭にかぶる)", "頭の上", "頭の右上(飾る)"],
  body: ["首周り", "胸(ブローチ・バッジ)", "お腹・腰(ポーチ・バッグ)", "手に持つ(左手)"],
  face: ["目の周り", "ほっぺ", "顔周り"],
  color: ["ベーシックカラー", "光る色", "グラデーション・自然", "模様"],
  theme: ["ベーシックカラー", "光る色", "グラデーション・自然", "模様"],
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



// 色・背景の一覧も、ジャンルごとにまとめる(item.group に、番号を入れる)
const SET_ORDER = {
  color: [
    ["red", "wine", "pink", "orange", "yellow", "lime", "green", "skyblue", "navy", "purple", "white", "black"],
    ["gold", "silver", "bronze", "rainbow"],
    ["sunset", "morning", "sea", "aurora", "grape", "candy", "sakura"],
    ["stripes", "gingham", "border", "wave", "checker", "diamond", "hearts", "rdots", "leaves", "snow", "water"],
  ],
  theme: [
    ["red", "wine", "pink", "orange", "brown", "yellow", "lime", "green", "navy", "purple", "white", "black"],
    ["gold", "silver", "bronze", "rainbow"],
    ["sunset", "morning", "sea", "aurora", "grape", "candy", "clouds", "forest", "starry"],
    ["stripes", "gingham", "border", "wave", "checker", "diamond", "hearts", "rdots", "dots", "leaves", "snow", "water"],
  ],
};
for (const [slot, list] of [["color", COLORS], ["theme", THEMES]]) {
  const rank = new Map();
  SET_ORDER[slot].forEach((ids, group) => ids.forEach((id) => rank.set(id, { group, order: rank.size })));
  for (const item of list) if (rank.has(item.id)) item.group = rank.get(item.id).group;
  list.sort((x, y) => (rank.get(x.id)?.order ?? -1) - (rank.get(y.id)?.order ?? -1)); // 先頭(ミルキーブルー・青空)は、そのまま先頭
}

// 条件とレア度は、dress-unlocks.js の表のとおり。レア度:0=ノーマル 1=レア 2=スーパーレア 3=レジェンド
export const RARITY_NAMES = ["ノーマル", "レア", "スーパーレア", "レジェンド"];
for (const [kind, list] of [["color", COLORS], ["theme", THEMES], ["head", HEADS], ["body", BODIES], ["face", FACES]]) {
  for (const item of list) {
    item.key = `${kind}:${item.id}`;
    if (!(item.key in UNLOCKS)) continue;
    item.unlock = UNLOCKS[item.key];
    item.rarity = RARITY[item.key];
  }
  // 系統(見出し)の中は、レア度の低い順(同じレア度は、いまの並びのまま)
  const order = new Map(list.map((item, index) => [item, index]));
  list.sort((x, y) => (x.group ?? -1) - (y.group ?? -1) || (x.rarity ?? -1) - (y.rarity ?? -1) || order.get(x) - order.get(y));
}

// 前の版で、すでに手に入れたものは、条件が変わっても、残す(初めて開いたとき、前の条件で開いていたものを、おぼえる)
const OWNED_KEY = "floriQuiz.dressOwned";
let owned = new Set();
try {
  owned = new Set(JSON.parse(localStorage.getItem(OWNED_KEY) ?? "[]"));
} catch {
  // 読めなければ、からのまま
}
export function keepOwned({ have, stars }) {
  try {
    if (localStorage.getItem(OWNED_KEY) !== null) return;
    const open = (u) => (typeof u === "string" ? have.has(u) : stars >= u.stars);
    owned = new Set(Object.entries(OLD_UNLOCKS).filter(([, u]) => open(u)).map(([key]) => key));
    localStorage.setItem(OWNED_KEY, JSON.stringify([...owned]));
  } catch {
    // 保存できなくても遊べる
  }
}

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
  if (!u || owned.has(item.key)) return true;
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
  { min: 30, icon: "🐦", name: "小鳥博士" },
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
