// 端末内に保存する成績。名前や個人情報は入れない。
// 保存できない環境でも遊べるように、失敗しても、そのページを開いている間は覚えておく。

import { MAX_SCORE, QUESTIONS_PER_ROUND, ROUNDS_PER_SET } from "./game.js";

const KEY = "floriQuiz.stats";
const OLD_BEST_KEY = "floriQuiz.bestScore"; // 最高得点だけだったころの保存

const EMPTY = {
  best: 0, // 5問の最高得点(ふつうモード)
  bestHard: 0, // 5問の最高得点(難しいモード)
  plays: 0, // 遊んだ回数(5問を1回と数える)
  answered: 0, // 答えた問題の数
  correct: 0, // 正解した問題の数
  setRounds: [], // いまの20問(4回分)で終わった回の得点
  seen: [], // 出会ったことのある問題の番号
  right: [], // 正解したことのある問題の番号
  oniRight: [], // 正解したことのあるオニ問題の番号(総合得点にだけ使う)
  versusPlays: 0, // みんなで対戦した回数
  wrong: [], // まちがえて、まだ正解していない問題の番号(おさらい用)
  dailyLast: "", // 毎日1問を、最後にやった日
  dailyStreak: 0, // 毎日1問を、続けている日数
  dailyDays: 0, // 毎日1問を、やった日数(ぜんぶで)
  dailyBest: 0, // 毎日1問を、いちばん長く続けた日数
  dex: [], // 図鑑:一度でも答えた問題の番号(どのモードでも)
  badges: [], // もらったバッジの名前
  perfect: 0, // 全問正解した回数(5問)
  perfectHard: 0, // 難しいモードで、全問正解した回数
  reviewClears: 0, // おさらいを、全部クリアした回数
  timedPlays: 0, // 制限時間をつけて遊んだ回数
  timedPerfect: 0, // 制限時間をつけて、全問正解した回数
  gardenClears: 0, // お花畑を完成させた回数
  stars: 0, // 制限時間をつけたごほうびの星
  courseCounter: 0, // 「つづきから」:ふつうモードの、難しさのカウンター
  courseUsed: [], // 「つづきから」:もう出した問題の番号
};

let cache = null;

function number(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function ids(list) {
  return Array.isArray(list) ? [...new Set(list.filter((id) => typeof id === "string"))] : [];
}

function text(value) {
  return typeof value === "string" ? value : "";
}

function clean(raw) {
  const rounds = Array.isArray(raw?.setRounds) ? raw.setRounds.map(number).slice(0, ROUNDS_PER_SET - 1) : [];
  return {
    best: number(raw?.best),
    bestHard: number(raw?.bestHard),
    plays: number(raw?.plays),
    answered: number(raw?.answered),
    correct: number(raw?.correct),
    setRounds: rounds,
    seen: ids(raw?.seen),
    right: ids(raw?.right),
    oniRight: ids(raw?.oniRight),
    versusPlays: number(raw?.versusPlays ?? raw?.coopPlays), // coopPlays は、協力型だったころの名前
    wrong: ids(raw?.wrong),
    dailyLast: text(raw?.dailyLast),
    dailyStreak: number(raw?.dailyStreak),
    dailyDays: number(raw?.dailyDays),
    dailyBest: number(raw?.dailyBest),
    dex: ids(raw?.dex),
    badges: ids(raw?.badges),
    perfect: number(raw?.perfect),
    perfectHard: number(raw?.perfectHard),
    reviewClears: number(raw?.reviewClears),
    timedPlays: number(raw?.timedPlays),
    timedPerfect: number(raw?.timedPerfect),
    gardenClears: number(raw?.gardenClears),
    stars: number(raw?.stars),
    courseCounter: number(raw?.courseCounter),
    courseUsed: ids(raw?.courseUsed),
  };
}

// 数字どうしが、食いちがわないように、そろえる。
// ・答えた問題は、5問×遊んだ回数(オニ問題は数えない)。古い記録や、なくなった問題の整理で、ずれたときの直し。
// ・正解した問題の数は、「正解した問題の種類」以上、「答えた問題」以下。
// ・正解した問題は、出会った問題でもある。
export function reconcile(stats) {
  const next = { ...stats };
  const unique = ids([...next.seen, ...next.right]);
  next.seen = unique;
  const rounds = Math.max(next.plays, Math.ceil(next.answered / QUESTIONS_PER_ROUND), next.best > 0 || next.bestHard > 0 ? 1 : 0, Math.ceil(unique.length / QUESTIONS_PER_ROUND));
  next.plays = rounds;
  next.answered = rounds * QUESTIONS_PER_ROUND;
  next.correct = Math.min(next.answered, Math.max(next.correct, next.right.length));
  next.best = Math.min(next.best, MAX_SCORE);
  next.bestHard = Math.min(next.bestHard, MAX_SCORE);
  return next;
}

export function loadStats() {
  if (cache) return { ...cache, setRounds: [...cache.setRounds], seen: [...cache.seen], right: [...cache.right], oniRight: [...cache.oniRight], wrong: [...cache.wrong], dex: [...cache.dex], badges: [...cache.badges], courseUsed: [...cache.courseUsed] };
  let stats = clean(EMPTY);
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) stats = clean(JSON.parse(saved));
    else stats.best = number(Number(localStorage.getItem(OLD_BEST_KEY)));
  } catch {
    // 読めなければ、はじめからにする。
  }
  cache = reconcile(stats);
  return loadStats();
}

function save(stats) {
  cache = stats;
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // 保存できなくても遊びは続けられる。
  }
}

