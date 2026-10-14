// 端末内に保存する成績。名前や個人情報は入れない。
// 保存できない環境でも遊べるように、失敗しても、そのページを開いている間は覚えておく。

import { ROUNDS_PER_SET } from "./game.js";

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
};

let cache = null;

function number(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function ids(list) {
  return Array.isArray(list) ? [...new Set(list.filter((id) => typeof id === "string"))] : [];
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
  };
}

export function loadStats() {
  if (cache) return { ...cache, setRounds: [...cache.setRounds], seen: [...cache.seen], right: [...cache.right], oniRight: [...cache.oniRight] };
  let stats = clean(EMPTY);
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) stats = clean(JSON.parse(saved));
    else stats.best = number(Number(localStorage.getItem(OLD_BEST_KEY)));
  } catch {
    // 読めなければ、はじめからにする。
  }
  cache = stats;
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

// 5問の結果を記録する。ふつうモードで4回分そろったら、setCompleted を true にして、数えなおす。
export function recordRound({ correct, total, score, answers = [], mode = "normal" }) {
  const stats = loadStats();
  const hard = mode === "hard";
  const isRecord = score > (hard ? stats.bestHard : stats.best);
  stats.plays += 1;
  stats.answered += total;
  stats.correct += correct;
  if (hard) stats.bestHard = Math.max(stats.bestHard, score);
  else stats.best = Math.max(stats.best, score);
  if (!hard) stats.setRounds.push(score); // 難しさのカウンターを最初にもどす目安は、ふつうモードだけ
  stats.seen = ids([...stats.seen, ...answers.map((answer) => answer.id)]);
  stats.right = ids([...stats.right, ...answers.filter((answer) => answer.correct).map((answer) => answer.id)]);

  const result = { isRecord, setCompleted: false };
  if (!hard && stats.setRounds.length >= ROUNDS_PER_SET) {
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