// まちがえた問題を、おぼえておく(正解したら、わすれる)。
function updateWrong(stats, answers) {
  const wrong = new Set(stats.wrong);
  for (const answer of answers) {
    if (answer.correct) wrong.delete(answer.id);
    else wrong.add(answer.id);
  }
  stats.wrong = [...wrong];
}

// 5問の結果を記録する。ふつうモードで4回分そろったら、setCompleted を true にして、数えなおす。
// mode:"normal"(ふつう)、"hard"(難しい)  timed:制限時間をつけて遊んだか(バッジに使う)
export function recordRound({ correct, total, score, answers = [], mode = "normal", timed = false }) {
  const stats = loadStats();
  const hard = mode === "hard";
  const normal = mode === "normal";
  const isRecord = score > (hard ? stats.bestHard : stats.best);
  stats.plays += 1;
  stats.answered += total;
  stats.correct += correct;
  if (hard) stats.bestHard = Math.max(stats.bestHard, score);
  else stats.best = Math.max(stats.best, score);
  if (timed) stats.timedPlays += 1;
  if (correct === total && total === QUESTIONS_PER_ROUND) {
    stats.perfect += 1; // 全問正解(バッジに使う)
    if (hard) stats.perfectHard += 1;
    if (timed) stats.timedPerfect += 1;
  }
  if (normal) stats.setRounds.push(score); // 難しさのカウンターを最初にもどす目安は、ふつうモードだけ
  updateWrong(stats, answers);
  stats.seen = ids([...stats.seen, ...answers.map((answer) => answer.id)]);
  stats.right = ids([...stats.right, ...answers.filter((answer) => answer.correct).map((answer) => answer.id)]);

  const result = { isRecord, setCompleted: false };
  if (normal && stats.setRounds.length >= ROUNDS_PER_SET) {
    result.setCompleted = true;
    stats.setRounds = [];
  }
  save(stats);
  return result;
}

// オニ問題の結果を記録する。成績の遊んだ回数や正解率には入れず、はじめて正解した問題の数だけを返す(総合得点に入る)。
export function recordOni(answers = []) {
  const stats = loadStats();
  const before = stats.oniRight.length;
  stats.oniRight = ids([...stats.oniRight, ...answers.filter((answer) => answer.correct).map((answer) => answer.id)]);
  save(stats);
  return stats.oniRight.length - before;
}

// みんなで対戦した結果を記録する。ひとりで遊ぶ記録(遊んだ回数・正解率・総合得点など)には、入れない。
export function recordVersus() {
  const stats = loadStats();
  stats.versusPlays += 1;
  save(stats);
}

// おさらいの結果を記録する。まちがえた問題の一覧だけが変わる(成績の回数や、総合得点には入れない)。
export function recordReview(answers = []) {
  const stats = loadStats();
  updateWrong(stats, answers);
  if (answers.length > 0 && stats.wrong.length === 0) stats.reviewClears += 1;
  save(stats);
  return stats.wrong.length;
}

// 毎日1問の結果を記録する。1日1回だけ(その日の2回目からは、記録しない)。続けた日数を数える。
// 戻り値:{ already: その日は、記録ずみか, streak: 続けている日数, days: やった日数(ぜんぶで) }
export function recordDaily({ date, previous, answer }) {
  const stats = loadStats();
  if (stats.dailyLast === date) return { already: true, streak: stats.dailyStreak, days: stats.dailyDays };
  stats.dailyStreak = stats.dailyLast === previous ? stats.dailyStreak + 1 : 1;
  stats.dailyDays += 1;
  stats.dailyBest = Math.max(stats.dailyBest, stats.dailyStreak);
  stats.dailyLast = date;
  if (answer) updateWrong(stats, [answer]);
  save(stats);
  return { already: false, streak: stats.dailyStreak, days: stats.dailyDays };
}

// 図鑑:答えた問題を、おぼえておく(どのモードでも、オニでも対戦でも)。
export function recordDex(answers = []) {
  const stats = loadStats();
  const before = stats.dex.length;
  stats.dex = ids([...stats.dex, ...answers.map((answer) => answer.id)]);
  if (stats.dex.length !== before) save(stats);
}

// もらったバッジを、おぼえておく。
export function recordBadges(list) {
  const stats = loadStats();
  stats.badges = ids(list);
  save(stats);
}

// 「つづきから」の記録(ふつうモードの難しさのカウンターと、もう出した問題)
export function saveCourse({ counter, used }) {
  const stats = loadStats();
  stats.courseCounter = counter;
  stats.courseUsed = ids(used);
  save(stats);
}

// 「最初から」:つづきの記録を消す(成績・総合得点は、そのまま)
export function resetCourse() {
  const stats = loadStats();
  stats.courseCounter = 0;
  stats.courseUsed = [];
  stats.setRounds = [];
  save(stats);
}

// 制限時間をつけたごほうびの星をふやす。ぜんぶの星の数を返す。
export function addStars(count) {
  const stats = loadStats();
  stats.stars += count;
  save(stats);
  return stats.stars;
}

// お花畑を完成させた回数
export function recordGarden() {
  const stats = loadStats();
  stats.gardenClears += 1;
  save(stats);
}

// 記録の中から、いまの問題にない番号(古い形式の番号や、なくなった問題)を取りのぞく。
export function pruneStats(validIds) {
  const stats = loadStats();
  const keep = (list) => list.filter((id) => validIds.has(id));
  const next = reconcile({ ...stats, seen: keep(stats.seen), right: keep(stats.right), oniRight: keep(stats.oniRight), wrong: keep(stats.wrong), dex: keep(stats.dex), courseUsed: keep(stats.courseUsed) });
  if (JSON.stringify(next) !== JSON.stringify(stats)) save(next);
}
